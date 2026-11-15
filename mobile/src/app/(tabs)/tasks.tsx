import { router } from 'expo-router';
import { useState } from 'react';

import { TaskCard } from '@/components/task-card';
import { Button, Chip, Empty, ErrorBox, Loading, Row, Screen, Section } from '@/components/ui';
import { ago } from '@/lib/format';
import type { AppTask, TaskGroups } from '@/lib/types';
import { useApi } from '@/lib/use-api';

// Today is the default (with anything overdue on top); the other tabs look further ahead.
type Tab = 'today' | 'tomorrow' | 'week' | 'all' | 'done';

const TABS: { key: Tab; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'week', label: 'Next 7 days' },
  { key: 'all', label: 'All' },
  { key: 'done', label: 'Done' },
];

/** Which groups each tab shows, in order. */
const SECTIONS: Record<Exclude<Tab, 'done'>, { key: keyof TaskGroups; title: string }[]> = {
  today: [
    { key: 'overdue', title: 'Overdue' },
    { key: 'today', title: 'Today' },
  ],
  tomorrow: [{ key: 'tomorrow', title: 'Tomorrow' }],
  week: [
    { key: 'tomorrow', title: 'Tomorrow' },
    { key: 'week', title: 'Later this week' },
  ],
  all: [
    { key: 'overdue', title: 'Overdue' },
    { key: 'today', title: 'Today' },
    { key: 'tomorrow', title: 'Tomorrow' },
    { key: 'week', title: 'Later this week' },
    { key: 'noDate', title: 'No date' },
  ],
};

const EMPTY: Record<Exclude<Tab, 'done'>, string> = {
  today: 'Nothing for today. 🎉',
  tomorrow: 'Nothing for tomorrow.',
  week: 'Nothing in the next 7 days.',
  all: 'No open tasks. 🎉',
};

export default function Tasks() {
  const [tab, setTab] = useState<Tab>('today');
  const open = useApi<TaskGroups>(tab !== 'done' ? '/tasks' : null);
  const done = useApi<{ done: { at: string; task: AppTask }[] }>(tab === 'done' ? '/tasks?view=done' : null);
  const current = tab === 'done' ? done : open;

  const count = (t: Exclude<Tab, 'done'>) => (open.data ? SECTIONS[t].reduce((n, s) => n + open.data![s.key].length, 0) : null);

  return (
    <Screen title="Tasks" refreshing={current.refreshing} onRefresh={current.refresh} right={<Button title="＋ Task" small onPress={() => router.push('/task/new')} />}>
      <Row wrap>
        {TABS.map((t) => {
          const n = t.key !== 'done' ? count(t.key) : null;
          return <Chip key={t.key} text={n ? `${t.label} (${n})` : t.label} selected={tab === t.key} onPress={() => setTab(t.key)} />;
        })}
      </Row>

      {current.loading && !current.data ? <Loading /> : null}
      {current.error && !current.data ? <ErrorBox message={current.error} onRetry={current.refresh} /> : null}

      {tab !== 'done' && open.data
        ? (() => {
            const sections = SECTIONS[tab].filter((s) => open.data![s.key].length);
            if (!sections.length) return <Empty text={EMPTY[tab]} />;
            return sections.map((s) => (
              <Section key={s.key} title={`${s.title} (${open.data![s.key].length})`}>
                {open.data![s.key].map((t) => (
                  <TaskCard key={`${t.id}:${t.dueAt}:${t.status}`} task={t} />
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
    </Screen>
  );
}
