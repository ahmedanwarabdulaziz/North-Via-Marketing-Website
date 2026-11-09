import { getSetting, setSetting } from './data/store';
import { recordAiCall, type AiFeature } from './ai-usage';

// Paid AI through OpenRouter (one key, pay as you go): Claude Haiku 5.5 for everyday work.
// Used first when OPENROUTER_API_KEY is set and the switch in /ai is on; if it fails or the
// credit runs out, every caller falls back to the free Gemini / Groq models as before.
// Env: OPENROUTER_API_KEY, optional OPENROUTER_MODEL (default anthropic/claude-haiku-5.5).

const BASE = 'https://openrouter.ai/api/v1';
export const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-5.5';
const SETTING = 'ai_provider';
const LOW_BALANCE_USD = 2;

let cached: { on: boolean; at: number } | null = null;
/** A failure makes later calls skip OpenRouter for a while (e.g. out of credit). */
let restUntil = 0;

export function openRouterConfigured() {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

/** On when the key is set and the /ai switch isn't turned off. */
export async function openRouterOn() {
  if (!openRouterConfigured() || Date.now() < restUntil) return false;
  if (cached && Date.now() - cached.at < 30_000) return cached.on;
  const s = await getSetting<{ openrouter?: boolean }>(SETTING).catch(() => null);
  cached = { on: s?.openrouter !== false, at: Date.now() };
  return cached.on;
}

export async function setOpenRouterOn(on: boolean) {
  await setSetting(SETTING, { openrouter: on }, { merge: true });
  cached = { on, at: Date.now() };
}

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }>;
}

/** One chat completion; returns the text. Throws on any failure so the caller can fall back. */
export async function openRouterChat(opts: {
  messages: OpenRouterMessage[];
  feature: AiFeature;
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  model?: string;
}): Promise<string> {
  const model = opts.model || OPENROUTER_MODEL;
  try {
    const res = await fetch(`${BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://www.northviamarketing.com',
        'X-Title': 'Anwarz (North Via)',
      },
      body: JSON.stringify({
        model,
        messages: opts.messages,
        temperature: opts.temperature ?? 0.3,
        max_tokens: opts.maxTokens ?? 2048,
        // Reasoning off: everyday replies come back in ~2 s instead of ~20 s at the same quality,
        // and the thinking can't eat the max_tokens and leave the answer empty.
        reasoning: { enabled: false },
        ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
      }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 30_000),
    });
    const data = (await res.json().catch(() => ({}))) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { total_tokens?: number };
      error?: { message?: string; code?: number };
    };
    if (!res.ok || data.error) {
      const message = `OpenRouter ${res.status}: ${data.error?.message || 'error'}`;
      // 402 = out of credit, 401 = bad key: stop trying for an hour; other errors for 2 minutes.
      restUntil = Date.now() + (res.status === 402 || res.status === 401 ? 60 * 60_000 : 2 * 60_000);
      throw new Error(message);
    }
    const text = (data.choices?.[0]?.message?.content || '').trim();
    if (!text) throw new Error('OpenRouter returned an empty answer.');
    await recordAiCall({ provider: 'openrouter', model, feature: opts.feature, ok: true, tokens: data.usage?.total_tokens });
    return text;
  } catch (error) {
    await recordAiCall({ provider: 'openrouter', model, feature: opts.feature, ok: false, error });
    throw error;
  }
}

/** JSON helper: parses the answer, tolerating a ```json fence. */
export async function openRouterJson(opts: { system: string; user: string; feature: AiFeature; image?: { data: string; mimeType: string }; timeoutMs?: number }) {
  const userContent: OpenRouterMessage['content'] = opts.image
    ? [
        { type: 'text', text: opts.user },
        { type: 'image_url', image_url: { url: `data:${opts.image.mimeType};base64,${opts.image.data}` } },
      ]
    : opts.user;
  const text = await openRouterChat({
    messages: [
      { role: 'system', content: `${opts.system}\n\nAnswer with the JSON object only.` },
      { role: 'user', content: userContent },
    ],
    feature: opts.feature,
    json: true,
    temperature: 0.2,
    maxTokens: 4096,
    timeoutMs: opts.timeoutMs,
  });
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  return JSON.parse(start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned) as Record<string, unknown>;
}

/** Credit bought, spent and left (USD), or null if it can't be read. */
export async function openRouterBalance(): Promise<{ total: number; used: number; left: number } | null> {
  if (!openRouterConfigured()) return null;
  try {
    const res = await fetch(`${BASE}/credits`, { headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` }, signal: AbortSignal.timeout(8_000) });
    const data = (await res.json()) as { data?: { total_credits?: number; total_usage?: number } };
    if (!res.ok || !data.data) return null;
    const total = data.data.total_credits || 0;
    const used = data.data.total_usage || 0;
    return { total, used, left: Math.max(0, total - used) };
  } catch {
    return null;
  }
}

export function isLowBalance(b: { left: number } | null) {
  return Boolean(b && b.left < LOW_BALANCE_USD);
}
export { LOW_BALANCE_USD };
