import { useState } from 'react';
import { Alert, Linking, Pressable, View } from 'react-native';

import { api } from '@/lib/api';
import { ago } from '@/lib/format';
import { space, usePalette } from '@/lib/theme';
import type { AppComment } from '@/lib/types';

import { Button, Card, Input, Pill, Row, T } from './ui';

// A Facebook / Instagram comment waiting for a reply (Marketing → Social). The AI checked it for risk
// (complaints, angry or harmful comments) and drafted a reply in the client's style. Nothing is posted
// or hidden without a tap here.

export function CommentCard({ comment: initial, onDone }: { comment: AppComment; onDone: () => void }) {
  const p = usePalette();
  const [c, setC] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(initial.draft ?? '');
  const [gone, setGone] = useState<string | null>(null);

  const act = async (action: string, body: Record<string, unknown> = {}) => {
    setBusy(action);
    try {
      const r = await api<{ comment: AppComment | null }>(`/marketing/comments/${c.id}`, { body: { action, ...body }, timeoutMs: 60_000 });
      if (r.comment) {
        setC(r.comment);
        setText(r.comment.draft ?? '');
        if (['posted', 'hidden', 'skipped'].includes(r.comment.status)) {
          setGone(r.comment.status === 'posted' ? '✅ Reply posted' : r.comment.status === 'hidden' ? '🙈 Comment hidden' : 'Skipped');
          onDone();
        }
      }
      return true;
    } catch (e) {
      Alert.alert('Not done', e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setBusy(null);
    }
  };

  if (gone) {
    return (
      <Card>
        <T variant="small">{`${gone} · ${c.author}: ${c.message.slice(0, 80)}`}</T>
      </Card>
    );
  }

  const post = () =>
    Alert.alert('Post this reply?', `On ${c.clientName ?? 'the'} ${c.platform === 'facebook' ? 'Facebook page' : 'Instagram'}, publicly:\n\n${c.draft}`, [
      { text: 'Not yet', style: 'cancel' },
      { text: 'Post', onPress: () => void act('post') },
    ]);
  const hide = () =>
    Alert.alert('Hide this comment?', 'It will be hidden on the page (the person and their friends still see it).', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Hide', style: 'destructive', onPress: () => void act('hide') },
    ]);

  return (
    <Card tone={c.risk === 'high' ? 'danger' : c.risk === 'watch' ? 'warn' : undefined}>
      <Row>
        <T variant="heading" style={{ flex: 1 }} numberOfLines={1}>{`${c.platform === 'facebook' ? '📘' : '📸'} ${c.author}`}</T>
        <T variant="small">{ago(c.createdAt)}</T>
      </Row>
      <Row wrap>
        {c.clientName ? <Pill text={c.clientName} tone="muted" /> : null}
        {c.risk === 'high' ? <Pill text="⚠️ Needs care" tone="danger" /> : c.risk === 'watch' ? <Pill text="👀 Watch" tone="warn" /> : null}
      </Row>
      <T>{c.message}</T>
      {c.riskReason && c.risk !== 'none' ? <T variant="small" color={c.risk === 'high' ? p.danger : p.warn}>{c.riskReason}</T> : null}
      {c.postExcerpt ? (
        <Pressable disabled={!c.postUrl} onPress={() => c.postUrl && void Linking.openURL(c.postUrl)}>
          <T variant="small" numberOfLines={2}>{`On the post: ${c.postExcerpt}${c.postUrl ? ' ↗' : ''}`}</T>
        </Pressable>
      ) : null}

      {editing ? (
        <View style={{ gap: space.sm }}>
          <Input value={text} onChangeText={setText} multiline placeholder="Your reply" />
          <Row>
            <Button
              title="Save"
              small
              busy={busy === 'edit'}
              disabled={!text.trim()}
              onPress={async () => {
                if (await act('edit', { draft: text.trim() })) setEditing(false);
              }}
            />
            <Button title="Cancel" small kind="outline" onPress={() => setEditing(false)} />
          </Row>
        </View>
      ) : c.draft ? (
        <View style={{ backgroundColor: p.bg, borderRadius: 10, padding: space.md }}>
          <T variant="label">Reply draft</T>
          <T selectable>{c.draft}</T>
        </View>
      ) : (
        <T variant="small">{c.draftError || 'No draft yet: the AI may think no reply is needed.'}</T>
      )}

      {!editing ? (
        <Row wrap>
          {c.draft ? <Button title="✅ Post reply" small tone="ok" busy={busy === 'post'} disabled={busy !== null} onPress={post} /> : null}
          <Button title={c.draft ? '✏️ Edit' : '✍️ Write reply'} small kind="soft" disabled={busy !== null} onPress={() => setEditing(true)} />
          <Button title="✨ New draft" small kind="soft" busy={busy === 'redraft'} disabled={busy !== null} onPress={() => void act('redraft')} />
          <Button title="🙈 Hide" small kind="outline" tone="danger" busy={busy === 'hide'} disabled={busy !== null} onPress={hide} />
          <Button title="Skip" small kind="outline" busy={busy === 'skip'} disabled={busy !== null} onPress={() => void act('skip')} />
        </Row>
      ) : null}
    </Card>
  );
}
