import { listClientProfiles } from './admin-ops';
import { aiJson } from './ai-json';
import { clientInstagramGrowth, googleGrowth, instagramGrowth, listCompetitors, listFindings, getFinding, runCompetitorChecks, type Finding } from './competitors';
import { getSetting, setSetting } from './data/store';
import { saveTextToLibrary } from './knowledge-telegram';
import { startTaskFromText } from './task-telegram';
import { allowedChatIds, answerCallback, editMessage, escapeHtml as h, sendMessage, truncate, type InlineButton, type OutgoingMessage } from './telegram';
import { cairoParts, weekdayOf } from './tasks';
import { supabase } from './supabase';

// Telegram side of the competitor watch: an alert for each notable finding (offers, new products,
// events, giveaways, important website changes, bad reviews), and a weekly report per client on
// Monday from 10:00 Cairo, with Google review growth compared to the client's own.
// Button data: "cp:s|t:<client id>:<finding id>" (save idea / make task).

const ALERT_KINDS: Finding['kind'][] = ['offer', 'new_product', 'event', 'giveaway', 'website_change', 'review'];
const SOURCE = { instagram: '📸 Instagram', website: '🌐 Website', google: '⭐ Google' } as const;
const KIND = { offer: '🏷 Offer', new_product: '🆕 New', event: '🎉 Event', giveaway: '🎁 Giveaway', post: '📝 Post', website_change: '🌐 Website change', rating: '⭐ Rating', review: '⭐ Review', followers: '👥 Followers' } as const;
const WEEKLY = 'competitor_weekly';

function findingCard(f: Finding, clientName: string): OutgoingMessage {
  const lines = [
    `🕵️ <b>${h(f.competitorName)}</b> · ${SOURCE[f.source]} · <i>competitor of ${h(clientName)}</i>`,
    `${KIND[f.kind]}: <b>${h(f.title)}</b>`,
    f.detail ? h(f.detail) : '',
    f.likes !== undefined ? `<i>${f.likes.toLocaleString('en')} likes</i>` : '',
    f.idea ? `\n💡 <b>Idea for ${h(clientName)}:</b> ${h(f.idea)}` : '',
  ].filter(Boolean);
  const buttons: InlineButton[][] = [
    [
      { text: '📚 Save idea', callback_data: `cp:s:${f.clientId}:${f.id}` },
      { text: '✅ Make a task', callback_data: `cp:t:${f.clientId}:${f.id}` },
    ],
  ];
  if (f.url) buttons.push([{ text: f.source === 'instagram' ? '▶️ Open post' : '🔗 Open', url: f.url }]);
  return { text: lines.join('\n'), buttons };
}

/** The 5-minute step: check what's due, then send an alert for each notable new finding. */
export async function runCompetitorWatch() {
  const { checked, findings } = await runCompetitorChecks({ budgetMs: 20_000 });
  const alerts = findings.filter((f) => ALERT_KINDS.includes(f.kind));
  if (alerts.length) {
    const names = new Map((await listClientProfiles()).map((c) => [c.id, c.brandName]));
    for (const chatId of allowedChatIds()) for (const f of alerts.slice(0, 5)) await sendMessage(chatId, findingCard(f, names.get(f.clientId) || 'client'));
  }
  return { checked, findings: findings.length, alerts: alerts.length };
}

/** The client's own new Google reviews in the last 7 days (from the reviews system). */
async function ownReviewsThisWeek(clientId: string) {
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { count } = await supabase.from('gbp_reviews').select('id', { count: 'exact', head: true }).eq('client_id', clientId).gte('create_time', since);
  return count ?? null;
}

/** Monday from 10:00 Cairo: one report per client that has competitors. */
export async function sendWeeklyCompetitorReports(now = new Date()) {
  const { date, time } = cairoParts(now);
  if (weekdayOf(date) !== 1 || time < '10:00') return { sent: 0, reason: 'not Monday 10:00' };
  const last = await getSetting<{ day?: string }>(WEEKLY);
  if (last?.day === date) return { sent: 0, reason: 'already sent' };
  await setSetting(WEEKLY, { day: date });
  let sent = 0;
  for (const c of (await listClientProfiles()).filter((c) => c.id)) {
    const message = await weeklyReport(c.id!, c.brandName);
    if (!message) continue;
    for (const chatId of allowedChatIds()) await sendMessage(chatId, message);
    sent++;
  }
  return { sent };
}

