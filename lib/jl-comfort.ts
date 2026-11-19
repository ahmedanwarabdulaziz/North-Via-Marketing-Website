// JL Comfort's private API for Anwarz (/api/anwarz/* on jlcomfort.com), shared by the app's JL
// Comfort screen relay, the AI chat and the morning summary.
//
// Env: JLCOMFORT_API_KEY (same value as ANWARZ_API_KEY on JL Comfort), optional JLCOMFORT_URL.

// www: jlcomfort.com redirects there, and a redirect would drop the Authorization header.
export const jlBase = () => (process.env.JLCOMFORT_URL || 'https://www.jlcomfort.com').replace(/\/+$/, '');
export const jlKey = () => process.env.JLCOMFORT_API_KEY?.trim() || '';

/** GET or POST one /api/anwarz path; throws with JL Comfort's own error message on failure. */
export async function jlApi<T = Record<string, unknown>>(path: string, body?: unknown, timeoutMs = 20_000): Promise<T> {
  const key = jlKey();
  if (!key) throw new Error('JL Comfort isn’t connected (JLCOMFORT_API_KEY is not set).');
  const response = await fetch(`${jlBase()}/api/anwarz/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { Authorization: `Bearer ${key}`, Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
    signal: AbortSignal.timeout(timeoutMs),
  });
  const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) throw new Error(typeof json.error === 'string' ? json.error : `JL Comfort answered ${response.status}`);
  return json as T;
}

export type JlKind = 'order' | 'sample';

/** An order or sample request the chat can act on. */
export interface JlRecord {
  kind: JlKind;
  id: string;
  number: string; // JL-1022 / S-1041
  customer: string;
  status: string;
  createdAt: string;
  hasTracking: boolean;
}

export const JL_ORDER_STATUSES = ['paid', 'sent_to_supplier', 'shipped', 'delivered', 'closed', 'cancelled', 'problem'] as const;
export const JL_SAMPLE_STATUSES = ['pending', 'sent_to_supplier', 'supplier_confirmed', 'shipped', 'delivered', 'cancelled', 'problem'] as const;

/** Recent orders and sample requests (newest first) plus the carriers JL Comfort knows. */
export async function jlRecords(): Promise<{ records: JlRecord[]; carriers: { id: string; name: string }[] }> {
  type Row = { id: string; orderNumber?: string; requestNumber?: string; customerName?: string; name?: string; status: string; createdAt: string; trackingNumber?: string | null };
  const [orders, samples, overview] = await Promise.all([
    jlApi<{ orders?: Row[] }>('orders?limit=60'),
    jlApi<{ samples?: Row[] }>('samples?limit=60'),
    jlApi<{ carriers?: { id: string; name: string }[] }>('overview'),
  ]);
  const map = (kind: JlKind) => (r: Row): JlRecord => ({
    kind,
    id: r.id,
    number: (kind === 'order' ? r.orderNumber : r.requestNumber) || r.id.slice(0, 8),
    customer: (kind === 'order' ? r.customerName : r.name) || '',
    status: r.status,
    createdAt: r.createdAt,
    hasTracking: Boolean(r.trackingNumber),
  });
  return { records: [...(orders.orders || []).map(map('order')), ...(samples.samples || []).map(map('sample'))], carriers: overview.carriers || [] };
}
