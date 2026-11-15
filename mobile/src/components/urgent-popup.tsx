import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
import { Alert, AppState, Modal, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '@/lib/api';
import { ago } from '@/lib/format';
import { openAlert } from '@/lib/notifications';
import { radius, space, usePalette } from '@/lib/theme';
import { useApi } from '@/lib/use-api';

import { Button, Card, Row, T } from './ui';

// Urgent pop-ups. The kinds of alert Ahmed marks urgent (More → Alerts) stay pinned on the phone and,
// whenever the app opens or comes back to the front, show here until he taps Seen.

interface UrgentAlert {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  data: Record<string, string>;
  createdAt: string;
}

interface UrgentData {
  kinds: { key: string; label: string; urgent: boolean }[];
  unseen: UrgentAlert[];
}

/** Marks alerts seen on the website and clears their pinned notifications on the phone. */
export async function markAlertsSeen(ids: string[] | 'all') {
  await api('/alerts/urgent', { body: { seen: ids } });
  const shown = await Notifications.getPresentedNotificationsAsync().catch(() => []);
  for (const n of shown) {
    const alertId = (n.request.content.data as Record<string, unknown> | undefined)?.alertId;
    if (typeof alertId === 'string' && (ids === 'all' || ids.includes(alertId))) {
      await Notifications.dismissNotificationAsync(n.request.identifier).catch(() => undefined);
    }
  }
}

const ICON: Record<string, string> = { site_down: '🌐', ads_stopped: '📉', attention: '🔌', email: '🚨', review: '⭐', jl_order: '🛋', task: '⏰', summary: '☀️' };

export function UrgentPopup() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const [alerts, setAlerts] = useState<UrgentAlert[]>([]);
  const [hidden, setHidden] = useState(false); // "Later": closed until the app comes back to the front
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    void api<UrgentData>('/alerts/urgent')
      .then((d) => {
        setAlerts(d.unseen);
        setHidden(false);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    load();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') load();
    });
    // A new urgent alert while the app is open shows at once.
    const arrived = Notifications.addNotificationReceivedListener((n) => {
      if ((n.request.content.data as Record<string, unknown> | undefined)?.urgent === '1') load();
    });
    return () => {
      sub.remove();
      arrived.remove();
    };
  }, [load]);

  const seen = async (ids: string[] | 'all', key: string) => {
    setBusy(key);
    try {
      await markAlertsSeen(ids);
      setAlerts((list) => (ids === 'all' ? [] : list.filter((a) => !ids.includes(a.id))));
    } catch (e) {
      Alert.alert('Not saved', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const open = async (a: UrgentAlert) => {
    await seen([a.id], a.id);
    openAlert(a.data);
  };

  const visible = alerts.length > 0 && !hidden;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setHidden(true)} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(8, 12, 24, 0.6)', justifyContent: 'center', padding: space.lg, paddingTop: insets.top + space.lg }}>
        <View style={{ backgroundColor: p.card, borderRadius: radius.lg, padding: space.lg, gap: space.md, maxHeight: '85%', borderWidth: 2, borderColor: p.danger }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: p.danger }}>{`⚠️ ${alerts.length} urgent ${alerts.length === 1 ? 'alert needs' : 'alerts need'} you`}</Text>
          <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ gap: space.sm }}>
            {alerts.map((a) => (
              <Card key={a.id} tone="danger">
                <Row>
                  <T style={{ flex: 1, fontWeight: '700' }}>{`${ICON[a.kind] ?? '⚠️'} ${a.title}`}</T>
                  <T variant="small">{ago(a.createdAt)}</T>
                </Row>
                {a.body ? <T variant="small" numberOfLines={4}>{a.body}</T> : null}
                <Row>
                  <Button title="Open" small busy={busy === a.id} disabled={busy !== null} onPress={() => void open(a)} />
                  <Button title="✅ Seen" small kind="outline" disabled={busy !== null} onPress={() => void seen([a.id], `s-${a.id}`)} />
                </Row>
              </Card>
            ))}
          </ScrollView>
          <Row>
            <Button title="✅ Seen all" tone="ok" busy={busy === 'all'} disabled={busy !== null} onPress={() => void seen('all', 'all')} style={{ flex: 1 }} />
            <Button title="Later" kind="outline" disabled={busy !== null} onPress={() => setHidden(true)} style={{ flex: 1 }} />
          </Row>
        </View>
      </View>
    </Modal>
  );
}

/** More → Alerts: which kinds are urgent (pinned + pop-up until Seen). */
export function UrgentSettings() {
  const p = usePalette();
  const { data, setData, error } = useApi<UrgentData>('/alerts/urgent');
  const [saving, setSaving] = useState<string | null>(null);

  const toggle = async (key: string, on: boolean) => {
    if (!data) return;
    const kinds = data.kinds.filter((k) => (k.key === key ? on : k.urgent)).map((k) => k.key);
    setSaving(key);
    try {
      const r = await api<{ kinds: string[] }>('/alerts/urgent', { body: { kinds } });
      setData({ ...data, kinds: data.kinds.map((k) => ({ ...k, urgent: r.kinds.includes(k.key) })) });
    } catch (e) {
      Alert.alert('Not saved', e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(null);
    }
  };

  return (
    <Card>
      <T style={{ fontWeight: '700' }}>🚨 Urgent pop-ups</T>
      <T variant="small">Urgent alerts stay pinned on the phone and pop up when you open Anwarz, until you tap Seen. The rest are normal notifications.</T>
      {data?.kinds.map((k) => (
        <Pressable key={k.key} onPress={() => void toggle(k.key, !k.urgent)}>
          <View style={{ flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: p.border, paddingTop: space.sm }}>
            <T style={{ flex: 1 }}>{k.label}</T>
            <Switch value={k.urgent} disabled={saving !== null} onValueChange={(v) => void toggle(k.key, v)} />
          </View>
        </Pressable>
      ))}
      {error && !data ? <T variant="small" color={p.danger}>{error}</T> : null}
    </Card>
  );
}
