import { getAdminInvoiceById, listClientProfiles } from '@/lib/admin-ops';
import { InvoiceDetailClient } from '@/components/admin/InvoiceDetailClient';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = await getAdminInvoiceById(id);
  const clients = await listClientProfiles();

  if (!invoice) {
    notFound();
  }

  return (
    <div className="max-w-[1600px] mx-auto p-6 md:p-8">
      <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-500 flex justify-between items-end">
        <div>
          <Link 
            href="/admin/invoices" 
            className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Invoices
          </Link>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight flex items-center gap-4">
            Invoice {invoice.invoiceNumber}
            <span className={`text-sm px-2.5 py-1 rounded-full font-medium ${
              invoice.status === 'paid' ? 'bg-green-100 text-green-700' : 
              invoice.status === 'partially_paid' ? 'bg-amber-100 text-amber-700' : 
              'bg-zinc-100 text-zinc-700'
            }`}>
              {invoice.status ? invoice.status.replace('_', ' ') : 'draft'}
            </span>
          </h1>
          <p className="text-zinc-500 mt-2">Manage this invoice and track payments.</p>
        </div>
      </div>
      
      <InvoiceDetailClient invoice={invoice} clients={clients} />
    </div>
  );
}
