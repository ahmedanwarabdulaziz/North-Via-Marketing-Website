import { Linking } from 'react-native';

// Forwarding anything to WhatsApp with the message ready. With a phone number it opens that person's
// chat directly; without one, WhatsApp asks which chat. Same number rules as the website
// (lib/whatsapp-share.ts): "+…"/"00…" as given, 01XXXXXXXXX Egyptian, 10 digits Canada/US.

export function whatsAppNumber(raw?: string | null) {
  if (!raw) return null;
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (trimmed.startsWith('+')) return digits.length >= 8 ? digits : null;
  if (digits.startsWith('00')) return digits.length >= 10 ? digits.slice(2) : null;
  if (/^01\d{9}$/.test(digits)) return `20${digits.slice(1)}`;
  if (/^[2-9]\d{9}$/.test(digits)) return `1${digits}`;
  if (/^1[2-9]\d{9}$/.test(digits)) return digits;
  return null;
}

/** Opens WhatsApp with `text`, in `phone`'s chat when it's a usable number. */
export async function openWhatsApp(text: string, phone?: string | null) {
  const number = whatsAppNumber(phone);
  const message = encodeURIComponent(text.slice(0, 3500));
  const app = number ? `whatsapp://send?phone=${number}&text=${message}` : `whatsapp://send?text=${message}`;
  try {
    await Linking.openURL(app);
  } catch {
    await Linking.openURL(`https://wa.me/${number || ''}?text=${message}`);
  }
}

/** Opens a link the website signed for WhatsApp sharing (it builds the message and redirects). */
export async function openShareLink(url: string) {
  await Linking.openURL(url);
}

const trim = (s: string | null | undefined, n: number) => {
  const t = (s || '').trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

export { trim as trimText };
