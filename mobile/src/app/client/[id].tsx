import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Linking } from 'react-native';

import { EmailCard } from '@/components/email-card';
import { WebsiteRow } from '@/components/rows';
import { TaskCard } from '@/components/task-card';
import { Button, Card, Empty, ErrorBox, Loading, Row, Screen, Section, T } from '@/components/ui';
import type { AppClient, AppEmail, AppTask, AppWebsite } from '@/lib/types';
import { useApi } from '@/lib/use-api';

interface ClientData {
  client: AppClient;
  tasks: AppTask[];
  websites: AppWebsite[];
  emails: AppEmail[];
}

const digits = (phone: string) => phone.replace(/[^\d]/g, '');

export default function ClientScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading, refreshing, refresh, reload } = useApi<ClientData>(`/clients/${id}`);

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorBox message={error} onRetry={refresh} />;
  if (!data) return null;
  const c = data.client;
  const links = Object.entries(c.links).filter(([, url]) => url) as [string, string][];

  return (
    <Screen padTop={false} refreshing={refreshing} onRefresh={refresh}>
      <Stack.Screen options={{ title: c.name }} />
      <Card>
        <T variant="title">{c.name}</T>
        {c.owner ? <T>{c.owner}</T> : null}
        {c.email ? <T variant="small" selectable>{c.email}</T> : null}
        {c.phone ? <T variant="small" selectable>{c.phone}</T> : null}
        <Row wrap>
          {c.phone ? <Button title="📞 Call" kind="soft" small onPress={() => Linking.openURL(`tel:${c.phone}`)} /> : null}
          {c.phone ? <Button title="💬 WhatsApp" kind="soft" tone="ok" small onPress={() => Linking.openURL(`https://wa.me/${digits(c.phone!)}`)} /> : null}
          {c.email ? <Button title="✉️ Email" kind="soft" small onPress={() => Linking.openURL(`mailto:${c.email}`)} /> : null}
          {c.website ? <Button title="🌐 Website" kind="soft" small onPress={() => Linking.openURL(c.website!)} /> : null}
        </Row>
        {links.length ? (
          <Row wrap>
            {links.map(([name, url]) => (
              <Button key={name} title={name[0].toUpperCase() + name.slice(1)} kind="outline" small onPress={() => Linking.openURL(url)} />
            ))}
          </Row>
        ) : null}
      </Card>

      <Section title={`Open tasks (${data.tasks.length})`} right={<Button title="＋ Task" small kind="soft" onPress={() => router.push('/task/new')} />}>
        {data.tasks.length ? data.tasks.map((t) => <TaskCard key={`${t.id}:${t.dueAt}:${t.status}`} task={t} onChanged={reload} />) : <Empty text="No open tasks." />}
      </Section>

      <Section title={`Websites (${data.websites.length})`}>
        {data.websites.length ? data.websites.map((s) => <WebsiteRow key={s.id ?? s.url} site={s} />) : <Empty text="No websites monitored." />}
      </Section>

      {data.emails.length ? (
        <Section title="Recent email">
          {data.emails.map((e) => (
            <EmailCard key={`${e.id}:${e.status}`} email={e} />
          ))}
        </Section>
      ) : null}
    </Screen>
  );
}
