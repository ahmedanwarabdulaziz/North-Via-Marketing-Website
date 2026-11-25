import { NextResponse } from 'next/server';
import { listDocs, saveDoc } from '@/lib/sales-docs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json({ docs: await listDocs() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const doc = await saveDoc(await request.json());
    return NextResponse.json({ doc });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}
