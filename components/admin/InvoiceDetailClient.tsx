'use client';

import { useState } from 'react';
import { InvoiceTemplate } from '../InvoiceTemplate';
import { InvoiceForm } from './InvoiceForm';
import { AdminInvoiceItem, ClientProfile } from '@/types/database';
import { Edit2, Eye, Download, MessageCircle, Mail } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useRef } from 'react';

export function InvoiceDetailClient({ invoice, clients }: { invoice: AdminInvoiceItem, clients: ClientProfile[] }) {
  const [isEditing, setIsEditing] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);
  
  const getPdfFileName = () => {
    const date = new Date(invoice.issueDate || invoice.createdAt || Date.now());
    const month = date.toLocaleString('en-US', { month: 'long' });
    const brandName = invoice.clientBrand || invoice.clientName || 'Unknown';
    const invoiceNumber = invoice.invoiceNumber || 'Draft';
    return `${month} Invoice - ${brandName} - ${invoiceNumber}.pdf`;
  };

  const generatePDFBlob = async (): Promise<Blob | null> => {
    if (!pdfRef.current) return null;
    try {
      const canvas = await html2canvas(pdfRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/jpeg', 0.85);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      return pdf.output('blob');
    } catch (e) {
      return null;
    }
  };

  const handleDownload = async () => {
    const blob = await generatePDFBlob();
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = getPdfFileName();
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start mb-6 bg-white p-4 rounded-2xl shadow-sm border border-zinc-100">
        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
          <button
            onClick={() => setIsEditing(false)}
            className={`px-4 py-2 text-sm font-medium rounded-xl flex items-center gap-2 transition-colors whitespace-nowrap ${!isEditing ? 'bg-zinc-900 text-white shadow-md' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
          >
            <Eye className="w-4 h-4" /> View Invoice
          </button>
          <button
            onClick={() => setIsEditing(true)}
            className={`px-4 py-2 text-sm font-medium rounded-xl flex items-center gap-2 transition-colors whitespace-nowrap ${isEditing ? 'bg-zinc-900 text-white shadow-md' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
          >
            <Edit2 className="w-4 h-4" /> Edit Details
          </button>
        </div>
        
        {!isEditing && (
          <div className="flex gap-2">
            <button onClick={handleDownload} className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium text-sm rounded-xl flex items-center gap-2 transition-colors">
              <Download className="w-4 h-4" /> Download PDF
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <InvoiceForm initialData={invoice} clients={clients} />
      ) : (
        <div className="bg-zinc-100 rounded-2xl p-4 md:p-8 flex justify-center items-start shadow-inner overflow-x-auto min-h-[800px]">
          <div ref={pdfRef} className="bg-white shadow-xl">
            <InvoiceTemplate invoice={invoice} />
          </div>
        </div>
      )}
    </div>
  );
}
