import Link from 'next/link';
import { Users, LayoutDashboard, Settings, LogOut, BarChart3, FileText } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-zinc-200 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-zinc-100">
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Admin<span className="text-blue-600">OS</span></h2>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <Link href="/admin" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-colors font-medium text-sm">
            <LayoutDashboard className="w-5 h-5 text-zinc-400" />
            Dashboard
          </Link>
          <Link href="/admin/clients" className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-blue-50 text-blue-700 font-medium text-sm">
            <Users className="w-5 h-5 text-blue-500" />
            Clients
          </Link>
          <Link href="/admin/ads" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-colors font-medium text-sm">
            <BarChart3 className="w-5 h-5 text-zinc-400" />
            Google Ads
          </Link>
          <Link href="/admin/invoices" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-colors font-medium text-sm">
            <FileText className="w-5 h-5 text-zinc-400" />
            Invoices
          </Link>
          <Link href="/admin/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-colors font-medium text-sm">
            <Settings className="w-5 h-5 text-zinc-400" />
            Settings
          </Link>
        </nav>
        
        <div className="p-4 border-t border-zinc-100">
          <button className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-zinc-600 hover:text-red-600 hover:bg-red-50 transition-colors font-medium text-sm">
            <LogOut className="w-5 h-5 text-zinc-400 group-hover:text-red-500" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
