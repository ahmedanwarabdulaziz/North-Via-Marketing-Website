import { AppError, appRoute, jsonBody } from '@/lib/app-auth';
import { after } from 'next/server';
import { afterAppTurn, appChatSession, askFromApp, newAppChat, rateAnswer, setChatEngine } from '@/lib/app-chat';

/** After the answer is out: refresh the long chat's running summary (never while he waits). */
const summarizeLater = (sessionId: string) => {
  const run = () => afterAppTurn(sessionId).catch((error) => console.error('Chat summary failed:', error instanceof Error ? error.message.slice(0, 200) : error));
  try {
    after(run);
  } catch {
    void run(); // outside the request's scope: run it now instead
  }
};
import { prepareAttachments } from '@/lib/chat-attachments';
import { transcribeAudio } from '@/lib/task-ai';

/** Messages as the app gets them: attached pictures keep their name only (the data stays on the server). */
const forApp = <T extends { attachments?: { name: string; kind: string; image?: string; text?: string; size: number; mimeType: string }[] }>(messages: T[]) =>
  messages.map((m) => (m.attachments?.length ? { ...m, attachments: m.attachments.map(({ image: _image, text: _text, ...rest }) => rest) } : m));

export const dynamic = 'force-dynamic';
// Long tasks (several mailboxes, many clients) get up to 5 minutes; the app sees each step live.
export const maxDuration = 300;

/** The open chat (Chat tab). */
export const GET = appRoute(async () => {
  const session = await appChatSession();
  return { messages: forApp(session?.messages || []), model: session?.model || null };
});

/**
 * { text } or { audio: { data, mimeType } }: ask the assistant; quick actions run at once, others come back as cards.
 * attachments?: [{ name, mimeType, data (base64) }]  pictures, PDFs or text files to ask about (at most 4).
 * stream?: true  answer as live events (see below) instead of one JSON reply.
 * { action: 'new' }: start a fresh chat.
 */
export const POST = appRoute(async (request) => {
  const body = await jsonBody<{ text?: unknown; audio?: { data?: unknown; mimeType?: unknown }; attachments?: unknown; action?: unknown; at?: unknown; rating?: unknown; note?: unknown; stream?: unknown }>(request);
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
  // { stream: true }: newline-delimited JSON, one event per line while the answer is worked out:
  //   {type:'heard', text} · {type:'step', label} · {type:'text', delta} · {type:'reset'} (clear the words so far)
  //   then {type:'done', messages, answer, heard} or {type:'error', error}.
  if (body.stream === true) {
    const question = text;
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let open = true;
        const send = (event: Record<string, unknown>) => {
          if (!open) return;
          try {
            controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
          } catch {
            open = false; // the app closed the connection; the turn still finishes and is saved
          }
        };
        if (heard) send({ type: 'heard', text: question });
        try {
          const { session, answer } = await askFromApp(question, heard, attachments, (event) => send(event));
          send({ type: 'done', messages: forApp(session.messages), answer, heard: heard ? question : null });
          summarizeLater(session.id);
        } catch (error) {
          console.error('App chat failed:', error);
          send({ type: 'error', error: error instanceof Error && /quota/i.test(error.message) ? error.message : 'No AI model could answer right now (busy or out of quota). Try again in a minute.' });
        }
        if (open) controller.close();
      },
    });
    return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' } });
  }
  try {
    const { session, answer } = await askFromApp(text, heard, attachments);
    summarizeLater(session.id);
    return { messages: forApp(session.messages), answer, heard: heard ? text : null };
  } catch (error) {
    console.error('App chat failed:', error);
    throw new AppError(error instanceof Error && /quota/i.test(error.message) ? error.message : 'No AI model could answer right now (busy or out of quota). Try again in a minute.', 503);
  }
});
