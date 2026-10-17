import { whatsAppTextFor } from '@/lib/review-telegram';
import { verifyShareLink, whatsAppComposeUrl } from '@/lib/whatsapp-share';

export const dynamic = 'force-dynamic';

/** Opened from a Telegram "Forward to WhatsApp" button; redirects to WhatsApp with the text filled in. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const kind = params.get('k');
  const id = params.get('id');
  if (!verifyShareLink(kind, id, params.get('s'))) {
    return new Response('This link is not valid.', { status: 403 });
  }

  const text = await whatsAppTextFor(kind, id!);
  if (!text) return new Response('This review is no longer available.', { status: 404 });

  return Response.redirect(whatsAppComposeUrl(text), 302);
}
