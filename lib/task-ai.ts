import { GoogleGenerativeAI } from '@google/generative-ai';
import { isBusyError } from './review-engine';
import { WEEKDAYS, addDays, cairoParts, formatTime, weekdayOf, type RepeatFreq, type RepeatRule, type TaskFields } from './tasks';

// Turns a Telegram message (English, Arabic or mixed) into task fields.
// Fields the message doesn't state stay empty, so the bot asks for them instead of guessing.

export interface TaskClient {
  id: string;
  name: string;
  owner?: string;
}

export interface TaskUnderstanding {
  intent: 'task' | 'knowledge' | 'chat';
  separate: boolean; // answer mode: the message is a new item, not an answer
  fields: TaskFields;
  clientMentioned: string | null; // a client named in the message that isn't in the list
  raw: unknown;
}

const FIELD_KEYS = ['category', 'client', 'when', 'time', 'repeat_end'] as const;

export const QUESTION_TEXT: Record<(typeof FIELD_KEYS)[number], string> = {
  category: 'Is this work or personal?',
  client: 'Which client is this for?',
  when: 'When is it?',
  time: 'What time?',
  repeat_end: 'Until when should it repeat?',
};

function calendar(today: string) {
  // The model is unreliable at weekday arithmetic, so it gets the next two weeks spelled out.
  return Array.from({ length: 15 }, (_, i) => {
    const d = addDays(today, i);
    const label = i === 0 ? ' (today)' : i === 1 ? ' (tomorrow)' : '';
    return `${WEEKDAYS[weekdayOf(d)]} ${d}${label}`;
  }).join('\n');
}

function systemPrompt(clients: TaskClient[]) {
  const now = cairoParts(new Date());
  return `You turn the owner's messages into tasks and reminders for a marketing agency owner in Cairo.
Messages may be English, Arabic (Egyptian) or mixed. Write "title" and "notes" in the language of the message.
Current time in Cairo: ${WEEKDAYS[weekdayOf(now.date)]} ${now.date} ${now.time} (${formatTime(now.time)}).

Calendar:
${calendar(now.date)}

Clients (id | brand | owner):
${clients.map((c) => `${c.id} | ${c.name}${c.owner ? ` | ${c.owner}` : ''}`).join('\n') || '(none)'}

Return ONLY a JSON object:
{
  "intent": "task" | "knowledge" | "chat",
  "separate": boolean,
  "title": string,            // short action, e.g. "Call Mona about the menu photos"
  "notes": string | null,     // useful extra details from the message, else null
  "kind": "task" | "reminder",// reminder = just remind me at a time; task = something to get done
  "category": "work" | "personal" | null,
  "client_id": string | null, // id from the list above
  "client_mentioned": string | null, // a client/brand named that is NOT in the list
  "no_client": boolean,       // work for the agency itself, not one client (invoices, hiring, own website…)
  "date": "YYYY-MM-DD" | null,
  "time": "HH:MM" | null,     // 24-hour Cairo time
  "all_day": boolean,
  "no_date": boolean,         // ONLY true if the user explicitly says no deadline / someday / whenever / "no date"
  "priority": "low" | "normal" | "high",
  "remind_before_min": number,
  "repeat": null | { "freq": "daily"|"weekly"|"monthly"|"yearly", "interval": number, "weekdays": number[], "month_day": number | null },
  "repeat_until": "YYYY-MM-DD" | null,
  "repeat_count": number | null,
  "repeat_forever": boolean
}

Rules:
- intent "knowledge": the message is only a link, article, idea or info to save for later with nothing to do. "chat": a greeting or question to the bot. Otherwise "task".
- NEVER guess. Use null when the message doesn't say or clearly imply it. "Tomorrow" without a time → date set, time null, all_day false.
  "Tomorrow morning" → 10:00, "afternoon" → 15:00, "evening" → 19:00, "tonight" → 21:00, "end of day" → 17:00.
  A time with no date: today if that time is still ahead, else tomorrow.
  A weekday name, "next <weekday>" or "this <weekday>" → the first such day after today (within the next 7 days); "<weekday> after next" → the one after that.
- no_date is false unless the user explicitly says there's no date. A task with no date mentioned → date null and no_date false (the bot will ask).
- category "work" if it's about a client, a lead, the agency or its marketing work; "personal" for family, health, home, errands. Null if unclear.
- Match clients by brand, owner name, nickname, Arabic spelling or obvious short form. Only use an id from the list.
- remind_before_min: 30 for calls, meetings and appointments, otherwise 0, unless the user says otherwise.
- priority "high" only for urgent/important wording ("urgent", "ضروري", "ASAP", "important"), "low" for "if I have time"; else "normal".
- repeat: weekdays are 0=Sunday … 6=Saturday. "Every week" with no day → the weekday of "date". "Every month" with no day → month_day = day of "date".
  If repeating and no start date is given, use the next matching date as "date".
  repeat_until/repeat_count only if the user says how long ("for 3 months" → repeat_until = date + 3 months, "10 times" → repeat_count 10); repeat_forever only if they say forever/always/no end.
- When CURRENT FIELDS are given, the message answers a question or asks for a change: return the full updated object, keeping every current value the message doesn't change.
  Set "separate": true only if the message is clearly a brand-new unrelated task rather than an answer or change. Otherwise false.`;
}

function str(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function validDate(value: unknown) {
  const s = str(value);
  return s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) ? s : null;
}

