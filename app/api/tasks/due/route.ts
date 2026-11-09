import { isAutomationRequest, unauthorized } from '@/lib/automation-auth';
import { sendDueReminders, sendMorningDigest, sendWeeklySummary } from '@/lib/task-telegram';
import { runWebsiteChecks } from '@/lib/website-monitor';
import { sendPrayerAlarms } from '@/lib/prayer';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Called every 5 minutes by n8n on the VPS. Sends every reminder due before the next run
 * (a 5:33 task is reminded at 5:30; missed ones catch up on the next run) and rings the phone
 * for timed ones, once a day from 9 AM Cairo the morning digest, on Sundays from 8 PM Cairo
 * the week-ahead summary, checks the client websites so a site going down rings within minutes,
 * and sends the prayer alarms (lib/prayer.ts).
 */
async function run(request: Request) {
  if (!isAutomationRequest(request)) return unauthorized();
  const now = new Date();
  const [reminders, digest, weekly, websites, prayers] = await Promise.all([
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
    // Alerts (and rings) only on a change, so running this often doesn't repeat them.
    runWebsiteChecks().catch((error) => {
      console.error('Website checks failed:', error);
      return { error: error instanceof Error ? error.message : 'Website checks failed' };
    }),
    sendPrayerAlarms(now).catch((error) => {
      console.error('Prayer alarms failed:', error);
      return { error: error instanceof Error ? error.message : 'Prayer alarms failed' };
    }),
  ]);
  const failed = 'error' in reminders && 'error' in digest;
  return Response.json({ reminders, digest, weekly, websites, prayers }, { status: failed ? 500 : 200 });
}

export const POST = run;
export const GET = run;
