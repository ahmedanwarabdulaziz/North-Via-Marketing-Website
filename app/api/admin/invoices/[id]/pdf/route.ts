import { NextRequest, NextResponse } from 'next/server';
import { getAdminInvoiceById } from '@/lib/admin-ops';
import { buildInvoiceNumber, generateInvoicePdfBuffer, invoicePdfFileName } from '@/lib/invoice';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const invoice = await getAdminInvoiceById(id);

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 });
  }

  const hydratedInvoice = {
    ...invoice,
    invoiceNumber: invoice.invoiceNumber || buildInvoiceNumber(invoice),
    standardAmount: Number(invoice.standardAmount || invoice.amount || 0),
    discountAmount: Number(invoice.discountAmount || 0),
    subtotalAmount: Number(invoice.subtotalAmount || invoice.amount || 0),
    totalAmount: Number(invoice.totalAmount || invoice.amount || 0),
    amount: Number(invoice.amount || invoice.totalAmount || 0),
  };

  const buffer = await generateInvoicePdfBuffer(hydratedInvoice);
  const download = request.nextUrl.searchParams.get('download') === '1';

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${invoicePdfFileName(hydratedInvoice)}"`,
      'Cache-Control': 'no-store',
    },
  });
}
