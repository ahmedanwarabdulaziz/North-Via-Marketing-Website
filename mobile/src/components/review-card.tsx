import { useState } from 'react';
import { Alert, Linking, Text, View } from 'react-native';

import { api } from '@/lib/api';
import { ago, dateTime } from '@/lib/format';
import { space, usePalette } from '@/lib/theme';
import type { AppReview } from '@/lib/types';

import { Back, BottomSheet, Note, Tile } from './sheet';
import { Card, Input, Pill, Row, T } from './ui';

// A Google review in a list. Tapping it slides up a sheet: read the review, edit the AI draft,
// ✅ Approve & post, 🔄 Regenerate, ⏭ Skip, 📲 share with the client on WhatsApp.
// Nothing is posted to Google without ✅.

export function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  const p = usePalette();
  if (!rating) return <T variant="small">No rating</T>;
  return (
    <Text style={{ fontSize: size, letterSpacing: 1 }}>
      <Text style={{ color: rating <= 2 ? p.danger : '#F5A623' }}>{'★'.repeat(rating)}</Text>
      <Text style={{ color: p.border }}>{'★'.repeat(5 - rating)}</Text>
    </Text>
  );
}

const STATUS: Record<AppReview['status'], { text: string; tone: 'brand' | 'danger' | 'warn' | 'ok' | 'muted' }> = {
  draft_ready: { text: 'Draft ready', tone: 'warn' },
  needs_draft: { text: 'Needs a reply', tone: 'danger' },
  posted: { text: 'Replied', tone: 'ok' },
  replied: { text: 'Replied on Google', tone: 'ok' },
  skipped: { text: 'Skipped', tone: 'muted' },
};

export function ReviewCard({ review: initial }: { review: AppReview }) {
  const [review, setReview] = useState(initial);
  const [open, setOpen] = useState(false);
  const s = STATUS[review.status];
  const bad = review.rating > 0 && review.rating <= 2;

  return (
    <>
      <Card onPress={() => setOpen(true)} tone={bad && review.waiting ? 'danger' : undefined} style={{ paddingVertical: space.md }}>
        <Row>
          <Stars rating={review.rating} />
          <T variant="small" style={{ flex: 1, textAlign: 'right' }}>
            {ago(review.createdAt)}
          </T>
        </Row>
        <T variant="heading" numberOfLines={1}>
          {review.reviewer}
        </T>
        {review.comment ? (
          <T numberOfLines={3}>{review.comment}</T>
        ) : (
          <T variant="small" style={{ fontStyle: 'italic' }}>
            Rating only, no written review
          </T>
        )}
        <Row wrap>
          {review.clientName ? <Pill text={review.clientName} /> : null}
          <Pill text={s.text} tone={s.tone} />
        </Row>
      </Card>
      <ReviewSheet review={review} visible={open} onClose={() => setOpen(false)} onChange={setReview} />
    </>
  );
}

