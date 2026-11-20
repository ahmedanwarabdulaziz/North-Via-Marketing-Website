import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
import { Alert, AppState, Modal, Platform, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '@/lib/api';
import { ago } from '@/lib/format';
import { openAlert } from '@/lib/notifications';
import { radius, space, usePalette } from '@/lib/theme';

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
  if (Platform.OS === 'web') return;
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
    // (Phone only; the PC version's notifications come from the service worker.)
    const arrived = Platform.OS === 'web' ? null : Notifications.addNotificationReceivedListener((n) => {
      if ((n.request.content.data as Record<string, unknown> | undefined)?.urgent === '1') load();
    });
    return () => {
      sub.remove();
      arrived?.remove();
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
