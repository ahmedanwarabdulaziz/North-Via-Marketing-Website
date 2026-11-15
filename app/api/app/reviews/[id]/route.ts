import { AppError, appRoute, jsonBody } from '@/lib/app-auth';
import { appReview, clientNames } from '@/lib/app-api';
import { getStoredReview, postApprovedReply, regenerateReviewDraft, setReviewDraft, skipStoredReview } from '@/lib/review-engine';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

async function load(params: Ctx['params']) {
  const { id } = await params;
  const review = await getStoredReview(id);
  if (!review) throw new AppError('Review not found.', 404);
  return { ...review, id };
}

export const GET = appRoute<Ctx>(async (_request, _device, { params }) => ({ review: appReview(await load(params), await clientNames()) }));

/**
 * Same steps as the Telegram review card; nothing goes to Google without "approve".
 *   approve { text? }   post the reply (with text: Ahmed's edited version is saved first)
 *   save    { text }    keep an edited draft without posting
 *   regenerate          a new AI draft
 *   skip                no reply will be posted
 */
export const POST = appRoute<Ctx>(async (request, _device, { params }) => {
  const review = await load(params);
  const body = await jsonBody<{ action?: unknown; text?: unknown }>(request);
  const pending = review.status === 'draft_ready' || review.status === 'needs_draft';
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  const reply = async () => ({ review: appReview({ ...(await getStoredReview(review.id))!, id: review.id }, await clientNames()) });

  if (!pending) throw new AppError(review.status === 'skipped' ? 'This review was skipped.' : 'This review already has a reply.', 409);

  switch (body.action) {
    case 'approve': {
      if (text) await setReviewDraft(review.id, text);
      const final = text || review.draft;
      if (!final) throw new AppError('Write a reply first.');
      try {
        await postApprovedReply(review.id, final);
      } catch (error) {
        throw new AppError(`Not posted. ${error instanceof Error ? error.message : String(error)}`.slice(0, 300), 502);
      }
      return reply();
    }
    case 'save':
      if (!text) throw new AppError('The reply is empty.');
      await setReviewDraft(review.id, text);
      return reply();
    case 'regenerate':
      try {
        await regenerateReviewDraft(review.id);
      } catch (error) {
        throw new AppError(`The AI couldn’t write a draft right now. ${error instanceof Error ? error.message : ''}`.slice(0, 300), 503);
      }
      return reply();
    case 'skip':
      await skipStoredReview(review.id);
      return reply();
    default:
      throw new AppError('Unknown action.');
  }
});
