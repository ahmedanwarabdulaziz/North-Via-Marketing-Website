import { NextRequest, NextResponse } from 'next/server';
import { decodeTokens, getAuthenticatedClient } from '@/app/lib/google-auth';

export async function GET(request: NextRequest) {
  const tokensCookie = request.cookies.get('google_tokens');

  if (!tokensCookie) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const tokens = decodeTokens(tokensCookie.value);
  if (!tokens) {
    return NextResponse.json({ error: 'Invalid tokens' }, { status: 401 });
  }

  try {
    const oauth2Client = getAuthenticatedClient(tokens);

    // List accounts using direct REST call
    const response = await oauth2Client.request({
      url: 'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
      method: 'GET',
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = response.data as any;

    return NextResponse.json({
      accounts: data.accounts || [],
    });
  } catch (error: unknown) {
    const err = error as { message?: string; response?: { data?: unknown; status?: number } };
    console.error('Error fetching accounts:', JSON.stringify({
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
    }, null, 2));
    return NextResponse.json({ 
      error: 'Failed to fetch accounts',
      details: err.response?.data || err.message,
      status: err.response?.status,
    }, { status: 500 });
  }
}
