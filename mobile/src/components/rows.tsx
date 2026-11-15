import { router } from 'expo-router';
import { View } from 'react-native';

import { ago, hostOf } from '@/lib/format';
import { space, usePalette } from '@/lib/theme';
import type { AppEmail, AppWebsite } from '@/lib/types';

import { Card, Pill, Row, T } from './ui';

const EMAIL_STATUS: Record<AppEmail['status'], { text: string; tone: 'brand' | 'danger' | 'warn' | 'ok' | 'muted' }> = {
  new: { text: 'New', tone: 'brand' },
  replying: { text: 'Replying', tone: 'warn' },
  draft: { text: 'Draft ready', tone: 'warn' },
  sent: { text: 'Replied', tone: 'ok' },
  done: { text: 'Done', tone: 'ok' },
  ignored: { text: 'Ignored', tone: 'muted' },
  skipped: { text: 'Skipped', tone: 'muted' },
};

export function EmailRow({ email }: { email: AppEmail }) {
  const s = EMAIL_STATUS[email.status];
  return (
    <Card onPress={() => router.push(`/email/${email.id}`)} tone={email.urgent && email.status === 'new' ? 'danger' : undefined} style={{ paddingVertical: space.md }}>
      <Row>
        <T variant="heading" numberOfLines={1} style={{ flex: 1 }}>
          {email.fromName || email.fromEmail || 'Unknown sender'}
        </T>
        <T variant="small">{ago(email.receivedAt)}</T>
      </Row>
      <T numberOfLines={1} style={{ fontWeight: '600' }}>
        {email.subject || '(no subject)'}
      </T>
      {email.summary ? (
        <T variant="small" numberOfLines={2}>
          {email.summary}
        </T>
      ) : null}
      <Row wrap>
        {email.urgent ? <Pill text="Urgent" tone="danger" /> : null}
        <Pill text={s.text} tone={s.tone} />
        {email.inbox ? <Pill text={email.inbox.label || email.inbox.email} tone="muted" /> : null}
      </Row>
    </Card>
  );
}

export function WebsiteRow({ site }: { site: AppWebsite }) {
  const p = usePalette();
  const down = site.status === 'down';
  return (
    <Card tone={down ? 'danger' : undefined} style={{ paddingVertical: space.md }}>
      <Row>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: down ? p.danger : site.status === 'up' ? p.ok : p.muted }} />
        <T variant="heading" numberOfLines={1} style={{ flex: 1 }}>
          {site.clientName ? `${site.clientName} · ` : ''}
          {site.label || hostOf(site.url)}
        </T>
      </Row>
      <T variant="small">
        {down
          ? `Down${site.downSince ? ` for ${ago(site.downSince)}` : ''}${site.lastError ? ` · ${site.lastError}` : ''}`
          : `${site.status}${site.lastResponseMs ? ` · ${site.lastResponseMs} ms` : ''}${site.lastCheckedAt ? ` · checked ${ago(site.lastCheckedAt)} ago` : ''}`}
      </T>
      {site.sslExpiresAt ? <T variant="small">{`SSL until ${site.sslExpiresAt.slice(0, 10)}`}</T> : null}
    </Card>
  );
}
