import { GoogleGenerativeAI } from '@google/generative-ai';
import { listClientProfiles } from './admin-ops';
import { aiJson } from './ai-json';
import { aiUsageDay, groqFetch, isRateLimitError, listAiUsage, trackGemini, type AiUsageRow } from './ai-usage';
import { listCategories, searchKnowledge, type KnowledgeItem } from './knowledge';
import { cairoParts, describeRepeat, formatWhen, groupTasks, listOpenTasks, WEEKDAYS, weekdayOf, type Task } from './tasks';
import { getMemory, memoryContext, type AssistantMemory, type MemoryFact } from './assistant-memory';
import { supabase } from './supabase';
import { openRouterChat, openRouterOn } from './openrouter';
import { clientFileText, clientsMentioned, type ClientRef } from './memory-files';
import { getMasterProfile, needsMasterProfile } from './master-profile';
import { relevantPastChats } from './chat-history';
import { JL_ORDER_STATUSES, JL_SAMPLE_STATUSES, type JlKind, type JlRecord } from './jl-comfort';

// The bot's chat assistant: answers questions from the owner's library, open tasks and client
// list, with a model the owner picks among those that still have free quota today.

export interface ChatModel {
  key: string; // short, for Telegram buttons
  provider: 'groq' | 'gemini' | 'openrouter';
  model: string;
  label: string;
  note: string;
}

