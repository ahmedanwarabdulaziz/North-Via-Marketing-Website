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
  adsStopped?: StoppedAd[];
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
  /** Sample requests by the same customer (email or postal code) before this order. */
  samplesBefore?: { requestNumber: string; createdAt: string; matchedBy: 'email' | 'name' | 'phone' | 'postal code' }[];
  /** Emails from this customer in Anwarz's inboxes before the order. */
  emailedBefore?: { count: number; firstAt: string; inboxes: string[]; matchedBy?: string[]; subjects?: string[] } | null;
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
  /** When "Charlotte confirmed" last emailed the customer. */
  confirmedAt?: string | null;
}

export interface JlOverview {
  orders: Record<string, number>;
  testOrders: number;
  samples: Record<string, number>;
  carriers: { id: string; name: string }[];
  orderStatuses: Record<string, string>;
  sampleStatuses: Record<string, string>;
}

// Marketing: ads, followers and competitors (/api/app/marketing/*).
export type AdsState = 'running' | 'limited' | 'stopped' | 'idle' | 'error';
export interface AdsHealth {
  state: AdsState;
  reason: string;
  since: string;
  checkedAt: string;
}
export interface GoogleAdsCard {
  currency?: string;
  spend?: number;
  impressions?: number;
  clicks?: number;
  conversions?: number;
  ctr?: number | null;
  costPerConversion?: number | null;
  prev?: { spend: number; impressions: number; clicks: number; conversions: number } | null;
  health: AdsHealth | null;
  error: string | null;
}
export interface MetaAdsCard {
  currency?: string;
  spend?: number;
  reach?: number;
  impressions?: number;
  clicks?: number;
  linkClicks?: number;
  ctr?: number | null;
  prev?: { spend: number; reach: number; clicks: number; linkClicks: number } | null;
  health: AdsHealth | null;
  error: string | null;
}
export interface StoppedAd {
  clientId: string;
  clientName: string;
  platform: 'google' | 'meta';
  reason: string;
  since: string;
}
export interface AdsOverview {
  days: number;
  clients: { clientId: string; clientName: string; google: GoogleAdsCard | null; meta: MetaAdsCard | null }[];
  stopped: StoppedAd[];
  checkedAt: string | null;
}
export interface FollowerStat {
  followers?: number;
  day?: number;
  week?: number;
}
export interface SocialClient {
  clientId: string;
  clientName: string;
  pages: { name: string; instagram: string | null; error: string | null }[];
  facebook: FollowerStat | null;
  instagram: FollowerStat | null;
  waitingComments: number;
}
export interface CompetitorRow {
  id: string;
  name: string;
  website: string | null;
  instagram: string | null;
  notes: string | null;
  status: {
    ig: { checkedAt: string; followers?: number; error?: string } | null;
    web: { checkedAt: string; error?: string } | null;
    google: { checkedAt: string; rating?: number; count?: number; error?: string } | null;
  };
  instagramGrowth: { followers: number; gained7: number | null } | null;
  googleGrowth: { rating?: number; count?: number; gained7: number | null } | null;
  adsUrl: string;
}
export interface CompetitorFinding {
  id: string;
  at: string;
  competitorName: string;
  source: 'instagram' | 'website' | 'google';
  kind: string;
  title: string;
  detail: string;
  idea: string | null;
  url: string | null;
}
