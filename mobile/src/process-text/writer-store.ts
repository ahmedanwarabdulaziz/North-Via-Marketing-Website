import { File, Paths } from 'expo-file-system';

// What the writing panel remembers on this phone: how often each mode is used (most used first), the
// last mode, the last text it copied (so the next "Replying to" ignores his own copy) and the last
// 10 results. A small JSON file in the app's documents; nothing here is needed to work.

export interface Recent {
  text: string;
  mode: string;
  at: string;
}

interface Stored {
  uses: Record<string, number>;
  lastMode: string | null;
  lastCopied: string | null;
  recent: Recent[];
}

const EMPTY: Stored = { uses: {}, lastMode: null, lastCopied: null, recent: [] };
let cache: Stored | null = null;

function file() {
  return new File(Paths.document, 'anwarz-writer.json');
}

export async function loadWriter(): Promise<Stored> {
  if (cache) return cache;
  try {
    const f = file();
    cache = f.exists ? { ...EMPTY, ...(JSON.parse(await f.text()) as Partial<Stored>) } : { ...EMPTY };
  } catch {
    cache = { ...EMPTY };
  }
  return cache;
}

async function save(next: Stored) {
  cache = next;
  try {
    await file().write(JSON.stringify(next));
  } catch {
    // not saved: only a convenience
  }
}

/** A result he copied: counts the mode, keeps it in Recent, and remembers it isn't someone else's message. */
export async function rememberCopy(text: string, mode: string) {
  const s = await loadWriter();
  await save({
    uses: { ...s.uses, [mode]: (s.uses[mode] || 0) + 1 },
    lastMode: mode,
    lastCopied: text,
    recent: [{ text, mode, at: new Date().toISOString() }, ...s.recent.filter((r) => r.text !== text)].slice(0, 10),
  });
}

export async function rememberMode(mode: string) {
  const s = await loadWriter();
  await save({ ...s, uses: { ...s.uses, [mode]: (s.uses[mode] || 0) + 1 }, lastMode: mode });
}
