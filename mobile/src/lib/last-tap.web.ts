import type * as Notifications from 'expo-notifications';

/** PC version: Windows notifications open their page themselves (web/sw.js), so there's nothing to read here. */
export const useLastTap = (): Notifications.NotificationResponse | null | undefined => null;
