import { isAutomationRequest, unauthorized } from '@/lib/automation-auth';
import { runWeeklyAdsIdeas } from '@/lib/ads-ideas-weekly';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Weekly look at every client's Google Ads for new keyword / negative keyword ideas.
// Called daily by Vercel Cron (GET) or n8n (POST); each client is only checked once a week.
async function run(request: Request) {
  if (!isAutomationRequest(request)) return unauthorized();
  try {
    return Response.json(await runWeeklyAdsIdeas());
  } catch (error) {
    console.error('Weekly ads ideas failed:', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