export async function weeklyReport(clientId: string, clientName: string): Promise<OutgoingMessage | null> {
  const competitors = await listCompetitors(clientId);
  if (!competitors.length) return null;
  const since = Date.now() - 7 * 86_400_000;
  const week = (await listFindings(clientId)).filter((f) => Date.parse(f.at) >= since);

  // Google: reviews gained this week, the client vs each competitor.
  const [own, growth, ownIg, igGrowth] = await Promise.all([
    ownReviewsThisWeek(clientId).catch(() => null),
    Promise.all(competitors.map((c) => googleGrowth(c.id).then((g) => ({ c, g })))),
    clientInstagramGrowth(clientId).catch(() => null),
    Promise.all(competitors.map((c) => instagramGrowth(c.id).then((g) => ({ c, g })))),
  ]);
  const signed = (n: number | null) => (n === null ? '' : ` (${n >= 0 ? '+' : ''}${n.toLocaleString('en')} this week)`);
  const igLines = igGrowth.filter((x) => x.g).map((x) => `• ${h(x.c.name)}: ${x.g!.followers.toLocaleString('en')}${signed(x.g!.gained7)}`);
  const googleLines = growth
    .filter((x) => x.g)
    .map((x) => `• ${h(x.c.name)}: ${x.g!.rating ?? '?'}★ · ${x.g!.count ?? '?'} reviews${x.g!.gained7 !== null ? ` (${x.g!.gained7 >= 0 ? '+' : ''}${x.g!.gained7} this week)` : ''}`);

  let summary = '';
  if (week.length) {
    try {
      const raw = await aiJson({
        system: `Write a short weekly competitor report for a marketing agency owner about his client ${clientName}. Group by competitor; highlight offers, new products, events, ads and what performed best (likes). End with 2-3 concrete ideas for ${clientName}. Plain text, short lines, "- " bullets, under 180 words, in English unless the findings are mostly Arabic.
Return ONLY JSON: {"report": "..."}`,
        user: week.map((f) => `${f.competitorName} | ${f.source} | ${f.kind} | ${f.title} | ${f.detail}${f.likes !== undefined ? ` | ${f.likes} likes` : ''}`).join('\n').slice(0, 6000),
        feature: 'knowledge',
        timeBudgetMs: 25_000,
      });
      summary = typeof raw.report === 'string' ? raw.report : '';
    } catch {
      summary = week.slice(0, 10).map((f) => `- ${f.competitorName}: ${f.title}`).join('\n');
    }
  }
  return {
    text: [
      `🕵️ <b>Competitors this week · ${h(clientName)}</b>`,
      `<i>${competitors.length} watched · ${week.length} finding${week.length === 1 ? '' : 's'}</i>`,
      '',
      summary ? h(truncate(summary, 2800)) : 'Quiet week: no new offers, products or notable changes from the competitors.',
      ...(igLines.length
        ? ['', '<b>📸 Instagram followers</b>', `• <b>${h(clientName)}</b>: ${ownIg ? `${ownIg.followers.toLocaleString('en')}${signed(ownIg.gained7)}` : 'not connected'}`, ...igLines]
        : []),
      ...(googleLines.length
        ? ['', '<b>⭐ Google reviews</b>', `• <b>${h(clientName)}</b>: ${own !== null ? `+${own} new this week` : 'not connected'}`, ...googleLines]
        : []),
    ].join('\n'),
    buttons: competitors.map((c) => [{ text: `📢 ${truncate(c.name, 24)}: ads now`, url: adLibraryUrl(c) }]).slice(0, 4),
  };
}

/** Meta Ad Library search for the competitor: every ad running now on Facebook and Instagram. */
export function adLibraryUrl(c: { name: string; instagram?: string }) {
  const q = new URLSearchParams({ active_status: 'active', ad_type: 'all', country: 'ALL', q: c.instagram || c.name, search_type: 'keyword_unordered', media_type: 'all' });
  return `https://www.facebook.com/ads/library/?${q}`;
}

export async function handleCompetitorCallback(query: { id: string; data?: string; message?: { message_id: number; chat: { id: number } } }) {
  const chatId = query.message?.chat.id;
  const messageId = query.message?.message_id;
  if (!chatId || !messageId) return answerCallback(query.id);
  const [, action, clientId, id] = (query.data || '').split(':');
  const f = clientId && id ? await getFinding(clientId, id) : null;
  if (!f) return answerCallback(query.id, 'This finding is no longer available.');
  const clientName = (await listClientProfiles()).find((c) => c.id === f.clientId)?.brandName || 'client';
  if (action === 's') {
    await answerCallback(query.id, 'Saving to the library…');
    await saveTextToLibrary(chatId, `save: Competitor idea for ${clientName} — ${f.competitorName} (${f.source}): ${f.title}. ${f.detail}${f.idea ? ` Idea: ${f.idea}` : ''}${f.url ? ` ${f.url}` : ''}`);
    return;
  }
  if (action === 't') {
    await answerCallback(query.id, 'Making a task…');
    await startTaskFromText(chatId, `For ${clientName}: respond to ${f.competitorName}'s ${KIND[f.kind].replace(/^\S+\s/, '').toLowerCase()} — ${f.title}${f.idea ? ` (idea: ${f.idea})` : ''}`, 'text');
    return;
  }
  await editMessage(chatId, messageId, findingCard(f, clientName));
  return answerCallback(query.id);
}
