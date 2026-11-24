import { listClientProfiles } from './admin-ops';
import { aiJson, embedText } from './ai-json';
import { getSetting, setSetting } from './data/store';
import { clientsMentioned } from './memory-files';
import { supabase } from './supabase';

// Labelled conversation history. A chat ends 30 minutes after its last message; the 5-minute run
// then writes a 2-line summary, a topic and the clients it was about (one small AI call per chat,
// about $0.0002). Later questions bring back only the past chats that match: the same client, the
// same words, or the same meaning (a small embedding of each summary, kept in app_settings
// "chat_summary_vectors"). Kept in app_settings "chat_summaries" (newest 300); the full messages stay
// in chat_sessions. Viewable and deletable in Admin → Memory and /memory.

const KEY = 'chat_summaries';
const MAX = 300;
const IDLE_MS = 30 * 60_000;
const PER_RUN = 3;

export interface ChatSummary {
  sessionId: string;
  at: string; // when the chat ended (last message)
  clients: string[]; // client ids
  topic: string;
  summary: string;
}

export async function listChatSummaries(): Promise<ChatSummary[]> {
  const value = await getSetting<{ items?: ChatSummary[] }>(KEY).catch(() => null);
  return Array.isArray(value?.items) ? value!.items! : [];
}

// ---------- Meaning (embeddings) ----------
// Gemini embeddings cut to their first DIMS numbers (the model is trained so a shorter prefix still
// works) and stored as signed bytes: about 350 characters per chat, so all 300 load in one read.

const VECTORS = 'chat_summary_vectors';
const DIMS = 256;
/** Vectors added per 5-minute run for older summaries that don't have one yet. */
const BACKFILL = 10;

function pack(values: number[]) {
  const v = values.slice(0, DIMS);
  const max = Math.max(1e-9, ...v.map((x) => Math.abs(x)));
  return Buffer.from(Int8Array.from(v.map((x) => Math.round((x / max) * 127))).buffer).toString('base64');
}

function unpack(packed: string) {
  const bytes = Buffer.from(packed, 'base64');
  return Array.from(new Int8Array(bytes.buffer, bytes.byteOffset, bytes.length));
}

function cosine(a: number[], b: number[]) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

async function listVectors() {
  const value = await getSetting<{ items?: Record<string, string> }>(VECTORS).catch(() => null);
  return value?.items && typeof value.items === 'object' ? value.items : {};
}

const summaryText = (s: ChatSummary) => `${s.topic}. ${s.summary}`.trim();

/** Embeds the summaries that have no vector yet (newest first); drops vectors of deleted chats. */
async function updateVectors(items: ChatSummary[], limit: number) {
  const vectors = await listVectors();
  const ids = new Set(items.map((s) => s.sessionId));
  let changed = false;
  for (const id of Object.keys(vectors)) {
    if (!ids.has(id)) {
      delete vectors[id];
      changed = true;
    }
  }
  const todo = items.filter((s) => !vectors[s.sessionId] && summaryText(s).length > 3).slice(0, limit);
  for (const s of todo) {
    const values = await embedText(summaryText(s), 'document');
    if (!values) break; // embeddings resting (quota): try next run
    vectors[s.sessionId] = pack(values);
    changed = true;
  }
  if (changed) await setSetting(VECTORS, { items: vectors });
}

async function forgetVector(sessionId: string) {
  const vectors = await listVectors();
  if (!vectors[sessionId]) return;
  delete vectors[sessionId];
  await setSetting(VECTORS, { items: vectors });
}

async function saveSummaries(items: ChatSummary[]) {
  await setSetting(KEY, { items: items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, MAX) });
}

export async function deleteChatSummary(sessionId: string) {
  await saveSummaries((await listChatSummaries()).filter((s) => s.sessionId !== sessionId));
  await forgetVector(sessionId).catch(() => undefined);
}

export async function updateChatSummary(sessionId: string, patch: Partial<Pick<ChatSummary, 'summary' | 'topic' | 'clients'>>) {
  await saveSummaries((await listChatSummaries()).map((s) => (s.sessionId === sessionId ? { ...s, ...patch } : s)));
  await forgetVector(sessionId).catch(() => undefined); // embedded again on the next run
}

interface SessionRow {
  id: string;
  updated_at: string;
  messages: Array<{ role: string; content: string }> | null;
}

