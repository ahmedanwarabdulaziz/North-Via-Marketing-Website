import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';

import { api } from '@/lib/api';
import { ago } from '@/lib/format';
import { usePalette } from '@/lib/theme';
import type { AdsClientUpdate, AdsSuggestion } from '@/lib/types';
import { openWhatsApp } from '@/lib/whatsapp';

import { Back, BottomSheet, Note } from './sheet';
import { Button, Card, Chip, Input, Pill, Row, T } from './ui';

// A Google Ads idea as a card: ✅ Accept (applies it to the real Google Ads account), ✏️ Edit
// (change the wording / match type first), ✖ Reject. Nothing changes in Google Ads until ✅.

const MATCH_LABEL = { EXACT: 'Exact', PHRASE: 'Phrase', BROAD: 'Broad' } as const;

function describe(s: AdsSuggestion) {
  return s.type === 'add_negative' ? '🚫 Block this search' : '➕ Add this keyword';
}

function evidenceLine(s: AdsSuggestion) {
  const e = s.evidence;
  if (!e) return '';
  const parts: string[] = [];
  if (e.clicks != null) parts.push(`${e.clicks} clicks`);
  if (e.cost != null) parts.push(`$${e.cost.toFixed(2)}`);
  if (e.conversions != null) parts.push(`${e.conversions} conversions`);
  return parts.join(' · ');
}

export function AdsSuggestionCard({ suggestion: initial, onChanged }: { suggestion: AdsSuggestion; onChanged: () => void }) {
  const p = usePalette();
  const [s, setS] = useState(initial);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [text, setText] = useState(initial.text);
  const [match, setMatch] = useState<AdsSuggestion['matchType']>(initial.matchType);
  const [level, setLevel] = useState<'campaign' | 'ad_group'>('campaign');
  const [note, setNote] = useState<string | null>(null);

  const pending = s.status === 'pending' || s.status === 'failed';
  const edited = text.trim().toLowerCase() !== s.text || match !== s.matchType;

  const act = async (action: 'accept' | 'reject' | 'undo') => {
    setBusy(action);
    setNote(null);
    try {
      const r = await api<{ suggestion: AdsSuggestion }>(`/marketing/suggestions/${s.id}`, {
        body: action === 'accept' ? { action, text, matchType: match, level } : { action },
        timeoutMs: 60_000,
      });
      setS(r.suggestion);
      setNote(action === 'accept' ? '✅ Done in Google Ads' : action === 'undo' ? '↩️ Removed from Google Ads' : 'Rejected');
      setTimeout(() => {
        setOpen(false);
        onChanged();
      }, 900);
    } catch (e) {
      Alert.alert(action === 'accept' ? 'Google Ads refused it' : 'Something went wrong', e instanceof Error ? e.message : String(e));
      onChanged();
    } finally {
      setBusy(null);
    }
  };

  const accept = () =>
    Alert.alert(
      s.type === 'add_negative' ? 'Block this search in Google Ads?' : 'Add this keyword in Google Ads?',
      `${s.clientName}\n“${text.trim()}” (${MATCH_LABEL[match]})${s.campaign ? `\nCampaign: ${s.campaign}` : ''}\n\nThis changes the live account.`,
      [
        { text: 'Not yet', style: 'cancel' },
        { text: 'Yes, apply', onPress: () => void act('accept') },
      ],
    );

  return (
    <>
      <Card onPress={() => setOpen(true)} tone={s.status === 'failed' ? 'danger' : undefined}>
        <Row>
          <T variant="label" style={{ flex: 1 }}>
            {describe(s)}
          </T>
          <T variant="small">{ago(s.createdAt)}</T>
        </Row>
        <T variant="heading">{`“${s.text}”`}</T>
        {s.reason ? <T>{s.reason}</T> : null}
        <Row wrap>
          <Pill text={s.clientName} />
          <Pill text={MATCH_LABEL[s.matchType]} tone="muted" />
          {evidenceLine(s) ? <Pill text={evidenceLine(s)} tone="muted" /> : null}
          {s.edited ? <Pill text="✏️ edited" tone="warn" /> : null}
          {s.status === 'applied' ? <Pill text={s.told ? '✅ Applied · client told' : '✅ Applied'} tone="ok" /> : null}
          {s.status === 'failed' ? <Pill text="Failed" tone="danger" /> : null}
        </Row>
        {s.error ? (
          <T variant="small" color={p.danger}>
            {s.error}
          </T>
        ) : null}
        {pending ? (
          <Row>
            <Button title="✅ Accept" small onPress={accept} busy={busy === 'accept'} style={{ flex: 1 }} />
            <Button title="✏️ Edit" small kind="soft" onPress={() => setOpen(true)} style={{ flex: 1 }} />
            <Button title="✖" small kind="soft" tone="danger" onPress={() => void act('reject')} busy={busy === 'reject'} />
          </Row>
        ) : null}
      </Card>

      <BottomSheet visible={open} onClose={() => setOpen(false)}>
        <View style={{ gap: 6 }}>
          <T variant="label">{describe(s)}</T>
          <T variant="title">{s.clientName}</T>
          {s.campaign ? <T variant="small">{`Campaign: ${s.campaign}${s.adGroup && s.type === 'add_keyword' ? ` · ${s.adGroup}` : ''}`}</T> : null}
        </View>
        {s.reason ? (
          <Card>
            <T>{s.reason}</T>
            {evidenceLine(s) ? <T variant="small">{`Last 90 days: ${evidenceLine(s)}`}</T> : null}
          </Card>
        ) : null}
        {note ? <Note text={note} /> : null}

        {pending ? (
          <>
            <T variant="label">{s.type === 'add_negative' ? 'Block searches containing' : 'Keyword'}</T>
            <Input value={text} onChangeText={setText} autoCapitalize="none" />
            <T variant="label">Match type</T>
            <Row wrap>
              {(['EXACT', 'PHRASE', 'BROAD'] as const).map((m) => (
                <Chip key={m} text={MATCH_LABEL[m]} selected={match === m} onPress={() => setMatch(m)} />
              ))}
            </Row>
            <T variant="small">
              {match === 'EXACT' ? 'Only this exact search.' : match === 'PHRASE' ? 'Searches that include these words in order.' : 'Any related search (widest, use carefully).'}
            </T>
            {s.type === 'add_negative' && s.adGroup ? (
              <>
                <T variant="label">Where</T>
                <Row wrap>
                  <Chip text="Whole campaign" selected={level === 'campaign'} onPress={() => setLevel('campaign')} />
                  <Chip text="This ad group only" selected={level === 'ad_group'} onPress={() => setLevel('ad_group')} />
                </Row>
              </>
            ) : null}
            <Button title={edited ? '✅ Accept with my edits' : '✅ Accept'} onPress={accept} busy={busy === 'accept'} />
            <Button title="✖ Reject (don't suggest again)" kind="soft" tone="danger" onPress={() => void act('reject')} busy={busy === 'reject'} />
          </>
        ) : null}

        {s.status === 'applied' ? <Button title="↩️ Undo (remove from Google Ads)" kind="soft" tone="danger" onPress={() => void act('undo')} busy={busy === 'undo'} /> : null}
        <Back onPress={() => setOpen(false)} label="Close" />
      </BottomSheet>
    </>
  );
}

