'use client';

import { useEffect, useState } from 'react';
import { Send, CheckCircle2, AlertTriangle } from 'lucide-react';

export function TelegramBotCard() {
  const [status, setStatus] = useState<{ connected: boolean; webhook?: string; lastError?: string | null; error?: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch('/api/admin/telegram/setup');
    setStatus(await res.json().catch(() => ({ connected: false, error: 'Could not load status' })));
  }

  useEffect(() => {
    load();
  }, []);

  async function connect() {
    setBusy(true);
    const res = await fetch('/api/admin/telegram/setup', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) setStatus({ connected: false, error: data.error || 'Setup failed' });
    else await load();
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden mb-8">
      <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
            <Send className="w-5 h-5 text-sky-500" />
            Telegram review approvals
          </h2>
          <p className="text-sm text-zinc-500 mt-1">Daily review digest with Approve, Edit, Regenerate and Skip buttons.</p>
          {status?.connected && (
            <p className="text-sm text-emerald-700 mt-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Bot connected
              {status.lastError && <span className="text-amber-700"> · last error: {status.lastError}</span>}
            </p>
          )}
          {status && !status.connected && status.error && (
            <p className="text-sm text-amber-700 mt-2 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> {status.error}
            </p>
          )}
        </div>
        <button
          onClick={connect}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-sky-600 text-white text-sm font-medium rounded-xl hover:bg-sky-700 disabled:opacity-50 shrink-0"
        >
          {busy ? 'Connecting…' : status?.connected ? 'Reconnect bot' : 'Connect bot'}
        </button>
      </div>
    </div>
  );
}
