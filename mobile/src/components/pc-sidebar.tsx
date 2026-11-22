import { router, usePathname, type Href } from 'expo-router';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import { radius, space, usePalette } from '@/lib/theme';

// The PC version's left sidebar: every section one click away (the phone uses the bottom tabs and the
// Home icons). Shown when the window is wide enough; narrow windows keep the phone layout.

export const SIDEBAR_MIN_WIDTH = 860;

export function useWideScreen() {
  return useWindowDimensions().width >= SIDEBAR_MIN_WIDTH;
}

const MAIN: { icon: string; label: string; href: string }[] = [
  { icon: '🏠', label: 'Home', href: '/' },
  { icon: '💬', label: 'Chat', href: '/chat' },
  { icon: '✅', label: 'Tasks', href: '/tasks' },
  { icon: '📧', label: 'Inbox', href: '/inbox' },
  { icon: '⭐', label: 'Reviews', href: '/reviews' },
  { icon: '📚', label: 'Library', href: '/library' },
  { icon: '📈', label: 'Marketing', href: '/marketing' },
  { icon: '🛋', label: 'JL Comfort', href: '/jl' },
  { icon: '👥', label: 'Clients', href: '/clients' },
  { icon: '🔗', label: 'Quick links', href: '/links' },
];

const SETTINGS: { icon: string; label: string; href: string }[] = [
  { icon: '🔌', label: 'Connections', href: '/connections' },
  { icon: '📱', label: 'Facebook & Instagram', href: '/social' },
  { icon: '🔔', label: 'Notifications', href: '/sounds' },
  { icon: '✍️', label: 'Writing modes', href: '/writing' },
  { icon: '⚙️', label: 'More', href: '/more' },
];

export function PcSidebar() {
  const p = usePalette();
  const path = usePathname();
  const active = (href: string) => (href === '/' ? path === '/' : path === href || path.startsWith(`${href}/`)) || (href === '/clients' && path.startsWith('/client/'));

  const item = (x: { icon: string; label: string; href: string }) => {
    const on = active(x.href);
    return (
      <Pressable
        key={x.href}
        onPress={() => router.navigate(x.href as Href)}
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.sm,
          paddingVertical: 9,
          paddingHorizontal: space.md,
          borderRadius: radius.md,
          backgroundColor: on ? p.brandSoft : hovered ? p.bg : 'transparent',
          opacity: pressed ? 0.7 : 1,
        })}>
        <Text style={{ fontSize: 17, width: 24, textAlign: 'center' }}>{x.icon}</Text>
        <Text style={{ color: on ? p.brand : p.text, fontWeight: on ? '800' : '600', fontSize: 15 }}>{x.label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={{ width: 230, backgroundColor: p.card, borderRightWidth: 1, borderRightColor: p.border }}>
      <ScrollView contentContainerStyle={{ padding: space.md, gap: 2 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: p.brand, paddingHorizontal: space.md, paddingVertical: space.md }}>Anwarz</Text>
        <Pressable
          onPress={() => router.navigate('/task/new' as Href)}
          style={({ pressed }) => ({ backgroundColor: p.brand, borderRadius: radius.md, paddingVertical: 10, alignItems: 'center', marginBottom: space.sm, opacity: pressed ? 0.8 : 1 })}>
          <Text style={{ color: p.onBrand, fontWeight: '800' }}>＋ New task</Text>
        </Pressable>
        {MAIN.map(item)}
        <View style={{ height: 1, backgroundColor: p.border, marginVertical: space.sm }} />
        {SETTINGS.map(item)}
      </ScrollView>
    </View>
  );
}
