import { NativeTabs } from 'expo-router/native-tabs';

import { usePalette } from '@/lib/theme';

// Android/iOS: the phone's own bottom tab bar (Android allows 5 tabs; Clients opens from Home).
// app-tabs.web.tsx is the web preview's.
export default function AppTabs() {
  const p = usePalette();
  return (
    <NativeTabs backgroundColor={p.card} indicatorColor={p.brandSoft} labelStyle={{ selected: { color: p.brand } }} iconColor={{ selected: p.brand }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="tasks">
        <NativeTabs.Trigger.Label>Tasks</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="checklist" md="task_alt" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="inbox">
        <NativeTabs.Trigger.Label>Inbox</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="envelope.fill" md="mail" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="reviews">
        <NativeTabs.Trigger.Label>Reviews</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="star.fill" md="star" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="library">
        <NativeTabs.Trigger.Label>Library</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="books.vertical.fill" md="local_library" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
