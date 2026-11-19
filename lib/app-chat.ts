import crypto from 'crypto';
import { listClientProfiles } from './admin-ops';
import { clientNames } from './app-api';
import { saveTextFromApp } from './app-library';
import { taskClientList } from './app-tasks';
import { clientsWithAds, costPerConversion, fetchClientAds } from './ads-metrics';
import { stoppedAds } from './ads-watch';
import { actionSummary, askAssistant, claimsDone, CHAT_MODELS, type AssistantAction, type ChatMessage, type PlannerCampaign, type PlannerComment } from './assistant';
import { clientCampaigns, setCampaignStatus } from './ads-control';
import { clientIdsWithMetaAds as metaAdClients } from './meta-ads';
import { autoModel } from './assistant-telegram';
import { addDoc, getSetting, listDocs, setSetting, updateDoc } from './data/store';
import {
  draftEmailReply,
  draftNewEmail,
  getEmailAccount,
  listEmailAccounts,
  sendNewEmail,
  getEmailItem,
  isNoReply,
  listIgnoreRules,
  removeIgnoreRule,
  sendEmailReply,
  skipCause,
  updateEmailAccount,
  updateEmailItem,
} from './email/inbox';
import { autoBrief } from './email/reply-brief';
import { setKnowledgeStatus } from './knowledge';
import { clientIdsWithMetaAds, fetchClientMetaAds } from './meta-ads';
import { removeFact } from './assistant-memory';
import { placeFact } from './memory-guard';
import { addFactTo, clientIdOf, removeFactFrom, type FileKey } from './memory-files';
import { applyProfileUpdate } from './master-profile';
import { approveFiveStarDrafts, GBP_REVIEWS } from './review-engine';
import { cairoDay, hideStoredComment, listCommentQueue, postApprovedCommentReply, setCommentDraft, skipComment, socialOverview } from './social-sync';
import { clientInstagramGrowth, googleGrowth, listCompetitors, listFindings } from './competitors';
import { supabase } from './supabase';
import { understandTaskMessage } from './task-ai';
import { completeTask, createTask, formatWhen, listDoneSince, missingFields, setTaskStatus, type TaskFields } from './tasks';
import { addWebsite, runWebsiteChecks, websiteOverview } from './website-monitor';
import { jlApi, jlKey, jlRecords, type JlRecord } from './jl-comfort';
import { runChatAgent } from './chat-agent';
import { OPENROUTER_MODEL } from './openrouter';
import type { GbpStoredReview } from '@/types/database';

// The Anwarz app's AI chat (Chat tab). Same assistant as the Telegram bot (lib/assistant.ts), plus a
// "BUSINESS NOW" snapshot (reviews, ads, websites, social, JL Comfort) and app-only actions.
// Quick, undoable things (a task, a library note, a fact he asked to remember) happen at once with
// an Undo button; everything else waits for ✅ Confirm. One open conversation, kept in chat_sessions
// under chat_id "app"; "New chat" starts a fresh one.

const CHAT_ID = 'app';
const KEEP_MESSAGES = 40; // shown in the app; the model sees the last few
const MODEL_TURNS = 12;

export type AppChatAction = AssistantAction & {
  id: string;
  /** drafted: an email reply written and shown on the card, sent only on ✅ Send. */
  state: 'proposed' | 'drafted' | 'done' | 'cancelled' | 'failed' | 'undone';
  result?: string;
  draft?: string;
  from?: string;
  toEmail?: string | null;
  prevStatus?: string; // the email's status before the draft, put back on Drop
  draftSubject?: string; // a new email's subject
  undo?: { kind: 'task' | 'library' | 'fact'; id: string; file?: FileKey } | null;
  /** What the card says (set by the server, so a new kind of action shows without an app update). */
  card?: string;
  link?: { type: 'task' | 'email' | 'library'; id: string } | null;
};

export interface AppChatMessage {
  role: 'user' | 'assistant';
  content: string;
  at: string;
  heard?: boolean; // the user's message came from a voice note
  model?: string;
  actions?: AppChatAction[];
  links?: { type: 'task' | 'email' | 'library'; id: string; title: string }[];
  /** Changes he asked for that couldn't be prepared, and why. */
  dropped?: string[];
  /** The tool calls the assistant made (tools engine), for the failure log. */
  steps?: string[];
  /** His 👎 / 👍 on this answer. */
  feedback?: 'bad' | 'good' | null;
}

interface Session {
  id: string;
  chat_id: string;
  model: string | null;
  provider: string | null;
  status: 'active' | 'ended';
  messages: AppChatMessage[];
  updated_at: string;
}

function check<T>(result: { data: T; error: { message: string } | null }) {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

export async function appChatSession(): Promise<Session | null> {
  const rows = check(await supabase.from('chat_sessions').select().eq('chat_id', CHAT_ID).eq('status', 'active').order('updated_at', { ascending: false }).limit(1)) as Session[];
  return rows[0] || null;
}

async function saveSession(id: string, patch: Partial<Session>) {
  return check(await supabase.from('chat_sessions').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id).select().single()) as Session;
}

export async function newAppChat() {
  await supabase.from('chat_sessions').update({ status: 'ended' }).eq('chat_id', CHAT_ID).eq('status', 'active');
}

async function openSession(): Promise<Session> {
  const current = await appChatSession();
  if (current) return current;
  const model = await autoModel();
  return check(
    await supabase
      .from('chat_sessions')
      .insert({ id: crypto.randomBytes(6).toString('base64url'), chat_id: CHAT_ID, model: model?.model ?? null, provider: model?.provider ?? null, messages: [] })
      .select()
      .single()
  ) as Session;
}

// ---------- What the assistant sees beyond Telegram ----------

