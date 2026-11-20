import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, Text, View } from 'react-native';

import { usePalette } from '@/lib/theme';

import { useWideScreen } from './pc-sidebar';

// Web preview only: a simple bottom bar in place of the phone's native tabs.
const TABS = [
  { name: 'index', href: '/', label: 'Home' },
  { name: 'tasks', href: '/tasks', label: 'Tasks' },
  { name: 'inbox', href: '/inbox', label: 'Inbox' },
  { name: 'reviews', href: '/reviews', label: 'Reviews' },
  { name: 'chat', href: '/chat', label: 'Chat' },
] as const;

function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  const p = usePalette();
  return (
    <Pressable {...(props as object)} style={{ flex: 1, alignItems: 'center', paddingVertical: 12 }}>
      <Text style={{ color: isFocused ? p.brand : p.muted, fontWeight: isFocused ? '800' : '600' }}>{children}</Text>
    </Pressable>
  );
}

export default function AppTabs() {
  const p = usePalette();
  // A wide PC window has the sidebar (pc-sidebar.tsx) instead of this bar.
  const wide = useWideScreen();
  return (
    <Tabs>
      <TabSlot style={{ flex: 1 }} />
      <TabList asChild>
        <View style={{ flexDirection: 'row', backgroundColor: p.card, borderTopWidth: 1, borderTopColor: p.border, display: wide ? 'none' : 'flex' }}>
          {TABS.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
              <TabButton>{tab.label}</TabButton>
            </TabTrigger>
          ))}
        </View>
      </TabList>
    </Tabs>
  );
}
