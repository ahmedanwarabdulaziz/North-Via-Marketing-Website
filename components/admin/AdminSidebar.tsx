import { 
  BarChart3, 
  LayoutDashboard, 
  LogOut, 
  Mail, 
  MessageSquare, 
  Settings, 
  Users 
} from 'lucide-react';
import { AdminNavLink } from './AdminNavLink';
import { logoutAdmin } from '@/app/actions/auth';

export function AdminSidebar() {
  return (
    <aside className="w-64 border-r border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col shadow-sm min-h-screen sticky top-0 hidden md:flex">
      <div className="p-6 border-b border-neutral-200 dark:border-zinc-800 flex items-center justify-between">
        <div className="font-semibold text-lg tracking-tight">System Admin</div>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        <AdminNavLink 
          href="/admin" 
          icon={<LayoutDashboard className="w-5 h-5" />} 
          label="Dashboard" 
        />
        <AdminNavLink 
          href="/admin/clients" 
          icon={<Users className="w-5 h-5" />} 
          label="Client Portfolio" 
        />
        <AdminNavLink 
          href="/admin/ads" 
          icon={<BarChart3 className="w-5 h-5" />} 
          label="Google Ads" 
        />
        <AdminNavLink 
          href="/admin/leads" 
          icon={<Users className="w-5 h-5" />} 
          label="Leads & Form" 
        />
        <AdminNavLink 
          href="/admin/emails" 
          icon={<Mail className="w-5 h-5" />} 
          label="Email Logs" 
        />
        <AdminNavLink 
          href="/admin/reviews" 
          icon={<MessageSquare className="w-5 h-5" />} 
          label="Google Reviews" 
        />
        <AdminNavLink 
          href="/admin/settings" 
          icon={<Settings className="w-5 h-5" />} 
          label="Settings" 
        />
      </nav>

      <div className="p-4 border-t border-neutral-200 dark:border-zinc-800">
        <form action={logoutAdmin}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 transition-colors font-medium text-sm"
          >
            <LogOut className="w-5 h-5" />
            Sign Out Securely
          </button>
        </form>
      </div>
    </aside>
  );
}
