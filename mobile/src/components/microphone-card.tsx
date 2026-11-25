import { useFocusEffect } from 'expo-router';
import { AudioModule } from 'expo-audio';
import { useCallback, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';

import { Button, Card, Pill, Row, T } from './ui';

// More → 🎙 Microphone: whether Anwarz may use the microphone (voice notes, 🎙 Speak in the writing
// bubble). Allow asks Android; if Android won't ask again (it was refused twice), the phone's own
// settings page for Anwarz opens instead, where Permissions → Microphone → Allow.

type State = 'unknown' | 'granted' | 'ask' | 'blocked';

export function MicrophoneCard() {
  const [state, setState] = useState<State>('unknown');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const p = await AudioModule.getRecordingPermissionsAsync();
      setState(p.granted ? 'granted' : p.canAskAgain ? 'ask' : 'blocked');
    } catch {
      setState('unknown');
    }
  }, []);

  // Back from the phone's settings page: look again.
  useFocusEffect(
    useCallback(() => {
      void refresh();
      const sub = AppState.addEventListener('change', (s) => {
        if (s === 'active') void refresh();
      });
      return () => sub.remove();
    }, [refresh]),
  );

  if (Platform.OS === 'web') return null;

  const allow = async () => {
    if (state === 'blocked') {
      void Linking.openSettings();
      return;
    }
    setBusy(true);
    try {
      const p = await AudioModule.requestRecordingPermissionsAsync();
      setState(p.granted ? 'granted' : p.canAskAgain ? 'ask' : 'blocked');
    } catch {
      void Linking.openSettings();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <Row>
        <T style={{ flex: 1, fontWeight: '700' }}>🎙 Microphone</T>
        {state === 'granted' ? <Pill text="Allowed" tone="ok" /> : state === 'unknown' ? null : <Pill text="Off" tone="danger" />}
      </Row>
      <T variant="small">
        {state === 'granted'
          ? 'Voice notes and 🎙 Speak in the writing bubble can use the microphone.'
          : state === 'blocked'
            ? 'Android is blocking the microphone for Anwarz. Open the settings page, tap Permissions → Microphone → Allow, then come back.'
            : 'Allow the microphone to record voice notes and to speak instead of typing in the writing bubble.'}
      </T>
      {state !== 'granted' ? <Button title={state === 'blocked' ? '⚙️ Open phone settings' : '🎙 Allow microphone'} small onPress={allow} busy={busy} /> : null}
    </Card>
  );
}
