import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, View } from 'react-native';

import { Button, Card, Input, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { biometricAvailable, biometricOffered, markBiometricOffered, setBiometricEnabled, unlockWithBiometric } from '@/lib/biometric';
import { space, usePalette } from '@/lib/theme';

/** After the first password sign-in: offer to open Anwarz with the fingerprint from now on. */
async function offerFingerprint() {
  if ((await biometricOffered()) || !(await biometricAvailable())) return;
  await markBiometricOffered();
  Alert.alert('Use your fingerprint?', 'Open Anwarz with your fingerprint instead of the password. You can change this in More.', [
    { text: 'Not now', style: 'cancel' },
    {
      text: 'Use fingerprint',
      onPress: async () => {
        if (await unlockWithBiometric('Confirm your fingerprint')) await setBiometricEnabled(true);
      },
    },
  ]);
}

export default function Login() {
  const { signIn } = useAuth();
  const p = usePalette();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!password) return;
    setBusy(true);
    setError(null);
    try {
      await signIn(password);
      await offerFingerprint();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPassword('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: p.brand, justifyContent: 'center', padding: space.xl }}>
      <View style={{ maxWidth: 420, width: '100%', alignSelf: 'center', gap: space.lg }}>
        <View style={{ gap: space.xs }}>
          <T variant="title" color="#FFFFFF" style={{ fontSize: 34, fontWeight: '800' }}>
            Anwarz
          </T>
          <T color="#DCE3F5">North Via Marketing control center</T>
        </View>
        <Card>
          <T variant="heading">Sign in</T>
          <T variant="small">Use the same password as the website admin panel.</T>
          <Input
            value={password}
            onChangeText={setPassword}
            placeholder="Password (numbers)"
            secureTextEntry
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={12}
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={submit}
            returnKeyType="go"
          />
          {error ? <T color={p.danger}>{error}</T> : null}
          <Button title="Sign in" onPress={submit} busy={busy} disabled={!password} />
        </Card>
      </View>
    </KeyboardAvoidingView>
  );
}
