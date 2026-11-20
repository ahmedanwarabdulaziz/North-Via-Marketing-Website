import { useState } from 'react';
import { Alert, View } from 'react-native';

import { api } from '@/lib/api';
import { space, usePalette } from '@/lib/theme';
import { useApi } from '@/lib/use-api';

import { Back, BottomSheet, Note } from './sheet';
import { Button, Chip, ChipRow, Input, T } from './ui';

// More → Connections → "＋ Other email": an IMAP / SMTP mailbox such as Purelymail. He types the
// address and password (an app password is best); the website signs in to both servers before
// saving, and keeps the password encrypted. Other providers: "Other servers" shows the fields.

interface Preset {
  id: string;
  name: string;
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
}

export function ImapForm({ visible, email: startEmail, onClose, onDone }: { visible: boolean; email?: string; onClose: () => void; onDone: () => void }) {
  const p = usePalette();
  const { data } = useApi<{ presets: Preset[] }>(visible ? '/connections/imap' : null);
  const presets = data?.presets ?? [];
  const [preset, setPreset] = useState<string>('purelymail');
  const [email, setEmail] = useState(startEmail ?? '');
  const [password, setPassword] = useState('');
  const [custom, setCustom] = useState({ imapHost: '', imapPort: '993', smtpHost: '', smtpPort: '465', username: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const other = preset === 'other';

  const close = () => {
    setPassword('');
    setError(null);
    onClose();
  };

  const connect = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ message: string }>('/connections/imap', {
        body: other
          ? { email: email.trim(), password, imapHost: custom.imapHost, imapPort: Number(custom.imapPort), smtpHost: custom.smtpHost, smtpPort: Number(custom.smtpPort), username: custom.username || undefined }
          : { email: email.trim(), password, preset },
        timeoutMs: 60_000,
      });
      setPassword('');
      Alert.alert('Connected ✅', r.message);
      onDone();
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={close}>
      <T variant="title">Other email (IMAP)</T>
      <T variant="small">Purelymail and most other mailboxes (Zoho, Hostinger, your domain’s email…). Anwarz signs in to check that it works, then keeps the password encrypted.</T>

      <ChipRow>
        {presets.map((x) => (
          <Chip key={x.id} text={x.name} selected={preset === x.id} onPress={() => setPreset(x.id)} />
        ))}
        <Chip text="Other servers" selected={other} onPress={() => setPreset('other')} />
      </ChipRow>

      <Input value={email} onChangeText={setEmail} placeholder="Email address" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" />
      <Input value={password} onChangeText={setPassword} placeholder="Password (an app password is best)" secureTextEntry autoCapitalize="none" autoCorrect={false} />
      {preset === 'purelymail' ? <Note text="Tip: in Purelymail → Account settings → App passwords, make one called “Anwarz” and paste it here. You can revoke it any time." /> : null}

      {other ? (
        <View style={{ gap: space.sm }}>
          <T variant="label">Servers (from your email provider’s help page)</T>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Input value={custom.imapHost} onChangeText={(v) => setCustom({ ...custom, imapHost: v })} placeholder="IMAP server, e.g. imap.example.com" autoCapitalize="none" style={{ flex: 1 }} />
            <Input value={custom.imapPort} onChangeText={(v) => setCustom({ ...custom, imapPort: v })} placeholder="993" keyboardType="number-pad" style={{ width: 80 }} />
          </View>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Input value={custom.smtpHost} onChangeText={(v) => setCustom({ ...custom, smtpHost: v })} placeholder="SMTP server, e.g. smtp.example.com" autoCapitalize="none" style={{ flex: 1 }} />
            <Input value={custom.smtpPort} onChangeText={(v) => setCustom({ ...custom, smtpPort: v })} placeholder="465" keyboardType="number-pad" style={{ width: 80 }} />
          </View>
          <Input value={custom.username} onChangeText={(v) => setCustom({ ...custom, username: v })} placeholder="Username (only if it isn’t the email address)" autoCapitalize="none" />
        </View>
      ) : null}

      {error ? <T color={p.danger}>{error}</T> : null}
      <Button title="Connect" busy={busy} disabled={!email.includes('@') || password.length < 4 || (other && (!custom.imapHost || !custom.smtpHost))} onPress={() => void connect()} />
      <Back onPress={close} label="Cancel" />
    </BottomSheet>
  );
}
