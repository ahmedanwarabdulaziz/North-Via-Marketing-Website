import { addFact, getMemory, removeFact, type FactLabel, type MemoryFact } from './assistant-memory';
import { getSetting, setSetting } from './data/store';
import { newId } from './tasks';

// The places Anwarz keeps what it should remember, each viewable and editable (Admin → Memory,
// /memory in Telegram):
//   "general"        rules and facts for everything (app_settings assistant_memory.facts)
//   "client:<id>"    one file per client: their rules, preferences, contacts (app_settings client_notes:<id>)
// The master profile (about Ahmed only) is lib/master-profile.ts; past chats are lib/chat-history.ts.
// Only the files that matter for a message are sent to the AI: general + that client's file.

export type FileKey = 'general' | `client:${string}`;

const MAX_CLIENT_FACTS = 60;
const MAX_FACT_CHARS = 400;
const clientSetting = (clientId: string) => `client_notes:${clientId}`;

export const clientIdOf = (key: FileKey) => (key.startsWith('client:') ? key.slice(7) : null);

export async function listFacts(key: FileKey): Promise<MemoryFact[]> {
  const clientId = clientIdOf(key);
  if (!clientId) return (await getMemory()).facts;
  const value = await getSetting<{ facts?: MemoryFact[] }>(clientSetting(clientId)).catch(() => null);
  return Array.isArray(value?.facts) ? value!.facts! : [];
}

export async function addFactTo(key: FileKey, text: string, label: FactLabel = 'general', replaceIds: string[] = []): Promise<MemoryFact> {
  const clientId = clientIdOf(key);
  if (!clientId) return addFact(text, label, replaceIds);
  const facts = (await listFacts(key)).filter((f) => !replaceIds.includes(f.id));
  const fact: MemoryFact = { id: newId(), text: text.trim().slice(0, MAX_FACT_CHARS), at: new Date().toISOString(), label: 'client' };
  const same = facts.find((f) => f.text.toLowerCase() === fact.text.toLowerCase());
  if (same && !replaceIds.length) return same;
  await setSetting(clientSetting(clientId), { facts: [...facts.filter((f) => f !== same), fact].slice(-MAX_CLIENT_FACTS) });
  return fact;
}

export async function removeFactFrom(key: FileKey, id: string): Promise<MemoryFact | null> {
  const clientId = clientIdOf(key);
  if (!clientId) return removeFact(id);
  const facts = await listFacts(key);
  const fact = facts.find((f) => f.id === id) || null;
  if (fact) await setSetting(clientSetting(clientId), { facts: facts.filter((f) => f.id !== id) });
  return fact;
}

/** Edits a fact's wording in place (Admin → Memory); the date moves to now so it counts as newest. */
export async function updateFactIn(key: FileKey, id: string, text: string): Promise<void> {
  const clean = text.trim().slice(0, MAX_FACT_CHARS);
  if (!clean) return;
  const clientId = clientIdOf(key);
  if (!clientId) {
    const memory = await getMemory();
    const facts = memory.facts.map((f) => (f.id === id ? { ...f, text: clean, at: new Date().toISOString() } : f));
    await setSetting('assistant_memory', { ...memory, facts });
    return;
  }
  const facts = (await listFacts(key)).map((f) => (f.id === id ? { ...f, text: clean, at: new Date().toISOString() } : f));
  await setSetting(clientSetting(clientId), { facts });
}

/** A client's file as text for the AI, newest first (newer wins on a conflict); '' when empty. */
export async function clientFileText(clientId: string, name: string) {
  const facts = await listFacts(`client:${clientId}`);
  if (!facts.length) return '';
  return [`CLIENT FILE — ${name} (rules and facts for this client only; newest first, newer wins):`, ...[...facts].reverse().slice(0, 30).map((f) => `- (${f.at.slice(0, 10)}) ${f.text}`)].join('\n');
}

export interface ClientRef {
  id: string;
  brandName: string;
  ownerName?: string;
  websiteUrl?: string;
  email?: string;
}

function domainOf(value?: string | null) {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  const fromEmail = v.includes('@') ? v.split('@').pop()! : null;
  try {
    const host = fromEmail || new URL(/^https?:\/\//.test(v) ? v : `https://${v}`).hostname;
    return host.replace(/^www\./, '');
  } catch {
    return null;
  }
}

const GENERIC_DOMAINS = new Set(['gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com', 'yahoo.com', 'icloud.com', 'me.com', 'proton.me', 'protonmail.com']);

/** The clients an email address (or several) belongs to, by matching domains with their website / email. */
export function clientsForAddresses(addresses: (string | null | undefined)[], clients: ClientRef[]) {
  const domains = addresses.map(domainOf).filter((d): d is string => Boolean(d) && !GENERIC_DOMAINS.has(d!));
  if (!domains.length) return [];
  return clients.filter((c) => {
    const own = [domainOf(c.websiteUrl), domainOf(c.email)].filter(Boolean) as string[];
    return own.some((d) => domains.some((x) => x === d || x.endsWith(`.${d}`)));
  });
}

/** Clients named in a text (brand or owner name, case-insensitive). */
export function clientsMentioned(text: string, clients: ClientRef[]) {
  const t = text.toLowerCase();
  return clients.filter((c) => {
    const names = [c.brandName, c.ownerName].filter((n): n is string => Boolean(n && n.trim().length >= 3));
    return names.some((n) => t.includes(n.toLowerCase()) || n.toLowerCase().split(/\s+/).some((w) => w.length >= 4 && t.includes(w)));
  });
}
