import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { Button, Card, ErrorBox, Loading, Row, T } from '@/components/ui';
import { api } from '@/lib/api';
import { facebookNativeLogin, googleNativeCode, GOOGLE_SCOPES, SignInCancelled } from '@/lib/native-signin';
import { radius, space, usePalette } from '@/lib/theme';
import { useApi } from '@/lib/use-api';

// A client's Facebook / Instagram Pages, Meta ad accounts, Google Ads accounts and Google Business
// locations. "Connect" signs in natively (the Facebook app, the phone's Google accounts) in 0.7.0+,
// or in the browser in older builds and Expo Go; then he ticks what belongs to this client.

interface Choice {
  id: string;
  name: string;
  detail: string | null;
  selected: boolean;
  takenBy: string | null;
}
interface SectionData {
  connected: boolean;
  choices: Choice[];
  error: string | null;
}
interface SocialData {
  pages: SectionData;
  metaAds: SectionData;
  googleAds: SectionData;
  gbp: SectionData;
}
type SectionKey = keyof SocialData;
type Provider = 'meta' | 'google_ads' | 'gbp';

const SECTIONS: { key: SectionKey; title: string; provider: Provider; empty: string }[] = [
  { key: 'pages', title: 'Facebook Pages & Instagram', provider: 'meta', empty: 'No Pages found on the Facebook login.' },
  { key: 'metaAds', title: 'Meta ad accounts', provider: 'meta', empty: 'No ad accounts found on the Facebook login.' },
  { key: 'googleAds', title: 'Google Ads accounts', provider: 'google_ads', empty: 'No Google Ads accounts found.' },
  { key: 'gbp', title: 'Google Business locations', provider: 'gbp', empty: 'No locations found.' },
];

const CONNECT_LABEL: Record<Provider, string> = { meta: 'Connect Facebook', google_ads: 'Connect Google Ads', gbp: 'Connect Google Business' };

export function ClientConnections({ clientId }: { clientId: string }) {
  const p = usePalette();
  const social = useApi<SocialData>(`/clients/${clientId}/social`);
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<SectionKey | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  /** Native sign-in when this build has it; otherwise the browser sign-in as before. */
  const connect = async (provider: Provider) => {
    setBusy(`connect:${provider}`);
    try {
      let done: { message: string } | null = null;
      if (provider === 'meta') {
        const token = await facebookNativeLogin();
        if (token) done = await api<{ message: string }>('/connect/native', { body: { provider: 'meta', clientId, accessToken: token }, timeoutMs: 60_000 });
      } else {
        const code = await googleNativeCode(GOOGLE_SCOPES[provider]);
        if (code) done = await api<{ message: string }>('/connect/native', { body: { provider: 'google', kind: provider, clientId, serverAuthCode: code }, timeoutMs: 60_000 });
      }
      if (!done) {
        const { url } = await api<{ url: string }>('/connections', { body: { kind: provider, clientId } });
        await WebBrowser.openBrowserAsync(url);
      } else Alert.alert('Connected', done.message);
      await social.reload();
    } catch (e) {
      if (!(e instanceof SignInCancelled)) Alert.alert('Not connected', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const startPicking = (key: SectionKey) => {
    setPicked(new Set((social.data?.[key].choices ?? []).filter((c) => c.selected).map((c) => c.id)));
    setOpen(key);
  };

  const save = async (key: SectionKey) => {
    setBusy(`save:${key}`);
    try {
      const next = await api<SocialData>(`/clients/${clientId}/social`, { body: { section: key, ids: [...picked] }, timeoutMs: 60_000 });
      social.setData(next);
      setOpen(null);
    } catch (e) {
      Alert.alert('Not saved', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  if (social.loading && !social.data) return <Loading />;
  if (social.error && !social.data) return <ErrorBox message={social.error} onRetry={social.refresh} />;
  if (!social.data) return null;

  return (
    <View style={{ gap: space.md }}>
      {SECTIONS.map((s) => {
        const data = social.data![s.key];
        const mine = data.choices.filter((c) => c.selected);
        const editing = open === s.key;
        return (
          <Card key={s.key}>
            <Row>
              <T variant="heading" style={{ flex: 1 }}>{s.title}</T>
              {data.connected && !editing ? <Button title={mine.length ? 'Change' : 'Pick'} small kind="soft" onPress={() => startPicking(s.key)} /> : null}
            </Row>

            {!data.connected ? (
              <T variant="small">Not connected yet.</T>
            ) : data.error ? (
              <T variant="small" color={p.danger}>{data.error}</T>
            ) : !editing ? (
              mine.length ? (
                mine.map((c) => <T key={c.id} variant="small">{`✅ ${c.name}${c.detail ? ` · ${c.detail}` : ''}`}</T>)
              ) : (
                <T variant="small" color={p.muted}>None picked for this client.</T>
              )
            ) : (
              <View style={{ gap: space.sm }}>
                {data.choices.length ? null : <T variant="small">{s.empty}</T>}
                {data.choices.map((c) => {
                  const on = picked.has(c.id);
                  const locked = Boolean(c.takenBy);
                  return (
                    <Pressable
                      key={c.id}
                      disabled={locked}
                      onPress={() => setPicked((prev) => { const n = new Set(prev); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n; })}
                      style={({ pressed }) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: space.sm,
                        padding: space.sm,
                        borderRadius: radius.md,
                        borderWidth: 1,
                        borderColor: on ? p.brand : p.border,
                        backgroundColor: on ? p.brandSoft : 'transparent',
                        opacity: locked ? 0.45 : pressed ? 0.6 : 1,
                      })}>
                      <Text style={{ fontSize: 18 }}>{on ? '☑️' : '⬜'}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: p.text, fontWeight: '600' }}>{c.name}</Text>
                        <Text style={{ color: p.muted, fontSize: 12 }}>{[c.detail, c.takenBy ? `belongs to ${c.takenBy}` : null].filter(Boolean).join(' · ')}</Text>
                      </View>
                    </Pressable>
                  );
                })}
                <Row>
                  <Button title="Save" small tone="ok" busy={busy === `save:${s.key}`} disabled={busy !== null} onPress={() => void save(s.key)} />
                  <Button title="Cancel" small kind="outline" disabled={busy !== null} onPress={() => setOpen(null)} />
                </Row>
              </View>
            )}

            {!editing ? (
              <Row>
                {/* Ads and Business accounts come from the logins; a new or different login adds more. */}
                {s.key !== 'metaAds' ? (
                  <Button
                    title={data.connected ? `↻ ${CONNECT_LABEL[s.provider].replace('Connect', 'Reconnect')}` : `🔗 ${CONNECT_LABEL[s.provider]}`}
                    small
                    kind="outline"
                    busy={busy === `connect:${s.provider}`}
                    disabled={busy !== null}
                    onPress={() => void connect(s.provider)}
                  />
                ) : null}
              </Row>
            ) : null}
          </Card>
        );
      })}
    </View>
  );
}
