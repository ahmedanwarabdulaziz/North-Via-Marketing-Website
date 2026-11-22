import * as WebBrowser from 'expo-web-browser';
import { useMemo, useState } from 'react';
import { Alert, Image, Linking, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { Button, Card, Chip, ChipRow, Empty, ErrorBox, Input, Loading, Pill, Row, Screen, Section, Stat, T } from '@/components/ui';
import { api } from '@/lib/api';
import { facebookNativeLogin, SignInCancelled } from '@/lib/native-signin';
import { radius, space, usePalette } from '@/lib/theme';
import { useApi } from '@/lib/use-api';

// Facebook & Instagram (More → Connections, PC sidebar): your Facebook login, every Page and
// Instagram account it can manage, and which client each belongs to. Same data and rules as the
// website's Admin → Facebook & Instagram.

interface ConnectionRow {
  id: string;
  via: 'admin' | 'client_link';
  userName: string;
  clientName: string | null;
  status: 'connected' | 'error';
  lastError: string | null;
  connectedAt: string;
  updatedAt: string;
  missingScopes: string[];
  pages: number;
}
interface PageRow {
  id: string;
  pageName: string;
  igUsername: string | null;
  clientId: string | null;
  source: string;
  lastError: string | null;
}
interface SocialData {
  configured: boolean;
  connections: ConnectionRow[];
  pages: PageRow[];
  clients: { id: string; name: string }[];
}

type Filter = 'unassigned' | 'assigned' | 'issues' | 'all';
const day = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

function Avatar({ id, name }: { id: string; name: string }) {
  const p = usePalette();
  const [failed, setFailed] = useState(false);
  const box = { width: 44, height: 44, borderRadius: radius.md };
  if (failed)
    return (
      <View style={[box, { backgroundColor: p.brandSoft, alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: p.brand, fontWeight: '700', fontSize: 18 }}>{name.slice(0, 1).toUpperCase()}</Text>
      </View>
    );
  return <Image source={{ uri: `https://graph.facebook.com/${id}/picture?type=square&width=88&height=88` }} style={[box, { backgroundColor: p.border }]} onError={() => setFailed(true)} />;
}

export default function Social() {
  const p = usePalette();
  const { data, setData, error, loading, refreshing, refresh, reload } = useApi<SocialData>('/social');
  const [filter, setFilter] = useState<Filter | null>(null);
  const [query, setQuery] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [picking, setPicking] = useState<PageRow | null>(null);
  const [pickQuery, setPickQuery] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  const clientName = useMemo(() => new Map((data?.clients ?? []).map((c) => [c.id, c.name])), [data]);

  /** Native Facebook login in 0.7.0+ builds; the browser sign-in otherwise (PC, Expo Go). */
  const connect = async () => {
    setConnecting(true);
    try {
      const token = await facebookNativeLogin();
      if (token) {
        const done = await api<{ message: string }>('/connect/native', { body: { provider: 'meta', accessToken: token }, timeoutMs: 60_000 });
        Alert.alert('Connected', done.message);
      } else {
        const { url } = await api<{ url: string }>('/connections', { body: { kind: 'meta' } });
        await WebBrowser.openBrowserAsync(url);
      }
      await reload();
    } catch (e) {
      if (!(e instanceof SignInCancelled)) Alert.alert('Not connected', e instanceof Error ? e.message : String(e));
    } finally {
      setConnecting(false);
    }
  };

  const assign = async (page: PageRow, clientId: string | null) => {
    setPicking(null);
    setPickQuery('');
    if (clientId === page.clientId) return;
    setSaving(page.id);
    try {
      setData(await api<SocialData>('/social', { body: { accountId: page.id, clientId }, timeoutMs: 30_000 }));
    } catch (e) {
      Alert.alert('Not saved', e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(null);
    }
  };

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorBox message={error} onRetry={refresh} />;
  if (!data) return null;

  const mine = data.connections.find((c) => c.via === 'admin');
  const others = data.connections.filter((c) => c.via === 'client_link');
  const counts: Record<Filter, number> = {
    unassigned: data.pages.filter((x) => !x.clientId).length,
    assigned: data.pages.filter((x) => x.clientId).length,
    issues: data.pages.filter((x) => x.lastError).length,
    all: data.pages.length,
  };
  const active: Filter = filter ?? (counts.unassigned ? 'unassigned' : 'all');
  const q = query.trim().toLowerCase();
  const shown = data.pages.filter((x) => {
    if (active === 'unassigned' && x.clientId) return false;
    if (active === 'assigned' && !x.clientId) return false;
    if (active === 'issues' && !x.lastError) return false;
    return !q || [x.pageName, x.igUsername, x.clientId ? clientName.get(x.clientId) : ''].some((v) => v?.toLowerCase().includes(q));
  });
  const pickList = data.clients.filter((c) => !pickQuery.trim() || c.name.toLowerCase().includes(pickQuery.trim().toLowerCase()));

  const confirmMove = (page: PageRow, clientId: string | null) => {
    if (!page.clientId || !clientId || clientId === page.clientId) return void assign(page, clientId);
    const text = `Move ${page.pageName} from ${clientName.get(page.clientId) ?? 'its client'} to ${clientName.get(clientId)}?`;
    // Alert buttons don't work on the PC (web) version.
    if (Platform.OS === 'web') {
      if (window.confirm(text)) void assign(page, clientId);
      else setPicking(null);
      return;
    }
    Alert.alert('Move this Page?', text, [
      { text: 'Cancel', style: 'cancel', onPress: () => setPicking(null) },
      { text: 'Move', onPress: () => void assign(page, clientId) },
    ]);
  };

  return (
    <Screen padTop={false} refreshing={refreshing} onRefresh={refresh}>
      {/* Your Facebook login */}
      <Card tone={mine?.status === 'error' ? 'danger' : !mine ? 'warn' : undefined}>
        <Row>
          <View style={{ width: 48, height: 48, borderRadius: radius.md, backgroundColor: '#1877F2', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 26 }}>f</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <T variant="heading">Your Facebook account</T>
            <T variant="small">{mine ? `${mine.userName} · ${plural(mine.pages, 'Page')}` : 'Not connected yet'}</T>
          </View>
          <Pill text={!mine ? 'Not connected' : mine.status === 'error' ? 'Reconnect' : 'Connected'} tone={!mine ? 'warn' : mine.status === 'error' ? 'danger' : 'ok'} />
        </Row>
        <T variant="small">
          {mine
            ? `Connected ${day(mine.connectedAt)} · refreshed ${day(mine.updatedAt)}`
            : 'Sign in with the Facebook account that manages your clients’ Pages. Every Page it can manage, and the Instagram linked to it, appears below.'}
        </T>
        {mine?.lastError ? <T variant="small" color={p.danger}>{mine.lastError}</T> : null}
        {mine && mine.missingScopes.length ? (
          <T variant="small" color={p.warn}>{`⚠️ Missing permissions: ${mine.missingScopes.join(', ')}. Reconnect and allow everything.`}</T>
        ) : null}
        {!data.configured ? <T variant="small" color={p.danger}>Facebook isn’t set up on the server (META_APP_ID / META_APP_SECRET).</T> : null}
        <Button
          title={mine ? '🔄 Reconnect / add Pages' : '🔗 Connect Facebook'}
          kind={mine && mine.status !== 'error' ? 'outline' : 'primary'}
          busy={connecting}
          disabled={!data.configured}
          onPress={() => void connect()}
        />
      </Card>

      <Row wrap>
        <Stat label="Pages" value={counts.all} />
        <Stat label="Instagram" value={data.pages.filter((x) => x.igUsername).length} />
        <Stat label="Linked" value={counts.assigned} tone="ok" />
        <Stat label="Need a client" value={counts.unassigned} tone={counts.unassigned ? 'warn' : 'ok'} onPress={() => setFilter('unassigned')} />
      </Row>

      {others.length ? (
        <Section title="Clients’ own logins">
          {others.map((c) => (
            <Card key={c.id} tone={c.status === 'error' ? 'danger' : undefined}>
              <T style={{ fontWeight: '700' }}>{c.clientName ?? 'Client'}</T>
              <T variant="small">{`${c.userName} · ${plural(c.pages, 'Page')} · ${day(c.connectedAt)}`}</T>
              {c.lastError ? <T variant="small" color={p.danger}>{c.lastError}</T> : null}
            </Card>
          ))}
        </Section>
      ) : null}

      <Section title="Pages & Instagram">
        <Input value={query} onChangeText={setQuery} placeholder="Search Pages or clients" />
        <ChipRow>
          <Chip text={`Needs a client ${counts.unassigned}`} selected={active === 'unassigned'} onPress={() => setFilter('unassigned')} />
          <Chip text={`Linked ${counts.assigned}`} selected={active === 'assigned'} onPress={() => setFilter('assigned')} />
          <Chip text={`Problems ${counts.issues}`} selected={active === 'issues'} onPress={() => setFilter('issues')} />
          <Chip text={`All ${counts.all}`} selected={active === 'all'} onPress={() => setFilter('all')} />
        </ChipRow>

        {shown.length ? null : (
          <Empty text={!data.pages.length ? 'No Pages yet. Connect Facebook above and allow access to your Pages.' : active === 'unassigned' && !q ? 'Every Page is linked to a client 🎉' : 'Nothing matches.'} />
        )}
        {shown.map((x) => (
          <Card key={x.id} tone={x.lastError ? 'danger' : undefined}>
            <Row>
              <Avatar id={x.id} name={x.pageName} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: p.text, fontWeight: '700', fontSize: 15 }} onPress={() => void Linking.openURL(`https://facebook.com/${x.id}`)}>
                  {x.pageName}
                </Text>
                <Text
                  style={{ color: x.igUsername ? p.muted : p.muted, fontSize: 12, opacity: x.igUsername ? 1 : 0.7 }}
                  onPress={x.igUsername ? () => void Linking.openURL(`https://instagram.com/${x.igUsername}`) : undefined}>
                  {x.igUsername ? `📸 @${x.igUsername}` : '📸 No Instagram linked'}
                </Text>
                <Text style={{ color: p.muted, fontSize: 11 }}>{x.source}</Text>
              </View>
            </Row>
            {x.lastError ? <T variant="small" color={p.danger}>{`⚠️ ${x.lastError}`}</T> : null}
            <Pressable
              disabled={saving !== null}
              onPress={() => setPicking(x)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.sm,
                paddingVertical: space.sm,
                paddingHorizontal: space.md,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: x.clientId ? p.border : p.warn,
                backgroundColor: x.clientId ? 'transparent' : p.warnSoft,
                opacity: pressed || saving === x.id ? 0.6 : 1,
              })}>
              <Text style={{ flex: 1, color: x.clientId ? p.text : p.warn, fontWeight: '600' }}>
                {saving === x.id ? 'Saving…' : x.clientId ? `👤 ${clientName.get(x.clientId) ?? 'Client'}` : 'Choose a client'}
              </Text>
              <Text style={{ color: p.brand, fontWeight: '700' }}>Change ›</Text>
            </Pressable>
          </Card>
        ))}
      </Section>

      <Modal visible={picking !== null} transparent animationType="fade" onRequestClose={() => setPicking(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: space.lg }} onPress={() => setPicking(null)}>
          <Pressable
            onPress={() => undefined}
            style={{ backgroundColor: p.card, borderRadius: radius.lg, padding: space.lg, gap: space.sm, maxHeight: '80%', width: '100%', maxWidth: 480, alignSelf: 'center' }}>
            <T variant="heading">{picking ? `Client for ${picking.pageName}` : ''}</T>
            <Input value={pickQuery} onChangeText={setPickQuery} placeholder="Search clients" />
            <ScrollView style={{ flexGrow: 0 }}>
              {[{ id: '', name: '— No client —' }, ...pickList].map((c) => {
                const on = (picking?.clientId ?? '') === c.id;
                return (
                  <Pressable
                    key={c.id || 'none'}
                    onPress={() => picking && confirmMove(picking, c.id || null)}
                    style={({ pressed }) => ({
                      paddingVertical: space.sm + 2,
                      paddingHorizontal: space.md,
                      borderRadius: radius.md,
                      backgroundColor: on ? p.brandSoft : pressed ? p.border : 'transparent',
                    })}>
                    <Text style={{ color: on ? p.brand : p.text, fontWeight: on ? '700' : '500' }}>{on ? `✓ ${c.name}` : c.name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Button title="Cancel" kind="outline" small onPress={() => setPicking(null)} />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}
