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

  const searchParams = request.nextUrl.searchParams;
  const accountId = searchParams.get('accountId');

  if (!accountId) {
    return NextResponse.json({ error: 'accountId is required' }, { status: 400 });
  }

  try {
    const oauth2Client = getAuthenticatedClient(tokens);

    // Step 1: Get locations for the account
    const locationsResponse = await oauth2Client.request({
      url: `https://mybusinessbusinessinformation.googleapis.com/v1/${accountId}/locations`,
      method: 'GET',
      params: {
        readMask: 'name,title,storefrontAddress',
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const locationsData = locationsResponse.data as any;
    const locations = locationsData.locations || [];

    // Step 2: Get reviews for each location
    const locationsWithReviews = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      locations.map(async (location: any) => {
        try {
          const reviewsResponse = await oauth2Client.request({
            url: `https://mybusiness.googleapis.com/v4/${location.name}/reviews`,
            method: 'GET',
          });

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const reviewsData = reviewsResponse.data as any;
          const allReviews = reviewsData.reviews || [];

          // Filter to unreplied reviews only
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const unrepliedReviews = allReviews.filter((review: any) => !review.reviewReply);

          return {
            ...location,
            reviews: unrepliedReviews,
            totalReviewCount: reviewsData.totalReviewCount || 0,
            averageRating: reviewsData.averageRating || 0,
          };
        } catch (err) {
          console.error(`Error fetching reviews for ${location.name}:`, err);
          return {
            ...location,
            reviews: [],
            totalReviewCount: 0,
            averageRating: 0,
            error: 'Failed to fetch reviews',
          };
        }
      })
    );

    return NextResponse.json({ locations: locationsWithReviews });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}
