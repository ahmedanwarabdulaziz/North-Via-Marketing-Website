import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Share, View } from 'react-native';

import { api } from '@/lib/api';
import { ago, dateTime } from '@/lib/format';
import { radius, space, usePalette } from '@/lib/theme';
import type { LibraryItem } from '@/lib/types';

import { Back, BottomSheet, Note, Tile } from './sheet';
import { Card, Pill, Row, T } from './ui';

// A library item (screenshot, link or note). Tap it for a sheet with the picture, the full text the
// AI read, and 🔗 Open, 📤 Share, 🗑 Remove.

const ICON: Record<LibraryItem['type'], string> = { screenshot: '🖼', link: '🔗', note: '📝' };

export function LibraryCard({ item: initial, onChanged }: { item: LibraryItem; onChanged?: () => void }) {
  const p = usePalette();
  const [item, setItem] = useState(initial);
  const [open, setOpen] = useState(false);
  const [removed, setRemoved] = useState(false);
  const changed = useRef(false);

  const closeSheet = () => {
    setOpen(false);
    if (changed.current) {
      changed.current = false;
      onChanged?.();
    }
  };

  if (removed && !open) return null;

  return (
    <>
      <Card onPress={() => setOpen(true)} style={{ paddingVertical: space.md }}>
        <Row style={{ alignItems: 'flex-start', gap: space.md }}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={{ width: 64, height: 64, borderRadius: radius.sm, backgroundColor: p.border }} contentFit="cover" />
          ) : (
            <View style={{ width: 64, height: 64, borderRadius: radius.sm, backgroundColor: p.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
              <T style={{ fontSize: 26 }}>{ICON[item.type]}</T>
            </View>
          )}
          <View style={{ flex: 1, gap: 4 }}>
            <T variant="heading" numberOfLines={2}>
              {item.title}
            </T>
            {item.summary ? (
              <T variant="small" numberOfLines={2}>
                {item.summary}
              </T>
            ) : null}
            <Row wrap>
              {item.clientName ? <Pill text={item.clientName} /> : item.personal ? <Pill text="Personal" tone="muted" /> : null}
              {item.domain ? <Pill text={item.domain} tone="muted" /> : null}
              <T variant="small">{ago(item.createdAt)}</T>
            </Row>
          </View>
        </Row>
      </Card>
      <LibrarySheet
        item={item}
        visible={open}
        onClose={closeSheet}
        onChange={(next, gone) => {
          changed.current = true;
          setItem(next);
          setRemoved(gone);
        }}
      />
    </>
  );
}

function LibrarySheet({
  item,
  visible,
  onClose,
  onChange,
}: {
  item: LibraryItem;
  visible: boolean;
  onClose: () => void;
  onChange: (item: LibraryItem, removed: boolean) => void;
}) {
  const p = usePalette();
  const [full, setFull] = useState<LibraryItem | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  // The full text (what the AI read from the picture or page) loads when the sheet opens.
  useEffect(() => {
    if (!visible || full) return;
    let live = true;
    api<{ item: LibraryItem }>(`/library/${item.id}`)
      .then((r) => live && setFull(r.item))
      .catch(() => live && setFull(item));
    return () => {
      live = false;
    };
  }, [visible, full, item]);
  const shown = full ?? item;

  const close = () => {
    setNote(null);
    setShowAll(false);
    onClose();
  };

  const remove = () =>
    Alert.alert('Remove from the library?', shown.title, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setBusy('remove');
          try {
            const r = await api<{ item: LibraryItem; removed: boolean }>(`/library/${item.id}`, { body: { action: 'remove' } });
            onChange(r.item, true);
            close();
          } catch (e) {
            Alert.alert('Not removed', e instanceof Error ? e.message : String(e));
          } finally {
            setBusy(null);
          }
        },
      },
    ]);

  const share = () =>
    Share.share({ message: [shown.title, shown.summary, shown.url].filter(Boolean).join('\n\n'), url: shown.url || shown.imageUrl || undefined }).catch(() => undefined);

  const text = shown.content || shown.sourceText || '';

  return (
    <BottomSheet visible={visible} onClose={close}>
      {shown.imageUrl ? (
        <Image source={{ uri: shown.imageUrl }} style={{ width: '100%', height: 260, borderRadius: radius.md, backgroundColor: p.border }} contentFit="contain" />
      ) : null}
      <View style={{ gap: 6 }}>
        <T variant="title">{shown.title}</T>
        <Row wrap>
          {shown.categoryName ? <Pill text={shown.categoryName} tone="muted" /> : null}
          {shown.clientName ? <Pill text={shown.clientName} /> : shown.personal ? <Pill text="Personal" tone="muted" /> : null}
          <T variant="small">{dateTime(shown.createdAt)}</T>
        </Row>
      </View>
      {note ? <Note text={note} /> : null}
      {shown.summary ? (
        <Card>
          <T variant="label">AI summary</T>
          <T selectable>{shown.summary}</T>
        </Card>
      ) : null}
      {shown.tags.length ? <T variant="small">{shown.tags.map((t) => `#${t}`).join('  ')}</T> : null}
      {text ? (
        <Card>
          <Row>
            <T variant="label" style={{ flex: 1 }}>
              {shown.type === 'note' ? 'Note' : shown.type === 'link' ? 'From the page' : 'Text in the picture'}
            </T>
            {text.length > 400 ? (
              <T variant="small" color={p.brand} style={{ fontWeight: '700' }}>
                {showAll ? '' : '…'}
              </T>
            ) : null}
          </Row>
          <T selectable numberOfLines={showAll ? undefined : 8}>
            {text}
          </T>
          {text.length > 400 ? <Back onPress={() => setShowAll((s) => !s)} label={showAll ? 'Show less' : 'Show all'} /> : null}
        </Card>
      ) : !full ? (
        <T variant="small">Loading…</T>
      ) : null}
      <Row>
        {shown.url ? <Tile icon="🔗" label="Open link" onPress={() => Linking.openURL(shown.url!)} /> : null}
        <Tile icon="📤" label="Share" onPress={share} />
        <Tile icon="🗑" label="Remove" tone="danger" busy={busy === 'remove'} onPress={remove} />
      </Row>
      <Back onPress={close} label="Close" />
    </BottomSheet>
  );
}
