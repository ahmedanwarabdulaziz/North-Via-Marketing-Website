import { appRoute } from '@/lib/app-auth';
import { chatEngine, listChatFailures } from '@/lib/app-chat';
import { isLowBalance, openRouterBalance } from '@/lib/openrouter';

export const dynamic = 'force-dynamic';

/**
 * The Chat log screen: answers that went wrong (a change it couldn't prepare, a failed action,
 * a 👎), newest first, plus which engine answers now and the OpenRouter credit left.
 */
export const GET = appRoute(async () => {
  const [failures, engine, credit] = await Promise.all([listChatFailures(), chatEngine(), openRouterBalance().catch(() => null)]);
  return {
    engine,
    credit: credit ? { left: Math.round(credit.left * 100) / 100, used: Math.round(credit.used * 100) / 100, total: Math.round(credit.total * 100) / 100, low: isLowBalance(credit) } : null,
    failures: [...failures].reverse().slice(0, 150),
  };
});