const settle = <T,>(p: Promise<T>, fallback: T, ms = 8_000) =>
  Promise.race([p.catch(() => fallback), new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);

async function jlSnapshot(detail: boolean) {
  if (!jlKey()) return '';
  const get = (path: string) => jlApi(path, undefined, 7_000);
  const [overview, orders, samples] = await Promise.all([
    get('overview'),
    detail ? get('orders').catch(() => null) : Promise.resolve(null),
    detail ? get('samples').catch(() => null) : Promise.resolve(null),
  ]);
  const brief = (list: unknown, n: number) =>
    (Array.isArray(list) ? list : [])
      .slice(0, n)
      .map((o) => {
        const x = o as Record<string, unknown>;
        return [x.orderNumber || x.number || x.id, x.status, x.customerName || x.name, x.total ? `$${x.total}` : '', x.createdAt || x.created_at, x.source]
          .filter(Boolean)
          .join(' · ');
      })
      .join('\n');
  return [
    `JL COMFORT (his e-commerce store): orders by status ${JSON.stringify(overview.orders || {})}; samples by status ${JSON.stringify(overview.samples || {})}`,
    orders ? `Latest orders:\n${brief((orders as Record<string, unknown>).orders, 6)}` : '',
    samples ? `Latest sample requests:\n${brief((samples as Record<string, unknown>).samples, 6)}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

// Each part of BUSINESS NOW is detailed only when the question is about it, so the context stays
// small enough for the free models (Groq allows ~8K tokens a minute); a one-line count is always there.
const REVIEW_WORDS = /\breviews?\b|ريفيو|تقييم|مراجع|جوجل ماب/i;
const SOCIAL_WORDS = /\b(followers?|facebook|instagram|insta|fb|ig|social|posts?|comments?|page)\b|فولو|متابع|فيسبوك|فيس|انستا|إنستا|سوشيال|بوست|كومنت|تعليق/i;
const JL_NUMBER = /\b(JL|S)-?\d{3,5}\b/i;
const JL_WORDS = /\b(jl|comfort|orders?|samples?|shop|store|sales?)\b|اوردر|أوردر|طلبات|عينات|عينة|المتجر|مبيعات/i;
const COMPETITOR_WORDS = /\b(competitors?|competition|rivals?)\b|منافس|المنافسين|منافسين|المنافسة/i;
const COMMENT_WORDS = /\b(comments?|replies|reply to .* (comment|post)|dm)\b|كومنت|تعليق|تعليقات|الردود/i;
const DONE_WORDS = /\b(finish(ed)?|done|did i|completed|this week|last week|progress)\b|خلصت|خلّصت|عملت|انجزت|أنجزت|اتعمل|الاسبوع|الأسبوع/i;
const BROAD_WORDS = /\b(status|summary|overview|today|everything|update me|what'?s new|what needs)\b|ملخص|ايه الأخبار|ايه الاخبار|إيه الأخبار|النهارده|كل حاجة|محتاج مني/i;

const DAY_MS = 86_400_000;
const cairoDayAgo = (days: number) => cairoDay(new Date(Date.now() - days * DAY_MS));
const ADS_WORDS =
  /\b(ads?|adverts?|campaigns?|spend|spent|spending|budget|clicks?|conversions?|cpc|ctr|cpa|roas|leads?|impressions?|reach|performance|meta|google ads|facebook ads)\b|إعلان|اعلان|الاعلانات|الإعلانات|حمل|حملة|ميزاني|صرف|مصروف|كليك|نقرات|تحويلات|نتايج|نتائج|أداء|اداء/i;

const pct = (now: number, before: number | undefined) => (before ? `${now >= before ? '+' : ''}${Math.round(((now - before) / before) * 100)}%` : '');
const money = (n: number, currency?: string) => `${n.toFixed(n >= 100 ? 0 : 2)}${currency ? ` ${currency}` : ''}`;

/** Google and Meta results per client for the last 7 (or 30) days, with the change from the period before. Only when he asks about ads. */
async function adsPerformance(days: 7 | 30) {
  const [names, googleClients, metaClients] = await Promise.all([clientNames(), clientsWithAds(), clientIdsWithMetaAds()]);
  const from = cairoDayAgo(days);
  const to = cairoDayAgo(1);
  const prevFrom = cairoDayAgo(days * 2);
  const prevTo = cairoDayAgo(days + 1);
  const lines = await Promise.all([
    ...googleClients.map(async (c) => {
      const [cur, prev] = await Promise.all([fetchClientAds(c.id as string, from, to), fetchClientAds(c.id as string, prevFrom, prevTo).catch(() => null)]);
      if (!cur) return '';
      const t = cur.totals;
      const cpa = costPerConversion(t);
      return `- ${names.get(c.id as string) || 'Client'} · Google Ads: spend ${money(t.cost, cur.currency)} ${pct(t.cost, prev?.totals.cost)}, ${t.impressions} impressions, ${t.clicks} clicks ${pct(t.clicks, prev?.totals.clicks)}, ${Math.round(t.conversions * 10) / 10} conversions ${pct(t.conversions, prev?.totals.conversions)}${cpa !== null && cpa !== undefined ? `, ${money(Number(cpa), cur.currency)} per conversion` : ''}`;
    }),
    ...metaClients.map(async (id) => {
      const [cur, prev] = await Promise.all([fetchClientMetaAds(id, from, to), fetchClientMetaAds(id, prevFrom, prevTo).catch(() => null)]);
      if (!cur) return '';
      const t = cur.totals;
      return `- ${names.get(id) || 'Client'} · Meta: spend ${money(t.spend, cur.currency)} ${pct(t.spend, prev?.totals.spend)}, reach ${t.reach} ${pct(t.reach, prev?.totals.reach)}, ${t.impressions} impressions, ${t.linkClicks} link clicks ${pct(t.linkClicks, prev?.totals.linkClicks)}`;
    }),
  ].map((p) => p.catch((error) => `- (one ad account couldn’t be read: ${(error instanceof Error ? error.message : String(error)).slice(0, 80)})`)));
  const shown = lines.filter(Boolean);
  return `ADS RESULTS, last ${days} days (${from} to ${to}; % = change from the ${days} days before):\n${shown.length ? shown.join('\n') : 'no ad accounts connected'}`;
}

/** Tasks he marked done in the last 7 days, newest first. */
async function doneLately() {
  const [done, names] = await Promise.all([listDoneSince(new Date(Date.now() - 7 * DAY_MS)), clientNames()]);
  if (!done.length) return 'DONE LATELY (last 7 days): none';
  const seen = new Set<string>();
  const rows = done.filter((d) => (seen.has(d.task.id) ? false : (seen.add(d.task.id), true))).slice(0, 30);
  return [
    `DONE LATELY (last 7 days, ${rows.length}${done.length > rows.length ? '+' : ''}):`,
    ...rows.map((d) => `- ${d.at.slice(0, 10)} · ${d.task.title}${d.task.client_id ? ` · ${names.get(d.task.client_id) || ''}` : ''}`),
  ].join('\n');
}

async function businessNow(topic = '') {
  const broad = BROAD_WORDS.test(topic);
  const wants = {
    ads: ADS_WORDS.test(topic),
    reviews: broad || REVIEW_WORDS.test(topic),
    social: broad || SOCIAL_WORDS.test(topic),
    jl: JL_WORDS.test(topic),
    done: DONE_WORDS.test(topic),
    competitors: COMPETITOR_WORDS.test(topic),
  };
  const days = /\b(30|month|monthly)\b|شهر/i.test(topic) ? 30 : 7;
  const [snapshot, done, adsResults, rivals] = await Promise.all([
    businessSnapshot(wants),
    wants.done ? settle(doneLately(), '') : Promise.resolve(''),
    wants.competitors ? settle(competitorsText(), 'COMPETITORS: couldn’t be read right now.', 15_000) : Promise.resolve(''),
    wants.ads ? settle(adsPerformance(days), 'ADS RESULTS: couldn’t be read right now.', 20_000) : Promise.resolve(''),
  ]);
  return [snapshot, done, adsResults, rivals].filter(Boolean).join('\n\n');
}

/** Each client's competitors: Instagram followers (gained in 7 days), Google rating, and their latest moves. */
async function competitorsText() {
  const clients = (await listClientProfiles()).filter((c): c is typeof c & { id: string } => Boolean(c.id && c.brandName));
  const blocks = await Promise.all(
    clients.map(async (client) => {
      const list = await listCompetitors(client.id);
      if (!list.length) return '';
      const [own, findings, rows] = await Promise.all([
        clientInstagramGrowth(client.id).catch(() => null),
        listFindings(client.id).catch(() => []),
        Promise.all(
          list.map(async (c) => {
            const [ig, g] = await Promise.all([igGrowth(c.id), googleGrowth(c.id).catch(() => null)]);
            const parts = [
              ig ? `IG ${ig.followers}${ig.gained7 !== null ? ` (${ig.gained7 >= 0 ? '+' : ''}${ig.gained7} in 7d)` : ''}` : '',
              g?.rating ? `Google ${g.rating.toFixed(1)}★ (${g.count ?? '?'} reviews${g.gained7 ? `, +${g.gained7} in 7d` : ''})` : '',
            ].filter(Boolean);
            return `  - ${c.name}${parts.length ? `: ${parts.join(' · ')}` : ''}`;
          })
        ),
      ]);
      const fortnight = new Date(Date.now() - 14 * DAY_MS).toISOString();
      const recent = findings.filter((f) => f.at >= fortnight).slice(0, 6);
      return [
        `${client.brandName} (own Instagram ${own ? `${own.followers}${own.gained7 !== null ? `, ${own.gained7 >= 0 ? '+' : ''}${own.gained7} in 7d` : ''}` : 'not tracked'}) vs:`,
        ...rows,
        recent.length
          ? `  Latest moves (14 days):\n${recent.map((f) => `  · ${f.at.slice(0, 10)} ${f.competitorName} [${f.kind}] ${f.title}${f.idea ? ` → idea: ${f.idea.slice(0, 120)}` : ''}`).join('\n')}`
          : '  No new moves in 14 days.',
      ].join('\n');
    })
  );
  const shown = blocks.filter(Boolean);
  return `COMPETITORS:\n${shown.length ? shown.join('\n') : 'none tracked yet (Admin → Competitors)'}`;
}

async function igGrowth(id: string) {
  const { instagramGrowth } = await import('./competitors');
  return instagramGrowth(id).catch(() => null);
}

const PAUSE_WORDS = /\b(pause|stop|resume|restart|turn (on|off)|switch (on|off)|enable|disable)\b|وقف|أوقف|اوقف|إيقاف|ايقاف|شغل|شغّل|رجع.*(الإعلان|الاعلان|الحمل)|قفل/i;

/** Every client's campaigns that can be paused or resumed, with short keys for the planner. */
async function allCampaigns(): Promise<PlannerCampaign[]> {
  const [google, meta, names] = await Promise.all([
    import('./ads-metrics').then((m) => m.clientsWithAds()).catch(() => []),
    metaAdClients().catch(() => [] as string[]),
    clientNames(),
  ]);
  const ids = [...new Set([...google.map((c) => c.id as string), ...meta])];
  const lists = await Promise.all(ids.map((id) => clientCampaigns(id).then((list) => list.map((c) => ({ ...c, clientId: id }))).catch(() => [])));
  return lists.flat().map((c, i) => ({ key: `c${i + 1}`, clientName: names.get(c.clientId) || 'Client', ...c }));
}

/** Comments waiting on Facebook / Instagram, for the planner (ids) and the answer (text). Risky first. */
async function waitingComments(): Promise<PlannerComment[]> {
  const [queue, names] = await Promise.all([listCommentQueue(), clientNames()]);
  const risk = { high: 0, watch: 1, none: 2 } as Record<string, number>;
  return queue
    .sort((a, b) => (risk[a.riskLevel || 'none'] ?? 2) - (risk[b.riskLevel || 'none'] ?? 2) || b.createdTime.localeCompare(a.createdTime))
    .slice(0, 12)
    .map((c) => ({
      id: c.id,
      clientName: names.get(c.clientId) || null,
      platform: c.platform,
      author: c.authorName || 'Someone',
      message: `${c.riskLevel === 'high' ? '[NEEDS CARE] ' : c.riskLevel === 'watch' ? '[WATCH] ' : ''}${c.message}`,
      draft: c.draft || null,
    }));
}

async function businessSnapshot(wants: { reviews: boolean; social: boolean; jl: boolean }) {
  const [names, reviews, ads, sites, social, jl] = await Promise.all([
    settle(clientNames(), new Map<string, string>()),
    settle(listDocs<GbpStoredReview>(GBP_REVIEWS, { where: { status: ['draft_ready', 'needs_draft'] } }), [] as (GbpStoredReview & { id: string })[]),
    settle(stoppedAds(), { checkedAt: null, stopped: [] }),
    settle(websiteOverview(), null),
    wants.social ? settle(socialOverview(), []) : Promise.resolve([]),
    settle(jlSnapshot(wants.jl), ''),
  ]);
  const name = (id: string) => names.get(id) || 'Client';
  const waiting = reviews.filter((r) => r.backlog !== 'waiting' && r.backlog !== 'dismissed').sort((a, b) => b.createTime.localeCompare(a.createTime));
  const perClient = new Map<string, number>();
  for (const r of waiting) perClient.set(r.clientId, (perClient.get(r.clientId) || 0) + 1);

  return [
    'BUSINESS NOW:',
    `GOOGLE REVIEWS WAITING FOR A REPLY: ${waiting.length}${waiting.length ? ` (${[...perClient].map(([id, n]) => `${name(id)} ${n}`).join(', ')}); ready 5★ drafts: ${waiting.filter((r) => r.rating === 5 && r.status === 'draft_ready' && r.draft).length}` : ''}`,
    ...waiting.slice(0, wants.reviews ? 8 : 0).map((r) => `- ${name(r.clientId)} · ${r.rating}★ · ${r.reviewerName || 'Anonymous'}: ${(r.comment || '(rating only)').replace(/\s+/g, ' ').slice(0, 140)}${r.draft ? ` → drafted reply: ${r.draft.replace(/\s+/g, ' ').slice(0, 120)}` : ''}`),
    `ADS STOPPED: ${ads.stopped.length ? ads.stopped.map((a) => `${a.clientName} (${a.platform === 'google' ? 'Google Ads' : 'Meta'}): ${a.reason} since ${a.since.slice(0, 10)}`).join('; ') : 'none'}${ads.checkedAt ? ` (checked ${ads.checkedAt.slice(0, 16).replace('T', ' ')} UTC)` : ''}`,
    sites
      ? `WEBSITES: ${sites.sites.length} checked hourly; ${sites.down.length ? `DOWN: ${sites.down.map((s) => `${sites.names.get(s.clientId) || s.url} ${s.url}`).join(', ')}` : 'all up'}${sites.sslSoon.length ? `; SSL expiring soon: ${sites.sslSoon.map((s) => s.url).join(', ')}` : ''}`
      : '',
    social.length
      ? `FACEBOOK / INSTAGRAM (followers, change today / this week; comments waiting):\n${social
          .map((s) => {
            const f = (x?: { followers?: number; day?: number; week?: number }) =>
              x?.followers !== undefined ? `${x.followers}${x.day !== undefined ? ` (${x.day >= 0 ? '+' : ''}${x.day} today` : ''}${x.week !== undefined ? `, ${x.week >= 0 ? '+' : ''}${x.week} week)` : x.day !== undefined ? ')' : ''}` : '-';
            const latest = s.latest[0];
            return `- ${name(s.clientId)}: FB ${f(s.fb)} · IG ${f(s.ig)}${s.waiting ? ` · ${s.waiting} comments waiting` : ''}${latest ? ` · last post ${latest.createdTime?.slice(0, 10)}: ${(latest.message || '').replace(/\s+/g, ' ').slice(0, 80)}` : ''}`;
          })
          .join('\n')}`
      : '',
    wants.social ? '' : 'FACEBOOK / INSTAGRAM: not loaded for this question (followers and posts load when he asks about them).',
    wants.reviews ? '' : '(Review texts load when he asks about reviews.)',
    jl,
  ]
    .filter(Boolean)
    .join('\n');
}

// ---------- Asking ----------

/** Turns a chat task into a saved task, filling what's missing with plain defaults (no questions while he's out). */
async function saveTaskFromChat(text: string) {
  const clients = await taskClientList();
  const { fields } = await understandTaskMessage(text, clients);
  const f: TaskFields = { ...fields, title: fields.title?.trim() || text.slice(0, 120) };
  for (const need of missingFields(f)) {
    if (need === 'category') f.category = f.clientId ? 'work' : 'work';
    if (need === 'client') f.noClient = true;
    if (need === 'when') f.noDate = true;
    if (need === 'time') f.allDay = true;
    if (need === 'repeat_end') f.repeatForever = true;
  }
  if (f.category === 'work' && !f.clientId) f.noClient = true;
  if (!f.date && !f.repeat) f.noDate = true;
  return createTask(f, { chatId: CHAT_ID, source: 'app-chat', rawInput: text });
}

async function saveFact(text: string) {
  const clients = (await listClientProfiles()).filter((c): c is typeof c & { id: string } => Boolean(c.id && c.brandName)).map((c) => ({ id: c.id, brandName: c.brandName }));
  const placed = await placeFact(text, clients);
  const fact = await addFactTo(placed.file, placed.text, placed.label);
  const client = clientIdOf(placed.file);
  return { fact, file: placed.file, where: client ? clients.find((c) => c.id === client)?.brandName || 'client file' : 'general memory' };
}

/** Runs one action for real. */
async function runAction(a: AppChatAction): Promise<AppChatAction> {
  try {
    switch (a.type) {
      case 'task': {
        const task = await saveTaskFromChat(a.text);
        return { ...a, state: 'done', result: `📌 ${task.title} · ${formatWhen(task)}`, undo: { kind: 'task', id: task.id }, link: { type: 'task', id: task.id } };
      }
      case 'library_note': {
        const { item } = await saveTextFromApp(a.text);
        return { ...a, state: 'done', result: `📚 Saved: ${item.title}`, undo: { kind: 'library', id: item.id }, link: { type: 'library', id: item.id } };
      }
      case 'remember': {
        const saved = await saveFact(a.text);
        return { ...a, state: 'done', result: `🧠 Saved to ${saved.where}: ${saved.fact.text}`, undo: { kind: 'fact', id: saved.fact.id, file: saved.file } };
      }
      case 'forget': {
        const fact = await removeFact(a.factId);
        return { ...a, state: fact ? 'done' : 'failed', result: fact ? `🗑 Forgotten: ${fact.text}` : 'That fact was already removed.' };
      }
      case 'update_profile':
        return { ...a, state: 'done', result: `📄 Master profile updated: ${await applyProfileUpdate(a.change)}` };
      case 'complete_task': {
        const { task, movedTo } = await completeTask(a.taskId);
        return { ...a, state: 'done', result: `✅ Done: ${a.title}${movedTo ? ` · next one ${formatWhen(task)}` : ''}` };
      }
      case 'email_important': {
        const item = await getEmailItem(a.emailId);
        if (!item) return { ...a, state: 'failed', result: 'That email is gone.' };
        const account = await getEmailAccount(item.account_id);
        const cause = skipCause({ ...item, status: 'skipped' }, account || undefined, await listIgnoreRules());
        if (account && cause?.kind === 'sender' && item.from_email) {
          await updateEmailAccount(account.id, { ignored_senders: account.ignored_senders.filter((s) => s !== item.from_email) });
        }
        if (cause?.kind === 'rule' && cause.ruleId) await removeIgnoreRule(cause.ruleId);
        await updateEmailItem(item.id, { status: 'new', summary: item.summary || item.snippet?.slice(0, 300) || null, reason: 'You marked it important' });
        return { ...a, state: 'done', result: `⭐ Back in Needs me: ${a.subject}`, link: { type: 'email', id: item.id } };
      }
      case 'email_reply': {
        // ✅ on the card writes the draft (nothing is sent); ✅ Send on the drafted card sends it.
        const item = await getEmailItem(a.emailId);
        if (!item) return { ...a, state: 'failed', result: 'That email is gone.' };
        if (item.status === 'sent') return { ...a, state: 'failed', result: 'You already replied to this email.' };
        if (isNoReply(item.from_email)) return { ...a, state: 'failed', result: 'This is a no-reply address: nobody reads replies to it.' };
        const account = await getEmailAccount(item.account_id);
        if (!account) return { ...a, state: 'failed', result: 'This inbox was disconnected.' };
        const brief = a.notes ? a.notes : autoBrief(item, account.email);
        const draft = await draftEmailReply({ ...item, brief }, account, brief);
        await updateEmailItem(item.id, { status: 'draft', draft, brief });
        return { ...a, state: 'drafted', draft, from: account.email, toEmail: item.from_email, prevStatus: item.status, result: undefined, link: { type: 'email', id: item.id } };
      }
      case 'ads_status': {
        const done: string[] = [];
        const failed: string[] = [];
        for (const c of a.campaigns) {
          try {
            await setCampaignStatus(a.clientId, c, a.pause);
            done.push(c.name);
          } catch (error) {
            failed.push(`${c.name}: ${(error instanceof Error ? error.message : String(error)).slice(0, 160)}`);
          }
        }
        return {
          ...a,
          state: done.length ? 'done' : 'failed',
          result: [done.length ? `${a.pause ? '⏸ Paused' : '▶️ Resumed'}: ${done.join(', ')}` : '', failed.length ? `⚠️ ${failed.join(' · ')}` : ''].filter(Boolean).join('\n'),
        };
      }
      case 'comment_reply':
        if (a.text) await setCommentDraft(a.commentId, a.text);
        await postApprovedCommentReply(a.commentId);
        return { ...a, state: 'done', result: `💬 Reply posted to ${a.author}` };
      case 'comment_hide':
        await hideStoredComment(a.commentId);
        return { ...a, state: 'done', result: `🙈 Hid ${a.author}'s comment` };
      case 'comment_skip':
        await skipComment(a.commentId);
        return { ...a, state: 'done', result: `Skipped ${a.author}'s comment` };
      case 'email_new': {
        const account = (await listEmailAccounts()).find((x) => x.email.toLowerCase() === a.inbox.toLowerCase());
        if (!account) return { ...a, state: 'failed', result: `${a.inbox} isn’t connected (Admin → Email).` };
        const mail = await draftNewEmail(account, a.to, a.notes, a.subject);
        return { ...a, state: 'drafted', draft: mail.body, draftSubject: mail.subject, from: account.email, toEmail: a.to, result: undefined };
      }
      case 'email_done':
        await updateEmailItem(a.emailId, { status: 'done' });
        return { ...a, state: 'done', result: `✔️ Done: ${a.subject}`, link: { type: 'email', id: a.emailId } };
      case 'approve_five_star': {
        let ids: string[] | undefined;
        if (a.clientId) ids = (await listDocs<GbpStoredReview>(GBP_REVIEWS, { where: { status: 'draft_ready', clientId: a.clientId } })).map((r) => r.id);
        if (ids && !ids.length) return { ...a, state: 'done', result: 'No ready 5★ replies for that client.' };
        const results = await approveFiveStarDrafts(ids);
        const posted = results.filter((r) => r.success).length;
        const failed = results.length - posted;
        return { ...a, state: failed && !posted ? 'failed' : 'done', result: `⭐ Posted ${posted} 5★ repl${posted === 1 ? 'y' : 'ies'}${failed ? ` · ${failed} failed` : ''}` };
      }
      case 'add_client': {
        const clients = await listClientProfiles();
        const brand = a.fields.brandName!;
        if (clients.some((c) => c.brandName.trim().toLowerCase() === brand.toLowerCase())) return { ...a, state: 'failed', result: `${brand} is already a client.` };
        const now = new Date().toISOString();
        const id = await addDoc('clients', {
          brandName: brand,
          ownerName: a.fields.ownerName || '',
          email: a.fields.email || '',
          mobileNumber: a.fields.mobileNumber || '',
          websiteUrl: a.fields.websiteUrl || '',
          facebookLink: a.fields.facebookLink || '',
          instagramLink: a.fields.instagramLink || '',
          tiktokLink: a.fields.tiktokLink || '',
          googleLink: a.fields.googleLink || '',
          createdAt: now,
          updatedAt: now,
        });
        let extra = '';
        if (a.checkWebsite && a.fields.websiteUrl) {
          const site = await addWebsite({ clientId: id, url: a.fields.websiteUrl }).catch(() => null);
          if (site) {
            await runWebsiteChecks({ ids: [site.id] }).catch(() => undefined);
            extra = ' · website checked hourly';
          }
        }
        return { ...a, state: 'done', result: `➕ Added client ${brand}${extra}` };
      }
      case 'update_client':
        await updateDoc('clients', a.clientId, { ...a.changes, updatedAt: new Date().toISOString() });
        return { ...a, state: 'done', result: `✏️ Updated ${a.clientName}` };
      case 'add_website': {
        const clients = await listClientProfiles();
        const client = (a.clientId && clients.find((c) => c.id === a.clientId)) || clients.find((c) => c.brandName.toLowerCase() === a.clientName.toLowerCase());
        if (!client?.id) return { ...a, state: 'failed', result: `There’s no client named ${a.clientName}.` };
        const site = await addWebsite({ clientId: client.id, url: a.url, label: a.label || undefined });
        await runWebsiteChecks({ ids: [site.id] }).catch(() => undefined);
        return { ...a, state: 'done', result: `🌐 ${a.url} is checked every hour for ${client.brandName}` };
      }
      // JL Comfort: the same actions as its admin panel (the order / sample sheet in the app).
      case 'jl_status':
      case 'jl_ship':
      case 'jl_confirmed':
      case 'jl_resend': {
        const body =
          a.type === 'jl_status'
            ? { action: 'set_status', status: a.status, note: a.note || 'Changed from the Anwarz chat' }
            : a.type === 'jl_ship'
              ? { action: 'ship', carrier: a.carrier || 'other', trackingNumber: a.trackingNumber, trackingUrl: a.trackingUrl || undefined }
              : a.type === 'jl_confirmed'
                ? { action: 'supplier_confirmed' }
                : { action: a.email === 'supplier' ? (a.kind === 'order' ? 'resend_supplier_po' : 'resend_supplier') : `resend_${a.email}` };
        const r = await jlApi<{ ok?: boolean; order?: { statusLabel?: string }; sample?: { statusLabel?: string } }>(`${a.kind}s/${a.jlId}`, body, 45_000);
        const label = r.order?.statusLabel || r.sample?.statusLabel || '';
        const done =
          a.type === 'jl_status'
            ? `🏷 ${a.number} is now ${a.status === 'supplier_confirmed' ? 'Confirmed by the supplier' : label || a.status}`
            : a.type === 'jl_ship'
              ? `🚚 ${a.number} shipped · tracking ${a.trackingNumber} emailed to ${a.customer}`
              : a.type === 'jl_confirmed'
                ? `✅ ${a.number} confirmed by the supplier · ${a.customer} emailed`
                : `✉️ ${a.number}: ${a.email === 'supplier' ? 'sent to the supplier' : `${a.email} email sent to ${a.customer}`} again`;
        if (r.ok === false) return { ...a, state: 'failed', result: `${done.replace(/^\S+ /, '')}, but an email failed to send. See the history in JL Comfort.` };
        return { ...a, state: 'done', result: done };
      }
    }
  } catch (error) {
    return { ...a, state: 'failed', result: (error instanceof Error ? error.message : String(error)).slice(0, 300) };
  }
}

