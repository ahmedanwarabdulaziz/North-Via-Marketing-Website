import { AppError, appRoute, jsonBody } from '@/lib/app-auth';
import { improveText, listWritingModes, saveWritingModes } from '@/lib/writing';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** The rephrase modes (More → Writing modes, and the "Anwarz ✨ Rephrase" panel). */
export const GET = appRoute(async () => ({ modes: await listWritingModes() }));

/**
 * { text, mode: 'correct' | <mode id> }  → { text, mode, changed }
 * { modes: [...] }                         saves the list of modes
 */
export const POST = appRoute(async (request) => {
  const body = await jsonBody<{ text?: unknown; mode?: unknown; modes?: unknown }>(request);
  if (body.modes !== undefined) return { modes: await saveWritingModes(body.modes) };
  if (typeof body.text !== 'string' || !body.text.trim()) throw new AppError('No text to improve.');
  if (typeof body.mode !== 'string') throw new AppError('Pick Correct or a mode.');
  try {
    return await improveText(body.text, body.mode);
  } catch (error) {
    throw new AppError(error instanceof Error ? error.message : String(error), 502);
  }
});
