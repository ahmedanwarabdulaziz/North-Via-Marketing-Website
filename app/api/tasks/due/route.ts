import { isAutomationRequest, unauthorized } from '@/lib/automation-auth';
import { sendDueReminders, sendMorningDigest, sendWeeklySummary } from '@/lib/task-telegram';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Called every hour, on the hour, by n8n on the VPS. Sends every reminder due before
 * the next run (a 5:35 task is reminded at 5:00; missed ones catch up on the next run),
 * once a day from 9 AM Cairo, the morning digest of today's, overdue and unfinished tasks,
 * and on Sundays from 8 PM Cairo, the week-ahead summary.
 */
async function run(request: Request) {
  if (!isAutomationRequest(request)) return unauthorized();
  const now = new Date();
  const [reminders, digest, weekly] = await Promise.all([
    sendDueReminders(now).catch((error) => {
      console.error('Task reminders failed:', error);
      return { error: error instanceof Error ? error.message : 'Task reminders failed' };
    }),
    sendMorningDigest(now).catch((error) => {
      console.error('Task digest failed:', error);
      return { error: error instanceof Error ? error.message : 'Task digest failed' };
    }),
    sendWeeklySummary(now).catch((error) => {
      console.error('Weekly summary failed:', error);
      return { error: error instanceof Error ? error.message : 'Weekly summary failed' };
    }),
  ]);
  const failed = 'error' in reminders && 'error' in digest;
  return Response.json({ reminders, digest, weekly }, { status: failed ? 500 : 200 });
}

export const POST = run;
export const GET = run;
