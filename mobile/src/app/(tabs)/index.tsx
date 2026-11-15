import { router } from 'expo-router';

import { EmailRow, WebsiteRow } from '@/components/rows';
import { TaskCard } from '@/components/task-card';
import { Button, Card, Empty, ErrorBox, Loading, Row, Screen, Section, Stat, T } from '@/components/ui';
import { usePalette } from '@/lib/theme';
import type { HomeData } from '@/lib/types';
import { useApi } from '@/lib/use-api';

function greeting() {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Africa/Cairo' }).format(new Date()));
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}

export default function Home() {
  const p = usePalette();
  const { data, error, loading, refreshing, refresh } = useApi<HomeData>('/home');

  return (
    <Screen
      title={greeting()}
      subtitle="Here’s what needs you today"
      refreshing={refreshing}
      onRefresh={refresh}
      right={<Button title="＋ Task" small onPress={() => router.push('/task/new')} />}>
      {loading && !data ? <Loading /> : null}
      {error && !data ? <ErrorBox message={error} onRetry={refresh} /> : null}
      {data ? (
        <>
          <Row wrap gap={10}>
            <Stat label="Overdue" value={data.tasks.counts.overdue} tone={data.tasks.counts.overdue ? 'danger' : 'ok'} onPress={() => router.push('/tasks')} />
            <Stat label="Due today" value={data.tasks.counts.today} onPress={() => router.push('/tasks')} />
            <Stat label="Emails waiting" value={data.emails.waiting} tone={data.emails.urgent ? 'warn' : 'brand'} onPress={() => router.push('/inbox')} />
            <Stat
              label="Sites down"
              value={data.websites ? data.websites.down.length : '–'}
              tone={data.websites?.down.length ? 'danger' : 'ok'}
            />
          </Row>

          {data.websites?.down.length ? (
            <Section title="Websites down">
              {data.websites.down.map((s) => (
                <WebsiteRow key={s.id ?? s.url} site={s} />
              ))}
            </Section>
          ) : null}

          {data.websites?.sslSoon.length ? (
            <Card tone="warn">
              <T variant="heading" color={p.warn}>
                SSL expiring soon
              </T>
              {data.websites.sslSoon.map((s) => (
                <T key={s.id ?? s.url} variant="small">{`${s.clientName ?? ''} · ${s.url} · ${s.sslExpiresAt?.slice(0, 10) ?? ''}`}</T>
              ))}
            </Card>
          ) : null}

          {data.tasks.overdue.length ? (
            <Section title={`Overdue (${data.tasks.counts.overdue})`}>
              {data.tasks.overdue.slice(0, 5).map((t) => (
                <TaskCard key={`${t.id}:${t.dueAt}:${t.status}`} task={t} />
              ))}
              {data.tasks.counts.overdue > 5 ? <Button title="See all tasks" kind="outline" small onPress={() => router.push('/tasks')} /> : null}
            </Section>
          ) : null}

          <Section title={`Today (${data.tasks.counts.today})`}>
            {data.tasks.today.length ? data.tasks.today.map((t) => <TaskCard key={`${t.id}:${t.dueAt}:${t.status}`} task={t} />) : <Empty text="Nothing due today." />}
          </Section>

          <Section title={`Emails waiting (${data.emails.waiting})`} right={data.emails.urgent ? <T variant="small" color={p.danger}>{`${data.emails.urgent} urgent`}</T> : undefined}>
            {data.emails.latest.length ? data.emails.latest.map((e) => <EmailRow key={e.id} email={e} />) : <Empty text="Inbox is clear." />}
            {data.emails.waiting > data.emails.latest.length ? <Button title="Open inbox" kind="outline" small onPress={() => router.push('/inbox')} /> : null}
          </Section>

          {data.websites && !data.websites.down.length ? <T variant="small" style={{ textAlign: 'center' }}>{`🟢 All ${data.websites.total} websites are up`}</T> : null}
        </>
      ) : null}
    </Screen>
  );
}
