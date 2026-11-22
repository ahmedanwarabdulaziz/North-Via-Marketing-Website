'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, ExternalLink, Facebook, Instagram, Loader2, RefreshCw, Search, ShieldAlert, X } from 'lucide-react';
import { assignSocialPage, getAgencyMetaConnectUrl } from '@/app/actions/social';

import type { SocialConnectionsData, SocialPageRow } from '@/lib/social-connections';

interface Props extends SocialConnectionsData {
  notice?: 'connected' | 'error';
  reason?: string;
}

type Filter = 'all' | 'unassigned' | 'assigned' | 'issues';

const day = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });

function PageAvatar({ id, name }: { id: string; name: string }) {
  const [failed, setFailed] = useState(false);
  if (failed)
    return (
      <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 font-semibold flex items-center justify-center shrink-0">{name.slice(0, 1).toUpperCase()}</div>
    );
  // Public Page profile picture; no token needed.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`https://graph.facebook.com/${id}/picture?type=square&width=88&height=88`} alt="" className="w-11 h-11 rounded-xl object-cover shrink-0 bg-zinc-100" onError={() => setFailed(true)} />;
}

export function SocialConnectionsManager({ configured, connections, pages, clients, notice, reason }: Props) {
  const router = useRouter();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>(() => (pages.some((p) => !p.clientId) ? 'unassigned' : 'all'));
  const [showNotice, setShowNotice] = useState(Boolean(notice));

  const clientName = useMemo(() => new Map(clients.map((c) => [c.id, c.name])), [clients]);
  const mine = connections.find((c) => c.via === 'admin');
  const counts = {
    all: pages.length,
    unassigned: pages.filter((p) => !p.clientId).length,
    assigned: pages.filter((p) => p.clientId).length,
    issues: pages.filter((p) => p.lastError).length,
  };
  const instagram = pages.filter((p) => p.igUsername).length;

  const shown = pages.filter((p) => {
    if (filter === 'unassigned' && p.clientId) return false;
    if (filter === 'assigned' && !p.clientId) return false;
    if (filter === 'issues' && !p.lastError) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [p.pageName, p.igUsername, p.clientId ? clientName.get(p.clientId) : ''].some((v) => v?.toLowerCase().includes(q));
  });

  async function connect() {
    setConnecting(true);
    setError(null);
    const r = await getAgencyMetaConnectUrl();
    if (r.success && r.url) window.location.href = r.url;
    else {
      setError(r.error || 'Could not start the Facebook login.');
      setConnecting(false);
    }
  }

  async function assign(page: SocialPageRow, clientId: string | null) {
    if (clientId === page.clientId) return;
    if (page.clientId && clientId && !confirm(`Move ${page.pageName} from ${clientName.get(page.clientId) ?? 'its client'} to ${clientName.get(clientId)}?`)) return;
    setSaving(page.id);
    setError(null);
    const r = await assignSocialPage(page.id, clientId);
    if (!r.success) setError(r.error || 'Could not save.');
    router.refresh();
    setSaving(null);
  }

  const tabs: Array<{ id: Filter; label: string }> = [
    { id: 'unassigned', label: 'Needs a client' },
    { id: 'assigned', label: 'Linked' },
    { id: 'issues', label: 'Problems' },
    { id: 'all', label: 'All' },
  ];

  return (
    <div className="space-y-6">
      {showNotice && (
        <div
          className={`flex items-start gap-3 rounded-2xl border p-4 text-sm ${
            notice === 'connected' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'
          }`}>
          {notice === 'connected' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
          <div className="flex-1">
            {notice === 'connected'
              ? `Facebook is connected. ${counts.unassigned ? `${counts.unassigned} Page${counts.unassigned === 1 ? '' : 's'} still need${counts.unassigned === 1 ? 's' : ''} a client below.` : 'Every Page is linked to a client.'}`
              : reason || 'The Facebook login didn’t finish. Try again and allow access to all your Pages.'}
          </div>
          <button onClick={() => setShowNotice(false)} aria-label="Dismiss" className="opacity-60 hover:opacity-100"><X className="w-4 h-4" /></button>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div className="flex-1">{error}</div>
          <button onClick={() => setError(null)} aria-label="Dismiss" className="opacity-60 hover:opacity-100"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Your Facebook connection */}
      <section className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-6 flex flex-col md:flex-row md:items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-[#1877F2] text-white flex items-center justify-center shrink-0">
            <Facebook className="w-7 h-7" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold text-zinc-900">Your Facebook account</h2>
              {mine ? (
                mine.status === 'error' ? (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">Needs reconnecting</span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">Connected</span>
                )
              ) : (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600">Not connected</span>
              )}
            </div>
            <p className="text-sm text-zinc-500 mt-1">
              {mine
                ? `${mine.userName} · ${mine.pages} Page${mine.pages === 1 ? '' : 's'} · connected ${day(mine.connectedAt)}, refreshed ${day(mine.updatedAt)}`
                : 'Sign in with the Facebook account that manages your clients’ Pages. Every Page it can manage (and the Instagram linked to it) appears below.'}
            </p>
            {mine?.lastError && <p className="text-sm text-red-600 mt-1">{mine.lastError}</p>}
            {mine && mine.missingScopes.length > 0 && (
              <p className="text-sm text-amber-700 mt-1 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 shrink-0" /> Missing permissions: {mine.missingScopes.join(', ')}. Reconnect and allow everything.
              </p>
            )}
            {!configured && <p className="text-sm text-red-600 mt-1">Facebook isn’t set up on the server (META_APP_ID / META_APP_SECRET).</p>}
          </div>
          <button
            onClick={connect}
            disabled={connecting || !configured}
            className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl disabled:opacity-50 shrink-0 ${
              mine && mine.status !== 'error' ? 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50' : 'bg-[#1877F2] text-white hover:bg-[#166FE5]'
            }`}>
            {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : mine ? <RefreshCw className="w-4 h-4" /> : <Facebook className="w-4 h-4" />}
            {mine ? 'Reconnect / add Pages' : 'Connect Facebook'}
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 border-t border-zinc-100 divide-x divide-zinc-100">
          {[
            { label: 'Facebook Pages', value: counts.all },
            { label: 'Instagram accounts', value: instagram },
            { label: 'Linked to clients', value: counts.assigned },
            { label: 'Need a client', value: counts.unassigned, warn: counts.unassigned > 0 },
          ].map((s) => (
            <div key={s.label} className="px-6 py-4">
              <div className={`text-2xl font-semibold ${s.warn ? 'text-amber-600' : 'text-zinc-900'}`}>{s.value}</div>
              <div className="text-xs text-zinc-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Logins clients gave through their own link */}
      {connections.some((c) => c.via === 'client_link') && (
        <section className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
          <h3 className="font-semibold text-zinc-900">Clients’ own logins</h3>
          <p className="text-sm text-zinc-500 mt-1">Clients who connected through a link. Their Pages are listed below with the rest.</p>
          <ul className="mt-4 divide-y divide-zinc-100">
            {connections
              .filter((c) => c.via === 'client_link')
              .map((c) => (
                <li key={c.id} className="py-3 flex items-center gap-3 text-sm">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${c.status === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`} />
                  <span className="font-medium text-zinc-900">{c.clientName}</span>
                  <span className="text-zinc-500 truncate">
                    {c.userName} · {c.pages} Page{c.pages === 1 ? '' : 's'} · {day(c.connectedAt)}
                  </span>
                  {c.lastError && <span className="text-red-600 truncate">{c.lastError}</span>}
                </li>
              ))}
          </ul>
        </section>
      )}

      {/* Pages → clients */}
      <section className="bg-white rounded-2xl border border-zinc-200 shadow-sm">
        <div className="p-6 pb-4 flex flex-col md:flex-row md:items-center gap-4 border-b border-zinc-100">
          <div className="flex-1">
            <h3 className="font-semibold text-zinc-900">Pages &amp; Instagram accounts</h3>
            <p className="text-sm text-zinc-500 mt-1">Choose a client for each one. Followers, posts and comments are tracked for linked Pages only.</p>
          </div>
          <div className="relative md:w-64">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Pages or clients"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
          </div>
        </div>

        <div className="px-6 pt-4 flex gap-2 flex-wrap">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === t.id ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}>
              {t.label} <span className="opacity-60">{counts[t.id]}</span>
            </button>
          ))}
        </div>

        <ul className="p-3">
          {shown.length === 0 && (
            <li className="px-3 py-10 text-center text-sm text-zinc-500">
              {!pages.length ? 'No Pages yet. Connect Facebook above and allow access to your Pages.' : filter === 'unassigned' && !query ? 'Every Page is linked to a client. 🎉' : 'Nothing matches.'}
            </li>
          )}
          {shown.map((p) => (
            <li key={p.id} className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 px-3 py-3 rounded-xl hover:bg-zinc-50">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <PageAvatar id={p.id} name={p.pageName} />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <a href={`https://facebook.com/${p.id}`} target="_blank" rel="noopener noreferrer" className="font-medium text-zinc-900 hover:text-blue-600 truncate">
                      {p.pageName}
                    </a>
                    <ExternalLink className="w-3 h-3 text-zinc-300 shrink-0" />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5 flex-wrap">
                    <span className="inline-flex items-center gap-1"><Facebook className="w-3.5 h-3.5 text-[#1877F2]" /> Page</span>
                    {p.igUsername ? (
                      <a href={`https://instagram.com/${p.igUsername}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-pink-600">
                        <Instagram className="w-3.5 h-3.5 text-pink-500" /> @{p.igUsername}
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-zinc-400"><Instagram className="w-3.5 h-3.5" /> No Instagram linked</span>
                    )}
                    <span className="text-zinc-400">{p.source}</span>
                  </div>
                  {p.lastError && (
                    <div className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {p.lastError}</div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 md:w-80 shrink-0">
                <select
                  value={p.clientId ?? ''}
                  disabled={saving !== null}
                  onChange={(e) => void assign(p, e.target.value || null)}
                  className={`flex-1 min-w-0 text-sm rounded-xl border px-3 py-2 bg-white disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${
                    p.clientId ? 'border-zinc-200 text-zinc-900' : 'border-amber-300 text-amber-700'
                  }`}>
                  <option value="">— No client —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {saving === p.id ? (
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                ) : p.clientId ? (
                  <Link href={`/admin/clients/${p.clientId}?tab=social`} className="text-xs text-blue-600 hover:underline whitespace-nowrap">
                    Open
                  </Link>
                ) : (
                  <span className="w-[30px]" />
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
