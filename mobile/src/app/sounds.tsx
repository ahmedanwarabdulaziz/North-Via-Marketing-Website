import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Switch, View } from 'react-native';

import { Button, Card, Pill, Row, Screen, T } from '@/components/ui';
import { alarmsAvailable, openFullScreenSettings } from '@/lib/alarm';
import { api } from '@/lib/api';
import { CHANNELS, registerForPush, setUpNotifications, type AlertChannel } from '@/lib/notifications';
import { space, usePalette } from '@/lib/theme';

// More → Notifications: everything about alerts in one place, one card per kind of alert.
//   🔊 Sound      its own Android channel: ▶️ Test plays it (also on the watch); Change opens the phone's
//                 settings for that channel, where any phone sound (a ringtone too) can be picked.
//   📌 Urgent     stays pinned on the phone and pops up when Anwarz opens, until Seen (website setting).
//   🚨 Alarm      an urgent one that lights up the locked screen and rings until Seen (app 0.5.0+).
// Switches change at once; only the one being saved shows a spinner, and it flips back if saving fails.

const PACKAGE = Constants.expoConfig?.android?.package || 'com.northviamarketing.anwarz';

const SAMPLES: Record<string, { title: string; body: string; categoryIdentifier?: string }> = {
  site_down: { title: '🌐 Site down · oasis grill', body: 'oasisgrill.ca is not responding (timeout). Checked just now.' },
  task: { title: '⏰ Call Essam about the menu', body: 'Pacific Egy · Today, 3:00 PM', categoryIdentifier: 'task' },
  email: { title: '🚨 Email: Google Ads', body: 'Your account will be paused in 20 days unless verification is completed.' },
  review: { title: '⭐ 1 bad review to answer', body: '★☆☆☆☆ oasis grill · “The food was dry…”' },
  jl_order: { title: '🛋 New JL Comfort order · JL-1023', body: 'Jane Smith · 2 × Charlotte 20940-02 · $412.50' },
  ads_stopped: { title: '⛔ Ads stopped: oasis grill', body: 'Google Ads · First Campaign: no spend since Nov 11 (call extension disapproved)' },
  attention: { title: '🔌 Facebook login expired: oasis grill', body: 'Reconnect it so comments and ads keep working.' },
  summary: { title: '☀️ Good morning: your day', body: '📌 Tasks: 3 today · 📧 Emails waiting: 2 · ⭐ Reviews to answer: 1', categoryIdentifier: 'ask' },
  info: { title: '📰 Morning brief ready', body: '3 tasks today · 2 emails waiting · all sites up' },
};

type Flags = Record<string, { urgent: boolean; alarm: boolean }>;

