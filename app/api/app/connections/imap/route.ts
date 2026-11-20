import { AppError, appRoute, jsonBody } from '@/lib/app-auth';
import { encryptString } from '@/lib/encryption';
import { KNOWN_IMAP, testImapAccount, type ImapSettings } from '@/lib/email/imap';
import { isEmailAddress, saveImapAccount } from '@/lib/email/inbox';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const host = (v: unknown) => (typeof v === 'string' && /^[a-z0-9.-]{3,253}$/i.test(v.trim()) ? v.trim().toLowerCase() : null);
const port = (v: unknown, fallback: number) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 && n < 65536 ? n : fallback;
};

/** The ready-made server settings the form can fill in (Purelymail…). */
export const GET = appRoute(async () => ({
  presets: Object.entries(KNOWN_IMAP).map(([id, p]) => ({ id, name: p.name, imapHost: p.imapHost, imapPort: p.imapPort, smtpHost: p.smtpHost, smtpPort: p.smtpPort })),
}));

/**
 * Connects an IMAP mailbox: { email, password, preset? | imapHost, imapPort, smtpHost, smtpPort, username? }.
 * Signs in to both servers first; only a working mailbox is saved (password encrypted).
 */
export const POST = appRoute(async (request) => {
  const body = await jsonBody<{ email?: unknown; password?: unknown; preset?: unknown; imapHost?: unknown; imapPort?: unknown; smtpHost?: unknown; smtpPort?: unknown; username?: unknown }>(request);
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!isEmailAddress(email)) throw new AppError('Type the full email address.');
  const password = typeof body.password === 'string' ? body.password : '';
  if (password.length < 4 || password.length > 500) throw new AppError('Type the password (an app password is best).');

  const preset = typeof body.preset === 'string' ? KNOWN_IMAP[body.preset] : undefined;
  const settings: ImapSettings = {
    imapHost: host(body.imapHost) || preset?.imapHost || '',
    imapPort: port(body.imapPort, preset?.imapPort || 993),
    smtpHost: host(body.smtpHost) || preset?.smtpHost || '',
    smtpPort: port(body.smtpPort, preset?.smtpPort || 465),
    username: typeof body.username === 'string' && body.username.trim() ? body.username.trim() : email,
  };
  if (!settings.imapHost || !settings.smtpHost) throw new AppError('Pick the provider or type the IMAP and SMTP servers.');

  try {
    await testImapAccount(email, password, settings);
  } catch (error) {
    throw new AppError(error instanceof Error ? error.message : String(error), 400);
  }
  const id = await saveImapAccount(email, encryptString(password), settings);
  return { ok: true, id, message: `${email} is connected. New mail is checked every 5 minutes.` };
});
