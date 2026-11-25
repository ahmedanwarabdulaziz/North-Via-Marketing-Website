// Quotes & invoices (Sanad): the document shape and the money math, same as the website's
// lib/sales-docs-shared.ts (the printed copy is made by the website, so the two must agree).

export type DocKind = 'quote' | 'invoice';
export type DocStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'paid' | 'cancelled';

export interface DocItem {
  id: string;
  name: string;
  description?: string;
  unit?: string;
  qty: number;
  cost?: number;
  price: number;
}

export interface DocTerm {
  id: string;
  text: string;
  on: boolean;
}

export interface DocShow {
  unit: boolean;
  qty: boolean;
  unitPrice: boolean;
  lineTotal: boolean;
  totals: boolean;
  itemDescription: boolean;
  discount: boolean;
  vat: boolean;
  amountInWords: boolean;
  validity: boolean;
  terms: boolean;
  paymentInfo: boolean;
  registration: boolean;
  stamp: boolean;
  signature: boolean;
}

export interface SalesDoc {
  id: string;
  kind: DocKind;
  number: string;
  status: DocStatus;
  issueDate: string;
  validDays: number;
  clientName: string;
  clientContact?: string;
  signerName?: string;
  clientPhone?: string;
  clientEmail?: string;
  clientAddress?: string;
  clientTaxId?: string;
  subject?: string;
  items: DocItem[];
  currency: string;
  discount: number;
  discountIsPercent: boolean;
  vatPercent: number;
  trackCost: boolean;
  terms: DocTerm[];
  notes?: string;
  show: DocShow;
  fromQuoteId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuoteListItem {
  id: string;
  kind: DocKind;
  number: string;
  status: DocStatus;
  issueDate: string;
  clientName: string;
  currency: string;
  total: number | null;
  profit: number | null;
  margin: number | null;
}

export const STATUS_LABELS: Record<DocStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  accepted: 'Accepted',
  rejected: 'Rejected',
  paid: 'Paid',
  cancelled: 'Cancelled',
};

export const SHOW_LABELS: Record<keyof DocShow, string> = {
  unit: 'Unit column',
  qty: 'Quantity column',
  unitPrice: 'Unit price column',
  lineTotal: 'Line total column',
  totals: 'Totals (sum, VAT, grand total)',
  itemDescription: 'Item descriptions',
  discount: 'Discount',
  vat: 'VAT',
  amountInWords: 'Amount in words',
  validity: 'Offer validity',
  terms: 'Terms & conditions',
  paymentInfo: 'Payment details',
  registration: 'Commercial register & tax card',
  stamp: 'Stamp',
  signature: 'Signature',
};

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function lineTotal(item: Pick<DocItem, 'qty' | 'price'>) {
  return round2((Number(item.qty) || 0) * (Number(item.price) || 0));
}

export function computeTotals(doc: Pick<SalesDoc, 'items' | 'discount' | 'discountIsPercent' | 'vatPercent'>) {
  const subtotal = round2(doc.items.reduce((sum, item) => sum + lineTotal(item), 0));
  const raw = Number(doc.discount) || 0;
  const discount = Math.min(subtotal, round2(doc.discountIsPercent ? (subtotal * raw) / 100 : raw));
  const afterDiscount = round2(subtotal - discount);
  const vat = round2((afterDiscount * (Number(doc.vatPercent) || 0)) / 100);
  const total = round2(afterDiscount + vat);
  const cost = round2(doc.items.reduce((sum, item) => sum + (Number(item.qty) || 0) * (Number(item.cost) || 0), 0));
  const profit = round2(afterDiscount - cost);
  return {
    subtotal,
    discount,
    afterDiscount,
    vat,
    total,
    cost,
    profit,
    margin: afterDiscount > 0 ? round2((profit / afterDiscount) * 100) : 0,
    markup: cost > 0 ? round2((profit / cost) * 100) : 0,
  };
}

export function itemMargin(item: DocItem) {
  const price = Number(item.price) || 0;
  return price > 0 ? round2(((price - (Number(item.cost) || 0)) / price) * 100) : 0;
}

export function money(value: number | null | undefined) {
  return (Number(value) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const id = () => Math.random().toString(36).slice(2, 10);
export const newItem = (): DocItem => ({ id: id(), name: '', unit: '', qty: 1, price: 0 });
export const newTerm = (): DocTerm => ({ id: id(), text: '', on: true });
