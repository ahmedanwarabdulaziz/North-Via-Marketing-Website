import { AppError, appRoute, jsonBody } from '@/lib/app-auth';
import { decideAction } from '@/lib/app-chat';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

/** { decision: 'confirm' | 'cancel' | 'undo' } on one action card in the chat. */
export const POST = appRoute<Ctx>(async (request, _device, { params }) => {
  const { id } = await params;
  const body = await jsonBody<{ decision?: unknown }>(request);
  if (body.decision !== 'confirm' && body.decision !== 'cancel' && body.decision !== 'undo') throw new AppError('decision must be confirm, cancel or undo.');
  try {
    return { action: await decideAction(id, body.decision) };
  } catch (error) {
    throw new AppError(error instanceof Error ? error.message : String(error), 409);
  }
});
