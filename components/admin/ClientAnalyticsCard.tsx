'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LineChart, MousePointerClick, AlertTriangle } from 'lucide-react';
import { loadGaProperties, removeClarity, saveClarity, saveGaProperty } from '@/app/actions/analytics';

interface GaStats {
  visitors: number;
  visitorsBefore: number;
  sessions: number;
  engagementRate: number;
  keyEvents: number | null; // null when below the threshold worth showing
  topSource?: string;
}

interface ClarityStats {
  day: string;
  sessions?: number;
  scrollDepth?: number;
  rageClickPct?: number;
  deadClickPct?: number;
}

interface Props {
  clientId: string;
  gaConnected: boolean;
  propertyId?: string;
  gaStats: GaStats | null;
  gaError?: string;
  clarityConnected: boolean;
  clarityLatest: ClarityStats | null;
  notice?: 'connected' | 'error';
}

const fmt = (n: number) => n.toLocaleString('en-CA');
const pct = (cur: number, prev: number) => (prev ? Math.round(((cur - prev) / prev) * 100) : null);

function Box({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 p-3">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="text-lg font-semibold text-zinc-900">{value}</div>
      {sub && <div className="text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}

export function ClientAnalyticsCard({ clientId, gaConnected, propertyId, gaStats, gaError, clarityConnected, clarityLatest, notice }: Props) {
  const router = useRouter();
  const [properties, setProperties] = useState<Array<{ propertyId: string; name: string; account: string }> | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState('');

  async function openPicker() {
    setChoosing(true);
    if (properties) return;
    setBusy('load');
    const r = await loadGaProperties();
    setBusy(null);
    if (r.success && r.properties) setProperties(r.properties);
    else setError(r.error || 'Could not load GA4 properties.');
  }
  // Right after connecting, open the property list straight away.
  useEffect(() => {
    if (notice === 'connected' && !propertyId) void openPicker();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function pick(id: string | null) {
    setBusy('save');
    const r = await saveGaProperty(clientId, id);
    setBusy(null);
    if (!r.success) return setError(r.error || 'Could not save.');
    setChoosing(false);
    router.refresh();
  }

  async function connectClarity() {
    setBusy('clarity');
    setError(null);
    const r = await saveClarity(clientId, token);
    setBusy(null);
    if (!r.success) return setError(r.error || 'Could not connect Clarity.');
    setToken('');
    router.refresh();
  }

  const change = gaStats ? pct(gaStats.visitors, gaStats.visitorsBefore) : null;

  return (
    <>
      {/* ---------- GA4 ---------- */}
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
        <div className="p-6 border-b border-zinc-100 bg-zinc-50/50 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-zinc-900 flex items-center gap-2">
              <LineChart className="w-5 h-5 text-orange-500" />
              Google Analytics (GA4)
            </h3>
            <p className="text-sm text-zinc-500 mt-1">
              {propertyId ? `Property ${propertyId} · updated daily at 10 AM Cairo · visitors, sources, top pages and key events in reports.` : 'Website visitors, where they come from, top pages and key events.'}
            </p>
          </div>
          <div className="flex flex-col sm:items-end gap-2 shrink-0">
            {gaConnected && (
              <button onClick={openPicker} disabled={busy !== null} className="px-4 py-2 bg-white border border-zinc-200 text-zinc-700 text-sm font-medium rounded-xl hover:bg-zinc-50 disabled:opacity-50">
                {propertyId ? 'Change property' : 'Choose property'}
              </button>
            )}
            <a
              href={`/api/admin/google-analytics/auth?client=${encodeURIComponent(clientId)}`}
              className={gaConnected ? 'text-sm text-blue-600 hover:text-blue-700 font-medium' : 'inline-flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700'}
            >
              {gaConnected ? 'Reconnect Google Analytics' : 'Connect Google Analytics'}
            </a>
          </div>
        </div>

        {notice === 'error' && (
          <div className="px-6 py-3 bg-amber-50 text-amber-800 text-sm border-b border-amber-100">Google sign-in did not complete. Allow access to Analytics and try again.</div>
        )}
        {(error || gaError) && (
          <div className="px-6 py-3 bg-red-50 text-red-700 text-sm border-b border-red-100 flex gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {error || gaError}
          </div>
        )}

        {choosing && gaConnected && (
          <div className="p-6 border-b border-zinc-100 space-y-2">
            <div className="text-sm font-medium text-zinc-900">Which GA4 property is this client’s website?</div>
            {!properties && !error && <div className="text-sm text-zinc-500">Loading properties…</div>}
            {properties?.length === 0 && <div className="text-sm text-zinc-500">This Google login can’t see any GA4 properties.</div>}
            <div className="max-h-72 overflow-y-auto space-y-1">
              {properties?.map((p) => (
                <button
                  key={p.propertyId}
                  onClick={() => pick(p.propertyId)}
                  disabled={busy !== null}
                  className={`w-full text-start p-3 rounded-xl border ${p.propertyId === propertyId ? 'border-blue-500 bg-blue-50/50' : 'border-zinc-200 hover:bg-zinc-50'}`}
                >
                  <div className="text-sm font-medium text-zinc-900">{p.name}</div>
                  <div className="text-xs text-zinc-500 font-mono">ID {p.propertyId}{p.account ? ` · ${p.account}` : ''}</div>
                </button>
              ))}
            </div>
            <div className="flex gap-3 pt-1">
              {propertyId && (
                <button onClick={() => pick(null)} className="text-sm text-red-600 hover:underline" disabled={busy !== null}>Unlink property</button>
              )}
              <button onClick={() => setChoosing(false)} className="text-sm text-zinc-600 hover:underline">Close</button>
            </div>
          </div>
        )}

        {gaStats && (
          <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Box label="Visitors (7 days)" value={fmt(gaStats.visitors)} sub={change === null ? undefined : `${change >= 0 ? '▲' : '▼'} ${Math.abs(change)}% vs week before`} />
            <Box label="Sessions" value={fmt(gaStats.sessions)} />
            <Box label="Engagement rate" value={`${gaStats.engagementRate}%`} />
            {gaStats.keyEvents !== null ? <Box label="Key events" value={fmt(gaStats.keyEvents)} /> : gaStats.topSource ? <Box label="Top source" value={gaStats.topSource} /> : null}
          </div>
        )}
      </div>

      {/* ---------- Clarity ---------- */}
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
        <div className="p-6 border-b border-zinc-100 bg-zinc-50/50 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-zinc-900 flex items-center gap-2">
              <MousePointerClick className="w-5 h-5 text-sky-600" />
              Microsoft Clarity
            </h3>
            <p className="text-sm text-zinc-500 mt-1">
              How visitors behave: scroll depth, rage and dead clicks, quick-backs, script errors. Saved daily; Telegram alerts you when frustration signals spike.
            </p>
          </div>
          {clarityConnected && (
            <button
              onClick={async () => {
                if (!confirm('Disconnect Clarity for this client? Saved daily numbers are kept.')) return;
                await removeClarity(clientId);
                router.refresh();
              }}
              className="shrink-0 px-4 py-2 bg-red-50 text-red-600 text-sm font-medium rounded-xl hover:bg-red-100"
            >
              Disconnect
            </button>
          )}
        </div>

        {clarityConnected ? (
          <div className="p-6">
            {clarityLatest ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Box label="Sessions (24 h)" value={clarityLatest.sessions !== undefined ? fmt(clarityLatest.sessions) : '—'} />
                  <Box label="Scroll depth" value={clarityLatest.scrollDepth !== undefined ? `${Math.round(clarityLatest.scrollDepth)}%` : '—'} />
                  <Box label="Rage clicks" value={clarityLatest.rageClickPct !== undefined ? `${clarityLatest.rageClickPct.toFixed(1)}%` : '—'} sub="of sessions" />
                  <Box label="Dead clicks" value={clarityLatest.deadClickPct !== undefined ? `${clarityLatest.deadClickPct.toFixed(1)}%` : '—'} sub="of sessions" />
                </div>
                <p className="mt-3 text-xs text-zinc-500">Last saved {clarityLatest.day}. A new snapshot is saved every day at 10 AM Cairo.</p>
              </>
            ) : (
              <p className="text-sm text-zinc-500">Connected. The next daily snapshot is saved at 10 AM Cairo.</p>
            )}
          </div>
        ) : (
          <div className="p-6 space-y-3">
            <ol className="text-sm text-zinc-600 list-decimal ms-5 space-y-1">
              <li>Open the client’s project at <a href="https://clarity.microsoft.com/projects" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">clarity.microsoft.com</a> (you must be its admin).</li>
              <li>Go to <b>Settings → Data Export → Generate new API token</b>, name it <code>NorthVia</code>, and copy it.</li>
              <li>Paste it below.</li>
            </ol>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Clarity API token"
                className="flex-1 text-sm font-mono bg-white border border-zinc-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <button onClick={connectClarity} disabled={busy !== null || !token.trim()} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {busy === 'clarity' ? 'Checking…' : 'Connect'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
