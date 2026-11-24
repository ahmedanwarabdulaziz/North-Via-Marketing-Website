import { listClientProfiles } from '@/lib/admin-ops';
import { AppError, appRoute, jsonBody } from '@/lib/app-auth';
import { transcribeAudio } from '@/lib/task-ai';
import { ADJUSTMENTS, improveText, listWritingModes, saveWritingModes } from '@/lib/writing';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * The rephrase modes (More → Writing modes, the "Anwarz ✨ Rephrase" panel and the writing bubble),
 * the quick adjustments shown under a result, and the clients to pick from.
 */
export const GET = appRoute(async () => {
  const [modes, clients] = await Promise.all([listWritingModes(), listClientProfiles().catch(() => [])]);
  return {
    modes,
    adjustments: Object.entries(ADJUSTMENTS).map(([id, a]) => ({ id, name: a.name })),
    clients: clients.filter((c) => c.id && c.brandName).map((c) => ({ id: c.id!, name: c.brandName })),
  };
});

/**
 * { text, mode: 'correct' | <mode id> | adjust_*, replyTo?, clientId? }  → { text, mode, changed, client }
 *    replyTo: the message he is answering (the result is his reply; text = his notes, may be empty)
 *    clientId: the client it's for ('none' = no client; missing = found from names in the text)
 * { audio: { data, mimeType } }  → { heard }  the words of a voice note, to write from
 * { modes: [...] }                saves the list of modes
 */
export const POST = appRoute(async (request) => {
  const body = await jsonBody<{ text?: unknown; mode?: unknown; modes?: unknown; replyTo?: unknown; clientId?: unknown; audio?: { data?: unknown; mimeType?: unknown } }>(request);
  if (body.modes !== undefined) return { modes: await saveWritingModes(body.modes) };
  if (body.audio && typeof body.audio.data === 'string' && typeof body.audio.mimeType === 'string') {
    if (body.audio.data.length > 14_000_000) throw new AppError('The voice note is too long.', 413);
    const heard = (await transcribeAudio({ data: body.audio.data, mimeType: body.audio.mimeType })).trim();
    if (!heard) throw new AppError('I couldn’t hear anything in that voice note.');
    return { heard };
  }
  const text = typeof body.text === 'string' ? body.text : '';
  const replyTo = typeof body.replyTo === 'string' ? body.replyTo : '';
  if (!text.trim() && !replyTo.trim()) throw new AppError('No text to improve.');
  if (typeof body.mode !== 'string') throw new AppError('Pick Correct or a mode.');
  try {
    return await improveText(text, body.mode, { replyTo, clientId: typeof body.clientId === 'string' ? body.clientId : undefined });
  } catch (error) {
    throw new AppError(error instanceof Error ? error.message : String(error), 502);
  }
});
