import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/lib/auth';
import { usePalette } from '@/lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function RootStack() {
  const { ready, signedIn } = useAuth();
  const p = usePalette();

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  if (!ready) return null;
  return (
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
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
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
