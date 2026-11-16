import crypto from 'crypto';
import { aiJson } from './ai-json';
import { getSetting, setSetting } from './data/store';

// "Improve with Anwarz": select text in any app on the phone → Anwarz ✓ Correct or Anwarz ✨ Rephrase.
// Correct fixes grammar, spelling and punctuation only. Rephrase follows a mode Ahmed writes in the
// app's settings (More → Writing modes), e.g. "Make it more professional". Arabic and English, mixed too.
// Claude Haiku (OpenRouter) first, the free models as a fallback (lib/ai-json.ts).

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

/** mode 'correct' = grammar, spelling and punctuation only; otherwise the id of a writing mode. */
export async function improveText(text: string, mode: string) {
  const input = text.trim().slice(0, MAX_TEXT);
  if (!input) throw new Error('No text to improve.');
  let task: string;
  let label: string;
  if (mode === 'correct') {
    label = 'Correct';
    task = `Correct the text: fix grammar, spelling, punctuation and typos ONLY. Keep the same words, tone, style and length; change a word only when it is wrong. For Arabic: fix spelling (ة/ه, ى/ي, أ/إ/ا, hamza), grammar and punctuation, and keep the dialect if it is Egyptian. If nothing is wrong, return the text unchanged.`;
  } else {
    const m = (await listWritingModes()).find((x) => x.id === mode);
    if (!m) throw new Error('That writing mode no longer exists.');
    label = m.name;
    task = `Rewrite the text following these instructions from the author:\n"""${m.instructions}"""\nAlso fix any grammar, spelling and punctuation mistakes. Keep the author's meaning.`;
  }
  const raw = await aiJson({
    system: `You are a careful writing assistant for Ahmed Anwar (marketing agency owner) on his phone.\n${task}\n\nRules:\n${BASE_RULES}`,
    user: input,
    feature: 'assistant',
    timeBudgetMs: 25_000,
  });
  const out = clean(raw.text, MAX_TEXT * 2);
  if (!out) throw new Error('The AI returned nothing. Try again.');
  return { text: out, mode: label, changed: out !== input };
}
