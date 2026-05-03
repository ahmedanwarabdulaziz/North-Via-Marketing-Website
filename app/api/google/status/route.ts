import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const tokensCookie = request.cookies.get('google_tokens');
  return NextResponse.json({ connected: !!tokensCookie });
}