/** Done at once (with Undo): a task, a library note, a fact he clearly asked to save. The rest wait for ✅. */
const runsAtOnce = (a: AssistantAction) => a.type === 'task' || a.type === 'library_note' || (a.type === 'remember' && Boolean(a.explicit));

/** The model only sees plain text; this says what happened to each action. */
function actionNote(a: AppChatAction) {
  if (a.state === 'done') return `[DONE by the bot] ${actionSummary(a)}${a.result ? ` → ${a.result}` : ''}`;
  if (a.state === 'drafted') return `[DRAFT WRITTEN, NOT SENT yet: reply to "${a.type === 'email_reply' ? a.subject : ''}": ${(a.draft || '').slice(0, 300)}]`;
  if (a.state === 'failed') return `[FAILED] ${actionSummary(a)}: ${a.result || ''}`;
  if (a.state === 'cancelled' || a.state === 'undone') return `[CANCELLED by Ahmed] ${actionSummary(a)}`;
  return `[PROPOSED, not done yet: ${actionSummary(a)}]`;
}

function toHistory(messages: AppChatMessage[]): ChatMessage[] {
  return messages.slice(-MODEL_TURNS).map((m) => ({
    role: m.role,
    content: [m.content, ...(m.actions || []).map(actionNote)].filter(Boolean).join('\n'),
  }));
}

