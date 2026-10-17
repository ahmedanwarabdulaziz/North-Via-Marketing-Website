import { createClient } from '@supabase/supabase-js';

// Server-only: the service role key bypasses row-level security.
// Never import this from client components or expose the key as NEXT_PUBLIC_.
// Values are trimmed: a pasted trailing newline breaks every request with "fetch failed".
const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

/** Why Supabase can't be used, without revealing any secret; null when configured. */
export function supabaseConfigProblem() {
  if (!url) return 'SUPABASE_URL is not set in this environment.';
  if (!key) return 'SUPABASE_SERVICE_ROLE_KEY is not set in this environment.';
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('.supabase.co')) {
      return `SUPABASE_URL should look like https://<project>.supabase.co (got host "${parsed.hostname}").`;
    }
  } catch {
    return 'SUPABASE_URL is not a valid URL.';
  }
  return null;
}

const problem = supabaseConfigProblem();
if (problem) console.error(`Supabase is not configured: ${problem}`);

export const supabase = createClient(problem ? 'http://supabase-not-configured.invalid' : url!, key || 'missing', {
  auth: { persistSession: false, autoRefreshToken: false },
});
