import crypto from 'crypto';
import { sendPush } from '@/lib/push';

// JL Comfort (jlcomfort.com) calls this for every new paid order and sample request
// (its lib/anwarz/notify.ts), with the shared secret. The phone gets a 🛋 notification with the
// "JL Comfort orders" sound; a tap opens the JL Comfort page. JL Comfort still alerts its own
// Telegram bot as before.

export const dynamic = 'force-dynamic';

function safeEqual(a: string, b: string) {
  const left = crypto.createHash('sha256').update(a).digest();
  const right = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(left, right);
}

export async function POST(request: Request) {
  const secret = process.env.JLCOMFORT_API_KEY?.trim();
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!secret || secret.length < 32 || !token || !safeEqual(token, secret)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { kind?: unknown; id?: unknown; title?: unknown; detail?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }
  const kind = body.kind === 'sample' ? 'sample' : 'order';
  const title = typeof body.title === 'string' ? body.title.slice(0, 200) : kind === 'order' ? '🛋 New JL Comfort order' : '🧵 New sample request';
  const detail = typeof body.detail === 'string' ? body.detail.slice(0, 500) : '';
  const id = typeof body.id === 'string' ? body.id.slice(0, 64) : '';

  const sent = await sendPush({ title, body: detail, channel: 'jl_order', data: { type: kind === 'order' ? 'jl_order' : 'jl_sample', id } });
  return Response.json({ ok: true, sent });
}
