import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, View } from 'react-native';

import { api } from '@/lib/api';
import { cairoDate } from '@/lib/format';
import { space, usePalette } from '@/lib/theme';
import type { AppTask } from '@/lib/types';

import { Back, BottomSheet, Choice, Grid, Note, Tile } from './sheet';
import { Card, Pill, Row, T } from './ui';

// A task in a list. Tapping it slides up a sheet with the same buttons as the Telegram task card:
// Move to today/tomorrow (overdue), 📅 Date, ⏰ Time, ☑️ Done, ✏️ Edit, 🗑 Remove, 📲 WhatsApp.

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

/** Results show on the card (like Telegram); the list itself reloads on pull-down or when coming back to it. */
export function TaskCard({ task: initial }: { task: AppTask }) {
  const p = usePalette();
  const [task, setTask] = useState(initial);
  const [open, setOpen] = useState(false);
  const active = task.status === 'open';

  return (
    <>
      <Card onPress={() => setOpen(true)} tone={active && task.overdue ? 'danger' : undefined} style={{ paddingVertical: space.md }}>
        <T variant="heading" numberOfLines={2} style={!active ? { textDecorationLine: 'line-through', color: p.muted } : undefined}>
          {task.title}
        </T>
        <Row wrap>
          {!active ? <Pill text={task.status === 'done' ? '✅ Done' : '↩️ Removed'} tone={task.status === 'done' ? 'ok' : 'muted'} /> : null}
          {task.when ? <T variant="small" color={active && task.overdue ? p.danger : p.muted}>{`${active && task.overdue ? '⚠️ ' : '🕒 '}${task.when}`}</T> : <T variant="small">No date</T>}
          {task.clientName ? <Pill text={task.clientName} /> : null}
          {task.priority === 'high' ? <Pill text="High" tone="danger" /> : null}
          {task.repeats ? <Pill text="Repeats" tone="muted" /> : null}
        </Row>
      </Card>
      <TaskSheet task={task} visible={open} onClose={() => setOpen(false)} onChange={setTask} />
    </>
  );
}

type Panel = 'actions' | 'date' | 'time';

function TaskSheet({ task, visible, onClose, onChange }: { task: AppTask; visible: boolean; onClose: () => void; onChange: (t: AppTask) => void }) {
  const p = usePalette();
  const [panel, setPanel] = useState<Panel>('actions');
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const close = () => {
    setPanel('actions');
    setNote(null);
    onClose();
  };

  const act = async (key: string, body: Record<string, unknown>, message: (t: AppTask, extra: { movedTo?: string | null }) => string, closeAfter = false) => {
    setBusy(key);
    try {
      const result = await api<{ task: AppTask; movedTo?: string | null; needs?: string[]; error?: string }>(`/tasks/${task.id}`, { body });
      if (result.needs) {
        Alert.alert('Missing details', result.error || 'Use ✏️ Edit to finish this task.');
        return;
      }
      onChange(result.task);
      setPanel('actions');
      if (closeAfter && !result.movedTo) close();
      else setNote(message(result.task, result));
    } catch (e) {
      Alert.alert('Not saved', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const active = task.status === 'open';

  return (
    <BottomSheet visible={visible} onClose={close}>
          <View style={{ gap: 6 }}>
            <T variant="title">{task.title}</T>
            <Row wrap>
              {task.when ? <T color={active && task.overdue ? p.danger : p.muted}>{`${active && task.overdue ? '⚠️ ' : '🕒 '}${task.when}`}</T> : <T color={p.muted}>No date</T>}
              {task.clientName ? <Pill text={task.clientName} /> : null}
              {task.repeats ? <Pill text="Repeats" tone="muted" /> : null}
            </Row>
            {task.notes ? (
              <T variant="small" numberOfLines={4}>
                {task.notes}
              </T>
            ) : null}
          </View>

          {note ? <Note text={note} /> : null}

          {!active ? (
            <Tile
              icon="♻️"
              label={task.status === 'done' ? 'Reopen' : 'Restore'}
              busy={busy === 'reopen'}
              onPress={() => act('reopen', { action: 'reopen' }, () => '♻️ Back on your list')}
              wide
            />
          ) : panel === 'actions' ? (
            <View style={{ gap: space.sm }}>
              {task.overdue ? (
                <Row>
                  <Tile icon="📅" label="Move to today" busy={busy === 'today'} onPress={() => act('today', { action: 'move', day: 'today' }, (t) => `Moved to ${t.when}`)} />
                  <Tile icon="🌅" label="Move to tomorrow" busy={busy === 'tomorrow'} onPress={() => act('tomorrow', { action: 'move', day: 'tomorrow' }, (t) => `Moved to ${t.when}`)} />
                </Row>
              ) : null}
              <Row>
                <Tile icon="📅" label="Date" onPress={() => setPanel('date')} />
                <Tile icon="⏰" label="Time" onPress={() => setPanel('time')} />
              </Row>
              <Row>
                <Tile
                  icon="☑️"
                  label="Done"
                  tone="ok"
                  busy={busy === 'done'}
                  onPress={() => act('done', { action: 'done' }, (t, x) => (x.movedTo ? `✅ Done. Next one: ${t.when}` : '✅ Done'), true)}
                />
                <Tile
                  icon="✏️"
                  label="Edit"
                  onPress={() => {
                    close();
                    router.push(`/task/${task.id}`);
                  }}
                />
                <Tile icon="🗑" label="Remove" tone="danger" busy={busy === 'cancel'} onPress={() => act('cancel', { action: 'cancel' }, () => '↩️ Removed', true)} />
              </Row>
              {task.whatsappUrl ? (
                <Tile icon="📲" label={`Message ${task.clientName || 'client'} on WhatsApp`} tone="ok" wide onPress={() => Linking.openURL(task.whatsappUrl!)} />
              ) : null}
            </View>
          ) : panel === 'date' ? (
            <View style={{ gap: space.sm }}>
              <T variant="heading">📅 Which day?</T>
              <Grid>
                {Array.from({ length: 14 }, (_, i) => cairoDate(i)).map((d, i) => (
                  <Choice key={d} label={dayLabel(d, i)} busy={busy === `d${d}`} onPress={() => act(`d${d}`, { action: 'edit', fields: { date: d } }, (t) => `📅 Now ${t.when}`)} />
                ))}
                {!task.repeats ? <Choice label="📝 No date" busy={busy === 'nodate'} onPress={() => act('nodate', { action: 'edit', fields: { noDate: true } }, () => '📝 No date now')} /> : null}
              </Grid>
              <Back onPress={() => setPanel('actions')} />
            </View>
          ) : (
            <View style={{ gap: space.sm }}>
              <T variant="heading">{`⏰ What time${task.dueAt ? '' : ' today'}?`}</T>
              <Grid>
                {TIMES.map((t) => (
                  <Choice
                    key={t}
                    label={timeLabel(t)}
                    busy={busy === `t${t}`}
                    onPress={() => act(`t${t}`, { action: 'edit', fields: task.dueAt ? { time: t } : { date: cairoDate(), time: t } }, (x) => `⏰ Now ${x.when}`)}
                  />
                ))}
                <Choice
                  label="🗓 All day"
                  busy={busy === 'allday'}
                  onPress={() => act('allday', { action: 'edit', fields: task.dueAt ? { time: null, allDay: true } : { date: cairoDate(), allDay: true } }, (x) => `🗓 ${x.when}`)}
                />
              </Grid>
              <T variant="small">For another time like 4:30, use ✏️ Edit.</T>
              <Back onPress={() => setPanel('actions')} />
            </View>
          )}
    </BottomSheet>
  );
}
