import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminShell } from '@/components/admin/AdminShell';
import { Users } from 'lucide-react';

export default function LeadsPage() {
  return (
    <AdminShell>
      <AdminHeader title="Customer Leads Tracker" />
      <div className="p-8 max-w-6xl mx-auto w-full flex flex-col items-center justify-center py-24 text-center">
        <div className="bg-neutral-100 dark:bg-zinc-800/50 p-6 rounded-3xl mb-6">
            <Users className="w-12 h-12 text-neutral-400 dark:text-neutral-500" strokeWidth={1.5} />
        </div>
        <h2 className="text-2xl font-semibold mb-2">Lead Tracking</h2>
        <p className="text-neutral-500 dark:text-neutral-400 max-w-md">
          Contact form submissions will be aggregated and tracked here automatically upon completion of Phase 4.
        </p>
      </div>
    </AdminShell>
  );
}
