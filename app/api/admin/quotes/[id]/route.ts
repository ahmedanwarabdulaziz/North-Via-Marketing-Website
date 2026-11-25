import { NextResponse } from 'next/server';
import { deleteDoc, getDocById } from '@/lib/sales-docs';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await getDocById(id);
  return doc ? NextResponse.json({ doc }) : NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteDoc(id);
  return NextResponse.json({ ok: true });
}