/** "Tell the client": the message is written and shown; WhatsApp opens with it (Ahmed presses Send) or he emails it after a look. */
export function TellClientSheet({ clientId, clientName, onClose, onDone }: { clientId: string; clientName: string; onClose: () => void; onDone: () => void }) {
  const [update, setUpdate] = useState<AdsClientUpdate | null | undefined>(undefined);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    api<{ update: AdsClientUpdate | null }>('/marketing/suggestions/update', { body: { action: 'draft', clientId }, timeoutMs: 30_000 })
      .then((r) => {
        if (!live) return;
        setUpdate(r.update);
        setText(r.update?.text || '');
      })
      .catch((e) => {
        if (!live) return;
        Alert.alert('Couldn’t write the update', e instanceof Error ? e.message : String(e));
        onClose();
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const whatsapp = async () => {
    if (!update) return;
    await openWhatsApp(text, update.phone);
    // He presses Send himself; once WhatsApp has opened we count the client as told.
    await api('/marketing/suggestions/update', { body: { action: 'sent', ids: update.ids } }).catch(() => {});
    onDone();
    onClose();
  };

  const email = () => {
    if (!update?.email) return;
    Alert.alert('Email this to the client?', `To: ${update.email}\n\n${text.slice(0, 300)}${text.length > 300 ? '…' : ''}`, [
      { text: 'Not yet', style: 'cancel' },
      {
        text: 'Send email',
        onPress: async () => {
          setBusy('email');
          try {
            await api('/marketing/suggestions/update', { body: { action: 'email', ids: update.ids, to: update.email, subject: update.subject, text }, timeoutMs: 30_000 });
            setNote('✅ Email sent');
            onDone();
            setTimeout(onClose, 900);
          } catch (e) {
            Alert.alert('Not sent', e instanceof Error ? e.message : String(e));
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  };

  return (
    <BottomSheet visible onClose={onClose}>
      <T variant="title">{`Tell ${clientName}`}</T>
      {update === undefined ? <T variant="small">Writing the update…</T> : null}
      {update === null ? <T>Nothing new to tell this client.</T> : null}
      {update ? (
        <>
          <T variant="small">{`${update.count} change${update.count === 1 ? '' : 's'} made. Edit the message if you like. Nothing is sent until you press Send.`}</T>
          <Input value={text} onChangeText={setText} multiline style={{ minHeight: 170 }} />
          {note ? <Note text={note} /> : null}
          <Button title="📲 Open in WhatsApp" onPress={() => void whatsapp()} />
          <Button title={update.email ? `✉️ Email ${update.email}` : '✉️ No email on file'} kind="soft" disabled={!update.email} busy={busy === 'email'} onPress={email} />
        </>
      ) : null}
      <Back onPress={onClose} label="Close" />
    </BottomSheet>
  );
}
