import { getSetting, setSetting } from '@/lib/data/store';
import {
  DEFAULT_COMPANY,
  DEFAULT_SHOW,
  STATUS_LABELS,
  nextNumber,
  termsFromText,
  todayIso,
  type CompanyProfile,
  type DocKind,
  type DocStatus,
  type SalesDoc,
} from '@/lib/sales-docs-shared';

/** Server-only storage for quotes and invoices (settings documents `sanad_company` and `sanad_docs`). */

// ---------- Storage ----------

const DOCS_KEY = 'sanad_docs';
const COMPANY_KEY = 'sanad_company';

export async function getCompany(): Promise<CompanyProfile> {
  const saved = await getSetting<Partial<CompanyProfile>>(COMPANY_KEY);
  return { ...DEFAULT_COMPANY, ...(saved || {}) };
}

export async function saveCompany(profile: Partial<CompanyProfile>) {
  const clean: Partial<CompanyProfile> = {};
  for (const key of Object.keys(DEFAULT_COMPANY) as (keyof CompanyProfile)[]) {
    if (profile[key] !== undefined) (clean as Record<string, unknown>)[key] = profile[key];
  }
  const merged = { ...(await getCompany()), ...clean };
  await setSetting(COMPANY_KEY, merged);
  return merged;
}

export async function listDocs(): Promise<SalesDoc[]> {
  const saved = await getSetting<{ docs?: SalesDoc[] }>(DOCS_KEY);
  const docs = (saved?.docs ?? []).map((d) => ({ ...d, terms: Array.isArray(d.terms) ? d.terms : termsFromText(String(d.terms || '')) }));
  return [...docs].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}

export async function getDocById(id: string) {
  return (await listDocs()).find((doc) => doc.id === id) || null;
}

function sanitize(input: Partial<SalesDoc>, existing?: SalesDoc | null): SalesDoc {
  const now = new Date().toISOString();
  const kind: DocKind = input.kind === 'invoice' ? 'invoice' : 'quote';
  const items = (Array.isArray(input.items) ? input.items : []).slice(0, 200).map((item) => ({
    id: String(item.id || Math.random().toString(36).slice(2, 10)),
    name: String(item.name || '').slice(0, 300),
    description: item.description ? String(item.description).slice(0, 1000) : undefined,
    unit: item.unit ? String(item.unit).slice(0, 30) : undefined,
    qty: Number(item.qty) || 0,
    cost: item.cost === undefined || item.cost === null || (item.cost as unknown) === '' ? undefined : Number(item.cost) || 0,
    price: Number(item.price) || 0,
  }));
  const str = (v: unknown, max = 500) => (v ? String(v).slice(0, max) : undefined);
  return {
    id: existing?.id || '',
    kind,
    number: String(input.number || existing?.number || '').slice(0, 40),
    status: (Object.keys(STATUS_LABELS) as DocStatus[]).includes(input.status as DocStatus) ? (input.status as DocStatus) : 'draft',
    issueDate: /^\d{4}-\d{2}-\d{2}$/.test(String(input.issueDate)) ? String(input.issueDate) : todayIso(),
    validDays: Math.max(0, Math.min(3650, Number(input.validDays) || 0)),
    clientName: String(input.clientName || '').slice(0, 200),
    clientContact: str(input.clientContact, 200),
    signerName: str(input.signerName, 80),
    clientPhone: str(input.clientPhone, 60),
    clientEmail: str(input.clientEmail, 200),
    clientAddress: str(input.clientAddress, 400),
    clientTaxId: str(input.clientTaxId, 60),
    subject: str(input.subject, 300),
    items,
    currency: String(input.currency || 'جنيه مصري').slice(0, 30),
    discount: Math.max(0, Number(input.discount) || 0),
    discountIsPercent: !!input.discountIsPercent,
    vatPercent: Math.max(0, Math.min(100, Number(input.vatPercent) || 0)),
    trackCost: !!input.trackCost,
    terms: (Array.isArray(input.terms)
      ? input.terms
      : typeof input.terms === 'string'
        ? termsFromText(input.terms)
        : []
    ).slice(0, 60).map((t) => ({ id: String(t.id || Math.random().toString(36).slice(2, 10)), text: String(t.text || '').slice(0, 600), on: t.on !== false })),
    notes: str(input.notes, 4000),
    show: { ...DEFAULT_SHOW, ...(input.show || {}) },
    fromQuoteId: str(input.fromQuoteId, 40),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
}

export async function saveDoc(input: Partial<SalesDoc> & { id?: string }) {
  const docs = await listDocs();
  const existing = input.id ? docs.find((doc) => doc.id === input.id) || null : null;
  const doc = sanitize(input, existing);
  if (!doc.number) doc.number = nextNumber(doc.kind, docs, doc.issueDate);
  doc.id = existing?.id || `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const rest = docs.filter((d) => d.id !== doc.id);
  await setSetting(DOCS_KEY, { docs: [doc, ...rest] });
  return doc;
}

export async function deleteDoc(id: string) {
  const docs = await listDocs();
  await setSetting(DOCS_KEY, { docs: docs.filter((d) => d.id !== id) });
}