export const CHAT_MODELS: ChatModel[] = [
  { key: 'orh', provider: 'openrouter', model: 'anthropic/claude-haiku-5.5', label: 'Claude Haiku 5.5', note: 'paid, best Arabic' },
  { key: 'g120', provider: 'groq', model: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B', note: 'smartest' },
  { key: 'qw', provider: 'groq', model: 'qwen/qwen3.8-27b', label: 'Qwen 3.8', note: 'fastest, good Arabic' },
  { key: 'g20', provider: 'groq', model: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B', note: 'fast' },
  { key: 'gf', provider: 'gemini', model: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', note: 'strong, long answers' },
  { key: 'gfl', provider: 'gemini', model: 'gemini-flash-latest', label: 'Gemini Flash', note: 'Google’s newest Flash' },
  { key: 'glt', provider: 'gemini', model: 'gemini-flash-lite-latest', label: 'Gemini Flash-Lite', note: 'light' },
];

export interface ModelAvailability extends ChatModel {
  requestsLeft: number | null; // Groq only, from its headers
  warning: string | null;
}

const HOUR_MS = 3_600_000;

/**
 * Models that still have free quota: Groq by its remaining requests today, Gemini unless it
 * hit a rate limit in the last hour (Google doesn't report what's left).
 */
export async function availableChatModels(): Promise<ModelAvailability[]> {
  const today = aiUsageDay();
  const rows = (await listAiUsage(1).catch(() => [] as AiUsageRow[])).filter((r) => r.day === today);
  const now = Date.now();
  const result: ModelAvailability[] = [];
  const paid = await openRouterOn().catch(() => false);
  for (const m of CHAT_MODELS) {
    if (m.provider === 'openrouter') {
      if (paid) result.push({ ...m, requestsLeft: null, warning: null });
      continue;
    }
    if (m.provider === 'groq' && !process.env.GROQ_API_KEY) continue;
    if (m.provider === 'gemini' && !process.env.GEMINI_API_KEY) continue;
    const mine = rows.filter((r) => r.provider === m.provider && r.model === m.model);
    const lastOk = Math.max(0, ...mine.map((r) => (r.last_ok_at ? Date.parse(r.last_ok_at) : 0)));
    const lastErrorRow = mine.filter((r) => r.last_error_at).sort((a, b) => Date.parse(b.last_error_at!) - Date.parse(a.last_error_at!))[0];
    const lastError = lastErrorRow ? Date.parse(lastErrorRow.last_error_at!) : 0;
    const limited = lastErrorRow && lastError > lastOk && now - lastError < HOUR_MS && isRateLimitError(lastErrorRow.last_error);
    if (limited) continue; // out of free quota for now

    const limits = mine.map((r) => r.limits).filter(Boolean).sort((a, b) => Date.parse(b!.readAt) - Date.parse(a!.readAt))[0];
    const requestsLeft = limits?.requestsLeft ?? null;
    if (requestsLeft !== null && requestsLeft <= 0) continue;
    const failing = lastErrorRow && lastError > lastOk && now - lastError < 10 * 60_000;
    result.push({ ...m, requestsLeft, warning: failing ? 'had errors just now' : null });
  }
  return result;
}

// ---------- Context ----------

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  at?: string;
  actions?: Array<AssistantAction & { id?: string; done?: boolean; cancelled?: boolean }>; // proposed in this reply; done once the owner confirmed
}

export interface ChatContext {
  text: string;
  items: KnowledgeItem[];
  tasks: Task[];
  memory: AssistantMemory;
  emails: ChatEmail[];
}

export interface ChatEmail {
  id: string;
  subject: string | null;
  from_name: string | null;
  from_email: string | null;
  received_at: string | null;
  summary: string | null;
  snippet: string | null;
  status: string;
  email_accounts: { label: string | null; email: string } | null;
}

const EMAIL_COLUMNS = 'id, subject, from_name, from_email, received_at, summary, snippet, status, email_accounts(label, email)';

/** Emails by id, in the same shape the chat sees them. */
export async function emailsByIds(ids: string[]): Promise<ChatEmail[]> {
  if (!ids.length) return [];
  const { data, error } = await supabase.from('email_items').select(EMAIL_COLUMNS).in('id', ids);
  if (error) throw new Error(error.message);
  return (data || []) as unknown as ChatEmail[];
}

/** The best matches for a search across every saved email (any age or status), best first. */
export async function searchEmails(query: string, limit = 10): Promise<ChatEmail[]> {
  const words = emailSearchWords(query).map(filterWord).filter(Boolean);
  if (!words.length) return [];
  const { data, error } = await supabase
    .from('email_items')
    .select(EMAIL_COLUMNS)
    .or(words.flatMap((w) => [`from_name.ilike.*${w}*`, `from_email.ilike.*${w}*`, `subject.ilike.*${w}*`, `summary.ilike.*${w}*`]).join(','))
    .order('received_at', { ascending: false })
    .limit(80);
  if (error) throw new Error(error.message);
  const score = (e: ChatEmail) => {
    const hay = `${e.from_name || ''} ${e.from_email || ''} ${e.subject || ''}`.toLowerCase();
    const summary = (e.summary || '').toLowerCase();
    return words.reduce((n, w) => n + (hay.includes(w.toLowerCase()) ? 2 : summary.includes(w.toLowerCase()) ? 1 : 0), 0);
  };
  return ((data || []) as unknown as ChatEmail[])
    .map((e) => ({ e, s: score(e) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.e);
}

export { emailLine };

// Words that say what to DO with an email, not which one: they'd match half the inbox.
const EMAIL_FILLER = new Set(
  (
    'email emails mail mails message messages inbox the and for from with about that this these those last latest newest recent show what which who when ' +
    'reply answer respond send write draft mark done important please can could you your his her their our him them me my mine get got tell give need want ' +
    'say said asked asking ask back today yesterday week sent new old one any all just also still again into over have has had was were are been will would ' +
    'should did does not yes okay thanks thank hello hi dear him there here then than them they some more very much ' +
    'ايميل إيميل الايميل الإيميل ايميلات رسالة الرسالة جالي جاني اخر آخر عايز عاوز ابعت شوف رد ردي على علي من في عن ده دي اللي بتاع بتاعت كده لو ممكن خلاص تمام'
  ).split(' ')
);

/** The words in a question that can pick out an email: names, addresses, subject words (most telling first). */
export function emailSearchWords(text: string) {
  const addresses = text.match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g) || [];
  const words = text
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, ' ')
    .replace(/[^\w؀-ۿ\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !EMAIL_FILLER.has(w.toLowerCase()) && !/^\d{1,3}$/.test(w));
  // Capitalised words (names, companies) and long words first.
  const ranked = [...new Set(words)].sort((a, b) => Number(/^[A-Z]/.test(b)) - Number(/^[A-Z]/.test(a)) || b.length - a.length);
  return [...new Set([...addresses.map((a) => a.toLowerCase()), ...ranked])].slice(0, 6);
}

/** Safe inside a PostgREST or() filter. */
const filterWord = (w: string) => w.replace(/[,()*%\\"]/g, '');

/**
 * Recent important emails from every inbox, plus the emails anywhere in the archive (any age, any
 * status) that best match the names, addresses and subject words in the question, best match first.
 */
async function chatEmails(question: string, withSkipped = false): Promise<ChatEmail[]> {
  const words = emailSearchWords(question).map(filterWord).filter(Boolean);
  const [recent, skipped, matching] = await Promise.all([
    supabase.from('email_items').select(EMAIL_COLUMNS).neq('status', 'skipped').order('received_at', { ascending: false }).limit(12),
    withSkipped
      ? supabase.from('email_items').select(EMAIL_COLUMNS).eq('status', 'skipped').order('received_at', { ascending: false }).limit(8)
      : Promise.resolve({ data: [] }),
    words.length
      ? supabase
          .from('email_items')
          .select(EMAIL_COLUMNS)
          .or(words.flatMap((w) => [`from_name.ilike.*${w}*`, `from_email.ilike.*${w}*`, `subject.ilike.*${w}*`]).join(','))
          .order('received_at', { ascending: false })
          .limit(60)
      : Promise.resolve({ data: [] }),
  ]);
  // Rank the matches: more of the question's words in the sender or subject = better; ties, newest.
  const score = (e: ChatEmail) => {
    const hay = `${e.from_name || ''} ${e.from_email || ''} ${e.subject || ''}`.toLowerCase();
    return words.reduce((n, w) => n + (hay.includes(w.toLowerCase()) ? 1 : 0), 0);
  };
  const best = ((matching.data || []) as unknown as ChatEmail[])
    .map((e) => ({ e, s: score(e) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, 10)
    .map((x) => x.e);
  const all = [...best, ...((recent.data || []) as unknown as ChatEmail[]), ...((skipped.data || []) as unknown as ChatEmail[])];
  return all.filter((e, i) => all.findIndex((x) => x.id === e.id) === i).slice(0, withSkipped ? 28 : 20);
}

function emailLine(e: ChatEmail) {
  const when = e.received_at ? cairoParts(new Date(e.received_at)) : null;
  return [
    `[E:${e.id}]`,
    when ? `${when.date} ${when.time}` : '',
    `inbox: ${e.email_accounts?.label || e.email_accounts?.email || '?'}`,
    `from: ${e.from_name || ''} <${e.from_email || ''}>`,
    `subject: ${e.subject || ''}`,
    (e.summary || e.snippet || '').replace(/\s+/g, ' ').slice(0, 220),
    e.status === 'sent' ? '(Ahmed replied)' : e.status === 'skipped' ? '(not important)' : '',
  ]
    .filter(Boolean)
    .join(' | ');
}

function taskLine(t: Task, clientName: (id: string | null) => string | null) {
  const client = clientName(t.client_id);
  return [
    `[T:${t.id}]`,
    formatWhen(t),
    t.title,
    client ? `client: ${client}` : t.category === 'personal' ? 'personal' : 'agency work',
    t.priority === 'high' ? 'HIGH priority' : '',
    t.repeat_rule ? describeRepeat(t.repeat_rule, t.repeat_until, t.repeat_count) : '',
    t.notes ? `notes: ${t.notes.slice(0, 120)}` : '',
  ]
    .filter(Boolean)
    .join(' | ');
}

/** What the model gets each turn: matching library items, open tasks, clients. Kept small for Groq's 8K tokens a minute. */
export async function buildContext(question: string, history: ChatMessage[], withSkipped = false): Promise<ChatContext> {
  const recentUser = history.filter((m) => m.role === 'user').slice(-2).map((m) => m.content);
  const [items, tasks, profiles, categories, memory, emails] = await Promise.all([
    searchKnowledge([...recentUser, question].join(' ').slice(-500), 6).catch(() => [] as KnowledgeItem[]),
    listOpenTasks().catch(() => [] as Task[]),
    listClientProfiles(),
    listCategories().catch(() => []),
    getMemory(),
    chatEmails([...recentUser, question].join(' '), withSkipped).catch(() => [] as ChatEmail[]),
  ]);
  const clients = profiles.filter((c) => c.id && c.brandName);
  const clientName = (id: string | null) => (id ? clients.find((c) => c.id === id)?.brandName || null : null);

  // Only what this question needs: the files of the clients it's about, the full master profile
  // when it's about writing about Ahmed, and past chats on the same client or words.
  const topicText = [...recentUser, question].join(' ');
  const about = clientsMentioned(topicText, clients as ClientRef[]).slice(0, 3);
  const [clientFiles, master, pastChats] = await Promise.all([
    Promise.all(about.map((c) => clientFileText(c.id!, c.brandName))).catch(() => [] as string[]),
    needsMasterProfile(topicText) ? getMasterProfile().catch(() => null) : Promise.resolve(null),
    relevantPastChats(topicText, about.map((c) => c.id!)).catch(() => []),
  ]);

  // Overdue and today first, then the rest by date; at most 40.
  const g = groupTasks(tasks);
  const ordered = [...g.overdue, ...g.today, ...tasks.filter((t) => !g.overdue.includes(t) && !g.today.includes(t))].slice(0, 40);

  const now = cairoParts(new Date());
  const text = [
    `NOW (Cairo): ${WEEKDAYS[weekdayOf(now.date)]} ${now.date} ${now.time}`,
    '',
    memoryContext(memory, [topicText, ...about.map((c) => c.brandName)].join(' ')),
    '',
    `CLIENTS: ${clients.map((c) => `${c.brandName}${c.ownerName ? ` (owner ${c.ownerName})` : ''}${c.websiteUrl ? ` ${c.websiteUrl}` : ''}`).join('; ') || 'none'}`,
    '',
    `OPEN TASKS (${tasks.length}${tasks.length > ordered.length ? `, showing ${ordered.length}` : ''}):`,
    ...(ordered.length ? ordered.map((t) => taskLine(t, clientName)) : ['none']),
    '',
    'LIBRARY ITEMS MATCHING THE CONVERSATION:',
    ...(items.length
      ? items.map((k) =>
          [
            `[K:${k.id}]`,
            k.type,
            categories.find((c) => c.id === k.category_id)?.name || 'Public',
            k.title,
            clientName(k.client_id) ? `client: ${clientName(k.client_id)}` : '',
            k.summary || '',
            k.url || '',
            k.content ? `text: ${k.content.slice(0, 300)}` : '',
          ]
            .filter(Boolean)
            .join(' | ')
        )
      : ['none found']),
    '',
    'EMAILS (connected inboxes; newest first; matches for the question included):',
    ...(emails.length ? emails.map(emailLine) : ['none']),
    ...clientFiles.filter(Boolean).flatMap((f) => ['', f]),
    ...(pastChats.length
      ? ['', 'PAST CONVERSATIONS THAT MATCH (summaries):', ...pastChats.map((s) => `- ${s.at.slice(0, 10)} · ${s.topic}: ${s.summary}`)]
      : []),
    ...(master ? ['', `AHMED'S FULL MASTER PROFILE (use it for anything written about him; follow its positioning and tone rules):`, master.text] : []),
  ].join('\n');
  return { text, items, tasks, memory, emails };
}

const SYSTEM_PROMPT = `You are the personal assistant of Ahmed Anwar, founder of North Via Marketing, inside his private Telegram bot.
You can see his profile and the facts he asked you to remember (ABOUT THE OWNER, REMEMBERED FACTS), his open tasks, his client list and the items in his knowledge library that match the conversation (screenshots, links, notes).

Memory:
- Use ABOUT THE OWNER and REMEMBERED FACTS naturally; they are true unless he corrects them. Never invent facts about him.
- When he asks you to remember something, the bot checks it against what's saved and files it (a client's file, or the general rules) — a card below shows where, or asks if it clashes with something saved. Say so in one short line, e.g. "تمام، شوف الكارت تحت 🧠". Never claim it's saved yourself.
- CLIENT FILE sections are rules and facts for that client only; use them for anything about that client. PAST CONVERSATIONS are summaries of earlier chats; use them when he refers back ("last time", "اتكلمنا"). When facts disagree, the newer one wins.
- Changes to his MASTER PROFILE (new role, venture, degree, achievement, correction) are an "update_profile" change he confirms with ✅.

How to answer:
- Reply in the language the owner writes in (Egyptian Arabic, English or mixed). Be direct and practical; short unless they ask for detail (aim under 150 words).
- Use the CONTEXT. When you use a library item, mention it and put its tag like [K:abc12345]; for a task, its tag like [T:abc12345]; for an email, its tag like [E:abc12345] (the bot adds a button to open it). For "the last email from X", pick the newest matching email in EMAILS and give sender, inbox, date and a short summary; if none matches, say it isn't among the emails the bot has read. Never invent items, tasks, dates or numbers that aren't in the context.
- When they describe a task or project, connect it to what fits from the library and from their other tasks for that client, and say why it fits.
- If nothing in the library fits, say so plainly, and you may give your own ideas (say they're yours).
- Formatting: plain text for Telegram; you may use **bold** and "- " bullets. No tables, no headings.

Changes — be honest:
- You never change anything yourself. The bot prepares changes and shows a confirmation card for each one; it happens only when the owner taps ✅ Confirm.
- The changes prepared for THIS message are listed under "PLANNED CHANGES" in the owner's message. If there are some, describe them in one short line and say to tap ✅ Confirm on the card below (e.g. "جهزتلك إضافة العميل — دوس ✅ Confirm تحت"). Don't repeat all the details; the card shows them.
- If the owner asked for a change but PLANNED CHANGES is "none", say what's missing (e.g. the client name) or that it can't be done from the chat (ads, reviews, invoices, deleting things are in the admin panel).
- NEVER say something is done, saved, added or updated ("done", "تم", "سجلت", "ضفت", "خلاص") unless the conversation shows a line starting with [DONE by the bot]. Lines starting with [DONE by the bot] or [FAILED] are what really happened; trust them.`;

/** The same assistant inside the Anwarz phone app: it also sees reviews, ads, social, websites and JL Comfort. */
export function systemPromptFor(surface: ChatSurface) {
  if (surface === 'telegram') return SYSTEM_PROMPT;
  return SYSTEM_PROMPT.replace('inside his private Telegram bot.', 'inside his Anwarz phone app (his control center while he is away from the office).')
    .replace(
      'his open tasks, his client list and the items in his knowledge library that match the conversation (screenshots, links, notes).',
      'his open tasks, his client list, the items in his knowledge library that match the conversation (screenshots, links, notes), and BUSINESS NOW: Google reviews waiting, stopped ads, websites down, Facebook/Instagram followers and comments waiting, competitors (their followers, Google rating and latest moves) and JL Comfort orders and samples. EMAILS also include recent skipped ones (marked "not important").'
    )
    .replace('Formatting: plain text for Telegram;', 'Formatting: plain text for a phone screen;')
    .replace(
      'his open tasks,',
      'his open tasks, the tasks he finished in the last 7 days (DONE LATELY),'
    )
    .replace(
      "or that it can't be done from the chat (ads, reviews, invoices, deleting things are in the admin panel).",
      "or that it can't be done from the chat. From this chat you CAN prepare: tasks, library notes, remembering facts, adding/updating clients and website checks, marking tasks done, bringing a skipped email back as important, marking an email done, replying to an email or writing a new one from any of his inboxes (a draft he reads and sends), posting ready 5★ review replies, replying to, hiding or skipping Facebook/Instagram comments, pausing or resuming a client's Google / Meta ad campaigns (always confirmed), and JL Comfort orders and sample requests: change a status, mark one shipped with its tracking (emails the customer), mark a sample request confirmed by the supplier (emails the customer), or send one of their emails again. Replying to a 1–4★ review is done from the Reviews tab; invoices and ads changes are in the admin panel."
    );
}

// ---------- Changes the bot can make (after a confirm tap) ----------

export const CLIENT_FIELDS = {
  brandName: 'Brand name',
  ownerName: 'Owner',
  email: 'Email',
  mobileNumber: 'Phone',
  websiteUrl: 'Website',
  facebookLink: 'Facebook',
  instagramLink: 'Instagram',
  tiktokLink: 'TikTok',
  googleLink: 'Google Business link',
} as const;
export type ClientField = keyof typeof CLIENT_FIELDS;

export type AssistantAction =
  | { type: 'task'; text: string }
  | { type: 'add_client'; fields: Partial<Record<ClientField, string>>; checkWebsite: boolean }
  | { type: 'update_client'; clientId: string; clientName: string; changes: Partial<Record<ClientField, string>>; before: Partial<Record<ClientField, string>> }
  | { type: 'add_website'; clientId: string | null; clientName: string; url: string; label: string | null }
  | { type: 'complete_task'; taskId: string; title: string }
  /** explicit = he clearly asked to remember it: saved right away (with Undo), no confirm tap. */
  | { type: 'remember'; text: string; explicit?: boolean }
  | { type: 'forget'; factId: string; text: string }
  | { type: 'update_profile'; change: string }
  // Anwarz app only (lib/app-chat.ts runs them):
  | { type: 'library_note'; text: string }
  | { type: 'library_file'; name: string }
  | { type: 'email_important'; emailId: string; subject: string; always?: boolean; from?: string }
  | { type: 'email_ignore'; emailId: string; subject: string; from: string; mode: 'sender' | 'similar' }
  | { type: 'task_edit'; taskId: string; title: string; changes: TaskChanges; before: string }
  | { type: 'task_delete'; taskId: string; title: string }
  | { type: 'email_done'; emailId: string; subject: string }
  | { type: 'email_reply'; emailId: string; subject: string; to: string; notes: string; tone?: string | null }
  | { type: 'email_new'; inbox: string; to: string; subject: string | null; notes: string }
  | { type: 'approve_five_star'; clientId: string | null; clientName: string | null }
  | { type: 'comment_reply'; commentId: string; author: string; message: string; clientName: string | null; text: string | null }
  | { type: 'comment_hide'; commentId: string; author: string; message: string; clientName: string | null }
  | { type: 'comment_skip'; commentId: string; author: string; message: string; clientName: string | null }
  | { type: 'ads_status'; pause: boolean; clientId: string; clientName: string; campaigns: { platform: 'google' | 'meta'; account: string; id: string; name: string }[] }
  // JL Comfort (jlcomfort.com) orders and sample requests, through its Anwarz API:
  | { type: 'jl_status'; kind: JlKind; jlId: string; number: string; customer: string; status: string; from: string; note: string | null }
  | { type: 'jl_ship'; kind: JlKind; jlId: string; number: string; customer: string; carrier: string | null; trackingNumber: string; trackingUrl: string | null }
  | { type: 'jl_confirmed'; kind: 'sample'; jlId: string; number: string; customer: string }
  | { type: 'jl_resend'; kind: JlKind; jlId: string; number: string; customer: string; email: 'confirmation' | 'shipped' | 'supplier' };

/** A client's campaign the app chat can pause or resume (key = short id for the planner). */
export interface PlannerCampaign {
  key: string;
  clientId: string;
  clientName: string;
  platform: 'google' | 'meta';
  account: string;
  id: string;
  name: string;
  status: 'active' | 'paused';
}

/** A waiting Facebook / Instagram comment, for the app chat's planner. */
export interface PlannerComment {
  id: string;
  clientName: string | null;
  platform: string;
  author: string;
  message: string;
  draft: string | null;
}

export type ChatSurface = 'telegram' | 'app';
export const APP_ONLY_ACTIONS = [
  'library_note',
  'library_file',
  'email_important',
  'email_done',
  'email_reply',
  'email_new',
  'approve_five_star',
  'comment_reply',
  'comment_hide',
  'comment_skip',
  'ads_status',
  'jl_status',
  'jl_ship',
  'jl_confirmed',
  'jl_resend',
  'email_ignore',
  'task_edit',
  'task_delete',
] as const;

/** A change to a saved task's details (only what changes). Dates and times are Cairo. */
export interface TaskChanges {
  title?: string;
  notes?: string | null;
  date?: string | null; // YYYY-MM-DD; null = no date
  time?: string | null; // HH:MM; null = all day
  priority?: 'low' | 'normal' | 'high';
}

/** What the app chat's planner can see and act on, beyond tasks, clients and memory. */
export interface PlannerApp {
  /** Files he attached in this chat (names), for library_file. */
  attachments?: string[];
  emails: ChatEmail[];
  comments: PlannerComment[];
  inboxes: string[];
  campaigns: PlannerCampaign[];
  jl: JlRecord[];
  carriers: { id: string; name: string }[];
}
export type AppOnlyAction = Extract<AssistantAction, { type: (typeof APP_ONLY_ACTIONS)[number] }>;
export const isAppOnlyAction = (a: AssistantAction): a is AppOnlyAction => (APP_ONLY_ACTIONS as readonly string[]).includes(a.type);

export interface PlannerClient {
  id: string;
  brandName: string;
  ownerName?: string;
  email?: string;
  mobileNumber?: string;
  websiteUrl?: string;
  facebookLink?: string;
  instagramLink?: string;
  tiktokLink?: string;
  googleLink?: string;
}

const APP_PLANNER_ACTIONS = `
{"type":"library_note","text":"<what to save to his knowledge library: an idea, note, link or reference, in his words, with the link if any>"}
  (when he says save / add to the library / احفظ في المكتبة / خلي عندك الفكرة دي — ideas and references, not tasks with a date and not facts about how he works (those are remember))
{"type":"email_important","email_id":"<id from EMAILS>"}
  (a skipped email he wants back in his inbox: "this is important", "رجعه", "خليه مهم")
{"type":"email_done","email_id":"<id from EMAILS>"}
  (an email he says is handled / no reply needed)
{"type":"email_reply","email_id":"<id from EMAILS>","notes":"<what the reply should say, in his words and language; \"\" when he just says reply / answer professionally>"}
  (when he asks to reply / answer / رد على an email. The app writes the draft; he reads it and taps Send. Never for no-reply senders.)
{"type":"email_new","from_inbox":"<one address from INBOXES>","to":"<recipient email address>","subject":null,"notes":"<everything the email should say, in his words: amounts, dates, requests>"}
  (a NEW email, not a reply: "send an email / mail / ابعت ايميل from X to Y …". from_inbox: the inbox he names (e.g. "sales@jlcomfort" = sales@jlcomfort.com), or the one that fits the business. The recipient must be a full email address he gave or one from CLIENTS/EMAILS; if missing, return no action so the reply asks for it.)
{"type":"approve_five_star","client_id":"<client id, or null for all clients>"}
  (post every ready 5★ Google review reply — of one client or all — only when he asks to approve/post them)
{"type":"comment_reply","comment_id":"<id from COMMENTS>","text":"<the reply in his words, or null to post the AI draft shown in COMMENTS>"}
  (reply publicly to a Facebook / Instagram comment; he confirms before it is posted)
{"type":"comment_hide","comment_id":"<id from COMMENTS>"}
  (hide a rude, spam or harmful comment, only when he asks)
{"type":"comment_skip","comment_id":"<id from COMMENTS>"}
  (no reply needed)
{"type":"ads_status","campaigns":["<key from CAMPAIGNS>", ...],"pause":true|false}
  (pause or resume ad campaigns when he asks: "pause Patriva's Meta ads", "وقف إعلانات", "شغل الحملة تاني". All the keys of ONE client that match what he said; pause=false to resume. He confirms first.)
{"type":"jl_status","jl_id":"<id from JL COMFORT>","status":"<one status from the lists below>","note":null}
  (change a JL Comfort order's or sample request's status: "mark JL-1022 delivered", "S-1040 cancelled", "خلي الأوردر ده delivered". Only changes the status, no email.
   order statuses: paid, sent_to_supplier, shipped, delivered, closed, cancelled, problem. sample statuses: pending, sent_to_supplier, supplier_confirmed, shipped, delivered, cancelled, problem.
   For "shipped" with a tracking number use jl_ship instead (it emails the customer the tracking).)
{"type":"jl_ship","jl_id":"<id from JL COMFORT>","carrier":"<carrier id from CARRIERS, or null>","tracking_number":"<as he gave it>","tracking_url":null}
  (it shipped, with tracking: marks it Shipped and emails the customer the tracking. tracking_url (https://…) only for a carrier not in CARRIERS. Needs a tracking number; without one, return no action and say it in "missing".)
{"type":"jl_confirmed","jl_id":"<id of a SAMPLE request from JL COMFORT>"}
  (Charlotte / the supplier confirmed a sample request: sets "Confirmed by the supplier" and emails the customer that their samples are confirmed)
{"type":"jl_resend","jl_id":"<id from JL COMFORT>","email":"confirmation|shipped|supplier"}
  (send an email again: the customer's confirmation, the customer's shipped/tracking email, or the order/request to the supplier (Charlotte))`;

function plannerPrompt(
  clients: PlannerClient[],
  tasks: Task[],
  facts: MemoryFact[],
  app?: PlannerApp
) {
  return `You prepare changes a marketing agency owner asks their ${app ? 'phone app (Anwarz)' : 'Telegram bot'} for. You only PREPARE them; the owner confirms each one with a button.
Read the LATEST message (earlier lines are context: a "yes / do it / go ahead" confirms what was discussed just before).
Return ONLY JSON: {"actions": [ ... ], "missing": null} with at most 5 actions, or {"actions": []} when the latest message asks for no change (a question or chit-chat).
When he DOES ask for a change but you can't prepare it (the email, task, order or client isn't in the lists below, or a detail is missing), return {"actions": [], "missing": "<what you couldn't find or what's missing, short and specific, in his language, e.g. 'No email from Isabelle in the last emails I can see' or 'Which order? JL-1021 or JL-1022'>"}. Never guess an id.

Action types:
{"type":"task","text":"<the task as the owner would say it to their task bot, with client, day and time if known>"}
{"type":"add_client","brandName":"…","ownerName":null,"email":null,"mobileNumber":null,"websiteUrl":null,"facebookLink":null,"instagramLink":null,"tiktokLink":null,"googleLink":null,"check_website":true}
  (check_website true = also start the hourly uptime check for its website; true unless the owner says not to)
{"type":"update_client","client_id":"<id from the list>","changes":{"<field>":"<new value>"}}
  fields: brandName, ownerName, email, mobileNumber, websiteUrl, facebookLink, instagramLink, tiktokLink, googleLink. Only fields that change.
{"type":"add_website","client_id":"<id from the list, or null when the client is being added in this same reply>","client_name":"…","url":"https://…","label":null}
  (an extra page or site to check hourly for an existing client; not needed for a new client's main website)
{"type":"complete_task","task_id":"<id from the task list>"}
{"type":"remember","text":"<one short lasting fact, in the owner's language, e.g. 'Bloom prefers WhatsApp over email' or 'الDBA defence is in March 2027'>","asked":true}
  (when he says remember / احفظ / خلي بالك / سجل عندك / افتكر إن, or shares a lasting fact about himself, his companies, clients or how he likes things done. NOT for things with a date to act on — those are tasks. One fact per action. Skip if it's already in MEMORY.
   "asked": true only when he explicitly asked you to remember/save it; false when you're suggesting it yourself.)
{"type":"forget","memory_id":"<id from MEMORY>"}${app ? APP_PLANNER_ACTIONS : ''}
{"type":"update_profile","change":"<what to add or change in Ahmed's MASTER PROFILE, in his words: a new role, venture, degree, certificate, achievement, or a correction>"}
  (only facts about Ahmed himself and his career/ventures; facts about a client are NOT profile changes)
  (when he asks to forget/remove a remembered fact; to correct one, forget the old one and remember the new one)

Rules:
- Only what the owner clearly asks for (or confirms) now. Never repeat a change the conversation shows as [DONE by the bot].
- A new client needs at least a brand name; otherwise return no action (the reply will ask for it).
- Use ids exactly from the lists. URLs with https://. Keep names as the owner wrote them.

CLIENTS (id | brand | owner | email | phone | website | facebook | instagram | tiktok | google):
${clients.map((c) => [c.id, c.brandName, c.ownerName, c.email, c.mobileNumber, c.websiteUrl, c.facebookLink, c.instagramLink, c.tiktokLink, c.googleLink].map((v) => v || '-').join(' | ')).join('\n') || '(none)'}

OPEN TASKS (id | title | when):
${tasks.slice(0, 40).map((t) => `${t.id} | ${t.title} | ${formatWhen(t)}`).join('\n') || '(none)'}

MEMORY (id | fact):
${facts.slice(-60).map((f) => `${f.id} | ${f.text}`).join('\n') || '(none)'}${
    app
      ? `

INBOXES he can send from: ${app.inboxes.join(', ') || '(none connected)'}${
          app.campaigns.length
            ? `

CAMPAIGNS (key | client | platform | campaign | status now):
${app.campaigns.map((c) => `${c.key} | ${c.clientName} | ${c.platform === 'google' ? 'Google Ads' : 'Meta'} | ${c.name} | ${c.status}`).join('\n')}`
            : ''
        }

EMAILS (id | from | subject | status):
${app.emails.map((e) => `${e.id} | ${e.from_name || e.from_email || ''} | ${e.subject || ''} | ${e.status}`).join('\n') || '(none)'}${
          app.jl.length
            ? `

JL COMFORT orders (JL-…) and sample requests (S-…), newest first (id | number | kind | customer | status | created):
${app.jl.map((r) => `${r.id} | ${r.number} | ${r.kind} | ${r.customer} | ${r.status}${r.hasTracking ? ' (has tracking)' : ''} | ${r.createdAt.slice(0, 10)}`).join('\n')}

CARRIERS: ${app.carriers.map((c) => `${c.id} (${c.name})`).join(', ') || '-'}`
            : ''
        }${
          app.comments.length
            ? `

COMMENTS waiting on Facebook / Instagram (id | client | platform | author | comment | AI draft):
${app.comments.map((c) => `${c.id} | ${c.clientName || ''} | ${c.platform} | ${c.author} | ${c.message.replace(/\s+/g, ' ').slice(0, 160)} | ${(c.draft || '-').replace(/\s+/g, ' ').slice(0, 160)}`).join('\n')}`
            : ''
        }`
      : ''
  }`;
}

function cleanUrl(value: unknown) {
  const s = typeof value === 'string' ? value.trim() : '';
  if (!s || s.toLowerCase() === 'null') return null;
  try {
    return new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`).toString();
  } catch {
    return null;
  }
}

function cleanText(value: unknown, max = 120) {
  const s = typeof value === 'string' ? value.trim() : '';
  return s && s.toLowerCase() !== 'null' ? s.slice(0, max) : null;
}

const URL_FIELDS: ClientField[] = ['websiteUrl', 'facebookLink', 'instagramLink', 'tiktokLink', 'googleLink'];

function cleanFields(source: Record<string, unknown>) {
  const out: Partial<Record<ClientField, string>> = {};
  for (const key of Object.keys(CLIENT_FIELDS) as ClientField[]) {
    const value = URL_FIELDS.includes(key) ? cleanUrl(source[key]) : cleanText(source[key]);
    if (value) out[key] = value;
  }
  return out;
}

/**
 * Checks the planner's JSON against the real clients, tasks, emails and orders. Anything that doesn't
 * match is dropped, and why goes into `dropped`, so the answer can tell him instead of going quiet.
 */
export function toActions(
  raw: Record<string, unknown>,
  clients: PlannerClient[],
  tasks: Task[],
  facts: MemoryFact[] = [],
  app: PlannerApp | null = null,
  dropped: string[] = []
): AssistantAction[] {
  const emails = app?.emails ?? null;
  const comments = app?.comments ?? [];
  const inboxes = app?.inboxes ?? [];
  const campaigns = app?.campaigns ?? [];
  const list = Array.isArray(raw.actions) ? (raw.actions as Record<string, unknown>[]) : [];
  const missing = cleanText(raw.missing, 300);
  if (missing) dropped.push(missing);
  const actions: AssistantAction[] = [];
  const drop = (why: string) => dropped.push(why);
  for (const a of list.slice(0, 5)) {
    if (a.type === 'task' && cleanText(a.text, 500)) actions.push({ type: 'task', text: cleanText(a.text, 500)! });
    else if (a.type === 'add_client') {
      const fields = cleanFields(a);
      if (!fields.brandName) {
        drop('A new client needs a brand name.');
        continue;
      }
      if (clients.some((c) => c.brandName.trim().toLowerCase() === fields.brandName!.toLowerCase())) {
        drop(`${fields.brandName} is already a client.`);
        continue;
      }
      actions.push({ type: 'add_client', fields, checkWebsite: a.check_website !== false && Boolean(fields.websiteUrl) });
    } else if (a.type === 'update_client') {
      const client = clients.find((c) => c.id === a.client_id);
      if (!client || !a.changes || typeof a.changes !== 'object') {
        drop('Couldn’t tell which client to update.');
        continue;
      }
      const changes = cleanFields(a.changes as Record<string, unknown>);
      const before: Partial<Record<ClientField, string>> = {};
      for (const key of Object.keys(changes) as ClientField[]) {
        if ((client[key] || '') === changes[key]) delete changes[key];
        else before[key] = client[key] || '';
      }
      if (Object.keys(changes).length) actions.push({ type: 'update_client', clientId: client.id, clientName: client.brandName, changes, before });
    } else if (a.type === 'add_website') {
      const url = cleanUrl(a.url);
      const client = clients.find((c) => c.id === a.client_id);
      const name = client?.brandName || cleanText(a.client_name, 80);
      if (url && name) actions.push({ type: 'add_website', clientId: client?.id || null, clientName: name, url, label: cleanText(a.label, 60) });
    } else if (a.type === 'complete_task') {
      const task = tasks.find((t) => t.id === a.task_id);
      if (task) actions.push({ type: 'complete_task', taskId: task.id, title: task.title });
      else drop('Couldn’t find that task among the open tasks.');
    } else if (a.type === 'remember') {
      const text = cleanText(a.text, 300);
      if (text && !facts.some((f) => f.text.toLowerCase() === text.toLowerCase())) actions.push({ type: 'remember', text, explicit: a.asked === true });
    } else if (a.type === 'update_profile') {
      const change = cleanText(a.change, 600);
      if (change) actions.push({ type: 'update_profile', change });
    } else if (a.type === 'forget') {
      const fact = facts.find((f) => f.id === a.memory_id);
      if (fact) actions.push({ type: 'forget', factId: fact.id, text: fact.text });
    } else if (emails && a.type === 'library_file') {
      const name = cleanText(a.name, 200);
      const files = app?.attachments ?? [];
      const match = files.find((f) => f === name) || files.find((f) => name && f.toLowerCase().includes(name.toLowerCase()));
      if (match) actions.push({ type: 'library_file', name: match });
      else dropped.push(files.length ? `No attached file called "${name}". Attached: ${files.join(', ')}.` : 'No file is attached in this chat.');
    } else if (emails && a.type === 'library_note') {
      const text = cleanText(a.text, 2000);
      if (text) actions.push({ type: 'library_note', text });
    } else if (emails && a.type === 'email_important') {
      const email = emails.find((e) => e.id === a.email_id);
      if (!email) drop('Couldn’t find that email among the ones I can see. Give me the sender’s name or the subject.');
      else if (!['skipped', 'ignored'].includes(email.status) && a.always !== true) drop(`"${email.subject || '(no subject)'}" is already in your inbox.`);
      else
        actions.push({
          type: 'email_important',
          emailId: email.id,
          subject: email.subject || '(no subject)',
          always: a.always === true,
          from: email.from_email || email.from_name || '',
        });
    } else if (emails && a.type === 'email_ignore') {
      const email = emails.find((e) => e.id === a.email_id);
      const mode = a.mode === 'similar' ? 'similar' : 'sender';
      if (!email) drop('Couldn’t find that email among the ones I can see. Give me the sender’s name or the subject.');
      else if (mode === 'sender' && !email.from_email) drop('That email has no sender address to ignore.');
      else actions.push({ type: 'email_ignore', emailId: email.id, subject: email.subject || '(no subject)', from: email.from_email || '', mode });
    } else if (a.type === 'task_edit') {
      const task = tasks.find((t) => t.id === a.task_id);
      if (!task) {
        drop('Couldn’t find that task among the open tasks.');
        continue;
      }
      const src = (a.changes && typeof a.changes === 'object' ? a.changes : {}) as Record<string, unknown>;
      const changes: TaskChanges = {};
      const droppedBefore = dropped.length;
      const title = cleanText(src.title, 300);
      if (title && title !== task.title) changes.title = title;
      if ('notes' in src) changes.notes = cleanText(src.notes, 2000);
      if ('date' in src) {
        if (src.date === null || src.date === 'null') changes.date = null;
        else if (typeof src.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(src.date)) changes.date = src.date;
        else drop(`"${String(src.date)}" isn’t a date (YYYY-MM-DD).`);
      }
      if ('time' in src) {
        if (src.time === null || src.time === 'null') changes.time = null;
        else if (typeof src.time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(src.time)) changes.time = src.time;
        else drop(`"${String(src.time)}" isn’t a time (HH:MM, 24-hour).`);
      }
      if (src.priority === 'low' || src.priority === 'normal' || src.priority === 'high') changes.priority = src.priority;
      if (dropped.length > droppedBefore) continue; // a bad date or time: that's the reason given
      if (!Object.keys(changes).length) drop(`Nothing to change on "${task.title}". Say what should change (day, time, title, priority or notes).`);
      else actions.push({ type: 'task_edit', taskId: task.id, title: task.title, changes, before: formatWhen(task) });
    } else if (a.type === 'task_delete') {
      const task = tasks.find((t) => t.id === a.task_id);
      if (task) actions.push({ type: 'task_delete', taskId: task.id, title: task.title });
      else drop('Couldn’t find that task among the open tasks.');
    } else if (emails && a.type === 'email_done') {
      const email = emails.find((e) => e.id === a.email_id);
      if (email) actions.push({ type: 'email_done', emailId: email.id, subject: email.subject || '(no subject)' });
      else drop('Couldn’t find that email among the ones I can see. Give me the sender’s name or the subject.');
    } else if (emails && a.type === 'email_reply') {
      const email = emails.find((e) => e.id === a.email_id);
      if (!email) drop('Couldn’t find that email among the ones I can see. Give me the sender’s name or the subject.');
      else if (email.status === 'sent') drop(`You already replied to "${email.subject || '(no subject)'}".`);
      if (email && email.status !== 'sent') {
        actions.push({
          type: 'email_reply',
          emailId: email.id,
          subject: email.subject || '(no subject)',
          to: email.from_name || email.from_email || '',
          // His points only; a whole letter here means the planner wrote the reply itself, so the AI drafts it instead.
          notes: ((n) => (n.length > 300 || /^(dear|hi|hello|مرحبا|أهلا|اهلا)\b/i.test(n) ? '' : n))(cleanText(a.notes, 2000) || ''),
          tone: cleanText(a.tone, 120),
        });
      }
    } else if (emails && a.type === 'ads_status' && Array.isArray(a.campaigns)) {
      const pause = a.pause !== false;
      const picked = (a.campaigns as unknown[]).map((k) => campaigns.find((c) => c.key === k)).filter((c): c is PlannerCampaign => Boolean(c));
      const client = picked[0]?.clientId;
      // One client per card, and only campaigns that would actually change.
      const mine = picked.filter((c) => c.clientId === client && (pause ? c.status === 'active' : c.status === 'paused'));
      if (!client) drop('Couldn’t find those campaigns.');
      else if (!mine.length) drop(`Those campaigns are already ${pause ? 'paused' : 'running'}.`);
      if (client && mine.length) {
        actions.push({
          type: 'ads_status',
          pause,
          clientId: client,
          clientName: mine[0].clientName,
          campaigns: mine.map((c) => ({ platform: c.platform, account: c.account, id: c.id, name: c.name })),
        });
      }
    } else if (emails && a.type === 'email_new') {
      const to = (cleanText(a.to, 200) || '').replace(/^mailto:/i, '').toLowerCase();
      const wanted = (cleanText(a.from_inbox, 200) || '').toLowerCase();
      const inbox = inboxes.find((i) => i === wanted) || inboxes.find((i) => wanted && (i.startsWith(wanted) || i.split('@')[0] === wanted.split('@')[0]));
      const notes = cleanText(a.notes, 3000) || '';
      if (!inbox) drop(`Which inbox should it go from? ${inboxes.join(', ') || 'No inbox is connected.'}`);
      else if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(to)) drop('I need the recipient’s full email address.');
      else if (!notes) drop('What should the email say?');
      else actions.push({ type: 'email_new', inbox, to, subject: cleanText(a.subject, 200), notes });
    } else if (emails && (a.type === 'comment_reply' || a.type === 'comment_hide' || a.type === 'comment_skip')) {
      const c = comments.find((x) => x.id === a.comment_id);
      if (!c) {
        drop('Couldn’t find that comment among the ones waiting.');
        continue;
      }
      const base = { commentId: c.id, author: c.author, message: c.message.slice(0, 300), clientName: c.clientName };
      if (a.type === 'comment_reply') {
        const text = cleanText(a.text, 1500);
        if (text || c.draft) actions.push({ type: 'comment_reply', ...base, text });
      } else actions.push({ type: a.type, ...base });
    } else if (emails && a.type === 'approve_five_star') {
      const client = clients.find((c) => c.id === a.client_id);
      actions.push({ type: 'approve_five_star', clientId: client?.id || null, clientName: client?.brandName || null });
    } else if (app && typeof a.type === 'string' && a.type.startsWith('jl_')) {
      const r = app.jl.find((x) => x.id === a.jl_id);
      if (!r) {
        drop('Couldn’t find that JL Comfort order or sample request. Give me its number (JL-… or S-…).');
        continue;
      }
      const base = { kind: r.kind, jlId: r.id, number: r.number, customer: r.customer };
      if (a.type === 'jl_status') {
        const status = cleanText(a.status, 40) || '';
        const allowed: readonly string[] = r.kind === 'order' ? JL_ORDER_STATUSES : JL_SAMPLE_STATUSES;
        if (!allowed.includes(status)) drop(`"${status}" isn’t a ${r.kind} status. Use one of: ${allowed.join(', ')}.`);
        else if (status === r.status) drop(`${r.number} is already ${status}.`);
        else actions.push({ type: 'jl_status', ...base, status, from: r.status, note: cleanText(a.note, 300) });
      } else if (a.type === 'jl_ship') {
        const trackingNumber = cleanText(a.tracking_number, 80);
        const carrier = app.carriers.find((c) => c.id === a.carrier)?.id || null;
        const trackingUrl = cleanUrl(a.tracking_url);
        if (!trackingNumber) drop(`What’s the tracking number for ${r.number}?`);
        else if (!carrier && !trackingUrl) drop(`Which carrier shipped ${r.number}? ${app.carriers.map((c) => c.name).join(', ')}, or send the tracking link.`);
        else actions.push({ type: 'jl_ship', ...base, carrier, trackingNumber, trackingUrl: carrier ? null : trackingUrl });
      } else if (a.type === 'jl_confirmed') {
        if (r.kind !== 'sample') drop(`${r.number} is an order; "confirmed by the supplier" is for sample requests.`);
        else if (['delivered', 'cancelled'].includes(r.status)) drop(`${r.number} is already ${r.status}.`);
        else actions.push({ type: 'jl_confirmed', ...base, kind: 'sample' });
      } else if (a.type === 'jl_resend') {
        const email = a.email === 'shipped' || a.email === 'supplier' ? a.email : a.email === 'confirmation' ? 'confirmation' : null;
        if (!email) drop('Which email should I send again: the confirmation, the shipped email, or the one to the supplier?');
        else if (email === 'shipped' && !r.hasTracking) drop(`${r.number} has no tracking yet, so there’s no shipped email to resend.`);
        else actions.push({ type: 'jl_resend', ...base, email });
      }
    } else if (typeof a.type === 'string') {
      drop(`I can’t do "${a.type}" from the chat yet.`);
    }
  }
  // A new client's main website is checked by add_client already.
  return actions.filter(
    (a) => !(a.type === 'add_website' && actions.some((b) => b.type === 'add_client' && b.checkWebsite && b.fields.websiteUrl === a.url))
  );
}

/** One line per change, for the history and the reply. */
export function actionSummary(a: AssistantAction) {
  const host = (u?: string) => (u ? new URL(u).hostname.replace(/^www\./, '') : '');
  if (a.type === 'task') return `Save task: ${a.text.slice(0, 150)}`;
  if (a.type === 'add_client') return `Add client ${a.fields.brandName}${a.checkWebsite ? ` and check ${host(a.fields.websiteUrl)} hourly` : ''}`;
  if (a.type === 'update_client') return `Update ${a.clientName}: ${Object.keys(a.changes).map((k) => CLIENT_FIELDS[k as ClientField]).join(', ')}`;
  if (a.type === 'add_website') return `Check ${host(a.url)} hourly for ${a.clientName}`;
  if (a.type === 'remember') return a.explicit ? `Remember (saved right away, no tap needed): ${a.text.slice(0, 150)}` : `Remember (needs his ✅ tap): ${a.text.slice(0, 150)}`;
  if (a.type === 'forget') return `Forget: ${a.text.slice(0, 150)}`;
  if (a.type === 'update_profile') return `Update master profile: ${a.change.slice(0, 150)}`;
  if (a.type === 'library_note') return `Save to the library: ${a.text.slice(0, 150)}`;
  if (a.type === 'library_file') return `Save the attached file "${a.name}" to the library`;
  if (a.type === 'email_important')
    return a.always ? `Bring "${a.subject}" back and always show emails from ${a.from}` : `Move the email "${a.subject}" back to the inbox as important`;
  if (a.type === 'email_ignore')
    return a.mode === 'sender' ? `Ignore every email from ${a.from} (starting with "${a.subject}")` : `Ignore emails like "${a.subject}" from now on`;
  if (a.type === 'task_edit') return `Change task "${a.title}": ${describeTaskChanges(a.changes)} (he confirms first)`;
  if (a.type === 'task_delete') return `Delete task "${a.title}" (he confirms first)`;
  if (a.type === 'email_done') return `Mark the email "${a.subject}" done`;
  if (a.type === 'email_reply')
    return `Reply to "${a.subject}" (${a.to})${a.notes ? `: ${a.notes.slice(0, 120)}` : ''}${a.tone ? ` · tone: ${a.tone}` : ''} [a card under your answer writes the draft with the AI and shows it; he reads it and taps Send. Do NOT write the reply yourself: just say the card is below]`;
  if (a.type === 'ads_status')
    return `${a.pause ? 'Pause' : 'Resume'} ${a.clientName}'s ${a.campaigns.map((c) => `${c.platform === 'google' ? 'Google' : 'Meta'} "${c.name}"`).join(', ')} (he confirms first)`;
  if (a.type === 'email_new')
    return `New email from ${a.inbox} to ${a.to}: ${a.notes.slice(0, 120)} [a card under your answer writes the email and shows it; he reads it and taps Send. Do NOT write the email yourself: just say the card is below]`;
  if (a.type === 'approve_five_star') return `Post every ready 5★ review reply${a.clientName ? ` for ${a.clientName}` : ' for all clients'}`;
  if (a.type === 'comment_reply') return `Reply publicly to ${a.author}'s comment${a.clientName ? ` on ${a.clientName}` : ''}${a.text ? `: ${a.text.slice(0, 120)}` : ' with the AI draft'} (he confirms first)`;
  if (a.type === 'comment_hide') return `Hide ${a.author}'s comment${a.clientName ? ` on ${a.clientName}` : ''} (he confirms first)`;
  if (a.type === 'comment_skip') return `Skip ${a.author}'s comment (no reply)`;
  if (a.type === 'jl_status') return `Set JL Comfort ${a.kind} ${a.number} (${a.customer}) from ${a.from} to ${a.status} (no email; he confirms first)`;
  if (a.type === 'jl_ship')
    return `Mark JL Comfort ${a.kind} ${a.number} (${a.customer}) shipped, tracking ${a.trackingNumber}${a.carrier ? ` via ${a.carrier}` : ''}, and email the customer the tracking (he confirms first)`;
  if (a.type === 'jl_confirmed') return `Mark sample request ${a.number} (${a.customer}) confirmed by the supplier and email the customer (he confirms first)`;
  if (a.type === 'jl_resend') return `Send ${a.number}'s ${a.email === 'supplier' ? 'request to the supplier' : `${a.email} email to ${a.customer}`} again (he confirms first)`;
  return `Mark task done: ${a.title}`;
}

/** "Thu 20 Nov 15:00 · high priority", for cards and the history. */
export function describeTaskChanges(c: TaskChanges) {
  return [
    c.title ? `title → ${c.title}` : '',
    'date' in c ? (c.date ? `date → ${c.date}` : 'no date') : '',
    'time' in c ? (c.time ? `time → ${c.time}` : 'all day') : '',
    c.priority ? `${c.priority} priority` : '',
    'notes' in c ? (c.notes ? `notes → ${c.notes.slice(0, 80)}` : 'notes cleared') : '',
  ]
    .filter(Boolean)
    .join(', ');
}

/** True when the text says something was done, which only the bot's buttons can do. */
export function claimsDone(text: string) {
  // "Not yet" answers mention the same words ("لسه … عشان يتضاف"), so a negation means no claim.
  if (/(not (done|added|saved) yet|haven'?t|didn'?t|لسه|لسا|مش هقدر|مقدرش|ما اتضافش|مش متضاف)/i.test(text)) return false;
  return /(\b(done|added|saved|registered|created|updated|fixed)\b|تم[ ْ]|تمت|سجلت|سجلته|ضفت|ضفته|أضفت|اضفت|اتضاف|اتسجل|حفظت|خلاص)/i.test(text);
}

function stripThinking(text: string) {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

async function callModel(m: ChatModel, context: string, history: ChatMessage[], question: string, surface: ChatSurface = 'telegram') {
  const SYSTEM_PROMPT = systemPromptFor(surface);
  const turns = history.slice(-6).map((h) => ({ role: h.role, content: h.content.slice(0, 1200) }));
  if (m.provider === 'openrouter') {
    return stripThinking(
      await openRouterChat({
        model: m.model,
        feature: 'assistant',
        temperature: 0.4,
        maxTokens: 2048,
        messages: [{ role: 'system', content: `${SYSTEM_PROMPT}\n\nCONTEXT:\n${context}` }, ...turns, { role: 'user', content: question }],
      })
    );
  }
  if (m.provider === 'groq') {
    const data = await groqFetch<{ choices?: Array<{ message?: { content?: string } }> }>(
      'chat/completions',
      {
        model: m.model,
        temperature: 0.4,
        max_tokens: 2048,
        ...(m.model.startsWith('openai/') ? { reasoning_effort: 'low' } : {}),
        messages: [
          { role: 'system', content: `${SYSTEM_PROMPT}\n\nCONTEXT:\n${context}` },
          ...turns,
          { role: 'user', content: question },
        ],
      },
      { model: m.model, feature: 'assistant', timeoutMs: 30_000 }
    );
    return stripThinking(data.choices?.[0]?.message?.content || '');
  }
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel(
    { model: m.model, systemInstruction: `${SYSTEM_PROMPT}\n\nCONTEXT:\n${context}`, generationConfig: { temperature: 0.4, maxOutputTokens: 2048 } },
    { timeout: 30_000 }
  );
  const result = await trackGemini(m.model, 'assistant', () =>
    model.generateContent({
      contents: [
        ...turns.map((t) => ({ role: t.role === 'assistant' ? 'model' : 'user', parts: [{ text: t.content }] })),
        { role: 'user', parts: [{ text: question }] },
      ],
    })
  );
  return stripThinking(result.response.text());
}

/**
 * Works out the changes the latest message asks for. Always the strong model (Groq GPT-OSS 120B,
 * Gemini as fallback) in strict JSON, whatever model the owner chats with, so a light chat model
 * can't break them. A failure means no changes, never a wrong one.
 */
async function planActions(question: string, history: ChatMessage[], clients: PlannerClient[], tasks: Task[], facts: MemoryFact[], app: PlannerApp | null = null) {
  const recent = history.slice(-4).map((m) => `${m.role === 'user' ? 'OWNER' : 'BOT'}: ${m.content.slice(0, 500)}`);
  const dropped: string[] = [];
  try {
    const raw = await aiJson({
      system: plannerPrompt(clients, tasks, facts, app ?? undefined),
      user: [...recent, `LATEST (OWNER): ${question.slice(0, 2000)}`].join('\n'),
      feature: 'assistant',
      timeBudgetMs: 20_000,
    });
    return { actions: toActions(raw, clients, tasks, facts, app, dropped), dropped, plannerError: null };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 200) : String(error);
    console.error('Action planner failed:', message);
    return { actions: [] as AssistantAction[], dropped, plannerError: message };
  }
}

export interface AssistantReply {
  text: string; // without tags
  actions: AssistantAction[];
  items: KnowledgeItem[]; // library items the answer used
  tasks: Task[]; // tasks the answer mentioned
  emails: { id: string; subject: string }[]; // emails the answer mentioned
  usedModel: ChatModel;
  fellBackFrom: ChatModel | null;
  /** Changes he asked for that couldn't be prepared, and why (shown to the model and logged). */
  dropped: string[];
  plannerError: string | null;
}

/**
 * Plans the changes, then answers with the chosen model; if it fails (busy, out of quota), the
 * next available model answers and the reply says so.
 */
export async function askAssistant(
  chosen: ChatModel,
  question: string,
  history: ChatMessage[],
  opts: {
    surface?: ChatSurface;
    extraContext?: () => Promise<string>;
    runsAtOnce?: (a: AssistantAction) => boolean;
    comments?: PlannerComment[];
    inboxes?: string[];
    campaigns?: PlannerCampaign[];
    jl?: JlRecord[];
    carriers?: { id: string; name: string }[];
  } = {}
): Promise<AssistantReply> {
  const surface = opts.surface || 'telegram';
  const [context, available, profiles, extra] = await Promise.all([
    buildContext(question, history, surface === 'app'),
    availableChatModels(),
    listClientProfiles(),
    opts.extraContext
      ? opts.extraContext().catch((error) => {
          console.error('Chat extra context failed:', error);
          return '';
        })
      : Promise.resolve(''),
  ]);
  if (extra) context.text += `\n\n${extra}`;
  const clients = profiles.filter((c) => c.id && c.brandName) as PlannerClient[];
  const app: PlannerApp | null =
    surface === 'app'
      ? { emails: context.emails, comments: opts.comments || [], inboxes: opts.inboxes || [], campaigns: opts.campaigns || [], jl: opts.jl || [], carriers: opts.carriers || [] }
      : null;
  const { actions, dropped, plannerError } = await planActions(question, history, clients, context.tasks, context.memory.facts, app);
  // Up to 4 tries, so a Gemini model still answers when the Groq ones hit their per-minute limit.
  const order = [chosen, ...available.filter((m) => m.key !== chosen.key)].slice(0, 4);
  const note = (a: AssistantAction) =>
    opts.runsAtOnce?.(a) ? `${actionSummary(a)} [the app does this right away, with an Undo button: say it's done, no Confirm needed]` : actionSummary(a);
  const notDone = [...dropped, ...(plannerError ? ['the change planner failed just now, so nothing was prepared: ask him to send the request again'] : [])];
  const planned = `\n\n(PLANNED CHANGES for this message: ${actions.length ? actions.map(note).join('; ') : 'none'})${
    notDone.length ? `\n(COULD NOT PREPARE, tell him plainly and ask for what is missing: ${notDone.join('; ')})` : ''
  }`;

  let lastError: unknown;
  for (const m of order) {
    try {
      const raw = await callModel(m, context.text, history, question + planned, surface);
      if (!raw) throw new Error('Empty answer.');
      const ids = (prefix: string) => [...new Set([...raw.matchAll(new RegExp(`\\[${prefix}:([A-Za-z0-9_-]{8})\\]`, 'g'))].map((x) => x[1]))];
      const text = raw
        .replace(/^\s*(ACTION|TASK):.*$/gim, '')
        .replace(/\s*\[(K|T|E):[A-Za-z0-9_-]{8}\]/g, '')
        .replace(/\s*\[(DONE by the bot|FAILED|PROPOSED[^\]]*)\]/gi, '')
        .replace(/\(?PLANNED CHANGES[^)\n]*\)?/gi, '')
        .trim();
      return {
        text,
        actions,
        items: ids('K').map((id) => context.items.find((k) => k.id === id)).filter(Boolean) as KnowledgeItem[],
        tasks: ids('T').map((id) => context.tasks.find((t) => t.id === id)).filter(Boolean) as Task[],
        emails: ids('E').map((id) => context.emails.find((e) => e.id === id)).filter(Boolean).map((e) => ({ id: e!.id, subject: e!.subject || '(no subject)' })),
        usedModel: m,
        fellBackFrom: m.key === chosen.key ? null : chosen,
        dropped,
        plannerError,
      };
    } catch (error) {
      lastError = error;
      console.error(`Assistant: ${m.model} failed:`, error instanceof Error ? error.message.slice(0, 200) : error);
    }
  }
  throw lastError;
}
