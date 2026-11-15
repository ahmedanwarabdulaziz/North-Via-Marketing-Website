import { router } from 'expo-router';
import { useState } from 'react';

import { TaskCard } from '@/components/task-card';
import { Button, Chip, Empty, ErrorBox, Loading, Row, Screen, Section, T } from '@/components/ui';
import { ago } from '@/lib/format';
import type { AppTask, TaskGroups } from '@/lib/types';
import { useApi } from '@/lib/use-api';

const GROUPS: { key: keyof TaskGroups; title: string }[] = [
  { key: 'overdue', title: 'Overdue' },
  { key: 'today', title: 'Today' },
  { key: 'tomorrow', title: 'Tomorrow' },
  { key: 'week', title: 'This week' },
  { key: 'noDate', title: 'No date' },
];

export default function Tasks() {
  const [view, setView] = useState<'open' | 'done'>('open');
  const open = useApi<TaskGroups>(view === 'open' ? '/tasks' : null);
  const done = useApi<{ done: { at: string; task: AppTask }[] }>(view === 'done' ? '/tasks?view=done' : null);
  const current = view === 'open' ? open : done;

  return (
    <Screen title="Tasks" refreshing={current.refreshing} onRefresh={current.refresh} right={<Button title="＋ Task" small onPress={() => router.push('/task/new')} />}>
      <Row>
        <Chip text="Open" selected={view === 'open'} onPress={() => setView('open')} />
        <Chip text="Done (7 days)" selected={view === 'done'} onPress={() => setView('done')} />
      </Row>
      {current.loading && !current.data ? <Loading /> : null}
      {current.error && !current.data ? <ErrorBox message={current.error} onRetry={current.refresh} /> : null}

      {view === 'open' && open.data
        ? (() => {
            const total = GROUPS.reduce((n, g) => n + open.data![g.key].length, 0);
            if (!total) return <Empty text="No open tasks. 🎉" />;
            return GROUPS.filter((g) => open.data![g.key].length).map((g) => (
              <Section key={g.key} title={`${g.title} (${open.data![g.key].length})`}>
                {open.data![g.key].map((t) => (
                  <TaskCard key={`${t.id}:${t.dueAt}:${t.status}`} task={t} />
                ))}
              </Section>
            ));
          })()
        : null}

      {view === 'done' && done.data
        ? done.data.done.length
          ? done.data.done.map((d) => (
              <Section key={`${d.task.id}-${d.at}`} title={`Done ${ago(d.at)} ago`}>
                <TaskCard task={d.task} />
              </Section>
            ))
          : <Empty text="Nothing done in the last 7 days." />
        : null}
      {view === 'open' ? <T variant="small" style={{ textAlign: 'center' }}>Pull down to refresh</T> : null}
    </Screen>
  );
}
