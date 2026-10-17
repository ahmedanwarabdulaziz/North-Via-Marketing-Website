import { getDoc, listDocs, setDoc, updateDoc } from './data/store';
import { decryptString, encryptString } from './encryption';
import { cairoDay } from './social-sync';
import { allowedChatIds, escapeHtml as h, sendMessage } from './telegram';

// Microsoft Clarity: how visitors behave on a client's site (scroll depth, rage and
// dead clicks, quick-backs, script errors). The API only covers the last 1–3 days and
// allows 10 calls a day per project, so a snapshot of the last 24 hours is saved once
// each morning and longer periods are built from those snapshots.

const API = 'https://www.clarity.ms/export-data/api/v1/project-live-insights';
const DAILY = 'clarity_daily' as const;
const CAPTURE_FROM_HOUR = 10; // Cairo; the snapshot is taken on the first hourly run at or after 10 AM

export interface ClaritySnapshot {
  clientId: string;
  day: string;
  sessions?: number;
  botSessions?: number;
  pagesPerSession?: number;
  scrollDepth?: number;
  activeSeconds?: number;
  rageClickPct?: number;
  deadClickPct?: number;
  quickbackPct?: number;
  scriptErrorPct?: number;
  raw: unknown;
  capturedAt: string;
}

type Insight = { metricName?: string; information?: Array<Record<string, unknown>> };

const n = (v: unknown) => {
  const x = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(x) ? x : undefined;
};

export class ClarityError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

