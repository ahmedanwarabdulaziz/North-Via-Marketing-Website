'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, FileText, FolderOpen, MessagesSquare, Pencil, Plus, Settings2, Trash2, X } from 'lucide-react';
import {
  addMemoryFact,
  deleteMemoryFact,
  removeChatSummary,
  saveChatSummary,
  saveMasterProfile,
  saveShortProfile,
  updateMemoryFact,
} from '@/app/actions/memory';

interface Fact {
  id: string;
  text: string;
  at: string;
  label?: 'email' | 'client' | 'general';
}
interface ChatItem {
  sessionId: string;
  at: string;
  topic: string;
  summary: string;
  clientNames: string[];
}

type Tab = 'general' | 'clients' | 'profile' | 'chats';

function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const run = (fn: () => Promise<{ success: boolean; error?: string }>, okText = 'Saved') =>
    start(async () => {
      const res = await fn();
      setMessage(res.success ? { ok: true, text: okText } : { ok: false, text: res.error || 'Failed' });
      if (res.success) router.refresh();
    });
  return { pending, message, run };
}

function Status({ message }: { message: { ok: boolean; text: string } | null }) {
  if (!message) return null;
  return (
    <span className={`text-sm flex items-center gap-1 ${message.ok ? 'text-emerald-700' : 'text-amber-700'}`}>
      {message.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />} {message.text}
    </span>
  );
}

