import { router, type Href } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { EmailCard } from './email-card';
import { StoppedAdsBanner } from './marketing';
import { TaskCard } from './task-card';
import { Empty, ErrorBox, Loading } from './ui';
import { setPendingChat } from '@/lib/attachments';
import type { ConnectionsData } from '@/lib/connections';
import { shareLink } from '@/lib/share-link';
import { radius, space, usePalette, type Palette } from '@/lib/theme';
import type { HomeData, QuickLink } from '@/lib/types';

// The Home page on a PC (web, wide window): an "Ask Anwarz" bar to act fast, the numbers that matter
// as tiles, then two columns: tasks on the left; emails, websites and the rest on the right.
// The phone keeps its own Home (src/app/(tabs)/index.tsx).

type Hover = { pressed: boolean; hovered?: boolean };

function Panel({ title, count, right, children, p }: { title: string; count?: number; right?: ReactNode; children: ReactNode; p: Palette }) {
  return (
    <View style={{ backgroundColor: p.card, borderRadius: 16, borderWidth: 1, borderColor: p.border, padding: space.lg, gap: space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Text style={{ flex: 1, color: p.text, fontSize: 16, fontWeight: '800' }}>
          {title}
          {count !== undefined ? <Text style={{ color: p.muted, fontWeight: '600' }}>{`  ${count}`}</Text> : null}
        </Text>
        {right}
      </View>
      {children}
    </View>
  );
}

function LinkButton({ label, href, p }: { label: string; href: string; p: Palette }) {
  return (
    <Pressable onPress={() => router.push(href as Href)} style={({ hovered }: Hover) => ({ paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: hovered ? p.brandSoft : 'transparent' })}>
      <Text style={{ color: p.brand, fontWeight: '700', fontSize: 13 }}>{`${label} ›`}</Text>
    </Pressable>
  );
}

function Kpi({ label, value, icon, tone, href, p }: { label: string; value: number | string; icon: string; tone: string; href?: string; p: Palette }) {
  return (
    <Pressable
      disabled={!href}
      onPress={() => href && router.push(href as Href)}
      style={({ hovered, pressed }: Hover) => ({
        flex: 1,
        minWidth: 150,
        backgroundColor: p.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: hovered ? tone : p.border,
        padding: space.lg,
        gap: 6,
        opacity: pressed ? 0.8 : 1,
        transform: [{ translateY: hovered ? -2 : 0 }],
        boxShadow: hovered ? '0 8px 24px rgba(0,0,0,0.08)' : 'none',
      })}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: `${tone}1F`, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 15 }}>{icon}</Text>
        </View>
        <Text style={{ color: p.muted, fontSize: 13, fontWeight: '600' }}>{label}</Text>
      </View>
      <Text style={{ color: tone, fontSize: 32, fontWeight: '800', letterSpacing: -0.5 }}>{value}</Text>
    </Pressable>
  );
}

/** Type a question or an instruction; Enter sends it to the chat, which answers right away. */
function AskBar({ p }: { p: Palette }) {
  const [text, setText] = useState('');
  const go = () => {
    const q = text.trim();
    if (!q) return;
    setPendingChat([], q, true);
    setText('');
    router.push('/chat' as Href);
  };
  const action = (label: string, onPress: () => void, primary?: boolean) => (
    <Pressable
      onPress={onPress}
      style={({ hovered, pressed }: Hover) => ({
        paddingHorizontal: 16,
        paddingVertical: 11,
        borderRadius: 12,
        backgroundColor: primary ? (hovered ? '#1e3473' : p.brand) : hovered ? p.brandSoft : p.card,
        borderWidth: primary ? 0 : 1,
        borderColor: p.border,
        opacity: pressed ? 0.8 : 1,
      })}>
      <Text style={{ color: primary ? p.onBrand : p.text, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: p.card, borderRadius: 14, borderWidth: 1.5, borderColor: p.brand, paddingLeft: 14 }}>
        <Text style={{ fontSize: 16 }}>✨</Text>
        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={go}
          placeholder="Ask Anwarz or tell it what to do: “reply to Sanad”, “pause the bakery ads”, “what’s overdue?” — press Enter"
          placeholderTextColor={p.muted}
          style={{ flex: 1, paddingHorizontal: 10, paddingVertical: 13, fontSize: 15, color: p.text, outlineStyle: 'none' } as object}
        />
        {text.trim() ? (
          <Pressable onPress={go} style={{ paddingHorizontal: 14 }}>
            <Text style={{ color: p.brand, fontWeight: '800' }}>Ask ↵</Text>
          </Pressable>
        ) : null}
      </View>
      {action('＋ New task', () => router.push('/task/new' as Href), true)}
      {action('💬 Chat', () => router.push('/chat' as Href))}
    </View>
  );
}

