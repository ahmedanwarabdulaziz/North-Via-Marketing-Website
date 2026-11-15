import { AppError, appRoute, jsonBody } from '@/lib/app-auth';
import { decideAction } from '@/lib/app-chat';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

/** { decision: 'confirm' | 'cancel' | 'undo' | 'send' } (send: the email draft shown on the card; edit { draft, subject }: a new email's text) on one action card in the chat. */
export const POST = appRoute<Ctx>(async (request, _device, { params }) => {
  const { id } = await params;
  const body = await jsonBody<{ decision?: unknown; draft?: unknown; subject?: unknown }>(request);
  const decisions = ['confirm', 'cancel', 'undo', 'send', 'edit'] as const;
  const decision = decisions.find((d) => d === body.decision);
  if (!decision) throw new AppError('decision must be confirm, cancel, undo, send or edit.');
  try {
    return {
      action: await decideAction(id, decision, {
        draft: typeof body.draft === 'string' ? body.draft : undefined,
        subject: typeof body.subject === 'string' ? body.subject : undefined,
      }),
    };
  } catch (error) {
    throw new AppError(error instanceof Error ? error.message : String(error), 409);
  }
});
