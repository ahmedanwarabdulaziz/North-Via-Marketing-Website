'use client';

import React, { useState, useRef, useEffect } from 'react';
import { AdminInvoiceItem } from '@/types/database';
import { MoreVertical, Mail, MessageCircle, DollarSign, Download, FileText, Plus, X, Copy, Search, CalendarDays, Users } from 'lucide-react';
import Link from 'next/link';
import { formatDateLabel } from '@/lib/admin-view';
import { serviceMonthFromPeriod, serviceMonthLabel } from '@/lib/service-month';
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
  const [view, setView] = useState<'month' | 'customer'>('month');
  const [selected, setSelected] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'paid'>('all');
  
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
    
    const formatName = (name: string) => {
      return name.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    };
    
    const clientName = formatName(invoice.clientName || 'Valued Client');
    const brandName = invoice.clientBrand || 'your business';
    const amount = invoice.totalAmount ? `$${invoice.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'the total balance';
    const invoiceNo = invoice.invoiceNumber || 'your recent invoice';
    
    const templateMessage = `Hello ${clientName},\nI hope you're having a great day!\nPlease find attached the invoice for *${brandName}* for the amount of ${amount}.\nThank you for your continued business!\n\nBest regards,\nAhmed Anwar\nNorth via Marketing`;
    const encodedMessage = encodeURIComponent(templateMessage);
    
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: `Invoice ${invoice.invoiceNumber}`,
          text: templateMessage,
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
        window.open(`https://wa.me/?text=${encodedMessage}`);
      } else {
        window.location.href = `mailto:${invoice.recipientEmail || ''}?subject=Invoice ${invoice.invoiceNumber}&body=${encodedMessage}`;
      }
    }
  };

  const money = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const invTotal = (inv: AdminInvoiceItem) => inv.totalAmount || inv.amount || 0;
  const invPaid = (inv: AdminInvoiceItem) => (inv.payments || []).reduce((sum, p) => sum + p.amount, 0);
  const invRemaining = (inv: AdminInvoiceItem) => Math.max(0, invTotal(inv) - invPaid(inv));
  const summarize = (items: AdminInvoiceItem[]) => {
    const invoiced = items.reduce((s, i) => s + invTotal(i), 0);
    const collected = items.reduce((s, i) => s + Math.min(invPaid(i), invTotal(i)), 0);
    const outstanding = items.reduce((s, i) => s + invRemaining(i), 0);
    const openCount = items.filter(i => invRemaining(i) > 0).length;
    return { invoiced, collected, outstanding, openCount, count: items.length };
  };

  // An invoice belongs to its service month. Older invoices saved before the
  // field was required fall back to the month holding most of the billing
  // period, then to the issue date.
  const monthKeyOf = (inv: AdminInvoiceItem) =>
    inv.serviceMonthKey ||
    serviceMonthFromPeriod(inv.billingPeriodFrom, inv.billingPeriodTo)?.key ||
    (inv.issueDate || inv.createdAt || '').slice(0, 7) ||
    'unknown';
  const periodDateOf = (inv: AdminInvoiceItem) => inv.billingPeriodFrom || inv.issueDate || inv.createdAt || '';
  const monthLabel = (key: string, short = false) => {
    if (key === 'unknown') return 'No date';
    const [y, m] = key.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleString('en-US', { month: short ? 'short' : 'long', year: 'numeric' });
  };
  const customerKeyOf = (inv: AdminInvoiceItem) => inv.clientId || inv.clientBrand || inv.clientName || 'unknown';
  const customerLabelOf = (inv: AdminInvoiceItem) => inv.clientBrand || inv.clientName || 'Unknown Client';

  const searchedInvoices = invoices.filter(inv => {
    const q = searchQuery.toLowerCase();
    return inv.clientName.toLowerCase().includes(q) ||
      (inv.clientBrand || '').toLowerCase().includes(q) ||
      (inv.invoiceNumber || '').toLowerCase().includes(q);
  });

  const keyOf = view === 'month' ? monthKeyOf : customerKeyOf;
  const tabs = Object.values(searchedInvoices.reduce((acc, inv) => {
    const key = keyOf(inv);
    if (!acc[key]) acc[key] = { key, label: view === 'month' ? monthLabel(key, true) : customerLabelOf(inv), items: [] };
    acc[key].items.push(inv);
    return acc;
  }, {} as Record<string, { key: string; label: string; items: AdminInvoiceItem[] }>))
    .sort((a, b) => view === 'month' ? b.key.localeCompare(a.key) : a.label.localeCompare(b.label));

  const selectedInvoices = selected === 'all' ? searchedInvoices : searchedInvoices.filter(inv => keyOf(inv) === selected);
  const summary = summarize(selectedInvoices);
  const collectionRate = summary.invoiced > 0 ? Math.round((summary.collected / summary.invoiced) * 100) : 0;
  const selectedLabel = selected === 'all'
    ? (view === 'month' ? 'All months' : 'All customers')
    : (view === 'month' ? monthLabel(selected) : tabs.find(t => t.key === selected)?.label || '');

  const tableInvoices = selectedInvoices
    .filter(inv => statusFilter === 'all' || (statusFilter === 'unpaid' ? invRemaining(inv) > 0 : invRemaining(inv) === 0))
    .sort((a, b) => monthKeyOf(b).localeCompare(monthKeyOf(a)) || periodDateOf(b).localeCompare(periodDateOf(a)));

  // With a single tab picked the list is flat; on "All" it is grouped by the
  // current view so each month or customer gets its own subtotal row.
  let groupedInvoices: [string, AdminInvoiceItem[]][] = [['', tableInvoices]];
  if (selected === 'all') {
    const groups = tableInvoices.reduce((acc, inv) => {
      const key = keyOf(inv);
      if (!acc[key]) acc[key] = [];
      acc[key].push(inv);
      return acc;
    }, {} as Record<string, AdminInvoiceItem[]>);
    groupedInvoices = tabs
      .filter(t => groups[t.key])
      .map(t => [view === 'month' ? monthLabel(t.key) : t.label, groups[t.key]] as [string, AdminInvoiceItem[]]);
  }

  const switchView = (next: 'month' | 'customer') => {
    setView(next);
    setSelected('all');
  };

  return (
    <>
      <div className="p-4 md:p-5 border-b border-zinc-100 bg-zinc-50/50 rounded-t-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div className="inline-flex p-1 bg-zinc-100 rounded-xl self-start">
            {(['month', 'customer'] as const).map(v => (
              <button
                key={v}
                onClick={() => switchView(v)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${view === v ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-800'}`}
              >
                {v === 'month' ? <CalendarDays className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                {v === 'month' ? 'By Month' : 'By Customer'}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by client or invoice #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {[{ key: 'all', label: view === 'month' ? 'All months' : 'All customers', items: searchedInvoices }, ...tabs].map(tab => {
            const tabOutstanding = tab.items.reduce((s, i) => s + invRemaining(i), 0);
            const isActive = selected === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setSelected(tab.key)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${isActive ? 'bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-500/20' : 'bg-white border-zinc-200 text-zinc-700 hover:border-blue-300 hover:text-blue-700'}`}
              >
                <span>{tab.label}</span>
                <span className={`text-xs px-1.5 rounded ${isActive ? 'bg-white/20' : 'bg-zinc-100 text-zinc-500'}`}>{tab.items.length}</span>
                {tabOutstanding > 0 && (
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-amber-300' : 'bg-amber-500'}`} title={`${money(tabOutstanding)} not paid`} />
                )}
              </button>
            );
          })}
        </div>

        <div>
          <h2 className="text-sm font-semibold text-zinc-900 mb-2">{selectedLabel}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-zinc-200 p-4">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Amount Invoiced</p>
              <p className="text-2xl font-bold text-zinc-900 mt-1">{money(summary.invoiced)}</p>
              <p className="text-xs text-zinc-500 mt-1">{summary.count} invoice{summary.count === 1 ? '' : 's'}</p>
            </div>
            <div className="bg-white rounded-xl border border-zinc-200 p-4">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Collected</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{money(summary.collected)}</p>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${collectionRate}%` }} />
                </div>
                <span className="text-xs font-medium text-zinc-500">{collectionRate}%</span>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-zinc-200 p-4">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Not Paid</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{money(summary.outstanding)}</p>
              <p className="text-xs text-zinc-500 mt-1">{summary.openCount} open invoice{summary.openCount === 1 ? '' : 's'}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(['all', 'unpaid', 'paid'] as const).map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${statusFilter === f ? 'bg-zinc-900 text-white' : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100'}`}
            >
              {f === 'all' ? 'All' : f === 'unpaid' ? 'Not paid' : 'Paid'}
            </button>
          ))}
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
            {tableInvoices.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-sm text-zinc-500">No invoices match this selection.</td>
              </tr>
            )}
            {groupedInvoices.map(([groupName, groupItems]) => {
              const g = summarize(groupItems);
              return (
              <React.Fragment key={groupName || 'flat'}>
                {groupName && (
                  <tr className="bg-zinc-50 border-y border-zinc-200">
                    <td colSpan={8} className="px-6 py-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-zinc-900 uppercase tracking-wide">{groupName} <span className="text-zinc-500 normal-case font-medium ml-2">({groupItems.length} invoices)</span></span>
                        <span className="flex items-center gap-4 font-semibold">
                          <span className="text-zinc-700">Invoiced {money(g.invoiced)}</span>
                          <span className="text-green-600">Collected {money(g.collected)}</span>
                          <span className="text-amber-600">Not paid {money(g.outstanding)}</span>
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
                    {monthKeyOf(invoice) !== 'unknown' && (
                      <span className="self-start text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                        {serviceMonthLabel(monthKeyOf(invoice))}
                      </span>
                    )}
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
              );
            })}
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
