import tls from 'tls';
import { addDoc, deleteDocs, deleteOlderThan, getDoc, listDocs, newId, updateDoc } from './data/store';
import { listClientProfiles } from './admin-ops';
import { allowedChatIds, escapeHtml as h, sendMessage, type OutgoingMessage } from './telegram';
import type { Website, WebsiteCheck } from '@/types/database';

// Website monitoring. Runs on n8n's hourly wake-up (and "Check now"); Telegram is
// only told about changes: a site going down, coming back, or an SSL certificate
// nearing expiry. A failed check is retried once in the same run before it counts.

const WEBSITES = 'websites' as const;
const CHECKS = 'website_checks' as const;
const TIMEOUT_MS = 10_000;
const RETRY_DELAY_MS = 3_000;
const SLOW_MS = 8_000;
const SSL_WARN_DAYS = [14, 7, 3, 1];
const HISTORY_DAYS = 30;
const CONCURRENCY = 10;
const PANEL_URL = 'https://www.northviamarketing.com/admin/clients';

type Site = Website & { id: string };

// ---------- Managing the list ----------

/** Normalizes what was typed into a full http(s) URL, or throws a readable error. */
export function normalizeUrl(input: string) {
  const raw = input.trim();
  if (!raw) throw new Error('Enter a website address.');
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    throw new Error('That is not a valid website address.');
  }
  const host = url.hostname.toLowerCase();
  if (!host.includes('.') || host === 'localhost' || /^(\d+\.){3}\d+$/.test(host) || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new Error('Use the public website address, e.g. https://example.com');
  }
  url.hash = '';
  return url.toString();
}

export async function listClientWebsites(clientId: string) {
  const sites = await listDocs<Website>(WEBSITES, { where: { clientId } });
  return sites.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
}

export async function addWebsite(input: { clientId: string; url: string; label?: string; mustContain?: string }) {
  const url = normalizeUrl(input.url);
  const existing = await listClientWebsites(input.clientId);
  if (existing.some((s) => s.url === url)) throw new Error('This address is already being checked for this client.');
  const now = new Date().toISOString();
  const website: Website = {
    clientId: input.clientId,
    url,
    label: input.label?.trim().slice(0, 60) || (existing.length ? new URL(url).pathname : 'Homepage'),
    mustContain: input.mustContain?.trim().slice(0, 120) || undefined,
    enabled: true,
    status: 'unknown',
    createdAt: now,
    updatedAt: now,
  };
  const id = await addDoc(WEBSITES, website);
  return { ...website, id };
}

export async function setWebsiteEnabled(id: string, enabled: boolean) {
  await updateDoc(WEBSITES, id, { enabled, updatedAt: new Date().toISOString() });
}

export async function removeWebsite(id: string) {
  await deleteDocs(WEBSITES, { id });
}

// ---------- Checking ----------

interface Probe {
  ok: boolean;
  statusCode?: number;
  responseMs?: number;
  error?: string;
}

async function probe(site: Site): Promise<Probe> {
  const started = Date.now();
  try {
    const res = await fetch(site.url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'User-Agent': 'NorthViaMonitor/1.0 (+https://www.northviamarketing.com)', Accept: 'text/html,*/*' },
      cache: 'no-store',
    });
    const body = site.mustContain ? await res.text() : (await res.body?.cancel().catch(() => undefined), '');
    const responseMs = Date.now() - started;
    if (res.status >= 400) return { ok: false, statusCode: res.status, responseMs, error: `HTTP ${res.status}` };
    if (site.mustContain && !body.toLowerCase().includes(site.mustContain.toLowerCase())) {
      return { ok: false, statusCode: res.status, responseMs, error: `Page loads but "${site.mustContain}" is missing` };
    }
    return { ok: true, statusCode: res.status, responseMs };
  } catch (error) {
    const err = error as { name?: string; message?: string; cause?: { code?: string; message?: string } };
    const reason =
      err.name === 'TimeoutError' || err.name === 'AbortError' ? `No response within ${TIMEOUT_MS / 1000}s`
      : err.cause?.code === 'ENOTFOUND' ? 'Domain not found (DNS)'
      : err.cause?.code === 'ECONNREFUSED' ? 'Connection refused'
      : /certificate|SSL|TLS/i.test(err.cause?.message || err.message || '') ? 'SSL certificate problem'
      : err.cause?.message || err.message || 'Could not connect';
    return { ok: false, responseMs: Date.now() - started, error: reason };
  }
}

