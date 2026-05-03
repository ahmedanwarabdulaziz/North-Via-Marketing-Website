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
  clientBusinessName?: string;
  clientContactName?: string;
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
  businessName: string;
  contactName: string;
  email: string;
  reportingEmails?: string[];
  industry?: string;
  businessDescription?: string;
  primaryServices?: string[];
  serviceAreas?: string[];
  targetCities?: string[];
  excludedCities?: string[];
  idealCustomerProfile?: string;
  averageJobValue?: number;
  targetCostPerLead?: number;
  monthlyAdBudget?: number;
  mainGoal?: string;
  primaryObjective?: 'lead_generation' | 'traffic_optimization';
  conversionDefinition?: string;
  leadQualificationRules?: string;
  leadQualityNotes?: string;
  priorityOffers?: string[];
  competitors?: string[];
  seasonalityNotes?: string;
  reportTone?: 'executive' | 'friendly' | 'technical' | 'reassuring';
  clientConcerns?: string;
  nextStepNotes?: string;
  aiBehavioralNotes: string;
  aiAvoidanceWarnings: string;
  linkedGoogleAdsIds: string[]; // Can link multiple accounts to one client profile
  linkedSocialMediaAccounts?: string[];
  createdAt: string;
  updatedAt: string;
}
