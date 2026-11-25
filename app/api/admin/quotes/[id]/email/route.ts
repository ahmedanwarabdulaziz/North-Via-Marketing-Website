import { NextResponse } from 'next/server';
import { getDocById } from '@/lib/sales-docs';
import { MailInputError, sendDocEmail } from '@/lib/sales-doc-mail';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const doc = await getDocById(id);
    if (!doc) return NextResponse.json({ error: 'المستند غير موجود' }, { status: 404 });
    await sendDocEmail(doc, await request.json());
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = error instanceof MailInputError ? 400 : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : 'تعذر الإرسال' }, { status });
  }
}
