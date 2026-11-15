import { useState } from 'react';
import { Alert, View } from 'react-native';

import { api } from '@/lib/api';
import { dateTime } from '@/lib/format';
import { space, usePalette } from '@/lib/theme';
import { useApi } from '@/lib/use-api';

import { Card, Chip, Pill, Row, T } from './ui';

// Where alerts go (More page). The app is always on; Telegram can be paused for a day, turned off
// and turned back on; ntfy rings (the old alarm app) on or off. Stored on the website.

interface Channels {
  telegram: 'on' | 'paused' | 'off';
  telegramUntil: string | null;
  ntfy: 'on' | 'off';
}

export function AlertSwitches() {
  const p = usePalette();
  const { data, setData, error } = useApi<{ channels: Channels }>('/alerts');
  const [busy, setBusy] = useState<string | null>(null);
  const c = data?.channels;

  const change = async (key: string, body: Record<string, string>) => {
    setBusy(key);
    try {
      setData(await api<{ channels: Channels }>('/alerts', { body }));
    } catch (e) {
      Alert.alert('Not changed', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const telegram = (choice: 'on' | 'pause_day' | 'off') => {
    if (choice === 'on') return void change('t-on', { telegram: 'on' });
    Alert.alert(
      choice === 'pause_day' ? 'Pause Telegram alerts for 1 day?' : 'Turn Telegram alerts off?',
      'Alerts keep coming to this app. Make sure “Send a test from the website” reaches you first. The bot still answers when you write to it.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: choice === 'pause_day' ? 'Pause 1 day' : 'Turn off', style: 'destructive', onPress: () => void change(`t-${choice}`, { telegram: choice }) },
      ]
    );
  };

  return (
    <Card>
      <Row>
        <T style={{ flex: 1, fontWeight: '700' }}>📱 Anwarz app</T>
        <Pill text="Always on" tone="ok" />
      </Row>

      <View style={{ gap: space.sm, borderTopWidth: 1, borderTopColor: p.border, paddingTop: space.sm }}>
        <Row>
          <T style={{ flex: 1, fontWeight: '700' }}>✈️ Telegram alerts</T>
          {c ? (
            <Pill
              text={c.telegram === 'on' ? 'On' : c.telegram === 'paused' ? `Paused until ${dateTime(c.telegramUntil)}` : 'Off'}
              tone={c.telegram === 'on' ? 'ok' : c.telegram === 'paused' ? 'warn' : 'muted'}
            />
          ) : null}
        </Row>
        <Row wrap>
          <Chip text={busy === 't-on' ? '…' : c?.telegram === 'on' ? '✓ On' : '▶️ Turn back on'} selected={c?.telegram === 'on'} onPress={() => telegram('on')} />
          <Chip text={busy === 't-pause_day' ? '…' : '⏸ Pause 1 day'} selected={c?.telegram === 'paused'} onPress={() => telegram('pause_day')} />
          <Chip text={busy === 't-off' ? '…' : '⏹ Off'} selected={c?.telegram === 'off'} onPress={() => telegram('off')} />
        </Row>
        <T variant="small">Paused or off: no reminders, email, site, review or ads alerts in Telegram. The bot still answers you.</T>
      </View>

      <View style={{ gap: space.sm, borderTopWidth: 1, borderTopColor: p.border, paddingTop: space.sm }}>
        <Row>
          <T style={{ flex: 1, fontWeight: '700' }}>🔔 ntfy rings (old alarm app)</T>
          {c ? <Pill text={c.ntfy === 'on' ? 'On' : 'Off'} tone={c.ntfy === 'on' ? 'ok' : 'muted'} /> : null}
        </Row>
        <Row>
          <Chip text={busy === 'n-on' ? '…' : c?.ntfy === 'on' ? '✓ On' : '▶️ Turn back on'} selected={c?.ntfy === 'on'} onPress={() => void change('n-on', { ntfy: 'on' })} />
          <Chip text={busy === 'n-off' ? '…' : '⏹ Off'} selected={c?.ntfy === 'off'} onPress={() => void change('n-off', { ntfy: 'off' })} />
        </Row>
        <T variant="small">The app now rings with its own sounds, so ntfy can be off to avoid two alarms.</T>
      </View>
      {error && !data ? <T variant="small" color={p.danger}>{error}</T> : null}
    </Card>
  );
}
