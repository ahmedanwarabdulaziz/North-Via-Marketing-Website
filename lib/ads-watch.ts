import { enums } from 'google-ads-api';
import { listClientProfiles } from './admin-ops';
import { clientAdsAccounts, clientsWithAds, describeAdsError } from './ads-metrics';
import { getSetting, setSetting } from './data/store';
import { getAdsClient } from './google-ads';
import { clientIdsWithMetaAds, clientMetaAdsHealth, describeMetaAdsError } from './meta-ads';
import { ringPhone } from './ntfy';
import { sendPush } from './push';
import { allowedChatIds, escapeHtml as h, sendMessage } from './telegram';

// Stopped ads, checked every hour (from /api/tasks/due). Only campaigns / ads that spent in the last
// 7 days count, so old or test campaigns never alarm:
//   🔴 stopped  Google: every recent campaign paused/ended/removed, or any not eligible (policy, billing).
//               Meta: the ad account can't run ads, any recent ad rejected / with issues / waiting on
//               billing, or every recent ad paused.
//   🟠 limited  Google limited or learning; Meta ad under review.
//   🟢 running  otherwise.  ⚪ idle: nothing spent this week.
// Alerts go out only on a change (Telegram + phone ring + app push), and again when ads run again.
// The last state is kept for the app's flags (Home banner, Marketing page).

const SETTING = 'ads_watch';
const EVERY_MS = 55 * 60_000;

export type AdsState = 'running' | 'limited' | 'stopped' | 'idle' | 'error';
export type AdsPlatform = 'google' | 'meta';

export interface AdsHealth {
  state: AdsState;
  reason: string; // short, e.g. "Spring sale: paused · Brand: not eligible (billing)"
  since: string; // when this state started
  checkedAt: string;
}

interface WatchState {
  checkedAt?: string;
  clients?: Record<string, Partial<Record<AdsPlatform, AdsHealth>>>;
}

const name = (e: Record<string | number, string | number>, v: unknown) => (typeof v === 'number' ? String(e[v] ?? v) : String(v ?? ''));
const nice = (s: string) => s.toLowerCase().replace(/_/g, ' ');

// ---------- Google ----------

