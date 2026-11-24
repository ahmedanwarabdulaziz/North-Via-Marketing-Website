import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { DesktopHome } from '@/components/desktop-home';
import { EmailCard } from '@/components/email-card';
import { useWideScreen } from '@/components/pc-sidebar';
import { isPc } from '@/lib/pc';
import { StoppedAdsBanner } from '@/components/marketing';
import { automationQuietFor, type ConnectionsData } from '@/lib/connections';
import { WebsiteRow } from '@/components/rows';
import { TaskCard } from '@/components/task-card';
import { Button, Card, Chip, ChipRow, Empty, ErrorBox, Loading, Row, Screen, Section, Stat, T } from '@/components/ui';
import { shareLink } from '@/lib/share-link';
import { radius, usePalette } from '@/lib/theme';
import type { HomeData, QuickLink } from '@/lib/types';
import { useApi } from '@/lib/use-api';

function greeting() {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Africa/Cairo' }).format(new Date()));
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}

export default function Home() {
  const p = usePalette();
  const { data, error, loading, refreshing, refresh, reload } = useApi<HomeData>('/home');
  const links = useApi<{ links: QuickLink[] }>('/links');
  const pinned = (links.data?.links ?? []).filter((l) => l.pinned);
  const health = useApi<ConnectionsData>('/connections');
  const quiet = automationQuietFor(health.data);
  const broken = health.data?.connections.filter((c) => !c.ok) ?? [];
  const wide = useWideScreen();

  // PC: its own layout (an Ask bar, number tiles, two columns).
  if (isPc && wide) {
    return (
      <DesktopHome
        greeting={greeting()}
        data={data}
        error={error}
        loading={loading}
        reload={reload}
        refresh={() => {
          refresh();
          void health.reload();
        }}
        pinned={pinned}
        health={health.data}
        quiet={quiet}
      />
    );
  }

  return (
    <Screen
      title={greeting()}
      subtitle="Here’s what needs you today"
      refreshing={refreshing}
      onRefresh={() => {
        refresh();
        void health.reload();
      }}>
      {/* Pages that aren't in the bottom bar: two rows of four. */}
      <Row wrap style={{ rowGap: 14 }}>
        <Shortcut icon="＋" label="Task" primary onPress={() => router.push('/task/new')} />
        <Shortcut icon="📚" label="Library" onPress={() => router.push('/library')} />
        <Shortcut icon="📈" label="Marketing" onPress={() => router.push('/marketing')} />
        <Shortcut icon="🛋" label="JL Comfort" onPress={() => router.push('/jl')} />
        <Shortcut icon="👥" label="Clients" onPress={() => router.push('/clients')} />
        <Shortcut icon="🔗" label="Links" onPress={() => router.push('/links')} />
        <Shortcut icon="⚙️" label="More" onPress={() => router.push('/more')} />
      </Row>
      {pinned.length ? (
        <ChipRow>
          {pinned.map((l) => (
            <Chip key={l.id} text={`📤 ${l.title}`} onPress={() => shareLink(l)} />
          ))}
        </ChipRow>
      ) : null}
      {loading && !data ? <Loading /> : null}
      {error && !data ? <ErrorBox message={error} onRetry={refresh} /> : null}
      {data ? (
        <>
          {(quiet !== null && quiet > 20) || broken.length ? (
            <Card tone="danger" onPress={() => router.push('/connections')} style={{ backgroundColor: p.dangerSoft }}>
              <T variant="heading" color={p.danger}>
                {quiet !== null && quiet > 20 ? `⛔ Automation quiet for ${quiet} min` : `🔌 ${broken.length} connection${broken.length === 1 ? '' : 's'} need${broken.length === 1 ? 's' : ''} you`}
              </T>
              {broken.slice(0, 3).map((c) => (
                <T key={c.id} variant="small" color={p.text}>{`${c.name}: ${c.problem}`}</T>
              ))}
              <T variant="small" color={p.text}>Tap to reconnect.</T>
            </Card>
          ) : null}
          <StoppedAdsBanner stopped={data.adsStopped ?? []} onPress={() => router.push('/marketing')} />
          {data.aiCredit ? (
            <Pressable
              onPress={() => router.push('/chat-log')}
              style={({ pressed }) => ({
                alignSelf: 'flex-start',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: radius.pill,
                backgroundColor: data.aiCredit!.low ? p.dangerSoft : p.brandSoft,
                opacity: pressed ? 0.6 : 1,
              })}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: data.aiCredit.low ? p.danger : p.brand }}>
                {`🤖 AI credit $${data.aiCredit.left.toFixed(2)}${data.aiCredit.low ? ' · low, top up' : ''}`}
              </Text>
            </Pressable>
          ) : null}
          <Row wrap gap={10}>
            <Stat label="Overdue" value={data.tasks.counts.overdue} tone={data.tasks.counts.overdue ? 'danger' : 'ok'} onPress={() => router.push('/tasks')} />
            <Stat label="Due today" value={data.tasks.counts.today} onPress={() => router.push('/tasks')} />
            <Stat label="Emails waiting" value={data.emails.waiting} tone={data.emails.urgent ? 'warn' : 'brand'} onPress={() => router.push('/inbox')} />
            <Stat
              label="Reviews waiting"
              value={data.reviews ? data.reviews.waiting : '–'}
              tone={data.reviews?.bad ? 'danger' : 'brand'}
              onPress={() => router.push('/reviews')}
            />
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
                <TaskCard key={`${t.id}:${t.dueAt}:${t.status}`} task={t} onChanged={reload} />
              ))}
              {data.tasks.counts.overdue > 5 ? <Button title="See all tasks" kind="outline" small onPress={() => router.push('/tasks')} /> : null}
            </Section>
          ) : null}

          <Section title={`Today (${data.tasks.counts.today})`}>
            {data.tasks.today.length ? data.tasks.today.map((t) => <TaskCard key={`${t.id}:${t.dueAt}:${t.status}`} task={t} onChanged={reload} />) : <Empty text="Nothing due today." />}
          </Section>

          <Section title={`Emails waiting (${data.emails.waiting})`} right={data.emails.urgent ? <T variant="small" color={p.danger}>{`${data.emails.urgent} urgent`}</T> : undefined}>
            {data.emails.latest.length ? data.emails.latest.map((e) => <EmailCard key={`${e.id}:${e.status}`} email={e} onChanged={reload} hideWhenHandled />) : <Empty text="Inbox is clear." />}
            {data.emails.waiting > data.emails.latest.length ? <Button title="Open inbox" kind="outline" small onPress={() => router.push('/inbox')} /> : null}
          </Section>

          {data.websites && !data.websites.down.length ? <T variant="small" style={{ textAlign: 'center' }}>{`🟢 All ${data.websites.total} websites are up`}</T> : null}
        </>
      ) : null}
    </Screen>
  );
}

/** A round icon with a small label under it, for pages outside the bottom bar. */
function Shortcut({ icon, label, onPress, primary }: { icon: string; label: string; onPress: () => void; primary?: boolean }) {
  const p = usePalette();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ alignItems: 'center', gap: 6, width: '25%', opacity: pressed ? 0.6 : 1 })}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: radius.lg,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: primary ? p.brand : p.card,
          borderWidth: primary ? 0 : 1,
          borderColor: p.border,
        }}>
        <Text style={{ fontSize: primary ? 28 : 24, color: primary ? p.onBrand : p.text, fontWeight: primary ? '700' : '400' }}>{icon}</Text>
      </View>
      <Text style={{ color: p.muted, fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}
