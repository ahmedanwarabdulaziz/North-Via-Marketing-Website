'use server';

import nodemailer from 'nodemailer';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/firebase';
import { getAdminCollectionNames, getAdminInvoiceById, getClientProfileById } from '@/lib/admin-ops';
import {
  buildInvoiceNumber,
  computeInvoiceAmounts,
  generateInvoicePdfBuffer,
  invoicePdfFileName,
  NORTH_VIA_INVOICE_ISSUER,
} from '@/lib/invoice';
import type {
  AdminFollowUpItem,
  AdminInvoiceItem,
  AdminTaskItem,
  ClientProfile,
  FollowUpStatus,
  InvoiceItemStatus,
  ReportItemStatus,
} from '@/types/database';

const collections = getAdminCollectionNames();
const DEFAULT_INVOICE_DESCRIPTION = 'Marketing & consulting monthly bundle';
const DEFAULT_SERVICE_SUMMARY = 'Digital marketing and business consultation';
const DEFAULT_INVOICE_DUE_DAYS = 7;

function valueAsString(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : '';
}

function optionalString(value: FormDataEntryValue | null) {
  const normalized = valueAsString(value);
  return normalized || undefined;
}

function optionalNumber(value: FormDataEntryValue | null) {
  const normalized = valueAsString(value);
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function nowIso() {
  return new Date().toISOString();
}

function refreshAdminPages() {
  revalidatePath('/admin');
  revalidatePath('/admin/tasks');
  revalidatePath('/admin/follow-ups');
  revalidatePath('/admin/reports');
  revalidatePath('/admin/invoices');
}

function createUtcDate(year: number, monthIndex: number, day: number) {
  return new Date(Date.UTC(year, monthIndex, day));
}

function formatUtcDate(date: Date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function currentMonthKey() {
  return nowIso().slice(0, 7);
}

function parseMonthKey(monthKey: string) {
  const match = monthKey.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }

  return {
    year,
    monthIndex: month - 1,
  };
}

function monthLabelFromKey(monthKey: string) {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) return monthKey;

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(createUtcDate(parsed.year, parsed.monthIndex, 1));
}

function firstDayOfMonth(monthKey: string) {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) return undefined;
  return formatUtcDate(createUtcDate(parsed.year, parsed.monthIndex, 1));
}

function lastDayOfMonth(monthKey: string) {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) return undefined;
  return formatUtcDate(createUtcDate(parsed.year, parsed.monthIndex + 1, 0));
}