// ---------- Which engine answers ----------
// 'agent' (default): one Claude Haiku 5.5 assistant with tools (lib/chat-agent.ts). 'classic': the
// planner + answer pair in lib/assistant.ts. The agent falls back to classic on any failure.
const ENGINE = 'app_chat_engine';

export async function chatEngine(): Promise<'agent' | 'classic'> {
  const s = await getSetting<{ engine?: string }>(ENGINE).catch(() => null);
  return s?.engine === 'classic' ? 'classic' : 'agent';
}

export async function setChatEngine(engine: 'agent' | 'classic') {
  await setSetting(ENGINE, { engine, updatedAt: new Date().toISOString() });
}

interface TurnReply {
  text: string;
  actions: AssistantAction[];
  dropped: string[];
  links: NonNullable<AppChatMessage['links']>;
  modelLabel: string;
  model: string | null;
  provider: string | null;
  steps?: string[];
}

async function agentTurn(question: string, history: ChatMessage[], topic: string): Promise<TurnReply> {
  const reply = await runChatAgent(
    question,
    history,
    { businessNow: (t) => businessNow(t), campaigns: () => allCampaigns(), comments: () => waitingComments() },
    runsAtOnce,
    () => businessNow(topic)
  );
  return {
    text: reply.text,
    actions: reply.actions,
    dropped: reply.dropped,
    links: [
      ...reply.tasks.slice(0, 4).map((t) => ({ type: 'task' as const, id: t.id, title: t.title })),
      ...reply.emails.slice(0, 4).map((e) => ({ type: 'email' as const, id: e.id, title: e.subject })),
    ],
    modelLabel: 'Claude Haiku 5.5 · tools',
    model: OPENROUTER_MODEL,
    provider: 'openrouter',
    steps: reply.steps,
  };
}

