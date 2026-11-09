import { listClientProfiles } from './admin-ops';
import { aiJson } from './ai-json';
import { getSetting, setSetting } from './data/store';
import { clientsMentioned } from './memory-files';
import { supabase } from './supabase';

// Labelled conversation history. A chat ends 30 minutes after its last message; the 5-minute run
// then writes a 2-line summary, a topic and the clients it was about (one small AI call per chat,
// about $0.0002). Later questions bring back only the past chats that match: the same client, or
// the same words. Kept in app_settings "chat_summaries" (newest 300); the full messages stay in
// chat_sessions. Viewable and deletable in Admin → Memory and /memory.

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

async function saveSummaries(items: ChatSummary[]) {
  await setSetting(KEY, { items: items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, MAX) });
}

export async function deleteChatSummary(sessionId: string) {
  await saveSummaries((await listChatSummaries()).filter((s) => s.sessionId !== sessionId));
}

export async function updateChatSummary(sessionId: string, patch: Partial<Pick<ChatSummary, 'summary' | 'topic' | 'clients'>>) {
  await saveSummaries((await listChatSummaries()).map((s) => (s.sessionId === sessionId ? { ...s, ...patch } : s)));
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
  if (!todo.length) return { summarized: 0 };
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
  return { summarized: fresh.length };
}

const STOP = new Set(['the', 'and', 'for', 'about', 'what', 'did', 'was', 'with', 'that', 'this', 'عن', 'في', 'ايه', 'إيه', 'كان', 'كنا', 'اللي', 'على', 'من', 'مع', 'ده', 'دي', 'عايز', 'قولي']);

/** Past chats that fit the question: same client first, then shared words; at most 3. */
export async function relevantPastChats(question: string, clientIds: string[], limit = 3) {
  const items = await listChatSummaries();
  if (!items.length) return [];
  const words = [...new Set(question.toLowerCase().replace(/[^\w؀-ۿ\s]/g, ' ').split(/\s+/).filter((w) => w.length >= 3 && !STOP.has(w)))];
  const recall = /(last time|before|earlier|we (said|discussed|talked)|اتكلمنا|قلنا|كنا بنتكلم|آخر مرة|اخر مرة|المرة اللي فاتت|فاكر)/i.test(question);
  const scored = items
    .map((s, i) => {
      const text = `${s.topic} ${s.summary}`.toLowerCase();
      const clientHit = s.clients.some((c) => clientIds.includes(c)) ? 5 : 0;
      const wordHits = words.filter((w) => text.includes(w)).length;
      const recent = recall && i < 3 ? 2 : 0;
      return { s, score: clientHit + wordHits + recent };
    })
    .filter((x) => x.score >= 2)
    .sort((a, b) => b.score - a.score || b.s.at.localeCompare(a.s.at));
  return scored.slice(0, limit).map((x) => x.s);
}
