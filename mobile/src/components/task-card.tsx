import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, View } from 'react-native';

import { api } from '@/lib/api';
import { cairoDate } from '@/lib/format';
import { space, usePalette } from '@/lib/theme';
import type { AppTask } from '@/lib/types';

import { Button, Card, Pill, Row, T } from './ui';

// A task in a list. Tap it to open the same buttons as the Telegram task card:
// Move to today/tomorrow (overdue), 📅 Date, ⏰ Time, ☑️ Done, ✏️ Edit, 🗑 Remove, 📲 WhatsApp.

type Panel = 'actions' | 'date' | 'time' | null;

const TIMES = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function dayLabel(date: string, i: number) {
  if (i === 0) return 'Today';
  if (i === 1) return 'Tomorrow';
  const d = new Date(`${date}T12:00:00Z`);
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()}`;
}

function timeLabel(t: string) {
  const h = Number(t.slice(0, 2));
  return `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`;
}

/** Results stay on the card (like Telegram); the list itself reloads on pull-down or when coming back to it. */
export function TaskCard({ task: initial }: { task: AppTask }) {
  const p = usePalette();
  const [task, setTask] = useState(initial);
  const [panel, setPanel] = useState<Panel>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const act = async (key: string, body: Record<string, unknown>, done?: (t: AppTask, extra: { movedTo?: string | null; until?: string }) => string) => {
    setBusy(key);
    try {
      const result = await api<{ task: AppTask; movedTo?: string | null; until?: string; needs?: string[]; error?: string }>(`/tasks/${task.id}`, { body });
      if (result.needs) {
        Alert.alert('Missing details', result.error || 'Open ✏️ Edit to finish this task.');
        return;
      }
      setTask(result.task);
      setNote(done ? done(result.task, result) : null);
      setPanel(result.task.status === 'open' ? 'actions' : null);
    } catch (e) {
      Alert.alert('Not saved', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const open = task.status === 'open';
  const expanded = panel !== null || !open;

  return (
    <Card onPress={() => setPanel(panel ? null : 'actions')} tone={open && task.overdue ? 'danger' : undefined} style={{ paddingVertical: space.md }}>
      <T variant="heading" numberOfLines={expanded ? undefined : 2} style={!open ? { textDecorationLine: 'line-through', color: p.muted } : undefined}>
        {task.title}
      </T>
      <Row wrap>
        {task.when ? <T variant="small" color={open && task.overdue ? p.danger : p.muted}>{`${open && task.overdue ? '⚠️ ' : '🕒 '}${task.when}`}</T> : <T variant="small">No date</T>}
        {task.clientName ? <Pill text={task.clientName} /> : null}
        {task.priority === 'high' ? <Pill text="High" tone="danger" /> : null}
        {task.repeats ? <Pill text="Repeats" tone="muted" /> : null}
      </Row>

      {note ? <T variant="small" color={p.ok}>{note}</T> : null}

      {!open ? (
        <Row>
          <T color={task.status === 'done' ? p.ok : p.muted} style={{ flex: 1, fontWeight: '700' }}>
            {task.status === 'done' ? '✅ Done' : '↩️ Removed'}
          </T>
          <Button title={task.status === 'done' ? '♻️ Reopen' : '♻️ Restore'} kind="soft" small busy={busy === 'reopen'} onPress={() => act('reopen', { action: 'reopen' })} />
        </Row>
      ) : null}

      {open && panel === 'actions' ? (
        <View style={{ gap: space.sm, marginTop: space.xs }}>
          {task.overdue ? (
            <Row>
              <Button title="📅 Move to today" kind="soft" small style={{ flex: 1 }} busy={busy === 'today'} onPress={() => act('today', { action: 'move', day: 'today' }, (t) => `Moved to ${t.when}`)} />
              <Button title="🌅 Move to tomorrow" kind="soft" small style={{ flex: 1 }} busy={busy === 'tomorrow'} onPress={() => act('tomorrow', { action: 'move', day: 'tomorrow' }, (t) => `Moved to ${t.when}`)} />
            </Row>
          ) : null}
          <Row>
            <Button title="📅 Date" kind="outline" small style={{ flex: 1 }} onPress={() => setPanel('date')} />
            <Button title="⏰ Time" kind="outline" small style={{ flex: 1 }} onPress={() => setPanel('time')} />
          </Row>
          <Row>
            <Button
              title="☑️ Done"
              tone="ok"
              small
              style={{ flex: 1 }}
              busy={busy === 'done'}
              onPress={() => act('done', { action: 'done' }, (t, x) => (x.movedTo ? `✅ Done. Next one: ${t.when}` : ''))}
            />
            <Button title="✏️ Edit" kind="soft" small style={{ flex: 1 }} onPress={() => router.push(`/task/${task.id}`)} />
            <Button title="🗑 Remove" kind="soft" tone="danger" small style={{ flex: 1 }} busy={busy === 'cancel'} onPress={() => act('cancel', { action: 'cancel' })} />
          </Row>
          {task.whatsappUrl ? (
            <Button title={`📲 Message ${task.clientName || 'client'} on WhatsApp`} kind="soft" tone="ok" small onPress={() => Linking.openURL(task.whatsappUrl!)} />
          ) : null}
        </View>
      ) : null}

      {open && panel === 'date' ? (
        <View style={{ gap: space.sm, marginTop: space.xs }}>
          <T variant="heading">📅 Which day?</T>
          <Row wrap>
            {Array.from({ length: 14 }, (_, i) => cairoDate(i)).map((d, i) => (
              <Button
                key={d}
                title={dayLabel(d, i)}
                kind="soft"
                small
                style={{ minWidth: 96, flexGrow: 1 }}
                busy={busy === `d${d}`}
                onPress={() => act(`d${d}`, { action: 'edit', fields: { date: d } }, (t) => `📅 Now ${t.when}`)}
              />
            ))}
          </Row>
          {!task.repeats ? <Button title="📝 No date" kind="outline" small busy={busy === 'nodate'} onPress={() => act('nodate', { action: 'edit', fields: { noDate: true } }, () => '📝 No date')} /> : null}
          <Button title="⬅️ Back" kind="outline" tone="muted" small onPress={() => setPanel('actions')} />
        </View>
      ) : null}

      {open && panel === 'time' ? (
        <View style={{ gap: space.sm, marginTop: space.xs }}>
          <T variant="heading">{`⏰ What time${task.dueAt ? '' : ' today'}?`}</T>
          <Row wrap>
            {TIMES.map((t) => (
              <Button
                key={t}
                title={timeLabel(t)}
                kind="soft"
                small
                style={{ minWidth: 72, flexGrow: 1 }}
                busy={busy === `t${t}`}
                onPress={() =>
                  act(`t${t}`, { action: 'edit', fields: task.dueAt ? { time: t } : { date: cairoDate(), time: t } }, (x) => `⏰ Now ${x.when}`)
                }
              />
            ))}
          </Row>
          <Button
            title="🗓 All day"
            kind="outline"
            small
            busy={busy === 'allday'}
            onPress={() => act('allday', { action: 'edit', fields: task.dueAt ? { time: null, allDay: true } : { date: cairoDate(), allDay: true } }, (x) => `🗓 ${x.when}`)}
          />
          <T variant="small">For another time like 4:30, use ✏️ Edit.</T>
          <Button title="⬅️ Back" kind="outline" tone="muted" small onPress={() => setPanel('actions')} />
        </View>
      ) : null}
    </Card>
  );
}
