import { useEffect, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { usePalette } from '@/lib/theme';

// The PC version (web) keeps itself up to date. Each build has an id (EXPO_PUBLIC_WEB_BUILD, set by
// scripts/publish-web.js, which also writes /app/version.json). Every 5 minutes, and whenever he
// comes back to the window, the app reads version.json; when a newer build is out it reloads by
// itself if the window is in the background, or shows "New version ready · Reload" if he's using it
// (so a reload never loses something he's typing). It reloads anyway the next time he leaves the window.

const BUILD = process.env.EXPO_PUBLIC_WEB_BUILD || '';
const EVERY_MS = 5 * 60_000;

async function newerBuild(): Promise<boolean> {
  try {
    const res = await fetch(`/app/version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return false;
    const { build } = (await res.json()) as { build?: string };
    return Boolean(build && build !== BUILD);
  } catch {
    return false; // offline: try again later
  }
}

export function WebUpdater() {
  const p = usePalette();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || !BUILD || typeof document === 'undefined') return;
    let found = false;
    const check = async () => {
      if (found || !(await newerBuild())) return;
      found = true;
      if (document.visibilityState === 'hidden') window.location.reload();
      else setReady(true);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden' && found) window.location.reload(); // he left: update now
      else if (document.visibilityState === 'visible') void check();
    };
    const timer = setInterval(() => void check(), EVERY_MS);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onVisibility);
    void check();
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onVisibility);
    };
  }, []);

  if (!ready) return null;
  return (
    <View style={{ position: 'absolute', bottom: 18, left: 0, right: 0, alignItems: 'center', zIndex: 60, pointerEvents: 'box-none' }}>
      <Pressable
        onPress={() => window.location.reload()}
        style={({ hovered }: { pressed: boolean; hovered?: boolean }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          backgroundColor: hovered ? '#1e3473' : p.brand,
          borderRadius: 999,
          paddingVertical: 10,
          paddingHorizontal: 18,
          boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
        })}>
        <Text style={{ color: '#fff', fontWeight: '700' }}>✨ A new version of Anwarz is ready</Text>
        <Text style={{ color: '#fff', fontWeight: '800', textDecorationLine: 'underline' }}>Reload</Text>
      </Pressable>
    </View>
  );
}
