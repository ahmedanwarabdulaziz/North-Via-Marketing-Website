import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, AppState, Platform, Switch } from 'react-native';

import { bubble, bubbleSupported } from '../../modules/anwarz-text';
import { Button, Card, Row, T } from './ui';

// More → Writing: the floating writing bubble (Android, APK 0.9.0 and later). It needs "Display over
// other apps", which Android only lets the user turn on in its own settings page.

export function BubbleCard() {
  const [on, setOn] = useState(false);
  const [waitingForPermission, setWaiting] = useState(false);

  const refresh = useCallback(() => setOn(bubble.isOn()), []);

  // Back from Android's settings page: if he allowed it, turn the bubble on as he asked.
  useFocusEffect(
    useCallback(() => {
      refresh();
      const sub = AppState.addEventListener('change', (state) => {
        if (state !== 'active') return;
        if (waitingForPermission && bubble.canDrawOverlays()) {
          setWaiting(false);
          bubble.start();
          setTimeout(refresh, 400);
        } else refresh();
      });
      return () => sub.remove();
    }, [refresh, waitingForPermission])
  );

  if (Platform.OS !== 'android') return null;
  if (!bubbleSupported) {
    return (
      <Card>
        <T style={{ fontWeight: '700' }}>🫧 Writing bubble</T>
        <T variant="small">Install the new Anwarz APK (0.9.0) to get the floating writing bubble.</T>
      </Card>
    );
  }

  const toggle = (value: boolean) => {
    if (!value) {
      bubble.stop();
      setTimeout(refresh, 400);
      return;
    }
    if (!bubble.canDrawOverlays()) {
      Alert.alert('Allow the bubble', 'On the next screen, turn on “Allow display over other apps” for Anwarz, then come back.', [
        { text: 'Not now', style: 'cancel' },
        {
          text: 'Open settings',
          onPress: () => {
            setWaiting(true);
            bubble.openOverlaySettings();
          },
        },
      ]);
      return;
    }
    bubble.start();
    setTimeout(refresh, 400);
  };

  return (
    <Card>
      <Row>
        <T style={{ flex: 1, fontWeight: '700' }}>🫧 Writing bubble</T>
        <Switch value={on} onValueChange={toggle} />
      </Row>
      <T variant="small">
        A small Anwarz button over every app. Tap it, type or paste what you want to say, pick a mode, then 📋 Copy & close and paste it anywhere.
        Drag it to the ✕ at the bottom to hide it. Also in the quick-settings panel: add “Anwarz ✍️” with the ✏️ pencil there.
      </T>
      <Row>
        <Button title="✍️ Write a reply now" small kind="soft" onPress={() => bubble.openComposer()} />
      </Row>
    </Card>
  );
}
