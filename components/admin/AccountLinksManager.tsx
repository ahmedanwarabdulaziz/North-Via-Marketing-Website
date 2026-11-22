'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, BarChart3, CheckCircle2, Facebook, LineChart, Loader2, Lock, MapPin, RefreshCw, Search, X, type LucideIcon } from 'lucide-react';
import { assignAccount, getHubGbpConnectUrl, refreshAccountLists } from '@/app/actions/account-links';
import type { AccountLinksData, LinkItem, LinkKind, LinkSection } from '@/lib/account-links';

interface Props extends AccountLinksData {
  initialTab?: LinkKind;
  notice?: 'connected' | 'error';
}

type Filter = 'unassigned' | 'assigned' | 'all';

const META: Record<LinkKind, { icon: LucideIcon; color: string; noun: string; what: string; login: string }> = {
  gbp: { icon: MapPin, color: 'bg-emerald-600', noun: 'location', what: 'Reviews are checked and answered for linked locations.', login: 'Google account (Business Profile)' },
  google_ads: { icon: BarChart3, color: 'bg-amber-500', noun: 'account', what: 'Spend, clicks and the hourly ads watch use linked accounts.', login: 'Google Ads login' },
  meta_ads: { icon: Facebook, color: 'bg-[#1877F2]', noun: 'ad account', what: 'Facebook Ads numbers and alerts use linked ad accounts.', login: 'Facebook login with ad access' },
  ga4: { icon: LineChart, color: 'bg-orange-500', noun: 'property', what: 'Visitors and behaviour on the client page come from the linked property. One per client.', login: 'Google Analytics login' },
  search_console: { icon: Search, color: 'bg-sky-600', noun: 'site', what: 'Google search clicks and keywords come from the linked site. One per client.', login: 'Google Analytics / Search Console login' },
};

function connectAction(kind: LinkKind): { href?: string; label: string } {
  if (kind === 'google_ads') return { href: '/api/admin/google-ads/auth?client=_hub', label: 'Google Ads' };
  if (kind === 'ga4' || kind === 'search_console') return { href: '/api/admin/google-analytics/auth?client=_hub', label: 'Google Analytics & Search Console' };
  if (kind === 'meta_ads') return { href: '/admin/social', label: 'Facebook' };
  return { label: 'Google Business' };
}

