'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AdminInvoiceItem, InvoiceLineItem, InvoicePayment, ClientProfile } from '@/types/database';
import { Plus, Trash, FileDown, Save } from 'lucide-react';
import { InvoiceTemplate } from '../InvoiceTemplate';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export function InvoiceForm({ initialData, clients, onSuccess }: { initialData?: AdminInvoiceItem; clients?: ClientProfile[]; onSuccess?: () => void }) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  // Helper to format local date as YYYY-MM-DD
  const getLocalYMD = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const today = new Date();
  const startOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const startOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  
  const [formData, setFormData] = useState<Partial<AdminInvoiceItem>>(
    initialData ? {
      ...initialData,
      billingPeriodFrom: initialData.billingPeriodFrom || (initialData as any).subscriptionFrom || getLocalYMD(startOfCurrentMonth),
      billingPeriodTo: initialData.billingPeriodTo || (initialData as any).subscriptionTo || getLocalYMD(endOfCurrentMonth),
    } : {
      clientName: '',
      clientBrand: '',
      recipientEmail: '',
      currency: 'USD',
      status: 'draft',
      issueDate: getLocalYMD(today),
      dueDate: getLocalYMD(startOfNextMonth),
      billingPeriodFrom: getLocalYMD(startOfCurrentMonth),
      billingPeriodTo: getLocalYMD(endOfCurrentMonth),
      lineItems: [],
      payments: [],
      standardAmount: 0,
      subtotalAmount: 0,
      discountAmount: 0,
      totalAmount: 0,
      amount: 0,
    }
  );

  const calculateTotals = (items: InvoiceLineItem[], discount: number) => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const total = Math.max(0, subtotal - (discount || 0));
    setFormData(prev => ({
      ...prev,
      lineItems: items,
      standardAmount: subtotal,
      subtotalAmount: subtotal,
      discountAmount: discount,
      totalAmount: total,
      amount: total,
    }));
  };

  const addLineItem = () => {
    const items = [...(formData.lineItems || []), { description: '', quantity: 1, price: 0, total: 0 }];
    calculateTotals(items, formData.discountAmount || 0);
  };

  const updateLineItem = (index: number, field: keyof InvoiceLineItem, value: string | number) => {
    const items = [...(formData.lineItems || [])];
    const item = { ...items[index], [field]: value };
    
    if (field === 'quantity' || field === 'price') {
      item.total = item.quantity * item.price;
    }
    
    items[index] = item;
    calculateTotals(items, formData.discountAmount || 0);
  };

  const removeLineItem = (index: number) => {
    const items = (formData.lineItems || []).filter((_, i) => i !== index);
    calculateTotals(items, formData.discountAmount || 0);
  };

  const handleDiscountChange = (val: number) => {
    calculateTotals(formData.lineItems || [], val);
  };

  const addPayment = () => {
    const p = [...(formData.payments || []), { id: Date.now().toString(), date: new Date().toISOString().split('T')[0], amount: 0, method: '' }];
    setFormData(prev => ({ ...prev, payments: p }));
  };

  const updatePayment = (index: number, field: keyof InvoicePayment, value: string | number) => {
    const p = [...(formData.payments || [])];
    p[index] = { ...p[index], [field]: value };
    setFormData(prev => ({ ...prev, payments: p }));
  };

  const removePayment = (index: number) => {
    const p = (formData.payments || []).filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, payments: p }));
  };

  const saveInvoice = async () => {
    if (!formData.clientId) {
      alert('Please select a client.');
      return;
    }
    setIsSaving(true);
    
    const totalPaid = (formData.payments || []).reduce((sum, p) => sum + p.amount, 0);
    let computedStatus: any = 'sent'; // 'sent' represents 'not paid' but issued
    if (totalPaid >= (formData.totalAmount || 0) && formData.totalAmount! > 0) {
      computedStatus = 'paid';
    } else if (totalPaid > 0) {
      computedStatus = 'partially_paid';
    }
    
    const payload = { ...formData, status: computedStatus };
    
    // Strip out undefined values to prevent Firestore crashes
    const cleanPayload = Object.entries(payload).reduce((acc, [k, v]) => {
      if (v !== undefined) {
        acc[k] = v;
      }
      return acc;
    }, {} as Record<string, any>);
    
    try {
      if (initialData?.id) {
        await fetch(`/api/admin/invoices/${initialData.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cleanPayload)
        });
      } else {
        await fetch('/api/admin/invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cleanPayload)
        });
      }
      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/admin/invoices');
        router.refresh();
      }
    } catch (e) {
      console.error(e);
      alert('Failed to save invoice');
    } finally {
      setIsSaving(false);
    }
  };

  const exportPDF = async () => {
    if (!pdfRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(pdfRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Invoice_${formData.invoiceNumber || 'Draft'}.pdf`);
    } catch (e) {
      console.error(e);
      alert('Failed to generate PDF');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Editor Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-6 space-y-6">
        
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 bg-zinc-50 p-4 rounded-xl border border-zinc-100 mb-2 space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Select Client <span className="text-red-500">*</span></label>
              <select 
                className="w-full px-3 py-2 border rounded-lg bg-white"
                value={formData.clientId || ''}
                onChange={e => {
                  const client = clients?.find(c => c.id === e.target.value);
                  if (client) {
                    setFormData(prev => ({ 
                      ...prev, 
                      clientId: client.id, 
                      clientName: client.ownerName || '',
                      clientBrand: client.brandName || '',
                      recipientEmail: client.email || ''
                    }));
                  } else {
                    setFormData(prev => ({ ...prev, clientId: '', clientName: '', clientBrand: '', recipientEmail: '' }));
                  }
                }}
              >
                <option value="">-- Select Client --</option>
                {(clients || []).map(client => (
                  <option key={client.id} value={client.id}>{client.brandName} ({client.ownerName})</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Owner Name</label>
                <input type="text" className="w-full px-3 py-2 border rounded-lg bg-white" value={formData.clientName || ''} onChange={e => setFormData({ ...formData, clientName: e.target.value })} placeholder="e.g. John Doe" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Brand Name</label>
                <input type="text" className="w-full px-3 py-2 border rounded-lg bg-white" value={formData.clientBrand || ''} onChange={e => setFormData({ ...formData, clientBrand: e.target.value })} placeholder="e.g. The Bloom Coffee" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
                <input type="email" className="w-full px-3 py-2 border rounded-lg bg-white" value={formData.recipientEmail || ''} onChange={e => setFormData({ ...formData, recipientEmail: e.target.value })} placeholder="e.g. john@example.com" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Issue Date</label>
            <input type="date" className="w-full px-3 py-2 border rounded-lg" value={formData.issueDate || ''} onChange={e => setFormData({ ...formData, issueDate: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Due Date</label>
            <input type="date" className="w-full px-3 py-2 border rounded-lg" value={formData.dueDate || ''} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Subscription From</label>
            <input type="date" className="w-full px-3 py-2 border rounded-lg" value={formData.billingPeriodFrom || ''} onChange={e => setFormData({ ...formData, billingPeriodFrom: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Subscription To</label>
            <input type="date" className="w-full px-3 py-2 border rounded-lg" value={formData.billingPeriodTo || ''} onChange={e => setFormData({ ...formData, billingPeriodTo: e.target.value })} />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-zinc-700">Line Items</label>
            <button onClick={addLineItem} className="text-sm text-blue-600 flex items-center gap-1 hover:underline"><Plus className="w-4 h-4" /> Add Item</button>
          </div>
          <div className="space-y-3">
            {(formData.lineItems || []).map((item, idx) => (
              <div key={idx} className="flex gap-2 items-start">
                <input type="text" placeholder="Description" className="flex-1 px-3 py-2 border rounded-lg" value={item.description} onChange={e => updateLineItem(idx, 'description', e.target.value)} />
                <input type="number" placeholder="Qty" className="w-20 px-3 py-2 border rounded-lg" value={item.quantity} onChange={e => updateLineItem(idx, 'quantity', Number(e.target.value))} />
                <input type="number" placeholder="Price" className="w-24 px-3 py-2 border rounded-lg" value={item.price} onChange={e => updateLineItem(idx, 'price', Number(e.target.value))} />
                <div className="w-24 px-3 py-2 bg-zinc-50 rounded-lg text-right">${item.total}</div>
                <button onClick={() => removeLineItem(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash className="w-5 h-5" /></button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-4 border-t pt-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-600">Discount $</span>
            <input type="number" className="w-24 px-3 py-2 border rounded-lg" value={formData.discountAmount || 0} onChange={e => handleDiscountChange(Number(e.target.value))} />
          </div>
          <div className="text-xl font-bold p-2">Total: ${formData.totalAmount}</div>
        </div>

        <div className="border-t pt-4">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-zinc-700">Payments (Tracking)</label>
            <button onClick={addPayment} className="text-sm text-green-600 flex items-center gap-1 hover:underline"><Plus className="w-4 h-4" /> Add Payment</button>
          </div>
          <div className="space-y-3">
            {(formData.payments || []).map((p, idx) => (
              <div key={idx} className="flex gap-2 items-start">
                <input type="date" className="w-40 px-3 py-2 border rounded-lg" value={p.date} onChange={e => updatePayment(idx, 'date', e.target.value)} />
                <input type="number" placeholder="Amount" className="w-32 px-3 py-2 border rounded-lg" value={p.amount} onChange={e => updatePayment(idx, 'amount', Number(e.target.value))} />
                <input type="text" placeholder="Method (e.g. e-Transfer)" className="flex-1 px-3 py-2 border rounded-lg" value={p.method || ''} onChange={e => updatePayment(idx, 'method', e.target.value)} />
                <button onClick={() => removePayment(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash className="w-5 h-5" /></button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-4 pt-6 mt-6 border-t">
          <button onClick={saveInvoice} disabled={isSaving} className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-blue-700 flex items-center justify-center gap-2">
            <Save className="w-5 h-5" />
            {isSaving ? 'Saving...' : 'Save Invoice'}
          </button>
          <button onClick={exportPDF} disabled={isExporting} className="flex-1 bg-zinc-900 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-zinc-800 flex items-center justify-center gap-2">
            <FileDown className="w-5 h-5" />
            {isExporting ? 'Exporting...' : 'Export PDF'}
          </button>
        </div>

      </div>

      {/* PDF Preview */}
      <div className="bg-zinc-100 rounded-2xl p-6 overflow-auto flex justify-center h-[90vh]">
        <div style={{ transform: 'scale(0.7)', transformOrigin: 'top center' }}>
           <InvoiceTemplate invoice={formData} ref={pdfRef} />
        </div>
      </div>
    </div>
  );
}
