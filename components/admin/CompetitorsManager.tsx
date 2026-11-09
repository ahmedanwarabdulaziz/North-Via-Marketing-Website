'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, ExternalLink, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { checkCompetitorNow, deleteCompetitorAction, saveCompetitorAction } from '@/app/actions/competitors';

interface Status {
  ig: { checkedAt: string; followers?: number; error?: string } | null;
  web: { checkedAt: string; error?: string } | null;
  google: { checkedAt: string; rating?: number; count?: number; error?: string } | null;
}
interface Row {
  id: string;
  name: string;
  website?: string;
  instagram?: string;
  googleQuery?: string;
  notes?: string;
  status: Status;
  growth: { rating?: number; count?: number; gained7: number | null } | null;
  adsUrl: string;
}
interface Finding {
  id: string;
  at: string;
  competitorName: string;
  source: string;
  kind: string;
  title: string;
  detail: string;
  url?: string;
}

const empty = { name: '', website: '', instagram: '', google: '', notes: '' };
const when = (iso?: string) => (iso ? new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : 'not yet');

export function CompetitorsManager({
  clients,
  clientId,
  competitors,
  findings,
}: {
  clients: { id: string; name: string }[];
  clientId: string;
  competitors: Row[];
  findings: Finding[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState<{ id?: string } & typeof empty>(empty);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const run = (fn: () => Promise<{ success: boolean; error?: string; note?: string }>, ok = 'Saved') =>
    start(async () => {
      const r = await fn();
      setMessage(r.success ? { ok: true, text: r.note || ok } : { ok: false, text: r.error || 'Failed' });
      if (r.success) router.refresh();
    });

  return (
    <div className="space-y-6">
      <select value={clientId} onChange={(e) => router.push(`/admin/competitors?client=${e.target.value}`)} className="w-full sm:w-80 rounded-xl border border-zinc-300 px-3 py-2 text-sm bg-white">
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <div className="space-y-4">
        {!competitors.length && <p className="text-sm text-zinc-500">No competitors for this client yet. Add the first one below.</p>}
        {competitors.map((c) => {
          const growth = c.growth;
          const query = c.googleQuery;
          return (
            <div key={c.id} className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-zinc-900" dir="auto">{c.name}</h3>
                  <div className="text-sm text-zinc-600 mt-1 space-y-0.5 break-all">
                    {c.instagram && (
                      <p>
                        📸 <a className="underline" href={`https://instagram.com/${c.instagram}`} target="_blank">@{c.instagram}</a>
                        {c.status.ig?.followers !== undefined && ` · ${c.status.ig.followers.toLocaleString('en')} followers`}
                        <span className="text-zinc-400"> · checked {when(c.status.ig?.checkedAt)}</span>
                        {c.status.ig?.error && <span className="text-amber-700"> · {c.status.ig.error}</span>}
                      </p>
                    )}
                    {c.website && (
                      <p>
                        🌐 <a className="underline" href={c.website} target="_blank">{c.website}</a>
                        <span className="text-zinc-400"> · checked {when(c.status.web?.checkedAt)}</span>
                        {c.status.web?.error && <span className="text-amber-700"> · {c.status.web.error}</span>}
                      </p>
                    )}
                    {(query || growth) && (
                      <p>
                        ⭐ {growth ? `${growth.rating ?? '?'}★ · ${growth.count ?? '?'} reviews${growth.gained7 !== null ? ` (${growth.gained7 >= 0 ? '+' : ''}${growth.gained7} this week)` : ''}` : query}
                        <span className="text-zinc-400"> · checked {when(c.status.google?.checkedAt)}</span>
                        {c.status.google?.error && <span className="text-amber-700"> · {c.status.google.error}</span>}
                      </p>
                    )}
                    {c.notes && <p className="text-zinc-500" dir="auto">📝 {c.notes}</p>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <a href={c.adsUrl} target="_blank" className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50">
                    <ExternalLink className="w-4 h-4" /> Ads now
                  </a>
                  <button disabled={pending} onClick={() => run(() => checkCompetitorNow(c.id))} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50">
                    <RefreshCw className={`w-4 h-4 ${pending ? 'animate-spin' : ''}`} /> Check now
                  </button>
                  <button
                    onClick={() => setForm({ id: c.id, name: c.name, website: c.website || '', instagram: c.instagram || '', google: query || '', notes: c.notes || '' })}
                    className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    disabled={pending}
                    onClick={() => confirm(`Stop watching ${c.name}?`) && run(() => deleteCompetitorAction(clientId, c.id), 'Removed')}
                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-5">
        <h3 className="font-semibold text-zinc-900 mb-3">{form.id ? 'Edit competitor' : 'Add a competitor'}</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {(
            [
              ['name', 'Name *', 'Karioka Fine Egyptian Cuisine'],
              ['instagram', 'Instagram (handle or link)', 'karioka.cuisine'],
              ['website', 'Website', 'karioka.carrd.co'],
              ['google', 'Google Maps name and area', 'Karioka Fine Egyptian Cuisine Toronto'],
            ] as const
          ).map(([key, label, placeholder]) => (
            <label key={key} className="block">
              <span className="text-sm font-medium text-zinc-700">{label}</span>
              <input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} placeholder={placeholder} className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm" dir="auto" />
            </label>
          ))}
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-zinc-700">Notes (optional)</span>
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. same area, similar menu, targets families" className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm" dir="auto" />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            disabled={pending || !form.name.trim()}
            onClick={() => run(async () => { const r = await saveCompetitorAction({ ...form, clientId }); if (r.success) setForm(empty); return r; }, form.id ? 'Saved' : 'Added')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            <Plus className="w-4 h-4" /> {form.id ? 'Save' : 'Add competitor'}
          </button>
          {form.id && (
            <button onClick={() => setForm(empty)} className="rounded-xl px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100">
              Cancel
            </button>
          )}
          {message && (
            <span className={`text-sm flex items-center gap-1 ${message.ok ? 'text-emerald-700' : 'text-amber-700'}`}>
              {message.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />} {message.text}
            </span>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-5">
        <h3 className="font-semibold text-zinc-900 mb-3">Latest findings</h3>
        {!findings.length && <p className="text-sm text-zinc-500">Nothing yet. The first check only records each competitor’s starting point; new posts and changes show up after that.</p>}
        <div className="space-y-3">
          {findings.map((f) => (
            <div key={f.id} className="text-sm border-b border-zinc-100 pb-2">
              <p className="font-medium text-zinc-900" dir="auto">
                {f.competitorName} · {f.source} · {f.kind.replace('_', ' ')}: {f.title}
              </p>
              <p className="text-zinc-600" dir="auto">{f.detail}</p>
              <p className="text-xs text-zinc-400">
                {when(f.at)}
                {f.url && (
                  <>
                    {' · '}
                    <a className="underline" href={f.url} target="_blank">open</a>
                  </>
                )}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
