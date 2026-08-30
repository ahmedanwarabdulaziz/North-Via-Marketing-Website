export interface ContactSubmission {
  id?: string;
  name: string;
  email: string;
  company?: string;
  service?: string;
  message: string;
  status: 'new' | 'contacted' | 'won' | 'lost' | 'archived';
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface EmailLog {
  id?: string;
  submissionId: string;
  toEmail: string;
  subject: string;
  status: 'sent' | 'failed';
  providerMessageId?: string;
  errorMessage?: string;
  createdAt: string;
}

export interface GoogleConnection {
  id?: string;
  provider: 'google';
  accountEmail: string;
  encryptedAccessToken: string;
  encryptedRefreshToken?: string;
  tokenExpiry: number; // Unix timestamp
  scopes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface GoogleAdsAccount {
  id?: string;
  googleConnectionId: string;
  customerId: string;
  descriptiveName: string;
  currencyCode: string;
  timeZone: string;
  isSelected: boolean;
  
  // CRM & AI Intelligence Fields
  brandName?: string;
  ownerName?: string;
  aiPromptNotes?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface AdsReportSnapshot {
  id?: string; 
  customerId: string;
  dateRangeKey: string; // e.g., LAST_30_DAYS
  reportType: 'summary' | 'campaign' | 'daily';
  payloadJson: string; // JSON stringified array of data
  fetchedAt: string; // ISO date string
}

export interface AdminAuditLog {
  id?: string;
  action: string;
  metadataJson: string; 
  ipAddress: string;
  createdAt: string;
}

export interface ClientProfile {
  id?: string;
  brandName: string;
  ownerName: string;
  email: string;
  mobileNumber?: string;
  websiteUrl?: string;
  facebookLink?: string;
  instagramLink?: string;
  tiktokLink?: string;
  googleLink?: string;
  ga4PropertyId?: string;
  clarityProjectId?: string;
  clarityApiTokenEncrypted?: string;
  linkedGoogleAdsIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export type AdminTaskType = 'focus' | 'idea' | 'admin' | 'client' | 'system';
export type AdminTaskPriority = 'low' | 'medium' | 'high';
export type AdminTaskStatus = 'top_3' | 'doing' | 'waiting' | 'done';

export interface AdminTaskItem {
  id?: string;
  title: string;
  details?: string;
  client?: string;
  type: AdminTaskType;
  priority: AdminTaskPriority;
  status: AdminTaskStatus;
  dueDate?: string;
  ownerNote?: string;
  createdAt: string;
  updatedAt: string;
}

export type FollowUpChannel = 'whatsapp' | 'call' | 'email' | 'meeting';
export type FollowUpStatus = 'okay' | 'due_soon' | 'overdue' | 'waiting_on_client' | 'done';

export interface AdminFollowUpItem {
  id?: string;
  clientName: string;
  contactPerson?: string;
  channel: FollowUpChannel;
  reason: string;
  lastContactDate?: string;
  nextFollowUpDate: string;
  cadenceStyle?: string;
  currentIssue?: string;
  promisedNextStep?: string;
  notes?: string;
  ownerNote?: string;
  status: FollowUpStatus;
  createdAt: string;
  updatedAt: string;
}

export type ReportItemType = 'weekly' | 'monthly' | 'ads' | 'analysis' | 'custom';
export type ReportItemStatus = 'not_started' | 'gathering_data' | 'drafting' | 'ready' | 'sent';

export interface AdminReportItem {
  id?: string;
  clientName: string;
  reportType: ReportItemType;
  reportingPeriod?: string;
  dueDate?: string;
  keyFocus?: string;
  notes?: string;
  ownerNote?: string;
  sentDate?: string;
  status: ReportItemStatus;
  createdAt: string;
  updatedAt: string;
}

export type InvoiceItemStatus = 'draft' | 'ready_to_send' | 'sent' | 'paid' | 'overdue' | 'partially_paid';

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  price: number;
  total: number;
}

export interface InvoicePayment {
  id: string;
  date: string;
  amount: number;
  method?: string;
  note?: string;
}

export interface AdminInvoiceItem {
  id?: string;
  clientId?: string;
  clientName: string;
  clientBrand?: string;
  recipientEmail?: string;
  invoiceNumber?: string;
  description?: string;
  
  lineItems?: InvoiceLineItem[];
  payments?: InvoicePayment[];
  
  standardAmount: number;
  discountAmount?: number;
  subtotalAmount: number;
  totalAmount: number;
  amount: number;
  currency: string;
  serviceMonth?: string;
  serviceMonthKey?: string;
  billingPeriodFrom?: string;
  billingPeriodTo?: string;
  serviceSummary?: string;
  issueDate?: string;
  dueDate?: string;
  sentDate?: string;
  paidDate?: string;
  paymentNote?: string;
  ownerNote?: string;
  isTemplateGenerated?: boolean;
  status: InvoiceItemStatus;
  createdAt: string;
  updatedAt: string;
}
