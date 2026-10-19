import { GoogleGenerativeAI } from '@google/generative-ai';
import { listClientProfiles } from './admin-ops';
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
  actions?: Array<AssistantAction & { done?: boolean }>; // proposed in this reply; done once the owner confirmed
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

What you can and can't do — be honest about it:
- You CANNOT change anything yourself: you can't save, add, edit, delete or send anything. NEVER say you did, saved, added, registered or fixed something ("done", "تم", "سجلت", "ضفت", "خلاص") unless the conversation shows a line starting with [DONE by the bot].
- You CAN propose an action. The bot shows it as a button and does it only when the owner taps it. Say it like: "I can add it — tap ✅ below to confirm." / "أقدر أضيفه — دوس ✅ تحت عشان أأكد."
- Lines starting with [DONE by the bot] or [FAILED] in the conversation are what really happened. Trust them over anything said before.
- To propose, end your reply with one line per action (max 3), exactly in this form, JSON on one line:
  ACTION: {"type":"task","text":"<the task as the owner would say it to their task bot, with client, day and time if known>"}
  ACTION: {"type":"add_client","brand":"<brand name>","owner":"<owner name or null>","website":"<https://… or null>","phone":"<or null>","email":"<or null>"}
  ACTION: {"type":"add_website","client":"<existing client brand name>","url":"<https://…>","label":"<short label or null>"}
  add_client with a website also starts the hourly website check for it, so don't add a separate add_website for the same site.
- Only propose actions the owner asked for or agreed to. For anything else (editing a client, ads, reviews, invoices…) say you can't do it from the chat and that it's in the admin panel.`;

export type AssistantAction =
  | { type: 'task'; text: string }
  | { type: 'add_client'; brand: string; owner: string | null; website: string | null; phone: string | null; email: string | null }
  | { type: 'add_website'; client: string; url: string; label: string | null };

function parseActions(raw: string): AssistantAction[] {
  const actions: AssistantAction[] = [];
  const s = (v: unknown, max = 200) => (typeof v === 'string' && v.trim() && v.trim().toLowerCase() !== 'null' ? v.trim().slice(0, max) : null);
  const url = (v: unknown) => {
    const value = s(v, 300);
    if (!value) return null;
    const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    try {
      return new URL(withScheme).toString();
    } catch {
      return null;
    }
  };
  for (const line of raw.matchAll(/^\s*ACTION:\s*(\{.*\})\s*$/gim)) {
    try {
      const a = JSON.parse(line[1]) as Record<string, unknown>;
      if (a.type === 'task' && s(a.text, 500)) actions.push({ type: 'task', text: s(a.text, 500)! });
      else if (a.type === 'add_client' && s(a.brand, 80)) {
        actions.push({ type: 'add_client', brand: s(a.brand, 80)!, owner: s(a.owner, 80), website: url(a.website), phone: s(a.phone, 40), email: s(a.email, 120) });
      } else if (a.type === 'add_website' && s(a.client, 80) && url(a.url)) {
        actions.push({ type: 'add_website', client: s(a.client, 80)!, url: url(a.url)!, label: s(a.label, 60) });
      }
    } catch {
      // a malformed action line is dropped; the text answer still goes out
    }
  }
  // Older style, still accepted.
  const taskLine = raw.match(/^\s*TASK:\s*(.+)$/im);
  if (taskLine && !actions.some((a) => a.type === 'task')) actions.push({ type: 'task', text: taskLine[1].trim().slice(0, 500) });
  return actions.slice(0, 3);
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

export interface AssistantReply {
  text: string; // without tags and ACTION lines
  actions: AssistantAction[];
  items: KnowledgeItem[]; // library items the answer used
  tasks: Task[]; // tasks the answer mentioned
  usedModel: ChatModel;
  fellBackFrom: ChatModel | null;
}

/**
 * Answers with the chosen model; if it fails (busy, out of quota), the next available model
 * answers and the reply says so.
 */
export async function askAssistant(chosen: ChatModel, question: string, history: ChatMessage[]): Promise<AssistantReply> {
  const context = await buildContext(question, history);
  const available = await availableChatModels();
  const order = [chosen, ...available.filter((m) => m.key !== chosen.key)].slice(0, 3);

  let lastError: unknown;
  for (const m of order) {
    try {
      const raw = await callModel(m, context.text, history, question);
      if (!raw) throw new Error('Empty answer.');
      const ids = (prefix: string) => [...new Set([...raw.matchAll(new RegExp(`\\[${prefix}:([A-Za-z0-9_-]{8})\\]`, 'g'))].map((x) => x[1]))];
      const text = raw
        .replace(/^\s*(ACTION|TASK):.*$/gim, '')
        .replace(/\s*\[(K|T):[A-Za-z0-9_-]{8}\]/g, '')
        .replace(/\s*\[(DONE by the bot|FAILED|PROPOSED[^\]]*)\]/gi, '')
        .trim();
      return {
        text,
        actions: parseActions(raw),
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
