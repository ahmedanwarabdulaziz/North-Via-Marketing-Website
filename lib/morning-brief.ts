import { listAdminInvoices } from './admin-ops';
import { adsDigestLines } from './ads-telegram';
import { metaAdsDigestLines } from './meta-ads-telegram';
import { ringPhone } from './ntfy';
import { PRAYERS, PRAYER_CITIES, todaysPrayerTimes } from './prayer';
import { reviewQueueOverview } from './review-telegram';
import { escapeHtml as h, type InlineButton } from './telegram';
import { websiteDigestLine } from './website-monitor';
import { whatsAppShareLink } from './whatsapp-share';
import type { AdminInvoiceItem } from '@/types/database';

// The 9 AM morning brief: everything for the day in one message, above the task list
// (prayers, reviews waiting, websites, yesterday's ads, overdue invoices). Each part is
// optional: one that fails or has nothing to say is left out, so the brief always goes.
// Ads problems (no spend yesterday, an expired ads login) also ring the phone, once a day.

const PART_TIMEOUT_MS = 25_000;

function withTimeout<T>(p: Promise<T>, fallback: T): Promise<T> {
  return Promise.race([p.catch(() => fallback), new Promise<T>((resolve) => setTimeout(() => resolve(fallback), PART_TIMEOUT_MS))]);
}

function money(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency: currency || 'CAD', maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${Math.round(amount)} ${currency}`;
  }
}

async function prayerLine() {
  const { settings, state } = await todaysPrayerTimes();
  return `🕌 ${PRAYER_CITIES[settings.city].nameAr}: ${PRAYERS.map((p) => `${p.ar} ${state.times[p.key]}`).join(' · ')}`;
}

async function reviewsLine() {
  const { total, clients } = await reviewQueueOverview();
  if (!total) return '⭐ Reviews: nothing waiting';
  return `⭐ <b>${total}</b> review repl${total === 1 ? 'y' : 'ies'} waiting: ${clients.slice(0, 4).map((c) => h(c.name)).join(', ')}${clients.length > 4 ? '…' : ''}`;
}

/** Sent or part-paid invoices past their due date, each with a WhatsApp reminder button. */
async function invoiceLines(today: string): Promise<{ lines: string[]; buttons: InlineButton[][] }> {
  const open = (await listAdminInvoices()).filter(
    (i: AdminInvoiceItem) => ['sent', 'overdue', 'partially_paid'].includes(i.status) && i.dueDate && i.dueDate.slice(0, 10) < today
  );
  if (!open.length) return { lines: [], buttons: [] };
  const owed = (i: AdminInvoiceItem) => (i.totalAmount || i.amount || 0) - (i.payments || []).reduce((s, p) => s + (p.amount || 0), 0);
  return {
    lines: [
      `💰 <b>${open.length} overdue invoice${open.length === 1 ? '' : 's'}</b>`,
      ...open.slice(0, 5).map((i) => `• ${h(i.clientBrand || i.clientName)}${i.invoiceNumber ? ` #${h(i.invoiceNumber)}` : ''}: ${money(owed(i), i.currency)}, due ${i.dueDate!.slice(0, 10)}`),
    ],
    buttons: open
      .filter((i) => i.id)
      .slice(0, 3)
      .map((i) => [{ text: `📲 Remind ${(i.clientBrand || i.clientName).slice(0, 24)} on WhatsApp`, url: whatsAppShareLink('i', i.id!) }]),
  };
}

export interface BriefSections {
  lines: string[]; // HTML lines, shown above the tasks
  buttons: InlineButton[][];
}

export async function morningBriefSections(today: string): Promise<BriefSections> {
  const [prayer, reviews, websites, ads, metaAds, invoices] = await Promise.all([
    withTimeout(prayerLine(), ''),
    withTimeout(reviewsLine(), ''),
    withTimeout(websiteDigestLine(), ''),
    withTimeout(adsDigestLines(), [] as string[]),
    withTimeout(metaAdsDigestLines(), [] as string[]),
    withTimeout(invoiceLines(today), { lines: [] as string[], buttons: [] as InlineButton[][] }),
  ]);

  // Ads problems need someone to step in: ring once (the brief is sent once a day).
  const problems = [...ads, ...metaAds].filter((l) => l.includes('⚠️')).map((l) => l.replace(/<[^>]+>/g, '').replace(/^[•\s📘]+/, ''));
  if (problems.length) {
    await ringPhone({ title: '📉 Ads need attention', message: problems.slice(0, 4).join('\n'), priority: 4, tags: ['chart_with_downwards_trend'] });
  }

  const lines = [prayer, reviews, websites].filter(Boolean);
  for (const block of [ads, metaAds, invoices.lines]) if (block.length) lines.push('', ...block);
  const buttons: InlineButton[][] = [
    ...invoices.buttons,
    [
      { text: '⭐ Reviews', callback_data: 'm:gr' },
      { text: '🌐 Websites', callback_data: 'm:ws' },
      { text: '🕌 Prayer', callback_data: 'm:pr' },
    ],
  ];
  return { lines, buttons };
}
