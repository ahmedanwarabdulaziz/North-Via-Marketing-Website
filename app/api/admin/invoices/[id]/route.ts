import { NextResponse } from 'next/server';
import { updateAdminInvoice } from '@/lib/admin-ops';
import { revalidatePath } from 'next/cache';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const data = await request.json();
    await updateAdminInvoice(id, data);
    revalidatePath('/admin/invoices');
    revalidatePath(`/admin/invoices/${id}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update invoice:', error);
    return NextResponse.json({ success: false, error: 'Failed to update invoice' }, { status: 500 });
  }
}
