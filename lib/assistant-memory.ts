import { getSetting, setSetting } from './data/store';
import { newId } from './tasks';

// Anwarz's long-term memory (in Supabase, app_settings "assistant_memory", backed up nightly):
// a short profile of Ahmed plus facts and standing instructions he chose to save. Both go into
// every chat and the email sorting. New facts pass lib/memory-guard.ts first, so a duplicate or
// a contradiction with an older fact is shown to him (Replace / Keep both / Cancel) instead of
// piling up. Each fact has a label: email (inbox rules), client (about a client), general.
// When two facts still disagree, the newer one wins (the prompts say so).

const KEY = 'assistant_memory';
const MAX_FACTS = 60;
const MAX_FACT_CHARS = 300;
const MAX_PROFILE_CHARS = 1500;
/** Facts shown to the model, newest first, until this many characters. */
const FACTS_BUDGET = 3000;

export type FactLabel = 'email' | 'client' | 'general';
export const FACT_LABELS: Record<FactLabel, string> = { email: '📧 Email', client: '👤 Clients', general: '⚙️ General' };

export interface MemoryFact {
  id: string;
  text: string;
  at: string; // ISO
  label?: FactLabel; // missing on facts saved before labels: treated as general
}

export interface AssistantMemory {
  profile: string;
  facts: MemoryFact[];
}

export const labelOf = (f: MemoryFact): FactLabel => f.label || 'general';

export async function getMemory(): Promise<AssistantMemory> {
  const value = await getSetting<Partial<AssistantMemory>>(KEY).catch(() => null);
  return { profile: value?.profile || '', facts: Array.isArray(value?.facts) ? value!.facts! : [] };
}

/** Saves a fact (use lib/memory-guard.ts proposeFact, which checks for conflicts first). */
export async function addFact(text: string, label: FactLabel = 'general', replaceIds: string[] = []): Promise<MemoryFact> {
  const memory = await getMemory();
  const fact: MemoryFact = { id: newId(), text: text.trim().slice(0, MAX_FACT_CHARS), at: new Date().toISOString(), label };
  const kept = memory.facts.filter((f) => !replaceIds.includes(f.id));
  const same = kept.find((f) => f.text.toLowerCase() === fact.text.toLowerCase());
  if (same && !replaceIds.length) return same;
  // Oldest facts drop off once the list is full.
  const facts = [...kept.filter((f) => f !== same), fact].slice(-MAX_FACTS);
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

/** The facts that fit the budget, newest first; optionally only some labels. */
export function factsInBudget(facts: MemoryFact[], labels?: FactLabel[]) {
  const out: MemoryFact[] = [];
  let used = 0;
  for (const f of [...facts].reverse()) {
    if (labels && !labels.includes(labelOf(f))) continue;
    used += f.text.length + 14;
    if (used > FACTS_BUDGET) break;
    out.push(f);
  }
  return out;
}

/** The memory block for the chat model's context (newest first; newer wins on a conflict). */
export function memoryContext(memory: AssistantMemory) {
  const facts = factsInBudget(memory.facts);
  return [
    `ABOUT THE OWNER: ${memory.profile || '(no profile yet)'}`,
    '',
    `REMEMBERED FACTS AND INSTRUCTIONS (${memory.facts.length}${facts.length < memory.facts.length ? `, newest ${facts.length} shown` : ''}; newest first — if two disagree, the NEWER one wins):`,
    ...(facts.length ? facts.map((f) => `[M:${f.id}] (${labelOf(f)}, ${f.at.slice(0, 10)}) ${f.text}`) : ['none yet']),
  ].join('\n');
}
