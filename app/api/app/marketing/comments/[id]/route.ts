import { AppError, appRoute, jsonBody } from '@/lib/app-auth';
import { appComment, clientNames } from '@/lib/app-api';
import { getStoredComment, hideStoredComment, postApprovedCommentReply, regenerateCommentDraft, setCommentDraft, skipComment } from '@/lib/social-sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

/**
 * One Facebook / Instagram comment. Nothing is posted or hidden without these explicit taps:
 *   post                 posts the draft as a reply      edit { draft }   replaces the draft
 *   redraft              a new AI draft                   hide             hides the comment on the page
 *   skip                 no reply needed
 */
export const POST = appRoute<Ctx>(async (request, _device, { params }) => {
  const { id } = await params;
  const body = await jsonBody<{ action?: unknown; draft?: unknown }>(request);
  if (!(await getStoredComment(id))) throw new AppError('Comment not found.', 404);
  try {
    switch (body.action) {
      case 'post':
        await postApprovedCommentReply(id);
        break;
      case 'edit':
        if (typeof body.draft !== 'string' || !body.draft.trim()) throw new AppError('Write the reply first.');
        await setCommentDraft(id, body.draft);
        break;
      case 'redraft':
        await regenerateCommentDraft(id);
        break;
      case 'hide':
        await hideStoredComment(id);
        break;
      case 'skip':
        await skipComment(id);
        break;
      default:
        throw new AppError('Unknown action.');
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(error instanceof Error ? error.message.slice(0, 300) : String(error), 502);
  }
  const [comment, names] = await Promise.all([getStoredComment(id), clientNames()]);
  return { comment: comment ? appComment({ ...comment, id }, names) : null };
});