function ReviewSheet({ review, visible, onClose, onChange }: { review: AppReview; visible: boolean; onClose: () => void; onChange: (r: AppReview) => void }) {
  const p = usePalette();
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null); // local edits to the draft
  const [editing, setEditing] = useState(false);

  const close = () => {
    setNote(null);
    setEditing(false);
    setText(null);
    onClose();
  };

  const act = async (key: string, body: Record<string, unknown>, done: string) => {
    setBusy(key);
    setNote(null);
    try {
      const result = await api<{ review: AppReview }>(`/reviews/${review.id}`, { body, timeoutMs: 60_000 });
      onChange(result.review);
      setText(null);
      setEditing(false);
      setNote(done);
      return true;
    } catch (e) {
      Alert.alert(key === 'approve' ? 'Not posted' : 'Something went wrong', e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setBusy(null);
    }
  };

  const current = (text ?? review.draft ?? '').trim();
  const edited = text !== null && text.trim() !== (review.draft ?? '').trim();

  const approve = () =>
    Alert.alert('Post this reply on Google?', `${review.clientName ?? ''} · ${review.reviewer}\n\n${current.slice(0, 300)}${current.length > 300 ? '…' : ''}`, [
      { text: 'Not yet', style: 'cancel' },
      {
        text: 'Post',
        onPress: async () => {
          if (await act('approve', { action: 'approve', ...(edited ? { text: current } : {}) }, '✅ Posted on Google')) setTimeout(close, 900);
        },
      },
    ]);

  return (
    <BottomSheet visible={visible} onClose={close}>
      <View style={{ gap: 6 }}>
        <Row>
          <Stars rating={review.rating} size={20} />
          <T variant="small" style={{ flex: 1, textAlign: 'right' }}>
            {dateTime(review.createdAt)}
          </T>
        </Row>
        <T variant="title">{review.reviewer}</T>
        <T variant="small">{`${review.clientName ?? ''}${review.location && review.location !== review.clientName ? ` · ${review.location}` : ''}`}</T>
      </View>

      <Card>
        {review.comment ? <T selectable>{`“${review.comment}”`}</T> : <T variant="small" style={{ fontStyle: 'italic' }}>Rating only, no written review.</T>}
      </Card>

      {note ? <Note text={note} /> : null}

      {review.waiting ? (
        <>
          <View style={{ gap: space.sm }}>
            <Row>
              <T variant="label" style={{ flex: 1 }}>
                {review.draft ? 'AI reply' : 'Reply'}
              </T>
              {review.draft && !editing ? (
                <T variant="small" color={p.brand} style={{ fontWeight: '700' }}>
                  Tap the text to edit
                </T>
              ) : null}
            </Row>
            {review.draft || editing ? (
              <Input
                value={text ?? review.draft ?? ''}
                onChangeText={setText}
                onFocus={() => setEditing(true)}
                multiline
                placeholder="Write the reply…"
                style={{ minHeight: 140 }}
              />
            ) : (
              <Note text={`No draft yet${review.draftError ? ` (${review.draftError.slice(0, 120)})` : ''}. Tap 🔄 Regenerate or ✏️ Write.`} tone="danger" />
            )}
          </View>

          <Tile icon="✅" label={edited ? 'Post my edited reply' : 'Approve & post on Google'} tone="ok" wide busy={busy === 'approve'} disabled={!current} onPress={approve} />
          <Row>
            {review.draft ? (
              <Tile icon="🔄" label="Regenerate" busy={busy === 'regenerate'} onPress={() => act('regenerate', { action: 'regenerate' }, '🔄 New draft written')} />
            ) : (
              <Tile icon="✏️" label="Write" onPress={() => setEditing(true)} />
            )}
            {edited ? <Tile icon="💾" label="Save draft" busy={busy === 'save'} onPress={() => act('save', { action: 'save', text: current }, '💾 Draft saved')} /> : null}
            <Tile
              icon="⏭"
              label="Skip"
              tone="muted"
              busy={busy === 'skip'}
              onPress={() =>
                Alert.alert('Skip this review?', 'No reply will be posted.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Skip', style: 'destructive', onPress: () => void act('skip', { action: 'skip' }, '⏭ Skipped').then((ok) => ok && setTimeout(close, 700)) },
                ])
              }
            />
          </Row>
          {!review.draft && review.status === 'needs_draft' ? (
            <Tile icon="🔄" label="Ask the AI for a draft" wide busy={busy === 'regenerate'} onPress={() => act('regenerate', { action: 'regenerate' }, '🔄 Draft written')} />
          ) : null}
        </>
      ) : review.reply ? (
        <Card>
          <T variant="label">{review.status === 'posted' ? `Your reply${review.postedAt ? ` · ${dateTime(review.postedAt)}` : ''}` : 'Reply on Google'}</T>
          <T selectable>{review.reply}</T>
        </Card>
      ) : null}

      <Tile icon="📲" label={`Share with ${review.clientName || 'the client'} on WhatsApp`} tone="ok" wide onPress={() => Linking.openURL(review.whatsappUrl)} />
      <Back onPress={close} label="Close" />
    </BottomSheet>
  );
}