export async function askFromApp(question: string, heard: boolean) {
  let session = await openSession();
  const history = toHistory(session.messages || []);
  const recentAsks = (session.messages || []).filter((m) => m.role === 'user').slice(-2).map((m) => m.content);
  const topic = [...recentAsks, question].join(' ');
  let reply: TurnReply | null = null;
  let agentError: string | null = null;
  if ((await chatEngine()) === 'agent') {
    try {
      reply = await agentTurn(question, history, topic);
    } catch (error) {
      agentError = error instanceof Error ? error.message.slice(0, 300) : String(error);
      console.error('Chat agent failed, using the classic chat:', agentError);
    }
  }
  if (!reply) reply = await classicTurn(question, history, topic, session.model);
  if (agentError) reply.modelLabel += ' (tools unavailable)';
  return saveTurn(session, question, heard, reply, agentError);
}

async function classicTurn(question: string, history: ChatMessage[], topic: string, lastModel: string | null): Promise<TurnReply> {
  // Every message starts with the best model that has quota (Claude Haiku when OpenRouter is on), so a
  // conversation doesn't stay on a fallback after one busy moment; askAssistant falls back if it fails.
  const chosen = (await autoModel()) || CHAT_MODELS.find((m) => m.model === lastModel) || null;
  if (!chosen) throw new Error('No AI model has free quota left right now. Try again later.');

  const comments = SOCIAL_WORDS.test(topic) || COMMENT_WORDS.test(topic) || BROAD_WORDS.test(topic) ? await settle(waitingComments(), [] as PlannerComment[]) : [];
  const campaigns = PAUSE_WORDS.test(question) ? await settle(allCampaigns(), [] as PlannerCampaign[], 15_000) : [];
  // JL Comfort orders and samples the planner can act on, when the talk is about them (or names one).
  const jl = JL_WORDS.test(topic) || JL_NUMBER.test(topic) ? await settle(jlRecords(), { records: [] as JlRecord[], carriers: [] }, 12_000) : { records: [], carriers: [] };
  const reply = await askAssistant(chosen, question, history, {
    surface: 'app',
    extraContext: async () =>
      [
        await businessNow(topic),
        comments.length
          ? `FACEBOOK / INSTAGRAM COMMENTS WAITING (${comments.length}, risky first):\n${comments
              .map((c) => `- ${c.clientName || ''} · ${c.platform} · ${c.author}: ${c.message.replace(/\s+/g, ' ').slice(0, 160)}${c.draft ? ` → AI draft: ${c.draft.replace(/\s+/g, ' ').slice(0, 120)}` : ''}`)
              .join('\n')}`
          : '',
      ]
        .filter(Boolean)
        .join('\n\n'),
    runsAtOnce,
    comments,
    inboxes: (await listEmailAccounts().catch(() => [])).filter((x) => x.enabled).map((x) => x.email.toLowerCase()),
    campaigns,
    jl: jl.records,
    carriers: jl.carriers,
  });
  return {
    text: reply.text,
    actions: reply.actions,
    dropped: [...reply.dropped, ...(reply.plannerError ? [`Planner error: ${reply.plannerError}`] : [])],
    links: [
      ...reply.tasks.slice(0, 4).map((t) => ({ type: 'task' as const, id: t.id, title: t.title })),
      ...reply.emails.slice(0, 4).map((e) => ({ type: 'email' as const, id: e.id, title: e.subject })),
      ...reply.items.slice(0, 4).map((k) => ({ type: 'library' as const, id: k.id, title: k.title })),
    ],
    modelLabel: reply.fellBackFrom ? `${reply.usedModel.label} (${reply.fellBackFrom.label} was busy)` : reply.usedModel.label,
    model: reply.usedModel.model,
    provider: reply.usedModel.provider,
  };
}

