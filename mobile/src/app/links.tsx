import { Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { Back, BottomSheet, Note, Tile } from '@/components/sheet';
import { Button, Card, Chip, ChipRow, Empty, ErrorBox, Input, Loading, Pill, Row, Screen, T } from '@/components/ui';
import { api } from '@/lib/api';
import { hostOf } from '@/lib/format';
import { copyLink, shareLink, whatsAppLink } from '@/lib/share-link';
import { space, usePalette } from '@/lib/theme';
import type { QuickLink } from '@/lib/types';
import { useApi } from '@/lib/use-api';

interface LinksData {
  links: QuickLink[];
  clients: { id: string; name: string }[];
}

type Draft = { id?: string; title: string; url: string; message: string; clientId: string | null; pinned: boolean };
const EMPTY_DRAFT: Draft = { title: '', url: '', message: '', clientId: null, pinned: false };

/** Links to forward fast: 📤 Share (any app), 💬 WhatsApp, 📋 Copy. ⭐ pinned ones also show on Home. */
export default function Links() {
  const p = usePalette();
  const { data, error, loading, refreshing, refresh, reload } = useApi<LinksData>('/links');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const q = search.trim().toLowerCase();
  const links = (data?.links ?? []).filter(
    (l) => !q || l.title.toLowerCase().includes(q) || l.url.toLowerCase().includes(q) || (l.clientName || '').toLowerCase().includes(q)
  );

  const openEditor = (link?: QuickLink) => {
    setProblem(null);
    setDraft(link ? { id: link.id, title: link.title, url: link.url, message: link.message || '', clientId: link.clientId, pinned: link.pinned } : EMPTY_DRAFT);
  };

  const save = async () => {
    if (!draft) return;
    setBusy('save');
    setProblem(null);
    try {
      await api('/links', {
        body: { action: draft.id ? 'edit' : 'add', id: draft.id, title: draft.title, url: draft.url, message: draft.message, clientId: draft.clientId ?? '', pinned: draft.pinned },
      });
      setDraft(null);
      void reload();
    } catch (e) {
      setProblem(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const remove = () => {
    if (!draft?.id) return;
    Alert.alert('Remove this link?', draft.title, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setBusy('remove');
          try {
            await api('/links', { body: { action: 'remove', id: draft.id } });
            setDraft(null);
            void reload();
          } catch (e) {
            setProblem(e instanceof Error ? e.message : String(e));
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Quick links', headerRight: () => <Button title="＋ Add" small onPress={() => openEditor()} /> }} />
      <Screen padTop={false} refreshing={refreshing} onRefresh={refresh}>
        {data && data.links.length > 6 ? <Input value={search} onChangeText={setSearch} placeholder="Search links" autoCorrect={false} /> : null}
        {loading && !data ? <Loading /> : null}
        {error && !data ? <ErrorBox message={error} onRetry={refresh} /> : null}
        {data && !data.links.length ? (
          <Card>
            <T variant="heading">Your links to share fast</T>
            <T variant="small">Add the links you send often: your portfolio, booking or payment page, a client’s Google review link… Each can carry a ready message.</T>
            <Button title="＋ Add the first link" onPress={() => openEditor()} />
          </Card>
        ) : null}
        {data && data.links.length && !links.length ? <Empty text="No links match." /> : null}

        {links.map((l) => (
          <Card key={l.id}>
            <Pressable onPress={() => openEditor(l)} style={{ gap: 4 }}>
              <Row>
                <T variant="heading" numberOfLines={1} style={{ flex: 1 }}>
                  {`${l.pinned ? '⭐ ' : ''}${l.title}`}
                </T>
                <T variant="small" color={p.brand} style={{ fontWeight: '700' }}>
                  Edit
                </T>
              </Row>
              <T variant="small" numberOfLines={1}>
                {hostOf(l.url)}
              </T>
              {l.message ? (
                <T variant="small" numberOfLines={2} style={{ fontStyle: 'italic' }}>
                  {`“${l.message}”`}
                </T>
              ) : null}
              {l.clientName ? <Pill text={l.clientName} /> : null}
            </Pressable>
            <Row>
              <Button title="📤 Share" small style={{ flex: 1 }} onPress={() => shareLink(l)} />
              <Button title="💬 WhatsApp" small kind="soft" tone="ok" style={{ flex: 1 }} onPress={() => whatsAppLink(l)} />
              <Button title="📋 Copy" small kind="soft" style={{ flex: 1 }} onPress={() => copyLink(l)} />
            </Row>
          </Card>
        ))}
      </Screen>

      <BottomSheet visible={draft !== null} onClose={() => setDraft(null)}>
        {draft ? (
          <View style={{ gap: space.sm }}>
            <T variant="title">{draft.id ? 'Edit link' : 'New link'}</T>
            <T variant="small">Name</T>
            <Input value={draft.title} onChangeText={(v) => setDraft({ ...draft, title: v })} placeholder="e.g. Portfolio, Book a call, Oasis review link" />
            <T variant="small">Link</T>
            <Input value={draft.url} onChangeText={(v) => setDraft({ ...draft, url: v })} placeholder="https://…" autoCapitalize="none" autoCorrect={false} keyboardType="url" />
            <T variant="small">Message sent with it (optional)</T>
            <Input value={draft.message} onChangeText={(v) => setDraft({ ...draft, message: v })} placeholder="e.g. Here’s our portfolio 👇" multiline />
            {data?.clients.length ? (
              <>
                <T variant="small">Client (optional)</T>
                <ChipRow>
                  <Chip text="None" selected={!draft.clientId} onPress={() => setDraft({ ...draft, clientId: null })} />
                  {data.clients.map((c) => (
                    <Chip key={c.id} text={c.name} selected={draft.clientId === c.id} onPress={() => setDraft({ ...draft, clientId: c.id })} />
                  ))}
                </ChipRow>
              </>
            ) : null}
            <Chip text={draft.pinned ? '⭐ Pinned on Home' : '☆ Pin on Home'} selected={draft.pinned} onPress={() => setDraft({ ...draft, pinned: !draft.pinned })} />
            {problem ? <Note text={problem} tone="danger" /> : null}
            <Tile icon="💾" label="Save" tone="brand" wide busy={busy === 'save'} disabled={!draft.title.trim() || !draft.url.trim()} onPress={save} />
            {draft.id ? <Tile icon="🗑" label="Remove link" tone="danger" wide busy={busy === 'remove'} onPress={remove} /> : null}
            <Back onPress={() => setDraft(null)} label="Cancel" />
          </View>
        ) : null}
      </BottomSheet>
    </>
  );
}
