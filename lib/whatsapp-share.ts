import crypto from 'crypto';

// "Forward to WhatsApp" buttons in Telegram. A Telegram button can't carry a long
// prefilled text, so it opens a short signed link on our site, which builds the
// text from the current review data and redirects to WhatsApp's share screen.
// The signature stops anyone from reading reviews or drafts by guessing ids.

const SITE = 'https://www.northviamarketing.com';
export type ShareKind = 'r' | 'b' | 'p'; // r = one review (shortRef), b = a 5★ list (batch id), p = a client report

function signature(kind: ShareKind, id: string) {
  return crypto
    .createHmac('sha256', process.env.SESSION_SECRET || '')
    .update(`wa:${kind}:${id}`)
    .digest('base64url')
    .slice(0, 22);
}

export function whatsAppShareLink(kind: ShareKind, id: string) {
  return `${SITE}/api/telegram/share?k=${kind}&id=${encodeURIComponent(id)}&s=${signature(kind, id)}`;
}

export function verifyShareLink(kind: string | null, id: string | null, sig: string | null): kind is ShareKind {
  if ((kind !== 'r' && kind !== 'b' && kind !== 'p') || !id || !sig) return false;
  const expected = Buffer.from(signature(kind, id));
  const given = Buffer.from(sig);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

/** WhatsApp with the text filled in: straight to `phone`'s chat when given, otherwise the user picks one. */
export function whatsAppComposeUrl(text: string, phone?: string | null) {
  return `https://wa.me/${phone || ''}?text=${encodeURIComponent(text)}`;
}

/**
 * International digits for wa.me, or null when the number is ambiguous.
 * "+…"/"00…" are used as given; 01XXXXXXXXX is Egyptian; 10 digits is Canada/US.
 */
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
