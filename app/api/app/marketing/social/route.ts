import { appRoute } from '@/lib/app-auth';
import { clientNames } from '@/lib/app-api';
import { socialOverview } from '@/lib/social-sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/** Facebook and Instagram followers per client, with today's and this week's change. */
export const GET = appRoute(async () => {
  const [names, stats] = await Promise.all([clientNames(), socialOverview()]);
  return {
    clients: stats
      .map((s) => ({
        clientId: s.clientId,
        clientName: names.get(s.clientId) || 'Client',
        pages: s.accounts.map((a) => ({ name: a.pageName, instagram: a.igUsername || null, error: a.lastError || null })),
        facebook: s.fb ?? null,
        instagram: s.ig ?? null,
        waitingComments: s.waiting,
        latest: s.latest.map((p) => ({ platform: p.platform, createdTime: p.createdTime, message: (p.message || '').slice(0, 200), permalink: p.permalink || null })),
      }))
      .sort((a, b) => a.clientName.localeCompare(b.clientName)),
  };
});
