import PDFDocument from 'pdfkit';
import type { AdminInvoiceItem } from '@/types/database';

export const NORTH_VIA_INVOICE_ISSUER = {
  businessName: 'North Via Marketing',
  addressLines: [
    '509 Dundas St W',
    'Oakville, ON L6M 5P4',
    'Canada',
  ],
  website: 'https://northviamarketing.com',
  phone: '+1 (647) 675-3343',
  email: 'info@northviamarketing.com',
  eTransferEmail: 'info@northviamarketing.com',
};

export function computeInvoiceAmounts(input: {
  standardAmount?: number;
  discountAmount?: number;
}) {
  const standardAmount = Number(input.standardAmount || 0);
  const discountAmount = Math.max(0, Number(input.discountAmount || 0));
  const subtotalAmount = standardAmount;
  const totalAmount = Math.max(0, subtotalAmount - discountAmount);

  return {
    standardAmount,
    discountAmount,
    subtotalAmount,
    totalAmount,
    amount: totalAmount,
  };
}

export function formatMoney(currency: string | undefined, amount: number | undefined) {
  const numeric = Number(amount || 0);
  return `${currency || 'USD'} ${numeric.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function buildInvoiceNumber(invoice: Partial<AdminInvoiceItem>) {
  const cleanedClient = (invoice.clientName || 'CLIENT')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6) || 'CLIENT';

  const issueDate = invoice.issueDate || new Date().toISOString().slice(0, 10);
  const compactDate = issueDate.replace(/-/g, '');
  return `NVM-${compactDate}-${cleanedClient}`;
}

export function invoicePdfFileName(invoice: Partial<AdminInvoiceItem>) {
  const invoiceNumber = invoice.invoiceNumber || buildInvoiceNumber(invoice);
  return `${invoiceNumber}.pdf`;
}

export function invoicePeriodLabel(invoice: Partial<AdminInvoiceItem>) {
  if (invoice.billingPeriodFrom && invoice.billingPeriodTo) {
    return `${invoice.billingPeriodFrom} to ${invoice.billingPeriodTo}`;
  }

  return invoice.serviceMonth || 'Not specified';
}

export async function generateInvoicePdfBuffer(invoice: AdminInvoiceItem) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
  });

  const chunks: Buffer[] = [];

  return await new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const invoiceNumber = invoice.invoiceNumber || buildInvoiceNumber(invoice);
    const issueDate = invoice.issueDate || new Date().toISOString().slice(0, 10);
    const dueDate = invoice.dueDate || '-';
    const periodLabel = invoicePeriodLabel(invoice);

    doc
      .fontSize(24)
      .fillColor('#274290')
      .text(NORTH_VIA_INVOICE_ISSUER.businessName, 50, 50);

    doc
      .fontSize(11)
      .fillColor('#4b5563')
      .text(NORTH_VIA_INVOICE_ISSUER.addressLines.join('\n'), 50, 88)
      .text(`Phone: ${NORTH_VIA_INVOICE_ISSUER.phone}`, 50, 140)
      .text(`Email: ${NORTH_VIA_INVOICE_ISSUER.email}`, 50, 156)
      .text(`Website: ${NORTH_VIA_INVOICE_ISSUER.website}`, 50, 172)
      .text(`e-Transfer: ${NORTH_VIA_INVOICE_ISSUER.eTransferEmail}`, 50, 188);

    doc
      .fontSize(28)
      .fillColor('#111827')
      .text('INVOICE', 390, 50, { align: 'right' });

    doc
      .fontSize(11)
      .fillColor('#4b5563')
      .text(`Invoice #: ${invoiceNumber}`, 350, 95, { align: 'right' })
      .text(`Issue Date: ${issueDate}`, 350, 111, { align: 'right' })
      .text(`Due Date: ${dueDate}`, 350, 127, { align: 'right' })
      .text(`Period: ${periodLabel}`, 350, 143, { align: 'right' });

    doc
      .roundedRect(50, 225, 495, 70, 12)
      .fillAndStroke('#f8fafc', '#e5e7eb');

    doc
      .fillColor('#111827')
      .fontSize(12)
      .text('Bill To', 65, 242)
      .fontSize(16)
      .text(invoice.clientName, 65, 260);

    if (invoice.recipientEmail) {
      doc
        .fontSize(11)
        .fillColor('#4b5563')
        .text(invoice.recipientEmail, 65, 282);
    }

    const tableTop = 330;
    const left = 50;
    const width = 495;
    const colDescription = 240;
    const colPrice = 85;
    const colDiscount = 85;
    const colTotal = 85;

    doc
      .fillColor('#274290')
      .roundedRect(left, tableTop, width, 34, 8)
      .fill();

    doc
      .fillColor('white')
      .fontSize(11)
      .text('Description', left + 12, tableTop + 11, { width: colDescription - 20 })
      .text('Price', left + colDescription + 12, tableTop + 11, { width: colPrice - 20, align: 'right' })
      .text('Discount', left + colDescription + colPrice + 12, tableTop + 11, { width: colDiscount - 20, align: 'right' })
      .text('Total', left + colDescription + colPrice + colDiscount + 12, tableTop + 11, { width: colTotal - 20, align: 'right' });

    doc
      .fillColor('#111827')
      .roundedRect(left, tableTop + 34, width, 58, 0)
      .stroke('#e5e7eb');

    doc
      .fontSize(11)
      .text(
        invoice.description || invoice.serviceSummary || 'Marketing & consulting monthly bundle',
        left + 12,
        tableTop + 50,
        { width: colDescription - 20 }
      )
      .text(formatMoney(invoice.currency, invoice.standardAmount), left + colDescription + 12, tableTop + 50, { width: colPrice - 20, align: 'right' })
      .text(formatMoney(invoice.currency, invoice.discountAmount || 0), left + colDescription + colPrice + 12, tableTop + 50, { width: colDiscount - 20, align: 'right' })
      .text(formatMoney(invoice.currency, invoice.totalAmount), left + colDescription + colPrice + colDiscount + 12, tableTop + 50, { width: colTotal - 20, align: 'right' });

    const summaryTop = tableTop + 120;
    const summaryLeft = 320;

    doc
      .fontSize(11)
      .fillColor('#4b5563')
      .text('Subtotal', summaryLeft, summaryTop)
      .text(formatMoney(invoice.currency, invoice.subtotalAmount), summaryLeft + 120, summaryTop, { width: 105, align: 'right' })
      .text('Discount', summaryLeft, summaryTop + 20)
      .text(formatMoney(invoice.currency, invoice.discountAmount || 0), summaryLeft + 120, summaryTop + 20, { width: 105, align: 'right' });

    doc
      .moveTo(summaryLeft, summaryTop + 46)
      .lineTo(summaryLeft + 225, summaryTop + 46)
      .stroke('#d1d5db');

    doc
      .fontSize(14)
      .fillColor('#111827')
      .text('Total', summaryLeft, summaryTop + 56)
      .text(formatMoney(invoice.currency, invoice.totalAmount), summaryLeft + 120, summaryTop + 56, { width: 105, align: 'right' });

    const notesTop = summaryTop + 110;
    doc
      .fontSize(12)
      .fillColor('#111827')
      .text('Payment Notes', 50, notesTop)
      .fontSize(10)
      .fillColor('#4b5563')
      .text(
        invoice.paymentNote ||
          `Please send payment via e-Transfer to ${NORTH_VIA_INVOICE_ISSUER.eTransferEmail}.`,
        50,
        notesTop + 18,
        { width: 495 }
      );

    doc
      .fontSize(10)
      .fillColor('#6b7280')
      .text(
        'Thank you for working with North Via Marketing. If you have any questions about this invoice, please contact us using the details above.',
        50,
        735,
        { width: 495, align: 'center' }
      );

    doc.end();
  });
}
