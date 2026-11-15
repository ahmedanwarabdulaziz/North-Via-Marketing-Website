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
