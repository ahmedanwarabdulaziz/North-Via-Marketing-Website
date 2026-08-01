import { InvoiceForm } from '@/components/admin/InvoiceForm';
import { listClientProfiles, getAdminInvoiceById } from '@/lib/admin-ops';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { AdminInvoiceItem } from '@/types/database';

export default async function NewInvoicePage({ searchParams }: { searchParams: Promise<{ cloneFrom?: string }> }) {
  const { cloneFrom } = await searchParams;
  const clients = await listClientProfiles();
  
  let initialData: Partial<AdminInvoiceItem> | undefined = undefined;
  
  if (cloneFrom) {
    const original = await getAdminInvoiceById(cloneFrom);
    if (original) {
      const getLocalYMD = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };

      const addOneMonth = (dateStr?: string) => {
        if (!dateStr) return '';
        const [y, m, d] = dateStr.split('-').map(Number);
        if (!y || !m || !d) return '';
        
        const isLastDay = new Date(y, m, 0).getDate() === d;
        if (isLastDay) {
          return getLocalYMD(new Date(y, m + 1, 0));
        } else {
          return getLocalYMD(new Date(y, m, d)); // e.g. m=1 (Jan), new Date(y, 1, d) -> Feb d
        }
      };

      initialData = {
        ...original,
        id: undefined,
        invoiceNumber: undefined,
        createdAt: undefined,
        updatedAt: undefined,
        payments: [],
        status: 'draft',
        issueDate: addOneMonth(original.issueDate),
        dueDate: addOneMonth(original.dueDate),
        billingPeriodFrom: addOneMonth(original.billingPeriodFrom),
        billingPeriodTo: addOneMonth(original.billingPeriodTo),
      };
    }
  }
  
  return (
    <div className="max-w-[1600px] mx-auto p-6 md:p-8">
      <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
        <Link 
          href="/admin/invoices" 
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Invoices
        </Link>
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Create Invoice</h1>
        <p className="text-zinc-500 mt-2">Generate a new invoice for your client.</p>
      </div>
      
      <InvoiceForm clients={clients} initialData={initialData} />
    </div>
  );
}
