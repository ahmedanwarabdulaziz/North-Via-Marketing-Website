import { getSetting, setSetting } from './data/store';
import { newId } from './tasks';

// Anwarz's long-term memory (in Supabase, app_settings "assistant_memory", backed up nightly):
// a short profile of Ahmed plus facts and standing instructions he chose to save. Both go into
// every chat and the email sorting. New facts pass lib/memory-guard.ts first, so a duplicate or
// a contradiction with an older fact is shown to him (Replace / Keep both / Cancel) instead of
// piling up. Each fact has a label: email (inbox rules), client (about a client), general.
// When two facts still disagree, the newer one wins (the prompts say so).

const KEY = 'assistant_memory';
const MAX_FACTS = 200;
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

const FACT_STOP = new Set(['the', 'and', 'for', 'with', 'that', 'this', 'from', 'about', 'his', 'her', 'are', 'was', 'what', 'عن', 'في', 'على', 'من', 'مع', 'اللي', 'ده', 'دي']);
const factWords = (text: string) => new Set(text.toLowerCase().replace(/[^\w؀-ۿ@.\s]/g, ' ').split(/\s+/).filter((w) => w.length >= 3 && !FACT_STOP.has(w)));

/**
 * The facts for one conversation when they don't all fit: those that share words with what's being
 * talked about (a client's name, a mailbox, a subject) first, then the newest, up to the budget.
 * Shown newest first either way, so the newer one still wins on a conflict.
 */
export function factsForTopic(facts: MemoryFact[], topic: string) {
  const all = factsInBudget(facts);
  if (all.length === facts.length || !topic.trim()) return all;
  const words = factWords(topic);
  const scored = facts.map((f, i) => ({ f, i, hits: [...factWords(f.text)].filter((w) => words.has(w)).length }));
  const order = [...scored.filter((x) => x.hits > 0).sort((a, b) => b.hits - a.hits || b.i - a.i), ...scored.filter((x) => x.hits === 0).sort((a, b) => b.i - a.i)];
  const picked = new Set<MemoryFact>();
  let used = 0;
  for (const { f } of order) {
    used += f.text.length + 14;
    if (used > FACTS_BUDGET) continue; // a shorter one may still fit
    picked.add(f);
  }
  return [...facts].reverse().filter((f) => picked.has(f));
}

/** The memory block for the chat model's context (newest first; newer wins on a conflict). */
export function memoryContext(memory: AssistantMemory, topic = '') {
  const facts = factsForTopic(memory.facts, topic);
  return [
    `ABOUT THE OWNER: ${memory.profile || '(no profile yet)'}`,
    '',
    `REMEMBERED FACTS AND INSTRUCTIONS (${memory.facts.length}${facts.length < memory.facts.length ? `, the ${facts.length} that fit this conversation shown` : ''}; newest first — if two disagree, the NEWER one wins):`,
    ...(facts.length ? facts.map((f) => `[M:${f.id}] (${labelOf(f)}, ${f.at.slice(0, 10)}) ${f.text}`) : ['none yet']),
  ].join('\n');
}
