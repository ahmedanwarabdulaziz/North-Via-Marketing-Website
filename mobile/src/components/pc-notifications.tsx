import { useState } from 'react';
import { Alert } from 'react-native';

import { isPc, pcNotificationState, setUpPcNotifications, type PcNotifications } from '@/lib/pc';
import { usePalette } from '@/lib/theme';

import { Button, Card, Pill, Row, T } from './ui';

/** More → This PC (PC version only): turn Windows notifications on. */
export function PcNotificationsCard() {
  const p = usePalette();
  const [state, setState] = useState<PcNotifications>(() => pcNotificationState());
  const [busy, setBusy] = useState(false);
  if (!isPc) return null;

  const turnOn = async () => {
    setBusy(true);
    try {
      setState(await setUpPcNotifications(true));
    } catch (e) {
      Alert.alert('Not turned on', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <Row>
        <T style={{ flex: 1, fontWeight: '700' }}>💻 Windows notifications</T>
        <Pill text={state === 'on' ? 'On' : state === 'blocked' ? 'Blocked' : state === 'unsupported' ? 'Not available' : 'Off'} tone={state === 'on' ? 'ok' : state === 'blocked' ? 'danger' : 'muted'} />
      </Row>
      <T variant="small">
        {state === 'blocked'
          ? 'Blocked in the browser: click the lock icon next to the address → Notifications → Allow, then reload.'
          : state === 'unsupported'
          ? 'This browser can’t show notifications. Use Chrome or Edge, and install Anwarz (⋮ → Install).'
          : 'Alerts pop up on this PC too (tasks, urgent email, sites, ads…), even when Anwarz is closed.'}
      </T>
      {state === 'off' ? <Button title="Turn on Windows notifications" small busy={busy} onPress={() => void turnOn()} /> : null}
      {state === 'on' ? <T variant="small" color={p.ok}>This PC gets your alerts. Try “Send a test from the website” below.</T> : null}
    </Card>
  );
}
