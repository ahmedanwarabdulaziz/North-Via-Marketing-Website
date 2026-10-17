import crypto from 'crypto';

// "Forward to WhatsApp" buttons in Telegram. A Telegram button can't carry a long
// prefilled text, so it opens a short signed link on our site, which builds the
// text from the current review data and redirects to WhatsApp's share screen.
// The signature stops anyone from reading reviews or drafts by guessing ids.

const SITE = 'https://www.northviamarketing.com';
export type ShareKind = 'r' | 'b'; // r = one review (shortRef), b = a 5★ list (batch id)

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
  if ((kind !== 'r' && kind !== 'b') || !id || !sig) return false;
  const expected = Buffer.from(signature(kind, id));
  const given = Buffer.from(sig);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

/** WhatsApp's share screen with the text filled in; the user picks the chat. */
export function whatsAppComposeUrl(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
