import { CheckCircle2, ShieldCheck, Activity, Key } from 'lucide-react';
import { AdminShell } from '@/components/admin/AdminShell';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminStatCard } from '@/components/admin/AdminStatCard';

export default function AdminDashboardPage() {
  return (
    <AdminShell>
      <AdminHeader title="Dashboard Overview" />

      <div className="p-8 max-w-6xl mx-auto w-full space-y-8">
        {/* Welcome Banner */}
        <div className="bg-neutral-50 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700/50 rounded-2xl p-6 flex items-start gap-4 shadow-sm">
          <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 p-2.5 rounded-full mt-1">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-1">Authenticated Securely</h2>
            <p className="text-neutral-600 dark:text-neutral-400">
              You have successfully accessed the secure administration zone. The session is protected by a cryptographically secure HTTP-only cookie.
            </p>
          </div>
        </div>

        {/* Stats / Widgets Area (Placeholder) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <AdminStatCard 
             title="Total Traffic"
             value="24,510"
             badgeContent="+12%"
             badgeVariant="success"
             icon={<Activity className="w-4 h-4" />}
          />
          <AdminStatCard 
             title="Active Sessions"
             value="8"
             badgeContent="Live"
             badgeVariant="neutral"
             icon={<ShieldCheck className="w-4 h-4" />}
          />
          <AdminStatCard 
             title="Security Level"
             value="Secured"
             badgeContent="High"
             badgeVariant="blue"
             icon={<Key className="w-4 h-4" />}
          />
        </div>
      </div>
    </AdminShell>
  );
}
