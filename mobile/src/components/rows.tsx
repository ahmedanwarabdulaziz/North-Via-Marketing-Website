import { Linking, View } from 'react-native';

import { ago, hostOf } from '@/lib/format';
import { space, usePalette } from '@/lib/theme';
import type { AppWebsite } from '@/lib/types';

import { Button, Card, Row, T } from './ui';

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
      {/* Down: "we're on it"; back up: "it's fixed" (the website writes the message). */}
      {site.whatsappUrl ? (
        <Button title={down ? '📲 Tell the client on WhatsApp' : '📲 Send status on WhatsApp'} small kind="soft" tone="ok" onPress={() => Linking.openURL(site.whatsappUrl!)} />
      ) : null}
    </Card>
  );
}
