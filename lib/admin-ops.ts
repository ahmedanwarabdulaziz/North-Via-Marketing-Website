import { addDoc, getDoc, listDocs, newId, nextInvoiceSequence, updateDoc, type Table } from '@/lib/data/store';
import type {
  AdminFollowUpItem,
  AdminInvoiceItem,
  AdminReportItem,
  AdminTaskItem,
  ClientProfile,
} from '@/types/database';

const TASKS_COLLECTION: Table = 'admin_tasks';
const FOLLOWUPS_COLLECTION: Table = 'admin_followups';
const REPORTS_COLLECTION: Table = 'admin_reports';
const INVOICES_COLLECTION: Table = 'admin_invoices';

async function safeQuery<T>(collectionName: Table, orderField: string) {
  try {
    return await listDocs<T>(collectionName, { orderBy: orderField });
  } catch (error) {
    console.error(`Failed to query ${collectionName} ordered by ${orderField}:`, error);
    return [] as Array<T & { id: string }>;
  }
}

export async function listAdminTasks() {
  return safeQuery<AdminTaskItem>(TASKS_COLLECTION, 'createdAt');
}

export async function listAdminFollowUps() {
  const items = await safeQuery<AdminFollowUpItem>(FOLLOWUPS_COLLECTION, 'createdAt');
  return items.sort((a, b) => (a.nextFollowUpDate || '').localeCompare(b.nextFollowUpDate || ''));
}

export async function listAdminReports() {
  const items = await safeQuery<AdminReportItem>(REPORTS_COLLECTION, 'createdAt');
  return items.sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
}

export async function listAdminInvoices() {
  const items = await safeQuery<AdminInvoiceItem>(INVOICES_COLLECTION, 'createdAt');
  return items.sort((a, b) => {
    const left = b.serviceMonthKey || b.billingPeriodFrom || b.createdAt || '';
    const right = a.serviceMonthKey || a.billingPeriodFrom || a.createdAt || '';
    return left.localeCompare(right);
  });
}

export async function listClientProfiles() {
  return safeQuery<ClientProfile>('clients', 'brandName');
}

export async function getClientProfileById(clientId: string) {
  try {
    return await getDoc<ClientProfile>('clients', clientId);
  } catch (error) {
    console.error(`Failed to load client ${clientId}:`, error);
    return null;
  }
}

export async function getAdminInvoiceById(invoiceId: string) {
  try {
    return await getDoc<AdminInvoiceItem>(INVOICES_COLLECTION, invoiceId);
  } catch (error) {
    console.error(`Failed to load invoice ${invoiceId}:`, error);
    return null;
  }
}

export function getAdminCollectionNames() {
  return {
    tasks: TASKS_COLLECTION,
    followUps: FOLLOWUPS_COLLECTION,
    reports: REPORTS_COLLECTION,
    invoices: INVOICES_COLLECTION,
  };
}

export async function getNextInvoiceNumber(): Promise<string> {
  try {
    // Atomic database sequence, formatted as a 6 digit number like 032001
    return await nextInvoiceSequence();
  } catch (error) {
    console.error('Failed to generate invoice number:', error);
    return `INV-${Date.now()}`;
  }
}

export async function createAdminInvoice(data: Omit<AdminInvoiceItem, 'id' | 'createdAt' | 'updatedAt' | 'invoiceNumber'>) {
  const invoiceNumber = await getNextInvoiceNumber();
  
  const id = newId();
  const now = new Date().toISOString();
  
  const invoice: AdminInvoiceItem = {
    ...data,
    id,
    invoiceNumber,
    createdAt: now,
    updatedAt: now,
  };
  
  await addDoc(INVOICES_COLLECTION, invoice, id);
  return invoice;
}

export async function updateAdminInvoice(invoiceId: string, data: Partial<Omit<AdminInvoiceItem, 'id' | 'createdAt' | 'updatedAt'>>) {
  const now = new Date().toISOString();
  
  await updateDoc(INVOICES_COLLECTION, invoiceId, {
    ...data,
    updatedAt: now,
  });
}
