import * as Notifications from 'expo-notifications';

/** The notification tap that opened the app (phone). The PC version has its own: last-tap.web.ts. */
export const useLastTap = () => Notifications.useLastNotificationResponse();
