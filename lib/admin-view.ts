import type {
  AdminFollowUpItem,
  AdminInvoiceItem,
  AdminReportItem,
  AdminTaskItem,
} from '@/types/database';

import type { ClientProfile } from '@/types/database';

export function formatDateLabel(value?: string) {
  if (!value) return 'No date';
  const safeDate = value.includes('T') ? value : `${value}T12:00:00`;
  const parsed = new Date(safeDate);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function taskTone(status: AdminTaskItem['status']) {
  switch (status) {
    case 'top_3':
      return 'blue' as const;
    case 'doing':
      return 'amber' as const;
    case 'waiting':
      return 'neutral' as const;
    case 'done':
      return 'green' as const;
  }
}

export function followUpTone(status: AdminFollowUpItem['status']) {
  switch (status) {
    case 'okay':
      return 'green' as const;
    case 'due_soon':
      return 'amber' as const;
    case 'overdue':
      return 'red' as const;
    case 'waiting_on_client':
      return 'blue' as const;
    case 'done':
      return 'neutral' as const;
  }
}

export function reportTone(status: AdminReportItem['status']) {
  switch (status) {
    case 'not_started':
      return 'neutral' as const;
    case 'gathering_data':
      return 'amber' as const;
    case 'drafting':
      return 'blue' as const;
    case 'ready':
      return 'green' as const;
    case 'sent':
      return 'neutral' as const;
  }
}

export function invoiceTone(status: AdminInvoiceItem['status']) {
  switch (status) {
    case 'draft':
      return 'neutral' as const;
    case 'ready_to_send':
      return 'blue' as const;
    case 'sent':
      return 'amber' as const;
    case 'paid':
      return 'green' as const;
    case 'overdue':
      return 'red' as const;
  }
}

export function currencyLabel(currency: string | undefined, amount: number | undefined) {
  if (amount === undefined) return '-';
  return `${currency || 'USD'} ${amount.toLocaleString()}`;
}

export function formatClientLabel(client: Partial<ClientProfile>) {
  const businessName = client.brandName || 'Unnamed Client';
  const group = ""?.trim();
  const owner = ""?.trim();
  const relationshipType = "" || 'standalone';

  if (relationshipType === 'group_parent') {
    return `${businessName} [Group]`;
  }

  if (group) {
    return `${businessName} (${group})`;
  }

  if (owner) {
    return `${businessName} - ${owner}`;
  }

  return businessName;
}
