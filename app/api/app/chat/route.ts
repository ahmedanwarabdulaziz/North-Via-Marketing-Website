import { AppError, appRoute, jsonBody } from '@/lib/app-auth';
import { appChatSession, askFromApp, newAppChat } from '@/lib/app-chat';
import { transcribeAudio } from '@/lib/task-ai';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** The open chat (Chat tab). */
export const GET = appRoute(async () => {
  const session = await appChatSession();
  return { messages: session?.messages || [], model: session?.model || null };
});

/**
 * { text } or { audio: { data, mimeType } }: ask the assistant; quick actions run at once, others come back as cards.
 * { action: 'new' }: start a fresh chat.
 */
export const POST = appRoute(async (request) => {
  const body = await jsonBody<{ text?: unknown; audio?: { data?: unknown; mimeType?: unknown }; action?: unknown }>(request);
  if (body.action === 'new') {
    await newAppChat();
    return { messages: [] };
  }
  let text = typeof body.text === 'string' ? body.text.trim().slice(0, 4000) : '';
  let heard = false;
  if (!text && body.audio && typeof body.audio.data === 'string' && typeof body.audio.mimeType === 'string') {
    if (body.audio.data.length > 14_000_000) throw new AppError('The voice note is too long.', 413);
    text = (await transcribeAudio({ data: body.audio.data, mimeType: body.audio.mimeType })).trim();
    heard = true;
    if (!text) throw new AppError('I couldn’t hear anything in that voice note.');
  }
  if (!text) throw new AppError('Type or say something.');
  try {
    const { session, answer } = await askFromApp(text, heard);
    return { messages: session.messages, answer, heard: heard ? text : null };
  } catch (error) {
    console.error('App chat failed:', error);
    throw new AppError(error instanceof Error && /quota/i.test(error.message) ? error.message : 'No AI model could answer right now (busy or out of quota). Try again in a minute.', 503);
  }
});
