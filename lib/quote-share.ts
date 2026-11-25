import crypto from 'crypto';

// A signed link to one quote/invoice, so the Anwarz app can open its preview (PDF, WhatsApp, email)
// in a browser without an admin sign-in. The signature stops anyone guessing other documents' links.

function signature(id: string) {
  return crypto.createHmac('sha256', process.env.SESSION_SECRET || '').update(`quote-doc:${id}`).digest('base64url').slice(0, 26);
}

export function quoteShareLink(origin: string, id: string) {
  return `${origin}/doc/${encodeURIComponent(id)}?s=${signature(id)}`;
}

export function verifyQuoteShare(id: string, sig: string | null | undefined) {
  if (!process.env.SESSION_SECRET || !sig) return false;
  const expected = Buffer.from(signature(id));
  const given = Buffer.from(sig);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}