/** Runs the quick actions, saves both messages, and logs anything that went wrong. */
async function saveTurn(session: Session, question: string, heard: boolean, reply: TurnReply, agentError: string | null) {
  const actions: AppChatAction[] = [];
  for (const a of reply.actions) {
    const action: AppChatAction = { ...a, id: crypto.randomBytes(4).toString('base64url'), state: 'proposed' };
    actions.push(runsAtOnce(a) ? await runAction(action) : action);
  }
  const now = new Date().toISOString();
  const warning =
    !actions.some((a) => a.state === 'done') && claimsDone(reply.text) && !actions.length ? '\n\n⚠️ Nothing was changed: changes only happen through the cards.' : '';
  for (const a of actions) a.card = cardText(a);
  const answer: AppChatMessage = {
    role: 'assistant',
    content: (reply.text || (actions.length ? 'Here’s what I prepared:' : '…')) + warning,
    dropped: reply.dropped,
    at: now,
    model: reply.modelLabel,
    actions,
    links: reply.links,
    ...(reply.steps?.length ? { steps: reply.steps } : {}),
  };
  const messages = [...(session.messages || []), { role: 'user' as const, content: question, at: now, heard }, answer].slice(-KEEP_MESSAGES);
  session = await saveSession(session.id, { messages, model: reply.model, provider: reply.provider });
  // Something went wrong without him having to say so: log it for review.
  const problems = [...(answer.dropped || []), ...(agentError ? [`Tools chat failed, classic chat answered: ${agentError}`] : []), ...actions.filter((a) => a.state === 'failed').map((a) => `Failed: ${actionSummary(a)}: ${a.result || ''}`), warning ? 'Claimed a change that wasn’t made' : ''].filter(Boolean);
  if (problems.length) await logChatFailure('auto', question, answer, problems).catch((error) => console.error('Chat failure log:', error));
  return { session, answer };
}

