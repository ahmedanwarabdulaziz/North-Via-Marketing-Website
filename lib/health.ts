import { listConnections } from './app-connect';
import { getSetting, setSetting } from './data/store';
import { ringPhone } from './ntfy';

// "Is the automation itself healthy?" Checked on every 5-minute run: inboxes that stopped being read,
// Google / Facebook sign-ins that failed or are about to expire. Alerts (phone + app) only when
// something breaks or gets fixed, never repeatedly. Each alert opens More → Connections, where one tap
// reconnects. The job itself writes a heartbeat; the app's Home warns when it goes quiet.

const STATE = 'health_state';
const HEARTBEAT = 'automation_heartbeat';

export async function writeHeartbeat(now = new Date()) {
  await setSetting(HEARTBEAT, { at: now.toISOString() });
}

export async function runHealthChecks() {
  const rows = await listConnections();
  const broken = new Map(rows.filter((r) => !r.ok).map((r) => [r.id, r]));
  const before = (await getSetting<{ broken?: string[] }>(STATE).catch(() => null))?.broken || [];
  const newly = [...broken.values()].filter((r) => !before.includes(r.id));
  const fixed = before.filter((id) => !broken.has(id));
  if (!newly.length && !fixed.length) return { broken: broken.size, alerted: 0 };
  await setSetting(STATE, { broken: [...broken.keys()], at: new Date().toISOString() });

  if (newly.length) {
    await ringPhone({
      title: newly.length === 1 ? `⚠️ Reconnect ${newly[0].name}` : `⚠️ ${newly.length} connections need you`,
      message: newly.map((r) => `${r.name}: ${r.problem}`).join('\n').slice(0, 500) + '\nTap to reconnect.',
      priority: 4,
      tags: ['electric_plug'],
      channel: 'attention',
      data: { type: 'connections' },
    });
  }
  if (fixed.length && !newly.length) {
    const { sendPush } = await import('./push');
    await sendPush({ title: '✅ Connections back to normal', body: `${fixed.length} fixed. Everything is syncing again.`, channel: 'info', data: { type: 'connections' } });
  }
  return { broken: broken.size, alerted: newly.length, fixed: fixed.length };
}
