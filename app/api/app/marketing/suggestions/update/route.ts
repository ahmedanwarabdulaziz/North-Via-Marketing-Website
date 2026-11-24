import { AppError, appRoute, jsonBody } from '@/lib/app-auth';
import { draftClientUpdate, markNotified, sendClientUpdateEmail } from '@/lib/ads-client-update';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Telling the client what changed in their Google Ads. Nothing is sent without Ahmed's tap.
 *   { action: 'draft', clientId, ids? }                      the message, phone and email, ready to review
 *   { action: 'sent', ids }                                  WhatsApp was opened: mark those changes as told
 *   { action: 'email', ids, to, subject, text }              send the (edited) message by email, then mark as told
 */
export const POST = appRoute(async (request) => {
  const body = await jsonBody<{ action?: unknown; clientId?: unknown; ids?: unknown; to?: unknown; subject?: unknown; text?: unknown }>(request);
  const ids = Array.isArray(body.ids) ? body.ids.filter((x): x is string => typeof x === 'string') : [];
  try {
    if (body.action === 'draft') {
      if (typeof body.clientId !== 'string') throw new AppError('clientId is required.');
      const update = await draftClientUpdate(body.clientId, ids.length ? ids : undefined);
      return { update };
    }
    if (body.action === 'sent') {
      await markNotified(ids);
      return { ok: true };
    }
    if (body.action === 'email') {
      const to = typeof body.to === 'string' ? body.to.trim() : '';
      const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
      const text = typeof body.text === 'string' ? body.text.trim() : '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw new AppError('Enter a valid email address.');
      if (!subject || !text) throw new AppError('The subject and message can’t be empty.');
      await sendClientUpdateEmail({ to, subject, text });
      await markNotified(ids);
      return { ok: true };
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(error instanceof Error ? error.message : 'That failed.', 400);
  }
  throw new AppError('Unknown action.');
});
