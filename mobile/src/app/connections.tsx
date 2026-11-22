import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Alert } from 'react-native';

import { ImapForm } from '@/components/imap-form';
import { Button, Card, Empty, ErrorBox, Loading, Pill, Row, Screen, Section, T } from '@/components/ui';
import { api } from '@/lib/api';
import { ago } from '@/lib/format';
import { usePalette } from '@/lib/theme';
import { automationQuietFor, type ConnectionRow, type ConnectionsData } from '@/lib/connections';
import { useApi } from '@/lib/use-api';

// More → Connections: every account the automation needs (inboxes, Google Ads, Google reviews,
// Facebook & Instagram), what's wrong with any of them, and a Reconnect button that opens the sign-in
// in the phone's browser with a 15-minute link. The website also alerts you when one breaks.

const GROUPS: ConnectionRow['group'][] = ['Email', 'Google', 'Facebook & Instagram'];

export default function Connections() {
  const p = usePalette();
  const { data, error, loading, refreshing, refresh, reload } = useApi<ConnectionsData>('/connections');
  const [busy, setBusy] = useState<string | null>(null);

  const [imapForm, setImapForm] = useState<{ email?: string } | null>(null);

  const reconnect = async (row: ConnectionRow) => {
    // IMAP mailboxes have no sign-in page: the form asks for the password again.
    if (row.kind === 'imap') return setImapForm({ email: row.name });
    setBusy(row.id);
    try {
      const { url } = await api<{ url: string }>('/connections', { body: { kind: row.kind, clientId: row.clientId } });
      await WebBrowser.openBrowserAsync(url);
      void reload(); // back from the browser: show the new status
    } catch (e) {
      Alert.alert('Couldn’t start', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const add = (kind: 'gmail' | 'outlook') => reconnect({ id: `add-${kind}`, group: 'Email', name: '', detail: '', ok: true, problem: null, kind, clientId: null });

  const quiet = automationQuietFor(data);
  const broken = data?.connections.filter((c) => !c.ok) ?? [];

  return (
    <Screen padTop={false} refreshing={refreshing} onRefresh={refresh}>
      {loading && !data ? <Loading /> : null}
      {error && !data ? <ErrorBox message={error} onRetry={refresh} /> : null}
      {data ? (
        <>
          <Card tone={quiet !== null && quiet > 20 ? 'danger' : broken.length ? 'warn' : undefined}>
            <T variant="heading">
              {quiet !== null && quiet > 20 ? '⛔ Automation stopped' : broken.length ? `⚠️ ${broken.length} need${broken.length === 1 ? 's' : ''} you` : '✅ Everything is connected'}
            </T>
            <T variant="small">
              {quiet === null
                ? 'The 5-minute check hasn’t reported yet.'
                : quiet > 20
                ? `The 5-minute check (emails, reminders, sites, ads) last ran ${ago(data.automation.lastRunAt)}. Check n8n on the VPS.`
                : `Emails, reminders, sites and ads checked ${ago(data.automation.lastRunAt)}.`}
            </T>
          </Card>

          {GROUPS.map((group) => {
            const rows = data.connections.filter((c) => c.group === group);
            return (
              <Section key={group} title={group}>
                {rows.length ? (
                  rows.map((c) => (
                    <Card key={c.id} tone={c.ok ? undefined : 'danger'}>
                      <Row>
                        <T style={{ flex: 1, fontWeight: '700' }}>{c.name}</T>
                        <Pill text={c.ok ? 'Connected' : 'Needs you'} tone={c.ok ? 'ok' : 'danger'} />
                      </Row>
                      {c.detail ? <T variant="small">{c.detail}</T> : null}
                      {c.problem ? <T variant="small" color={p.danger}>{c.problem}</T> : null}
                      <Button
                        title={c.ok ? '🔄 Reconnect' : '🔌 Reconnect now'}
                        small
                        kind={c.ok ? 'outline' : 'primary'}
                        tone={c.ok ? 'brand' : 'danger'}
                        busy={busy === c.id}
                        disabled={busy !== null}
                        onPress={() => void reconnect(c)}
                      />
                    </Card>
                  ))
                ) : (
                  <Empty text="Nothing connected." />
                )}
                {group === 'Facebook & Instagram' ? (
                  <Button title="📱 Manage all Pages & Instagram ›" small kind="soft" onPress={() => router.push('/social')} />
                ) : null}
                {group === 'Email' ? (
                  <Row>
                    <Button title="＋ Gmail inbox" small kind="soft" busy={busy === 'add-gmail'} disabled={busy !== null} onPress={() => void add('gmail')} />
                    <Button title="＋ Outlook inbox" small kind="soft" busy={busy === 'add-outlook'} disabled={busy !== null} onPress={() => void add('outlook')} />
                    <Button title="＋ Other email" small kind="soft" disabled={busy !== null} onPress={() => setImapForm({})} />
                  </Row>
                ) : null}
              </Section>
            );
          })}
          <T variant="small">Reconnect opens Google, Microsoft or Facebook in the browser. Sign in with the same account, then come back here and pull down to refresh.</T>
        </>
      ) : null}
      <ImapForm visible={imapForm !== null} key={imapForm?.email ?? 'new'} email={imapForm?.email} onClose={() => setImapForm(null)} onDone={() => void reload()} />
    </Screen>
  );
}
