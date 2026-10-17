'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Share2, ListChecks, Unplug, Link2, Copy, Check, AlertTriangle, X } from 'lucide-react';
import { disconnectSocial, getMetaConnectUrl, previewSocialAccounts, saveSocialAccounts } from '@/app/actions/social';

export interface SocialCardStats {
  fb?: { followers?: number; day?: number; week?: number };
  ig?: { followers?: number; day?: number; week?: number };
  latest: Array<{ id: string; platform: 'facebook' | 'instagram'; message?: string; permalink?: string; reach?: number; likes?: number; commentsCount?: number }>;
  waiting: number;
}

interface Props {
  clientId: string;
  configured: boolean;
  adminConnected: boolean;
  accounts: Array<{ id: string; pageName: string; igUsername?: string; lastError?: string }>;
  stats: SocialCardStats | null;
  notice?: 'connected' | 'error';
}

type Choice = { id: string; pageName: string; igUsername?: string; selected: boolean; takenByClientId?: string };

const fmt = (n?: number) => (n === undefined ? '—' : n.toLocaleString());
const signed = (n?: number) => (n ? (n > 0 ? `+${n}` : String(n)) : '0');

function PagePicker({ clientId, onClose, onSaved }: { clientId: string; onClose: () => void; onSaved: () => void }) {
  const [choices, setChoices] = useState<Choice[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    previewSocialAccounts(clientId).then((r) => {
      if (cancelled) return;
      if (r.success && r.accounts) {
        setChoices(r.accounts);
        setPicked(new Set(r.accounts.filter((a) => a.selected).map((a) => a.id)));
      } else setError(r.error || 'Could not load pages.');
    });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  async function save() {
    setSaving(true);
    const r = await saveSocialAccounts(clientId, [...picked]);
    setSaving(false);
    if (r.success) onSaved();
    else setError(r.error || 'Could not save.');
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
          <h4 className="font-semibold text-zinc-900">Choose this client’s pages</h4>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-700" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 overflow-y-auto flex-1 space-y-2">
          {error && <div className="text-sm text-red-600">{error}</div>}
          {!choices && !error && <div className="text-sm text-zinc-500">Loading pages…</div>}
          {choices?.length === 0 && <div className="text-sm text-zinc-500">No pages found. Connect a Facebook account first.</div>}
          {choices?.map((c) => (
            <label key={c.id} className={`flex items-start gap-3 p-3 rounded-xl border ${c.takenByClientId ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-zinc-50'} ${picked.has(c.id) ? 'border-blue-500 bg-blue-50/50' : 'border-zinc-200'}`}>
              <input
                type="checkbox"
                className="mt-0.5 w-4 h-4 rounded border-zinc-300 text-blue-600"
                disabled={Boolean(c.takenByClientId)}
                checked={picked.has(c.id)}
                onChange={(e) => {
                  const next = new Set(picked);
                  if (e.target.checked) next.add(c.id);
                  else next.delete(c.id);
                  setPicked(next);
                }}
              />
              <div className="min-w-0">
                <div className="text-sm font-medium text-zinc-900">{c.pageName}</div>
                <div className="text-xs text-zinc-500">{c.igUsername ? `Instagram @${c.igUsername}` : 'No Instagram business account linked'}</div>
                {c.takenByClientId && <div className="text-xs text-amber-700 mt-0.5">Already monitored for another client</div>}
              </div>
            </label>
          ))}
        </div>
        <div className="p-5 border-t border-zinc-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 rounded-lg">Cancel</button>
          <button onClick={save} disabled={saving || !choices} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving…' : `Save (${picked.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ClientSocialCard({ clientId, configured, adminConnected, accounts, stats, notice }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clientLink, setClientLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(notice === 'connected' && accounts.length === 0);

  async function connect(via: 'admin' | 'client_link') {
    setBusy(via);
    setError(null);
    const r = await getMetaConnectUrl(clientId, via);
    if (r.success && r.url) {
      if (via === 'admin') window.location.href = r.url;
      else {
        setClientLink(r.url);
        setBusy(null);
      }
    } else {
      setError(r.error || 'Could not start Facebook login.');
      setBusy(null);
    }
  }

  async function disconnect() {
    if (!confirm('Stop monitoring this client’s Facebook and Instagram? If the client connected with their own link, that access is revoked too.')) return;
    setBusy('disconnect');
    const r = await disconnectSocial(clientId);
    if (!r.success) setError(r.error || 'Could not disconnect.');
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
      <div className="p-6 border-b border-zinc-100 bg-zinc-50/50 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-zinc-900 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-blue-500" />
            Facebook & Instagram
          </h3>
          <p className="text-sm text-zinc-500 mt-1">
            {accounts.length
              ? `${accounts.length} page${accounts.length === 1 ? '' : 's'} monitored · followers, latest posts and comments, checked hourly.`
              : 'Follow followers, post reach and comments. Replies and hiding always need your approval.'}
          </p>
        </div>
        <div className="flex flex-col sm:items-end gap-2 shrink-0">
          <div className="flex gap-2">
            {(adminConnected || accounts.length > 0) && (
              <button onClick={() => setPickerOpen(true)} disabled={busy !== null} className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 text-zinc-700 text-sm font-medium rounded-xl hover:bg-zinc-50 disabled:opacity-50">
                <ListChecks className="w-4 h-4" /> Choose pages
              </button>
            )}
            {accounts.length > 0 ? (
              <button onClick={disconnect} disabled={busy !== null} className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 text-sm font-medium rounded-xl hover:bg-red-100 disabled:opacity-50">
                <Unplug className="w-4 h-4" /> Disconnect
              </button>
            ) : (
              <button onClick={() => connect('admin')} disabled={busy !== null || !configured} className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50">
                {adminConnected ? 'Reconnect my Facebook' : 'Connect with my Facebook'}
              </button>
            )}
          </div>
          {accounts.length === 0 && (
            <button onClick={() => connect('client_link')} disabled={busy !== null || !configured} className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50">
              <Link2 className="w-4 h-4" /> Create link for client
            </button>
          )}
        </div>
      </div>

      {!configured && (
        <div className="px-6 py-3 bg-amber-50 text-amber-800 text-sm border-b border-amber-100">
          Facebook isn’t set up yet. Add <code>META_APP_ID</code> and <code>META_APP_SECRET</code> in Vercel, then redeploy.
        </div>
      )}
      {notice === 'error' && (
        <div className="px-6 py-3 bg-amber-50 text-amber-800 text-sm border-b border-amber-100">
          Facebook login did not complete. Make sure the Pages and Instagram accounts are selected and every permission is allowed, then try again.
        </div>
      )}
      {error && <div className="px-6 py-3 bg-red-50 text-red-700 text-sm border-b border-red-100">{error}</div>}

      {clientLink && (
        <div className="p-6 border-b border-zinc-100 space-y-2">
          <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Client connection link (valid 7 days)</div>
          <div className="flex gap-2">
            <input readOnly value={clientLink} onFocus={(e) => e.currentTarget.select()} className="flex-1 min-w-0 text-sm font-mono bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-zinc-600" />
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(clientLink);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="text-xs text-zinc-500">
            The owner logs in with the Facebook account that manages their Page. This only works for people outside your team once Meta has approved the app (App Review).
          </p>
        </div>
      )}

      {accounts.length > 0 && (
        <div className="p-6 space-y-4">
          {accounts.map((a) => (
            <div key={a.id} className="text-sm">
              <div className="font-medium text-zinc-900">{a.pageName}{a.igUsername ? <span className="text-zinc-500 font-normal"> · @{a.igUsername}</span> : null}</div>
              {a.lastError && (
                <div className="text-xs text-red-600 mt-1 flex items-start gap-1"><AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {a.lastError}</div>
              )}
            </div>
          ))}
          {stats ? (
            <div className="grid sm:grid-cols-2 gap-3">
              {([['fb', 'Facebook followers'], ['ig', 'Instagram followers']] as const).map(([key, label]) =>
                stats[key] ? (
                  <div key={key} className="rounded-xl border border-zinc-200 p-4">
                    <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</div>
                    <div className="text-2xl font-semibold text-zinc-900 mt-1">{fmt(stats[key]!.followers)}</div>
                    <div className="text-xs text-zinc-500 mt-1">{signed(stats[key]!.day)} today · {signed(stats[key]!.week)} this week</div>
                  </div>
                ) : null
              )}
              {stats.latest.map((p) => (
                <div key={p.id} className="rounded-xl border border-zinc-200 p-4 sm:col-span-2">
                  <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Latest {p.platform === 'facebook' ? 'Facebook' : 'Instagram'} post</div>
                  <div className="text-sm text-zinc-800 mt-1 line-clamp-2">{p.message || 'No caption'}</div>
                  <div className="text-xs text-zinc-500 mt-2 flex flex-wrap gap-x-4">
                    <span>{fmt(p.reach)} {p.platform === 'facebook' ? 'views' : 'reach'}</span>
                    <span>{fmt(p.likes)} likes</span>
                    <span>{fmt(p.commentsCount)} comments</span>
                    {p.permalink && <a href={p.permalink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Open</a>}
                  </div>
                </div>
              ))}
              <div className="text-sm text-zinc-600 sm:col-span-2">
                {stats.waiting ? `💬 ${stats.waiting} comment${stats.waiting === 1 ? '' : 's'} waiting in Telegram` : '✅ No comments waiting'}
              </div>
            </div>
          ) : (
            <div className="text-sm text-zinc-500">First numbers arrive with the next hourly check.</div>
          )}
        </div>
      )}

      {pickerOpen && (
        <PagePicker
          clientId={clientId}
          onClose={() => setPickerOpen(false)}
          onSaved={() => {
            setPickerOpen(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
