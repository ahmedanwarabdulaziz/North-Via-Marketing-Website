import { whatsAppTextFor } from '@/lib/review-telegram';
import { getClientReport } from '@/lib/client-report';
import { reportWhatsAppText } from '@/lib/report-i18n';
import { getDoc } from '@/lib/data/store';
import { verifyShareLink, whatsAppComposeUrl, whatsAppNumber } from '@/lib/whatsapp-share';

export const dynamic = 'force-dynamic';

/** Opened from a Telegram "Forward to WhatsApp" button; redirects to WhatsApp with the text filled in. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const kind = params.get('k');
  const id = params.get('id');
  if (!verifyShareLink(kind, id, params.get('s'))) {
    return new Response('This link is not valid.', { status: 403 });
  }

  if (kind === 'p') {
    // A client report goes straight to that client's WhatsApp when their number is known.
    const report = await getClientReport(id!);
    if (!report) return new Response('This report is no longer available.', { status: 404 });
    const client = await getDoc<{ mobileNumber?: string }>('clients', report.clientId);
    const text = reportWhatsAppText(report.data, report.language, `https://www.northviamarketing.com/r/${id}`);
    return Response.redirect(whatsAppComposeUrl(text, whatsAppNumber(client?.mobileNumber)), 302);
  }

  const text = await whatsAppTextFor(kind, id!);
  if (!text) return new Response('This review is no longer available.', { status: 404 });

  return Response.redirect(whatsAppComposeUrl(text), 302);
}