// ---------- Failure log ----------
// Every turn that went wrong (a change it couldn't prepare, a failed action, a 👎) is kept in the
// app_chat_failures setting (newest last, at most 300): the test set for improving the chat.

const FAILURES = 'app_chat_failures';
const KEEP_FAILURES = 300;

export interface ChatFailure {
  at: string; // the answer's time
  loggedAt: string;
  kind: 'auto' | 'thumbs_down' | 'action_failed';
  question: string;
  answer: string;
  model: string | null;
  actions: string[];
  problems: string[];
  note: string | null;
}

async function logChatFailure(kind: ChatFailure['kind'], question: string, answer: AppChatMessage, problems: string[], note: string | null = null) {
  const saved = (await getSetting<{ items?: ChatFailure[] }>(FAILURES).catch(() => null))?.items || [];
  const entry: ChatFailure = {
    at: answer.at,
    loggedAt: new Date().toISOString(),
    kind,
    question: question.slice(0, 2000),
    answer: answer.content.slice(0, 2000),
    model: answer.model || null,
    actions: (answer.actions || []).map((a) => `${a.state}: ${actionSummary(a)}${a.result ? ` → ${a.result}` : ''}`.slice(0, 400)),
    problems: [...problems, ...(answer.steps?.length ? [`Tool calls: ${answer.steps.join(' → ')}`] : [])].map((p) => p.slice(0, 600)),
    note: note?.slice(0, 1000) || null,
  };
  await setSetting(FAILURES, { items: [...saved, entry].slice(-KEEP_FAILURES), updatedAt: entry.loggedAt });
}

