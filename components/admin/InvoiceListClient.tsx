'use client';

import React, { useState, useRef, useEffect } from 'react';
import { AdminInvoiceItem } from '@/types/database';
import { MoreVertical, Mail, MessageCircle, DollarSign, Download, FileText, Plus, X, Copy, Search } from 'lucide-react';
import Link from 'next/link';
import { formatDateLabel } from '@/lib/admin-view';
import { InvoiceTemplate } from '../InvoiceTemplate';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useRouter } from 'next/navigation';

export function InvoiceListClient({ invoices: initialInvoices }: { invoices: AdminInvoiceItem[] }) {
  const router = useRouter();
  const [invoices, setInvoices] = useState<AdminInvoiceItem[]>(initialInvoices);

  useEffect(() => {
    setInvoices(initialInvoices);
  }, [initialInvoices]);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [paymentModal, setPaymentModal] = useState<AdminInvoiceItem | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [groupBy, setGroupBy] = useState<'none' | 'client' | 'month'>('none');
  
  const [pdfInvoice, setPdfInvoice] = useState<AdminInvoiceItem | null>(null);
  const pdfRef = useRef<HTMLDivElement>(null);

  const handleAddPayment = async () => {
    if (!paymentModal || !paymentAmount) return;
    setIsProcessing(true);
    
    const newPayment = {
      id: Date.now().toString(),
      date: paymentDate,
      amount: Number(paymentAmount),
      method: paymentMethod
    };
    
    const updatedPayments = [...(paymentModal.payments || []), newPayment];
    const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
    
    let computedStatus = 'sent';
    if (totalPaid >= (paymentModal.totalAmount || 0) && paymentModal.totalAmount > 0) {
      computedStatus = 'paid';
    } else if (totalPaid > 0) {
      computedStatus = 'partially_paid';
    }
    
    try {
      // Optimistic UI Update
      setInvoices(prev => prev.map(inv => {
        if (inv.id === paymentModal.id) {
          return { ...inv, payments: updatedPayments, status: computedStatus };
        }
        return inv;
      }));

      const res = await fetch(`/api/admin/invoices/${paymentModal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payments: updatedPayments, status: computedStatus })
      });
      
      if (!res.ok) {
        throw new Error(await res.text());
      }
      
      setPaymentModal(null);
      setPaymentAmount('');
      setPaymentMethod('');
      router.refresh();
    } catch (e: any) {
      alert(`Failed to add payment: ${e.message}`);
      // Revert on failure
      setInvoices(initialInvoices);
    } finally {
      setIsProcessing(false);
    }
  };

  const generatePDFBlob = async (invoice: AdminInvoiceItem): Promise<Blob | null> => {
    return new Promise((resolve) => {
      setPdfInvoice(invoice);
      // Wait for React to render the hidden template
      setTimeout(async () => {
        if (!pdfRef.current) return resolve(null);
        try {
          const canvas = await html2canvas(pdfRef.current, { scale: 2 });
          // Compress the image aggressively to prevent massive 10MB+ PDF sizes
          const imgData = canvas.toDataURL('image/jpeg', 0.85);
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
          pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
          
          const blob = pdf.output('blob');
          setPdfInvoice(null);
          resolve(blob);
        } catch (e) {
          setPdfInvoice(null);
          resolve(null);
        }
      }, 500); // 500ms delay to ensure rendering is complete
    });
  };

  const getPdfFileName = (invoice: AdminInvoiceItem) => {
    const date = new Date(invoice.issueDate || invoice.createdAt || Date.now());
    const month = date.toLocaleString('en-US', { month: 'long' });
    const brandName = invoice.clientBrand || invoice.clientName || 'Unknown';
    const invoiceNumber = invoice.invoiceNumber || 'Draft';
    return `${month} Invoice - ${brandName} - ${invoiceNumber}.pdf`;
  };

  const handleDownload = async (invoice: AdminInvoiceItem) => {
    setIsProcessing(true);
    const blob = await generatePDFBlob(invoice);
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = getPdfFileName(invoice);
      a.click();
      URL.revokeObjectURL(url);
    }
    setIsProcessing(false);
    setActiveMenu(null);
  };

  const handleShare = async (invoice: AdminInvoiceItem, platform: 'whatsapp' | 'email') => {
    setIsProcessing(true);
    const blob = await generatePDFBlob(invoice);
    setIsProcessing(false);
    setActiveMenu(null);
    
    if (!blob) return alert('Failed to generate PDF');

    const file = new File([blob], getPdfFileName(invoice), { type: 'application/pdf' });
    
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: `Invoice ${invoice.invoiceNumber}`,
          text: `Here is your invoice ${invoice.invoiceNumber} for $${invoice.totalAmount}.`,
          files: [file]
        });
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          console.error('Share failed', e);
        }
      }
    } else {
      // Fallback if Web Share API with files is not supported
      alert('Direct file sharing is not supported on this browser/device. The PDF has been downloaded instead. You can now attach it manually to your message.');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = getPdfFileName(invoice);
      a.click();
      URL.revokeObjectURL(url);
      
      // Open the app anyway
      if (platform === 'whatsapp') {
        window.open(`https://wa.me/?text=Hello, please find attached your invoice ${invoice.invoiceNumber}.`);
      } else {
        window.location.href = `mailto:${invoice.recipientEmail || ''}?subject=Invoice ${invoice.invoiceNumber}&body=Hello, please find attached your invoice.`;
      }
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.clientName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (inv.clientBrand || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (inv.invoiceNumber || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (monthFilter) {
      const invDate = inv.issueDate || inv.createdAt;
      if (!invDate || !invDate.startsWith(monthFilter)) {
        return false;
      }
    }
    
    return true;
  });

  let groupedInvoices: Record<string, AdminInvoiceItem[]> = { 'All Invoices': filteredInvoices };
  if (groupBy === 'client') {
    groupedInvoices = filteredInvoices.reduce((acc, inv) => {
      const key = inv.clientName || 'Unknown Client';
      if (!acc[key]) acc[key] = [];
      acc[key].push(inv);
      return acc;
    }, {} as Record<string, AdminInvoiceItem[]>);
  } else if (groupBy === 'month') {
    groupedInvoices = filteredInvoices.reduce((acc, inv) => {
      const dateStr = inv.issueDate || inv.createdAt;
      let key = 'Unknown Month';
      if (dateStr) {
        const d = new Date(dateStr);
        key = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      }
      if (!acc[key]) acc[key] = [];
      acc[key].push(inv);
      return acc;
    }, {} as Record<string, AdminInvoiceItem[]>);
  }

  const totalRemaining = filteredInvoices.reduce((sum, inv) => {
    const total = inv.totalAmount || inv.amount || 0;
    const paid = (inv.payments || []).reduce((pSum, p) => pSum + p.amount, 0);
    return sum + Math.max(0, total - paid);
  }, 0);

  return (
    <>
      <div className="p-4 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center gap-4 bg-zinc-50/50 rounded-t-2xl justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="text"
              placeholder="Search by client or invoice #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <div>
            <input 
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="px-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-zinc-700"
            />
          </div>
        </div>
          <div className="flex items-center gap-2 border-l border-zinc-200 pl-4 ml-2">
            <span className="text-sm font-medium text-zinc-500">Group:</span>
            <select 
              value={groupBy} 
              onChange={e => setGroupBy(e.target.value as any)}
              className="px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-zinc-700 outline-none cursor-pointer"
            >
              <option value="none">None</option>
              <option value="client">By Client</option>
              <option value="month">By Month</option>
            </select>
          </div>
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-zinc-200 shadow-sm ml-2">
            <span className="text-sm font-medium text-zinc-500">Total Remaining:</span>
            <span className="text-lg font-bold text-amber-600">${totalRemaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      <div className="overflow-visible">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50/80 border-b border-zinc-100">
              <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Invoice #</th>
              <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Client</th>
              <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Dates</th>
              <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Paid</th>
              <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Remaining</th>
              <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {Object.entries(groupedInvoices).map(([groupName, groupItems]) => (
              <React.Fragment key={groupName}>
                {groupBy !== 'none' && (
                  <tr className="bg-zinc-50 border-y border-zinc-200">
                    <td colSpan={8} className="px-6 py-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-zinc-900 uppercase tracking-wide">{groupName} <span className="text-zinc-500 normal-case font-medium ml-2">({groupItems.length} invoices)</span></span>
                        <span className="font-bold text-amber-600">
                          Remaining: ${groupItems.reduce((sum, inv) => sum + Math.max(0, (inv.totalAmount || inv.amount || 0) - (inv.payments || []).reduce((p, pItem) => p + pItem.amount, 0)), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </td>
                  </tr>
                )}
                {groupItems.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-zinc-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <Link href={`/admin/invoices/${invoice.id}`} className="font-medium text-blue-600 hover:text-blue-700 hover:underline">
                    {invoice.invoiceNumber || 'Draft'}
                  </Link>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-zinc-900 font-bold">
                      {invoice.clientBrand || 'No Brand'}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {invoice.clientName}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-zinc-900 font-medium">
                      Issued: {formatDateLabel(invoice.issueDate || invoice.createdAt)}
                    </span>
                    {invoice.dueDate && (
                      <span className="text-xs text-zinc-500">
                        Due: {formatDateLabel(invoice.dueDate)}
                      </span>
                    )}
                    {(invoice.billingPeriodFrom || invoice.billingPeriodTo) && (
                      <span className="text-xs text-blue-600/80 font-medium mt-0.5">
                        Sub: {formatDateLabel(invoice.billingPeriodFrom)} - {formatDateLabel(invoice.billingPeriodTo)}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm font-medium text-zinc-900">
                  ${(() => {
                    const total = invoice.totalAmount || invoice.amount || 0;
                    return total.toLocaleString();
                  })()}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-green-600">
                  ${(() => {
                    const paid = (invoice.payments || []).reduce((sum, p) => sum + p.amount, 0);
                    return paid.toLocaleString();
                  })()}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-amber-600">
                  ${(() => {
                    const total = invoice.totalAmount || invoice.amount || 0;
                    const paid = (invoice.payments || []).reduce((sum, p) => sum + p.amount, 0);
                    const remaining = Math.max(0, total - paid);
                    return remaining.toLocaleString();
                  })()}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize
                    ${invoice.status === 'paid' ? 'bg-green-100 text-green-700' : 
                      invoice.status === 'partially_paid' ? 'bg-amber-100 text-amber-700' : 
                      invoice.status === 'overdue' ? 'bg-red-100 text-red-700' :
                      'bg-zinc-100 text-zinc-700'}`}
                  >
                    {invoice.status ? invoice.status.replace('_', ' ') : 'draft'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right relative">
                  <button 
                    onClick={() => setActiveMenu(activeMenu === invoice.id! ? null : invoice.id!)}
                    className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  
                  {activeMenu === invoice.id && (
                    <div className="absolute right-8 top-12 w-48 bg-white rounded-xl shadow-lg border border-zinc-200 py-1 z-10 animate-in fade-in zoom-in-95 duration-200">
                      <Link href={`/admin/invoices/new?cloneFrom=${invoice.id}`} className="w-full text-left px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-2">
                        <Copy className="w-4 h-4 text-blue-600" /> Create Next Invoice
                      </Link>
                      <button onClick={() => { setActiveMenu(null); setPaymentModal(invoice); }} className="w-full text-left px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-2 border-t border-zinc-100">
                        <DollarSign className="w-4 h-4 text-green-600" /> Add Payment
                      </button>
                      <button onClick={() => handleDownload(invoice)} className="w-full text-left px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-2 border-t border-zinc-100">
                        <Download className="w-4 h-4 text-zinc-600" /> Download PDF
                      </button>
                      <button onClick={() => handleShare(invoice, 'whatsapp')} className="w-full text-left px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 text-green-500" /> WhatsApp PDF
                      </button>
                      <button onClick={() => handleShare(invoice, 'email')} className="w-full text-left px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-2">
                        <Mail className="w-4 h-4 text-blue-500" /> Email PDF
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </React.Fragment>
        ))}
      </tbody>
    </table>
  </div>

      {/* Hidden PDF Generator */}
      {pdfInvoice && (
        <div className="fixed top-0 left-0 -z-50 opacity-0 pointer-events-none" style={{ transform: 'scale(1)' }}>
           <InvoiceTemplate invoice={pdfInvoice} ref={pdfRef} />
        </div>
      )}

      {/* Payment Modal */}
      {paymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-zinc-900">Add Payment</h3>
              <button onClick={() => setPaymentModal(null)} className="text-zinc-400 hover:text-zinc-600"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-zinc-500 mb-1">Invoice Amount: <span className="font-medium text-zinc-900">${paymentModal.totalAmount}</span></p>
              <p className="text-sm text-zinc-500 mb-1">Currently Paid: <span className="font-medium text-green-600">${(paymentModal.payments || []).reduce((s, p) => s + p.amount, 0)}</span></p>
              <p className="text-sm text-zinc-500">Remaining: <span className="font-medium text-amber-600">${Math.max(0, (paymentModal.totalAmount || paymentModal.amount || 0) - (paymentModal.payments || []).reduce((s, p) => s + p.amount, 0))}</span></p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Date</label>
                <input 
                  type="date" 
                  value={paymentDate}
                  onChange={e => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Payment Amount ($)</label>
                <input 
                  type="number" 
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  max={Math.max(0, (paymentModal.totalAmount || paymentModal.amount || 0) - (paymentModal.payments || []).reduce((s, p) => s + p.amount, 0))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. 500"
                  autoFocus
                />
                {Number(paymentAmount) > Math.max(0, (paymentModal.totalAmount || paymentModal.amount || 0) - (paymentModal.payments || []).reduce((s, p) => s + p.amount, 0)) && (
                  <p className="text-xs text-red-500 mt-1">Amount cannot exceed the remaining balance.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Payment Method</label>
                <input 
                  type="text" 
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. e-Transfer, Cash, Stripe"
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setPaymentModal(null)} className="px-4 py-2 rounded-lg text-zinc-600 hover:bg-zinc-100 font-medium text-sm">Cancel</button>
              <button 
                onClick={handleAddPayment} 
                disabled={isProcessing || !paymentAmount || Number(paymentAmount) > Math.max(0, (paymentModal.totalAmount || paymentModal.amount || 0) - (paymentModal.payments || []).reduce((s, p) => s + p.amount, 0))} 
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium text-sm disabled:opacity-50"
              >
                {isProcessing ? 'Saving...' : 'Save Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Loading overlay for PDF generation */}
      {isProcessing && !paymentModal && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white px-6 py-3 rounded-full shadow-lg flex items-center gap-3 font-medium text-blue-600">
            <div className="w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin"></div>
            Processing...
          </div>
        </div>
      )}
    </>
  );
}
