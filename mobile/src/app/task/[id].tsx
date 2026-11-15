import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { Button, Card, Chip, ErrorBox, Input, Loading, Pill, Row, Screen, Section, T } from '@/components/ui';
import { api } from '@/lib/api';
import { cairoDate, dateTime } from '@/lib/format';
import { usePalette } from '@/lib/theme';
import type { AppTask } from '@/lib/types';
import { useApi } from '@/lib/use-api';

interface TaskData {
  task: AppTask;
  events: { event: string; detail: unknown; created_at: string }[];
}

export default function TaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = usePalette();
  const { data, setData, error, loading, refresh } = useApi<TaskData>(`/tasks/${id}`);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const act = async (action: string, extra: Record<string, unknown> = {}, label = action) => {
    setBusy(label);
    try {
      const result = await api<{ task: AppTask; movedTo?: string | null; needs?: string[]; error?: string }>(`/tasks/${id}`, { body: { action, ...extra } });
      if (result.needs) {
        Alert.alert('Missing details', result.error || `Still needed: ${result.needs.join(', ')}`);
        return;
      }
      setData((d) => (d ? { ...d, task: result.task } : d));
      if (action === 'done' && result.movedTo) Alert.alert('Done', `Next one: ${result.task.when}`);
      if (action === 'edit') setEditing(false);
      void refresh();
    } catch (e) {
      Alert.alert('Not saved', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const startEdit = (task: AppTask) => {
    setTitle(task.title);
    const local = task.dueAt ? new Date(task.dueAt) : null;
    setDate(local ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(local) : '');
    setTime(local && !task.allDay ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit', hour12: false }).format(local) : '');
    setEditing(true);
  };

  const saveEdit = () => {
    const fields: Record<string, unknown> = { title: title.trim() };
    if (date.trim()) {
      fields.date = date.trim();
      if (time.trim()) fields.time = time.trim();
      else fields.allDay = true;
    } else fields.noDate = true;
    void act('edit', { fields }, 'edit');
  };

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorBox message={error} onRetry={refresh} />;
  if (!data) return null;
  const t = data.task;
  const open = t.status === 'open';

  return (
    <Screen padTop={false}>
      <Stack.Screen options={{ title: t.kind === 'reminder' ? 'Reminder' : 'Task' }} />
      <Card tone={t.overdue ? 'danger' : undefined}>
        <T variant="title" selectable>
          {t.title}
        </T>
        <Row wrap>
          <Pill text={t.category === 'work' ? 'Work' : 'Personal'} tone="muted" />
          {t.clientName ? <Pill text={t.clientName} /> : null}
          {t.priority !== 'normal' ? <Pill text={t.priority === 'high' ? 'High priority' : 'Low priority'} tone={t.priority === 'high' ? 'danger' : 'muted'} /> : null}
          {t.repeats ? <Pill text="Repeats" tone="muted" /> : null}
          {!open ? <Pill text={t.status === 'done' ? 'Done' : 'Cancelled'} tone={t.status === 'done' ? 'ok' : 'muted'} /> : null}
        </Row>
        <T color={t.overdue ? p.danger : p.text}>{t.when ? `${t.overdue ? '⚠️ Overdue · ' : '🕒 '}${t.when}` : 'No date'}</T>
        {t.notes ? (
          <T variant="small" selectable>
            {t.notes}
          </T>
        ) : null}
      </Card>

      {open ? (
        <>
          <Button title="☑️ Mark as done" tone="ok" busy={busy === 'done'} onPress={() => act('done')} />
          <Section title="Snooze the reminder">
            <Row>
              <Button title="1 hour" kind="soft" small style={{ flex: 1 }} busy={busy === '1h'} onPress={() => act('snooze', { for: '1h' }, '1h')} />
              <Button title="3 hours" kind="soft" small style={{ flex: 1 }} busy={busy === '3h'} onPress={() => act('snooze', { for: '3h' }, '3h')} />
              <Button title="Tomorrow" kind="soft" small style={{ flex: 1 }} busy={busy === 'tm'} onPress={() => act('snooze', { for: 'tm' }, 'tm')} />
            </Row>
          </Section>
          <Section title="Move the task">
            <Row>
              <Button title="To today" kind="outline" small style={{ flex: 1 }} busy={busy === 'today'} onPress={() => act('move', { day: 'today' }, 'today')} />
              <Button title="To tomorrow" kind="outline" small style={{ flex: 1 }} busy={busy === 'tomorrow'} onPress={() => act('move', { day: 'tomorrow' }, 'tomorrow')} />
            </Row>
          </Section>
        </>
      ) : (
        <Button title="↩️ Reopen" kind="soft" busy={busy === 'reopen'} onPress={() => act('reopen')} />
      )}

      {editing ? (
        <Card>
          <T variant="heading">Edit</T>
          <Input value={title} onChangeText={setTitle} placeholder="Title" />
          <T variant="small">Date (YYYY-MM-DD), empty = no date</T>
          <Row wrap>
            <Chip text="Today" selected={date === cairoDate()} onPress={() => setDate(cairoDate())} />
            <Chip text="Tomorrow" selected={date === cairoDate(1)} onPress={() => setDate(cairoDate(1))} />
            <Chip text="No date" selected={!date} onPress={() => setDate('')} />
          </Row>
          <Input value={date} onChangeText={setDate} placeholder="2026-11-20" autoCapitalize="none" />
          <T variant="small">Time (HH:MM, 24 h), empty = all day</T>
          <Input value={time} onChangeText={setTime} placeholder="15:30" autoCapitalize="none" />
          <Row>
            <Button title="Save" style={{ flex: 1 }} busy={busy === 'edit'} disabled={!title.trim()} onPress={saveEdit} />
            <Button title="Cancel" kind="outline" style={{ flex: 1 }} onPress={() => setEditing(false)} />
          </Row>
        </Card>
      ) : (
        <Button title="✏️ Edit" kind="outline" onPress={() => startEdit(t)} />
      )}

      {open ? (
        <Button
          title="Cancel this task"
          kind="outline"
          tone="danger"
          busy={busy === 'cancel'}
          onPress={() =>
            Alert.alert('Cancel this task?', t.title, [
              { text: 'Keep it', style: 'cancel' },
              { text: 'Cancel task', style: 'destructive', onPress: () => void act('cancel').then(() => router.back()) },
            ])
          }
        />
      ) : null}

      {data.events.length ? (
        <Section title="History">
          {data.events.map((e, i) => (
            <T key={i} variant="small">{`${dateTime(e.created_at)} · ${e.event}`}</T>
          ))}
        </Section>
      ) : null}
    </Screen>
  );
}
