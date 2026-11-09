import { availableChatModels, CHAT_MODELS } from './assistant';
import { listClientProfiles } from './admin-ops';
import { getSetting, listDocs, setSetting } from './data/store';
import { META_CONNECTIONS } from './meta';
import { isLowBalance, openRouterBalance, openRouterOn } from './openrouter';
import { ringPhone, type Ring } from './ntfy';
import { allowedChatIds, escapeHtml as h, sendMessage } from './telegram';
import { cairoParts } from './tasks';
import type { MetaConnection } from '@/types/database';

// Problems that stop parts of Anwarz from working, checked on every 5-minute run (database
// reads only, no outside calls). Each problem rings the phone and posts in Telegram at most
// once a day. Ads that stopped spending ring from the 9 AM brief (lib/morning-brief.ts);
// a broken Google reviews login rings from the review digest.

const STATE = 'critical_rings';
const FB_WARN_DAYS = 5;

interface Problem {
  key: string; // stable per problem, for "once a day"
  ring?: Ring; // left out: Telegram only
  telegram: string; // HTML
}

/** OpenRouter credit running low (Telegram only, once a day); Anwarz falls back to free models when it's gone. */
async function balanceProblems(): Promise<Problem[]> {
  if (!(await openRouterOn().catch(() => false))) return [];
  const balance = await openRouterBalance();
  if (!isLowBalance(balance)) return [];
  return [
    {
      key: 'or:low',
      telegram: `💸 <b>OpenRouter credit is low: $${balance!.left.toFixed(2)} left</b> (of $${balance!.total.toFixed(2)})\nTop up at openrouter.ai/credits, or open /ai and tap 🆓 to use the free models only. When it runs out, Anwarz switches to the free models by itself.`,
    },
  ];
}

async function facebookProblems(): Promise<Problem[]> {
  const [connections, clients] = await Promise.all([listDocs<MetaConnection>(META_CONNECTIONS), listClientProfiles().catch(() => [])]);
  const name = (c: MetaConnection) => (c.clientId ? clients.find((x) => x.id === c.clientId)?.brandName : null) || c.metaUserName || 'Facebook';
  const out: Problem[] = [];
  for (const c of connections) {
    const days = c.tokenExpiresAt ? Math.floor((Date.parse(c.tokenExpiresAt) - Date.now()) / 86_400_000) : null;
    const broken = c.status === 'error';
    if (!broken && (days === null || days > FB_WARN_DAYS)) continue;
    const what = broken || (days !== null && days < 0) ? 'stopped working' : `expires in ${days} day${days === 1 ? '' : 's'}`;
    out.push({
      key: `fb:${c.id}`,
      ring: { title: `🔌 Facebook login ${what}: ${name(c)}`, message: 'Reconnect Facebook on the client’s Social tab so comments, posts and ads keep working.', priority: 4, tags: ['electric_plug'] },
      telegram: `🔌 <b>Facebook login ${h(what)}</b>: ${h(name(c))}${c.lastError ? `\n<i>${h(c.lastError.slice(0, 200))}</i>` : ''}\n\nReconnect Facebook on the client’s Social tab so comments, posts and ads keep working.`,
    });
  }
  return out;
}

/** A provider with no chat model left means review drafts, comment replies and voice tasks stop. */
async function aiProblems(): Promise<Problem[]> {
  const available = await availableChatModels();
  const out: Problem[] = [];
  for (const provider of ['gemini', 'groq'] as const) {
    const configured = provider === 'gemini' ? process.env.GEMINI_API_KEY : process.env.GROQ_API_KEY;
    if (!configured || !CHAT_MODELS.some((m) => m.provider === provider)) continue;
    if (available.some((m) => m.provider === provider)) continue;
    const label = provider === 'gemini' ? 'Gemini' : 'Groq';
    out.push({
      key: `ai:${provider}`,
      ring: { title: `🤖 ${label} free quota used up`, message: 'Review drafts, comment replies and voice tasks may fail until it resets. /ai shows the details.', priority: 4, tags: ['robot'] },
      telegram: `🤖 <b>${label} free quota used up</b>\nReview drafts, comment replies and voice tasks may fail until it resets (usually by tomorrow). /ai shows the details.`,
    });
  }
  return out;
}

export async function runCriticalChecks(now = new Date()) {
  const [fb, ai, balance] = await Promise.all([facebookProblems().catch(() => []), aiProblems().catch(() => []), balanceProblems().catch(() => [])]);
  const problems = [...fb, ...ai, ...balance];
  if (!problems.length) return { problems: 0, rang: 0 };
  const { date: today } = cairoParts(now);
  const state = await getSetting<{ day?: string; keys?: string[] }>(STATE);
  const done = state?.day === today ? state.keys || [] : [];
  const fresh = problems.filter((p) => !done.includes(p.key));
  if (!fresh.length) return { problems: problems.length, rang: 0 };
  // Saved first so overlapping runs don't ring twice.
  await setSetting(STATE, { day: today, keys: [...done, ...fresh.map((p) => p.key)] });
  for (const p of fresh) {
    for (const chatId of allowedChatIds()) await sendMessage(chatId, { text: p.telegram });
    if (p.ring) await ringPhone(p.ring);
  }
  return { problems: problems.length, rang: fresh.length };
}
