import { NativeTabs } from 'expo-router/native-tabs';

import { usePalette } from '@/lib/theme';

// Android/iOS: the phone's own bottom tab bar. (app-tabs.web.tsx is the web preview's.)
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
      <NativeTabs.Trigger name="clients">
        <NativeTabs.Trigger.Label>Clients</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.2.fill" md="groups" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="more">
        <NativeTabs.Trigger.Label>More</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="ellipsis.circle" md="menu" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
