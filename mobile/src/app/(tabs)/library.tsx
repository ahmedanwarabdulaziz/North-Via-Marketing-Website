import { useState } from 'react';
import { Alert } from 'react-native';

import { LibraryCard } from '@/components/library-card';
import { Button, Card, Chip, ChipRow, Empty, ErrorBox, Input, Loading, Row, Screen, T } from '@/components/ui';
import { api } from '@/lib/api';
import type { LibraryItem } from '@/lib/types';
import { useApi } from '@/lib/use-api';

interface LibraryData {
  items: LibraryItem[];
  total: number;
  categories: { id: string; name: string; emoji: string; count: number }[];
}

/** Screenshots, links and notes kept for later; search finds them by meaning or by words. */
export default function Library() {
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const path = search ? `/library?q=${encodeURIComponent(search)}` : `/library${category ? `?category=${encodeURIComponent(category)}` : ''}`;
  const { data, error, loading, refreshing, refresh, reload } = useApi<LibraryData>(path);
  const [adding, setAdding] = useState(false);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const r = await api<{ item: LibraryItem; taskRequest: string | null }>('/library', { body: { text: note.trim() }, timeoutMs: 60_000 });
      setNote('');
      setAdding(false);
      void reload();
      Alert.alert('Saved 📚', r.item.title);
    } catch (e) {
      Alert.alert('Not saved', e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      title="Library"
      subtitle={data ? `${data.total} saved · share anything to Anwarz to add it` : undefined}
      refreshing={refreshing}
      onRefresh={refresh}
      right={<Button title={adding ? '✖️' : '＋ Add'} small kind={adding ? 'soft' : 'primary'} onPress={() => setAdding((a) => !a)} />}>
      {adding ? (
        <Card>
          <T variant="heading">Add a link or a note</T>
          <Input value={note} onChangeText={setNote} placeholder="Paste a link, or write a note…" multiline autoFocus />
          <Button title="📚 Save" busy={saving} disabled={!note.trim()} onPress={save} />
        </Card>
      ) : null}

      <Row>
        <Input
          value={query}
          onChangeText={(v) => {
            setQuery(v);
            if (!v.trim()) setSearch('');
          }}
          onSubmitEditing={() => setSearch(query.trim())}
          placeholder="Search by meaning or words…"
          returnKeyType="search"
          style={{ flex: 1 }}
        />
        {search ? <Button title="✖️" small kind="soft" onPress={() => { setQuery(''); setSearch(''); }} /> : null}
      </Row>

      {!search && data && data.categories.length > 1 ? (
        <ChipRow>
          <Chip text="All" selected={!category} onPress={() => setCategory(null)} />
          {data.categories.map((c) => (
            <Chip key={c.id} text={`${c.emoji} ${c.name} (${c.count})`} selected={category === c.id} onPress={() => setCategory(c.id)} />
          ))}
        </ChipRow>
      ) : null}

      {loading && !data ? <Loading /> : null}
      {error && !data ? <ErrorBox message={error} onRetry={refresh} /> : null}
      {data ? (
        data.items.length ? (
          data.items.map((i) => <LibraryCard key={i.id} item={i} onChanged={reload} />)
        ) : (
          <Empty text={search ? `Nothing found for “${search}”.` : 'Nothing saved yet.'} />
        )
      ) : null}
    </Screen>
  );
}
