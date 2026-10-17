'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, AlertTriangle } from 'lucide-react';
import { loadSearchSites, saveSearchSite } from '@/app/actions/analytics';

interface Summary {
  start: string;
  end: string;
  clicks: number;
  clicksBefore: number;
  impressions: number;
  position: number;
  topQueries: Array<{ query: string; clicks: number; position: number }>;
}

interface Props {
  clientId: string;
  connected: boolean; // the shared GA4 / Search Console Google login exists
  hasScope: boolean; // it includes Search Console access
  siteUrl?: string;
  summary: Summary | null;
  error?: string;
}

const fmt = (n: number) => n.toLocaleString('en-CA');
const label = (site: string) => (site.startsWith('sc-domain:') ? `${site.slice(10)} (whole domain)` : site);

export function ClientSearchCard({ clientId, connected, hasScope, siteUrl, summary, error }: Props) {
  const router = useRouter();
  const [sites, setSites] = useState<Array<{ siteUrl: string; permission: string }> | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function openPicker() {
    setChoosing(true);
    if (sites) return;
    setBusy(true);
    const r = await loadSearchSites();
    setBusy(false);
    if (r.success && r.sites) setSites(r.sites);
    else setProblem(r.error || 'Could not load Search Console sites.');
  }

  async function pick(site: string | null) {
    setBusy(true);
    const r = await saveSearchSite(clientId, site);
    setBusy(false);
    if (!r.success) return setProblem(r.error || 'Could not save.');
    setChoosing(false);
    router.refresh();
  }

  const reconnect = `/api/admin/google-analytics/auth?client=${encodeURIComponent(clientId)}`;
  const change = summary && summary.clicksBefore ? Math.round(((summary.clicks - summary.clicksBefore) / summary.clicksBefore) * 100) : null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
      <div className="p-6 border-b border-zinc-100 bg-zinc-50/50 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-zinc-900 flex items-center gap-2">
            <Search className="w-5 h-5 text-emerald-600" />
            Google Search Console
          </h3>
          <p className="text-sm text-zinc-500 mt-1">
            {siteUrl
              ? `${label(siteUrl)} · free Google search clicks, queries and position · updated daily at 10 AM Cairo (data runs ~3 days behind).`
              : 'How the site does in normal Google results: clicks, top searches and average position.'}
          </p>
        </div>
        <div className="flex flex-col sm:items-end gap-2 shrink-0">
          {connected && hasScope && (
            <button onClick={openPicker} disabled={busy} className="px-4 py-2 bg-white border border-zinc-200 text-zinc-700 text-sm font-medium rounded-xl hover:bg-zinc-50 disabled:opacity-50">
              {siteUrl ? 'Change site' : 'Choose site'}
            </button>
          )}
          {(!connected || !hasScope) && (
            <a href={reconnect} className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700">
              {connected ? 'Allow Search Console access' : 'Connect Google'}
            </a>
          )}
        </div>
      </div>

      {connected && !hasScope && (
        <div className="px-6 py-3 bg-amber-50 text-amber-800 text-sm border-b border-amber-100">
          Your Google login was connected before Search Console was added. Click <b>Allow Search Console access</b> once to approve it.
        </div>
      )}
      {(problem || error) && (
        <div className="px-6 py-3 bg-red-50 text-red-700 text-sm border-b border-red-100 flex gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {problem || error}
        </div>
      )}

      {choosing && (
        <div className="p-6 border-b border-zinc-100 space-y-2">
          <div className="text-sm font-medium text-zinc-900">Which Search Console site is this client’s?</div>
          {!sites && !problem && <div className="text-sm text-zinc-500">Loading sites…</div>}
          {sites?.length === 0 && <div className="text-sm text-zinc-500">This Google login has no Search Console sites. Add it as a user on the client’s property first.</div>}
          <div className="max-h-72 overflow-y-auto space-y-1">
            {sites?.map((s) => (
              <button
                key={s.siteUrl}
                onClick={() => pick(s.siteUrl)}
                disabled={busy}
                className={`w-full text-start p-3 rounded-xl border ${s.siteUrl === siteUrl ? 'border-blue-500 bg-blue-50/50' : 'border-zinc-200 hover:bg-zinc-50'}`}
              >
                <div className="text-sm font-medium text-zinc-900 break-all">{label(s.siteUrl)}</div>
                <div className="text-xs text-zinc-500">{s.permission.replace('site', '').replace(/([A-Z])/g, ' $1').trim()}</div>
              </button>
            ))}
          </div>
          <div className="flex gap-3 pt-1">
            {siteUrl && <button onClick={() => pick(null)} className="text-sm text-red-600 hover:underline" disabled={busy}>Unlink site</button>}
            <button onClick={() => setChoosing(false)} className="text-sm text-zinc-600 hover:underline">Close</button>
          </div>
        </div>
      )}

      {summary && (
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-zinc-200 p-3">
              <div className="text-xs text-zinc-500">Google clicks (7 days)</div>
              <div className="text-lg font-semibold text-zinc-900">{fmt(summary.clicks)}</div>
              {change !== null && <div className="text-xs text-zinc-500">{change >= 0 ? '▲' : '▼'} {Math.abs(change)}% vs week before</div>}
            </div>
            <div className="rounded-xl border border-zinc-200 p-3">
              <div className="text-xs text-zinc-500">Impressions</div>
              <div className="text-lg font-semibold text-zinc-900">{fmt(summary.impressions)}</div>
            </div>
            <div className="rounded-xl border border-zinc-200 p-3">
              <div className="text-xs text-zinc-500">Avg. position</div>
              <div className="text-lg font-semibold text-zinc-900">{summary.position || '—'}</div>
            </div>
          </div>
          {summary.topQueries.length > 0 && (
            <div>
              <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Top searches</div>
              <ol className="space-y-1 text-sm">
                {summary.topQueries.map((q, i) => (
                  <li key={q.query} className="flex justify-between gap-3">
                    <span className="truncate text-zinc-800">{i + 1}. {q.query}</span>
                    <span className="shrink-0 text-zinc-500 tabular-nums">{q.clicks} clicks · pos {q.position}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          <p className="text-xs text-zinc-400">{summary.start} – {summary.end}</p>
        </div>
      )}
    </div>
  );
}
