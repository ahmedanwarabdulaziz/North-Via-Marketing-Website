import { getSetting, setSetting } from './data/store';
import { newId } from './tasks';

// The chat assistant's long-term memory: a short profile of Ahmed plus facts he asked it to
// remember. Both go into every chat, so the bot knows him across conversations (a chat itself
// still ends after 30 minutes). Facts are only added or removed after he taps ✅ Confirm.
// Stored as one app_settings row; kept small because Groq's free tier allows 8K tokens a minute.

const KEY = 'assistant_memory';
const MAX_FACTS = 60;
const MAX_FACT_CHARS = 300;
const MAX_PROFILE_CHARS = 1500;
/** Facts shown to the model, newest first, until this many characters. */
const FACTS_BUDGET = 3000;

export interface MemoryFact {
  id: string;
  text: string;
  at: string; // ISO
}

export interface AssistantMemory {
  profile: string;
  facts: MemoryFact[];
}

export async function getMemory(): Promise<AssistantMemory> {
  const value = await getSetting<Partial<AssistantMemory>>(KEY).catch(() => null);
  return { profile: value?.profile || '', facts: Array.isArray(value?.facts) ? value!.facts! : [] };
}

export async function addFact(text: string): Promise<MemoryFact> {
  const memory = await getMemory();
  const fact = { id: newId(), text: text.trim().slice(0, MAX_FACT_CHARS), at: new Date().toISOString() };
  const same = memory.facts.find((f) => f.text.toLowerCase() === fact.text.toLowerCase());
  if (same) return same;
  // Oldest facts drop off once the list is full.
  const facts = [...memory.facts, fact].slice(-MAX_FACTS);
  await setSetting(KEY, { ...memory, facts });
  return fact;
}

export async function removeFact(id: string): Promise<MemoryFact | null> {
  const memory = await getMemory();
  const fact = memory.facts.find((f) => f.id === id) || null;
  if (fact) await setSetting(KEY, { ...memory, facts: memory.facts.filter((f) => f.id !== id) });
  return fact;
}

export async function setProfile(profile: string) {
  const memory = await getMemory();
  await setSetting(KEY, { ...memory, profile: profile.trim().slice(0, MAX_PROFILE_CHARS) });
}

/** The facts that fit the budget, newest first. */
export function factsInBudget(facts: MemoryFact[]) {
  const out: MemoryFact[] = [];
  let used = 0;
  for (const f of [...facts].reverse()) {
    used += f.text.length + 14;
    if (used > FACTS_BUDGET) break;
    out.push(f);
  }
  return out;
}

/** The memory block for the chat model's context. */
export function memoryContext(memory: AssistantMemory) {
  const facts = factsInBudget(memory.facts);
  return [
    `ABOUT THE OWNER: ${memory.profile || '(no profile yet)'}`,
    '',
    `REMEMBERED FACTS (${memory.facts.length}${facts.length < memory.facts.length ? `, newest ${facts.length} shown` : ''}):`,
    ...(facts.length ? facts.map((f) => `[M:${f.id}] ${f.text}`) : ['none yet']),
  ].join('\n');
}
