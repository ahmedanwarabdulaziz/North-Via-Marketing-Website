import React from 'react';
import { Caveat } from 'next/font/google';
import type { AdminInvoiceItem } from '@/types/database';

const caveat = Caveat({ subsets: ['latin'] });

export const NVM_INVOICE_ISSUER = {
  name: 'Ahmed Anwar',
  company: 'North via Marketing',
  email: 'info@northviamarketing.com',
  addressLines: [
    '509 Dundas St W',
    'Oakville, ON L6M 5P4, Canada'
  ]
};

export const InvoiceTemplate = React.forwardRef<HTMLDivElement, { invoice: Partial<AdminInvoiceItem> }>(({ invoice }, ref) => {
  const lineItems = invoice.lineItems || [];
  const hasDiscount = !!invoice.discountAmount && invoice.discountAmount > 0;
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const safeDate = dateString.includes('T') ? dateString : `${dateString}T12:00:00`;
    const date = new Date(safeDate);
    return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
  };

  const formatCurrency = (amount: number = 0) => {
    return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  return (
    <div
      ref={ref}
      style={{
        width: '794px', // A4 width at 96 DPI
        minHeight: '1123px', // A4 height at 96 DPI
        backgroundColor: '#ffffff',
        position: 'relative',
        color: '#1e293b',
        fontFamily: 'sans-serif',
        display: 'flex',
        flexDirection: 'column',
      }}
      className="overflow-hidden"
    >
      {/* Left side artistic "invoice" text and line */}
      <div 
        style={{
          position: 'absolute',
          left: '40px',
          top: '40px',
          bottom: '40px',
          width: '60px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        <div style={{ flex: 1, width: '2px', backgroundColor: '#e28723', borderRadius: '2px', borderTopLeftRadius: '50% 100%', borderTopRightRadius: '50% 100%' }}></div>
        <div 
          className={caveat.className}
          style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            fontSize: '84px',
            color: '#e28723',
            lineHeight: 1,
            margin: '20px 0',
            letterSpacing: '2px',
          }}
        >
          invoice
        </div>
        <div style={{ flex: 1, width: '2px', backgroundColor: '#e28723', borderRadius: '2px', borderBottomLeftRadius: '50% 100%', borderBottomRightRadius: '50% 100%' }}></div>
      </div>

      <div style={{ paddingLeft: '140px', paddingRight: '60px', paddingTop: '60px', paddingBottom: '60px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {/* Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', color: '#475569' }}>
            <span style={{ fontWeight: 'bold', color: '#1e293b' }}>{NVM_INVOICE_ISSUER.name}</span>
            <span>{NVM_INVOICE_ISSUER.company}</span>
            <span>{NVM_INVOICE_ISSUER.email}</span>
            {NVM_INVOICE_ISSUER.addressLines.map((line, i) => (
              <span key={i}>{line}</span>
            ))}
          </div>
          <div>
            {/* NVM Logo */}
            <img 
              src="/Logo-1.png" 
              alt="NVM Logo" 
              style={{ width: '100px', height: '100px', objectFit: 'contain' }} 
            />
          </div>
        </div>

        {/* Invoice Info Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '100px', fontSize: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontWeight: 'bold', letterSpacing: '1px' }}>ISSUED TO:</span>
            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{invoice.clientName || 'Owner Name'}</span>
            <span style={{ fontSize: '13px' }}>{invoice.clientBrand || 'Brand Name'}</span>
            <span style={{ fontSize: '13px', color: '#475569' }}>{invoice.recipientEmail || 'client@email.com'}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'right' }}>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
              <span style={{ fontWeight: 'bold', letterSpacing: '1px' }}>INVOICE NO:</span>
              <span style={{ fontWeight: 'bold', width: '80px' }}>{invoice.invoiceNumber || '------'}</span>
            </div>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
              <span style={{ letterSpacing: '1px' }}>DUE DATE:</span>
              <span style={{ width: '80px' }}>{formatDate(invoice.dueDate)}</span>
            </div>
            
            {(invoice.billingPeriodFrom || invoice.billingPeriodTo) && (
              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontWeight: 'bold', letterSpacing: '1px' }}>SUBSCRIPTION</span>
                <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
                  <span style={{ letterSpacing: '1px' }}>FROM</span>
                  <span style={{ width: '80px' }}>{formatDate(invoice.billingPeriodFrom)}</span>
                </div>
                <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
                  <span style={{ letterSpacing: '1px' }}>TO</span>
                  <span style={{ width: '80px' }}>{formatDate(invoice.billingPeriodTo)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Table Section */}
        <div style={{ marginTop: '60px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1.5px solid #000' }}>
                <th style={{ textAlign: 'left', paddingBottom: '12px', fontWeight: 'bold', letterSpacing: '1px' }}>DESCRIPTION</th>
                <th style={{ textAlign: 'center', paddingBottom: '12px', fontWeight: 'bold', letterSpacing: '1px', width: '120px' }}>UNIT PRICE</th>
                <th style={{ textAlign: 'center', paddingBottom: '12px', fontWeight: 'bold', letterSpacing: '1px', width: '80px' }}>QTY</th>
                <th style={{ textAlign: 'right', paddingBottom: '12px', fontWeight: 'bold', letterSpacing: '1px', width: '100px' }}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.length > 0 ? (
                lineItems.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ paddingTop: '24px', paddingBottom: '24px' }}>{item.description}</td>
                    <td style={{ paddingTop: '24px', paddingBottom: '24px', textAlign: 'center', color: '#475569' }}>{formatCurrency(item.price)}</td>
                    <td style={{ paddingTop: '24px', paddingBottom: '24px', textAlign: 'center', color: '#475569' }}>{item.quantity}</td>
                    <td style={{ paddingTop: '24px', paddingBottom: '24px', textAlign: 'right' }}>{formatCurrency(item.total)}</td>
                  </tr>
                ))
              ) : (
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td colSpan={4} style={{ paddingTop: '24px', paddingBottom: '24px', textAlign: 'center', color: '#94a3b8' }}>
                    No items added
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end', fontSize: '13px' }}>
          <div style={{ width: '250px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', letterSpacing: '1px' }}>
              <span>SUBTOTAL</span>
              <span>{formatCurrency(invoice.subtotalAmount)}</span>
            </div>
            
            {hasDiscount && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Discount</span>
                <span>{formatCurrency(invoice.discountAmount)}</span>
              </div>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', letterSpacing: '1px', fontSize: '14px', marginTop: '4px' }}>
              <span>TOTAL</span>
              <span>{formatCurrency(invoice.totalAmount)}</span>
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }}></div>

        {/* Footer Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '60px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
            <span style={{ fontWeight: 'bold', letterSpacing: '1px' }}>BANK DETAILS</span>
            <span style={{ color: '#475569' }}>{NVM_INVOICE_ISSUER.email}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontWeight: 'bold', letterSpacing: '1px', fontSize: '12px' }}>THANK YOU</span>
            <div className={caveat.className} style={{ fontSize: '32px', color: '#1e293b', transform: 'rotate(-5deg)' }}>
              Ahmed Anwar
            </div>
          </div>
        </div>

      </div>
    </div>
  );
});

InvoiceTemplate.displayName = 'InvoiceTemplate';