/** Yesterday (YYYY-MM-DD) in an ad account's own time zone, which is how Google dates its numbers. */
function yesterdayIn(timeZone: string) {
  const d = new Date(Date.now() - 86_400_000);
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

/**
 * Google's "primary status" alone isn't reliable (a campaign marked not eligible can still spend
 * every day), so a campaign counts as stopped when it is paused/removed, or when it spent this week
 * but nothing since yesterday (in the account's time zone). Google's reasons are added as context.
 */
export async function googleHealth(clientId: string): Promise<Omit<AdsHealth, 'since' | 'checkedAt'>> {
  const accounts = await clientAdsAccounts(clientId);
  const { client, refreshToken } = await getAdsClient();
  const running: string[] = [];
  const limited: string[] = [];
  const stopped: string[] = [];
  for (const account of accounts) {
    const customer = client.Customer({ customer_id: account.customerId, refresh_token: refreshToken });
    const [rows, info] = await Promise.all([
      customer.query(`
        SELECT campaign.id, campaign.name, campaign.status, campaign.primary_status, campaign.primary_status_reasons, segments.date, metrics.cost_micros
        FROM campaign
        WHERE segments.date DURING LAST_7_DAYS AND metrics.cost_micros > 0
      `) as Promise<Array<{ campaign?: { id?: number | string; name?: string; status?: number; primary_status?: number; primary_status_reasons?: number[] }; segments?: { date?: string } }>>,
      customer.query('SELECT customer.time_zone FROM customer LIMIT 1') as Promise<Array<{ customer?: { time_zone?: string } }>>,
    ]);
    const yesterday = yesterdayIn(info[0]?.customer?.time_zone || 'America/Toronto');
    const campaigns = new Map<string, { name: string; status: string; primary: string; reasons: string[]; lastSpend: string }>();
    for (const row of rows) {
      const id = String(row.campaign?.id ?? row.campaign?.name);
      const date = row.segments?.date || '';
      const c = campaigns.get(id);
      if (c) {
        if (date > c.lastSpend) c.lastSpend = date;
        continue;
      }
      campaigns.set(id, {
        name: row.campaign?.name || 'Campaign',
        status: name(enums.CampaignStatus as never, row.campaign?.status),
        primary: name(enums.CampaignPrimaryStatus as never, row.campaign?.primary_status),
        reasons: (row.campaign?.primary_status_reasons || []).map((r) => nice(name(enums.CampaignPrimaryStatusReason as never, r))).filter((r) => r && r !== 'unspecified' && r !== 'unknown'),
        lastSpend: date,
      });
    }
    for (const c of campaigns.values()) {
      const why = c.reasons.length ? ` (${c.reasons.slice(0, 2).join(', ')})` : '';
      if (c.status !== 'ENABLED') stopped.push(`${c.name}: ${nice(c.status)}`);
      else if (c.lastSpend < yesterday) stopped.push(`${c.name}: no spend since ${c.lastSpend}${why}`);
      else if (c.primary !== 'ELIGIBLE' || c.reasons.includes('budget constrained')) limited.push(`${c.name}: ${nice(c.primary)}${why}`);
      else running.push(c.name);
    }
  }
  if (!running.length && !limited.length && !stopped.length) return { state: 'idle', reason: 'No spend in the last 7 days' };
  if (!running.length && !limited.length) return { state: 'stopped', reason: stopped.slice(0, 4).join(' · ') };
  // Some campaigns still run: limited, listing what stopped first.
  if (stopped.length || limited.length) return { state: 'limited', reason: [...stopped, ...limited].slice(0, 4).join(' · ') };
  return { state: 'running', reason: `${running.length} campaign${running.length === 1 ? '' : 's'} running` };
}

// ---------- Meta ----------

const META_STOPPED_ALWAYS = new Set(['DISAPPROVED', 'WITH_ISSUES', 'PENDING_BILLING_INFO']);
const META_REVIEW = new Set(['IN_PROCESS', 'PENDING_REVIEW', 'PREAPPROVED']);

export async function metaHealth(clientId: string): Promise<Omit<AdsHealth, 'since' | 'checkedAt'>> {
  const accounts = await clientMetaAdsHealth(clientId);
  const problems = accounts.filter((a) => a.problem).map((a) => `${a.accountName}: ${a.problem}`);
  if (problems.length) return { state: 'stopped', reason: problems.join(' · ') };
  const ads = accounts.flatMap((a) => a.ads);
  if (!ads.length) return { state: 'idle', reason: 'No spend in the last 7 days' };
  const bad = ads.filter((a) => META_STOPPED_ALWAYS.has(a.status));
  const active = ads.filter((a) => a.status === 'ACTIVE');
  const review = ads.filter((a) => META_REVIEW.has(a.status));
  if (bad.length) return { state: 'stopped', reason: bad.slice(0, 4).map((a) => `${a.name}: ${nice(a.status)}`).join(' · ') };
  if (!active.length && !review.length) {
    return { state: 'stopped', reason: ads.slice(0, 4).map((a) => `${a.name}: ${nice(a.status)}`).join(' · ') };
  }
  if (review.length) return { state: 'limited', reason: review.slice(0, 3).map((a) => `${a.name}: ${nice(a.status)}`).join(' · ') };
  return { state: 'running', reason: `${active.length} ad${active.length === 1 ? '' : 's'} running` };
}

// ---------- The hourly run ----------

export async function adsWatchState(): Promise<WatchState> {
  return ((await getSetting<WatchState>(SETTING).catch(() => null)) || {}) as WatchState;
}

const PLATFORM_LABEL: Record<AdsPlatform, string> = { google: 'Google Ads', meta: 'Facebook & Instagram ads' };

/** Checks every client with ads (at most hourly unless `force`); alerts on changes. */
export async function runAdsWatch(opts: { force?: boolean; budgetMs?: number } = {}) {
  const previous = await adsWatchState();
  if (!opts.force && previous.checkedAt && Date.now() - Date.parse(previous.checkedAt) < EVERY_MS) return { skipped: true };
  const deadline = Date.now() + (opts.budgetMs ?? 40_000);
  const now = new Date().toISOString();
  const names = new Map((await listClientProfiles()).filter((c) => c.id).map((c) => [c.id!, c.brandName]));
  const googleClients = (await clientsWithAds()).map((c) => c.id as string);
  const metaClients = await clientIdsWithMetaAds();

  const next: WatchState = { checkedAt: now, clients: { ...(previous.clients || {}) } };
  const changes: { clientId: string; platform: AdsPlatform; before?: AdsHealth; after: AdsHealth }[] = [];
  let googleDown = false;
  let metaDown = false;

  const check = async (clientId: string, platform: AdsPlatform) => {
    if (Date.now() > deadline) return;
    if ((platform === 'google' && googleDown) || (platform === 'meta' && metaDown)) return;
    let result: Omit<AdsHealth, 'since' | 'checkedAt'>;
    try {
      result = platform === 'google' ? await googleHealth(clientId) : await metaHealth(clientId);
    } catch (error) {
      const message = platform === 'google' ? describeAdsError(error) : describeMetaAdsError(error);
      // A login problem fails every client the same way, and critical-alerts already reports it.
      if (/Reconnect|not connected|expired/i.test(message)) {
        if (platform === 'google') googleDown = true;
        else metaDown = true;
      }
      result = { state: 'error', reason: message };
    }
    const before = previous.clients?.[clientId]?.[platform];
    const after: AdsHealth = { ...result, checkedAt: now, since: before && before.state === result.state ? before.since : now };
    next.clients![clientId] = { ...(next.clients![clientId] || {}), [platform]: after };
    // Errors never alarm (and don't count as a recovery): only real ad states do.
    if (after.state !== 'error' && before && before.state !== 'error' && before.state !== after.state) changes.push({ clientId, platform, before, after });
    if (after.state === 'stopped' && !before) changes.push({ clientId, platform, after });
  };

  for (const id of googleClients) await check(id, 'google');
  for (const id of metaClients) await check(id, 'meta');
  await setSetting(SETTING, next);

  for (const c of changes) {
    const client = names.get(c.clientId) || 'Client';
    const where = PLATFORM_LABEL[c.platform];
    if (c.after.state === 'stopped') {
      const text = `⛔ <b>Ads stopped: ${h(client)}</b> (${where})\n${h(c.after.reason)}`;
      for (const chat of allowedChatIds()) await sendMessage(chat, { text }).catch(() => undefined);
      await ringPhone({
        title: `⛔ Ads stopped: ${client}`,
        message: `${where}\n${c.after.reason}`.slice(0, 500),
        priority: 5,
        tags: ['no_entry'],
        channel: 'ads_stopped',
        data: { type: 'ads', id: c.clientId },
      });
    } else if (c.before?.state === 'stopped' && (c.after.state === 'running' || c.after.state === 'limited')) {
      const text = `✅ <b>Ads running again: ${h(client)}</b> (${where})\n${h(c.after.reason)}`;
      for (const chat of allowedChatIds()) await sendMessage(chat, { text }).catch(() => undefined);
      await sendPush({ title: `✅ Ads running again: ${client}`, body: `${where} · ${c.after.reason}`, channel: 'info', data: { type: 'ads', id: c.clientId } });
    }
  }
  return { checked: googleClients.length + metaClients.length, changes: changes.length };
}

/** Clients whose ads are stopped right now (Home banner, Marketing flags). */
export async function stoppedAds() {
  const state = await adsWatchState();
  const names = new Map((await listClientProfiles()).filter((c) => c.id).map((c) => [c.id!, c.brandName]));
  const out: { clientId: string; clientName: string; platform: AdsPlatform; reason: string; since: string }[] = [];
  for (const [clientId, platforms] of Object.entries(state.clients || {})) {
    for (const platform of ['google', 'meta'] as const) {
      const p = platforms[platform];
      if (p?.state === 'stopped') out.push({ clientId, clientName: names.get(clientId) || 'Client', platform, reason: p.reason, since: p.since });
    }
  }
  return { checkedAt: state.checkedAt || null, stopped: out };
}
