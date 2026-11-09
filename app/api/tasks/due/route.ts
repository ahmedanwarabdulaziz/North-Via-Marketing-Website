import { isAutomationRequest, unauthorized } from '@/lib/automation-auth';
import { sendDueReminders, sendMorningDigest, sendWeeklySummary } from '@/lib/task-telegram';
import { runWebsiteChecks } from '@/lib/website-monitor';
import { runCriticalChecks } from '@/lib/critical-alerts';
import { checkInboxes } from '@/lib/email/inbox';
import { summarizeFinishedChats } from '@/lib/chat-history';
import { runCompetitorWatch, sendWeeklyCompetitorReports } from '@/lib/competitor-telegram';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Called every 5 minutes by n8n on the VPS. Sends every reminder due before the next run
 * (a 5:33 task is reminded at 5:30; missed ones catch up on the next run) and rings the phone
 * for timed ones, once a day from 9 AM Cairo the morning digest, on Sundays from 8 PM Cairo
 * the week-ahead summary, checks the client websites so a site going down rings within minutes.
 */
async function run(request: Request) {
  if (!isAutomationRequest(request)) return unauthorized();
  const now = new Date();
  const [reminders, digest, weekly, websites, critical, email, chats, competitors] = await Promise.all([
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
    runCriticalChecks(now).catch((error) => {
      console.error('Critical checks failed:', error);
      return { error: error instanceof Error ? error.message : 'Critical checks failed' };
    }),
    checkInboxes(now).catch((error) => {
      console.error('Email check failed:', error);
      return { error: error instanceof Error ? error.message : 'Email check failed' };
    }),
    // Chats quiet for 30 minutes get a short summary with client tags, for finding them later.
    summarizeFinishedChats(now).catch((error) => {
      console.error('Chat summaries failed:', error);
      return { error: error instanceof Error ? error.message : 'Chat summaries failed' };
    }),
    // Competitors: Instagram every 3 h, website and Google daily; alerts for offers; Monday report.
    Promise.all([runCompetitorWatch(), sendWeeklyCompetitorReports(now)]).catch((error) => {
      console.error('Competitor watch failed:', error);
      return { error: error instanceof Error ? error.message : 'Competitor watch failed' };
    }),
  ]);
  const failed = 'error' in reminders && 'error' in digest;
  return Response.json({ reminders, digest, weekly, websites, critical, email, chats, competitors }, { status: failed ? 500 : 200 });
}

export const POST = run;
export const GET = run;
