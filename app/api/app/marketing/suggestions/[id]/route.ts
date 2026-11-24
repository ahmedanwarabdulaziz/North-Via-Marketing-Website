import { AppError, appRoute, jsonBody } from '@/lib/app-auth';
import { clientNames } from '@/lib/app-api';
import { applySuggestion, rejectSuggestion, undoSuggestion } from '@/lib/ads-apply';
import { appSuggestion } from '../route';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

/**
 * One idea. Nothing changes in Google Ads until "accept".
 *   accept { text?, matchType?, level? }  apply it (with Ahmed's edits) to the real account
 *   reject                                 not now, and it won't be proposed again
 *   undo                                   remove what an accepted change created
 */
export const POST = appRoute<Ctx>(async (request, _device, { params }) => {
  const { id } = await params;
  const body = await jsonBody<{ action?: unknown; text?: unknown; matchType?: unknown; level?: unknown }>(request);
  try {
    let row;
    if (body.action === 'accept') {
      const matchType = body.matchType === 'EXACT' || body.matchType === 'PHRASE' || body.matchType === 'BROAD' ? body.matchType : undefined;
      row = await applySuggestion(id, {
        text: typeof body.text === 'string' ? body.text : undefined,
        matchType,
        level: body.level === 'ad_group' ? 'ad_group' : 'campaign',
      });
    } else if (body.action === 'reject') row = await rejectSuggestion(id);
    else if (body.action === 'undo') row = await undoSuggestion(id);
    else throw new AppError('Unknown action.');
    return { suggestion: appSuggestion(row, await clientNames()) };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(error instanceof Error ? error.message : 'That failed.', 400);
  }
});
