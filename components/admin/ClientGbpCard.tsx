'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, ListChecks, Unplug, Link2, Copy, Check, AlertTriangle, Star } from 'lucide-react';
import { disconnectGbp, getGbpConnectUrl } from '@/app/actions/google-business';
import { LocationPickerModal } from './LocationPickerModal';
import type { GbpLocation } from '@/types/database';

interface Props {
  clientId: string;
  connection: { googleEmail: string; status: 'connected' | 'error'; lastError?: string; connectedAt: string } | null;
  locations: Array<GbpLocation & { id: string }>;
  notice?: 'connected' | 'error';
}

export function ClientGbpCard({ clientId, connection, locations, notice }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clientLink, setClientLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const monitored = locations.filter((l) => l.linked);
  // Right after connecting, open the picker straight away.
  const [pickerOpen, setPickerOpen] = useState(notice === 'connected' && Boolean(connection) && monitored.length === 0);

  async function run(key: string, fn: () => Promise<{ success: boolean; error?: string }>) {
    setBusy(key);
    setError(null);
    const result = await fn();
    if (!result.success) setError(result.error || 'Something went wrong.');
    setBusy(null);
    router.refresh();
  }

  async function handleConnect() {
    setBusy('connect');
    const result = await getGbpConnectUrl(clientId, 'admin');
    if (result.success && result.url) {
      window.location.href = result.url;
    } else {
      setError(result.error || 'Could not start Google sign-in.');
      setBusy(null);
    }
  }

  async function handleCreateClientLink() {
    setBusy('link');
    const result = await getGbpConnectUrl(clientId, 'client_link');
    if (result.success && result.url) setClientLink(result.url);
    else setError(result.error || 'Could not create link.');
    setBusy(null);
  }

  async function handleCopy() {
    if (!clientLink) return;
    await navigator.clipboard.writeText(clientLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDisconnect() {
    if (!confirm('Disconnect this Google Business Profile? Google access will be revoked and linked locations removed.')) return;
    run('disconnect', () => disconnectGbp(clientId));
  }


  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
      <div className="p-6 border-b border-zinc-100 bg-zinc-50/50 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-zinc-900 flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-400" />
            Google Business Profile
          </h3>
          {connection ? (
            <p className="text-sm text-zinc-500 mt-1">
              Connected as <span className="font-medium text-zinc-700">{connection.googleEmail}</span>
              {' · '}
              {monitored.length} location{monitored.length === 1 ? '' : 's'} monitored
            </p>
          ) : (
            <p className="text-sm text-zinc-500 mt-1">
              Connect the client&apos;s Google account to monitor reviews and draft replies. Replies always need your approval.
            </p>
          )}
        </div>

        {connection ? (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setPickerOpen(true)}
              disabled={busy !== null}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 text-zinc-700 text-sm font-medium rounded-xl hover:bg-zinc-50 transition-colors disabled:opacity-50"
            >
              <ListChecks className="w-4 h-4" />
              Choose locations
            </button>
            <button
              onClick={handleDisconnect}
              disabled={busy !== null}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 text-sm font-medium rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              <Unplug className="w-4 h-4" />
              Disconnect
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:items-end gap-2 shrink-0">
            <button
              onClick={handleConnect}
              disabled={busy !== null}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-all shadow-sm shadow-blue-500/20 disabled:opacity-50"
            >
              Connect now
            </button>
            <button
              onClick={handleCreateClientLink}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
            >
              <Link2 className="w-4 h-4" />
              Create link for client
            </button>
          </div>
        )}
      </div>

      {connection && monitored.length === 0 && !pickerOpen && (
        <div className="px-6 py-3 bg-amber-50 text-amber-800 text-sm border-b border-amber-100">
          No locations are monitored yet. Click <strong>Choose locations</strong> to pick this client&apos;s business.
        </div>
      )}
      {notice === 'error' && (
        <div className="px-6 py-3 bg-amber-50 text-amber-800 text-sm border-b border-amber-100">
          Google sign-in did not complete. Make sure the Business Profile permission is accepted, then try again.
        </div>
      )}
      {connection?.status === 'error' && (
        <div className="px-6 py-3 bg-red-50 text-red-700 text-sm border-b border-red-100 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{connection.lastError || 'The connection needs attention.'} </span>
        </div>
      )}
      {error && (
        <div className="px-6 py-3 bg-red-50 text-red-700 text-sm border-b border-red-100">{error}</div>
      )}

      {clientLink && (
        <div className="p-6 border-b border-zinc-100 space-y-2">
          <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Client authorization link (valid 7 days)</div>
          <div className="flex gap-2">
            <input
              readOnly
              value={clientLink}
              className="flex-1 min-w-0 text-sm font-mono bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-zinc-600"
              onFocus={(e) => e.currentTarget.select()}
            />
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="text-xs text-zinc-500">
            Send this to the business owner. They sign in with the Google account that manages their profile; it connects to this client automatically.
          </p>
        </div>
      )}

      {connection && monitored.length > 0 && (
        <ul className="divide-y divide-zinc-100">
          {monitored.map((location) => (
            <li key={location.id} className="px-6 py-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="font-medium text-zinc-900 truncate">{location.title}</div>
                {location.address && (
                  <div className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 shrink-0" />
                    {location.address}
                  </div>
                )}
              </div>
              <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full shrink-0">Monitoring reviews</span>
            </li>
          ))}
        </ul>
      )}

      {pickerOpen && connection && (
        <LocationPickerModal
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
