import crypto from 'crypto';
import { listClientProfiles } from './admin-ops';
import { clientNames } from './app-api';
import { saveTextFromApp } from './app-library';
import { taskClientList } from './app-tasks';
import { stoppedAds } from './ads-watch';
import { actionSummary, askAssistant, claimsDone, CHAT_MODELS, type AssistantAction, type ChatMessage } from './assistant';
import { autoModel } from './assistant-telegram';
import { addDoc, listDocs, updateDoc } from './data/store';
import { getEmailAccount, getEmailItem, listIgnoreRules, removeIgnoreRule, skipCause, updateEmailAccount, updateEmailItem } from './email/inbox';
import { setKnowledgeStatus } from './knowledge';
import { removeFact } from './assistant-memory';
import { placeFact } from './memory-guard';
import { addFactTo, clientIdOf, removeFactFrom, type FileKey } from './memory-files';
import { applyProfileUpdate } from './master-profile';
import { approveFiveStarDrafts, GBP_REVIEWS } from './review-engine';
import { socialOverview } from './social-sync';
import { supabase } from './supabase';
import { understandTaskMessage } from './task-ai';
import { completeTask, createTask, formatWhen, missingFields, setTaskStatus, type TaskFields } from './tasks';
import { addWebsite, runWebsiteChecks, websiteOverview } from './website-monitor';
import type { GbpStoredReview } from '@/types/database';

// The Anwarz app's AI chat (Chat tab). Same assistant as the Telegram bot (lib/assistant.ts), plus a
// "BUSINESS NOW" snapshot (reviews, ads, websites, social, JL Comfort) and app-only actions.
// Quick, undoable things (a task, a library note, a fact he asked to remember) happen at once with
// an Undo button; everything else waits for ✅ Confirm. One open conversation, kept in chat_sessions
// under chat_id "app"; "New chat" starts a fresh one.

const CHAT_ID = 'app';
const KEEP_MESSAGES = 40; // shown in the app; the model sees the last few
const MODEL_TURNS = 12;

export type AppChatAction = AssistantAction & {
  id: string;
  state: 'proposed' | 'done' | 'cancelled' | 'failed' | 'undone';
  result?: string;
  undo?: { kind: 'task' | 'library' | 'fact'; id: string; file?: FileKey } | null;
  link?: { type: 'task' | 'email' | 'library'; id: string } | null;
};

export interface AppChatMessage {
  role: 'user' | 'assistant';
  content: string;
  at: string;
  heard?: boolean; // the user's message came from a voice note
  model?: string;
  actions?: AppChatAction[];
  links?: { type: 'task' | 'email' | 'library'; id: string; title: string }[];
}

interface Session {
  id: string;
  chat_id: string;
  model: string | null;
  provider: string | null;
  status: 'active' | 'ended';
  messages: AppChatMessage[];
  updated_at: string;
}

function check<T>(result: { data: T; error: { message: string } | null }) {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

export async function appChatSession(): Promise<Session | null> {
  const rows = check(await supabase.from('chat_sessions').select().eq('chat_id', CHAT_ID).eq('status', 'active').order('updated_at', { ascending: false }).limit(1)) as Session[];
  return rows[0] || null;
}

async function saveSession(id: string, patch: Partial<Session>) {
  return check(await supabase.from('chat_sessions').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id).select().single()) as Session;
}

export async function newAppChat() {
  await supabase.from('chat_sessions').update({ status: 'ended' }).eq('chat_id', CHAT_ID).eq('status', 'active');
}

async function openSession(): Promise<Session> {
  const current = await appChatSession();
  if (current) return current;
  const model = await autoModel();
  return check(
    await supabase
      .from('chat_sessions')
      .insert({ id: crypto.randomBytes(6).toString('base64url'), chat_id: CHAT_ID, model: model?.model ?? null, provider: model?.provider ?? null, messages: [] })
      .select()
      .single()
  ) as Session;
}

// ---------- What the assistant sees beyond Telegram ----------