/** Called every 5 minutes: summarizes a few chats that have been quiet for 30 minutes. */
export async function summarizeFinishedChats(now = new Date()) {
  const done = new Set((await listChatSummaries()).map((s) => s.sessionId));
  const { data } = await supabase
    .from('chat_sessions')
    .select('id, updated_at, messages')
    .lt('updated_at', new Date(now.getTime() - IDLE_MS).toISOString())
    .gt('updated_at', new Date(now.getTime() - 14 * 86_400_000).toISOString())
    .order('updated_at', { ascending: false })
    .limit(30);
  const todo = ((data || []) as SessionRow[]).filter((s) => !done.has(s.id) && (s.messages || []).some((m) => m.role === 'user')).slice(0, PER_RUN);
  if (!todo.length) {
    await updateVectors(await listChatSummaries(), BACKFILL).catch((error) => console.error('Chat vectors:', error));
    return { summarized: 0 };
  }
  const clients = (await listClientProfiles()).filter((c): c is typeof c & { id: string } => Boolean(c.id && c.brandName));
  const fresh: ChatSummary[] = [];
  for (const s of todo) {
    const transcript = (s.messages || [])
      .map((m) => `${m.role === 'user' ? 'AHMED' : 'BOT'}: ${m.content.replace(/\[[A-Z]+[^\]]*\]/g, '').replace(/\s+/g, ' ').slice(0, 600)}`)
      .join('\n')
      .slice(0, 6000);
    let summary = '';
    let topic = '';
    let clientIds: string[] = [];
    try {
      const raw = await aiJson({
        system: `Summarize a finished chat between Ahmed and his assistant, for finding it again later.
Return ONLY JSON: {"summary": "<2 short sentences: what was asked, decided or found, with names, numbers and dates>", "topic": "<3-6 words>", "client_ids": ["<ids from the list of clients the chat was about>"]}
Write in the language Ahmed used.`,
        user: `CLIENTS (id | name):\n${clients.map((c) => `${c.id} | ${c.brandName}`).join('\n')}\n\nCHAT:\n${transcript}`,
        feature: 'assistant',
        timeBudgetMs: 15_000,
      });
      summary = typeof raw.summary === 'string' ? raw.summary.slice(0, 500) : '';
      topic = typeof raw.topic === 'string' ? raw.topic.slice(0, 80) : '';
      clientIds = Array.isArray(raw.client_ids) ? (raw.client_ids as string[]).filter((id) => clients.some((c) => c.id === id)) : [];
    } catch {
      // No AI right now: keep the first question, tag clients by name; it's retried never, which is fine.
      summary = (s.messages || []).find((m) => m.role === 'user')?.content.slice(0, 300) || '';
    }
    const named = clientsMentioned(transcript, clients).map((c) => c.id);
    fresh.push({ sessionId: s.id, at: s.updated_at, clients: [...new Set([...clientIds, ...named])], topic, summary });
  }
  await saveSummaries([...fresh, ...(await listChatSummaries())]);
  await updateVectors((await listChatSummaries()), fresh.length + BACKFILL).catch((error) => console.error('Chat vectors:', error));
  return { summarized: fresh.length };
}

const STOP = new Set(['the', 'and', 'for', 'about', 'what', 'did', 'was', 'with', 'that', 'this', 'عن', 'في', 'ايه', 'إيه', 'كان', 'كنا', 'اللي', 'على', 'من', 'مع', 'ده', 'دي', 'عايز', 'قولي']);

/** Past chats that fit the question: same client, shared words and similar meaning; at most 3. */
export async function relevantPastChats(question: string, clientIds: string[], limit = 3) {
  const items = await listChatSummaries();
  if (!items.length) return [];
  const [vectors, asked] = await Promise.all([listVectors(), embedText(question.slice(-1500), 'query').catch(() => null)]);
  const query = asked ? unpack(pack(asked)) : null;
  const words = [...new Set(question.toLowerCase().replace(/[^\w؀-ۿ\s]/g, ' ').split(/\s+/).filter((w) => w.length >= 3 && !STOP.has(w)))];
  const recall = /(last time|before|earlier|we (said|discussed|talked)|اتكلمنا|قلنا|كنا بنتكلم|آخر مرة|اخر مرة|المرة اللي فاتت|فاكر)/i.test(question);
  const scored = items
    .map((s, i) => {
      const text = `${s.topic} ${s.summary}`.toLowerCase();
      const clientHit = s.clients.some((c) => clientIds.includes(c)) ? 5 : 0;
      const wordHits = words.filter((w) => text.includes(w)).length;
      const recent = recall && i < 3 ? 2 : 0;
      const sim = query && vectors[s.sessionId] ? cosine(query, unpack(vectors[s.sessionId])) : 0;
      // Measured: the right chat scores 0.75–0.80 (Arabic too), unrelated ones up to about 0.69.
      const meaning = sim >= 0.74 ? 4 : sim >= 0.71 ? 2 : 0;
      return { s, score: clientHit + wordHits + recent + meaning };
    })
    .filter((x) => x.score >= 2)
    .sort((a, b) => b.score - a.score || b.s.at.localeCompare(a.s.at));
  return scored.slice(0, limit).map((x) => x.s);
}
