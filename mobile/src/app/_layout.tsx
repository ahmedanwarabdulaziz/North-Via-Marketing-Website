import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { LockScreen } from '@/components/lock-screen';
import { UpdateBar } from '@/components/update-bar';
import { UrgentPopup } from '@/components/urgent-popup';
import { AuthProvider, useAuth } from '@/lib/auth';
// Imported here, at the top level, so the background task for notification buttons is defined
// before Android delivers a button press to a closed app.
import { listenForTaps, markSeen, openAlert, registerForPush, setUpNotifications } from '@/lib/notifications';
import { usePalette } from '@/lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function RootStack() {
  const { ready, signedIn, locked } = useAuth();
  const p = usePalette();

  const lastTap = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  // Notification channels (sounds) exist from the first start, signed in or not.
  useEffect(() => {
    void setUpNotifications().catch(() => undefined);
  }, []);

  // Signed in: this phone gets alerts, and a tap opens the right screen.
  useEffect(() => {
    if (!ready || !signedIn) return;
    void registerForPush().catch(() => undefined);
    return listenForTaps();
  }, [ready, signedIn]);

  // The app was opened by tapping a notification while it was closed.
  useEffect(() => {
    if (!ready || !signedIn || !lastTap || lastTap.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const data = lastTap.notification.request.content.data as { type?: string; id?: string; alertId?: string } | undefined;
    if (data?.alertId) void markSeen(data.alertId);
    openAlert({ type: data?.type, id: data?.id });
    Notifications.clearLastNotificationResponse();
  }, [ready, signedIn, lastTap]);

  if (!ready) return null;
  if (signedIn && locked) return <LockScreen />;
  return (
    <>
      {signedIn ? <UrgentPopup /> : null}
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: p.card },
          headerTintColor: p.brand,
          headerTitleStyle: { color: p.text, fontWeight: '700' },
          contentStyle: { backgroundColor: p.bg },
        }}>
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="task/[id]" options={{ title: 'Task' }} />
          <Stack.Screen name="task/new" options={{ title: 'New task', presentation: 'modal' }} />
          <Stack.Screen name="email/[id]" options={{ title: 'Email' }} />
          <Stack.Screen name="client/[id]" options={{ title: 'Client' }} />
          <Stack.Screen name="more" options={{ title: 'More' }} />
          <Stack.Screen name="clients" options={{ title: 'Clients' }} />
          <Stack.Screen name="share" options={{ title: 'Shared to Anwarz' }} />
          <Stack.Screen name="links" options={{ title: 'Quick links' }} />
          <Stack.Screen name="jl" options={{ title: 'JL Comfort' }} />
          <Stack.Screen name="sounds" options={{ title: 'Notifications' }} />
          <Stack.Screen name="writing" options={{ title: 'Writing modes' }} />
          <Stack.Screen name="marketing" options={{ title: 'Marketing' }} />
          <Stack.Screen name="library" options={{ headerShown: false }} />
          <Stack.Screen name="connections" options={{ title: 'Connections' }} />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
      <UpdateBar />
    </>
  );
}

export default function RootLayout() {
  const scheme = useColorScheme();
  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <RootStack />
      </AuthProvider>
    </ThemeProvider>
  );
}
