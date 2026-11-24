import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { SelectionBar, runForEach } from '@/components/selection-bar';
import { TaskCard } from '@/components/task-card';
import { Button, Empty, ErrorBox, Loading, Screen, Section, Segmented } from '@/components/ui';
import { api } from '@/lib/api';
import { ago } from '@/lib/format';
import { usePalette } from '@/lib/theme';
import type { AppTask, TaskGroups } from '@/lib/types';
import { useApi } from '@/lib/use-api';

// Today is the default (with anything overdue on top); the other tabs look further ahead.
type Tab = 'today' | 'tomorrow' | 'week' | 'nodate' | 'all' | 'done';
type OpenTab = Exclude<Tab, 'done'>;
type BulkAction = 'done' | 'today' | 'tomorrow' | 'cancel';

const TABS: { key: Tab; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'tomorrow', label: 'Tmrw' },
  { key: 'week', label: '7 days' },
  { key: 'nodate', label: 'No date' },
  { key: 'all', label: 'All' },
  { key: 'done', label: 'Done' },
];

/** Which groups each tab shows, in order. */
const SECTIONS: Record<OpenTab, { key: keyof TaskGroups; title: string }[]> = {
  today: [
    { key: 'overdue', title: 'Overdue' },
    { key: 'today', title: 'Today' },
  ],
  tomorrow: [{ key: 'tomorrow', title: 'Tomorrow' }],
  week: [
    { key: 'tomorrow', title: 'Tomorrow' },
    { key: 'week', title: 'Later this week' },
  ],
  nodate: [{ key: 'noDate', title: 'No date' }],
  all: [
    { key: 'overdue', title: 'Overdue' },
    { key: 'today', title: 'Today' },
    { key: 'tomorrow', title: 'Tomorrow' },
    { key: 'week', title: 'Later this week' },
    { key: 'noDate', title: 'No date' },
  ],
};

const EMPTY: Record<OpenTab, string> = {
  today: 'Nothing for today. 🎉',
  tomorrow: 'Nothing for tomorrow.',
  week: 'Nothing in the next 7 days.',
  nodate: 'No tasks without a date.',
  all: 'No open tasks. 🎉',
};

const BODY: Record<BulkAction, Record<string, unknown>> = {
  done: { action: 'done' },
  today: { action: 'move', day: 'today' },
  tomorrow: { action: 'move', day: 'tomorrow' },
  cancel: { action: 'cancel' },
};

/** Hold a task to start selecting; tap others to add them; then one action for all. */
export default function Tasks() {
  const p = usePalette();
  const [picked, setTab] = useState<Tab>('today');
  // Anything unexpected (e.g. a value kept by a live reload of an older screen) falls back to Today.
  const tab: Tab = TABS.some((t) => t.key === picked) ? picked : 'today';
  const open = useApi<TaskGroups>(tab !== 'done' ? '/tasks' : null, { live: true });
  const done = useApi<{ done: { at: string; task: AppTask }[] }>(tab === 'done' ? '/tasks?view=done' : null);
  const current = tab === 'done' ? done : open;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [working, setWorking] = useState<BulkAction | null>(null);
  const selecting = selected.size > 0;

  const count = (t: OpenTab) => (open.data ? SECTIONS[t].reduce((n, s) => n + open.data![s.key].length, 0) : null);
  const shown = tab !== 'done' && open.data ? SECTIONS[tab].flatMap((s) => open.data![s.key]) : [];
  const allSelected = selecting && shown.length > 0 && shown.every((t) => selected.has(t.id));

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const changeTab = (t: Tab) => {
    setTab(t);
    setSelected(new Set());
  };

  const run = async (action: BulkAction) => {
    setWorking(action);
    const { ok, failed } = await runForEach([...selected], (id) => api(`/tasks/${id}`, { body: BODY[action] }));
    setWorking(null);
    setSelected(new Set());
    void open.reload();
    if (failed.length) Alert.alert('Partly done', `✅ ${ok} done\n⚠️ ${failed.length} failed: ${failed[0]}`);
  };

  const confirm = (action: BulkAction) => {
    if (action !== 'cancel') return void run(action);
    const n = selected.size;
    Alert.alert(`Remove ${n} task${n === 1 ? '' : 's'}?`, 'They can be restored from each task card later.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => void run('cancel') },
    ]);
  };

  const overdue = open.data?.overdue.length ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <Screen
        title="Tasks"
        subtitle={selecting ? `${selected.size} selected` : 'Hold a task to select many'}
        refreshing={current.refreshing}
        onRefresh={current.refresh}
        right={<Button title="＋ Task" small onPress={() => router.push('/task/new')} />}>
        <Segmented
          value={tab}
          onChange={changeTab}
          options={TABS.map((t) => ({
            key: t.key,
            label: t.label,
            count: t.key !== 'done' ? count(t.key) : null,
            alert: (t.key === 'today' || t.key === 'all') && overdue > 0,
          }))}
        />

        {current.loading && !current.data ? <Loading /> : null}
        {current.error && !current.data ? <ErrorBox message={current.error} onRetry={current.refresh} /> : null}

        {tab !== 'done' && open.data
          ? (() => {
              const sections = SECTIONS[tab].filter((s) => open.data![s.key].length);
              if (!sections.length) return <Empty text={EMPTY[tab]} />;
              return sections.map((s) => (
                <Section key={s.key} title={`${s.title} (${open.data![s.key].length})`}>
                  {open.data![s.key].map((t) => (
                    <TaskCard key={`${t.id}:${t.dueAt}:${t.status}`} task={t} selecting={selecting} selected={selected.has(t.id)} onSelect={toggle} onChanged={open.reload} />
                  ))}
                </Section>
              ));
            })()
          : null}

        {tab === 'done' && done.data ? (
          done.data.done.length ? (
            done.data.done.map((d) => (
              <Section key={`${d.task.id}-${d.at}`} title={`Done ${ago(d.at)} ago`}>
                <TaskCard task={d.task} />
              </Section>
            ))
          ) : (
            <Empty text="Nothing done in the last 7 days." />
          )
        ) : null}
        {selecting ? <View style={{ height: 120 }} /> : null}
      </Screen>

      {selecting ? (
        <SelectionBar
          count={selected.size}
          allSelected={allSelected}
          onToggleAll={() => setSelected(allSelected ? new Set() : new Set(shown.map((t) => t.id)))}
          onCancel={() => setSelected(new Set())}
          working={working}
          onAction={(key) => confirm(key as BulkAction)}
          actions={[
            { key: 'done', icon: '☑️', label: 'Done', tone: 'ok' },
            { key: 'today', icon: '📅', label: 'To today' },
            { key: 'tomorrow', icon: '🌅', label: 'To tmrw' },
            { key: 'cancel', icon: '🗑', label: 'Remove', tone: 'danger' },
          ]}
        />
      ) : null}
    </View>
  );
}
