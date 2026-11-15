import { useState } from 'react';
import { Alert, View } from 'react-native';

import { api } from '@/lib/api';
import { dateTime } from '@/lib/format';
import { space, usePalette } from '@/lib/theme';

import { Button, Card, Input, Pill, Row, T } from './ui';

// The client page's "Rules": everything Anwarz follows for this client. Notes can be added,
// edited and removed here; review reply style is shown (it's changed in Admin → Reviews);
// inbox rules (ignored senders, ignore rules, always-important senders) can be removed.

export interface ClientRules {
  notes: { id: string; text: string; at: string }[];
  reviewReplies: {
    tone: string;
    length: string;
    language: string;
    signOff: string | null;
    useReviewerName: boolean;
    mentionBusinessName: boolean;
    allowEmojis: boolean;
    negativeContact: string | null;
    highlights: string | null;
    avoid: string | null;
    extraInstructions: string | null;
  } | null;
  inboxes: {
    id: string;
    email: string;
    label: string | null;
    focus: string | null;
    ignoredSenders: string[];
    ignoreRules: { id: string; subject: string; fromEmail: string | null }[];
    importantSenders: string[];
  }[];
}

export function ClientRulesView({ clientId, rules, onChanged }: { clientId: string; rules: ClientRules; onChanged: () => void }) {
  const p = usePalette();
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const change = async (key: string, body: Record<string, unknown>) => {
    setBusy(key);
    try {
      await api(`/clients/${clientId}`, { body });
      onChanged();
      return true;
    } catch (e) {
      Alert.alert('Not changed', e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setBusy(null);
    }
  };

  const confirmRemove = (title: string, message: string, key: string, body: Record<string, unknown>) =>
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => void change(key, body) },
    ]);

  const r = rules.reviewReplies;
  const divider = { borderTopWidth: 1, borderTopColor: p.border, paddingTop: space.sm, gap: space.xs } as const;

  return (
    <>
      <Card>
        <Row>
          <T style={{ flex: 1, fontWeight: '700' }}>📝 Notes & rules</T>
          <Button title={adding ? 'Close' : '＋ Rule'} small kind="soft" onPress={() => setAdding((a) => !a)} />
        </Row>
        <T variant="small">The AI follows these for this client in chat, emails and tasks.</T>
        {adding ? (
          <View style={{ gap: space.sm }}>
            <Input value={text} onChangeText={setText} placeholder="e.g. Prefers WhatsApp over email" multiline />
            <Button
              title="Save rule"
              small
              busy={busy === 'add'}
              disabled={text.trim().length < 2}
              onPress={async () => {
                if (await change('add', { action: 'add_note', text: text.trim() })) {
                  setText('');
                  setAdding(false);
                }
              }}
            />
          </View>
        ) : null}
        {rules.notes.length ? (
          rules.notes.map((n) =>
            editing === n.id ? (
              <View key={n.id} style={divider}>
                <Input value={editText} onChangeText={setEditText} multiline />
                <Row>
                  <Button
                    title="Save"
                    small
                    busy={busy === `e-${n.id}`}
                    onPress={async () => {
                      if (await change(`e-${n.id}`, { action: 'edit_note', noteId: n.id, text: editText.trim() })) setEditing(null);
                    }}
                  />
                  <Button title="Cancel" small kind="outline" onPress={() => setEditing(null)} />
                </Row>
              </View>
            ) : (
              <View key={n.id} style={divider}>
                <T>{`• ${n.text}`}</T>
                <Row>
                  <T variant="small" style={{ flex: 1 }}>{dateTime(n.at)}</T>
                  <Button
                    title="✏️"
                    small
                    kind="outline"
                    onPress={() => {
                      setEditing(n.id);
                      setEditText(n.text);
                    }}
                  />
                  <Button
                    title="🗑"
                    small
                    kind="outline"
                    tone="danger"
                    busy={busy === `r-${n.id}`}
                    onPress={() => confirmRemove('Remove this rule?', n.text, `r-${n.id}`, { action: 'remove_note', noteId: n.id })}
                  />
                </Row>
              </View>
            )
          )
        ) : (
          <T variant="small">No rules yet. Add one here, or tell the AI chat “remember that …”.</T>
        )}
      </Card>

      {r ? (
        <Card>
          <T style={{ fontWeight: '700' }}>⭐ Google review replies</T>
          <Row wrap>
            <Pill text={r.tone} tone="brand" />
            <Pill text={r.length} tone="muted" />
            <Pill text={r.language} tone="muted" />
            <Pill text={r.useReviewerName ? 'Uses first name' : 'No names'} tone="muted" />
            <Pill text={r.allowEmojis ? 'Emoji OK' : 'No emoji'} tone="muted" />
            {r.mentionBusinessName ? <Pill text="Mentions business" tone="muted" /> : null}
          </Row>
          {r.signOff ? <T variant="small">{`Sign-off: ${r.signOff}`}</T> : null}
          {r.negativeContact ? <T variant="small">{`Bad reviews: ${r.negativeContact}`}</T> : null}
          {r.highlights ? <T variant="small">{`Highlight: ${r.highlights}`}</T> : null}
          {r.avoid ? <T variant="small">{`Avoid: ${r.avoid}`}</T> : null}
          {r.extraInstructions ? <T variant="small">{`Also: ${r.extraInstructions}`}</T> : null}
          <T variant="small" color={p.muted}>Always: same language as the review; rating-only 5★ answered in English.</T>
        </Card>
      ) : null}

      {rules.inboxes.map((inbox) => (
        <Card key={inbox.id}>
          <T style={{ fontWeight: '700' }}>{`📧 ${inbox.label || inbox.email}`}</T>
          <T variant="small">{inbox.focus ? `Watches for: ${inbox.focus}` : 'No focus set: the AI uses general judgement.'}</T>
          {inbox.importantSenders.length ? (
            <View style={divider}>
              <T variant="label">Always important</T>
              {inbox.importantSenders.map((email) => (
                <Row key={email}>
                  <T variant="small" style={{ flex: 1 }}>{`🌟 ${email}`}</T>
                  <Button
                    title="✕"
                    small
                    kind="outline"
                    busy={busy === `i-${email}`}
                    onPress={() => confirmRemove('Stop always showing this sender?', email, `i-${email}`, { action: 'remove_important', inboxId: inbox.id, email })}
                  />
                </Row>
              ))}
            </View>
          ) : null}
          {inbox.ignoredSenders.length ? (
            <View style={divider}>
              <T variant="label">Ignored senders</T>
              {inbox.ignoredSenders.map((email) => (
                <Row key={email}>
                  <T variant="small" style={{ flex: 1 }}>{`🔕 ${email}`}</T>
                  <Button
                    title="✕"
                    small
                    kind="outline"
                    busy={busy === `s-${email}`}
                    onPress={() => confirmRemove('Stop ignoring this sender?', email, `s-${email}`, { action: 'unignore_sender', inboxId: inbox.id, email })}
                  />
                </Row>
              ))}
            </View>
          ) : null}
          {inbox.ignoreRules.length ? (
            <View style={divider}>
              <T variant="label">Ignored emails like</T>
              {inbox.ignoreRules.map((rule) => (
                <Row key={rule.id}>
                  <T variant="small" style={{ flex: 1 }}>{`🚫 “${rule.subject}”${rule.fromEmail ? ` · ${rule.fromEmail}` : ''}`}</T>
                  <Button
                    title="✕"
                    small
                    kind="outline"
                    busy={busy === `x-${rule.id}`}
                    onPress={() => confirmRemove('Remove this ignore rule?', rule.subject, `x-${rule.id}`, { action: 'remove_rule', ruleId: rule.id })}
                  />
                </Row>
              ))}
            </View>
          ) : null}
        </Card>
      ))}
    </>
  );
}
