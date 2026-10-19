import { supabase } from './supabase';

// Counts every AI call (per Cairo day, provider, model and feature) for the bot's AI usage
// screen. Gemini can't report its remaining quota to an API key, so these counts are ours;
// Groq returns its remaining limits in response headers, which are kept with the count.

export type AiProvider = 'gemini' | 'groq';
export type AiFeature = 'tasks' | 'reviews' | 'comments' | 'chat' | 'check' | 'knowledge' | 'assistant';

export interface GroqLimits {
  requestsLimit?: number; // per day
  requestsLeft?: number;
  requestsReset?: string; // e.g. "2m59.56s"
  tokensLimit?: number; // per minute
  tokensLeft?: number;
  tokensReset?: string;
  readAt: string;
}

function cairoDay(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export function isRateLimitError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /\b429\b|quota|rate.?limit|resource.?exhausted/i.test(message);
}

function num(value: string | null) {
  const n = Number(value);
  return value !== null && Number.isFinite(n) ? n : undefined;
}

/** Groq's x-ratelimit-* headers, or null when the response has none. */
export function groqLimitsFrom(headers: Headers): GroqLimits | null {
  if (!headers.get('x-ratelimit-limit-requests') && !headers.get('x-ratelimit-limit-tokens')) return null;
  return {
    requestsLimit: num(headers.get('x-ratelimit-limit-requests')),
    requestsLeft: num(headers.get('x-ratelimit-remaining-requests')),
    requestsReset: headers.get('x-ratelimit-reset-requests') || undefined,
    tokensLimit: num(headers.get('x-ratelimit-limit-tokens')),
    tokensLeft: num(headers.get('x-ratelimit-remaining-tokens')),
    tokensReset: headers.get('x-ratelimit-reset-tokens') || undefined,
    readAt: new Date().toISOString(),
  };
}

/** Adds one call to today's count. Never throws: usage tracking must not break the feature. */
export async function recordAiCall(entry: {
  provider: AiProvider;
  model: string;
  feature: AiFeature;
  ok: boolean;
  error?: unknown;
  tokens?: number;
  limits?: GroqLimits | null;
}) {
  const message = entry.error ? (entry.error instanceof Error ? entry.error.message : String(entry.error)).slice(0, 300) : null;
  const { error } = await supabase.rpc('ai_usage_bump', {
    p_day: cairoDay(),
    p_provider: entry.provider,
    p_model: entry.model,
    p_feature: entry.feature,
    p_ok: entry.ok,
    p_rate_limited: !entry.ok && isRateLimitError(entry.error),
    p_tokens: Math.round(entry.tokens || 0),
    p_error: message,
    p_limits: entry.limits ?? null,
  });
  if (error) console.error('ai_usage_bump failed:', error.message);
}

/**
 * Runs one Gemini call and records it, with the token count from the result's usageMetadata.
 */
export async function trackGemini<T>(model: string, feature: AiFeature, call: () => Promise<T>): Promise<T> {
  try {
    const result = await call();
    const usage = (result as { response?: { usageMetadata?: { totalTokenCount?: number } } })?.response?.usageMetadata;
    await recordAiCall({ provider: 'gemini', model, feature, ok: true, tokens: usage?.totalTokenCount });
    return result;
  } catch (error) {
    await recordAiCall({ provider: 'gemini', model, feature, ok: false, error });
    throw error;
  }
}

export interface AiUsageRow {
  day: string;
  provider: AiProvider;
  model: string;
  feature: AiFeature;
  calls: number;
  failures: number;
  rate_limited: number;
  tokens: number;
  last_ok_at: string | null;
  last_error: string | null;
  last_error_at: string | null;
  limits: GroqLimits | null;
}

/** Usage rows for the last `days` Cairo days, newest first. */
export async function listAiUsage(days = 7) {
  const since = cairoDay(new Date(Date.now() - (days - 1) * 86_400_000));
  const { data, error } = await supabase.from('ai_usage').select().gte('day', since).order('day', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as AiUsageRow[];
}

export { cairoDay as aiUsageDay };

/**
 * One Groq API call (JSON body, or FormData for audio), recorded with the limits Groq
 * reports in its headers. Returns the parsed JSON; throws "Groq <status>: …" on errors.
 */
export async function groqFetch<T = unknown>(
  path: string,
  body: Record<string, unknown> | FormData,
  meta: { model: string; feature: AiFeature; timeoutMs?: number }
): Promise<T> {
  const isForm = body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(`https://api.groq.com/openai/v1/${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, ...(isForm ? {} : { 'Content-Type': 'application/json' }) },
      body: isForm ? body : JSON.stringify(body),
      signal: AbortSignal.timeout(meta.timeoutMs ?? 15_000),
    });
  } catch (error) {
    await recordAiCall({ provider: 'groq', model: meta.model, feature: meta.feature, ok: false, error });
    throw error;
  }
  const limits = groqLimitsFrom(res.headers);
  if (!res.ok) {
    const error = new Error(`Groq ${res.status}: ${(await res.text()).slice(0, 300)}`);
    await recordAiCall({ provider: 'groq', model: meta.model, feature: meta.feature, ok: false, error, limits });
    throw error;
  }
  const data = (await res.json()) as T & { usage?: { total_tokens?: number } };
  await recordAiCall({ provider: 'groq', model: meta.model, feature: meta.feature, ok: true, tokens: data.usage?.total_tokens, limits });
  return data;
}
