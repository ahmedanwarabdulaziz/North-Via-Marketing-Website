import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminShell } from '@/components/admin/AdminShell';
import { Mail } from 'lucide-react';

export default function EmailsPage() {
  return (
    <AdminShell>
      <AdminHeader title="Email Delivery Logs" />
      <div className="p-8 max-w-6xl mx-auto w-full flex flex-col items-center justify-center py-24 text-center">
        <div className="bg-neutral-100 dark:bg-zinc-800/50 p-6 rounded-3xl mb-6">
            <Mail className="w-12 h-12 text-neutral-400 dark:text-neutral-500" strokeWidth={1.5} />
        </div>
        <h2 className="text-2xl font-semibold mb-2">Email Outbox</h2>
        <p className="text-neutral-500 dark:text-neutral-400 max-w-md">
          A full log of outgoing system emails and validation statuses will appear here after Phase 3 database setup.
        </p>
      </div>
    </AdminShell>
  );
}
