import { aiUsageDay, groqFetch, listAiUsage, type AiUsageRow, type GroqLimits } from './ai-usage';
import { OutgoingMessage, escapeHtml as h, truncate } from './telegram';

// "🤖 AI usage" in the bot: Groq's real remaining limits (from its response headers) and the
// app's own count of Gemini calls, since Google doesn't expose the remaining quota to an API key.

const FEATURE_LABELS: Record<string, string> = {
  tasks: 'Tasks',
  reviews: 'Review replies',
  comments: 'Comment checks',
  chat: 'Website chat',
  check: 'Live checks',
};

function compact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
}

function cairoTime(iso: string) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));
}

/** Groq's "2h3m4.5s" → "2h 3m"; "59.6s" → "1m". */
function resetIn(value?: string) {
  if (!value) return '';
  const m = value.match(/(?:(\d+)h)?(?:(\d+)m(?!s))?(?:([\d.]+)s)?/);
  if (!m) return value;
  const [hours, minutes, seconds] = [Number(m[1] || 0), Number(m[2] || 0), Number(m[3] || 0)];
  if (hours) return `${hours}h ${minutes}m`;
  if (minutes) return `${minutes}m`;
  return seconds ? `${Math.max(1, Math.round(seconds / 60))}m` : 'now';
}

