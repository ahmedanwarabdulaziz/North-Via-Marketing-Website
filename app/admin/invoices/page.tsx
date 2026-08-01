import { listAdminInvoices } from '@/lib/admin-ops';
import Link from 'next/link';
import { Plus, FileText, Search } from 'lucide-react';
import { InvoiceListClient } from '@/components/admin/InvoiceListClient';

export const dynamic = 'force-dynamic';

export default async function InvoicesPage() {
  const invoices = await listAdminInvoices();

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-500" />
            Invoices
          </h1>
          <p className="text-zinc-500 mt-2">Manage your client invoices and track payments.</p>
        </div>
        <Link
          href="/admin/invoices/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-all shadow-sm shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" />
          Create Invoice
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200">
        {invoices.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-zinc-400" />
            </div>
            <h3 className="text-lg font-medium text-zinc-900">No invoices yet</h3>
            <p className="text-zinc-500 mt-1 max-w-sm mb-6">Create your first invoice to bill your clients.</p>
            <Link
              href="/admin/invoices/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 transition-all"
            >
              <Plus className="w-4 h-4" />
              Create First Invoice
            </Link>
          </div>
        ) : (
          <InvoiceListClient invoices={invoices} />
        )}
      </div>
    </div>
  );
}