/** One file of facts: list with edit / delete, and an add box. */
function FactList({ file, facts, showLabel }: { file: string; facts: Fact[]; showLabel?: boolean }) {
  const { pending, message, run } = useAction();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [newText, setNewText] = useState('');
  const [newLabel, setNewLabel] = useState<'general' | 'email'>('general');
  const sorted = [...facts].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <div className="space-y-3">
      {!sorted.length && <p className="text-sm text-zinc-500">Nothing saved here yet.</p>}
      {sorted.map((f) => (
        <div key={f.id} className="rounded-xl border border-zinc-200 p-3">
          {editing === f.id ? (
            <div className="space-y-2">
              <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" dir="auto" />
              <div className="flex gap-2">
                <button
                  disabled={pending || !draft.trim()}
                  onClick={() => run(async () => { const r = await updateMemoryFact(file, f.id, draft); if (r.success) setEditing(null); return r; })}
                  className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm text-white disabled:opacity-40"
                >
                  Save
                </button>
                <button onClick={() => setEditing(null)} className="rounded-lg px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-zinc-900 whitespace-pre-wrap break-words" dir="auto">{f.text}</p>
                <p className="text-xs text-zinc-400 mt-1">
                  {showLabel && f.label === 'email' ? '📧 Email rule · ' : ''}
                  {new Date(f.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button title="Edit" onClick={() => { setEditing(f.id); setDraft(f.text); }} className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100">
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  title="Delete"
                  disabled={pending}
                  onClick={() => confirm('Delete this from memory?') && run(() => deleteMemoryFact(file, f.id), 'Deleted')}
                  className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
      <div className="rounded-xl border border-dashed border-zinc-300 p-3 space-y-2">
        <textarea
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          rows={2}
          placeholder="Add a rule or fact (Arabic or English)…"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          dir="auto"
        />
        <div className="flex flex-wrap items-center gap-2">
          {showLabel && (
            <select value={newLabel} onChange={(e) => setNewLabel(e.target.value as 'general' | 'email')} className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm bg-white">
              <option value="general">⚙️ General</option>
              <option value="email">📧 Email rule</option>
            </select>
          )}
          <button
            disabled={pending || !newText.trim()}
            onClick={() => run(async () => { const r = await addMemoryFact(file, newText, newLabel); if (r.success) setNewText(''); return r; }, 'Added')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm text-white disabled:opacity-40"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
          <Status message={message} />
        </div>
      </div>
    </div>
  );
}

export function MemoryManager(props: {
  masterText: string;
  masterUpdatedAt: string | null;
  shortProfile: string;
  general: Fact[];
  clients: { id: string; name: string; facts: Fact[] }[];
  chats: ChatItem[];
}) {
  const [tab, setTab] = useState<Tab>('general');
  const [clientId, setClientId] = useState(props.clients.find((c) => c.facts.length)?.id || props.clients[0]?.id || '');
  const [master, setMaster] = useState(props.masterText);
  const [short, setShort] = useState(props.shortProfile);
  const [chatEdit, setChatEdit] = useState<{ id: string; text: string } | null>(null);
  const profileAction = useAction();
  const chatAction = useAction();
  const client = props.clients.find((c) => c.id === clientId);

  const tabs: { id: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { id: 'general', label: 'General rules', icon: Settings2, count: props.general.length },
    { id: 'clients', label: 'Client files', icon: FolderOpen, count: props.clients.reduce((n, c) => n + c.facts.length, 0) },
    { id: 'profile', label: 'Your profile', icon: FileText },
    { id: 'chats', label: 'Past chats', icon: MessagesSquare, count: props.chats.length },
  ];

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${tab === t.id ? 'bg-zinc-900 text-white' : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50'}`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
            {t.count !== undefined && <span className={`rounded-full px-2 text-xs ${tab === t.id ? 'bg-white/20' : 'bg-zinc-100'}`}>{t.count}</span>}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-6">
        {tab === 'general' && (
          <>
            <h2 className="text-lg font-semibold text-zinc-900">⚙️ General rules</h2>
            <p className="text-sm text-zinc-500 mb-4">Used in every chat and every email. 📧 Email rules decide which emails matter in all inboxes.</p>
            <FactList file="general" facts={props.general} showLabel />
          </>
        )}

        {tab === 'clients' && (
          <>
            <h2 className="text-lg font-semibold text-zinc-900">📁 Client files</h2>
            <p className="text-sm text-zinc-500 mb-4">Rules and facts for one client only: used for that client’s emails, tasks, WhatsApp messages and chats about them.</p>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="mb-4 w-full sm:w-80 rounded-xl border border-zinc-300 px-3 py-2 text-sm bg-white">
              {props.clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.facts.length})
                </option>
              ))}
            </select>
            {client && <FactList key={client.id} file={`client:${client.id}`} facts={client.facts} />}
          </>
        )}

        {tab === 'profile' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">📄 Master profile</h2>
              <p className="text-sm text-zinc-500 mb-3">
                Only about you: career, ventures, education, positioning and tone. Used for bios, CVs, LinkedIn and proposals.
                {props.masterUpdatedAt && ` Last updated ${new Date(props.masterUpdatedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}.`}
              </p>
              <textarea value={master} onChange={(e) => setMaster(e.target.value)} rows={22} className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm font-mono" dir="auto" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900">Short profile</h3>
              <p className="text-sm text-zinc-500 mb-2">The few lines that go with every message (up to 1,500 characters).</p>
              <textarea value={short} onChange={(e) => setShort(e.target.value)} rows={5} maxLength={1500} className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm" dir="auto" />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                disabled={profileAction.pending || (master === props.masterText && short === props.shortProfile)}
                onClick={() =>
                  profileAction.run(async () => {
                    if (master !== props.masterText) {
                      const r = await saveMasterProfile(master);
                      if (!r.success) return r;
                    }
                    return short !== props.shortProfile ? saveShortProfile(short) : { success: true };
                  })
                }
                className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
              >
                {profileAction.pending ? 'Saving…' : 'Save profile'}
              </button>
              <Status message={profileAction.message} />
            </div>
          </div>
        )}

        {tab === 'chats' && (
          <>
            <h2 className="text-lg font-semibold text-zinc-900">🗂 Past chats</h2>
            <p className="text-sm text-zinc-500 mb-4">A short summary of each finished chat, tagged with its clients. Anwarz brings back the ones that match a new question.</p>
            <div className="space-y-3">
              {!props.chats.length && <p className="text-sm text-zinc-500">No finished chats summarized yet.</p>}
              {props.chats.map((c) => (
                <div key={c.sessionId} className="rounded-xl border border-zinc-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-900" dir="auto">{c.topic || 'Chat'}</p>
                      <p className="text-xs text-zinc-400">
                        {new Date(c.at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                        {c.clientNames.length ? ` · ${c.clientNames.join(', ')}` : ''}
                      </p>
                      {chatEdit?.id === c.sessionId ? (
                        <div className="mt-2 space-y-2">
                          <textarea value={chatEdit.text} onChange={(e) => setChatEdit({ id: c.sessionId, text: e.target.value })} rows={3} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" dir="auto" />
                          <div className="flex gap-2">
                            <button
                              onClick={() => chatAction.run(async () => { const r = await saveChatSummary(c.sessionId, chatEdit.text); if (r.success) setChatEdit(null); return r; })}
                              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm text-white"
                            >
                              Save
                            </button>
                            <button onClick={() => setChatEdit(null)} className="rounded-lg px-2 py-1.5 text-zinc-500 hover:bg-zinc-100">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-zinc-700 mt-1 whitespace-pre-wrap" dir="auto">{c.summary}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button title="Edit" onClick={() => setChatEdit({ id: c.sessionId, text: c.summary })} className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        title="Delete"
                        onClick={() => confirm('Delete this chat summary?') && chatAction.run(() => removeChatSummary(c.sessionId), 'Deleted')}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <Status message={chatAction.message} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
