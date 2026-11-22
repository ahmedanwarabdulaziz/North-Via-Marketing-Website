import { AppError, appRoute, jsonBody } from '@/lib/app-auth';
import { appChatSession, askFromApp, newAppChat, rateAnswer, setChatEngine } from '@/lib/app-chat';
import { prepareAttachments } from '@/lib/chat-attachments';
import { transcribeAudio } from '@/lib/task-ai';

/** Messages as the app gets them: attached pictures keep their name only (the data stays on the server). */
const forApp = <T extends { attachments?: { name: string; kind: string; image?: string; text?: string; size: number; mimeType: string }[] }>(messages: T[]) =>
  messages.map((m) => (m.attachments?.length ? { ...m, attachments: m.attachments.map(({ image: _image, text: _text, ...rest }) => rest) } : m));

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** The open chat (Chat tab). */
export const GET = appRoute(async () => {
  const session = await appChatSession();
  return { messages: forApp(session?.messages || []), model: session?.model || null };
});

/**
 * { text } or { audio: { data, mimeType } }: ask the assistant; quick actions run at once, others come back as cards.
 * attachments?: [{ name, mimeType, data (base64) }]  pictures, PDFs or text files to ask about (at most 4).
 * { action: 'new' }: start a fresh chat.
 */
export const POST = appRoute(async (request) => {
  const body = await jsonBody<{ text?: unknown; audio?: { data?: unknown; mimeType?: unknown }; attachments?: unknown; action?: unknown; at?: unknown; rating?: unknown; note?: unknown }>(request);
  if (body.action === 'new') {
    await newAppChat();
    return { messages: [] };
  }
  // 👎 / 👍 on an answer: { action: 'rate', at, rating: 'bad' | 'good' | null, note? }
  if (body.action === 'rate') {
    if (typeof body.at !== 'string') throw new AppError('Which answer?');
    const rating = body.rating === 'bad' || body.rating === 'good' ? body.rating : null;
    const answer = await rateAnswer(body.at, rating, typeof body.note === 'string' ? body.note.trim() || null : null);
    return { answer };
  }
  let text = typeof body.text === 'string' ? body.text.trim().slice(0, 4000) : '';
  let heard = false;
  if (!text && body.audio && typeof body.audio.data === 'string' && typeof body.audio.mimeType === 'string') {
    if (body.audio.data.length > 14_000_000) throw new AppError('The voice note is too long.', 413);
    text = (await transcribeAudio({ data: body.audio.data, mimeType: body.audio.mimeType })).trim();
    heard = true;
    if (!text) throw new AppError('I couldn’t hear anything in that voice note.');
  }
  let attachments: Awaited<ReturnType<typeof prepareAttachments>> = [];
  try {
    attachments = await prepareAttachments(body.attachments);
  } catch (error) {
    throw new AppError(error instanceof Error ? error.message : 'Couldn’t read the attached files.', 413);
  }
  // A file on its own: ask what to do with it.
  if (!text && attachments.length) text = attachments.length === 1 ? `(Sent a file: ${attachments[0].name})` : `(Sent ${attachments.length} files)`;
  if (!text) throw new AppError('Type or say something.');
  // "/tools" or "/classic": switch which engine answers (to compare them).
  if (/^\/(tools|classic)$/i.test(text)) {
    const engine = text.toLowerCase() === '/tools' ? 'agent' : 'classic';
    await setChatEngine(engine);
    const session = await appChatSession();
    const at = new Date().toISOString();
    const note = {
      role: 'assistant' as const,
      at,
      content: engine === 'agent' ? '🛠 Tools chat is on: one assistant that looks things up before acting. Send /classic to compare.' : '💬 Classic chat is on. Send /tools to switch back.',
    };
    return { messages: [...(session?.messages || []), { role: 'user' as const, content: text, at }, note], answer: note, heard: null };
  }
  try {
    const { session, answer } = await askFromApp(text, heard, attachments);
    return { messages: forApp(session.messages), answer, heard: heard ? text : null };
  } catch (error) {
    console.error('App chat failed:', error);
    throw new AppError(error instanceof Error && /quota/i.test(error.message) ? error.message : 'No AI model could answer right now (busy or out of quota). Try again in a minute.', 503);
  }
});