function validTime(value: unknown) {
  const s = str(value);
  const m = s?.match(/^(\d{1,2}):(\d{2})$/);
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null;
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

function parseRepeat(value: unknown): RepeatRule | null {
  if (!value || typeof value !== 'object') return null;
  const r = value as Record<string, unknown>;
  const freq = (['daily', 'weekly', 'monthly', 'yearly'] as RepeatFreq[]).find((f) => f === r.freq);
  if (!freq) return null;
  const weekdays = Array.isArray(r.weekdays) ? [...new Set(r.weekdays.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort() : [];
  const monthDay = Number(r.month_day);
  return {
    freq,
    interval: Math.min(Math.max(Math.round(Number(r.interval) || 1), 1), 52),
    ...(freq === 'weekly' && weekdays.length ? { weekdays } : {}),
    ...(freq === 'monthly' && monthDay >= 1 && monthDay <= 31 ? { monthDay: Math.round(monthDay) } : {}),
  };
}

/** Checks the model's JSON and turns it into fields; anything invalid becomes "unknown". */
export function toUnderstanding(raw: Record<string, unknown>, clients: TaskClient[]): TaskUnderstanding {
  const clientId = str(raw.client_id);
  const knownClient = clientId && clients.some((c) => c.id === clientId) ? clientId : null;
  const repeat = parseRepeat(raw.repeat);
  const count = Number(raw.repeat_count);
  const category = raw.category === 'work' || raw.category === 'personal' ? raw.category : knownClient ? 'work' : null;
  const fields: TaskFields = {
    title: str(raw.title) || 'Untitled',
    notes: str(raw.notes),
    kind: raw.kind === 'reminder' ? 'reminder' : 'task',
    category,
    clientId: knownClient,
    noClient: raw.no_client === true && !knownClient,
    date: validDate(raw.date),
    time: validTime(raw.time),
    allDay: raw.all_day === true,
    noDate: raw.no_date === true,
    priority: raw.priority === 'high' || raw.priority === 'low' ? raw.priority : 'normal',
    remindBeforeMin: Math.min(Math.max(Math.round(Number(raw.remind_before_min) || 0), 0), 7 * 24 * 60),
    repeat,
    repeatUntil: repeat ? validDate(raw.repeat_until) : null,
    repeatCount: repeat && Number.isInteger(count) && count > 0 ? count : null,
    repeatForever: Boolean(repeat && raw.repeat_forever === true),
  };
  const intent = raw.intent === 'knowledge' || raw.intent === 'chat' ? raw.intent : 'task';
  return { intent, separate: raw.separate === true, fields, clientMentioned: knownClient ? null : str(raw.client_mentioned), raw };
}

function currentFieldsJson(f: TaskFields) {
  return JSON.stringify({
    title: f.title,
    notes: f.notes ?? null,
    kind: f.kind,
    category: f.category ?? null,
    client_id: f.clientId ?? null,
    no_client: Boolean(f.noClient),
    date: f.date ?? null,
    time: f.time ?? null,
    all_day: Boolean(f.allDay),
    no_date: Boolean(f.noDate),
    priority: f.priority || 'normal',
    remind_before_min: f.remindBeforeMin || 0,
    repeat: f.repeat ? { freq: f.repeat.freq, interval: f.repeat.interval, weekdays: f.repeat.weekdays || [], month_day: f.repeat.monthDay ?? null } : null,
    repeat_until: f.repeatUntil ?? null,
    repeat_count: f.repeatCount ?? null,
    repeat_forever: Boolean(f.repeatForever),
  });
}

/**
 * Reads one message. With `current`, the message answers `asking` (a draft's open question)
 * or, without `asking`, is a change to a saved task.
 */
export async function understandTaskMessage(
  text: string,
  clients: TaskClient[],
  context?: { current: TaskFields; asking?: keyof typeof QUESTION_TEXT | null }
): Promise<TaskUnderstanding> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured.');
  const genAI = new GoogleGenerativeAI(apiKey);

  const prompt = context
    ? [
        `CURRENT FIELDS: ${currentFieldsJson(context.current)}`,
        context.asking ? `QUESTION ASKED: ${QUESTION_TEXT[context.asking]}` : 'The user wants to change this saved task.',
        `MESSAGE: """${text.slice(0, 4000)}"""`,
      ].join('\n')
    : `MESSAGE: """${text.slice(0, 4000)}"""`;

  // Full Flash first: dates and repeat rules need more care than review replies.
  const models = [process.env.GEMINI_TASK_MODEL || 'gemini-flash-latest', process.env.GEMINI_TASK_FALLBACK_MODEL || 'gemini-flash-lite-latest'];
  let lastError: unknown;
  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel(
        {
          model: modelName,
          systemInstruction: systemPrompt(clients),
          generationConfig: { temperature: 0.1, maxOutputTokens: 2048, responseMimeType: 'application/json' },
        },
        { timeout: 25_000 }
      );
      const result = await model.generateContent(prompt);
      const raw = JSON.parse(result.response.text()) as Record<string, unknown>;
      return toUnderstanding(raw, clients);
    } catch (error) {
      lastError = error;
      // Only a busy or broken model is worth a second try with the other one.
      if (!isBusyError(error) && !(error instanceof SyntaxError) && !/\b(400|404|500)\b|timed? ?out/i.test(String(error))) break;
    }
  }
  throw lastError;
}

