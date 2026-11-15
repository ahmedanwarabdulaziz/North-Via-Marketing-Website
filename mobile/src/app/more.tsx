import Constants from 'expo-constants';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Alert } from 'react-native';

import { Button, Card, Screen, Section, T } from '@/components/ui';
import { API_URL, api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/use-api';

interface DeviceInfo {
  id: string;
  name: string | null;
  hasPushToken: boolean;
  pushConfigured: boolean;
  createdAt: string;
}

const PANEL_PAGES = [
  { title: 'Reviews', path: '/admin/reviews' },
  { title: 'Competitors', path: '/admin/competitors' },
  { title: 'Ads', path: '/admin/ads' },
  { title: 'Library', path: '/admin/library' },
  { title: 'Memory', path: '/admin/memory' },
  { title: 'Invoices', path: '/admin/invoices' },
  { title: 'Settings', path: '/admin/settings' },
];

export default function More() {
  const { signOut } = useAuth();
  const device = useApi<DeviceInfo>('/device');
  const [testing, setTesting] = useState(false);

  const testPush = async () => {
    setTesting(true);
    try {
      const result = await api<{ ok: boolean; sent: number }>('/device', { body: { test: true } });
      Alert.alert('Push test', result.ok ? 'Sent. A notification should appear in a few seconds.' : 'Not sent: this phone isn’t registered for push yet. Open Anwarz once with notifications allowed (the new APK).');
    } catch (e) {
      Alert.alert('Push test', e instanceof Error ? e.message : String(e));
    } finally {
      setTesting(false);
    }
  };

  const confirmSignOut = () =>
    Alert.alert('Sign out?', 'This phone will stop getting Anwarz alerts until you sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);

  return (
    <Screen padTop={false}>
      <Section title="Admin panel">
        <T variant="small">These open the website’s admin pages. They move into the app step by step.</T>
        {PANEL_PAGES.map((page) => (
          <Button key={page.path} title={page.title} kind="outline" onPress={() => WebBrowser.openBrowserAsync(`${API_URL}${page.path}`)} />
        ))}
      </Section>

      <Section title="This phone">
        <Card>
          <T>{device.data?.name || 'Phone'}</T>
          <T variant="small">
            {device.data
              ? device.data.hasPushToken
                ? '🔔 Push notifications on'
                : '🔕 Push notifications not set up yet'
              : 'Loading…'}
          </T>
          <T variant="small">{`App ${Constants.expoConfig?.version ?? ''} · ${API_URL.replace(/^https?:\/\//, '')}`}</T>
          <Button title="🔔 Notification sounds" kind="soft" small onPress={() => router.push('/sounds')} />
          <Button title="Send a test from the website" kind="outline" small busy={testing} onPress={testPush} />
        </Card>
        <Button title="Sign out" tone="danger" kind="outline" onPress={confirmSignOut} />
      </Section>
    </Screen>
  );
}
