import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { useAuth } from '@/lib/auth';
import { space } from '@/lib/theme';

import { Button, T } from './ui';

/** Shown over everything while the fingerprint lock is on; asks for the fingerprint straight away. */
export function LockScreen() {
  const { unlock, signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const asked = useRef(false);

  const tryUnlock = async () => {
    setBusy(true);
    await unlock();
    setBusy(false);
  };

  useEffect(() => {
    if (asked.current) return;
    asked.current = true;
    // Prompt once on open; the button asks again.
    const t = setTimeout(() => void tryUnlock(), 300);
    return () => clearTimeout(t);
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#274290', justifyContent: 'center', padding: space.xl, gap: space.xl }}>
      <View style={{ alignItems: 'center', gap: space.sm }}>
        <Text style={{ fontSize: 56 }}>🔒</Text>
        <T variant="title" color="#FFFFFF" style={{ fontSize: 30, fontWeight: '800' }}>
          Anwarz
        </T>
        <T color="#DCE3F5">Locked. Use your fingerprint to open.</T>
      </View>
      <Button title="👆 Unlock with fingerprint" kind="soft" busy={busy} onPress={tryUnlock} />
      <Pressable
        onPress={() =>
          Alert.alert('Sign in with the password?', 'This signs Anwarz out on this phone; you sign in again with the password.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
          ])
        }
        style={{ alignSelf: 'center', padding: space.md }}>
        <Text style={{ color: '#DCE3F5', fontWeight: '700' }}>Use the password instead</Text>
      </Pressable>
    </View>
  );
}
