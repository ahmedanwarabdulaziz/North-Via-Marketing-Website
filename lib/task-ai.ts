import { GoogleGenerativeAI } from '@google/generative-ai';
import { groqFetch, trackGemini } from './ai-usage';
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
  heard: string | null; // voice notes: what was said, as the model heard it
  raw: unknown;
}

/** A voice note or audio file sent along with (or instead of) text. */
export interface TaskAudio {
  data: string; // base64
  mimeType: string;
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
  "repeat_forever": boolean,
  "heard": string | null      // voice notes only: what was said, word for word in its language; else null
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
- A voice note (Egyptian Arabic, English or mixed) counts as the message: read the task from what is said, and put the words in "heard".
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
  // Models sometimes miscount weekdays: a repeat on Sundays must start on a Sunday.
  if (fields.date && repeat && !repeatMatches(fields.date, repeat)) {
    for (let i = 1; i <= 31; i++) {
      const candidate = addDays(fields.date, i);
      if (repeatMatches(candidate, repeat)) {
        fields.date = candidate;
        break;
      }
    }
  }
  const intent = raw.intent === 'knowledge' || raw.intent === 'chat' ? raw.intent : 'task';
  return { intent, separate: raw.separate === true, fields, clientMentioned: knownClient ? null : str(raw.client_mentioned), heard: str(raw.heard), raw };
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
 * Reads one message: text, or a voice note (`audio`, with any caption as `text`).
 * With `current`, the message answers `asking` (a draft's open question) or, without
 * `asking`, is a change to a saved task.
 */
export async function understandTaskMessage(
  text: string,
  clients: TaskClient[],
  context?: { current: TaskFields; asking?: keyof typeof QUESTION_TEXT | null },
  audio?: TaskAudio
): Promise<TaskUnderstanding> {
  const message = audio
    ? `MESSAGE: the attached voice note.${text ? ` Caption: """${text.slice(0, 1000)}"""` : ''}`
    : `MESSAGE: """${text.slice(0, 4000)}"""`;
  const prompt = context
    ? [
        `CURRENT FIELDS: ${currentFieldsJson(context.current)}`,
        context.asking ? `QUESTION ASKED: ${QUESTION_TEXT[context.asking]}` : 'The user wants to change this saved task.',
        message,
      ].join('\n')
    : message;
  const deadline = Date.now() + 50_000; // the Telegram webhook may run for 60 s
  let lastError: unknown = new Error('No AI model is available right now.');

  // Groq first: fast, with its own daily quota. When it's over the limit or down, Gemini takes
  // over, and Groq is rested for a while (an hour when the daily quota is used up).
  if (process.env.GROQ_API_KEY && !coolingDown('groq')) {
    try {
      const heard = audio ? await groqTranscribe(audio) : null;
      const groqMessage = heard ? `MESSAGE (voice note, transcribed): """${heard.slice(0, 4000)}"""${text ? ` Caption: """${text.slice(0, 1000)}"""` : ''}` : message;
      const groqPrompt = context ? prompt.replace(message, groqMessage) : groqMessage;
      const understood = toUnderstanding(await groqJson(systemPrompt(clients), groqPrompt), clients);
      // Whisper's transcript is what was said; keep it with the task like Gemini's "heard".
      return heard ? { ...understood, heard } : understood;
    } catch (error) {
      lastError = error;
      const detail = error instanceof Error ? error.message : String(error);
      console.error('Task AI: Groq failed:', detail.slice(0, 200));
      if (!(error instanceof SyntaxError)) markFailed('groq', /\b429\b/.test(detail) ? (/per day|daily|\b(RPD|TPD)\b/i.test(detail) ? 60 : 2) * 60_000 : COOL_DOWN_MS);
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw lastError;
  const genAI = new GoogleGenerativeAI(apiKey);
  // Gemini hears the audio itself (Arabic and English), so no separate speech-to-text step.
  const parts = audio ? [{ text: prompt }, { inlineData: { mimeType: audio.mimeType, data: audio.data } }] : prompt;

  // Several Gemini models in turn: every error moves on to the next one, and a model that
  // just failed is skipped for a few minutes.
  const chain = [
    process.env.GEMINI_TASK_MODEL,
    'gemini-2.5-flash',
    'gemini-flash-latest',
    process.env.GEMINI_TASK_FALLBACK_MODEL,
    'gemini-flash-lite-latest',
  ].filter((m, i, all): m is string => Boolean(m) && all.indexOf(m) === i);
  // Healthy models first; if every one failed recently, try them all again rather than give up.
  const healthy = chain.filter((m) => !coolingDown(m));
  const models = healthy.length ? healthy : chain;
  for (const modelName of models) {
    const timeLeft = deadline - Date.now();
    if (timeLeft < 5_000) break;
    try {
      const model = genAI.getGenerativeModel(
        {
          model: modelName,
          systemInstruction: systemPrompt(clients),
          generationConfig: { temperature: 0.1, maxOutputTokens: 2048, responseMimeType: 'application/json' },
        },
        { timeout: Math.min(audio ? 30_000 : 15_000, timeLeft) }
      );
      const result = await trackGemini(modelName, 'tasks', () => model.generateContent(parts));
      const raw = JSON.parse(result.response.text()) as Record<string, unknown>;
      return toUnderstanding(raw, clients);
    } catch (error) {
      lastError = error;
      console.error(`Task AI: ${modelName} failed:`, error instanceof Error ? error.message.slice(0, 200) : error);
      // A bad answer (JSON) is a one-off; anything else (busy, timeout, retired) rests the model.
      if (!(error instanceof SyntaxError)) markFailed(modelName);
    }
  }
  throw lastError;
}

// ---------- Model health ----------

const COOL_DOWN_MS = 10 * 60_000;
const restUntil = new Map<string, number>();

function coolingDown(model: string) {
  return Date.now() < (restUntil.get(model) || 0);
}

function markFailed(model: string, ms = COOL_DOWN_MS) {
  restUntil.set(model, Date.now() + ms);
}

// ---------- Groq ----------

const GROQ_TASK_MODEL = process.env.GROQ_TASK_MODEL || 'openai/gpt-oss-120b';
const GROQ_WHISPER_MODEL = 'whisper-large-v3-turbo';

async function groqJson(system: string, user: string) {
  const data = await groqFetch<{ choices?: Array<{ message?: { content?: string } }> }>(
    'chat/completions',
    {
      model: GROQ_TASK_MODEL,
      temperature: 0.1,
      max_tokens: 4096, // includes the model's reasoning
      reasoning_effort: 'low',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    },
    { model: GROQ_TASK_MODEL, feature: 'tasks' }
  );
  return JSON.parse(data.choices?.[0]?.message?.content || '') as Record<string, unknown>;
}

async function groqTranscribe(audio: TaskAudio) {
  const form = new FormData();
  const ext = audio.mimeType.includes('ogg') ? 'ogg' : audio.mimeType.split('/')[1]?.split(';')[0] || 'ogg';
  form.append('file', new Blob([Buffer.from(audio.data, 'base64')], { type: audio.mimeType }), `voice.${ext}`);
  form.append('model', GROQ_WHISPER_MODEL);
  const data = await groqFetch<{ text?: string }>('audio/transcriptions', form, { model: GROQ_WHISPER_MODEL, feature: 'tasks', timeoutMs: 20_000 });
  const text = data.text?.trim();
  if (!text) throw new Error('Groq Whisper heard nothing.');
  return text;
}


function repeatMatches(date: string, rule: RepeatRule) {
  if (rule.freq === 'weekly' && rule.weekdays?.length) return rule.weekdays.includes(weekdayOf(date));
  if (rule.freq === 'monthly' && rule.monthDay) return Number(date.slice(8)) === rule.monthDay;
  return true;
}
