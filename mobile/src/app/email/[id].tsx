import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { EmailRow } from '@/components/rows';
import { VoiceButton } from '@/components/voice-button';
import { Button, Card, ErrorBox, Input, Loading, Pill, Row, Screen, Section, T } from '@/components/ui';
import { api } from '@/lib/api';
import { dateTime } from '@/lib/format';
import { usePalette } from '@/lib/theme';
import type { AppEmail, Audio } from '@/lib/types';
import { useApi } from '@/lib/use-api';

interface EmailData {
  email: AppEmail;
  canReply: boolean;
  history: AppEmail[];
}

/**
 * One email. Reply: say or type what to answer, the AI writes the email, Ahmed reads/edits it,
 * and only "Send" sends it, from the same inbox and thread.
 */
export default function EmailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = usePalette();
  const { data, setData, error, loading, refresh } = useApi<EmailData>(`/emails/${id}`);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [draft, setDraft] = useState<string | null>(null); // local edits to the AI draft
  const [showBody, setShowBody] = useState(false);

  const act = async (action: string, extra: Record<string, unknown> = {}) => {
    setBusy(action);
    try {
      const result = await api<{ email: AppEmail; heard?: string | null }>(`/emails/${id}`, { body: { action, ...extra }, timeoutMs: 60_000 });
      setData((d) => (d ? { ...d, email: result.email, canReply: d.canReply && result.email.status !== 'sent' } : d));
      if (action === 'draft') setNote('');
      if (action === 'draft' || action === 'edit' || action === 'cancel') setDraft(null);
      if (action === 'send') Alert.alert('Sent ✅', `Reply sent to ${result.email.fromEmail || ''}`);
      if (action === 'done' || action === 'ignore') router.back();
      return result;
    } catch (e) {
      Alert.alert(action === 'send' ? 'Not sent' : 'Something went wrong', e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setBusy(null);
    }
  };

  const send = () => {
    const changed = draft !== null && draft !== data?.email.draft;
    Alert.alert('Send this reply?', `To ${data?.email.fromEmail}\nFrom ${data?.email.inbox?.email ?? ''}`, [
      { text: 'Not yet', style: 'cancel' },
      {
        text: 'Send',
        onPress: async () => {
          if (changed && !(await act('edit', { draft }))) return;
          await act('send');
        },
      },
    ]);
  };

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorBox message={error} onRetry={refresh} />;
  if (!data) return null;
  const e = data.email;
  const hasDraft = e.status === 'draft' && Boolean(e.draft);
  const handled = ['sent', 'done', 'ignored'].includes(e.status);

  return (
    <Screen padTop={false}>
      <Card tone={e.urgent && !handled ? 'danger' : undefined}>
        <T variant="title" selectable>
          {e.subject || '(no subject)'}
        </T>
        <T selectable>{`${e.fromName || ''} <${e.fromEmail || ''}>`}</T>
        <T variant="small">{`${dateTime(e.receivedAt)}${e.inbox ? ` · to ${e.inbox.label || e.inbox.email}` : ''}`}</T>
        <Row wrap>
          {e.urgent ? <Pill text="Urgent" tone="danger" /> : null}
          {e.status === 'sent' ? <Pill text={`Replied ${dateTime(e.sentAt)}`} tone="ok" /> : null}
          {e.status === 'done' ? <Pill text="Done" tone="ok" /> : null}
          {e.status === 'ignored' ? <Pill text="Ignored" tone="muted" /> : null}
        </Row>
      </Card>

      {e.summary ? (
        <Card>
          <T variant="label">AI summary</T>
          <T selectable>{e.summary}</T>
          {e.reason ? <T variant="small">{`Why it matters: ${e.reason}`}</T> : null}
        </Card>
      ) : null}

      <Card>
        <Row>
          <T variant="label" style={{ flex: 1 }}>
            Email
          </T>
          <Button title={showBody ? 'Show less' : 'Show all'} kind="soft" small onPress={() => setShowBody((s) => !s)} />
        </Row>
        <T selectable numberOfLines={showBody ? undefined : 8}>
          {e.body || e.snippet || '(empty)'}
        </T>
      </Card>

      {hasDraft ? (
        <Section title="Reply draft">
          <Input value={draft ?? e.draft ?? ''} onChangeText={setDraft} multiline style={{ minHeight: 200 }} />
          <Button title="✅ Send" tone="ok" busy={busy === 'send' || busy === 'edit'} onPress={send} />
          <T variant="small">Want changes? Say or type them below, e.g. “shorter” or “say Thursday at 2”.</T>
        </Section>
      ) : null}

      {data.canReply && !handled ? (
        <Section title={hasDraft ? 'Change the reply' : 'Reply'}>
          <Input value={note} onChangeText={setNote} placeholder={hasDraft ? 'What should change?' : 'What should the reply say?'} multiline />
          <Button title={hasDraft ? '✍️ Rewrite' : '✍️ Write the reply'} busy={busy === 'draft'} disabled={!note.trim()} onPress={() => act('draft', { text: note.trim() })} />
          <VoiceButton disabled={busy !== null} onDone={(audio: Audio) => act('draft', { audio })} />
          {busy === 'draft' ? <T variant="small" color={p.muted} style={{ textAlign: 'center' }}>Writing the reply…</T> : null}
          {hasDraft ? <Button title="Drop the draft" kind="outline" small busy={busy === 'cancel'} onPress={() => act('cancel')} /> : null}
        </Section>
      ) : null}

      {!handled ? (
        <Row>
          <Button title="✔️ Done" kind="soft" tone="ok" style={{ flex: 1 }} busy={busy === 'done'} onPress={() => act('done')} />
          <Button
            title="🔕 Ignore sender"
            kind="soft"
            tone="muted"
            style={{ flex: 1 }}
            busy={busy === 'ignore'}
            onPress={() =>
              Alert.alert('Ignore this sender?', `Emails from ${e.fromEmail} in this inbox won’t be shown again.`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Ignore', style: 'destructive', onPress: () => void act('ignore') },
              ])
            }
          />
        </Row>
      ) : null}

      {data.history.length ? (
        <Section title="Earlier with this person">
          {data.history.map((h) => (
            <EmailRow key={h.id} email={h} />
          ))}
        </Section>
      ) : null}
    </Screen>
  );
}
