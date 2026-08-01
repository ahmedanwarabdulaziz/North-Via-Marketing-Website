import type { firestore } from 'firebase-admin';
import { db } from '@/lib/firebase';
import type {
  AdminFollowUpItem,
  AdminInvoiceItem,
  AdminReportItem,
  AdminTaskItem,
  ClientProfile,
} from '@/types/database';

const TASKS_COLLECTION = 'admin_tasks';
const FOLLOWUPS_COLLECTION = 'admin_followups';
const REPORTS_COLLECTION = 'admin_reports';
const INVOICES_COLLECTION = 'admin_invoices';

function normalizeDoc<T>(doc: firestore.QueryDocumentSnapshot | firestore.DocumentSnapshot) {
  return {
    id: doc.id,
    ...(doc.data() as T),
  } as T & { id: string };
}

async function safeQuery<T>(collectionName: string, orderField: string) {
  try {
    const snapshot = await db.collection(collectionName).orderBy(orderField, 'asc').get();
    return snapshot.docs.map((doc) => normalizeDoc<T>(doc));
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
    const doc = await db.collection('clients').doc(clientId).get();
    if (!doc.exists) return null;
    return normalizeDoc<ClientProfile>(doc);
  } catch (error) {
    console.error(`Failed to load client ${clientId}:`, error);
    return null;
  }
}

export async function getAdminInvoiceById(invoiceId: string) {
  try {
    const doc = await db.collection(INVOICES_COLLECTION).doc(invoiceId).get();
    if (!doc.exists) return null;
    return normalizeDoc<AdminInvoiceItem>(doc);
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
  const metadataRef = db.collection('admin_metadata').doc('invoices');
  
  try {
    const nextNumber = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(metadataRef);
      let nextSeq = 1;
      
      if (doc.exists) {
        const data = doc.data();
        if (data?.lastInvoiceSequence) {
          nextSeq = data.lastInvoiceSequence + 1;
        }
      }
      
      transaction.set(metadataRef, { lastInvoiceSequence: nextSeq }, { merge: true });
      return nextSeq;
    });
    
    // Format as 6 digit number like 032001
    return String(nextNumber).padStart(6, '0');
  } catch (error) {
    console.error('Failed to generate invoice number:', error);
    return `INV-${Date.now()}`;
  }
}

export async function createAdminInvoice(data: Omit<AdminInvoiceItem, 'id' | 'createdAt' | 'updatedAt' | 'invoiceNumber'>) {
  const invoiceNumber = await getNextInvoiceNumber();
  
  const docRef = db.collection(INVOICES_COLLECTION).doc();
  const now = new Date().toISOString();
  
  const invoice: AdminInvoiceItem = {
    ...data,
    id: docRef.id,
    invoiceNumber,
    createdAt: now,
    updatedAt: now,
  };
  
  await docRef.set(invoice);
  return invoice;
}

export async function updateAdminInvoice(invoiceId: string, data: Partial<Omit<AdminInvoiceItem, 'id' | 'createdAt' | 'updatedAt'>>) {
  const docRef = db.collection(INVOICES_COLLECTION).doc(invoiceId);
  const now = new Date().toISOString();
  
  await docRef.update({
    ...data,
    updatedAt: now,
  });
}
