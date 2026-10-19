import { GoogleGenerativeAI } from '@google/generative-ai';
import { listClientProfiles } from './admin-ops';
import { aiJson } from './ai-json';
import { aiUsageDay, groqFetch, isRateLimitError, listAiUsage, trackGemini, type AiUsageRow } from './ai-usage';
import { listCategories, searchKnowledge, type KnowledgeItem } from './knowledge';
import { cairoParts, describeRepeat, formatWhen, groupTasks, listOpenTasks, WEEKDAYS, weekdayOf, type Task } from './tasks';

// The bot's chat assistant: answers questions from the owner's library, open tasks and client
// list, with a model the owner picks among those that still have free quota today.

export interface ChatModel {
  key: string; // short, for Telegram buttons
  provider: 'groq' | 'gemini';
  model: string;
  label: string;
  note: string;
}

export const CHAT_MODELS: ChatModel[] = [
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
  for (const m of CHAT_MODELS) {
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

interface ChatContext {
  text: string;
  items: KnowledgeItem[];
  tasks: Task[];
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
async function buildContext(question: string, history: ChatMessage[]): Promise<ChatContext> {
  const recentUser = history.filter((m) => m.role === 'user').slice(-2).map((m) => m.content);
  const [items, tasks, profiles, categories] = await Promise.all([
    searchKnowledge([...recentUser, question].join(' ').slice(-500), 6).catch(() => [] as KnowledgeItem[]),
    listOpenTasks().catch(() => [] as Task[]),
    listClientProfiles(),
    listCategories().catch(() => []),
  ]);
  const clients = profiles.filter((c) => c.id && c.brandName);
  const clientName = (id: string | null) => (id ? clients.find((c) => c.id === id)?.brandName || null : null);

  // Overdue and today first, then the rest by date; at most 40.
  const g = groupTasks(tasks);
  const ordered = [...g.overdue, ...g.today, ...tasks.filter((t) => !g.overdue.includes(t) && !g.today.includes(t))].slice(0, 40);

  const now = cairoParts(new Date());
  const text = [
    `NOW (Cairo): ${WEEKDAYS[weekdayOf(now.date)]} ${now.date} ${now.time}`,
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
  ].join('\n');
  return { text, items, tasks };
}

const SYSTEM_PROMPT = `You are the personal assistant of a marketing agency owner in Cairo (North Via Marketing), inside their private Telegram bot.
You can see their open tasks, their client list and the items in their knowledge library that match the conversation (screenshots, links, notes).

How to answer:
- Reply in the language the owner writes in (Egyptian Arabic, English or mixed). Be direct and practical; short unless they ask for detail (aim under 150 words).
- Use the CONTEXT. When you use a library item, mention it and put its tag like [K:abc12345]; for a task, its tag like [T:abc12345]. Never invent items, tasks, dates or numbers that aren't in the context.
- When they describe a task or project, connect it to what fits from the library and from their other tasks for that client, and say why it fits.
- If nothing in the library fits, say so plainly, and you may give your own ideas (say they're yours).
- Formatting: plain text for Telegram; you may use **bold** and "- " bullets. No tables, no headings.

Changes — be honest:
- You never change anything yourself. The bot prepares changes and shows a confirmation card for each one; it happens only when the owner taps ✅ Confirm.
- The changes prepared for THIS message are listed under "PLANNED CHANGES" in the owner's message. If there are some, describe them in one short line and say to tap ✅ Confirm on the card below (e.g. "جهزتلك إضافة العميل — دوس ✅ Confirm تحت"). Don't repeat all the details; the card shows them.
- If the owner asked for a change but PLANNED CHANGES is "none", say what's missing (e.g. the client name) or that it can't be done from the chat (ads, reviews, invoices, deleting things are in the admin panel).
- NEVER say something is done, saved, added or updated ("done", "تم", "سجلت", "ضفت", "خلاص") unless the conversation shows a line starting with [DONE by the bot]. Lines starting with [DONE by the bot] or [FAILED] are what really happened; trust them.`;

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
  | { type: 'complete_task'; taskId: string; title: string };

interface PlannerClient {
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

function plannerPrompt(clients: PlannerClient[], tasks: Task[]) {
  return `You prepare changes a marketing agency owner asks their Telegram bot for. You only PREPARE them; the owner confirms each one with a button.
Read the LATEST message (earlier lines are context: a "yes / do it / go ahead" confirms what was discussed just before).
Return ONLY JSON: {"actions": [ ... ]} with at most 3 actions, or {"actions": []} when the latest message asks for no change (a question, chit-chat, or details are missing).

Action types:
{"type":"task","text":"<the task as the owner would say it to their task bot, with client, day and time if known>"}
{"type":"add_client","brandName":"…","ownerName":null,"email":null,"mobileNumber":null,"websiteUrl":null,"facebookLink":null,"instagramLink":null,"tiktokLink":null,"googleLink":null,"check_website":true}
  (check_website true = also start the hourly uptime check for its website; true unless the owner says not to)
{"type":"update_client","client_id":"<id from the list>","changes":{"<field>":"<new value>"}}
  fields: brandName, ownerName, email, mobileNumber, websiteUrl, facebookLink, instagramLink, tiktokLink, googleLink. Only fields that change.
{"type":"add_website","client_id":"<id from the list, or null when the client is being added in this same reply>","client_name":"…","url":"https://…","label":null}
  (an extra page or site to check hourly for an existing client; not needed for a new client's main website)
{"type":"complete_task","task_id":"<id from the task list>"}

Rules:
- Only what the owner clearly asks for (or confirms) now. Never repeat a change the conversation shows as [DONE by the bot].
- A new client needs at least a brand name; otherwise return no action (the reply will ask for it).
- Use ids exactly from the lists. URLs with https://. Keep names as the owner wrote them.

CLIENTS (id | brand | owner | email | phone | website | facebook | instagram | tiktok | google):
${clients.map((c) => [c.id, c.brandName, c.ownerName, c.email, c.mobileNumber, c.websiteUrl, c.facebookLink, c.instagramLink, c.tiktokLink, c.googleLink].map((v) => v || '-').join(' | ')).join('\n') || '(none)'}

OPEN TASKS (id | title | when):
${tasks.slice(0, 40).map((t) => `${t.id} | ${t.title} | ${formatWhen(t)}`).join('\n') || '(none)'}`;
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

/** Checks the planner's JSON against the real clients and tasks; anything that doesn't match is dropped. */
export function toActions(raw: Record<string, unknown>, clients: PlannerClient[], tasks: Task[]): AssistantAction[] {
  const list = Array.isArray(raw.actions) ? (raw.actions as Record<string, unknown>[]) : [];
  const actions: AssistantAction[] = [];
  for (const a of list.slice(0, 3)) {
    if (a.type === 'task' && cleanText(a.text, 500)) actions.push({ type: 'task', text: cleanText(a.text, 500)! });
    else if (a.type === 'add_client') {
      const fields = cleanFields(a);
      if (!fields.brandName) continue;
      if (clients.some((c) => c.brandName.trim().toLowerCase() === fields.brandName!.toLowerCase())) continue; // already a client
      actions.push({ type: 'add_client', fields, checkWebsite: a.check_website !== false && Boolean(fields.websiteUrl) });
    } else if (a.type === 'update_client') {
      const client = clients.find((c) => c.id === a.client_id);
      if (!client || !a.changes || typeof a.changes !== 'object') continue;
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
  return `Mark task done: ${a.title}`;
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

async function callModel(m: ChatModel, context: string, history: ChatMessage[], question: string) {
  const turns = history.slice(-6).map((h) => ({ role: h.role, content: h.content.slice(0, 1200) }));
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
async function planActions(question: string, history: ChatMessage[], clients: PlannerClient[], tasks: Task[]) {
  const recent = history.slice(-4).map((m) => `${m.role === 'user' ? 'OWNER' : 'BOT'}: ${m.content.slice(0, 500)}`);
  try {
    const raw = await aiJson({
      system: plannerPrompt(clients, tasks),
      user: [...recent, `LATEST (OWNER): ${question.slice(0, 2000)}`].join('\n'),
      feature: 'assistant',
      timeBudgetMs: 20_000,
    });
    return toActions(raw, clients, tasks);
  } catch (error) {
    console.error('Action planner failed:', error instanceof Error ? error.message.slice(0, 200) : error);
    return [];
  }
}

export interface AssistantReply {
  text: string; // without tags
  actions: AssistantAction[];
  items: KnowledgeItem[]; // library items the answer used
  tasks: Task[]; // tasks the answer mentioned
  usedModel: ChatModel;
  fellBackFrom: ChatModel | null;
}

/**
 * Plans the changes, then answers with the chosen model; if it fails (busy, out of quota), the
 * next available model answers and the reply says so.
 */
export async function askAssistant(chosen: ChatModel, question: string, history: ChatMessage[]): Promise<AssistantReply> {
  const [context, available, profiles] = await Promise.all([buildContext(question, history), availableChatModels(), listClientProfiles()]);
  const clients = profiles.filter((c) => c.id && c.brandName) as PlannerClient[];
  const actions = await planActions(question, history, clients, context.tasks);
  const order = [chosen, ...available.filter((m) => m.key !== chosen.key)].slice(0, 3);
  const planned = `\n\n(PLANNED CHANGES for this message: ${actions.length ? actions.map(actionSummary).join('; ') : 'none'})`;

  let lastError: unknown;
  for (const m of order) {
    try {
      const raw = await callModel(m, context.text, history, question + planned);
      if (!raw) throw new Error('Empty answer.');
      const ids = (prefix: string) => [...new Set([...raw.matchAll(new RegExp(`\\[${prefix}:([A-Za-z0-9_-]{8})\\]`, 'g'))].map((x) => x[1]))];
      const text = raw
        .replace(/^\s*(ACTION|TASK):.*$/gim, '')
        .replace(/\s*\[(K|T):[A-Za-z0-9_-]{8}\]/g, '')
        .replace(/\s*\[(DONE by the bot|FAILED|PROPOSED[^\]]*)\]/gi, '')
        .replace(/\(?PLANNED CHANGES[^)\n]*\)?/gi, '')
        .trim();
      return {
        text,
        actions,
        items: ids('K').map((id) => context.items.find((k) => k.id === id)).filter(Boolean) as KnowledgeItem[],
        tasks: ids('T').map((id) => context.tasks.find((t) => t.id === id)).filter(Boolean) as Task[],
        usedModel: m,
        fellBackFrom: m.key === chosen.key ? null : chosen,
      };
    } catch (error) {
      lastError = error;
      console.error(`Assistant: ${m.model} failed:`, error instanceof Error ? error.message.slice(0, 200) : error);
    }
  }
  throw lastError;
}
