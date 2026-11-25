/**
 * Price quotes and invoices for Sanad (Egypt). Stored as two settings documents
 * (app_settings), so no migration is needed: `sanad_company` and `sanad_docs`.
 * Cost and profit are for the owner only and are never part of a printed copy.
 */

export type DocKind = 'quote' | 'invoice';
export type DocStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'paid' | 'cancelled';

/** Sanad's logo, fixed. The stamp is this logo plus the register and tax numbers. */
export const SANAD_LOGO = '/sanad-logo.png';

/** One line of terms and conditions, ticked when it should print. */
export interface DocTerm {
  id: string;
  text: string;
  on: boolean;
}

export function newTerm(text = '', on = true): DocTerm {
  return { id: Math.random().toString(36).slice(2, 10), text, on };
}

export function termsFromText(text: string): DocTerm[] {
  return text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => newTerm(l));
}

export interface DocItem {
  id: string;
  name: string;
  description?: string;
  unit?: string;
  qty: number;
  /** What it costs us per unit (optional, internal). */
  cost?: number;
  /** What we sell it for per unit. */
  price: number;
}

/** What shows on the printed copy. */
export interface DocShow {
  unit: boolean;
  qty: boolean;
  unitPrice: boolean;
  lineTotal: boolean;
  /** The whole totals block (sum, discount, VAT, grand total, amount in words). Off for a price list. */
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
  /** Quotes: how many days the offer stays valid. */
  validDays: number;
  clientName: string;
  clientContact?: string;
  /** Printed as a handwritten signature. */
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
  /** Whether cost and profit are tracked on this document. */
  trackCost: boolean;
  /** Printed under the table. */
  terms: DocTerm[];
  /** Internal, never printed. */
  notes?: string;
  show: DocShow;
  /** Invoices: quote this one came from. */
  fromQuoteId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyProfile {
  nameAr: string;
  nameEn: string;
  taglineAr: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  commercialRegister: string;
  taxCard: string;
  /** Hex colour of the stamp ink. */
  stampColor: string;
  paymentInfo: string;
  defaultTerms: string;
  defaultValidDays: number;
  defaultVatPercent: number;
  defaultCurrency: string;
  signerName: string;
  signerTitle: string;
}

export const DEFAULT_COMPANY: CompanyProfile = {
  nameAr: 'سند للتطوير العقاري',
  nameEn: 'Sanad for Real Estate Development',
  taglineAr: 'تطوير • استثمار • إدارة',
  address: '',
  phone: '',
  email: '',
  website: '',
  commercialRegister: '',
  taxCard: '',
  stampColor: '#1d3fa8',
  paymentInfo: '',
  defaultTerms: 'الأسعار شاملة التوريد والتركيب ما لم يُذكر خلاف ذلك.\nشروط الدفع: دفعة مقدمة عند التعاقد والباقي حسب مراحل التنفيذ.',
  defaultValidDays: 14,
  defaultVatPercent: 14,
  defaultCurrency: 'جنيه مصري',
  signerName: '',
  signerTitle: 'المدير العام',
};

export const DEFAULT_SHOW: DocShow = {
  unit: true,
  qty: true,
  unitPrice: true,
  lineTotal: true,
  totals: true,
  itemDescription: true,
  discount: true,
  vat: true,
  amountInWords: true,
  validity: true,
  terms: true,
  paymentInfo: true,
  registration: true,
  stamp: true,
  signature: true,
};

export const SHOW_LABELS: Record<keyof DocShow, string> = {
  unit: 'الوحدة',
  qty: 'الكمية',
  unitPrice: 'سعر الوحدة',
  lineTotal: 'إجمالي البند',
  totals: 'الإجماليات (المجموع والضريبة والإجمالي)',
  itemDescription: 'وصف البند',
  discount: 'الخصم',
  vat: 'ضريبة القيمة المضافة',
  amountInWords: 'المبلغ بالحروف',
  validity: 'مدة سريان العرض',
  terms: 'الشروط والأحكام',
  paymentInfo: 'بيانات الدفع',
  registration: 'السجل التجاري والبطاقة الضريبية',
  stamp: 'الختم',
  signature: 'التوقيع',
};

export const STATUS_LABELS: Record<DocStatus, string> = {
  draft: 'مسودة',
  sent: 'أُرسل',
  accepted: 'تمت الموافقة',
  rejected: 'مرفوض',
  paid: 'مدفوعة',
  cancelled: 'ملغي',
};

export const KIND_LABELS: Record<DocKind, string> = { quote: 'عرض سعر', invoice: 'فاتورة' };

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export interface DocTotals {
  subtotal: number;
  discount: number;
  afterDiscount: number;
  vat: number;
  total: number;
  cost: number;
  profit: number;
  /** Profit as a share of the selling price (before VAT). */
  margin: number;
  /** Profit as a share of the cost. */
  markup: number;
}

export function lineTotal(item: Pick<DocItem, 'qty' | 'price'>) {
  return round2((Number(item.qty) || 0) * (Number(item.price) || 0));
}

export function computeTotals(doc: Pick<SalesDoc, 'items' | 'discount' | 'discountIsPercent' | 'vatPercent'>): DocTotals {
  const subtotal = round2(doc.items.reduce((sum, item) => sum + lineTotal(item), 0));
  const rawDiscount = Number(doc.discount) || 0;
  const discount = Math.min(subtotal, round2(doc.discountIsPercent ? (subtotal * rawDiscount) / 100 : rawDiscount));
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
  const cost = Number(item.cost) || 0;
  return price > 0 ? round2(((price - cost) / price) * 100) : 0;
}

export function addDays(isoDate: string, days: number) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function nextNumber(kind: DocKind, docs: SalesDoc[], issueDate = todayIso()) {
  const year = issueDate.slice(0, 4);
  const prefix = kind === 'quote' ? 'Q' : 'INV';
  const re = new RegExp(`^${prefix}-${year}-(\\d+)$`);
  const max = docs.reduce((best, doc) => {
    const m = doc.kind === kind ? re.exec(doc.number) : null;
    return m ? Math.max(best, Number(m[1])) : best;
  }, 0);
  return `${prefix}-${year}-${String(max + 1).padStart(3, '0')}`;
}

export function newItem(): DocItem {
  return { id: Math.random().toString(36).slice(2, 10), name: '', unit: '', qty: 1, price: 0 };
}

export function blankDoc(kind: DocKind, docs: SalesDoc[], company: CompanyProfile): SalesDoc {
  const issueDate = todayIso();
  const now = new Date().toISOString();
  return {
    id: '',
    kind,
    number: nextNumber(kind, docs, issueDate),
    status: 'draft',
    issueDate,
    validDays: company.defaultValidDays,
    clientName: '',
    signerName: company.signerName,
    items: [newItem()],
    currency: company.defaultCurrency,
    discount: 0,
    discountIsPercent: false,
    vatPercent: company.defaultVatPercent,
    trackCost: false,
    terms: termsFromText(company.defaultTerms),
    show: { ...DEFAULT_SHOW },
    createdAt: now,
    updatedAt: now,
  };
}

// ---------- Money ----------

export function formatNumber(value: number) {
  return (Number(value) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatQty(value: number) {
  return (Number(value) || 0).toLocaleString('en-US', { maximumFractionDigits: 3 });
}

const ONES = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
const TENS = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
const HUNDREDS = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

function below1000(n: number) {
  const parts: string[] = [];
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (h) parts.push(HUNDREDS[h]);
  if (rest) {
    if (rest < 20) parts.push(ONES[rest]);
    else {
      const t = Math.floor(rest / 10);
      const o = rest % 10;
      parts.push(o ? `${ONES[o]} و${TENS[t]}` : TENS[t]);
    }
  }
  return parts.join(' و');
}

function integerInArabic(n: number): string {
  if (n === 0) return 'صفر';
  const groups: { value: number; one: string; two: string; few: string; many: string }[] = [
    { value: Math.floor(n / 1_000_000_000) % 1000, one: 'مليار', two: 'ملياران', few: 'مليارات', many: 'مليار' },
    { value: Math.floor(n / 1_000_000) % 1000, one: 'مليون', two: 'مليونان', few: 'ملايين', many: 'مليون' },
    { value: Math.floor(n / 1000) % 1000, one: 'ألف', two: 'ألفان', few: 'آلاف', many: 'ألف' },
  ];
  const parts: string[] = [];
  for (const g of groups) {
    if (!g.value) continue;
    if (g.value === 1) parts.push(g.one);
    else if (g.value === 2) parts.push(g.two);
    else if (g.value <= 10) parts.push(`${below1000(g.value)} ${g.few}`);
    else parts.push(`${below1000(g.value)} ${g.many}`);
  }
  const last = n % 1000;
  if (last) parts.push(below1000(last));
  return parts.join(' و');
}

/** "فقط ثلاثة آلاف جنيه وخمسون قرشاً لا غير" */
export function amountInArabicWords(amount: number, currency: string) {
  const value = Math.max(0, Math.round((Number(amount) || 0) * 100) / 100);
  const whole = Math.floor(value);
  const fraction = Math.round((value - whole) * 100);
  const isEgp = /جنيه/.test(currency);
  const main = `${integerInArabic(whole)} ${currency}`;
  const sub = fraction ? ` و${integerInArabic(fraction)} ${isEgp ? 'قرشاً' : 'من مئة'}` : '';
  return `فقط ${main}${sub} لا غير`;
}

/** Clean, same-script file name for the PDF, e.g. "Sanad - Quotation Q-2026-001.pdf". */
export function docFileName(doc: Pick<SalesDoc, 'kind' | 'number'>, company: Pick<CompanyProfile, 'nameEn'>) {
  const brand = (company.nameEn || 'Sanad').replace(/(for|real estate|development).*$/i, '').replace(/[^A-Za-z0-9 ]/g, '').trim() || 'Sanad';
  const kind = doc.kind === 'quote' ? 'Quotation' : 'Invoice';
  return `${brand} - ${kind} ${doc.number.replace(/[^A-Za-z0-9-]/g, '')}`;
}