export function DesktopHome({
  greeting,
  data,
  error,
  loading,
  reload,
  refresh,
  pinned,
  health,
  quiet,
}: {
  greeting: string;
  data: HomeData | null | undefined;
  error: string | null | undefined;
  loading: boolean;
  reload: () => void;
  refresh: () => void;
  pinned: QuickLink[];
  health: ConnectionsData | null | undefined;
  quiet: number | null;
}) {
  const p = usePalette();
  const broken = health?.connections.filter((c) => !c.ok) ?? [];
  const today = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Cairo' }).format(new Date());

  return (
    <ScrollView style={{ flex: 1, backgroundColor: p.bg }} contentContainerStyle={{ padding: space.xl, gap: space.lg, paddingBottom: 48 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: p.muted, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 }}>{today}</Text>
          <Text style={{ color: p.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.5 }}>{`${greeting}, Ahmed`}</Text>
        </View>
        <Pressable onPress={refresh} style={({ hovered }: Hover) => ({ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: hovered ? p.brandSoft : 'transparent' })}>
          <Text style={{ color: p.brand, fontWeight: '700' }}>↻ Refresh</Text>
        </Pressable>
      </View>

      <AskBar p={p} />

      {loading && !data ? <Loading /> : null}
      {error && !data ? <ErrorBox message={error} onRetry={refresh} /> : null}

      {data ? (
        <>
          {(quiet !== null && quiet > 20) || broken.length ? (
            <Pressable onPress={() => router.push('/connections' as Href)} style={{ backgroundColor: p.dangerSoft, borderRadius: 14, padding: space.md, borderWidth: 1, borderColor: p.danger }}>
              <Text style={{ color: p.danger, fontWeight: '800' }}>
                {quiet !== null && quiet > 20 ? `⛔ Automation quiet for ${quiet} min` : `🔌 ${broken.length} connection${broken.length === 1 ? '' : 's'} need${broken.length === 1 ? 's' : ''} you`}
                <Text style={{ color: p.text, fontWeight: '500' }}>{`   ${broken.slice(0, 3).map((c) => `${c.name}: ${c.problem}`).join(' · ')}  — click to reconnect`}</Text>
              </Text>
            </Pressable>
          ) : null}
          <StoppedAdsBanner stopped={data.adsStopped ?? []} onPress={() => router.push('/marketing' as Href)} />

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
            <Kpi p={p} icon="⏰" label="Overdue" value={data.tasks.counts.overdue} tone={data.tasks.counts.overdue ? p.danger : p.ok} href="/tasks" />
            <Kpi p={p} icon="📅" label="Due today" value={data.tasks.counts.today} tone={p.brand} href="/tasks" />
            <Kpi p={p} icon="📧" label="Emails waiting" value={data.emails.waiting} tone={data.emails.urgent ? p.warn : p.brand} href="/inbox" />
            <Kpi p={p} icon="⭐" label="Reviews waiting" value={data.reviews ? data.reviews.waiting : '–'} tone={data.reviews?.bad ? p.danger : p.brand} href="/reviews" />
            <Kpi p={p} icon="🌐" label="Sites down" value={data.websites ? data.websites.down.length : '–'} tone={data.websites?.down.length ? p.danger : p.ok} href="/marketing" />
          </View>

          <View style={{ flexDirection: 'row', gap: space.lg, alignItems: 'flex-start' }}>
            <View style={{ flex: 3, gap: space.lg, minWidth: 0 }}>
              {data.tasks.overdue.length ? (
                <Panel p={p} title="Overdue" count={data.tasks.counts.overdue} right={<LinkButton p={p} label="All tasks" href="/tasks" />}>
                  {data.tasks.overdue.slice(0, 6).map((t) => (
                    <TaskCard key={`${t.id}:${t.dueAt}:${t.status}`} task={t} onChanged={reload} />
                  ))}
                </Panel>
              ) : null}
              <Panel p={p} title="Today" count={data.tasks.counts.today} right={<LinkButton p={p} label="All tasks" href="/tasks" />}>
                {data.tasks.today.length ? data.tasks.today.map((t) => <TaskCard key={`${t.id}:${t.dueAt}:${t.status}`} task={t} onChanged={reload} />) : <Empty text="Nothing due today. 🎉" />}
              </Panel>
            </View>

            <View style={{ flex: 2, gap: space.lg, minWidth: 0 }}>
              <Panel
                p={p}
                title="Emails waiting"
                count={data.emails.waiting}
                right={
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {data.emails.urgent ? <Text style={{ color: p.danger, fontWeight: '700', fontSize: 12 }}>{`${data.emails.urgent} urgent`}</Text> : null}
                    <LinkButton p={p} label="Inbox" href="/inbox" />
                  </View>
                }>
                {data.emails.latest.length ? data.emails.latest.map((e) => <EmailCard key={`${e.id}:${e.status}`} email={e} onChanged={reload} hideWhenHandled />) : <Empty text="Inbox is clear." />}
              </Panel>

              <Panel p={p} title="Websites" right={<LinkButton p={p} label="Marketing" href="/marketing" />}>
                {data.websites ? (
                  <>
                    {data.websites.down.length ? (
                      data.websites.down.map((s) => (
                        <Text key={s.id ?? s.url} style={{ color: p.danger, fontWeight: '600' }}>{`🔴 ${s.clientName ? `${s.clientName} · ` : ''}${s.url}`}</Text>
                      ))
                    ) : (
                      <Text style={{ color: p.ok, fontWeight: '600' }}>{`🟢 All ${data.websites.total} websites are up`}</Text>
                    )}
                    {data.websites.sslSoon.map((s) => (
                      <Text key={`ssl:${s.id ?? s.url}`} style={{ color: p.warn, fontSize: 13 }}>{`🔒 SSL ends ${s.sslExpiresAt?.slice(0, 10) ?? ''} · ${s.url}`}</Text>
                    ))}
                  </>
                ) : (
                  <Text style={{ color: p.muted }}>Not checked yet.</Text>
                )}
              </Panel>

              {data.aiCredit || pinned.length ? (
                <Panel p={p} title="Shortcuts">
                  {data.aiCredit ? (
                    <Pressable onPress={() => router.push('/chat-log' as Href)}>
                      <Text style={{ color: data.aiCredit.low ? p.danger : p.text, fontWeight: '600' }}>
                        {`🤖 AI credit $${data.aiCredit.left.toFixed(2)}${data.aiCredit.low ? ' · low, top up' : ''}`}
                      </Text>
                    </Pressable>
                  ) : null}
                  {pinned.length ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
                      {pinned.map((l) => (
                        <Pressable
                          key={l.id}
                          onPress={() => shareLink(l)}
                          style={({ hovered }: Hover) => ({ paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: hovered ? p.brand : p.brandSoft })}>
                          {({ hovered }: Hover) => <Text style={{ color: hovered ? p.onBrand : p.brand, fontWeight: '700', fontSize: 13 }}>{`📤 ${l.title}`}</Text>}
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </Panel>
              ) : null}
            </View>
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}
