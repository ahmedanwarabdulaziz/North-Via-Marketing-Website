'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, ListChecks, X, AlertTriangle } from 'lucide-react';
import { previewAdsAccounts, saveAdsAccounts } from '@/app/actions/client-ads';

interface Account {
  customerId: string;
  name: string;
  currency: string;
  campaigns: string[];
}

type Choice = Account & { selected: boolean; takenBy?: string };

const formatId = (id: string) => id.replace(/^(\d{3})(\d{3})(\d{4})$/, '$1-$2-$3');

function AccountLines({ a }: { a: Account }) {
  return (
    <div className="min-w-0">
      <div className="text-sm font-medium text-zinc-900">{a.name}</div>
      <div className="text-xs font-mono text-zinc-500">ID {formatId(a.customerId)} · {a.currency}</div>
      {a.campaigns.length > 0 ? (
        <ul className="mt-1 space-y-0.5">
          {a.campaigns.map((c) => (
            <li key={c} className="text-xs text-zinc-600 truncate">• {c}</li>
          ))}
        </ul>
      ) : (
        <div className="mt-1 text-xs text-zinc-400">No campaigns</div>
      )}
    </div>
  );
}

function AccountPicker({ clientId, onClose, onSaved }: { clientId: string; onClose: () => void; onSaved: () => void }) {
  const [choices, setChoices] = useState<Choice[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    previewAdsAccounts(clientId).then((r) => {
      if (cancelled) return;
      if (r.success && r.accounts) {
        setChoices(r.accounts);
        setPicked(new Set(r.accounts.filter((a) => a.selected).map((a) => a.customerId)));
      } else setError(r.error || 'Could not load ad accounts.');
    });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  async function save() {
    setSaving(true);
    const r = await saveAdsAccounts(clientId, [...picked]);
    setSaving(false);
    if (r.success) onSaved();
    else setError(r.error || 'Could not save.');
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
          <h4 className="font-semibold text-zinc-900">Choose this client’s ad accounts</h4>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-700" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 overflow-y-auto flex-1 space-y-2">
          {error && <div className="text-sm text-red-600">{error}</div>}
          {!choices && !error && <div className="text-sm text-zinc-500">Loading ad accounts and their campaigns from Google…</div>}
          {choices?.length === 0 && <div className="text-sm text-zinc-500">This Google login can’t access any ad accounts.</div>}
          {choices?.map((c) => (
            <label
              key={c.customerId}
              className={`flex items-start gap-3 p-3 rounded-xl border ${c.takenBy ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-zinc-50'} ${picked.has(c.customerId) ? 'border-blue-500 bg-blue-50/50' : 'border-zinc-200'}`}
            >
              <input
                type="checkbox"
                className="mt-1 w-4 h-4 rounded border-zinc-300 text-blue-600"
                disabled={Boolean(c.takenBy)}
                checked={picked.has(c.customerId)}
                onChange={(e) => {
                  const next = new Set(picked);
                  if (e.target.checked) next.add(c.customerId);
                  else next.delete(c.customerId);
                  setPicked(next);
                }}
              />
              <div className="min-w-0 flex-1">
                <AccountLines a={c} />
                {c.takenBy && <div className="text-xs text-amber-700 mt-1">Linked to {c.takenBy}</div>}
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

export function ClientAdsCard({ clientId, connected, accounts, notice }: { clientId: string; connected: boolean; accounts: Account[]; notice?: 'connected' | 'error' }) {
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = useState(notice === 'connected');
  const connectHref = `/api/admin/google-ads/auth?client=${encodeURIComponent(clientId)}`;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
      <div className="p-6 border-b border-zinc-100 bg-zinc-50/50 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-zinc-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            Google Ads
          </h3>
          <p className="text-sm text-zinc-500 mt-1">
            {accounts.length
              ? `${accounts.length} ad account${accounts.length === 1 ? '' : 's'} linked · spend, clicks and conversions in Telegram and client reports.`
              : 'Link this client’s ad accounts to track spend, clicks and conversions.'}
          </p>
        </div>
        <div className="flex flex-col sm:items-end gap-2 shrink-0">
          {connected && (
            <button onClick={() => setPickerOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 text-zinc-700 text-sm font-medium rounded-xl hover:bg-zinc-50">
              <ListChecks className="w-4 h-4" /> Choose ad accounts
            </button>
          )}
          <a
            href={connectHref}
            className={connected ? 'text-sm text-blue-600 hover:text-blue-700 font-medium' : 'inline-flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700'}
          >
            {connected ? 'Reconnect Google Ads' : 'Connect Google Ads'}
          </a>
        </div>
      </div>

      {notice === 'error' && (
        <div className="px-6 py-3 bg-amber-50 text-amber-800 text-sm border-b border-amber-100 flex gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          Google sign-in did not complete. Allow access to Google Ads and try again.
        </div>
      )}

      {accounts.length > 0 && (
        <ul className="divide-y divide-zinc-100">
          {accounts.map((a) => (
            <li key={a.customerId} className="px-6 py-4">
              <AccountLines a={a} />
            </li>
          ))}
        </ul>
      )}

      {pickerOpen && connected && (
        <AccountPicker
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
