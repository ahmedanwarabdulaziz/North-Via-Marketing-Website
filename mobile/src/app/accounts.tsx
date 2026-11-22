import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useMemo, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { ClientPicker, confirmAsk } from '@/components/client-picker';
import { Button, Card, Chip, ChipRow, Empty, ErrorBox, Input, Loading, Pill, Row, Screen, Section, T } from '@/components/ui';
import { API_URL, api } from '@/lib/api';
import { googleNativeCode, GOOGLE_SCOPES, SignInCancelled } from '@/lib/native-signin';
import { radius, space, usePalette } from '@/lib/theme';
import { useApi } from '@/lib/use-api';

// Google & Ads (More → Connections, PC sidebar): Google Business locations, Google Ads and Facebook
// ad accounts, GA4 properties and Search Console sites, and the client each belongs to. Same data
// and rules as the website's Admin → Google & Ads.

type LinkKind = 'gbp' | 'google_ads' | 'meta_ads' | 'ga4' | 'search_console';
interface LinkItem {
  id: string;
  name: string;
  detail: string | null;
  clientId: string | null;
  locked: string | null;
}
interface LinkSection {
  kind: LinkKind;
  title: string;
  connected: boolean;
  account: string | null;
  onePerClient: boolean;
  items: LinkItem[];
  error: string | null;
}
interface AccountsData {
  sections: LinkSection[];
  clients: { id: string; name: string }[];
}

type Filter = 'unassigned' | 'assigned' | 'all';

const ICON: Record<LinkKind, string> = { gbp: '📍', google_ads: '📊', meta_ads: '📣', ga4: '📈', search_console: '🔎' };
const SHORT: Record<LinkKind, string> = { gbp: 'Business', google_ads: 'Google Ads', meta_ads: 'Facebook Ads', ga4: 'Analytics', search_console: 'Search Console' };
const WHAT: Record<LinkKind, string> = {
  gbp: 'Reviews are checked and answered for linked locations.',
  google_ads: 'Spend, clicks and the hourly ads watch use linked accounts.',
  meta_ads: 'Facebook Ads numbers and alerts use linked ad accounts.',
  ga4: 'Visitors on the client page come from the linked property. One per client.',
  search_console: 'Google search clicks come from the linked site. One per client.',
};

