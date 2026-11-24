import { aiJson } from './ai-json';
import { getSetting, setSetting } from './data/store';

// Memory within one long app chat. The model sees the last MODEL_TURNS messages word for word; the
// messages before them are kept as a short running summary (decisions, names, numbers, ids), so a
// long conversation doesn't forget what was agreed at the start. The summary is refreshed after a
// turn is answered (lib/app-chat.ts refreshEarlierSummary, run with next/server after()), never
// while he waits. Kept in app_settings "app_chat_earlier" for the open chat only.

const KEY = 'app_chat_earlier';
/** Summarize again once this many more messages have scrolled out of the model's view. */
const REFRESH_EVERY = 4;
const MAX_SUMMARY_CHARS = 2500;

interface Earlier {
  sessionId: string;
  /** How many of the chat's first messages the summary covers. */
  upTo: number;
  text: string;
  at: string;
}

export interface EarlierMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** The summary of the messages before the model's window, for this chat ('' when there is none). */
export async function earlierInChat(sessionId: string): Promise<string> {
  const saved = await getSetting<Earlier>(KEY).catch(() => null);
  return saved?.sessionId === sessionId ? saved.text : '';
}

/**
 * Brings the summary up to date when enough messages have left the model's view (the last
 * `window` messages). Cheap: one small AI call every few turns, only in long chats.
 */
export async function refreshEarlierSummary(sessionId: string, messages: EarlierMessage[], window: number) {
  const outOfView = Math.max(0, messages.length - window);
  if (outOfView < 2) return;
  const saved = await getSetting<Earlier>(KEY).catch(() => null);
  const mine = saved?.sessionId === sessionId ? saved : null;
  if (mine && outOfView - mine.upTo < REFRESH_EVERY) return;

  const from = mine ? mine.upTo : 0;
  const fresh = messages
    .slice(from, outOfView)
    .map((m) => `${m.role === 'user' ? 'AHMED' : 'ANWARZ'}: ${m.content.replace(/\s+/g, ' ').slice(0, 900)}`)
    .join('\n')
    .slice(0, 9000);
  if (!fresh.trim()) return;
  const raw = await aiJson({
    system: `You keep the running memory of ONE long chat between Ahmed and his assistant Anwarz.
Merge the EARLIER SUMMARY with the NEW MESSAGES into one updated summary the assistant can rely on later in the same chat.
Keep: what he asked for, what was decided or agreed, what was done or prepared (cards, emails, tasks) and what is still open, with exact names, clients, email addresses, order numbers (JL-…, S-…), amounts, dates and ids in [brackets].
Drop small talk and anything later corrected (the newer version wins). Short bullet lines, at most ${MAX_SUMMARY_CHARS} characters, in the language Ahmed used.
Return ONLY JSON: {"summary": "<the updated summary>"}`,
    user: `EARLIER SUMMARY:\n${mine?.text || '(none yet)'}\n\nNEW MESSAGES:\n${fresh}`,
    feature: 'assistant',
    timeBudgetMs: 25_000,
  });
  const text = typeof raw.summary === 'string' ? raw.summary.trim().slice(0, MAX_SUMMARY_CHARS) : '';
  if (!text) return;
  await setSetting(KEY, { sessionId, upTo: outOfView, text, at: new Date().toISOString() } satisfies Earlier);
}
