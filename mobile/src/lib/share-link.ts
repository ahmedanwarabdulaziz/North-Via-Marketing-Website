import * as Clipboard from 'expo-clipboard';
import { Alert, Linking, Share } from 'react-native';

import { api } from './api';
import type { QuickLink } from './types';

// Sharing a quick link: the message (if any) then the link, ready to send.

export function linkText(link: Pick<QuickLink, 'message' | 'url'>) {
  return link.message ? `${link.message}\n${link.url}` : link.url;
}

function counted(link: QuickLink) {
  void api('/links', { body: { action: 'used', id: link.id } }).catch(() => undefined);
}

/** Android's share menu with the text ready (any app: WhatsApp, Messenger, email…). */
export async function shareLink(link: QuickLink) {
  const result = await Share.share({ message: linkText(link) }).catch(() => null);
  if (result && result.action !== Share.dismissedAction) counted(link);
}

/** Straight into WhatsApp; you pick the chat there. */
export async function whatsAppLink(link: QuickLink) {
  const url = `whatsapp://send?text=${encodeURIComponent(linkText(link))}`;
  try {
    await Linking.openURL(url);
  } catch {
    await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(linkText(link))}`);
  }
  counted(link);
}

export async function copyLink(link: QuickLink) {
  await Clipboard.setStringAsync(linkText(link));
  counted(link);
  Alert.alert('Copied 📋', link.message ? 'Message and link copied.' : 'Link copied.');
}
