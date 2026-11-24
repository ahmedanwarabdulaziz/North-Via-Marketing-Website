import { DarkTheme, DefaultTheme, Stack, ThemeProvider, router, type Href } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { LockScreen } from '@/components/lock-screen';
import { PcSidebar, useWideScreen } from '@/components/pc-sidebar';
import { UpdateBar } from '@/components/update-bar';
import { WebUpdater } from '@/components/web-updater';
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
  const wide = useWideScreen();

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
  // Locked: the fingerprint screen covers the app instead of replacing it, so whatever opened the
  // app (a share from another app, a notification) is still there once he unlocks.
  const lockedNow = signedIn && locked;
  // PC (web): a sidebar with every section when the window is wide, and a Back button on inner pages
  // (the installed app has no browser Back button).
  const sidebar = isPc && wide && signedIn;
  const back = () => (router.canGoBack() ? router.back() : router.navigate('/' as Href));
  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: p.bg }}>
      {sidebar ? <PcSidebar /> : null}
      <View style={isPc ? { flex: 1, maxWidth: 1100, alignSelf: 'stretch', marginHorizontal: 'auto', width: '100%', backgroundColor: p.bg } : { flex: 1 }}>
        {signedIn && !lockedNow ? <UrgentPopup /> : null}
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: p.card },
            headerTintColor: p.brand,
            headerTitleStyle: { color: p.text, fontWeight: '700' },
            contentStyle: { backgroundColor: p.bg },
            ...(isPc
              ? {
                  headerLeft: () => (
                    <Pressable onPress={back} style={({ pressed }) => ({ paddingHorizontal: 12, paddingVertical: 6, opacity: pressed ? 0.6 : 1 })}>
                      <Text style={{ color: p.brand, fontWeight: '700', fontSize: 15 }}>‹ Back</Text>
                    </Pressable>
                  ),
                }
              : {}),
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
            <Stack.Screen name="connections" options={{ title: 'Mail connections' }} />
            <Stack.Screen name="social" options={{ title: 'Social media' }} />
            <Stack.Screen name="accounts" options={{ title: 'Google & Ads' }} />
            <Stack.Screen name="chat-log" options={{ title: 'Chat log' }} />
          </Stack.Protected>
          <Stack.Protected guard={!signedIn}>
            <Stack.Screen name="login" options={{ headerShown: false }} />
          </Stack.Protected>
        </Stack>
        <UpdateBar />
        <WebUpdater />
      </View>
      {lockedNow ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }}>
          <LockScreen />
        </View>
      ) : null}
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
