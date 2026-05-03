import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/app/lib/google-auth';

export async function GET() {
  try {
    const url = getAuthUrl();
    return NextResponse.redirect(url);
  } catch (error) {
    console.error('Error generating auth URL:', error);
    return NextResponse.json({ error: 'Failed to initiate auth' }, { status: 500 });
  }
}
