import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { VoiceButton } from '@/components/voice-button';
import { Button, Card, Chip, Input, Row, Screen, Section, T } from '@/components/ui';
import { api } from '@/lib/api';
import { cairoDate } from '@/lib/format';
import { usePalette } from '@/lib/theme';
import type { AddTaskResult, AppClient, Audio, MissingField, TaskFields } from '@/lib/types';

const TIMES = ['09:00', '12:00', '15:00', '18:00', '21:00'];

/**
 * Say or type the task; the AI fills what it can. Anything it couldn't tell is asked here
 * (work or personal, client, day, time, when a repeat ends), nothing is guessed.
 */
export default function NewTask() {
  const p = usePalette();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [heard, setHeard] = useState<string | null>(null);
  const [fields, setFields] = useState<TaskFields | null>(null);
  const [needs, setNeeds] = useState<MissingField[]>([]);
  const [questions, setQuestions] = useState<Partial<Record<MissingField, string>>>({});
  const [clients, setClients] = useState<AppClient[]>([]);

  useEffect(() => {
    if (needs.includes('client') && !clients.length) {
      api<{ clients: AppClient[] }>('/clients').then((r) => setClients(r.clients)).catch(() => undefined);
    }
  }, [needs, clients.length]);

  const handle = (result: AddTaskResult) => {
    if (result.heard) setHeard(result.heard);
    if (result.saved && result.task) {
      Alert.alert('Saved ✅', `${result.task.title}${result.task.when ? `\n${result.task.when}` : ''}`);
      router.back();
      return;
    }
    setFields(result.fields || {});
    setNeeds(result.needs || []);
    setQuestions(result.questions || {});
  };

  const send = async (body: Record<string, unknown>) => {
    setBusy(true);
    try {
      handle(await api<AddTaskResult>('/tasks', { body, timeoutMs: 60_000 }));
    } catch (e) {
      Alert.alert('Not saved', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const update = (patch: Partial<TaskFields>) => setFields((f) => ({ ...(f || {}), ...patch }));
  const answered = (n: MissingField, f: TaskFields) => {
    switch (n) {
      case 'category':
        return Boolean(f.category);
      case 'client':
        return f.category !== 'work' || Boolean(f.clientId || f.noClient);
      case 'when':
        return Boolean(f.date || f.noDate);
      case 'time':
        return !f.date || Boolean(f.time || f.allDay);
      case 'repeat_end':
        return Boolean(f.repeatUntil || f.repeatCount || f.repeatForever);
    }
  };

  if (fields) {
    const f = fields;
    // "time" can come up only once a date is set, and "client" once it's work.
    const shown = [...new Set<MissingField>([...needs, ...(f.date && !f.time && !f.allDay ? (['time'] as const) : []), ...(f.category === 'work' && !f.clientId && !f.noClient ? (['client'] as const) : [])])];
    const ready = shown.every((n) => answered(n, f)) && Boolean(f.title?.trim());
    return (
      <Screen padTop={false}>
        {heard ? <T variant="small">{`🎙 “${heard}”`}</T> : null}
        <Card>
          <T variant="small">Task</T>
          <Input value={f.title || ''} onChangeText={(v) => update({ title: v })} />
        </Card>

        {shown.includes('category') ? (
          <Section title={questions.category || 'Work or personal?'}>
            <Row>
              <Chip text="💼 Work" selected={f.category === 'work'} onPress={() => update({ category: 'work' })} />
              <Chip text="🏠 Personal" selected={f.category === 'personal'} onPress={() => update({ category: 'personal', clientId: null, noClient: false })} />
            </Row>
          </Section>
        ) : null}

        {shown.includes('client') && f.category === 'work' ? (
          <Section title={questions.client || 'Which client?'}>
            <Row wrap>
              {clients.map((c) => (
                <Chip key={c.id} text={c.name} selected={f.clientId === c.id} onPress={() => update({ clientId: c.id, noClient: false })} />
              ))}
              <Chip text="No client" selected={Boolean(f.noClient)} onPress={() => update({ clientId: null, noClient: true })} />
            </Row>
          </Section>
        ) : null}

        {shown.includes('when') ? (
          <Section title={questions.when || 'When?'}>
            <Row wrap>
              <Chip text="Today" selected={f.date === cairoDate()} onPress={() => update({ date: cairoDate(), noDate: false })} />
              <Chip text="Tomorrow" selected={f.date === cairoDate(1)} onPress={() => update({ date: cairoDate(1), noDate: false })} />
              <Chip text="No date" selected={Boolean(f.noDate)} onPress={() => update({ date: null, time: null, noDate: true })} />
            </Row>
            <Input value={f.date || ''} onChangeText={(v) => update({ date: v || null, noDate: false })} placeholder="Or a date: 2026-11-20" autoCapitalize="none" />
          </Section>
        ) : null}

        {shown.includes('time') && f.date ? (
          <Section title={questions.time || 'What time?'}>
            <Row wrap>
              {TIMES.map((t) => (
                <Chip key={t} text={t} selected={f.time === t} onPress={() => update({ time: t, allDay: false })} />
              ))}
              <Chip text="All day" selected={Boolean(f.allDay)} onPress={() => update({ time: null, allDay: true })} />
            </Row>
            <Input value={f.time || ''} onChangeText={(v) => update({ time: v || null, allDay: false })} placeholder="Or a time: 16:45" autoCapitalize="none" />
          </Section>
        ) : null}

        {shown.includes('repeat_end') ? (
          <Section title={questions.repeat_end || 'When does it stop repeating?'}>
            <Row wrap>
              <Chip text="Never" selected={Boolean(f.repeatForever)} onPress={() => update({ repeatForever: true, repeatUntil: null, repeatCount: null })} />
            </Row>
            <Input value={f.repeatUntil || ''} onChangeText={(v) => update({ repeatUntil: v || null, repeatForever: false })} placeholder="Until a date: 2026-12-31" autoCapitalize="none" />
          </Section>
        ) : null}

        <Button title="Save task" busy={busy} disabled={!ready} onPress={() => send({ fields: f })} />
        <Button title="Start over" kind="outline" onPress={() => { setFields(null); setNeeds([]); setHeard(null); }} />
      </Screen>
    );
  }

  return (
    <Screen padTop={false}>
      <T>Type or say the task, in Arabic or English, like you would to the bot.</T>
      <Input value={text} onChangeText={setText} placeholder="e.g. Call Essam tomorrow at 3 about the Pacific menu" multiline autoFocus />
      <Button title="Add task" busy={busy} disabled={!text.trim()} onPress={() => send({ text: text.trim() })} />
      <VoiceButton disabled={busy} onDone={(audio: Audio) => send({ audio, text: text.trim() || undefined })} />
      {busy ? <T variant="small" color={p.muted} style={{ textAlign: 'center' }}>Reading it…</T> : null}
    </Screen>
  );
}
