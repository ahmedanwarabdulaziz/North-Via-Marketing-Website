import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';
import { AppState, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { dateTime } from '@/lib/format';
import { space, usePalette } from '@/lib/theme';

import { Button, Card, Row, T } from './ui';

// Over-the-air updates (expo-updates). The installed app checks when it starts and downloads a new
// version in the background; it only runs after a restart. This bar appears as soon as one is
// downloaded, so a tap restarts into it. Coming back to the app also checks again.
// In Expo Go and dev builds updates are off, and nothing here shows.

async function checkAndDownload() {
  if (!Updates.isEnabled) return false;
  const check = await Updates.checkForUpdateAsync();
  if (!check.isAvailable) return false;
  await Updates.fetchUpdateAsync();
  return true;
}

/** "Update ready · Restart" at the top of the app. */
export function UpdateBar() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const { isUpdatePending } = Updates.useUpdates();
  const [restarting, setRestarting] = useState(false);

  // Coming back to the front: look for a newer version (the start-up check only runs on a fresh start).
  useEffect(() => {
    if (!Updates.isEnabled) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void checkAndDownload().catch(() => undefined);
    });
    return () => sub.remove();
  }, []);

  if (!Updates.isEnabled || !isUpdatePending) return null;
  return (
    <View style={{ position: 'absolute', top: insets.top + 6, left: space.md, right: space.md, zIndex: 50 }}>
      <Pressable
        disabled={restarting}
        onPress={() => {
          setRestarting(true);
          void Updates.reloadAsync().catch(() => setRestarting(false));
        }}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.sm,
          backgroundColor: p.brand,
          borderRadius: 14,
          paddingVertical: 10,
          paddingHorizontal: 14,
          opacity: pressed ? 0.8 : 1,
          elevation: 6,
        })}>
        <Text style={{ fontSize: 18 }}>✨</Text>
        <Text style={{ flex: 1, color: p.onBrand, fontWeight: '700' }}>A new version of Anwarz is ready</Text>
        <Text style={{ color: p.onBrand, fontWeight: '800' }}>{restarting ? 'Restarting…' : 'Restart ›'}</Text>
      </Pressable>
    </View>
  );
}

/** More → This phone: which version is running, and a manual check. */
export function UpdateCard() {
  const p = usePalette();
  const { currentlyRunning, isUpdatePending } = Updates.useUpdates();
  const [state, setState] = useState<'idle' | 'checking' | 'latest' | 'error'>('idle');

  const check = async () => {
    setState('checking');
    try {
      const found = await checkAndDownload();
      setState(found ? 'idle' : 'latest'); // when found, isUpdatePending turns on and the Restart button shows
    } catch {
      setState('error');
    }
  };

  if (!Updates.isEnabled) {
    return <T variant="small">Updates: off here (Expo Go / development).</T>;
  }
  const running = currentlyRunning.isEmbeddedLaunch ? 'the version installed with the APK' : `the update of ${dateTime(currentlyRunning.createdAt?.toISOString() ?? null)}`;
  return (
    <Card>
      <Row>
        <T style={{ flex: 1, fontWeight: '700' }}>✨ App updates</T>
        {isUpdatePending ? <Text style={{ color: p.ok, fontWeight: '700' }}>Ready</Text> : null}
      </Row>
      <T variant="small">{`Running ${running}.`}</T>
      {isUpdatePending ? (
        <Button title="Restart into the new version" small tone="ok" onPress={() => void Updates.reloadAsync()} />
      ) : (
        <Button
          title={state === 'checking' ? 'Checking…' : state === 'latest' ? '✓ Up to date · check again' : state === 'error' ? 'Couldn’t check · try again' : 'Check for updates'}
          small
          kind="outline"
          busy={state === 'checking'}
          onPress={() => void check()}
        />
      )}
    </Card>
  );
}
