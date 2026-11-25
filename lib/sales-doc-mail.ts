import nodemailer from 'nodemailer';
import { getCompany } from '@/lib/sales-docs';
import { docFileName, KIND_LABELS, type SalesDoc } from '@/lib/sales-docs-shared';

const EMAIL = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;
const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);

export class MailInputError extends Error {}

/** Sends a quote/invoice PDF (made by the browser) to the address someone typed after pressing send. */
export async function sendDocEmail(doc: SalesDoc, body: { to?: string; subject?: string; message?: string; pdfBase64?: string }) {
  const to = String(body.to || '').trim();
  if (!EMAIL.test(to)) throw new MailInputError('الإيميل غير صحيح');
  const pdfBase64 = String(body.pdfBase64 || '');
  if (!pdfBase64 || pdfBase64.length > 8_000_000) throw new MailInputError('ملف الـ PDF غير صالح أو كبير جداً');
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) throw new Error('إعدادات الإيميل غير متاحة على هذا السيرفر');

  const company = await getCompany();
  const subject = String(body.subject || '').trim().slice(0, 200) || `${KIND_LABELS[doc.kind]} ${doc.number} - ${company.nameAr}`;
  const message = String(body.message || '').trim().slice(0, 4000);
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
  await transporter.sendMail({
    from: `"${company.nameAr.replace(/"/g, '')}" <${process.env.GMAIL_USER}>`,
    replyTo: company.email || undefined,
    to,
    subject,
    html: `<div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; line-height: 1.8; color: #18181b;">${escapeHtml(message).replace(/\n/g, '<br>')}</div>`,
    attachments: [{ filename: `${docFileName(doc, company)}.pdf`, content: Buffer.from(pdfBase64, 'base64'), contentType: 'application/pdf' }],
  });
}
