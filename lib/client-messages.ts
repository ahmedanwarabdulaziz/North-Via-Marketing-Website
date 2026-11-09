import { aiJson } from './ai-json';
import { getDoc, listDocs } from './data/store';
import { GBP_REVIEWS } from './review-engine';
import { whatsAppNumber } from './whatsapp-share';
import type { AdminInvoiceItem, GbpStoredReview, Website } from '@/types/database';
import { getTask } from './tasks';

// Messages to clients, opened in Ahmed's own WhatsApp from a Telegram button (official wa.me
// link: he presses Send himself, so there's no ban risk). Written by the AI when the button is
// tapped, in Arabic for Egyptian numbers and English otherwise; a fixed template is used if the
// AI is slow or out of quota, so the button always works.

export type ClientMessageKind = 'i' | 'v' | 'w' | 't'; // overdue invoice, weekly reviews, website issue, task follow-up

interface ClientInfo {
  brandName: string;
  ownerName?: string;
  mobileNumber?: string;
  googleLink?: string;
}

interface Draft {
  phone: string | null;
  arabic: boolean;
  brief: string; // what the message must say, for the AI
  fallback: string; // used if the AI can't answer in time
}

const SIGNATURE = 'Ahmed Anwar · North Via Marketing';

async function client(id?: string | null): Promise<ClientInfo | null> {
  return id ? getDoc<ClientInfo>('clients', id) : null;
}

function firstName(c: ClientInfo | null) {
  return c?.ownerName?.trim().split(/\s+/)[0] || '';
}

function money(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency: currency || 'CAD', maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

async function invoiceDraft(id: string): Promise<Draft | null> {
  const inv = await getDoc<AdminInvoiceItem>('admin_invoices', id);
  if (!inv) return null;
  const c = await client(inv.clientId);
  const phone = whatsAppNumber(c?.mobileNumber);
  const arabic = phone?.startsWith('20') ?? false;
  const owed = (inv.totalAmount || inv.amount || 0) - (inv.payments || []).reduce((s, p) => s + (p.amount || 0), 0);
  const amount = money(owed, inv.currency);
  const number = inv.invoiceNumber ? `#${inv.invoiceNumber}` : '';
  const name = firstName(c);
  return {
    phone,
    arabic,
    brief: `A polite, friendly payment reminder to ${name || 'the client'} (${c?.brandName || inv.clientBrand || inv.clientName}) for invoice ${number}, ${amount} still open, due ${inv.dueDate?.slice(0, 10)}${inv.serviceMonth ? `, for ${inv.serviceMonth}` : ''}. Ask them to confirm when it's paid or say if they need anything. Warm, short, no pressure.`,
    fallback: arabic
      ? `أهلاً ${name} 👋\nحبيت أفكرك بفاتورة ${number} بقيمة ${amount}، ميعادها كان ${inv.dueDate?.slice(0, 10)}.\nلو اتدفعت ابعتلي تأكيد، ولو محتاج أي حاجة قولي.\nشكراً جداً 🙏\n${SIGNATURE}`
      : `Hi ${name} 👋\nA friendly reminder about invoice ${number} for ${amount}, which was due on ${inv.dueDate?.slice(0, 10)}.\nIf it's already paid, just let me know. Happy to help with anything you need.\nThank you!\n${SIGNATURE}`,
  };
}

/** Last 7 days of Google reviews for a client, to encourage more this week. */
async function reviewsDraft(clientId: string): Promise<Draft | null> {
  const c = await client(clientId);
  if (!c) return null;
  const phone = whatsAppNumber(c.mobileNumber);
  const arabic = phone?.startsWith('20') ?? false;
  const since = Date.now() - 7 * 86_400_000;
  const reviews = (await listDocs<GbpStoredReview>(GBP_REVIEWS, { where: { clientId } })).filter((r) => r.createTime && Date.parse(r.createTime) >= since);
  const count = reviews.length;
  const avg = count ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / count).toFixed(1) : null;
  const name = firstName(c);
  const link = c.googleLink ? `\n${c.googleLink}` : '';
  return {
    phone,
    arabic,
    brief: `A short weekly Google reviews update to ${name || 'the client'} (${c.brandName}): last 7 days they got ${count} new review${count === 1 ? '' : 's'}${avg ? ` (average ${avg}★)` : ''}. ${count ? 'Congratulate them' : 'Encourage them, no blame'}, and ask their team to invite happy customers to leave a Google review this week (e.g. at checkout or with a QR code). ${c.googleLink ? `Include this review link on its own line: ${c.googleLink}` : ''} Positive and practical.`,
    fallback: arabic
      ? `أهلاً ${name} 👋\nتحديث الأسبوع: ${c.brandName} جاله ${count} ريفيو جديد على جوجل${avg ? ` (متوسط ${avg}★)` : ''} في آخر 7 أيام.\nخلّي الفريق يطلب من العملاء المبسوطين يكتبوا ريفيو الأسبوع ده، ده بيفرق جداً في الظهور على جوجل 💪${link}\n${SIGNATURE}`
      : `Hi ${name} 👋\nWeekly update: ${c.brandName} received ${count} new Google review${count === 1 ? '' : 's'}${avg ? ` (average ${avg}★)` : ''} in the last 7 days.\nThis week, let's ask happy customers to leave a quick review; it really helps your Google ranking 💪${link}\n${SIGNATURE}`,
  };
}

