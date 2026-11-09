import { verifyTaskAction } from '@/lib/action-links';
import { applyTaskActionFromAlarm } from '@/lib/task-telegram';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * The ☑️ Done / 💤 1 hour / 📅 Tomorrow buttons on a phone alarm (ntfy) call this.
 * The link is signed for one task and one action and expires after 3 days.
 */
async function run(request: Request) {
  const target = verifyTaskAction(new URL(request.url).searchParams);
  if (!target) return new Response('Invalid or expired link', { status: 403 });
  try {
    const result = await applyTaskActionFromAlarm(target.taskId, target.action);
    return new Response(result.message, { status: result.ok ? 200 : 404 });
  } catch (error) {
    console.error('Alarm action failed:', error);
    return new Response('Failed', { status: 500 });
  }
}

export const POST = run;
export const GET = run;
