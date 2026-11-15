import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { api } from '@/lib/api';
import { ago, dateTime } from '@/lib/format';
import { space, usePalette } from '@/lib/theme';
import type { AppEmail, Audio } from '@/lib/types';

import { Back, BottomSheet, Note, Tile } from './sheet';
import { Card, Input, Pill, Row, T } from './ui';
import { VoiceButton } from './voice-button';

// An email in a list. Tapping it slides up a sheet: ✨ AI reply, ✍️ reply with my notes,
// 📄 full email, ✔️ done, 🔕 ignore sender, 🚫 ignore emails like this. A reply is shown for
// editing and only goes out after ✅ Send.

const STATUS: Record<AppEmail['status'], { text: string; tone: 'brand' | 'danger' | 'warn' | 'ok' | 'muted' }> = {
  new: { text: 'New', tone: 'brand' },
  replying: { text: 'Replying', tone: 'warn' },
  draft: { text: 'Draft ready', tone: 'warn' },
  sent: { text: 'Replied', tone: 'ok' },
  done: { text: 'Done', tone: 'ok' },
  ignored: { text: 'Ignored', tone: 'muted' },
  skipped: { text: 'Skipped', tone: 'muted' },
};

export function EmailCard({ email: initial }: { email: AppEmail }) {
  const [email, setEmail] = useState(initial);
  const [open, setOpen] = useState(false);
  const s = STATUS[email.status];
  const handled = ['sent', 'done', 'ignored'].includes(email.status);

  return (
    <>
      <Card onPress={() => setOpen(true)} tone={email.urgent && !handled ? 'danger' : undefined} style={{ paddingVertical: space.md }}>
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
          {email.urgent && !handled ? <Pill text="Urgent" tone="danger" /> : null}
          <Pill text={s.text} tone={s.tone} />
          {email.inbox ? <Pill text={email.inbox.label || email.inbox.email} tone="muted" /> : null}
        </Row>
      </Card>
      <EmailSheet email={email} visible={open} onClose={() => setOpen(false)} onChange={setEmail} />
    </>
  );
}

type Panel = 'actions' | 'notes' | 'draft';

