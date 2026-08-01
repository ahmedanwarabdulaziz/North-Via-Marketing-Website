import { listClientProfiles } from '@/lib/admin-ops';
import Link from 'next/link';
import { Plus, Users, Search, MoreVertical, Building2 } from 'lucide-react';
import { formatDateLabel } from '@/lib/admin-view';

export const dynamic = 'force-dynamic';

export default async function ClientsPage() {
  const clients = await listClientProfiles();

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-500" />
            Clients
          </h1>
          <p className="text-zinc-500 mt-2">Manage your client relationships and brand profiles.</p>
        </div>
        <Link
          href="/admin/clients/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-all shadow-sm shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" />
          Add Client
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
        <div className="p-4 border-b border-zinc-100 flex items-center gap-4 bg-zinc-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="text"
              placeholder="Search clients..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>
        
        {clients.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mb-4">
              <Building2 className="w-8 h-8 text-zinc-400" />
            </div>
            <h3 className="text-lg font-medium text-zinc-900">No clients yet</h3>
            <p className="text-zinc-500 mt-1 max-w-sm mb-6">Get started by adding your first client to the system.</p>
            <Link
              href="/admin/clients/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add First Client
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/80 border-b border-zinc-100">
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Brand Name</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Owner</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Added On</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-zinc-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <Link href={`/admin/clients/${client.id}`} className="font-medium text-blue-600 hover:text-blue-700 hover:underline">
                        {client.brandName}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600">
                      {client.ownerName}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-zinc-900">{client.email}</div>
                      {client.mobileNumber && (
                        <div className="text-xs text-zinc-500 mt-0.5">{client.mobileNumber}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500">
                      {formatDateLabel(client.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-zinc-400 hover:text-zinc-900 transition-colors opacity-0 group-hover:opacity-100">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
