import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
import { Alert, AppState, Modal, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { alarmsAvailable, openFullScreenSettings } from '@/lib/alarm';
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
  kinds: { key: string; label: string; urgent: boolean; alarm: boolean }[];
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

  const save = async (key: string, next: (k: UrgentData['kinds'][number]) => { urgent: boolean; alarm: boolean }) => {
    if (!data) return;
    const rows = data.kinds.map((k) => ({ key: k.key, ...next(k) }));
    setSaving(key);
    try {
      const r = await api<{ kinds: string[]; alarm: string[] }>('/alerts/urgent', {
        body: { kinds: rows.filter((k) => k.urgent).map((k) => k.key), alarm: rows.filter((k) => k.alarm).map((k) => k.key) },
      });
      setData({ ...data, kinds: data.kinds.map((k) => ({ ...k, urgent: r.kinds.includes(k.key), alarm: r.alarm.includes(k.key) })) });
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
      {data?.kinds.map((k) => {
        // Turning urgent off also turns its alarm off; turning the alarm on makes it urgent.
        const setUrgent = (on: boolean) => void save(k.key, (x) => (x.key === k.key ? { urgent: on, alarm: on && x.alarm } : x));
        const setAlarm = (on: boolean) => void save(`a-${k.key}`, (x) => (x.key === k.key ? { urgent: x.urgent || on, alarm: on } : x));
        return (
          <View key={k.key} style={{ borderTopWidth: 1, borderTopColor: p.border, paddingTop: space.sm, gap: 2 }}>
            <Pressable onPress={() => setUrgent(!k.urgent)} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <T style={{ flex: 1 }}>{k.label}</T>
              <Switch value={k.urgent} disabled={saving !== null} onValueChange={setUrgent} />
            </Pressable>
            {k.urgent ? (
              <Pressable onPress={() => setAlarm(!k.alarm)} style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: space.lg }}>
                <T variant="small" style={{ flex: 1 }}>🚨 Full-screen alarm (lights up the screen, rings until Seen)</T>
                <Switch value={k.alarm} disabled={saving !== null} onValueChange={setAlarm} />
              </Pressable>
            ) : null}
          </View>
        );
      })}
      {data?.kinds.some((k) => k.alarm) ? (
        alarmsAvailable() ? (
          <Button title="Allow full-screen alarms (Android settings)" small kind="outline" onPress={() => void openFullScreenSettings()} />
        ) : (
          <T variant="small" color={p.warn}>Full-screen alarms work in the installed app (0.5.0+), not in Expo Go.</T>
        )
      ) : null}
      {error && !data ? <T variant="small" color={p.danger}>{error}</T> : null}
    </Card>
  );
}
