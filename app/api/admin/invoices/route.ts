import { NextResponse } from 'next/server';
import { createAdminInvoice, updateAdminInvoice } from '@/lib/admin-ops';
import { revalidatePath } from 'next/cache';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const invoice = await createAdminInvoice(data);
    revalidatePath('/admin/invoices');
    return NextResponse.json({ success: true, invoice });
  } catch (error) {
    console.error('Failed to create invoice:', error);
    return NextResponse.json({ success: false, error: 'Failed to create invoice' }, { status: 500 });
  }
}
