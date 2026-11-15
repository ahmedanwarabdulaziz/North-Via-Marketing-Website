// JSON shapes returned by the website's /api/app routes (see lib/app-api.ts there).

export interface AppTask {
  id: string;
  title: string;
  notes: string | null;
  kind: 'task' | 'reminder';
  category: 'work' | 'personal';
  clientId: string | null;
  clientName: string | null;
  priority: 'low' | 'normal' | 'high';
  status: 'open' | 'done' | 'cancelled';
  dueAt: string | null;
  allDay: boolean;
  remindAt: string | null;
  when: string | null;
  overdue: boolean;
  repeats: boolean;
  source: string;
  createdAt: string;
  doneAt: string | null;
  whatsappUrl?: string | null;
}

export interface AppEmail {
  id: string;
  inbox: { id: string; email: string; label: string | null } | null;
  fromName: string | null;
  fromEmail: string | null;
  subject: string | null;
  receivedAt: string | null;
  summary: string | null;
  reason: string | null;
  urgent: boolean;
  status: 'new' | 'replying' | 'draft' | 'sent' | 'done' | 'ignored' | 'skipped';
  snippet: string | null;
  draft: string | null;
  sentAt: string | null;
  canReply?: boolean;
  body?: string | null;
  brief?: string | null;
}

export interface AppWebsite {
  id?: string;
  clientId: string;
  url: string;
  label: string | null;
  status: string;
  lastStatusCode: number | null;
  lastResponseMs: number | null;
  lastError: string | null;
  downSince: string | null;
  sslExpiresAt: string | null;
  lastCheckedAt: string | null;
  clientName?: string | null;
}

export interface AppClient {
  id: string;
  name: string;
  owner: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  links: { facebook: string | null; instagram: string | null; tiktok: string | null; google: string | null };
  openTasks?: number;
  sitesDown?: number;
}

export interface HomeData {
  generatedAt: string;
  tasks: {
    counts: { overdue: number; today: number; tomorrow: number; week: number; noDate: number };
    overdue: AppTask[];
    today: AppTask[];
  };
  emails: { waiting: number; urgent: number; drafts: number; latest: AppEmail[] };
  reviews: { waiting: number; bad: number } | null;
  websites: { total: number; down: AppWebsite[]; sslSoon: AppWebsite[] } | null;
}

export interface TaskGroups {
  overdue: AppTask[];
  today: AppTask[];
  tomorrow: AppTask[];
  week: AppTask[];
  noDate: AppTask[];
}

export type MissingField = 'category' | 'client' | 'when' | 'time' | 'repeat_end';

export interface TaskFields {
  title?: string;
  notes?: string | null;
  kind?: 'task' | 'reminder';
  category?: 'work' | 'personal' | null;
  clientId?: string | null;
  noClient?: boolean;
  date?: string | null;
  time?: string | null;
  allDay?: boolean;
  noDate?: boolean;
  priority?: 'low' | 'normal' | 'high';
  repeat?: unknown;
  repeatUntil?: string | null;
  repeatCount?: number | null;
  repeatForever?: boolean;
}

export interface AddTaskResult {
  saved: boolean;
  task?: AppTask;
  needs?: MissingField[];
  questions?: Partial<Record<MissingField, string>>;
  fields?: TaskFields;
  heard?: string | null;
}

export interface Audio {
  data: string; // base64
  mimeType: string;
}

export interface AppReview {
  id: string;
  clientId: string;
  clientName: string | null;
  location: string;
  reviewer: string;
  rating: number;
  comment: string;
  createdAt: string;
  status: 'draft_ready' | 'needs_draft' | 'posted' | 'replied' | 'skipped';
  waiting: boolean;
  draft: string | null;
  draftError: string | null;
  reply: string | null;
  postedAt: string | null;
  whatsappUrl: string;
}

export interface LibraryItem {
  id: string;
  type: 'screenshot' | 'link' | 'note';
  title: string;
  summary: string | null;
  url: string | null;
  domain: string | null;
  tags: string[];
  clientId: string | null;
  clientName: string | null;
  personal: boolean;
  categoryId: string;
  categoryName: string | null;
  imageUrl: string | null;
  createdAt: string;
  content?: string | null;
  sourceText?: string | null;
}

export interface QuickLink {
  id: string;
  title: string;
  url: string;
  message: string | null;
  clientId: string | null;
  clientName: string | null;
  pinned: boolean;
  uses: number;
}

// JL Comfort (jlcomfort.com) orders and sample requests, through /api/app/jl/*.
export interface JlEvent {
  id: string;
  type: string;
  message: string;
  createdAt: string;
}

export interface JlOrderItem {
  id: string;
  itemType: string;
  fulfilledBy: 'supplier' | 'workshop';
  sku: string | null;
  name: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  amountCents: number;
}

export interface JlOrder {
  id: string;
  orderNumber: string;
  status: string;
  statusLabel: string;
  isTest: boolean;
  currency: string;
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  discountLabel: string | null;
  discountCents: number;
  customerEmail: string;
  customerName: string;
  customerPhone: string | null;
  shipLine1: string;
  shipLine2: string | null;
  shipCity: string;
  shipRegion: string;
  shipPostalCode: string;
  shipCountry: string;
  supplierOrderNumber: string | null;
  supplierInvoiceNumber: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  paidAt: string | null;
  supplierEmailedAt: string | null;
  shippedAt: string | null;
  createdAt: string;
  itemCount: number;
  items: JlOrderItem[];
  events?: JlEvent[];
}

export interface JlSample {
  id: string;
  requestNumber: string;
  status: string;
  statusLabel: string;
  name: string;
  email: string;
  phone?: string;
  address: { line1: string; line2?: string; city: string; state: string; zip: string; country: string };
  items: { fabricId: string; name: string; sku: string; imageUrl: string }[];
  supplierOrderNumber: string | null;
  supplierInvoiceNumber: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  supplierEmailedAt: string | null;
  shippedAt: string | null;
  createdAt: string;
  events?: JlEvent[];
}

export interface JlOverview {
  orders: Record<string, number>;
  testOrders: number;
  samples: Record<string, number>;
  carriers: { id: string; name: string }[];
  orderStatuses: Record<string, string>;
  sampleStatuses: Record<string, string>;
}
