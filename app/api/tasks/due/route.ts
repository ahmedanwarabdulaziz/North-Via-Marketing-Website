import { isAutomationRequest, unauthorized } from '@/lib/automation-auth';
import { sendDueReminders, sendMorningDigest } from '@/lib/task-telegram';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Called every minute by n8n on the VPS. Sends task reminders whose time has come
 * (missed ones catch up on the next run) and, once a day after 8 AM Cairo, the
 * morning digest of today's, overdue and unfinished tasks.
 */
async function run(request: Request) {
  if (!isAutomationRequest(request)) return unauthorized();
  const now = new Date();
  const [reminders, digest] = await Promise.all([
    sendDueReminders(now).catch((error) => {
      console.error('Task reminders failed:', error);
      return { error: error instanceof Error ? error.message : 'Task reminders failed' };
    }),
    sendMorningDigest(now).catch((error) => {
      console.error('Task digest failed:', error);
      return { error: error instanceof Error ? error.message : 'Task digest failed' };
    }),
  ]);
  const failed = 'error' in reminders && 'error' in digest;
  return Response.json({ reminders, digest }, { status: failed ? 500 : 200 });
}

export const POST = run;
export const GET = run;