export async function listChatFailures() {
  return (await getSetting<{ items?: ChatFailure[] }>(FAILURES))?.items || [];
}

/** 👎 / 👍 on an answer (by its time); a 👎 goes to the failure log with his note. */
export async function rateAnswer(at: string, rating: 'bad' | 'good' | null, note: string | null = null) {
  const session = await appChatSession();
  if (!session) throw new Error('This chat has ended.');
  const messages = session.messages || [];
  const index = messages.findIndex((m) => m.role === 'assistant' && m.at === at);
  if (index < 0) throw new Error('That answer is no longer in this chat.');
  const answer = messages[index];
  answer.feedback = rating;
  await saveSession(session.id, { messages });
  if (rating === 'bad') {
    const question = [...messages.slice(0, index)].reverse().find((m) => m.role === 'user')?.content || '';
    await logChatFailure('thumbs_down', question, answer, answer.dropped || [], note);
  }
  return answer;
}

/** The text on an action's card (the app shows it for kinds it has no wording of its own for). */
function cardText(a: AppChatAction) {
  switch (a.type) {
    case 'jl_status':
      return `🏷 ${a.number} · ${a.customer}
${statusName(a.from)} → ${statusName(a.status)} (no email)`;
    case 'jl_ship':
      return `🚚 ${a.number} · ${a.customer} shipped
Tracking ${a.trackingNumber}${a.carrier ? ` (${a.carrier.toUpperCase()})` : ''}, emailed to the customer`;
    case 'jl_confirmed':
      return `✅ ${a.number} · ${a.customer}: confirmed by the supplier
Emails the customer that their samples are confirmed`;
    case 'jl_resend':
      return `✉️ ${a.number} · ${a.customer}: send ${a.email === 'supplier' ? 'the request to the supplier' : `the ${a.email} email`} again`;
    default:
      return actionSummary(a).replace(/\s*\[[^\]]*\]\s*$/, '').replace(/\s*\(he confirms first\)/, '');
  }
}

const statusName = (s: string) => (s === 'supplier_confirmed' ? 'Confirmed by the supplier' : s.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()));

/** ✅ Confirm, ✖️ Cancel or ↩️ Undo on an action card. */
export async function decideAction(actionId: string, decision: 'confirm' | 'cancel' | 'undo' | 'send' | 'edit', edits: { draft?: string; subject?: string } = {}) {
  const session = await appChatSession();
  if (!session) throw new Error('This chat has ended.');
  const messages = session.messages || [];
  const message = messages.find((m) => m.actions?.some((a) => a.id === actionId));
  const action = message?.actions?.find((a) => a.id === actionId);
  if (!message || !action) throw new Error('That card is no longer in this chat.');

  let next: AppChatAction = action;
  if (decision === 'confirm') {
    if (action.state !== 'proposed') throw new Error('Already handled.');
    next = await runAction(action);
  } else if (decision === 'edit') {
    if (action.state !== 'drafted' || action.type !== 'email_new') throw new Error('Only a new email’s draft is edited here.');
    const draft = edits.draft?.trim();
    if (!draft || draft.length < 2) throw new Error('Write the email first.');
    next = { ...action, draft: draft.slice(0, 20_000), draftSubject: edits.subject?.trim().slice(0, 200) || action.draftSubject };
  } else if (decision === 'send' && action.type === 'email_new') {
    if (action.state !== 'drafted' || !action.draft) throw new Error('There’s no draft to send.');
    const account = (await listEmailAccounts()).find((x) => x.email.toLowerCase() === action.inbox.toLowerCase());
    if (!account) throw new Error(`${action.inbox} isn’t connected.`);
    await sendNewEmail(account, { to: action.to, subject: action.draftSubject || '(no subject)', text: action.draft });
    next = { ...action, state: 'done', result: `📨 Sent to ${action.to} from ${account.email}` };
  } else if (decision === 'send') {
    if (action.state !== 'drafted' || action.type !== 'email_reply') throw new Error('There’s no draft to send.');
    const item = await getEmailItem(action.emailId);
    if (!item) throw new Error('That email is gone.');
    if (item.status === 'sent') throw new Error('Already sent.');
    if (item.status !== 'draft' || !item.draft) throw new Error('The draft was dropped. Ask me to write it again.');
    const account = await getEmailAccount(item.account_id);
    if (!account) throw new Error('This inbox was disconnected.');
    await sendEmailReply(item, account); // the latest draft, including edits made in the Inbox
    await updateEmailItem(item.id, { status: 'sent', sent_at: new Date().toISOString() });
    next = { ...action, state: 'done', draft: item.draft, result: `📨 Sent to ${item.from_email} from ${account.email}` };
  } else if (decision === 'cancel' && action.state === 'drafted' && action.type === 'email_new') {
    next = { ...action, state: 'cancelled' };
  } else if (decision === 'cancel') {
    if (action.state === 'drafted' && action.type === 'email_reply') {
      const item = await getEmailItem(action.emailId);
      const back = (['new', 'done', 'ignored', 'skipped'] as const).find((st) => st === action.prevStatus) || 'new';
      if (item && item.status === 'draft') await updateEmailItem(item.id, { status: back, draft: null, brief: null });
    } else if (action.state !== 'proposed') throw new Error('Already handled.');
    next = { ...action, state: 'cancelled' };
  } else {
    if (action.state !== 'done' || !action.undo) throw new Error('This can’t be undone.');
    const u = action.undo;
    if (u.kind === 'task') await setTaskStatus(u.id, 'cancelled');
    if (u.kind === 'library') await setKnowledgeStatus(u.id, 'removed');
    if (u.kind === 'fact' && u.file) await removeFactFrom(u.file, u.id);
    next = { ...action, state: 'undone', result: `↩️ Undone: ${action.result || ''}`, undo: null, link: null };
  }
  message.actions = message.actions!.map((a) => (a.id === actionId ? next : a));
  await saveSession(session.id, { messages });
  if (next.state === 'failed') {
    const index = messages.indexOf(message);
    const question = [...messages.slice(0, index)].reverse().find((m) => m.role === 'user')?.content || '';
    await logChatFailure('action_failed', question, message, [`Failed: ${actionSummary(next)}: ${next.result || ''}`]).catch(() => undefined);
  }
  return next;
}
