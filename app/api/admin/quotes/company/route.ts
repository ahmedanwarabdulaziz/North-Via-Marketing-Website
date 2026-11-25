import { NextResponse } from 'next/server';
import { getCompany, saveCompany } from '@/lib/sales-docs';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ company: await getCompany() });
}

export async function PUT(request: Request) {
  try {
    return NextResponse.json({ company: await saveCompany(await request.json()) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}