async function callClarity(token: string, numOfDays = 1): Promise<Insight[]> {
  const res = await fetch(`${API}?numOfDays=${numOfDays}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(20_000),
    cache: 'no-store',
  });
  if (res.status === 401 || res.status === 403) throw new ClarityError('Clarity rejected the API token. Create a new one in Clarity → Settings → Data Export.', res.status);
  if (res.status === 429) throw new ClarityError('Clarity’s daily limit (10 requests) is used up for this project. It resets tomorrow.', 429);
  if (!res.ok) throw new ClarityError(`Clarity API error ${res.status}`, res.status);
  const data = await res.json();
  if (!Array.isArray(data)) throw new ClarityError('Unexpected response from Clarity.');
  return data as Insight[];
}

/** Reads the numbers we track out of Clarity's response (names compared loosely, values are often strings). */
export function parseInsights(insights: Insight[]) {
  const find = (name: string) => insights.find((i) => (i.metricName || '').replace(/\s/g, '').toLowerCase() === name.toLowerCase())?.information?.[0] || {};
  const pct = (name: string) => n(find(name).sessionsWithMetricPercentage);
  const traffic = find('Traffic');
  const engagement = find('EngagementTime');
  return {
    sessions: n(traffic.totalSessionCount),
    botSessions: n(traffic.totalBotSessionCount),
    pagesPerSession: n(traffic.PagesPerSessionPercentage ?? traffic.pagesPerSessionPercentage),
    scrollDepth: n(find('ScrollDepth').averageScrollDepth),
    activeSeconds: n(engagement.activeTime ?? engagement.ActiveTime),
    rageClickPct: pct('RageClickCount'),
    deadClickPct: pct('DeadClickCount'),
    quickbackPct: pct('QuickbackClick'),
    scriptErrorPct: pct('ScriptErrorCount'),
  };
}

// ---------- Per-client token ----------

/** Checks the token against Clarity (one of the day's 10 calls) and saves it encrypted, with today's snapshot. */
export async function saveClarityToken(clientId: string, token: string) {
  const clean = token.trim();
  if (clean.length < 40) throw new Error('Paste the full API token from Clarity → Settings → Data Export.');
  const insights = await callClarity(clean, 1);
  await updateDoc('clients', clientId, { clarityApiTokenEncrypted: encryptString(clean), updatedAt: new Date().toISOString() });
  await storeSnapshot(clientId, insights);
  return parseInsights(insights);
}

export async function removeClarityToken(clientId: string) {
  await updateDoc('clients', clientId, { clarityApiTokenEncrypted: null, updatedAt: new Date().toISOString() });
}

async function storeSnapshot(clientId: string, insights: Insight[]) {
  const day = cairoDay();
  const snapshot: ClaritySnapshot = { clientId, day, ...parseInsights(insights), raw: insights, capturedAt: new Date().toISOString() };
  await setDoc(DAILY, `${clientId}:${day}`, snapshot);
  return snapshot;
}

export async function clarityConnected(clientId: string) {
  const c = await getDoc<{ clarityApiTokenEncrypted?: string }>('clients', clientId);
  return Boolean(c?.clarityApiTokenEncrypted);
}

export async function listClaritySnapshots(clientId: string) {
  const rows = await listDocs<ClaritySnapshot>(DAILY, { where: { clientId } });
  return rows.sort((a, b) => a.day.localeCompare(b.day));
}

// ---------- Daily capture and alerts (run on n8n's hourly call) ----------

/** One snapshot per client per Cairo day, taken on the first hourly run at or after 10 AM. */
export async function captureClarityDaily(now = new Date()) {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', hour: '2-digit', hourCycle: 'h23' }).format(now));
  if (hour < CAPTURE_FROM_HOUR) return { captured: 0, alerts: 0, errors: [] as string[] };
  const day = cairoDay(now);
  const clients = (await listDocs<{ brandName: string; clarityApiTokenEncrypted?: string }>('clients')).filter((c) => c.clarityApiTokenEncrypted);
  let captured = 0;
  let alerts = 0;
  const errors: string[] = [];
  for (const c of clients) {
    if (await getDoc(DAILY, `${c.id}:${day}`)) continue;
    try {
      const snapshot = await storeSnapshot(c.id, await callClarity(decryptString(c.clarityApiTokenEncrypted!), 1));
      captured++;
      alerts += await alertOnSpikes(c.id, c.brandName, snapshot);
    } catch (error) {
      errors.push(`${c.brandName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { captured, alerts, errors };
}

const SIGNALS: Array<{ key: keyof ClaritySnapshot; label: string; hint: string }> = [
  { key: 'rageClickPct', label: 'Rage clicks', hint: 'People clicking repeatedly in frustration, often a button or link that doesn’t work.' },
  { key: 'deadClickPct', label: 'Dead clicks', hint: 'Clicks on things that do nothing (images or text that look clickable).' },
  { key: 'scriptErrorPct', label: 'Script errors', hint: 'JavaScript errors in visitors’ browsers; parts of the page may be broken.' },
  { key: 'quickbackPct', label: 'Quick-backs', hint: 'Visitors leaving a page within seconds, often the wrong page for what they expected.' },
];

/**
 * Alerts when a frustration signal at least doubles against the previous 7 days'
 * average (and affects at least 5% of 20+ sessions), so normal noise stays quiet.
 */
async function alertOnSpikes(clientId: string, clientName: string, today: ClaritySnapshot) {
  if ((today.sessions || 0) < 20) return 0;
  const history = (await listClaritySnapshots(clientId)).filter((s) => s.day < today.day).slice(-7);
  if (history.length < 3) return 0;
  const lines: string[] = [];
  for (const s of SIGNALS) {
    const now = today[s.key] as number | undefined;
    const past = history.map((x) => x[s.key] as number | undefined).filter((v): v is number => v !== undefined);
    if (now === undefined || past.length < 3) continue;
    const avg = past.reduce((a, b) => a + b, 0) / past.length;
    if (now >= 5 && now >= avg * 2) lines.push(`• <b>${s.label}</b>: ${now.toFixed(1)}% of sessions (usually ${avg.toFixed(1)}%)\n  <i>${s.hint}</i>`);
  }
  if (!lines.length) return 0;
  const text = [`🧭 <b>Clarity: unusual behaviour on ${h(clientName)}’s website</b>`, `Last 24 hours, ${today.sessions} sessions`, '', ...lines, '', 'Open the Clarity recordings to see what visitors ran into.'].join('\n');
  const chats = allowedChatIds();
  for (const chat of chats) await sendMessage(chat, { text, buttons: [[{ text: '🎥 Open Clarity', url: 'https://clarity.microsoft.com/projects' }]] });
  return chats.length;
}

// ---------- Report numbers ----------

/** Averages (and summed sessions) of the daily snapshots in a Cairo-day range, or null if none. */
export function clarityPeriod(snapshots: ClaritySnapshot[], start: string, end: string) {
  // A snapshot taken on day D covers mostly D-1, so it's counted for D-1.
  const inRange = snapshots.filter((s) => {
    const covered = new Date(Date.parse(`${s.day}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
    return covered >= start && covered <= end;
  });
  if (!inRange.length) return null;
  const avg = (key: keyof ClaritySnapshot) => {
    const v = inRange.map((s) => s[key] as number | undefined).filter((x): x is number => x !== undefined);
    return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null;
  };
  return {
    days: inRange.length,
    sessions: inRange.reduce((a, s) => a + (s.sessions || 0), 0),
    scrollDepth: avg('scrollDepth'),
    rageClickPct: avg('rageClickPct'),
    deadClickPct: avg('deadClickPct'),
    quickbackPct: avg('quickbackPct'),
  };
}
