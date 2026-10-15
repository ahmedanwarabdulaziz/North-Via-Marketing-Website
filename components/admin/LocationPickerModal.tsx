'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapPin, X, Search, Loader2 } from 'lucide-react';
import { previewGbpLocations, saveGbpLocations } from '@/app/actions/google-business';

interface Choice {
  locationId: string;
  title: string;
  address: string;
  selected: boolean;
  takenBy: string | null;
}

/**
 * Lists every location the client's Google account can see. Nothing is saved
 * until "Save"; only ticked locations are monitored for this client.
 */
export function LocationPickerModal({ clientId, onClose, onSaved }: { clientId: string; onClose: () => void; onSaved: () => void }) {
  const [choices, setChoices] = useState<Choice[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    previewGbpLocations(clientId).then((result) => {
      if (cancelled) return;
      if (result.success && result.locations) {
        setChoices(result.locations);
        setPicked(new Set(result.locations.filter((l) => l.selected).map((l) => l.locationId)));
      } else {
        setError(result.error || 'Could not load locations from Google.');
        setChoices([]);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !saving && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (choices || []).filter((c) => !q || c.title.toLowerCase().includes(q) || c.address.toLowerCase().includes(q));
  }, [choices, query]);
  const selectable = visible.filter((c) => !c.takenBy);
  const allVisiblePicked = selectable.length > 0 && selectable.every((c) => picked.has(c.locationId));

  function toggle(id: string) {
    setPicked((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setPicked((s) => {
      const next = new Set(s);
      selectable.forEach((c) => (allVisiblePicked ? next.delete(c.locationId) : next.add(c.locationId)));
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setError(null);
    const result = await saveGbpLocations(clientId, Array.from(picked));
    setSaving(false);
    if (result.success) onSaved();
    else setError(result.error || 'Could not save.');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="location-picker-title">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-zinc-900/40 backdrop-blur-[1px] cursor-default" onClick={() => !saving && onClose()} />

      <div className="relative w-full sm:max-w-lg bg-white sm:rounded-2xl rounded-t-2xl shadow-xl flex flex-col max-h-[85vh]">
        <div className="p-5 border-b border-zinc-100 flex items-start justify-between gap-4">
          <div>
            <h2 id="location-picker-title" className="font-semibold text-zinc-900">Choose locations to monitor</h2>
            <p className="text-sm text-zinc-500 mt-0.5">Locations this Google account manages. Only ticked ones are added to this client.</p>
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

            {selectable.length > 1 && (
              <label className="px-5 pt-4 flex items-center gap-2 text-sm text-zinc-600 cursor-pointer">
                <input type="checkbox" checked={allVisiblePicked} onChange={toggleAllVisible} className="w-4 h-4 rounded border-zinc-300 text-blue-600" />
                Select all{query ? ' shown' : ''} ({selectable.length})
              </label>
            )}

            <ul className="flex-1 overflow-y-auto px-3 py-2">
              {visible.map((choice) => (
                <li key={choice.locationId}>
                  <label
                    className={`flex items-start gap-3 px-2 py-3 rounded-xl ${
                      choice.takenBy ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-zinc-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={picked.has(choice.locationId)}
                      disabled={Boolean(choice.takenBy)}
                      onChange={() => toggle(choice.locationId)}
                      className="w-4 h-4 mt-0.5 rounded border-zinc-300 text-blue-600 shrink-0"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-zinc-900">{choice.title}</span>
                      {choice.address && (
                        <span className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 shrink-0" /> {choice.address}
                        </span>
                      )}
                      {choice.takenBy && <span className="block text-xs text-amber-700 mt-0.5">Already monitored for {choice.takenBy}</span>}
                    </span>
                  </label>
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
          <span className="text-sm text-zinc-500">{picked.size} selected</span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2 text-sm font-medium text-zinc-600 rounded-lg hover:bg-zinc-100">
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving || choices === null}
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