export function EmailSheet({ email, visible, onClose, onChange }: { email: AppEmail; visible: boolean; onClose: () => void; onChange: (e: AppEmail) => void }) {
  const p = usePalette();
  const [panel, setPanel] = useState<Panel>('actions');
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [draft, setDraft] = useState<string | null>(null); // local edits to the draft

  const close = () => {
    setPanel('actions');
    setNote(null);
    onClose();
  };

  const act = async (key: string, body: Record<string, unknown>) => {
    setBusy(key);
    setNote(null);
    try {
      const result = await api<{ email: AppEmail; heard?: string | null }>(`/emails/${email.id}`, { body, timeoutMs: 60_000 });
      onChange(result.email);
      return result;
    } catch (e) {
      Alert.alert(body.action === 'send' ? 'Not sent' : 'Something went wrong', e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setBusy(null);
    }
  };

  const writeReply = async (body: Record<string, unknown>, key: string) => {
    const result = await act(key, { action: 'draft', ...body });
    if (!result) return;
    setNotes('');
    setDraft(null);
    setPanel('draft');
    if (result.heard) setNote(`🎙 “${result.heard}”`);
  };

  const finish = async (action: 'done' | 'ignore' | 'ignore_similar') => {
    const result = await act(action, { action });
    if (result) close();
  };

  const send = () => {
    const text = (draft ?? email.draft ?? '').trim();
    if (text.length < 2) return;
    Alert.alert('Send this reply?', `To ${email.fromEmail}\nFrom ${email.inbox?.email ?? ''}`, [
      { text: 'Not yet', style: 'cancel' },
      {
        text: 'Send',
        onPress: async () => {
          if (draft !== null && draft !== email.draft && !(await act('save', { action: 'edit', draft: text }))) return;
          if (await act('send', { action: 'send' })) {
            setDraft(null);
            Alert.alert('Sent ✅', `Reply sent to ${email.fromEmail}`);
            close();
          }
        },
      },
    ]);
  };

  const handled = ['sent', 'done', 'ignored'].includes(email.status);
  const canReply = email.canReply !== false && email.status !== 'sent';
  const hasDraft = email.status === 'draft' && Boolean(email.draft);

  return (
    <BottomSheet visible={visible} onClose={close}>
      <View style={{ gap: 4 }}>
        <T variant="title">{email.subject || '(no subject)'}</T>
        <T color={p.muted}>{`${email.fromName || ''} <${email.fromEmail || ''}>`}</T>
        <T variant="small">{`${dateTime(email.receivedAt)}${email.inbox ? ` · ${email.inbox.label || email.inbox.email}` : ''}`}</T>
      </View>

      {note ? <Note text={note} /> : null}

      {panel === 'actions' ? (
        <>
          {email.summary ? (
            <Card>
              <T variant="label">AI summary</T>
              <T>{email.summary}</T>
              {email.reason ? <T variant="small">{`Why: ${email.reason}`}</T> : null}
            </Card>
          ) : null}
          {hasDraft ? <Tile icon="📝" label="Your reply draft is ready: review and send" tone="brand" wide onPress={() => setPanel('draft')} /> : null}
          {canReply && !hasDraft ? (
            <Row>
              <Tile icon="✨" label="AI reply" tone="brand" busy={busy === 'auto'} onPress={() => writeReply({ auto: true }, 'auto')} />
              <Tile icon="✍️" label="Reply with my notes" onPress={() => setPanel('notes')} />
            </Row>
          ) : null}
          <Row>
            <Tile
              icon="📄"
              label="Full email"
              onPress={() => {
                close();
                router.push(`/email/${email.id}`);
              }}
            />
            {!handled ? <Tile icon="✔️" label="Done" tone="ok" busy={busy === 'done'} onPress={() => finish('done')} /> : null}
          </Row>
          {!handled ? (
            <Row>
              <Tile
                icon="🔕"
                label="Ignore sender"
                tone="muted"
                busy={busy === 'ignore'}
                onPress={() =>
                  Alert.alert('Ignore this sender?', `Nothing from ${email.fromEmail} in this inbox will be shown again.`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Ignore sender', style: 'destructive', onPress: () => void finish('ignore') },
                  ])
                }
              />
              <Tile
                icon="🚫"
                label="Ignore emails like this"
                tone="muted"
                busy={busy === 'ignore_similar'}
                onPress={() =>
                  Alert.alert('Ignore emails like this?', 'Emails with the same kind of content will be skipped from now on. Other emails from this sender still show.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Ignore these', style: 'destructive', onPress: () => void finish('ignore_similar') },
                  ])
                }
              />
            </Row>
          ) : null}
        </>
      ) : null}

      {panel === 'notes' ? (
        <View style={{ gap: space.sm }}>
          <T variant="heading">{hasDraft ? '✍️ What should change?' : '✍️ What should the reply say?'}</T>
          <T variant="small">Rough notes are enough, in Arabic or English. The AI writes the professional email.</T>
          <Input value={notes} onChangeText={setNotes} placeholder={hasDraft ? 'e.g. shorter, say Thursday at 2' : 'e.g. thank them, we can start next week'} multiline />
          <Tile icon="✍️" label={hasDraft ? 'Rewrite the reply' : 'Write the reply'} tone="brand" wide busy={busy === 'notes'} disabled={!notes.trim()} onPress={() => writeReply({ text: notes.trim() }, 'notes')} />
          <VoiceButton label="🎙 Say it instead" disabled={busy !== null} onDone={(audio: Audio) => writeReply({ audio }, 'voice')} />
          {busy === 'notes' || busy === 'voice' ? <T variant="small" style={{ textAlign: 'center' }}>Writing the reply…</T> : null}
          <Back onPress={() => setPanel(hasDraft ? 'draft' : 'actions')} />
        </View>
      ) : null}

      {panel === 'draft' && email.draft ? (
        <View style={{ gap: space.sm }}>
          <T variant="heading">📝 Reply: edit anything, then send</T>
          <Input value={draft ?? email.draft} onChangeText={setDraft} multiline style={{ minHeight: 220 }} />
          {/\[[^\]]+\]/.test(draft ?? email.draft) ? <Note text="Fill in the [brackets] before sending." tone="danger" /> : null}
          <Tile icon="✅" label="Send" tone="ok" wide busy={busy === 'send' || busy === 'save'} onPress={send} />
          <Row>
            <Tile icon="✍️" label="Change with notes" onPress={() => setPanel('notes')} />
            <Tile icon="✨" label="New AI version" busy={busy === 'auto'} onPress={() => writeReply({ auto: true }, 'auto')} />
          </Row>
          <Tile
            icon="🗑"
            label="Drop the draft"
            tone="muted"
            wide
            busy={busy === 'cancel'}
            onPress={async () => {
              if (await act('cancel', { action: 'cancel' })) {
                setDraft(null);
                setPanel('actions');
              }
            }}
          />
          <Back onPress={() => setPanel('actions')} />
        </View>
      ) : null}
    </BottomSheet>
  );
}
