import { appRoute } from '@/lib/app-auth';
import { appClient } from '@/lib/app-api';
import { listClientProfiles } from '@/lib/admin-ops';
import { listOpenTasks } from '@/lib/tasks';
import { websiteOverview } from '@/lib/website-monitor';

export const dynamic = 'force-dynamic';

/** Every client, A–Z, with open task count and websites down. */
export const GET = appRoute(async () => {
  const [clients, open, sites] = await Promise.all([listClientProfiles(), listOpenTasks(), websiteOverview().catch(() => null)]);
  const openBy = new Map<string, number>();
  for (const t of open) if (t.client_id) openBy.set(t.client_id, (openBy.get(t.client_id) || 0) + 1);
  const downBy = new Map<string, number>();
  for (const s of sites?.down || []) downBy.set(s.clientId, (downBy.get(s.clientId) || 0) + 1);
  return {
    clients: clients
      .filter((c) => c.id)
      .map((c) => ({ ...appClient(c), openTasks: openBy.get(c.id!) || 0, sitesDown: downBy.get(c.id!) || 0 }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
});