function shortModel(model: string) {
  return model.replace(/^openai\//, '').replace(/^models\//, '');
}

function failing(row: AiUsageRow) {
  return Boolean(row.last_error_at && (!row.last_ok_at || row.last_error_at > row.last_ok_at));
}

function shortError(error: string | null) {
  if (!error) return '';
  if (/\b429\b|rate.?limit|quota/i.test(error)) return 'rate limit';
  if (/abort|timed? ?out/i.test(error)) return 'timed out';
  if (/\b401\b|invalid.?api.?key/i.test(error)) return 'invalid key';
  if (/\b404\b|not found|does not exist|no longer available/i.test(error)) return 'model not available';
  if (/\b5\d\d\b|overloaded|high demand/i.test(error)) return 'Google/Groq busy';
  return truncate(error.replace(/\[GoogleGenerativeAI Error\]:\s*/, ''), 60);
}

/** Today's rows merged per provider + model. */
function byModel(rows: AiUsageRow[]) {
  const merged = new Map<string, AiUsageRow>();
  for (const row of rows) {
    const key = `${row.provider}|${row.model}`;
    const prev = merged.get(key);
    if (!prev) {
      merged.set(key, { ...row });
      continue;
    }
    prev.calls += row.calls;
    prev.failures += row.failures;
    prev.rate_limited += row.rate_limited;
    prev.tokens += Number(row.tokens);
    if (row.last_ok_at && (!prev.last_ok_at || row.last_ok_at > prev.last_ok_at)) prev.last_ok_at = row.last_ok_at;
    if (row.last_error_at && (!prev.last_error_at || row.last_error_at > prev.last_error_at)) {
      prev.last_error_at = row.last_error_at;
      prev.last_error = row.last_error;
    }
    if (row.limits && (!prev.limits || row.limits.readAt > prev.limits.readAt)) prev.limits = row.limits;
  }
  return [...merged.values()].sort((a, b) => b.calls - a.calls);
}

function modelLines(row: AiUsageRow) {
  const status = failing(row) ? '⚠️' : '🟢';
  const parts = [`${row.calls} call${row.calls === 1 ? '' : 's'}`];
  if (row.failures) parts.push(`${row.failures} failed`);
  if (row.rate_limited) parts.push(`${row.rate_limited} limited`);
  if (Number(row.tokens)) parts.push(`${compact(Number(row.tokens))} tokens`);
  const lines = [`${status} <b>${h(shortModel(row.model))}</b>: ${parts.join(' · ')}`];
  if (failing(row)) lines.push(`    last error ${cairoTime(row.last_error_at!)}: ${h(shortError(row.last_error))}`);
  return lines;
}

function groqLimitLines(limits: GroqLimits) {
  const lines: string[] = [];
  if (limits.requestsLimit !== undefined && limits.requestsLeft !== undefined) {
    lines.push(`    Requests left today: <b>${compact(limits.requestsLeft)}</b> / ${compact(limits.requestsLimit)}${limits.requestsReset ? ` · full again in ${resetIn(limits.requestsReset)}` : ''}`);
  }
  if (limits.tokensLimit !== undefined && limits.tokensLeft !== undefined) {
    lines.push(`    Tokens left this minute: ${compact(limits.tokensLeft)} / ${compact(limits.tokensLimit)}`);
  }
  if (lines.length) lines.push(`    <i>as of ${cairoTime(limits.readAt)}</i>`);
  return lines;
}

export async function aiUsageScreen(note?: string): Promise<OutgoingMessage> {
  const rows = await listAiUsage(7);
  const today = aiUsageDay();
  const todayRows = rows.filter((r) => r.day === today);
  const models = byModel(todayRows);
  const groq = models.filter((m) => m.provider === 'groq');
  const gemini = models.filter((m) => m.provider === 'gemini');

  const lines = ['🤖 <b>AI usage — today</b>', ''];

  lines.push('⚡ <b>Groq</b> <i>(first choice for tasks, website chat)</i>');
  if (!process.env.GROQ_API_KEY) lines.push('    ❌ No GROQ_API_KEY set.');
  else if (!groq.length) lines.push('    <i>No calls yet today. Tap “Check Groq now” for the live limits.</i>');
  for (const row of groq) {
    lines.push(...modelLines(row));
    if (row.limits) lines.push(...groqLimitLines(row.limits));
  }

  lines.push('', '✨ <b>Gemini</b> <i>(backup for tasks; review replies, comment checks)</i>');
  if (!gemini.length) lines.push('    <i>No calls yet today.</i>');
  for (const row of gemini) lines.push(...modelLines(row));
  lines.push('    <i>Google doesn’t share the remaining quota with the API; these are the app’s own counts. Exact limits: AI Studio (button below).</i>');

  const features = new Map<string, number>();
  for (const r of todayRows) features.set(r.feature, (features.get(r.feature) || 0) + r.calls);
  if (features.size) {
    lines.push('', `📋 <b>By feature:</b> ${[...features.entries()].sort((a, b) => b[1] - a[1]).map(([f, n]) => `${FEATURE_LABELS[f] || f} ${n}`).join(' · ')}`);
  }

  const week = { groq: 0, gemini: 0 } as Record<string, number>;
  for (const r of rows) week[r.provider] = (week[r.provider] || 0) + r.calls;
  lines.push(`🗓 <b>Last 7 days:</b> Groq ${week.groq} · Gemini ${week.gemini} calls`);
  if (note) lines.push('', note);

  return {
    text: lines.join('\n'),
    buttons: [
      [
        { text: '🔄 Refresh', callback_data: 'm:ai' },
        { text: '⚡ Check Groq now', callback_data: 'm:ai:live' },
      ],
      [
        { text: '📊 Gemini quota (AI Studio)', url: 'https://aistudio.google.com/usage' },
        { text: '📊 Groq usage', url: 'https://console.groq.com/dashboard/usage' },
      ],
      [{ text: '⬅️ Back to menu', callback_data: 'm:home' }],
    ],
  };
}

/** A tiny Groq call (counted as a "live check") just to read the current limits. */
export async function checkGroqNow() {
  if (!process.env.GROQ_API_KEY) return '❌ <i>No GROQ_API_KEY set.</i>';
  const model = process.env.GROQ_TASK_MODEL || 'openai/gpt-oss-120b';
  try {
    await groqFetch(
      'chat/completions',
      { model, max_tokens: 16, reasoning_effort: 'low', messages: [{ role: 'user', content: 'Reply with: ok' }] },
      { model, feature: 'check', timeoutMs: 15_000 }
    );
    return '✅ <i>Groq answered just now.</i>';
  } catch (error) {
    return `⚠️ <i>Groq: ${h(shortError(error instanceof Error ? error.message : String(error)))}</i>`;
  }
}
