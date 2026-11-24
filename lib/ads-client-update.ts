import nodemailer from 'nodemailer';
import { aiJson } from './ai-json';
import type { SuggestionRow } from './ads-suggest';
import { getDoc } from './data/store';
import { clientFileText } from './memory-files';
import { supabase } from './supabase';
import { whatsAppNumber } from './whatsapp-share';

// After changes are applied to a client's Google Ads, Ahmed can tell the client what was done:
// one short plain-language message (WhatsApp opens with the text ready, he presses Send; or an
// email he previews first). Nothing is sent to a client by itself.

const SIGNATURE = 'Ahmed Anwar · North Via Marketing';

interface ClientInfo {
  brandName: string;
  ownerName?: string;
  email?: string;
  mobileNumber?: string;
}

export interface AdsClientUpdate {
  clientId: string;
  clientName: string;
  count: number;
  ids: string[];
  text: string; // the message (WhatsApp and email body)
  subject: string;
  phone: string | null;
  email: string | null;
}

/** Applied changes the client hasn't been told about yet. */
export async function unnotifiedChanges(clientId: string): Promise<SuggestionRow[]> {
  const { data, error } = await supabase.from('ads_suggestions').select().eq('client_id', clientId).eq('status', 'applied').is('notified_at', null).order('applied_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []) as SuggestionRow[];
}

export async function draftClientUpdate(clientId: string, only?: string[]): Promise<AdsClientUpdate | null> {
  const client = await getDoc<ClientInfo>('clients', clientId);
  if (!client) throw new Error('Client not found.');
  let changes = await unnotifiedChanges(clientId);
  if (only?.length) changes = changes.filter((c) => only.includes(c.id));
  if (!changes.length) return null;

  const phone = whatsAppNumber(client.mobileNumber);
  const arabic = phone?.startsWith('20') ?? false;
  const first = client.ownerName?.trim().split(/\s+/)[0] || '';
  const negatives = changes.filter((c) => c.type === 'add_negative');
  const keywords = changes.filter((c) => c.type === 'add_keyword');
  const saved = Math.round(negatives.reduce((s, c) => s + (c.evidence?.cost || 0), 0));
  const currency = changes[0].evidence?.currency || '';

  const facts = [
    negatives.length ? `Blocked ${negatives.length} kind(s) of irrelevant searches that were costing money without bringing customers (about ${saved} ${currency} of the last 30 days' spend).` : '',
    keywords.length ? `Added ${keywords.length} new search phrase(s) that real customers already used before contacting them.` : '',
    ...changes.map((c) => c.client_line).filter(Boolean).slice(0, 6),
  ].filter(Boolean);

  const fallback = arabic
    ? `أهلاً ${first} 👋\nعملنا تحديث على إعلانات جوجل بتاعتك:\n${negatives.length ? `• استبعدنا ${negatives.length} عمليات بحث مش مناسبة كانت بتصرف فلوس من غير عملاء${saved ? ` (حوالي ${saved} ${currency} في آخر 30 يوم)` : ''}\n` : ''}${keywords.length ? `• ضفنا ${keywords.length} عبارات بحث جديدة العملاء بيدوروا بيها فعلاً\n` : ''}الهدف إن كل جنيه في الإعلانات يجيب عملاء أكتر. لو عندك أي سؤال أنا موجود.\n${SIGNATURE}`
    : `Hi ${first} 👋\nQuick update on your Google Ads, we made some improvements:\n${negatives.length ? `• Blocked ${negatives.length} irrelevant search${negatives.length === 1 ? '' : 'es'} that were spending budget without bringing customers${saved ? ` (about ${saved} ${currency} over the last 30 days)` : ''}\n` : ''}${keywords.length ? `• Added ${keywords.length} new search phrase${keywords.length === 1 ? '' : 's'} that real customers are already using\n` : ''}The goal is for every dollar to bring you more enquiries. Any questions, I'm here.\n${SIGNATURE}`;

  let text = fallback;
  try {
    const file = await clientFileText(clientId, client.brandName).catch(() => '');
    const raw = await aiJson({
      system: `You write short WhatsApp/email messages from Ahmed Anwar (North Via Marketing) to a client about improvements he just made to their Google Ads. Professional, warm, plain language: NO jargon (never say "negative keywords", "match types", "CPC", "GAQL"). Say what was done and why it helps, in 3–5 short lines (bullets with • are fine), under 90 words. ${
        arabic ? 'Write in friendly Egyptian Arabic (brand names stay in English).' : 'Write in clear, friendly English.'
      } Start with a greeting using the first name if given, at most two emojis, and end with the line "${SIGNATURE}". Only state facts given below, never invent results. Return ONLY JSON: {"message":"..."}`,
      user: `Client: ${first || 'the client'} (${client.brandName})\nWhat was done:\n${facts.map((f) => `- ${f}`).join('\n')}${file ? `\n\n${file}` : ''}`,
      feature: 'comments',
      timeBudgetMs: 8_000,
    });
    const t = typeof raw.message === 'string' ? raw.message.trim() : '';
    if (t.length > 30) text = t;
  } catch (error) {
    console.error('Ads update AI failed, using the template:', error instanceof Error ? error.message.slice(0, 120) : error);
  }

  return {
    clientId,
    clientName: client.brandName,
    count: changes.length,
    ids: changes.map((c) => c.id),
    text,
    subject: arabic ? `تحديث على إعلانات جوجل — ${client.brandName}` : `Google Ads update — ${client.brandName}`,
    phone,
    email: client.email?.trim() || null,
  };
}

/** Marks changes as told to the client (after WhatsApp was opened or the email was sent). */
export async function markNotified(ids: string[]) {
  if (!ids.length) return;
  const { error } = await supabase.from('ads_suggestions').update({ notified_at: new Date().toISOString() }).in('id', ids).eq('status', 'applied');
  if (error) throw new Error(error.message);
}

/** Sends the (previewed, possibly edited) update by email from the agency mailbox. */
export async function sendClientUpdateEmail(opts: { to: string; subject: string; text: string }) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) throw new Error('Email isn’t set up on the server.');
  const transporter = nodemailer.createTransport({
    host: 'smtp.purelymail.com',
    port: 465,
    secure: true,
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
  await transporter.sendMail({
    from: `"${process.env.GMAIL_FROM_NAME || 'North Via Marketing'}" <${process.env.GMAIL_USER}>`,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
  });
}
