'use client';

import { useState } from 'react';
import { Globe, Plus, RefreshCw, Trash2, Lock } from 'lucide-react';
import { addClientWebsite, checkClientWebsites, removeClientWebsite, toggleClientWebsite } from '@/app/actions/websites';
import type { Website } from '@/types/database';

type Site = Website & { id: string };

const inputClass =
  'w-full text-sm bg-white border border-zinc-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500';
const labelClass = 'block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5';

function daysUntil(iso: string) {
  return Math.floor((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

function StatusBadge({ site }: { site: Site }) {
  if (!site.enabled) return <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500">Paused</span>;
  if (site.status === 'up') return <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Up</span>;
  if (site.status === 'down') return <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700">Down</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500">Not checked</span>;
}

export function WebsitesCard({ clientId, initial, suggestedUrl }: { clientId: string; initial: Site[]; suggestedUrl?: string }) {
  const [sites, setSites] = useState(initial);
  const [url, setUrl] = useState(initial.length ? '' : suggestedUrl || '');
  const [label, setLabel] = useState('');
  const [mustContain, setMustContain] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(key: string, action: () => Promise<{ success: boolean; websites?: Site[]; error?: string }>) {
    setBusy(key);
    setError(null);
    const result = await action();
    setBusy(null);
    if (result.success && result.websites) setSites(result.websites as Site[]);
    else setError(result.error || 'Something went wrong.');
    return result.success;
  }

  async function handleAdd() {
    const ok = await run('add', () => addClientWebsite({ clientId, url, label, mustContain }));
    if (ok) {
      setUrl('');
      setLabel('');
      setMustContain('');
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
      <div className="p-6 border-b border-zinc-100 bg-zinc-50/50 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h3 className="font-semibold text-zinc-900 flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-500" />
            Website checks
          </h3>
          <p className="text-sm text-zinc-500 mt-1">
            Checked every hour. Telegram alerts you when a page goes down, comes back, or its SSL certificate is about to expire.
          </p>
        </div>
        {sites.some((s) => s.enabled) && (
          <button
            type="button"
            onClick={() => run('check', () => checkClientWebsites(clientId))}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-zinc-200 text-zinc-700 text-sm font-medium rounded-lg hover:bg-zinc-50 disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${busy === 'check' ? 'animate-spin' : ''}`} />
            {busy === 'check' ? 'Checking…' : 'Check now'}
          </button>
        )}
      </div>

      <div className="p-6 space-y-5">
        {sites.length > 0 && (
          <ul className="divide-y divide-zinc-100 border border-zinc-200 rounded-xl">
            {sites.map((site) => (
              <li key={site.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-900">{site.label || 'Website'}</span>
                    <StatusBadge site={site} />
                  </div>
                  <a href={site.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline break-all">
                    {site.url}
                  </a>
                  <div className="text-xs text-zinc-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                    {site.status === 'down' && site.lastError && <span className="text-red-600">{site.lastError}</span>}
                    {site.status === 'up' && site.lastResponseMs !== undefined && <span>{(site.lastResponseMs / 1000).toFixed(1)}s response</span>}
                    {site.sslExpiresAt && (
                      <span className={`inline-flex items-center gap-1 ${daysUntil(site.sslExpiresAt) <= 14 ? 'text-amber-600' : ''}`}>
                        <Lock className="w-3 h-3" /> SSL {daysUntil(site.sslExpiresAt) < 0 ? 'expired' : `${daysUntil(site.sslExpiresAt)} days left`}
                      </span>
                    )}
                    {site.mustContain && <span>Must show “{site.mustContain}”</span>}
                    {site.lastCheckedAt && <span>Checked {new Date(site.lastCheckedAt).toLocaleString()}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <label className="flex items-center gap-1.5 text-xs text-zinc-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={site.enabled}
                      disabled={busy !== null}
                      onChange={(e) => run(`toggle-${site.id}`, () => toggleClientWebsite(clientId, site.id, e.target.checked))}
                      className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                    />
                    Monitor
                  </label>
                  <button
                    type="button"
                    title="Remove"
                    disabled={busy !== null}
                    onClick={() => {
                      if (confirm(`Stop checking ${site.url} and delete its history?`)) run(`remove-${site.id}`, () => removeClientWebsite(clientId, site.id));
                    }}
                    className="p-2 text-zinc-400 hover:text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-3">
          <div className="text-sm font-medium text-zinc-900">{sites.length ? 'Add another page' : 'Add the website'}</div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="ws-url">Address</label>
              <input id="ws-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/contact" className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="ws-label">Name</label>
              <input id="ws-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder={sites.length ? 'e.g. Contact page' : 'Homepage'} className={inputClass} maxLength={60} />
            </div>
          </div>
          <div>
            <label className={labelClass} htmlFor="ws-text">Text that must appear (optional)</label>
            <input
              id="ws-text"
              value={mustContain}
              onChange={(e) => setMustContain(e.target.value)}
              placeholder="e.g. Book a table: catches a broken page that still loads"
              className={inputClass}
              maxLength={120}
            />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <button
            type="button"
            onClick={handleAdd}
            disabled={busy !== null || !url.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {busy === 'add' ? 'Adding and checking…' : 'Add and check'}
          </button>
        </div>
      </div>
    </div>
  );
}