/** When the site's SSL certificate expires, or null if it can't be read. */
function certificateExpiry(hostname: string): Promise<string | null> {
  return new Promise((resolve) => {
    const socket = tls.connect({ host: hostname, port: 443, servername: hostname, rejectUnauthorized: false, timeout: TIMEOUT_MS }, () => {
      const cert = socket.getPeerCertificate();
      socket.end();
      resolve(cert?.valid_to ? new Date(cert.valid_to).toISOString() : null);
    });
    socket.on('error', () => resolve(null));
    socket.on('timeout', () => {
      socket.destroy();
      resolve(null);
    });
  });
}

const daysUntil = (iso: string) => Math.floor((new Date(iso).getTime() - Date.now()) / 86_400_000);

function duration(fromIso: string) {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(fromIso).getTime()) / 60_000));
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 48 * 60) return `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60} min` : ''}`;
  return `${Math.round(minutes / 1440)} days`;
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>) {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i]);
      }
    })
  );
  return results;
}

export interface WebsiteRunSummary {
  checked: number;
  up: number;
  down: number;
  alertsSent: number;
}

/**
 * Checks every enabled website (or just `ids`), stores the result and history,
 * and sends a Telegram alert for each change. Safe to run as often as needed.
 */
export async function runWebsiteChecks(options: { ids?: string[]; chatIds?: string[] } = {}): Promise<WebsiteRunSummary> {
  const all = options.ids
    ? (await Promise.all(options.ids.map((id) => getDoc<Website>(WEBSITES, id)))).filter((s): s is Site => Boolean(s))
    : await listDocs<Website>(WEBSITES, { where: { enabled: true } });
  if (!all.length) return { checked: 0, up: 0, down: 0, alertsSent: 0 };

  const names = new Map((await listClientProfiles()).map((c) => [c.id, c.brandName]));
  const certCache = new Map<string, Promise<string | null>>();
  const alerts: OutgoingMessage[] = [];

  const results = await mapLimit(all, CONCURRENCY, async (site) => {
    // The certificate is read while the page is being checked.
    const url = new URL(site.url);
    if (url.protocol === 'https:' && !certCache.has(url.hostname)) certCache.set(url.hostname, certificateExpiry(url.hostname));

    let result = await probe(site);
    if (!result.ok) {
      // One retry rules out a momentary blip before anything is reported.
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      result = await probe(site);
    }
    const sslExpiresAt = (url.protocol === 'https:' && (await certCache.get(url.hostname))) || site.sslExpiresAt;

    const now = new Date().toISOString();
    const client = names.get(site.clientId) || 'Client';
    const where = `<b>${h(client)}</b> · ${h(site.label || 'Website')}\n${h(site.url)}`;
    // null clears a column; undefined would leave the old value in place.
    const update: Record<string, unknown> = {
      status: result.ok ? 'up' : 'down',
      lastStatusCode: result.statusCode ?? null,
      lastResponseMs: result.responseMs ?? null,
      lastError: result.ok ? null : result.error || 'Unknown',
      lastCheckedAt: now,
      sslExpiresAt: sslExpiresAt ?? null,
      updatedAt: now,
    };

    const sslDays = sslExpiresAt ? daysUntil(sslExpiresAt) : undefined;
    // An expired certificate is the reason the page fails, so say that instead of a generic SSL error.
    if (!result.ok && sslDays !== undefined && sslDays < 0 && result.error === 'SSL certificate problem') {
      result.error = 'SSL certificate expired';
      update.lastError = result.error;
    }
    let reportedDown = false;
    if (!result.ok && site.status !== 'down') {
      update.downSince = now;
      reportedDown = true;
      alerts.push(alertMessage(`🔴 <b>Website down</b>\n${where}\n\nReason: ${h(result.error || 'Unknown')}`, site));
    } else if (result.ok && site.status === 'down') {
      alerts.push(alertMessage(`🟢 <b>Website back up</b>\n${where}\n\nIt was down for about ${site.downSince ? duration(site.downSince) : 'a while'}.`, site));
    }

    if (sslDays !== undefined) {
      const days = sslDays;
      const threshold = SSL_WARN_DAYS.filter((d) => days <= d).pop();
      if (threshold !== undefined && (site.sslAlertedDays === undefined || threshold < site.sslAlertedDays)) {
        update.sslAlertedDays = threshold;
        // The down alert already says the certificate expired; one message is enough.
        if (!(reportedDown && days < 0)) alerts.push(alertMessage(
          days < 0
            ? `⛔ <b>SSL certificate expired</b>\n${where}\n\nVisitors now see a security warning.`
            : `🔒 <b>SSL certificate expires in ${days} day${days === 1 ? '' : 's'}</b>\n${where}\n\nRenew it before visitors start seeing a security warning.`,
          site
        ));
      } else if (threshold === undefined && site.sslAlertedDays !== undefined) {
        update.sslAlertedDays = null; // renewed: re-arm the warnings
      }
    }

    // Leaving `downSince` set while up would mislabel the next outage, so clear it.
    if (result.ok) update.downSince = null;
    await updateDoc(WEBSITES, site.id, update);

    const check: WebsiteCheck = {
      websiteId: site.id,
      clientId: site.clientId,
      ok: result.ok,
      statusCode: result.statusCode,
      responseMs: result.responseMs,
      error: result.error,
      checkedAt: now,
    };
    await addDoc(CHECKS, check, newId());
    return result.ok;
  });

  const chatIds = options.chatIds ?? allowedChatIds();
  for (const chatId of chatIds) for (const alert of alerts) await sendMessage(chatId, alert);
  if (!options.ids) await deleteOlderThan(CHECKS, 'checkedAt', new Date(Date.now() - HISTORY_DAYS * 86_400_000).toISOString());

  const up = results.filter(Boolean).length;
  return { checked: results.length, up, down: results.length - up, alertsSent: alerts.length * chatIds.length };
}

function alertMessage(text: string, site: Site): OutgoingMessage {
  return {
    text,
    buttons: [[
      { text: '🔁 Check again', callback_data: `m:ws:check` },
      { text: '🌐 Open site', url: site.url },
    ]],
  };
}

// ---------- Overviews (Telegram menu, digest) ----------

export async function websiteOverview() {
  const sites = await listDocs<Website>(WEBSITES, { where: { enabled: true } });
  const names = new Map((await listClientProfiles()).map((c) => [c.id, c.brandName]));
  const down = sites.filter((s) => s.status === 'down');
  const sslSoon = sites.filter((s) => s.sslExpiresAt && daysUntil(s.sslExpiresAt) <= SSL_WARN_DAYS[0]);
  return { sites, names, down, sslSoon };
}

/** One line for the 9 AM / 9 PM digest; empty when nothing is monitored. */
export async function websiteDigestLine() {
  const { sites, names, down, sslSoon } = await websiteOverview();
  if (!sites.length) return '';
  const downClients = [...new Set(down.map((s) => names.get(s.clientId) || s.url))];
  const parts = [down.length ? `🔴 ${down.length} down: ${downClients.map(h).join(', ')}` : `🟢 all ${sites.length} up`];
  if (sslSoon.length) parts.push(`🔒 ${sslSoon.length} SSL expiring soon`);
  return `🌐 Websites: ${parts.join(' · ')}`;
}

/** Text of the 🌐 Websites screen in the Telegram menu. */
export async function websitesScreenText() {
  const { sites, names, down } = await websiteOverview();
  const lines = ['🌐 <b>Website checks</b>', ''];
  if (!sites.length) {
    lines.push('No websites are being checked yet.', 'Add them on each client’s page in the panel.');
    return { text: lines.join('\n'), panelUrl: PANEL_URL };
  }
  lines.push(down.length ? `🔴 <b>${down.length}</b> of ${sites.length} down` : `🟢 All ${sites.length} up`, '');

  const byClient = new Map<string, Site[]>();
  for (const s of sites) byClient.set(s.clientId, [...(byClient.get(s.clientId) || []), s]);
  for (const [clientId, list] of byClient) {
    lines.push(`<b>${h(names.get(clientId) || 'Client')}</b>`);
    for (const s of list) {
      const icon = s.status === 'up' ? '🟢' : s.status === 'down' ? '🔴' : '⚪';
      const detail =
        s.status === 'down' ? h(s.lastError || 'down')
        : s.status === 'up' ? `${s.lastResponseMs && s.lastResponseMs > SLOW_MS ? '🐢 ' : ''}${((s.lastResponseMs || 0) / 1000).toFixed(1)}s`
        : 'not checked yet';
      const sslLeft = s.sslExpiresAt ? daysUntil(s.sslExpiresAt) : undefined;
      const ssl = sslLeft === undefined ? '' : sslLeft < 0 ? ' · ⛔ SSL expired' : ` · 🔒 ${sslLeft}d`;
      lines.push(`${icon} ${h(s.label || s.url)} — ${detail}${ssl}`);
    }
    lines.push('');
  }
  const last = sites.map((s) => s.lastCheckedAt).filter(Boolean).sort().pop();
  if (last) {
    lines.push(`Last checked ${new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', hour: 'numeric', minute: '2-digit', weekday: 'short' }).format(new Date(last))} Cairo · checks run hourly.`);
  }
  return { text: lines.join('\n').trim(), panelUrl: PANEL_URL };
}