export function AccountLinksManager({ sections, clients, initialTab, notice }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<LinkKind>(initialTab && sections.some((s) => s.kind === initialTab) ? initialTab : (sections.find((s) => s.items.some((i) => !i.clientId && !i.locked))?.kind ?? 'gbp'));
  const [filters, setFilters] = useState<Partial<Record<LinkKind, Filter>>>({});
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [busy, setBusy] = useState<'connect' | 'refresh' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showNotice, setShowNotice] = useState(Boolean(notice));

  const clientName = useMemo(() => new Map(clients.map((c) => [c.id, c.name])), [clients]);
  const section = sections.find((s) => s.kind === tab)!;
  const meta = META[tab];
  const free = (s: LinkSection) => s.items.filter((i) => !i.clientId && !i.locked).length;
  const counts = { unassigned: free(section), assigned: section.items.filter((i) => i.clientId).length, all: section.items.length };
  const filter: Filter = filters[tab] ?? (counts.unassigned ? 'unassigned' : 'all');
  const q = query.trim().toLowerCase();
  const shown = section.items.filter((i) => {
    if (filter === 'unassigned' && (i.clientId || i.locked)) return false;
    if (filter === 'assigned' && !i.clientId) return false;
    return !q || [i.name, i.detail, i.clientId ? clientName.get(i.clientId) : ''].some((v) => v?.toLowerCase().includes(q));
  });

  async function connect() {
    const action = connectAction(tab);
    if (action.href) return void (window.location.href = action.href);
    setBusy('connect');
    const r = await getHubGbpConnectUrl();
    if (r.success && r.url) window.location.href = r.url;
    else {
      setBusy(null);
      setError('Could not start the Google login.');
    }
  }

  async function refresh() {
    setBusy('refresh');
    setError(null);
    const r = await refreshAccountLists();
    if (!r.success) setError(r.error || 'Could not refresh.');
    router.refresh();
    setBusy(null);
  }

  async function assign(item: LinkItem, clientId: string | null) {
    if (clientId === item.clientId) return;
    const lines: string[] = [];
    if (item.clientId && clientId) lines.push(`Move ${item.name} from ${clientName.get(item.clientId) ?? 'its client'} to ${clientName.get(clientId)}?`);
    if (clientId && section.onePerClient) {
      const current = section.items.find((i) => i.clientId === clientId && i.id !== item.id);
      if (current) lines.push(`${clientName.get(clientId)} already uses ${current.name}; it will be replaced.`);
    }
    if (lines.length && !confirm(lines.join('\n\n'))) return;
    setSaving(item.id);
    setError(null);
    const r = await assignAccount(tab, item.id, clientId);
    if (!r.success) setError(r.error || 'Could not save.');
    router.refresh();
    setSaving(null);
  }

  const action = connectAction(tab);
  const Icon = meta.icon;

  return (
    <div className="space-y-6">
      {showNotice && (
        <div className={`flex items-start gap-3 rounded-2xl border p-4 text-sm ${notice === 'connected' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {notice === 'connected' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
          <div className="flex-1">{notice === 'connected' ? 'Connected. Now choose a client for each one below.' : 'The Google login didn’t finish. Try again and allow every permission.'}</div>
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

      {/* One tab per kind of account, with how many still need a client */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {sections.map((s) => {
          const M = META[s.kind];
          const SIcon = M.icon;
          const waiting = free(s);
          const on = s.kind === tab;
          return (
            <button
              key={s.kind}
              onClick={() => { setTab(s.kind); setQuery(''); }}
              className={`text-left rounded-2xl border p-4 transition-all ${on ? 'border-blue-500 bg-white shadow-sm ring-2 ring-blue-500/20' : 'border-zinc-200 bg-white hover:border-zinc-300'}`}>
              <div className="flex items-center gap-2">
                <span className={`w-8 h-8 rounded-lg ${M.color} text-white flex items-center justify-center shrink-0`}><SIcon className="w-4 h-4" /></span>
                <span className={`w-2 h-2 rounded-full ml-auto ${!s.connected ? 'bg-zinc-300' : s.error ? 'bg-red-500' : 'bg-emerald-500'}`} />
              </div>
              <div className="font-medium text-zinc-900 text-sm mt-3 leading-tight">{s.title}</div>
              <div className="text-xs mt-1 text-zinc-500">
                {!s.connected ? 'Not connected' : `${s.items.length} · `}
                {s.connected && (waiting ? <span className="text-amber-600 font-medium">{waiting} need a client</span> : <span className="text-emerald-600">all linked</span>)}
              </div>
            </button>
          );
        })}
      </div>

      <section className="bg-white rounded-2xl border border-zinc-200 shadow-sm">
        {/* The login this list comes from */}
        <div className="p-6 flex flex-col md:flex-row md:items-center gap-4 border-b border-zinc-100">
          <div className={`w-12 h-12 rounded-2xl ${meta.color} text-white flex items-center justify-center shrink-0`}><Icon className="w-6 h-6" /></div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold text-zinc-900">{section.title}</h2>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${!section.connected ? 'bg-zinc-100 text-zinc-600' : section.error ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                {!section.connected ? 'Not connected' : section.error ? 'Needs attention' : 'Connected'}
              </span>
            </div>
            <p className="text-sm text-zinc-500 mt-1">
              {section.connected ? `${section.account ? `${section.account} · ` : ''}${meta.what}` : `Connect the ${meta.login} to list everything it can reach. ${meta.what}`}
            </p>
            {section.error && <p className="text-sm text-red-600 mt-1">{section.error}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {(tab === 'google_ads' || tab === 'meta_ads') && section.connected && (
              <button onClick={refresh} disabled={busy !== null} className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-50 disabled:opacity-50">
                {busy === 'refresh' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Refresh list
              </button>
            )}
            {tab === 'meta_ads' ? (
              <Link href="/admin/social" className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl ${section.connected ? 'border border-zinc-200 text-zinc-700 hover:bg-zinc-50' : 'bg-[#1877F2] text-white hover:bg-[#166FE5]'}`}>
                <Facebook className="w-4 h-4" /> {section.connected ? 'Facebook login' : 'Connect Facebook'}
              </Link>
            ) : (
              <button
                onClick={connect}
                disabled={busy !== null}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl disabled:opacity-50 ${section.connected && !section.error ? 'border border-zinc-200 text-zinc-700 hover:bg-zinc-50' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                {busy === 'connect' && <Loader2 className="w-4 h-4 animate-spin" />}
                {section.connected ? `Reconnect ${action.label}` : `Connect ${action.label}`}
              </button>
            )}
          </div>
        </div>

        <div className="px-6 pt-4 flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex gap-2 flex-wrap flex-1">
            {([['unassigned', 'Needs a client'], ['assigned', 'Linked'], ['all', 'All']] as const).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setFilters((f) => ({ ...f, [tab]: id }))}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === id ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}>
                {label} <span className="opacity-60">{counts[id]}</span>
              </button>
            ))}
          </div>
          <div className="relative md:w-64">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${meta.noun}s or clients`} className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
          </div>
        </div>

        <ul className="p-3">
          {shown.length === 0 && (
            <li className="px-3 py-10 text-center text-sm text-zinc-500">
              {!section.connected ? `Connect the ${meta.login} above to see its ${meta.noun}s.` : !section.items.length ? `No ${meta.noun}s found on this login.` : filter === 'unassigned' && !q ? `Every ${meta.noun} is linked to a client. 🎉` : 'Nothing matches.'}
            </li>
          )}
          {shown.map((item) => (
            <li key={item.id} className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 px-3 py-3 rounded-xl hover:bg-zinc-50">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-zinc-900 truncate">{item.name}</div>
                <div className="text-xs text-zinc-500 mt-0.5 truncate">{item.detail}</div>
                {item.locked && <div className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1"><Lock className="w-3 h-3" /> {item.locked}</div>}
              </div>
              <div className="flex items-center gap-2 md:w-80 shrink-0">
                <select
                  value={item.clientId ?? ''}
                  disabled={saving !== null || Boolean(item.locked)}
                  onChange={(e) => void assign(item, e.target.value || null)}
                  className={`flex-1 min-w-0 text-sm rounded-xl border px-3 py-2 bg-white disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${item.clientId ? 'border-zinc-200 text-zinc-900' : 'border-amber-300 text-amber-700'}`}>
                  <option value="">— No client —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {saving === item.id ? (
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                ) : item.clientId ? (
                  <Link href={`/admin/clients/${item.clientId}`} className="text-xs text-blue-600 hover:underline whitespace-nowrap">Open</Link>
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
