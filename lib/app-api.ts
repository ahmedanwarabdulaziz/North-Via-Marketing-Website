import { listClientProfiles } from './admin-ops';
import { formatWhen, isOverdue, type Task } from './tasks';
import type { EmailAccount, EmailItem } from './email/inbox';
import type { ClientProfile, Website } from '@/types/database';

// What the Anwarz mobile app receives: plain JSON shapes built from the same data the
// Telegram bot uses. Secrets (refresh tokens, API tokens) never leave the server.

export type ClientNames = Map<string, string>;

export async function clientNames(): Promise<ClientNames> {
  return new Map((await listClientProfiles()).filter((c) => c.id).map((c) => [c.id!, c.brandName]));
}

export function appTask(task: Task, names: ClientNames, now = new Date()) {
  return {
    id: task.id,
    title: task.title,
    notes: task.notes,
    kind: task.kind,
    category: task.category,
    clientId: task.client_id,
    clientName: task.client_id ? names.get(task.client_id) || null : null,
    priority: task.priority,
    status: task.status,
    dueAt: task.due_at,
    allDay: task.all_day,
    remindAt: task.remind_at,
    when: task.due_at ? formatWhen(task) : null,
    overdue: isOverdue(task, now),
    repeats: Boolean(task.repeat_rule),
    source: task.source,
    createdAt: task.created_at,
    doneAt: task.done_at,
  };
}

export function appEmail(item: EmailItem, account: Pick<EmailAccount, 'id' | 'email' | 'label'> | undefined, full = false) {
  return {
    id: item.id,
    inbox: account ? { id: account.id, email: account.email, label: account.label } : null,
    fromName: item.from_name,
    fromEmail: item.from_email,
    subject: item.subject,
    receivedAt: item.received_at,
    summary: item.summary,
    reason: item.reason,
    urgent: item.urgent,
    status: item.status,
    snippet: item.snippet,
    draft: item.draft,
    sentAt: item.sent_at,
    ...(full ? { body: item.body, brief: item.brief } : {}),
  };
}

export function appWebsite(site: Website & { id?: string }) {
  return {
    id: site.id,
    clientId: site.clientId,
    url: site.url,
    label: site.label || null,
    status: site.status,
    lastStatusCode: site.lastStatusCode ?? null,
    lastResponseMs: site.lastResponseMs ?? null,
    lastError: site.lastError || null,
    downSince: site.downSince || null,
    sslExpiresAt: site.sslExpiresAt || null,
    lastCheckedAt: site.lastCheckedAt || null,
  };
}

/** Client contact and links only; encrypted tokens and API ids stay on the server. */
export function appClient(client: ClientProfile) {
  return {
    id: client.id,
    name: client.brandName,
    owner: client.ownerName || null,
    email: client.email || null,
    phone: client.mobileNumber || null,
    website: client.websiteUrl || null,
    links: {
      facebook: client.facebookLink || null,
      instagram: client.instagramLink || null,
      tiktok: client.tiktokLink || null,
      google: client.googleLink || null,
    },
  };
}