const settle = <T,>(p: Promise<T>, fallback: T, ms = 8_000) =>
  Promise.race([p.catch(() => fallback), new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);

async function jlSnapshot() {
  const key = process.env.JLCOMFORT_API_KEY?.trim();
  if (!key) return '';
  const base = (process.env.JLCOMFORT_URL || 'https://www.jlcomfort.com').replace(/\/+$/, '');
  const get = async (path: string) => {
    const r = await fetch(`${base}/api/anwarz/${path}`, { headers: { Authorization: `Bearer ${key}` }, cache: 'no-store', signal: AbortSignal.timeout(7_000) });
    if (!r.ok) throw new Error(`JL ${path} ${r.status}`);
    return r.json() as Promise<Record<string, unknown>>;
  };
  const [overview, orders, samples] = await Promise.all([get('overview'), get('orders').catch(() => null), get('samples').catch(() => null)]);
  const brief = (list: unknown, n: number) =>
    (Array.isArray(list) ? list : [])
      .slice(0, n)
      .map((o) => {
        const x = o as Record<string, unknown>;
        return [x.orderNumber || x.number || x.id, x.status, x.customerName || x.name, x.total ? `$${x.total}` : '', x.createdAt || x.created_at, x.source]
          .filter(Boolean)
          .join(' · ');
      })
      .join('\n');
  return [
    `JL COMFORT (his e-commerce store): orders by status ${JSON.stringify(overview.orders || {})}; samples by status ${JSON.stringify(overview.samples || {})}`,
    orders ? `Latest orders:\n${brief((orders as Record<string, unknown>).orders, 6)}` : '',
    samples ? `Latest sample requests:\n${brief((samples as Record<string, unknown>).samples, 6)}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

async function businessNow() {
  const [names, reviews, ads, sites, social, jl] = await Promise.all([
    settle(clientNames(), new Map<string, string>()),
    settle(listDocs<GbpStoredReview>(GBP_REVIEWS, { where: { status: ['draft_ready', 'needs_draft'] } }), [] as (GbpStoredReview & { id: string })[]),
    settle(stoppedAds(), { checkedAt: null, stopped: [] }),
    settle(websiteOverview(), null),
    settle(socialOverview(), []),
    settle(jlSnapshot(), ''),
  ]);
  const name = (id: string) => names.get(id) || 'Client';
  const waiting = reviews.filter((r) => r.backlog !== 'waiting' && r.backlog !== 'dismissed').sort((a, b) => b.createTime.localeCompare(a.createTime));
  const perClient = new Map<string, number>();
  for (const r of waiting) perClient.set(r.clientId, (perClient.get(r.clientId) || 0) + 1);

  return [
    'BUSINESS NOW:',
    `GOOGLE REVIEWS WAITING FOR A REPLY: ${waiting.length}${waiting.length ? ` (${[...perClient].map(([id, n]) => `${name(id)} ${n}`).join(', ')}); ready 5★ drafts: ${waiting.filter((r) => r.rating === 5 && r.status === 'draft_ready' && r.draft).length}` : ''}`,
    ...waiting.slice(0, 8).map((r) => `- ${name(r.clientId)} · ${r.rating}★ · ${r.reviewerName || 'Anonymous'}: ${(r.comment || '(rating only)').replace(/\s+/g, ' ').slice(0, 140)}${r.draft ? ` → drafted reply: ${r.draft.replace(/\s+/g, ' ').slice(0, 120)}` : ''}`),
    `ADS STOPPED: ${ads.stopped.length ? ads.stopped.map((a) => `${a.clientName} (${a.platform === 'google' ? 'Google Ads' : 'Meta'}): ${a.reason} since ${a.since.slice(0, 10)}`).join('; ') : 'none'}${ads.checkedAt ? ` (checked ${ads.checkedAt.slice(0, 16).replace('T', ' ')} UTC)` : ''}`,
    sites
      ? `WEBSITES: ${sites.sites.length} checked hourly; ${sites.down.length ? `DOWN: ${sites.down.map((s) => `${sites.names.get(s.clientId) || s.url} ${s.url}`).join(', ')}` : 'all up'}${sites.sslSoon.length ? `; SSL expiring soon: ${sites.sslSoon.map((s) => s.url).join(', ')}` : ''}`
      : '',
    social.length
      ? `FACEBOOK / INSTAGRAM (followers, change today / this week; comments waiting):\n${social
          .map((s) => {
            const f = (x?: { followers?: number; day?: number; week?: number }) =>
              x?.followers !== undefined ? `${x.followers}${x.day !== undefined ? ` (${x.day >= 0 ? '+' : ''}${x.day} today` : ''}${x.week !== undefined ? `, ${x.week >= 0 ? '+' : ''}${x.week} week)` : x.day !== undefined ? ')' : ''}` : '-';
            const latest = s.latest[0];
            return `- ${name(s.clientId)}: FB ${f(s.fb)} · IG ${f(s.ig)}${s.waiting ? ` · ${s.waiting} comments waiting` : ''}${latest ? ` · last post ${latest.createdTime?.slice(0, 10)}: ${(latest.message || '').replace(/\s+/g, ' ').slice(0, 80)}` : ''}`;
          })
          .join('\n')}`
      : '',
    jl,
  ]
    .filter(Boolean)
    .join('\n');
}

// ---------- Asking ----------

/** Turns a chat task into a saved task, filling what's missing with plain defaults (no questions while he's out). */
async function saveTaskFromChat(text: string) {
  const clients = await taskClientList();
  const { fields } = await understandTaskMessage(text, clients);
  const f: TaskFields = { ...fields, title: fields.title?.trim() || text.slice(0, 120) };
  for (const need of missingFields(f)) {
    if (need === 'category') f.category = f.clientId ? 'work' : 'work';
    if (need === 'client') f.noClient = true;
    if (need === 'when') f.noDate = true;
    if (need === 'time') f.allDay = true;
    if (need === 'repeat_end') f.repeatForever = true;
  }
  if (f.category === 'work' && !f.clientId) f.noClient = true;
  if (!f.date && !f.repeat) f.noDate = true;
  return createTask(f, { chatId: CHAT_ID, source: 'app-chat', rawInput: text });
}

async function saveFact(text: string) {
  const clients = (await listClientProfiles()).filter((c): c is typeof c & { id: string } => Boolean(c.id && c.brandName)).map((c) => ({ id: c.id, brandName: c.brandName }));
  const placed = await placeFact(text, clients);
  const fact = await addFactTo(placed.file, placed.text, placed.label);
  const client = clientIdOf(placed.file);
  return { fact, file: placed.file, where: client ? clients.find((c) => c.id === client)?.brandName || 'client file' : 'general memory' };
}

/** Runs one action for real. */
async function runAction(a: AppChatAction): Promise<AppChatAction> {
  try {
    switch (a.type) {
      case 'task': {
        const task = await saveTaskFromChat(a.text);
        return { ...a, state: 'done', result: `📌 ${task.title} · ${formatWhen(task)}`, undo: { kind: 'task', id: task.id }, link: { type: 'task', id: task.id } };
      }
      case 'library_note': {
        const { item } = await saveTextFromApp(a.text);
        return { ...a, state: 'done', result: `📚 Saved: ${item.title}`, undo: { kind: 'library', id: item.id }, link: { type: 'library', id: item.id } };
      }
      case 'remember': {
        const saved = await saveFact(a.text);
        return { ...a, state: 'done', result: `🧠 Saved to ${saved.where}: ${saved.fact.text}`, undo: { kind: 'fact', id: saved.fact.id, file: saved.file } };
      }
      case 'forget': {
        const fact = await removeFact(a.factId);
        return { ...a, state: fact ? 'done' : 'failed', result: fact ? `🗑 Forgotten: ${fact.text}` : 'That fact was already removed.' };
      }
      case 'update_profile':
        return { ...a, state: 'done', result: `📄 Master profile updated: ${await applyProfileUpdate(a.change)}` };
      case 'complete_task': {
        const { task, movedTo } = await completeTask(a.taskId);
        return { ...a, state: 'done', result: `✅ Done: ${a.title}${movedTo ? ` · next one ${formatWhen(task)}` : ''}` };
      }
      case 'email_important': {
        const item = await getEmailItem(a.emailId);
        if (!item) return { ...a, state: 'failed', result: 'That email is gone.' };
        const account = await getEmailAccount(item.account_id);
        const cause = skipCause({ ...item, status: 'skipped' }, account || undefined, await listIgnoreRules());
        if (account && cause?.kind === 'sender' && item.from_email) {
          await updateEmailAccount(account.id, { ignored_senders: account.ignored_senders.filter((s) => s !== item.from_email) });
        }
        if (cause?.kind === 'rule' && cause.ruleId) await removeIgnoreRule(cause.ruleId);
        await updateEmailItem(item.id, { status: 'new', summary: item.summary || item.snippet?.slice(0, 300) || null, reason: 'You marked it important' });
        return { ...a, state: 'done', result: `⭐ Back in Needs me: ${a.subject}`, link: { type: 'email', id: item.id } };
      }
      case 'email_done':
        await updateEmailItem(a.emailId, { status: 'done' });
        return { ...a, state: 'done', result: `✔️ Done: ${a.subject}`, link: { type: 'email', id: a.emailId } };
      case 'approve_five_star': {
        let ids: string[] | undefined;
        if (a.clientId) ids = (await listDocs<GbpStoredReview>(GBP_REVIEWS, { where: { status: 'draft_ready', clientId: a.clientId } })).map((r) => r.id);
        if (ids && !ids.length) return { ...a, state: 'done', result: 'No ready 5★ replies for that client.' };
        const results = await approveFiveStarDrafts(ids);
        const posted = results.filter((r) => r.success).length;
        const failed = results.length - posted;
        return { ...a, state: failed && !posted ? 'failed' : 'done', result: `⭐ Posted ${posted} 5★ repl${posted === 1 ? 'y' : 'ies'}${failed ? ` · ${failed} failed` : ''}` };
      }
      case 'add_client': {
        const clients = await listClientProfiles();
        const brand = a.fields.brandName!;
        if (clients.some((c) => c.brandName.trim().toLowerCase() === brand.toLowerCase())) return { ...a, state: 'failed', result: `${brand} is already a client.` };
        const now = new Date().toISOString();
        const id = await addDoc('clients', {
          brandName: brand,
          ownerName: a.fields.ownerName || '',
          email: a.fields.email || '',
          mobileNumber: a.fields.mobileNumber || '',
          websiteUrl: a.fields.websiteUrl || '',
          facebookLink: a.fields.facebookLink || '',
          instagramLink: a.fields.instagramLink || '',
          tiktokLink: a.fields.tiktokLink || '',
          googleLink: a.fields.googleLink || '',
          createdAt: now,
          updatedAt: now,
        });
        let extra = '';
        if (a.checkWebsite && a.fields.websiteUrl) {
          const site = await addWebsite({ clientId: id, url: a.fields.websiteUrl }).catch(() => null);
          if (site) {
            await runWebsiteChecks({ ids: [site.id] }).catch(() => undefined);
            extra = ' · website checked hourly';
          }
        }
        return { ...a, state: 'done', result: `➕ Added client ${brand}${extra}` };
      }
      case 'update_client':
        await updateDoc('clients', a.clientId, { ...a.changes, updatedAt: new Date().toISOString() });
        return { ...a, state: 'done', result: `✏️ Updated ${a.clientName}` };
      case 'add_website': {
        const clients = await listClientProfiles();
        const client = (a.clientId && clients.find((c) => c.id === a.clientId)) || clients.find((c) => c.brandName.toLowerCase() === a.clientName.toLowerCase());
        if (!client?.id) return { ...a, state: 'failed', result: `There’s no client named ${a.clientName}.` };
        const site = await addWebsite({ clientId: client.id, url: a.url, label: a.label || undefined });
        await runWebsiteChecks({ ids: [site.id] }).catch(() => undefined);
        return { ...a, state: 'done', result: `🌐 ${a.url} is checked every hour for ${client.brandName}` };
      }
    }
  } catch (error) {
    return { ...a, state: 'failed', result: (error instanceof Error ? error.message : String(error)).slice(0, 300) };
  }
}

/** Done at once (with Undo): a task, a library note, a fact he clearly asked to save. The rest wait for ✅. */
const runsAtOnce = (a: AssistantAction) => a.type === 'task' || a.type === 'library_note' || (a.type === 'remember' && Boolean(a.explicit));

/** The model only sees plain text; this says what happened to each action. */
function actionNote(a: AppChatAction) {
  if (a.state === 'done') return `[DONE by the bot] ${actionSummary(a)}${a.result ? ` → ${a.result}` : ''}`;
  if (a.state === 'failed') return `[FAILED] ${actionSummary(a)}: ${a.result || ''}`;
  if (a.state === 'cancelled' || a.state === 'undone') return `[CANCELLED by Ahmed] ${actionSummary(a)}`;
  return `[PROPOSED, not done yet: ${actionSummary(a)}]`;
}

function toHistory(messages: AppChatMessage[]): ChatMessage[] {
  return messages.slice(-MODEL_TURNS).map((m) => ({
    role: m.role,
    content: [m.content, ...(m.actions || []).map(actionNote)].filter(Boolean).join('\n'),
  }));
}

export async function askFromApp(question: string, heard: boolean) {
  let session = await openSession();
  const chosen = CHAT_MODELS.find((m) => m.model === session.model) || (await autoModel());
  if (!chosen) throw new Error('No AI model has free quota left right now. Try again later.');

  const reply = await askAssistant(chosen, question, toHistory(session.messages || []), { surface: 'app', extraContext: businessNow, runsAtOnce });
  const actions: AppChatAction[] = [];
  for (const a of reply.actions) {
    const action: AppChatAction = { ...a, id: crypto.randomBytes(4).toString('base64url'), state: 'proposed' };
    actions.push(runsAtOnce(a) ? await runAction(action) : action);
  }
  const now = new Date().toISOString();
  const warning =
    !actions.some((a) => a.state === 'done') && claimsDone(reply.text) && !actions.length ? '\n\n⚠️ Nothing was changed: changes only happen through the cards.' : '';
  const answer: AppChatMessage = {
    role: 'assistant',
    content: (reply.text || (actions.length ? 'Here’s what I prepared:' : '…')) + warning,
    at: now,
    model: reply.fellBackFrom ? `${reply.usedModel.label} (${reply.fellBackFrom.label} was busy)` : reply.usedModel.label,
    actions,
    links: [
      ...reply.tasks.slice(0, 4).map((t) => ({ type: 'task' as const, id: t.id, title: t.title })),
      ...reply.emails.slice(0, 4).map((e) => ({ type: 'email' as const, id: e.id, title: e.subject })),
      ...reply.items.slice(0, 4).map((k) => ({ type: 'library' as const, id: k.id, title: k.title })),
    ],
  };
  const messages = [...(session.messages || []), { role: 'user' as const, content: question, at: now, heard }, answer].slice(-KEEP_MESSAGES);
  session = await saveSession(session.id, { messages, model: reply.usedModel.model, provider: reply.usedModel.provider });
  return { session, answer };
}

/** ✅ Confirm, ✖️ Cancel or ↩️ Undo on an action card. */
export async function decideAction(actionId: string, decision: 'confirm' | 'cancel' | 'undo') {
  const session = await appChatSession();
  if (!session) throw new Error('This chat has ended.');
  const messages = session.messages || [];
  const message = messages.find((m) => m.actions?.some((a) => a.id === actionId));
  const action = message?.actions?.find((a) => a.id === actionId);
  if (!message || !action) throw new Error('That card is no longer in this chat.');

  let next: AppChatAction = action;
  if (decision === 'confirm') {
    if (action.state !== 'proposed') throw new Error('Already handled.');
    next = await runAction(action);
  } else if (decision === 'cancel') {
    if (action.state !== 'proposed') throw new Error('Already handled.');
    next = { ...action, state: 'cancelled' };
  } else {
    if (action.state !== 'done' || !action.undo) throw new Error('This can’t be undone.');
    const u = action.undo;
    if (u.kind === 'task') await setTaskStatus(u.id, 'cancelled');
    if (u.kind === 'library') await setKnowledgeStatus(u.id, 'removed');
    if (u.kind === 'fact' && u.file) await removeFactFrom(u.file, u.id);
    next = { ...action, state: 'undone', result: `↩️ Undone: ${action.result || ''}`, undo: null, link: null };
  }
  message.actions = message.actions!.map((a) => (a.id === actionId ? next : a));
  await saveSession(session.id, { messages });
  return next;
}
