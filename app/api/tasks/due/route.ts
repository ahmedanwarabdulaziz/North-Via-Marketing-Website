import { isAutomationRequest, unauthorized } from '@/lib/automation-auth';
import { sendDueReminders, sendMorningDigest, sendWeeklySummary } from '@/lib/task-telegram';
import { runWebsiteChecks } from '@/lib/website-monitor';
import { runCriticalChecks } from '@/lib/critical-alerts';
import { checkInboxes, sendSkippedDigest } from '@/lib/email/inbox';
import { summarizeFinishedChats } from '@/lib/chat-history';
import { runCompetitorWatch, sendWeeklyCompetitorReports } from '@/lib/competitor-telegram';
import { runAdsWatch } from '@/lib/ads-watch';
import { runHealthChecks, writeHeartbeat } from '@/lib/health';
import { sendMorningAppSummary } from '@/lib/app-summary';

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
  await writeHeartbeat(now).catch((error) => console.error('Heartbeat failed:', error));
  const [reminders, digest, weekly, websites, critical, email, chats, competitors, ads, skipped, health, summary] = await Promise.all([
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
    // Stopped Google / Meta ads: checked hourly, alerts (ring + app push) only on a change.
    runAdsWatch().catch((error) => {
      console.error('Ads watch failed:', error);
      return { error: error instanceof Error ? error.message : 'Ads watch failed' };
    }),
    // 9 PM Cairo: one app notification about the emails skipped today, so nothing stays hidden.
    sendSkippedDigest(now).catch((error) => {
      console.error('Skipped digest failed:', error);
      return { error: error instanceof Error ? error.message : 'Skipped digest failed' };
    }),
    // Connections that broke (inbox not read, Google / Facebook sign-in failed): alert once, with a reconnect link.
    runHealthChecks().catch((error) => {
      console.error('Health checks failed:', error);
      return { error: error instanceof Error ? error.message : 'Health checks failed' };
    }),
    // 9 AM Cairo: the day in one app notification (with 🎙 Ask Anwarz on the watch).
    sendMorningAppSummary(now).catch((error) => {
      console.error('Morning app summary failed:', error);
      return { error: error instanceof Error ? error.message : 'Morning app summary failed' };
    }),
  ]);
  const failed = 'error' in reminders && 'error' in digest;
  return Response.json({ reminders, digest, weekly, websites, critical, email, chats, competitors, ads, skipped, health, summary }, { status: failed ? 500 : 200 });
}

export const POST = run;
export const GET = run;
