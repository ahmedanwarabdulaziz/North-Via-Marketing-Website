'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react';
import { disconnectInbox, saveInboxSettings } from '@/app/actions/email';

interface InboxView {
  id: string;
  provider: 'gmail' | 'outlook';
  email: string;
  label: string;
  focus: string;
  enabled: boolean;
  ringUrgent: boolean;
  ignoredSenders: string;
  lastCheckedAt: string | null;
  lastError: string | null;
}

export function InboxCard({ account }: { account: InboxView }) {
  const router = useRouter();
  const [form, setForm] = useState(account);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(form) !== JSON.stringify(account);

  function save() {
    start(async () => {
      const res = await saveInboxSettings(account.id, form);
      setMessage(res.success ? { ok: true, text: 'Saved' } : { ok: false, text: res.error || 'Failed' });
      if (res.success) router.refresh();
    });
  }

  function disconnect() {
    if (!confirm(`Disconnect ${account.email}? Anwarz will stop reading it. You can connect it again later.`)) return;
    start(async () => {
      const res = await disconnectInbox(account.id);
      if (res.success) router.refresh();
      else setMessage({ ok: false, text: res.error || 'Failed' });
    });
  }

  const checked = account.lastCheckedAt ? new Date(account.lastCheckedAt).toLocaleString('en-GB', { timeZone: 'Africa/Cairo', dateStyle: 'medium', timeStyle: 'short' }) : 'not yet';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-zinc-900 flex items-center gap-2 break-all">
            <Mail className="w-5 h-5 text-red-500 shrink-0" />
            {account.label || account.email}
          </h2>
          <p className="text-sm text-zinc-500 break-all">
            {account.email} · {account.provider === 'gmail' ? 'Gmail' : 'Outlook'} · last checked {checked}
          </p>
          {account.lastError && (
            <p className="text-sm text-amber-700 mt-1 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {account.lastError}
            </p>
          )}
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-zinc-700 shrink-0 cursor-pointer">
          <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} className="w-4 h-4" />
          Checking on
        </label>
      </div>

      <div className="grid gap-4">
        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Name</span>
          <input
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            placeholder="e.g. NVM, Sanad, Personal"
            className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-zinc-700">What matters in this inbox</span>
          <textarea
            value={form.focus}
            onChange={(e) => setForm({ ...form, focus: e.target.value })}
            rows={3}
            placeholder="e.g. Clients and invoices only. Anything from the bank. Ignore newsletters. Ring me for complaints."
            className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
          />
          <span className="text-xs text-zinc-500">Arabic or English. Instructions you give Anwarz in Telegram (/memory) apply to every inbox too.</span>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Ignored senders</span>
          <textarea
            value={form.ignoredSenders}
            onChange={(e) => setForm({ ...form, ignoredSenders: e.target.value })}
            rows={2}
            placeholder="one email address per line"
            className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm font-mono"
          />
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
          <input type="checkbox" checked={form.ringUrgent} onChange={(e) => setForm({ ...form, ringUrgent: e.target.checked })} className="w-4 h-4" />
          Ring my phone for urgent emails
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button onClick={save} disabled={!dirty || pending} className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40">
          {pending ? 'Saving…' : 'Save'}
        </button>
        <button onClick={disconnect} disabled={pending} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-red-600 hover:bg-red-50">
          <Trash2 className="w-4 h-4" /> Disconnect
        </button>
        {message && (
          <span className={`text-sm flex items-center gap-1 ${message.ok ? 'text-emerald-700' : 'text-amber-700'}`}>
            {message.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />} {message.text}
          </span>
        )}
      </div>
    </div>
  );
}
