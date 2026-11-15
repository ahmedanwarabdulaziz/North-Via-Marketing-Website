import { appRoute } from '@/lib/app-auth';
import { appComment, clientNames } from '@/lib/app-api';
import { listCommentQueue } from '@/lib/social-sync';

export const dynamic = 'force-dynamic';

/** Facebook and Instagram comments waiting for Ahmed (risky ones first), with the AI's draft reply. GET ?client=<id> */
export const GET = appRoute(async (request) => {
  const client = new URL(request.url).searchParams.get('client');
  const [names, queue] = await Promise.all([clientNames(), listCommentQueue()]);
  const risk = { high: 0, watch: 1, none: 2 } as Record<string, number>;
  const comments = queue
    .filter((c) => !client || c.clientId === client)
    .sort((a, b) => (risk[a.riskLevel || 'none'] ?? 2) - (risk[b.riskLevel || 'none'] ?? 2) || b.createdTime.localeCompare(a.createdTime))
    .slice(0, 100);
  return { comments: comments.map((c) => appComment(c, names)) };
});
