import crypto from 'crypto';
import { aiJson } from './ai-json';
import { listClientProfiles } from './admin-ops';
import { getSetting, setSetting } from './data/store';
import { clientFileText, clientsMentioned, type ClientRef } from './memory-files';

// "Improve with Anwarz": select text in any app on the phone → Anwarz ✓ Correct or Anwarz ✨ Rephrase.
// Correct fixes grammar, spelling and punctuation only. Rephrase follows a mode Ahmed writes in the
// app's settings (More → Writing modes), e.g. "Make it more professional". Arabic and English, mixed too.
// Claude Haiku (OpenRouter) first, the free models as a fallback (lib/ai-json.ts).
// The writing bubble adds: a reply to a message he copied (replyTo), the client it's for (their saved
// rules are followed; found from the names in the text when not picked), and quick adjustments of a
// result (Shorter, Warmer, More formal).

const SETTING = 'writing_modes';
const MAX_TEXT = 6000;

export interface WritingMode {
  id: string;
  name: string; // shown in the menu, e.g. "Professional"
  emoji: string;
  instructions: string; // what the AI should do, in Ahmed's words
}

const DEFAULT_MODES: WritingMode[] = [
  { id: 'pro', name: 'Professional', emoji: '💼', instructions: 'Make it professional, clear and confident, suitable for a client or business partner. Keep it about the same length.' },
  { id: 'friendly', name: 'Friendly', emoji: '😊', instructions: 'Make it warm and friendly but still polite. Natural, like a message to a client you know well.' },
  { id: 'short', name: 'Shorter', emoji: '✂️', instructions: 'Make it shorter and more direct. Keep every fact, number, date and request.' },
  { id: 'clear', name: 'Clearer', emoji: '💡', instructions: 'Make it easier to understand: simple words, short sentences, clear order. Keep the meaning.' },
  { id: 'en', name: 'To English', emoji: '🇬🇧', instructions: 'Translate it into natural, professional English. If it is already English, just polish it.' },
  { id: 'ar', name: 'To Arabic', emoji: '🇪🇬', instructions: 'Translate it into natural Arabic (clear Modern Standard Arabic unless the text is Egyptian dialect, then keep Egyptian). If it is already Arabic, just polish it.' },
];

export async function listWritingModes(): Promise<WritingMode[]> {
  const stored = await getSetting<{ modes?: WritingMode[] }>(SETTING).catch(() => null);
  return Array.isArray(stored?.modes) ? stored!.modes! : DEFAULT_MODES;
}

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Saves the whole list (add, edit, delete and order are all done in the app). */
export async function saveWritingModes(input: unknown): Promise<WritingMode[]> {
  if (!Array.isArray(input)) throw new Error('modes must be a list.');
  const modes = input
    .slice(0, 30)
    .map((m) => {
      const x = (m || {}) as Record<string, unknown>;
      return {
        id: /^[A-Za-z0-9_-]{1,24}$/.test(String(x.id || '')) ? String(x.id) : crypto.randomBytes(4).toString('base64url'),
        name: clean(x.name, 40),
        emoji: clean(x.emoji, 8) || '✨',
        instructions: clean(x.instructions, 800),
      };
    })
    .filter((m) => m.name && m.instructions);
  await setSetting(SETTING, { modes, updatedAt: new Date().toISOString() });
  return modes;
}

const BASE_RULES = `- Work in the SAME LANGUAGE as the text (Arabic stays Arabic, English stays English, mixed stays mixed), unless the instructions ask to translate.
- Keep names, brands, numbers, prices, dates, links, emails and emojis exactly as they are.
- Keep line breaks and the format (a WhatsApp message stays a message, a list stays a list).
- Do not add greetings, signatures or anything that wasn't asked for. Do not answer the text or comment on it.
Return ONLY JSON: {"text": "<the result>"}`;

/** Quick changes to a result, shown under it in the writing panel. */
export const ADJUSTMENTS: Record<string, { name: string; instructions: string }> = {
  adjust_shorter: { name: 'Shorter', instructions: 'Make it shorter and more direct. Keep every fact, number, date and request.' },
  adjust_warmer: { name: 'Warmer', instructions: 'Make it warmer and friendlier, still polite and professional.' },
  adjust_formal: { name: 'More formal', instructions: 'Make it more formal and polished, suitable for a business client.' },
};

