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
  task?: string | null; // a task the assistant suggested in this reply
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
- If the owner asks you to save/remember/schedule something, or agrees to a next step you suggested, add as the LAST line:
  TASK: <the task as they'd say it to their task bot, with client, day and time if known>
  Otherwise don't write a TASK line.`;

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
  text: string; // without tags and the TASK line
  task: string | null;
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
      const taskLine = raw.match(/^\s*TASK:\s*(.+)$/im);
      const ids = (prefix: string) => [...new Set([...raw.matchAll(new RegExp(`\\[${prefix}:([A-Za-z0-9_-]{8})\\]`, 'g'))].map((x) => x[1]))];
      const text = raw
        .replace(/^\s*TASK:.*$/im, '')
        .replace(/\s*\[(K|T):[A-Za-z0-9_-]{8}\]/g, '')
        .trim();
      return {
        text,
        task: taskLine ? taskLine[1].trim().slice(0, 500) : null,
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