function addMonthsToMonthKey(monthKey: string, monthDelta: number) {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) return currentMonthKey();

  const date = createUtcDate(parsed.year, parsed.monthIndex + monthDelta, 1);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function addDays(dateString: string | undefined, dayDelta: number) {
  if (!dateString) return undefined;
  const date = new Date(`${dateString}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return undefined;
  date.setUTCDate(date.getUTCDate() + dayDelta);
  return formatUtcDate(date);
}

function inferInvoiceDueDays(invoice: Partial<AdminInvoiceItem>) {
  if (!invoice.issueDate || !invoice.dueDate) {
    return DEFAULT_INVOICE_DUE_DAYS;
  }

  const issueDate = new Date(`${invoice.issueDate}T00:00:00Z`);
  const dueDate = new Date(`${invoice.dueDate}T00:00:00Z`);
  if (Number.isNaN(issueDate.getTime()) || Number.isNaN(dueDate.getTime())) {
    return DEFAULT_INVOICE_DUE_DAYS;
  }

  const diffMs = dueDate.getTime() - issueDate.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return diffDays >= 0 ? diffDays : DEFAULT_INVOICE_DUE_DAYS;
}

function deriveInvoiceMonthKey(invoice: Partial<AdminInvoiceItem>) {
  if (invoice.serviceMonthKey) return invoice.serviceMonthKey;
  if (invoice.billingPeriodFrom?.match(/^\d{4}-\d{2}-\d{2}$/)) return invoice.billingPeriodFrom.slice(0, 7);
  if (invoice.issueDate?.match(/^\d{4}-\d{2}-\d{2}$/)) return invoice.issueDate.slice(0, 7);
  return currentMonthKey();
}

function buildClientInvoiceDraft(input: {
  client: ClientProfile & { id: string };
  monthKey: string;
  ownerNote?: string;
  status?: InvoiceItemStatus;
}) {
  const { client, monthKey, ownerNote, status } = input;
  const standardAmount = Number(client.invoiceTemplateStandardAmount || 0);
  const discountAmount = Number(client.invoiceTemplateDiscountAmount || 0);
  const amounts = computeInvoiceAmounts({ standardAmount, discountAmount });
  const billingPeriodFrom = firstDayOfMonth(monthKey);
  const billingPeriodTo = lastDayOfMonth(monthKey);
  const issueDate = billingPeriodTo;
  const dueDays = Number.isFinite(client.invoiceTemplateDueDays)
    ? Number(client.invoiceTemplateDueDays)
    : DEFAULT_INVOICE_DUE_DAYS;
  const dueDate = addDays(issueDate, dueDays);

  return {
    clientId: client.id,
    clientName: client.businessName,
    recipientEmail: client.invoiceRecipientEmail || client.email || undefined,
    invoiceNumber: buildInvoiceNumber({
      clientName: client.businessName,
      issueDate,
    }),
    description: client.invoiceTemplateDescription || DEFAULT_INVOICE_DESCRIPTION,
    standardAmount: amounts.standardAmount,
    discountAmount: amounts.discountAmount,
    subtotalAmount: amounts.subtotalAmount,
    totalAmount: amounts.totalAmount,
    amount: amounts.amount,
    currency: client.invoiceTemplateCurrency || 'USD',
    serviceMonth: monthLabelFromKey(monthKey),
    serviceMonthKey: monthKey,
    billingPeriodFrom,
    billingPeriodTo,
    serviceSummary: client.invoiceTemplateServiceSummary || DEFAULT_SERVICE_SUMMARY,
    issueDate,
    dueDate,
    paymentNote:
      client.invoiceTemplatePaymentNote ||
      `Please send payment via e-Transfer to ${NORTH_VIA_INVOICE_ISSUER.eTransferEmail}.`,
    ownerNote,
    isTemplateGenerated: true,
    status: status || 'draft',
  } satisfies Omit<AdminInvoiceItem, 'id' | 'createdAt' | 'updatedAt'>;
}

function buildNextInvoiceDraftFromInvoice(invoice: AdminInvoiceItem) {
  const currentMonth = deriveInvoiceMonthKey(invoice);
  const nextMonth = addMonthsToMonthKey(currentMonth, 1);
  const issueDate = lastDayOfMonth(nextMonth);
  const dueDate = addDays(issueDate, inferInvoiceDueDays(invoice));
  const amounts = computeInvoiceAmounts({
    standardAmount: Number(invoice.standardAmount || invoice.amount || 0),
    discountAmount: Number(invoice.discountAmount || 0),
  });

  return {
    clientId: invoice.clientId,
    clientName: invoice.clientName,
    recipientEmail: invoice.recipientEmail,
    invoiceNumber: buildInvoiceNumber({
      clientName: invoice.clientName,
      issueDate,
    }),
    description: invoice.description || DEFAULT_INVOICE_DESCRIPTION,
    standardAmount: amounts.standardAmount,
    discountAmount: amounts.discountAmount,
    subtotalAmount: amounts.subtotalAmount,
    totalAmount: amounts.totalAmount,
    amount: amounts.amount,
    currency: invoice.currency || 'USD',
    serviceMonth: monthLabelFromKey(nextMonth),
    serviceMonthKey: nextMonth,
    billingPeriodFrom: firstDayOfMonth(nextMonth),
    billingPeriodTo: lastDayOfMonth(nextMonth),
    serviceSummary: invoice.serviceSummary || DEFAULT_SERVICE_SUMMARY,
    issueDate,
    dueDate,
    paymentNote: invoice.paymentNote,
    ownerNote: invoice.ownerNote,
    isTemplateGenerated: true,
    status: 'draft' as InvoiceItemStatus,
  } satisfies Omit<AdminInvoiceItem, 'id' | 'createdAt' | 'updatedAt'>;
}

async function findInvoiceByClientAndMonth(clientId: string, monthKey: string) {
  const snapshot = await db
    .collection(collections.invoices)
    .where('clientId', '==', clientId)
    .where('serviceMonthKey', '==', monthKey)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...(doc.data() as Record<string, any>),
  } as AdminInvoiceItem;
}

async function ensureNextInvoiceDraft(invoice: AdminInvoiceItem) {
  if (!invoice.clientId) return;

  const nextDraft = buildNextInvoiceDraftFromInvoice(invoice);
  const existing = await findInvoiceByClientAndMonth(invoice.clientId, nextDraft.serviceMonthKey || '');
  if (existing) return;

  const timestamp = nowIso();
  await db.collection(collections.invoices).add({
    ...nextDraft,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

export async function createAdminTask(formData: FormData) {
  try {
    const title = valueAsString(formData.get('title'));
    if (!title) return { success: false, error: 'Title is required.' };

    const timestamp = nowIso();
    const payload: AdminTaskItem = {
      title,
      details: optionalString(formData.get('details')),
      client: optionalString(formData.get('client')),
      type: (valueAsString(formData.get('type')) || 'focus') as AdminTaskItem['type'],
      priority: (valueAsString(formData.get('priority')) || 'medium') as AdminTaskItem['priority'],
      status: (valueAsString(formData.get('status')) || 'top_3') as AdminTaskItem['status'],
      dueDate: optionalString(formData.get('dueDate')),
      ownerNote: optionalString(formData.get('ownerNote')),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await db.collection(collections.tasks).add(payload);
    refreshAdminPages();
    return { success: true };
  } catch (error: any) {
    console.error('Failed to create admin task:', error);
    return { success: false, error: error.message || 'Failed to create task.' };
  }
}

export async function updateAdminTaskStatus(formData: FormData) {
  try {
    const id = valueAsString(formData.get('id'));
    const status = valueAsString(formData.get('status'));
    if (!id || !status) return { success: false, error: 'Task id and status are required.' };

    await db.collection(collections.tasks).doc(id).update({
      status,
      updatedAt: nowIso(),
    });

    refreshAdminPages();
    return { success: true };
  } catch (error: any) {
    console.error('Failed to update task status:', error);
    return { success: false, error: error.message || 'Failed to update task.' };
  }
}

export async function createAdminFollowUp(formData: FormData) {
  try {
    const clientName = valueAsString(formData.get('clientName'));
    const reason = valueAsString(formData.get('reason'));
    const nextFollowUpDate = valueAsString(formData.get('nextFollowUpDate'));
    if (!clientName || !reason || !nextFollowUpDate) {
      return { success: false, error: 'Client, reason, and next follow-up date are required.' };
    }

    const timestamp = nowIso();
    const payload = {
      clientName,
      contactPerson: optionalString(formData.get('contactPerson')),
      channel: (valueAsString(formData.get('channel')) || 'whatsapp') as AdminFollowUpItem['channel'],
      reason,
      lastContactDate: optionalString(formData.get('lastContactDate')),
      nextFollowUpDate,
      cadenceStyle: optionalString(formData.get('cadenceStyle')),
      currentIssue: optionalString(formData.get('currentIssue')),
      promisedNextStep: optionalString(formData.get('promisedNextStep')),
      notes: optionalString(formData.get('notes')),
      ownerNote: optionalString(formData.get('ownerNote')),
      status: (valueAsString(formData.get('status')) || 'due_soon') as FollowUpStatus,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await db.collection(collections.followUps).add(payload);
    refreshAdminPages();
    return { success: true };
  } catch (error: any) {
    console.error('Failed to create follow-up:', error);
    return { success: false, error: error.message || 'Failed to create follow-up.' };
  }
}

export async function updateAdminFollowUpStatus(formData: FormData) {
  try {
    const id = valueAsString(formData.get('id'));
    const status = valueAsString(formData.get('status')) as FollowUpStatus;
    if (!id || !status) return { success: false, error: 'Follow-up id and status are required.' };

    const updateData: Partial<AdminFollowUpItem> = {
      status,
      updatedAt: nowIso(),
    };

    if (status === 'done') {
      updateData.lastContactDate = new Date().toISOString().slice(0, 10);
    }

    await db.collection(collections.followUps).doc(id).update(updateData);
    refreshAdminPages();
    return { success: true };
  } catch (error: any) {
    console.error('Failed to update follow-up status:', error);
    return { success: false, error: error.message || 'Failed to update follow-up.' };
  }
}

export async function createAdminReportItem(formData: FormData) {
  try {
    const clientName = valueAsString(formData.get('clientName'));
    if (!clientName) return { success: false, error: 'Client name is required.' };

    const timestamp = nowIso();
    await db.collection(collections.reports).add({
      clientName,
      reportType: valueAsString(formData.get('reportType')) || 'custom',
      reportingPeriod: optionalString(formData.get('reportingPeriod')),
      dueDate: optionalString(formData.get('dueDate')),
      keyFocus: optionalString(formData.get('keyFocus')),
      notes: optionalString(formData.get('notes')),
      ownerNote: optionalString(formData.get('ownerNote')),
      sentDate: optionalString(formData.get('sentDate')),
      status: (valueAsString(formData.get('status')) || 'not_started') as ReportItemStatus,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    refreshAdminPages();
    return { success: true };
  } catch (error: any) {
    console.error('Failed to create report item:', error);
    return { success: false, error: error.message || 'Failed to create report item.' };
  }
}

export async function updateAdminReportStatus(formData: FormData) {
  try {
    const id = valueAsString(formData.get('id'));
    const status = valueAsString(formData.get('status')) as ReportItemStatus;
    if (!id || !status) return { success: false, error: 'Report id and status are required.' };

    const payload: Record<string, string> = {
      status,
      updatedAt: nowIso(),
    };

    if (status === 'sent') {
      payload.sentDate = new Date().toISOString().slice(0, 10);
    }

    await db.collection(collections.reports).doc(id).update(payload);
    refreshAdminPages();
    return { success: true };
  } catch (error: any) {
    console.error('Failed to update report status:', error);
    return { success: false, error: error.message || 'Failed to update report item.' };
  }
}

export async function createAdminInvoiceItem(formData: FormData) {
  try {
    const clientId = valueAsString(formData.get('clientId'));
    const billingMonth = valueAsString(formData.get('billingMonth')) || currentMonthKey();
    if (!clientId) {
      return { success: false, error: 'Client is required.' };
    }

    const client = await getClientProfileById(clientId);
    if (!client?.id) {
      return { success: false, error: 'Client record not found.' };
    }

    const existing = await findInvoiceByClientAndMonth(clientId, billingMonth);
    if (existing) {
      refreshAdminPages();
      return { success: true, invoiceId: existing.id, duplicated: false };
    }

    const timestamp = nowIso();
    const payload = buildClientInvoiceDraft({
      client,
      monthKey: billingMonth,
      ownerNote: optionalString(formData.get('ownerNote')),
      status: (valueAsString(formData.get('status')) || 'draft') as InvoiceItemStatus,
    });

    const docRef = await db.collection(collections.invoices).add({
      ...payload,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await ensureNextInvoiceDraft({
      id: docRef.id,
      ...payload,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    refreshAdminPages();
    return { success: true, invoiceId: docRef.id };
  } catch (error: any) {
    console.error('Failed to create invoice item:', error);
    return { success: false, error: error.message || 'Failed to create invoice item.' };
  }
}

export async function saveAdminInvoiceItem(formData: FormData) {
  try {
    const id = valueAsString(formData.get('id'));
    if (!id) {
      return { success: false, error: 'Invoice id is required.' };
    }

    const existingInvoice = await getAdminInvoiceById(id);
    if (!existingInvoice) {
      return { success: false, error: 'Invoice not found.' };
    }

    const clientId = valueAsString(formData.get('clientId')) || existingInvoice.clientId;
    const clientName = valueAsString(formData.get('clientName')) || existingInvoice.clientName;
    const standardAmount = optionalNumber(formData.get('standardAmount'));
    if (!clientName || standardAmount === undefined) {
      return { success: false, error: 'Client name and standard amount are required.' };
    }

    const discountAmount = optionalNumber(formData.get('discountAmount')) || 0;
    const amounts = computeInvoiceAmounts({
      standardAmount,
      discountAmount,
    });
    const issueDate = optionalString(formData.get('issueDate')) || existingInvoice.issueDate;
    const serviceMonthKey =
      optionalString(formData.get('serviceMonthKey')) ||
      deriveInvoiceMonthKey({
        billingPeriodFrom: optionalString(formData.get('billingPeriodFrom')) || existingInvoice.billingPeriodFrom,
        issueDate,
      });

    const payload = {
      clientId: clientId || undefined,
      clientName,
      recipientEmail: optionalString(formData.get('recipientEmail')) || undefined,
      invoiceNumber:
        valueAsString(formData.get('invoiceNumber')) ||
        buildInvoiceNumber({
          clientName,
          issueDate: issueDate || new Date().toISOString().slice(0, 10),
        }),
      description: optionalString(formData.get('description')),
      standardAmount: amounts.standardAmount,
      discountAmount: amounts.discountAmount,
      subtotalAmount: amounts.subtotalAmount,
      totalAmount: amounts.totalAmount,
      amount: amounts.amount,
      currency: valueAsString(formData.get('currency')) || 'USD',
      serviceMonth: optionalString(formData.get('serviceMonth')) || monthLabelFromKey(serviceMonthKey),
      serviceMonthKey,
      billingPeriodFrom: optionalString(formData.get('billingPeriodFrom')),
      billingPeriodTo: optionalString(formData.get('billingPeriodTo')),
      serviceSummary: optionalString(formData.get('serviceSummary')),
      issueDate,
      dueDate: optionalString(formData.get('dueDate')),
      paymentNote: optionalString(formData.get('paymentNote')),
      ownerNote: optionalString(formData.get('ownerNote')),
      status: (valueAsString(formData.get('status')) || 'draft') as InvoiceItemStatus,
      updatedAt: nowIso(),
    } satisfies Partial<AdminInvoiceItem>;

    await db.collection(collections.invoices).doc(id).update(payload);

    const savedInvoice: AdminInvoiceItem = {
      ...existingInvoice,
      ...payload,
      id,
    };

    await ensureNextInvoiceDraft(savedInvoice);

    refreshAdminPages();
    revalidatePath(`/admin/invoices/${id}`);
    return { success: true };
  } catch (error: any) {
    console.error('Failed to save invoice item:', error);
    return { success: false, error: error.message || 'Failed to save invoice item.' };
  }
}

export async function updateAdminInvoiceStatus(formData: FormData) {
  try {
    const id = valueAsString(formData.get('id'));
    const status = valueAsString(formData.get('status')) as InvoiceItemStatus;
    if (!id || !status) return { success: false, error: 'Invoice id and status are required.' };

    const payload: Record<string, string> = {
      status,
      updatedAt: nowIso(),
    };

    if (status === 'paid') {
      payload.paidDate = new Date().toISOString().slice(0, 10);
    }

    await db.collection(collections.invoices).doc(id).update(payload);
    refreshAdminPages();
    return { success: true };
  } catch (error: any) {
    console.error('Failed to update invoice status:', error);
    return { success: false, error: error.message || 'Failed to update invoice item.' };
  }
}

export async function sendAdminInvoiceEmail(formData: FormData) {
  try {
    const id = valueAsString(formData.get('id'));
    if (!id) return { success: false, error: 'Invoice id is required.' };

    const doc = await db.collection(collections.invoices).doc(id).get();
    if (!doc.exists) return { success: false, error: 'Invoice not found.' };

    const invoice = {
      id: doc.id,
      ...(doc.data() as Record<string, any>),
    } as AdminInvoiceItem;

    if (!invoice.recipientEmail) {
      return { success: false, error: 'Recipient email is missing for this invoice.' };
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const amountLabel = `${invoice.currency || 'USD'} ${Number(invoice.totalAmount || invoice.amount || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
    const monthLabel = invoice.serviceMonth ? ` for ${invoice.serviceMonth}` : '';
    const subject = `North Via Marketing Invoice${monthLabel} - ${invoice.clientName}`;
    const pdfBuffer = await generateInvoicePdfBuffer({
      ...invoice,
      invoiceNumber: invoice.invoiceNumber || buildInvoiceNumber(invoice),
      standardAmount: Number(invoice.standardAmount || invoice.amount || 0),
      discountAmount: Number(invoice.discountAmount || 0),
      subtotalAmount: Number(invoice.subtotalAmount || invoice.amount || 0),
      totalAmount: Number(invoice.totalAmount || invoice.amount || 0),
      amount: Number(invoice.amount || invoice.totalAmount || 0),
    });

    const html = `
      <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
        <h2 style="color: #274290; margin-bottom: 8px;">Invoice from North Via Marketing</h2>
        <p>Hello,</p>
        <p>Please find your invoice${monthLabel} attached as a PDF.</p>
        <div style="border: 1px solid #e5e7eb; border-radius: 14px; padding: 18px; background: #f8fafc; margin: 20px 0;">
          <p style="margin: 0 0 8px 0;"><strong>Client:</strong> ${invoice.clientName}</p>
          <p style="margin: 0 0 8px 0;"><strong>Invoice #:</strong> ${invoice.invoiceNumber || buildInvoiceNumber(invoice)}</p>
          <p style="margin: 0 0 8px 0;"><strong>Total:</strong> ${amountLabel}</p>
          ${(invoice.description || invoice.serviceSummary) ? `<p style="margin: 0 0 8px 0;"><strong>Description:</strong> ${invoice.description || invoice.serviceSummary}</p>` : ''}
          ${invoice.issueDate ? `<p style="margin: 0 0 8px 0;"><strong>Issue Date:</strong> ${invoice.issueDate}</p>` : ''}
          ${invoice.dueDate ? `<p style="margin: 0;"><strong>Due Date:</strong> ${invoice.dueDate}</p>` : ''}
        </div>
        <p>Please send payment via e-Transfer to <strong>${NORTH_VIA_INVOICE_ISSUER.eTransferEmail}</strong>.</p>
        <p>If you need anything clarified, just reply to this email.</p>
        <p>Best regards,<br />North Via Marketing</p>
      </div>
    `;

    await transporter.sendMail({
      from: `"${process.env.GMAIL_FROM_NAME || 'North Via Marketing'}" <${process.env.GMAIL_USER}>`,
      to: invoice.recipientEmail,
      subject,
      html,
      attachments: [
        {
          filename: invoicePdfFileName(invoice),
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    await db.collection(collections.invoices).doc(id).update({
      status: 'sent',
      sentDate: new Date().toISOString().slice(0, 10),
      updatedAt: nowIso(),
    });

    refreshAdminPages();
    return { success: true };
  } catch (error: any) {
    console.error('Failed to send invoice email:', error);
    return { success: false, error: error.message || 'Failed to send invoice email.' };
  }
}
