import { useState } from 'react';
import { Alert, View } from 'react-native';

import { Button, Card, Input, Loading, Row, Screen, Section, T } from '@/components/ui';
import { api } from '@/lib/api';
import { space, usePalette } from '@/lib/theme';
import { useApi } from '@/lib/use-api';

// More → Writing modes: the choices shown under "Anwarz ✨ Rephrase" when text is selected in any app.
// Each mode is a name, an emoji and plain instructions to the AI ("make it more professional…").
// "Anwarz ✓ Correct" (grammar, spelling, punctuation only) is always there and needs no mode.

interface Mode {
  id: string;
  name: string;
  emoji: string;
  instructions: string;
}

const blank = (): Mode => ({ id: '', name: '', emoji: '✨', instructions: '' });

export default function WritingModes() {
  const p = usePalette();
  const { data, setData, error, loading, refresh } = useApi<{ modes: Mode[] }>('/writing');
  const [editing, setEditing] = useState<{ index: number; mode: Mode } | null>(null);
  const [saving, setSaving] = useState(false);
  const [tryText, setTryText] = useState('');
  const [tryResult, setTryResult] = useState<{ mode: string; text: string } | null>(null);
  const [trying, setTrying] = useState<string | null>(null);
  const modes = data?.modes ?? [];

  const save = async (next: Mode[]) => {
    setSaving(true);
    try {
      const r = await api<{ modes: Mode[] }>('/writing', { body: { modes: next } });
      setData(r);
      return true;
    } catch (e) {
      Alert.alert('Not saved', e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    const m = { ...editing.mode, name: editing.mode.name.trim(), instructions: editing.mode.instructions.trim() };
    if (!m.name || !m.instructions) return Alert.alert('Almost', 'Give the mode a name and instructions.');
    const next = editing.index < 0 ? [...modes, m] : modes.map((x, i) => (i === editing.index ? m : x));
    if (await save(next)) setEditing(null);
  };

  const remove = (i: number) =>
    Alert.alert(`Delete “${modes[i].name}”?`, 'It disappears from Rephrase on every app.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void save(modes.filter((_, j) => j !== i)) },
    ]);

  const move = (i: number, by: -1 | 1) => {
    const j = i + by;
    if (j < 0 || j >= modes.length) return;
    const next = [...modes];
    [next[i], next[j]] = [next[j], next[i]];
    void save(next);
  };

  const tryIt = async (mode: string, label: string) => {
    if (!tryText.trim()) return;
    setTrying(mode);
    setTryResult(null);
    try {
      const r = await api<{ text: string }>('/writing', { body: { text: tryText, mode }, timeoutMs: 45_000 });
      setTryResult({ mode: label, text: r.text });
    } catch (e) {
      Alert.alert('No result', e instanceof Error ? e.message : String(e));
    } finally {
      setTrying(null);
    }
  };

  return (
    <Screen padTop={false} refreshing={false} onRefresh={refresh}>
      <T variant="small">
        Select text in any app (WhatsApp, Gmail, LinkedIn…) and pick “Anwarz ✓ Correct” to fix grammar, spelling and punctuation, or “Anwarz ✨ Rephrase” to choose one of these modes. Arabic and English.
      </T>
      {loading && !data ? <Loading /> : null}
      {error && !data ? <T color={p.danger}>{error}</T> : null}

      {editing ? (
        <Card tone="brand">
          <T variant="heading">{editing.index < 0 ? 'New mode' : 'Edit mode'}</T>
          <Row style={{ gap: space.sm }}>
            <Input value={editing.mode.emoji} onChangeText={(v) => setEditing({ ...editing, mode: { ...editing.mode, emoji: v } })} style={{ width: 64, textAlign: 'center' }} />
            <Input value={editing.mode.name} onChangeText={(v) => setEditing({ ...editing, mode: { ...editing.mode, name: v } })} placeholder="Name, e.g. Professional" style={{ flex: 1 }} />
          </Row>
          <Input
            value={editing.mode.instructions}
            onChangeText={(v) => setEditing({ ...editing, mode: { ...editing.mode, instructions: v } })}
            placeholder="What should the AI do? e.g. Make it more professional and confident, keep it short."
            multiline
            style={{ minHeight: 110 }}
          />
          <Row>
            <Button title="Save" small busy={saving} onPress={() => void saveEdit()} />
            <Button title="Cancel" small kind="outline" onPress={() => setEditing(null)} />
          </Row>
        </Card>
      ) : (
        <Button title="＋ New mode" kind="soft" onPress={() => setEditing({ index: -1, mode: blank() })} />
      )}

      <Section title={`Rephrase modes (${modes.length})`}>
        <Card>
          <T style={{ fontWeight: '700' }}>✓ Correct only</T>
          <T variant="small">Always there: grammar, spelling and punctuation, nothing else changes.</T>
        </Card>
        {modes.map((m, i) => (
          <Card key={m.id || i}>
            <T style={{ fontWeight: '700' }}>{`${m.emoji} ${m.name}`}</T>
            <T variant="small">{m.instructions}</T>
            <Row wrap>
              <Button title="✏️ Edit" small kind="soft" disabled={saving} onPress={() => setEditing({ index: i, mode: { ...m } })} />
              <Button title="↑" small kind="outline" disabled={saving || i === 0} onPress={() => move(i, -1)} />
              <Button title="↓" small kind="outline" disabled={saving || i === modes.length - 1} onPress={() => move(i, 1)} />
              <Button title="🗑" small kind="outline" tone="danger" disabled={saving} onPress={() => remove(i)} />
            </Row>
          </Card>
        ))}
      </Section>

      <Section title="Try it here">
        <Input value={tryText} onChangeText={setTryText} placeholder="Paste or type some text…" multiline style={{ minHeight: 90 }} />
        <Row wrap>
          <Button title="✓ Correct" small kind="soft" busy={trying === 'correct'} disabled={!tryText.trim() || trying !== null} onPress={() => void tryIt('correct', 'Correct')} />
          {modes.map((m) => (
            <Button key={m.id} title={`${m.emoji} ${m.name}`} small kind="outline" busy={trying === m.id} disabled={!tryText.trim() || trying !== null} onPress={() => void tryIt(m.id, m.name)} />
          ))}
        </Row>
        {tryResult ? (
          <View style={{ backgroundColor: p.card, borderRadius: 12, padding: space.md, gap: 4 }}>
            <T variant="label">{tryResult.mode}</T>
            <T selectable>{tryResult.text}</T>
          </View>
        ) : null}
      </Section>
    </Screen>
  );
}
