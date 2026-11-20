import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { View } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { LockScreen } from '@/components/lock-screen';
import { UpdateBar } from '@/components/update-bar';
import { UrgentPopup } from '@/components/urgent-popup';
import { AuthProvider, useAuth } from '@/lib/auth';
// Imported here, at the top level, so the background task for notification buttons is defined
// before Android delivers a button press to a closed app.
import { listenForTaps, markSeen, openAlert, registerForPush, setUpNotifications } from '@/lib/notifications';
import '@/lib/web-alert'; // PC version: questions become the browser's own dialogs
import { useLastTap } from '@/lib/last-tap';
import { isPc, setUpPcNotifications } from '@/lib/pc';
import { usePalette } from '@/lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function RootStack() {
  const { ready, signedIn, locked } = useAuth();
  const p = usePalette();

  const lastTap = useLastTap();

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
    if (isPc) {
      void setUpPcNotifications(false).catch(() => undefined); // PC: refresh an existing subscription
      return;
    }
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
    // On a PC (the web version) the phone layout is centred, so it doesn't stretch across a wide window.
    <View style={isPc ? { flex: 1, width: '100%', maxWidth: 1100, alignSelf: 'center', backgroundColor: p.bg } : { flex: 1 }}>
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
          <Stack.Screen name="chat-log" options={{ title: 'Chat log' }} />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
      <UpdateBar />
    </View>
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
