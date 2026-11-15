import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { Button, Card, Input, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { space, usePalette } from '@/lib/theme';

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
            placeholder="Admin password"
            secureTextEntry
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
