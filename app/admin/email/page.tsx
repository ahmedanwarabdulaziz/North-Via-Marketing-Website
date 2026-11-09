import { Mail, Plus, CheckCircle2, AlertTriangle } from 'lucide-react';
import { inboxBusinessLinks, listEmailAccounts, type EmailAccount } from '@/lib/email/inbox';
import { listClientProfiles } from '@/lib/admin-ops';
import { InboxCard } from '@/components/admin/InboxCard';

export const dynamic = 'force-dynamic';

export default async function EmailPage({ searchParams }: { searchParams: Promise<{ connected?: string; error?: string }> }) {
  const params = await searchParams;
  let accounts: EmailAccount[] = [];
  let loadError: string | null = null;
  try {
    accounts = await listEmailAccounts();
  } catch (error) {
    loadError = error instanceof Error ? error.message : 'Could not load inboxes';
  }
  const [links, profiles] = await Promise.all([inboxBusinessLinks(), listClientProfiles().catch(() => [])]);
  const businesses = profiles.filter((c) => c.id && c.brandName).map((c) => ({ id: c.id!, name: c.brandName }));

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight flex items-center gap-3">
            <Mail className="w-8 h-8 text-zinc-400" />
            Email inboxes
          </h1>
          <p className="text-zinc-500 mt-2 max-w-2xl">
            Every 5 minutes Anwarz reads new mail, keeps the important ones and sends them to Telegram. Reply there with a voice note or
            text: the AI writes it professionally and nothing is sent until you tap ✅ Send.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <a
            href="/api/admin/email/connect"
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
          >
            <Plus className="w-4 h-4" /> Connect Gmail
          </a>
          <a
            href="/api/admin/email/connect-outlook"
            className="inline-flex items-center gap-2 rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-800"
          >
            <Plus className="w-4 h-4" /> Connect Outlook
          </a>
        </div>
      </div>

      {params.connected && (
        <p className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> Connected {params.connected}. Give it a name and focus rules below.
        </p>
      )}
      {params.error && (
        <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Not connected: {params.error}
        </p>
      )}
      {loadError && (
        <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {loadError.includes('email_accounts') ? 'The email tables are not set up in the database yet.' : loadError}
        </p>
      )}

      {!loadError && !accounts.length && (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center text-zinc-500">
          No inbox connected yet. Click <b>Connect Gmail</b> and pick an account; repeat for each inbox.
        </div>
      )}

      <div className="space-y-6">
        {accounts.map((a) => (
          <InboxCard
            key={a.id}
            account={{
              id: a.id,
              provider: a.provider,
              email: a.email,
              label: a.label || '',
              focus: a.focus || '',
              enabled: a.enabled,
              ringUrgent: a.ring_urgent,
              ignoredSenders: a.ignored_senders.join('\n'),
              lastCheckedAt: a.last_checked_at,
              lastError: a.last_error,
              businessId: links[a.id] || '',
            }}
            businesses={businesses}
          />
        ))}
      </div>
    </div>
  );
}