export default function Accounts() {
  const p = usePalette();
  const { data, setData, error, loading, refreshing, refresh, reload } = useApi<AccountsData>('/accounts');
  const [tab, setTab] = useState<LinkKind | null>(null);
  const [filters, setFilters] = useState<Partial<Record<LinkKind, Filter>>>({});
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<'connect' | 'refresh' | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [picking, setPicking] = useState<LinkItem | null>(null);

  const clientName = useMemo(() => new Map((data?.clients ?? []).map((c) => [c.id, c.name])), [data]);

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorBox message={error} onRetry={refresh} />;
  if (!data) return null;

  const free = (s: LinkSection) => s.items.filter((i) => !i.clientId && !i.locked).length;
  const active: LinkKind = tab ?? data.sections.find((s) => free(s))?.kind ?? 'gbp';
  const section = data.sections.find((s) => s.kind === active)!;
  const counts = { unassigned: free(section), assigned: section.items.filter((i) => i.clientId).length, all: section.items.length };
  const filter: Filter = filters[active] ?? (counts.unassigned ? 'unassigned' : 'all');
  const q = query.trim().toLowerCase();
  const shown = section.items.filter((i) => {
    if (filter === 'unassigned' && (i.clientId || i.locked)) return false;
    if (filter === 'assigned' && !i.clientId) return false;
    return !q || [i.name, i.detail, i.clientId ? clientName.get(i.clientId) : ''].some((v) => v?.toLowerCase().includes(q));
  });

  /** Native Google sign-in when this build has it; the browser otherwise. Analytics is on the website. */
  const connect = async () => {
    if (active === 'meta_ads') return router.push('/social');
    if (active === 'ga4' || active === 'search_console') return void WebBrowser.openBrowserAsync(`${API_URL}/admin/google?tab=${active}`);
    const kind = active === 'gbp' ? 'gbp' : 'google_ads';
    setBusy('connect');
    try {
      const code = await googleNativeCode(GOOGLE_SCOPES[kind]);
      if (code) {
        const done = await api<{ message: string }>('/connect/native', { body: { provider: 'google', kind, serverAuthCode: code }, timeoutMs: 60_000 });
        Alert.alert('Connected', done.message);
      } else {
        const { url } = await api<{ url: string }>('/connections', { body: { kind } });
        await WebBrowser.openBrowserAsync(url);
      }
      await reload();
    } catch (e) {
      if (!(e instanceof SignInCancelled)) Alert.alert('Not connected', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const refreshLists = async () => {
    setBusy('refresh');
    try {
      setData(await api<AccountsData>('/accounts?refresh=1', { timeoutMs: 60_000 }));
    } catch (e) {
      Alert.alert('Couldn’t refresh', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const save = async (item: LinkItem, clientId: string | null) => {
    setSaving(item.id);
    try {
      setData(await api<AccountsData>('/accounts', { body: { kind: active, id: item.id, clientId }, timeoutMs: 60_000 }));
    } catch (e) {
      Alert.alert('Not saved', e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(null);
    }
  };

  const pick = (item: LinkItem, clientId: string | null) => {
    setPicking(null);
    if (clientId === item.clientId) return;
    const lines: string[] = [];
    if (item.clientId && clientId) lines.push(`Move ${item.name} from ${clientName.get(item.clientId) ?? 'its client'} to ${clientName.get(clientId)}?`);
    if (clientId && section.onePerClient) {
      const current = section.items.find((i) => i.clientId === clientId && i.id !== item.id);
      if (current) lines.push(`${clientName.get(clientId)} already uses ${current.name}; it will be replaced.`);
    }
    if (!lines.length) return void save(item, clientId);
    confirmAsk('Change the link?', lines.join('\n\n'), 'Yes', () => void save(item, clientId));
  };

  return (
    <Screen padTop={false} refreshing={refreshing} onRefresh={refresh}>
      <ChipRow>
        {data.sections.map((s) => {
          const waiting = free(s);
          return <Chip key={s.kind} text={`${ICON[s.kind]} ${SHORT[s.kind]}${waiting ? ` · ${waiting}` : ''}`} selected={s.kind === active} onPress={() => { setTab(s.kind); setQuery(''); }} />;
        })}
      </ChipRow>

      <Card tone={section.error ? 'danger' : !section.connected ? 'warn' : undefined}>
        <Row>
          <View style={{ width: 44, height: 44, borderRadius: radius.md, backgroundColor: p.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 22 }}>{ICON[active]}</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <T variant="heading">{section.title}</T>
            <T variant="small">{section.connected ? `${section.account ? `${section.account} · ` : ''}${section.items.length} found` : 'Not connected yet'}</T>
          </View>
          <Pill text={!section.connected ? 'Not connected' : section.error ? 'Needs you' : 'Connected'} tone={!section.connected ? 'warn' : section.error ? 'danger' : 'ok'} />
        </Row>
        <T variant="small">{WHAT[active]}</T>
        {section.error ? <T variant="small" color={p.danger}>{section.error}</T> : null}
        <Row wrap>
          <Button
            title={
              active === 'meta_ads'
                ? '📣 Facebook login ›'
                : active === 'ga4' || active === 'search_console'
                ? `🌐 ${section.connected ? 'Reconnect' : 'Connect'} on the website`
                : section.connected
                ? '🔄 Reconnect'
                : '🔗 Connect Google'
            }
            small
            kind={section.connected && !section.error ? 'outline' : 'primary'}
            busy={busy === 'connect'}
            disabled={busy !== null}
            onPress={() => void connect()}
          />
          {(active === 'google_ads' || active === 'meta_ads') && section.connected ? (
            <Button title="↻ Refresh list" small kind="soft" busy={busy === 'refresh'} disabled={busy !== null} onPress={() => void refreshLists()} />
          ) : null}
        </Row>
      </Card>

      <Section title={SHORT[active]}>
        <Input value={query} onChangeText={setQuery} placeholder="Search or find a client" />
        <ChipRow>
          <Chip text={`Needs a client ${counts.unassigned}`} selected={filter === 'unassigned'} onPress={() => setFilters((f) => ({ ...f, [active]: 'unassigned' }))} />
          <Chip text={`Linked ${counts.assigned}`} selected={filter === 'assigned'} onPress={() => setFilters((f) => ({ ...f, [active]: 'assigned' }))} />
          <Chip text={`All ${counts.all}`} selected={filter === 'all'} onPress={() => setFilters((f) => ({ ...f, [active]: 'all' }))} />
        </ChipRow>

        {shown.length ? null : (
          <Empty
            text={
              !section.connected
                ? 'Connect above to see everything this login can reach.'
                : !section.items.length
                ? 'Nothing found on this login.'
                : filter === 'unassigned' && !q
                ? 'Everything is linked to a client 🎉'
                : 'Nothing matches.'
            }
          />
        )}
        {shown.map((item) => (
          <Card key={item.id}>
            <Text style={{ color: p.text, fontWeight: '700', fontSize: 15, textAlign: 'left' }}>{item.name}</Text>
            {item.detail ? <Text style={{ color: p.muted, fontSize: 12, textAlign: 'left' }}>{item.detail}</Text> : null}
            {item.locked ? <Text style={{ color: p.muted, fontSize: 12, textAlign: 'left' }}>{`🔒 ${item.locked}`}</Text> : null}
            <Pressable
              disabled={saving !== null || Boolean(item.locked)}
              onPress={() => setPicking(item)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.sm,
                paddingVertical: space.sm,
                paddingHorizontal: space.md,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: item.clientId ? p.border : p.warn,
                backgroundColor: item.clientId ? 'transparent' : p.warnSoft,
                opacity: pressed || saving === item.id ? 0.6 : 1,
              })}>
              <Text style={{ flex: 1, color: item.clientId ? p.text : p.warn, fontWeight: '600', textAlign: 'left' }}>
                {saving === item.id ? 'Saving…' : item.clientId ? `👤 ${clientName.get(item.clientId) ?? 'Client'}` : 'Choose a client'}
              </Text>
              {item.locked ? null : <Text style={{ color: p.brand, fontWeight: '700' }}>Change ›</Text>}
            </Pressable>
          </Card>
        ))}
      </Section>

      <ClientPicker
        visible={picking !== null}
        title={picking ? `Client for ${picking.name}` : ''}
        clients={data.clients}
        current={picking?.clientId ?? null}
        onPick={(clientId) => picking && pick(picking, clientId)}
        onClose={() => setPicking(null)}
      />
    </Screen>
  );
}