export interface ImproveOptions {
  /** The message he is answering (copied from the other app): the result is his reply to it. */
  replyTo?: string;
  /** The client it's for; found from names in the text when not given. 'none' = no client. */
  clientId?: string | null;
}

/** The client the text is for (picked, or named in it) and their saved rules. */
async function clientFor(text: string, clientId: string | null | undefined) {
  if (clientId === 'none') return null;
  const clients = (await listClientProfiles().catch(() => [])).filter((c) => c.id && c.brandName) as ClientRef[];
  const client = clientId ? clients.find((c) => c.id === clientId) : clientsMentioned(text, clients)[0];
  if (!client) return null;
  const rules = await clientFileText(client.id, client.brandName).catch(() => '');
  return { id: client.id, name: client.brandName, rules };
}

/** mode 'correct' = grammar, spelling and punctuation only; otherwise the id of a writing mode. */
export async function improveText(text: string, mode: string, opts: ImproveOptions = {}) {
  const input = text.trim().slice(0, MAX_TEXT);
  const replyTo = (opts.replyTo || '').trim().slice(0, MAX_TEXT);
  if (!input && !replyTo) throw new Error('No text to improve.');
  const client = await clientFor(`${replyTo}\n${input}`, opts.clientId);
  let task: string; // for rewriting his text
  let style: string; // how a reply should sound
  let label: string;
  if (ADJUSTMENTS[mode]) {
    label = ADJUSTMENTS[mode].name;
    style = ADJUSTMENTS[mode].instructions;
    task = `Rewrite the text: ${style} Keep the author's meaning.`;
  } else if (mode === 'correct') {
    label = 'Correct';
    style = 'Natural and correct, in his own voice and the tone of his notes.';
    task = `Correct the text: fix grammar, spelling, punctuation and typos ONLY. Keep the same words, tone, style and length; change a word only when it is wrong. For Arabic: fix spelling (ة/ه, ى/ي, أ/إ/ا, hamza), grammar and punctuation, and keep the dialect if it is Egyptian. If nothing is wrong, return the text unchanged.`;
  } else {
    const m = (await listWritingModes()).find((x) => x.id === mode);
    if (!m) throw new Error('That writing mode no longer exists.');
    label = m.name;
    style = m.instructions;
    task = `Rewrite the text following these instructions from the author:\n"""${m.instructions}"""\nAlso fix any grammar, spelling and punctuation mistakes. Keep the author's meaning.`;
  }
  const forClient = client
    ? `\n\nThis is for the client ${client.name}.${client.rules ? ` Follow their saved rules (tone, language, names, what to avoid):\n${client.rules}` : ''}`
    : '';
  // A reply to a message he copied: his text says WHAT to answer; the mode says HOW it should sound.
  const system = replyTo
    ? `You are a careful writing assistant for Ahmed Anwar (marketing agency owner) on his phone. Write AHMED'S REPLY to THEIR MESSAGE.
${input ? 'HIS NOTES say what the reply must say (his points, decisions, numbers): include all of them and nothing he did not decide.' : 'He gave no notes: write a short, fitting reply that acknowledges their message without promising anything (no prices, dates or commitments).'}
How it should sound (his instructions): """${style}"""${forClient}

Rules:
- Reply in the language of their message, unless his notes or the instructions ask for another one (Egyptian Arabic stays Egyptian).
- Keep names, numbers, prices, dates, links and emails exactly as given.
- Write it ready to send in a chat or email: no subject line, no placeholders, no explanations, no "Here is your reply".
Return ONLY JSON: {"text": "<the reply>"}`
    : `You are a careful writing assistant for Ahmed Anwar (marketing agency owner) on his phone.\n${task}${forClient}\n\nRules:\n${BASE_RULES}`;
  const raw = await aiJson({
    system,
    user: replyTo ? `THEIR MESSAGE:\n${replyTo}\n\nHIS NOTES:\n${input || '(none)'}` : input,
    feature: 'assistant',
    timeBudgetMs: 25_000,
  });
  const out = clean(raw.text, MAX_TEXT * 2);
  if (!out) throw new Error('The AI returned nothing. Try again.');
  return { text: out, mode: label, changed: out !== input, client: client ? { id: client.id, name: client.name } : null };
}