async function websiteDraft(id: string): Promise<Draft | null> {
  const site = await getDoc<Website>('websites', id);
  if (!site) return null;
  const c = await client(site.clientId);
  const phone = whatsAppNumber(c?.mobileNumber);
  const arabic = phone?.startsWith('20') ?? false;
  const name = firstName(c);
  const down = site.status === 'down';
  return {
    phone,
    arabic,
    brief: down
      ? `Tell ${name || 'the client'} (${c?.brandName}) calmly that we noticed their website ${site.url} is not loading right now (${site.lastError || 'not reachable'}), we're already looking into it and will update them shortly. Reassuring, short.`
      : `Tell ${name || 'the client'} (${c?.brandName}) that their website ${site.url} had a short issue earlier and it's working normally again now; we're keeping an eye on it. Reassuring, short.`,
    fallback: arabic
      ? down
        ? `أهلاً ${name} 👋\nلاحظنا إن موقع ${site.url} مش شغال دلوقتي، وإحنا شغالين عليه وهبلغك أول ما يرجع.\n${SIGNATURE}`
        : `أهلاً ${name} 👋\nالموقع ${site.url} كان فيه مشكلة بسيطة ورجع يشتغل عادي، وإحنا متابعينه.\n${SIGNATURE}`
      : down
        ? `Hi ${name} 👋\nWe noticed ${site.url} isn't loading right now. We're already on it and will update you as soon as it's back.\n${SIGNATURE}`
        : `Hi ${name} 👋\n${site.url} had a short issue earlier and it's working normally again. We're keeping an eye on it.\n${SIGNATURE}`,
  };
}

async function taskDraft(id: string): Promise<Draft | null> {
  const task = await getTask(id).catch(() => null);
  if (!task?.client_id) return null;
  const c = await client(task.client_id);
  const phone = whatsAppNumber(c?.mobileNumber);
  const arabic = phone?.startsWith('20') ?? false;
  const name = firstName(c);
  return {
    phone,
    arabic,
    brief: `A short follow-up message from Ahmed to ${name || 'the client'} (${c?.brandName}) about this work item: "${task.title}"${task.notes ? ` (notes: ${task.notes})` : ''}. Write it as Ahmed talking to his client (a progress update or a question, whichever fits the task). Don't mention internal task systems.`,
    fallback: arabic ? `أهلاً ${name} 👋\nبخصوص: ${task.title}\n${SIGNATURE}` : `Hi ${name} 👋\nFollowing up about: ${task.title}\n${SIGNATURE}`,
  };
}

/** The finished message and the client's WhatsApp number (null if unknown: Ahmed picks the chat). */
export async function clientWhatsAppMessage(kind: ClientMessageKind, id: string): Promise<{ text: string; phone: string | null } | null> {
  const draft = kind === 'i' ? await invoiceDraft(id) : kind === 'v' ? await reviewsDraft(id) : kind === 'w' ? await websiteDraft(id) : await taskDraft(id);
  if (!draft) return null;
  try {
    const raw = await aiJson({
      system: `You write WhatsApp messages from Ahmed Anwar (North Via Marketing) to his clients. Style: professional, warm, direct, short (under 70 words), no hype. ${
        draft.arabic ? 'Write in friendly Egyptian Arabic (English brand names and URLs stay as they are).' : 'Write in clear, friendly English.'
      } Start with a greeting using the first name if given, one or two emojis at most, and end with the line "${SIGNATURE}". Return ONLY JSON: {"message": "..."}`,
      user: draft.brief,
      feature: 'comments',
      timeBudgetMs: 7_000,
    });
    const text = typeof raw.message === 'string' ? raw.message.trim() : '';
    if (text.length > 20) return { text, phone: draft.phone };
  } catch (error) {
    console.error('Client message AI failed, using the template:', error instanceof Error ? error.message.slice(0, 120) : error);
  }
  return { text: draft.fallback, phone: draft.phone };
}
