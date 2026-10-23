'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Link2, Loader2, MapPin, RefreshCw, Search, X } from 'lucide-react';
import { getAgencyGbpConnectUrl, previewAgencyGbpLocations, saveAgencyGbpLinks } from '@/app/actions/google-business';

interface Props {
  connection: { googleEmail: string } | null;
  clients: Array<{ id: string; name: string }>;
  notice?: 'connected' | 'error';
}

/**
 * One Google login for every client: connect the account that manages the profiles once,
 * then pick which client each location belongs to.
 */
export function AgencyGbpCard({ connection, clients, notice }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Right after connecting, open the linking list straight away.
  const [linkOpen, setLinkOpen] = useState(notice === 'connected' && Boolean(connection));

  async function handleConnect() {
    setBusy(true);
    setError(null);
    const result = await getAgencyGbpConnectUrl();
    if (result.success && result.url) {
      window.location.href = result.url;
    } else {
      setError(result.error || 'Could not start Google sign-in.');
      setBusy(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
      <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-zinc-900">Google account</h3>
          {connection ? (
            <p className="text-sm text-zinc-500 mt-1">
              Connected as <span className="font-medium text-zinc-700">{connection.googleEmail}</span>. Link each location to its client.
            </p>
          ) : (
            <p className="text-sm text-zinc-500 mt-1">
              Connect the Google account that manages your clients&apos; Business Profiles once, then link each location to its client.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {connection && (
            <button
              onClick={() => setLinkOpen(true)}
              disabled={busy}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50"
            >
              <Link2 className="w-4 h-4" />
              Link locations
            </button>
          )}
          <button
            onClick={handleConnect}
            disabled={busy}
            className={
              connection
                ? 'inline-flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 text-zinc-700 text-sm font-medium rounded-xl hover:bg-zinc-50 disabled:opacity-50'
                : 'inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 shadow-sm shadow-blue-500/20 disabled:opacity-50'
            }
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : connection && <RefreshCw className="w-4 h-4" />}
            {connection ? 'Reconnect' : 'Connect Google account'}
          </button>
        </div>
      </div>

      {notice === 'error' && (
        <div className="px-5 py-3 bg-amber-50 text-amber-800 text-sm border-t border-amber-100">
          Google sign-in did not complete. Make sure the Business Profile permission is accepted, then try again.
        </div>
      )}
      {error && <div className="px-5 py-3 bg-red-50 text-red-700 text-sm border-t border-red-100">{error}</div>}

      {linkOpen && <LinkLocationsModal clients={clients} onClose={() => setLinkOpen(false)} />}
    </div>
  );
}

interface Choice {
  locationId: string;
  title: string;
  address: string;
  clientId: string | null;
}

function LinkLocationsModal({ clients, onClose }: { clients: Props['clients']; onClose: () => void }) {
  const router = useRouter();
  const [choices, setChoices] = useState<Choice[] | null>(null);
  const [links, setLinks] = useState<Record<string, string | null>>({});
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    previewAgencyGbpLocations().then((result) => {
      if (cancelled) return;
      if (result.success && result.locations) {
        setChoices(result.locations);
        setLinks(Object.fromEntries(result.locations.map((l) => [l.locationId, l.clientId])));
      } else {
        setError(result.error || 'Could not load locations from Google.');
        setChoices([]);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !saving && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (choices || []).filter((c) => !q || c.title.toLowerCase().includes(q) || c.address.toLowerCase().includes(q));
  }, [choices, query]);
  const changed = (choices || []).filter((c) => (links[c.locationId] ?? null) !== c.clientId);
  const linkedCount = Object.values(links).filter(Boolean).length;

  async function save() {
    setSaving(true);
    setError(null);
    const result = await saveAgencyGbpLinks(Object.fromEntries(changed.map((c) => [c.locationId, links[c.locationId] ?? null])));
    setSaving(false);
    if (result.success) {
      onClose();
      router.refresh();
    } else {
      setError(result.error || 'Could not save.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="link-locations-title">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-zinc-900/40 backdrop-blur-[1px] cursor-default" onClick={() => !saving && onClose()} />

      <div className="relative w-full sm:max-w-2xl bg-white sm:rounded-2xl rounded-t-2xl shadow-xl flex flex-col max-h-[85vh]">
        <div className="p-5 border-b border-zinc-100 flex items-start justify-between gap-4">
          <div>
            <h2 id="link-locations-title" className="font-semibold text-zinc-900">Link locations to clients</h2>
            <p className="text-sm text-zinc-500 mt-0.5">Pick the client for each location. Reviews are monitored only for linked locations.</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {choices === null ? (
          <div className="p-10 flex flex-col items-center gap-3 text-sm text-zinc-500">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            Loading locations from Google…
          </div>
        ) : (
          <>
            {choices.length > 6 && (
              <div className="px-5 pt-4">
                <div className="relative">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name or address"
                    className="w-full text-sm bg-white border border-zinc-200 rounded-lg pl-9 pr-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            <ul className="flex-1 overflow-y-auto px-3 py-2 divide-y divide-zinc-100">
              {visible.map((choice) => (
                <li key={choice.locationId} className="px-2 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-zinc-900">{choice.title}</div>
                    {choice.address && (
                      <div className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 shrink-0" /> {choice.address}
                      </div>
                    )}
                  </div>
                  <select
                    value={links[choice.locationId] ?? ''}
                    onChange={(e) => setLinks((l) => ({ ...l, [choice.locationId]: e.target.value || null }))}
                    aria-label={`Client for ${choice.title}`}
                    className={`w-full sm:w-56 shrink-0 text-sm border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                      links[choice.locationId] ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-50 border-zinc-200 text-zinc-500'
                    }`}
                  >
                    <option value="">Not monitored</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
              {choices.length > 0 && visible.length === 0 && <li className="px-2 py-6 text-sm text-zinc-500 text-center">No locations match “{query}”.</li>}
              {choices.length === 0 && !error && (
                <li className="px-2 py-8 text-sm text-zinc-500 text-center">This Google account doesn&apos;t manage any Business Profile locations.</li>
              )}
            </ul>
          </>
        )}

        {error && <div className="px-5 py-3 text-sm text-red-700 bg-red-50 border-t border-red-100">{error}</div>}

        <div className="p-4 border-t border-zinc-100 flex items-center justify-between gap-3">
          <span className="text-sm text-zinc-500">{linkedCount} linked</span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2 text-sm font-medium text-zinc-600 rounded-lg hover:bg-zinc-100">
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving || choices === null || changed.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
