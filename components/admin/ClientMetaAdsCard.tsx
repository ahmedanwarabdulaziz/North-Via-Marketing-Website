'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Megaphone, ListChecks, X, AlertTriangle } from 'lucide-react';
import { previewMetaAdAccounts, saveMetaAdAccounts } from '@/app/actions/client-meta-ads';

interface Account {
  id: string;
  name: string;
  currency: string;
}

interface Ad {
  id: string;
  name: string;
  status: string;
  spend: number;
  reach: number;
  clicks: number;
  linkClicks: number;
}

interface Summary {
  currency: string;
  totals: { spend: number; reach: number; clicks: number; linkClicks: number };
  ads: Ad[];
}

type Choice = Account & { active: boolean; selected: boolean; takenBy?: string };

const money = (amount: number, currency: string) =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency, maximumFractionDigits: amount >= 100 ? 0 : 2 }).format(amount);
const count = (n: number) => n.toLocaleString('en-CA');
const statusLabel = (s: string) => (s ? s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, ' ') : '');

function AccountPicker({ clientId, clientNames, onClose, onSaved }: { clientId: string; clientNames: Record<string, string>; onClose: () => void; onSaved: () => void }) {
  const [choices, setChoices] = useState<Choice[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    previewMetaAdAccounts(clientId).then((r) => {
      if (cancelled) return;
      if (r.success && r.accounts) {
        setChoices(r.accounts);
        setPicked(new Set(r.accounts.filter((a) => a.selected).map((a) => a.id)));
      } else setError(r.error || 'Could not load ad accounts.');
    });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  async function save() {
    setSaving(true);
    const r = await saveMetaAdAccounts(clientId, [...picked]);
    setSaving(false);
    if (r.success) onSaved();
    else setError(r.error || 'Could not save.');
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
          <h4 className="font-semibold text-zinc-900">Choose this client’s Facebook ad accounts</h4>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-700" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 overflow-y-auto flex-1 space-y-2">
          {error && <div className="text-sm text-red-600">{error}</div>}
          {!choices && !error && <div className="text-sm text-zinc-500">Loading ad accounts from Facebook…</div>}
          {choices?.length === 0 && <div className="text-sm text-zinc-500">This Facebook login can’t access any ad accounts.</div>}
          {choices?.map((c) => (
            <label
              key={c.id}
              className={`flex items-start gap-3 p-3 rounded-xl border ${c.takenBy ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-zinc-50'} ${picked.has(c.id) ? 'border-blue-500 bg-blue-50/50' : 'border-zinc-200'}`}
            >
              <input
                type="checkbox"
                className="mt-1 w-4 h-4 rounded border-zinc-300 text-blue-600"
                disabled={Boolean(c.takenBy)}
                checked={picked.has(c.id)}
                onChange={(e) => {
                  const next = new Set(picked);
                  if (e.target.checked) next.add(c.id);
                  else next.delete(c.id);
                  setPicked(next);
                }}
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-zinc-900">{c.name}</div>
                <div className="text-xs font-mono text-zinc-500">ID {c.id} · {c.currency}{c.active ? '' : ' · not active'}</div>
                {c.takenBy && <div className="text-xs text-amber-700 mt-1">Linked to {clientNames[c.takenBy] || 'another client'}</div>}
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

export function ClientMetaAdsCard({
  clientId,
  connected,
  accounts,
  summary,
  error,
  clientNames,
}: {
  clientId: string;
  connected: boolean;
  accounts: Account[];
  summary: Summary | null;
  error?: string;
  clientNames: Record<string, string>;
}) {
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
      <div className="p-6 border-b border-zinc-100 bg-zinc-50/50 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-zinc-900 flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-blue-600" />
            Facebook Ads
          </h3>
          <p className="text-sm text-zinc-500 mt-1">
            {accounts.length
              ? `${accounts.map((a) => a.name).join(', ')} · last 7 days. Clicks also go to Telegram.`
              : 'Link this client’s Facebook ad account to see each ad’s reach, clicks and spend.'}
          </p>
        </div>
        {connected && (
          <button onClick={() => setPickerOpen(true)} className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 text-zinc-700 text-sm font-medium rounded-xl hover:bg-zinc-50">
            <ListChecks className="w-4 h-4" /> Choose ad accounts
          </button>
        )}
      </div>

      {!connected && (
        <div className="px-6 py-3 bg-amber-50 text-amber-800 text-sm border-b border-amber-100 flex gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          Facebook isn’t connected with ad access yet. Open the Social tab, click “Reconnect my Facebook” and allow the ad account.
        </div>
      )}

      {error && (
        <div className="px-6 py-3 bg-amber-50 text-amber-800 text-sm border-b border-amber-100 flex gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {summary && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-zinc-100 border-b border-zinc-100">
            {[
              ['Reach', count(summary.totals.reach)],
              ['Clicks', count(summary.totals.clicks)],
              ['Link clicks', count(summary.totals.linkClicks)],
              ['Spend', money(summary.totals.spend, summary.currency)],
            ].map(([label, value]) => (
              <div key={label} className="bg-white px-6 py-4">
                <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</div>
                <div className="text-xl font-semibold text-zinc-900 mt-1">{value}</div>
              </div>
            ))}
          </div>
          {summary.ads.length ? (
            <ul className="divide-y divide-zinc-100">
              {summary.ads.map((ad) => (
                <li key={ad.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-zinc-900 truncate">{ad.name}</div>
                    {ad.status && <div className={`text-xs ${ad.status === 'ACTIVE' ? 'text-emerald-600' : 'text-zinc-500'}`}>{statusLabel(ad.status)}</div>}
                  </div>
                  <div className="text-sm text-zinc-600 shrink-0">
                    {count(ad.reach)} reach · <span className="font-medium text-zinc-900">{count(ad.clicks)} clicks</span> · {money(ad.spend, summary.currency)}
                    {ad.clicks > 0 && <span className="text-zinc-400"> · {money(ad.spend / ad.clicks, summary.currency)}/click</span>}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-6 py-4 text-sm text-zinc-500">No ads ran in the last 7 days.</div>
          )}
        </>
      )}

      {pickerOpen && (
        <AccountPicker
          clientId={clientId}
          clientNames={clientNames}
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