export default function NotificationsSettings() {
  const p = usePalette();
  const [sounds, setSounds] = useState<Record<string, string | null>>({});
  const [permission, setPermission] = useState<string>('…');
  const [flags, setFlags] = useState<Flags | null>(null);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const latest = useRef<Flags | null>(null); // the newest choices, so quick taps in a row all count

  // Each channel's current sound (it changes when picked in the phone's settings).
  const readSounds = useCallback(async () => {
    if (Platform.OS !== 'android') return null;
    await setUpNotifications();
    const out: Record<string, string | null> = {};
    for (const c of CHANNELS) {
      const ch = await Notifications.getNotificationChannelAsync(c.id).catch(() => null);
      out[c.id] = ch ? ch.sound ?? null : null;
    }
    return { sounds: out, permission: (await Notifications.getPermissionsAsync()).status as string };
  }, []);

  const loadSounds = useCallback(() => {
    void readSounds().then((r) => {
      if (!r) return;
      setSounds(r.sounds);
      setPermission(r.permission);
    });
  }, [readSounds]);

  const loadFlags = useCallback(() => {
    void api<{ kinds: { key: string; urgent: boolean; alarm: boolean }[] }>('/alerts/urgent')
      .then((d) => {
        const next: Flags = Object.fromEntries(d.kinds.map((k) => [k.key, { urgent: k.urgent, alarm: k.alarm }]));
        latest.current = next;
        setFlags(next);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let live = true;
    void readSounds().then((r) => {
      if (!live || !r) return;
      setSounds(r.sounds);
      setPermission(r.permission);
    });
    loadFlags();
    return () => {
      live = false;
    };
  }, [readSounds, loadFlags]);

  /** Changes one switch at once, saves in the background, and undoes it if saving fails. */
  const setFlag = async (key: string, field: 'urgent' | 'alarm', on: boolean) => {
    const before = latest.current;
    if (!before?.[key]) return;
    const row = { ...before[key], [field]: on };
    if (field === 'urgent' && !on) row.alarm = false; // no alarm without urgent
    if (field === 'alarm' && on) row.urgent = true; // an alarm is always urgent
    const next = { ...before, [key]: row };
    latest.current = next;
    setFlags(next);
    setSaving((s) => ({ ...s, [`${key}:${field}`]: true }));
    try {
      const entries = Object.entries(next);
      await api('/alerts/urgent', {
        body: { kinds: entries.filter(([, v]) => v.urgent).map(([k]) => k), alarm: entries.filter(([, v]) => v.alarm).map(([k]) => k) },
      });
    } catch (e) {
      const undone = { ...(latest.current || next), [key]: before[key] };
      latest.current = undone;
      setFlags(undone);
      Alert.alert('Not saved', e instanceof Error ? e.message : String(e));
    } finally {
      setSaving((s) => ({ ...s, [`${key}:${field}`]: false }));
    }
  };

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
    const sample = SAMPLES[c.id] ?? { title: c.name, body: c.description };
    await Notifications.scheduleNotificationAsync({
      content: { title: sample.title, body: sample.body, data: { type: 'test' }, categoryIdentifier: sample.categoryIdentifier, color: '#274290' },
      trigger: { channelId: c.id, seconds: 2 } as Notifications.NotificationTriggerInput,
    });
  };

  const changeSound = async (c: AlertChannel) => {
    try {
      await Linking.sendIntent('android.settings.CHANNEL_NOTIFICATION_SETTINGS', [
        { key: 'android.provider.extra.APP_PACKAGE', value: PACKAGE },
        { key: 'android.provider.extra.CHANNEL_ID', value: c.id },
      ]);
    } catch {
      await Linking.openSettings();
    }
    setTimeout(loadSounds, 1500);
  };

  const soundLabel = (c: AlertChannel) => {
    const s = sounds[c.id];
    if (s === undefined) return c.soundName;
    if (!s || s === 'none') return c.sound ? 'Silent (changed)' : 'Silent';
    if (c.sound && s.includes(c.sound.replace('.wav', ''))) return c.soundName;
    return s === 'default' ? 'Phone default' : 'Your sound';
  };

  const anyAlarm = flags ? Object.values(flags).some((f) => f.alarm) : false;

  const Toggle = ({ k, field, label, hint }: { k: string; field: 'urgent' | 'alarm'; label: string; hint: string }) => {
    const on = Boolean(flags?.[k]?.[field]);
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: p.border }}>
        <View style={{ flex: 1 }}>
          <T style={{ fontWeight: '600' }}>{label}</T>
          <T variant="small">{hint}</T>
        </View>
        {saving[`${k}:${field}`] ? <ActivityIndicator size="small" color={p.brand} /> : null}
        <Switch value={on} disabled={!flags} onValueChange={(v) => void setFlag(k, field, v)} trackColor={{ true: field === 'alarm' ? p.danger : p.brand }} />
      </View>
    );
  };

  return (
    <Screen padTop={false} onRefresh={() => (loadSounds(), loadFlags())} refreshing={false}>
      <T variant="small">One card per kind of alert: its sound, whether it is urgent (pinned and shown in a pop-up until you tap Seen), and whether it rings as a full-screen alarm.</T>

      {permission !== 'granted' && permission !== '…' ? (
        <Card tone="warn">
          <T variant="heading" color={p.warn}>Notifications are off for Anwarz</T>
          <Button title="Turn them on" small onPress={() => void registerForPush().then(() => loadSounds())} />
        </Card>
      ) : null}

      {anyAlarm ? (
        <Card>
          <T style={{ fontWeight: '700' }}>🚨 Full-screen alarms</T>
          {alarmsAvailable() ? (
            <>
              <T variant="small">Android 14+ needs one permission for alarms to light up the locked screen.</T>
              <Button title="Allow full-screen alarms" small kind="outline" onPress={() => void openFullScreenSettings()} />
            </>
          ) : (
            <T variant="small" color={p.warn}>Alarms work in the installed app (0.5.0+), not in Expo Go. Until then they come as pinned notifications.</T>
          )}
        </Card>
      ) : null}

      {CHANNELS.map((c) => {
        const configurable = Boolean(flags && flags[c.id]);
        const f = flags?.[c.id];
        return (
          <Card key={c.id} tone={f?.alarm ? 'danger' : f?.urgent ? 'warn' : undefined}>
            <Row>
              <T variant="heading" style={{ flex: 1 }}>{c.name}</T>
              {f?.alarm ? <Pill text="Alarm" tone="danger" /> : f?.urgent ? <Pill text="Urgent" tone="warn" /> : null}
            </Row>
            <T variant="small">{c.description}</T>
            <Row style={{ gap: space.sm, alignItems: 'center' }}>
              <T variant="small" color={p.brand} style={{ flex: 1, fontWeight: '700' }}>{`🔊 ${soundLabel(c)}`}</T>
              <Button title="▶️ Test" small kind="soft" onPress={() => void test(c)} />
              <Button title="Change" small kind="outline" onPress={() => void changeSound(c)} />
            </Row>
            {configurable ? (
              <>
                <Toggle k={c.id} field="urgent" label="📌 Urgent pop-up" hint="Pinned on the phone and shown when you open Anwarz, until Seen" />
                {f?.urgent ? <Toggle k={c.id} field="alarm" label="🚨 Full-screen alarm" hint="Lights up the locked screen and rings until Seen" /> : null}
              </>
            ) : null}
          </Card>
        );
      })}
      <Button title="All notification settings for Anwarz" kind="outline" onPress={() => Linking.openSettings()} />
    </Screen>
  );
}
