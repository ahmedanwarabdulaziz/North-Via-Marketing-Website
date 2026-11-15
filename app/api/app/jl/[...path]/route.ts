import { AppError, appRoute } from '@/lib/app-auth';
import { listEmailAccounts } from '@/lib/email/inbox';
import { supabase } from '@/lib/supabase';

// The Anwarz app's JL Comfort section (orders and sample requests). JL Comfort keeps its own database
// and emails; this passes the app's requests to its private API (/api/anwarz/* on jlcomfort.com)
// with the shared secret, so the phone never holds that key.
//
// Env: JLCOMFORT_API_KEY (same value as ANWARZ_API_KEY on JL Comfort), optional JLCOMFORT_URL.

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// www: jlcomfort.com redirects there, and a redirect would drop the Authorization header.
const BASE = (process.env.JLCOMFORT_URL || 'https://www.jlcomfort.com').replace(/\/+$/, '');
// Only these JL Comfort endpoints can be reached through here.
const ALLOWED = /^(overview|orders|samples)(\/[A-Za-z0-9-]{1,64})?$/;

type Ctx = { params: Promise<{ path: string[] }> };

async function relay(request: Request, { params }: Ctx) {
  const key = process.env.JLCOMFORT_API_KEY?.trim();
  if (!key) throw new AppError('JL Comfort isn’t connected yet (JLCOMFORT_API_KEY is not set).', 503);
  const path = (await params).path.join('/');
  if (!ALLOWED.test(path)) throw new AppError('Not found.', 404);

  const search = new URL(request.url).search;
  let response: Response;
  try {
    response = await fetch(`${BASE}/api/anwarz/${path}${search}`, {
      method: request.method,
      headers: { Authorization: `Bearer ${key}`, Accept: 'application/json', ...(request.method === 'POST' ? { 'Content-Type': 'application/json' } : {}) },
      body: request.method === 'POST' ? await request.text() : undefined,
      cache: 'no-store',
      signal: AbortSignal.timeout(45_000),
    });
  } catch (error) {
    console.error('JL Comfort relay failed:', error);
    throw new AppError('Couldn’t reach jlcomfort.com. Try again in a minute.', 502);
  }
  const text = await response.text();
  if (response.status === 401) throw new AppError('JL Comfort rejected the connection key. Check ANWARZ_API_KEY / JLCOMFORT_API_KEY.', 502);

  // Orders: add whether the customer emailed us (any Anwarz inbox) before ordering.
  if (response.ok && path.startsWith('orders')) {
    try {
      const json = JSON.parse(text) as { orders?: JlOrderLike[]; order?: JlOrderLike };
      const orders = json.orders ?? (json.order ? [json.order] : []);
      await addEmailedBefore(orders);
      return Response.json(json, { status: response.status });
    } catch (error) {
      console.error('JL Comfort: email history lookup failed:', error);
    }
  }
  return new Response(text, { status: response.status, headers: { 'Content-Type': response.headers.get('content-type') || 'application/json' } });
}

interface JlOrderLike {
  customerEmail?: string;
  createdAt?: string;
  emailedBefore?: { count: number; firstAt: string; inboxes: string[] } | null;
}

/** Emails from the order's customer received before the order, in the inboxes Anwarz reads. */
async function addEmailedBefore(orders: JlOrderLike[]) {
  const emails = [...new Set(orders.map((o) => (o.customerEmail || '').trim().toLowerCase()).filter(Boolean))];
  if (!emails.length) return;
  const [{ data, error }, accounts] = await Promise.all([
    supabase.from('email_items').select('from_email, received_at, account_id').in('from_email', [...new Set([...emails, ...orders.map((o) => (o.customerEmail || '').trim()).filter(Boolean)])]).order('received_at').limit(2000),
    listEmailAccounts(),
  ]);
  if (error) throw new Error(error.message);
  const label = new Map(accounts.map((a) => [a.id, a.label || a.email]));
  for (const order of orders) {
    const email = (order.customerEmail || '').trim().toLowerCase();
    const before = (data || []).filter(
      (e) => (e.from_email || '').toLowerCase() === email && e.received_at && order.createdAt && Date.parse(e.received_at) < Date.parse(order.createdAt)
    );
    order.emailedBefore = before.length
      ? { count: before.length, firstAt: before[0].received_at!, inboxes: [...new Set(before.map((e) => label.get(e.account_id) || 'Inbox'))] }
      : null;
  }
}

export const GET = appRoute<Ctx>((request, _device, context) => relay(request, context));
export const POST = appRoute<Ctx>((request, _device, context) => relay(request, context));
