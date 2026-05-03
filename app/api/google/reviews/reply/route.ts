import { NextRequest, NextResponse } from 'next/server';
import { decodeTokens, getAuthenticatedClient } from '@/app/lib/google-auth';

export async function POST(request: NextRequest) {
  const tokensCookie = request.cookies.get('google_tokens');

  if (!tokensCookie) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const tokens = decodeTokens(tokensCookie.value);
  if (!tokens) {
    return NextResponse.json({ error: 'Invalid tokens' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { reviewName, comment } = body;

    if (!reviewName || !comment) {
      return NextResponse.json(
        { error: 'reviewName and comment are required' },
        { status: 400 }
      );
    }

    const oauth2Client = getAuthenticatedClient(tokens);

    // Publish reply to the review
    const response = await oauth2Client.request({
      url: `https://mybusiness.googleapis.com/v4/${reviewName}/reply`,
      method: 'PUT',
      data: {
        comment: comment,
      },
    });

    return NextResponse.json({
      success: true,
      reply: response.data,
    });
  } catch (error) {
    console.error('Error publishing reply:', error);
    return NextResponse.json({ error: 'Failed to publish reply' }, { status: 500 });
  }
}
