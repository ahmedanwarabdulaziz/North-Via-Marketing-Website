import { clientsWithAds } from './ads-metrics';
import { generateSuggestions } from './ads-suggest';
import { getSetting, setSetting } from './data/store';
import { sendPush } from './push';

// The automatic weekly look at every client's Google Ads account. Each client is checked at most
// once every 7 days (called daily; the ones already done are skipped), within a time budget so one
// slow account can't use up the whole run. It only saves pending ideas and sends one phone
// notification: nothing changes in Google Ads until Ahmed accepts a card.

const SETTING = 'ads_ideas_checked'; // { [clientId]: ISO time of the last check }
const EVERY_MS = 7 * 86_400_000;

export async function runWeeklyAdsIdeas(opts: { budgetMs?: number; force?: boolean } = {}) {
  const deadline = Date.now() + (opts.budgetMs ?? 200_000);
  const checked = (await getSetting<Record<string, string>>(SETTING).catch(() => null)) || {};
  const clients = (await clientsWithAds()).filter((c) => c.id);
  // Longest-unchecked first.
  clients.sort((a, b) => (checked[a.id!] || '').localeCompare(checked[b.id!] || ''));

  const done: { client: string; ideas: number; problem?: string }[] = [];
  for (const c of clients) {
    const last = checked[c.id!] ? Date.parse(checked[c.id!]) : 0;
    if (!opts.force && Date.now() - last < EVERY_MS) continue;
    if (Date.now() > deadline - 60_000) break; // a check takes up to ~a minute
    try {
      const r = await generateSuggestions(c.id!);
      checked[c.id!] = new Date().toISOString();
      done.push({ client: c.brandName, ideas: r.created.length, problem: r.problems[0] });
      if (r.created.length) {
        await sendPush({
          title: `💡 ${r.created.length} Google Ads idea${r.created.length === 1 ? '' : 's'} for ${c.brandName}`,
          body: 'Open Marketing → Ideas to accept, edit or reject. Nothing changes until you approve.',
          channel: 'info',
          data: { type: 'ads_ideas', id: c.id! },
        }).catch((error) => console.error('Ads ideas push failed:', error));
      }
    } catch (error) {
      // Retry tomorrow; don't mark as checked.
      done.push({ client: c.brandName, ideas: 0, problem: error instanceof Error ? error.message.slice(0, 160) : 'failed' });
    }
  }
  await setSetting(SETTING, checked).catch(() => {});
  return { checked: done };
}
