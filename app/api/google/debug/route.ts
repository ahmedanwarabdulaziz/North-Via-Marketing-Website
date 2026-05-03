import { NextRequest, NextResponse } from 'next/server';
import { decodeTokens, getAuthenticatedClient } from '@/app/lib/google-auth';

export async function GET(request: NextRequest) {
  const tokensCookie = request.cookies.get('google_tokens');

  if (!tokensCookie) {
    return NextResponse.json({ error: 'Not authenticated - no cookie found' }, { status: 401 });
  }

  const tokens = decodeTokens(tokensCookie.value);
  if (!tokens) {
    return NextResponse.json({ error: 'Invalid tokens' }, { status: 401 });
  }

  const results: Record<string, unknown> = {
    tokenInfo: {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : 'none',
    },
  };

  try {
    const oauth2Client = getAuthenticatedClient(tokens);

    // Test 1: List accounts
    try {
      const accountsRes = await oauth2Client.request({
        url: 'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
        method: 'GET',
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      results.accounts = accountsRes.data;
    } catch (err: unknown) {
      const error = err as { message?: string; response?: { data?: unknown; status?: number } };
      results.accountsError = {
        message: error.message,
        data: error.response?.data,
        status: error.response?.status,
      };
    }

    // Test 2: If we have accounts, try to list locations for the first one
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accounts = (results.accounts as any)?.accounts;
    if (accounts?.length > 0) {
      const accountName = accounts[0].name;
      try {
        const locationsRes = await oauth2Client.request({
          url: `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations`,
          method: 'GET',
          params: {
            readMask: 'name,title,storefrontAddress',
          },
        });
        results.locations = locationsRes.data;
      } catch (err: unknown) {
        const error = err as { message?: string; response?: { data?: unknown; status?: number } };
        results.locationsError = {
          message: error.message,
          data: error.response?.data,
          status: error.response?.status,
        };
      }
    }

    return NextResponse.json(results, { status: 200 });
  } catch (err: unknown) {
    const error = err as { message?: string };
    return NextResponse.json({ ...results, generalError: error.message }, { status: 500 });
  }
}
