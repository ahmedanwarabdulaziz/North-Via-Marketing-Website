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
  customerName?: string;
  createdAt?: string;
  emailedBefore?: { count: number; firstAt: string; inboxes: string[]; matchedBy: string[]; subjects: string[] } | null;
}

/** "Isabelle  Bilodeau", "isabelle bilodeau", "Isabèlle Bilodeau" → "isabelle bilodeau". */
const normName = (v: string | null | undefined) =>
  (v || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z؀-ۿ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// Our own systems mention customers too (order and sample notifications, Charlotte's replies);
// those aren't the customer writing to us.
const SYSTEM_SENDERS = /@(jlcomfort\.com|jlupholstery\.com|charlottefabrics\.com|northviamarketing\.com)$|no-?reply|notifications?@/i;

/** Safe inside a PostgREST or() filter: no commas, parentheses or wildcards from customer data. */
const filterValue = (v: string) => v.replace(/[,()*%\\"]/g, ' ').trim();

/**
 * Emails from the order's customer received before the order, in the inboxes Anwarz reads. People
 * often write from another address, so an email counts when it is from their address, from their
 * name (2+ words, ignoring case and accents), or mentions their email address (contact forms).
 */
async function addEmailedBefore(orders: JlOrderLike[]) {
  if (!orders.length) return;
  const accounts = await listEmailAccounts();
  const label = new Map(accounts.map((a) => [a.id, a.label || a.email]));
  const own = new Set(accounts.map((a) => a.email.toLowerCase()));
  await Promise.all(
    orders.map(async (order) => {
      const email = (order.customerEmail || '').trim().toLowerCase();
      const name = normName(order.customerName);
      const lastName = filterValue(name.split(' ').pop() || '');
      const conditions = [
        email ? `from_email.ilike.${filterValue(email)}` : '',
        email ? `body.ilike.*${filterValue(email)}*` : '',
        name.includes(' ') && lastName.length >= 3 ? `from_name.ilike.*${lastName}*` : '',
      ].filter(Boolean);
      if (!conditions.length || !order.createdAt) {
        order.emailedBefore = null;
        return;
      }
      const { data, error } = await supabase
        .from('email_items')
        .select('from_name, from_email, subject, received_at, account_id, body')
        .or(conditions.join(','))
        .lt('received_at', order.createdAt)
        .order('received_at')
        .limit(200);
      if (error) throw new Error(error.message);
      const hits: { at: string; inbox: string; how: string; subject: string }[] = [];
      for (const e of data || []) {
        const from = (e.from_email || '').toLowerCase();
        if (!e.received_at || own.has(from) || SYSTEM_SENDERS.test(from)) continue;
        const how =
          email && from === email
            ? 'email'
            : name.includes(' ') && normName(e.from_name) === name
              ? 'name'
              : email && (e.body || '').toLowerCase().includes(email)
                ? 'mentioned'
                : '';
        if (how) hits.push({ at: e.received_at, inbox: label.get(e.account_id) || 'Inbox', how, subject: (e.subject || '').slice(0, 80) });
      }
      order.emailedBefore = hits.length
        ? {
            count: hits.length,
            firstAt: hits[0].at,
            inboxes: [...new Set(hits.map((h) => h.inbox))],
            matchedBy: [...new Set(hits.map((h) => h.how))],
            subjects: [...new Set(hits.map((h) => h.subject).filter(Boolean))].slice(0, 3),
          }
        : null;
    })
  );
}

export const GET = appRoute<Ctx>((request, _device, context) => relay(request, context));
export const POST = appRoute<Ctx>((request, _device, context) => relay(request, context));
