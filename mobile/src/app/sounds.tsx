import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Platform, View } from 'react-native';

import { Button, Card, Row, Screen, T } from '@/components/ui';
import { CHANNELS, registerForPush, setUpNotifications, type AlertChannel } from '@/lib/notifications';
import { space, usePalette } from '@/lib/theme';

// Each kind of alert is its own Android notification channel. ▶️ Test shows one on this phone (and a
// connected Galaxy Watch); Change sound opens the phone's own settings for that channel, where any
// phone sound (like a ringtone) can be picked, along with vibration and pop-up.

const PACKAGE = Constants.expoConfig?.android?.package || 'com.northviamarketing.anwarz';

const SAMPLES: Record<string, { title: string; body: string; categoryIdentifier?: string }> = {
  site_down: { title: '🌐 Site down · oasis grill', body: 'oasisgrill.ca is not responding (timeout). Checked just now.' },
  task: { title: '⏰ Call Essam about the menu', body: 'Pacific Egy · Today, 3:00 PM', categoryIdentifier: 'task' },
  email: { title: '🚨 Email: Google Ads', body: 'Your account will be paused in 20 days unless verification is completed.' },
  review: { title: '⭐ 1 bad review to answer', body: '★☆☆☆☆ oasis grill · “The food was dry…”' },
  jl_order: { title: '🛋 New JL Comfort order · JL-1023', body: 'Jane Smith · 2 × Charlotte 20940-02 · $412.50' },
  ads_stopped: { title: '⛔ Ads stopped: oasis grill', body: 'Google Ads · First Campaign: no spend since Nov 11 (call extension disapproved)' },
  attention: { title: '🔌 Facebook login expired: oasis grill', body: 'Reconnect it so comments and ads keep working.' },
  info: { title: '📰 Morning brief ready', body: '3 tasks today · 2 emails waiting · all sites up' },
};

export default function Sounds() {
  const p = usePalette();
  const [current, setCurrent] = useState<Record<string, string | null>>({});
  const [permission, setPermission] = useState<string>('…');

  // Reads each channel's current sound (it changes when picked in the phone's settings).
  const read = useCallback(async () => {
    if (Platform.OS !== 'android') return null;
    await setUpNotifications();
    const sounds: Record<string, string | null> = {};
    for (const c of CHANNELS) {
      const ch = await Notifications.getNotificationChannelAsync(c.id).catch(() => null);
      sounds[c.id] = ch ? ch.sound ?? null : null;
    }
    return { sounds, permission: (await Notifications.getPermissionsAsync()).status as string };
  }, []);

  const load = useCallback(() => {
    void read().then((r) => {
      if (!r) return;
      setCurrent(r.sounds);
      setPermission(r.permission);
    });
  }, [read]);

  useEffect(() => {
    let live = true;
    void read().then((r) => {
      if (!live || !r) return;
      setCurrent(r.sounds);
      setPermission(r.permission);
    });
    return () => {
      live = false;
    };
  }, [read]);

  const test = async (c: AlertChannel) => {
    if ((await Notifications.getPermissionsAsync()).status !== 'granted') {
      const status = await registerForPush();
      if (status === 'denied') {
        Alert.alert('Notifications are off', 'Allow notifications for Anwarz in the phone settings.', [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open settings', onPress: () => Linking.openSettings() },
        ]);
        return;
      }
    }
    const sample = SAMPLES[c.id];
    await Notifications.scheduleNotificationAsync({
      content: { title: sample.title, body: sample.body, data: { type: 'test' }, categoryIdentifier: sample.categoryIdentifier, color: '#274290' },
      trigger: { channelId: c.id, seconds: 2 } as Notifications.NotificationTriggerInput,
    });
  };

  const change = async (c: AlertChannel) => {
    try {
      await Linking.sendIntent('android.settings.CHANNEL_NOTIFICATION_SETTINGS', [
        { key: 'android.provider.extra.APP_PACKAGE', value: PACKAGE },
        { key: 'android.provider.extra.CHANNEL_ID', value: c.id },
      ]);
    } catch {
      await Linking.openSettings();
    }
  };

  const soundLabel = (c: AlertChannel) => {
    const s = current[c.id];
    if (s === undefined) return c.soundName;
    if (!s || s === 'none') return c.sound ? 'Silent (changed)' : 'Silent';
    if (c.sound && s.includes(c.sound.replace('.wav', ''))) return c.soundName;
    return s === 'default' ? 'Phone default' : 'Your sound';
  };

  return (
    <Screen padTop={false} onRefresh={load} refreshing={false}>
      <T variant="small">
        Each kind of alert has its own sound. Tap ▶️ Test to hear it (it pops up in 2 seconds, and on your watch). Tap Change sound to pick any phone sound, like a ringtone; you can also set vibration and pop-up there.
      </T>
      {permission !== 'granted' && permission !== '…' ? (
        <Card tone="warn">
          <T variant="heading" color={p.warn}>
            Notifications are off for Anwarz
          </T>
          <Button title="Turn them on" small onPress={() => void registerForPush().then(() => load())} />
        </Card>
      ) : null}
      {CHANNELS.map((c) => (
        <Card key={c.id}>
          <Row>
            <View style={{ flex: 1, gap: 2 }}>
              <T variant="heading">{c.name}</T>
              <T variant="small">{c.description}</T>
              <T variant="small" color={p.brand} style={{ fontWeight: '700' }}>{`🔊 ${soundLabel(c)}`}</T>
            </View>
          </Row>
          <Row style={{ gap: space.sm }}>
            <Button title="▶️ Test" small kind="soft" style={{ flex: 1 }} onPress={() => void test(c)} />
            <Button title="Change sound" small kind="outline" style={{ flex: 1 }} onPress={() => void change(c).then(() => setTimeout(load, 1500))} />
          </Row>
        </Card>
      ))}
      <Button title="All notification settings" kind="outline" onPress={() => Linking.openSettings()} />
    </Screen>
  );
}
