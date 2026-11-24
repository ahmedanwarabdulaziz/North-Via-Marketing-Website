import { AppError, appRoute, jsonBody } from '@/lib/app-auth';
import { clientNames } from '@/lib/app-api';
import { applySuggestion, rejectSuggestion, undoSuggestion } from '@/lib/ads-apply';
import { appSuggestion } from '../route';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

/**
 * One idea. Nothing changes in Google Ads until "accept".
 *   accept { text?, matchType?, level?, value?, headlines?, descriptions? }  apply it (with Ahmed's edits) to the real account
 *                                          (an advisory has nothing to apply: accept just dismisses it)
 *   reject                                 not now, and it won't be proposed again
 *   undo                                   remove what an accepted change created
 */
export const POST = appRoute<Ctx>(async (request, _device, { params }) => {
  const { id } = await params;
  const body = await jsonBody<{ action?: unknown; text?: unknown; matchType?: unknown; level?: unknown; value?: unknown; headlines?: unknown; descriptions?: unknown }>(request);
  const lines = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : undefined);
  try {
    let row;
    if (body.action === 'accept') {
      const matchType = body.matchType === 'EXACT' || body.matchType === 'PHRASE' || body.matchType === 'BROAD' ? body.matchType : undefined;
      row = await applySuggestion(id, {
        text: typeof body.text === 'string' ? body.text : undefined,
        matchType,
        level: body.level === 'ad_group' ? 'ad_group' : 'campaign',
        value: typeof body.value === 'number' && Number.isFinite(body.value) ? body.value : undefined,
        headlines: lines(body.headlines),
        descriptions: lines(body.descriptions),
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
