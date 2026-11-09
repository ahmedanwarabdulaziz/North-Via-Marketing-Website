import { aiJson } from './ai-json';
import { getSetting, setSetting } from './data/store';

// Ahmed's full master reference (career, ventures, education, positioning and tone rules), the
// source for bios, CVs, LinkedIn, website copy and proposals. Kept in Supabase (app_settings
// "master_profile", backed up nightly). The chat gets it only when a question is about writing
// about him (it's ~21k characters); everyday chats use the short profile in memory.
// Changes happen only after a ✅ tap: the AI writes a small patch plus a dated Update Log line.

const KEY = 'master_profile';

export interface MasterProfile {
  text: string;
  updatedAt: string;
}

export async function getMasterProfile(): Promise<MasterProfile | null> {
  const value = await getSetting<MasterProfile>(KEY).catch(() => null);
  return value?.text ? value : null;
}

/** Questions that need the full profile: bios, CVs, LinkedIn, intros, proposals, "about me" copy. */
const NEEDS_PROFILE =
  /\b(bio|cv|resume|résumé|linkedin|profile|about me|introduc|intro|proposal|pitch|speaker|cover letter|headline|summary about me|who am i)\b|سيرة|نبذة|بروفايل|لينكد|تعريف|عرّف|عرف بنفسي|عني|بايو|عرض سعر|بروبوزال|بيتش|خبرتي|خبراتي|مؤهلاتي|شهاداتي|الدكتوراه|الماجستير/i;

export function needsMasterProfile(question: string) {
  return NEEDS_PROFILE.test(question);
}

function cairoDate() {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date());
}

/**
 * Applies a confirmed change: the AI finds the exact place (or a section to add under) and the
 * new wording, and an Update Log line is added. Returns a one-line description of what changed.
 */
export async function applyProfileUpdate(change: string): Promise<string> {
  const profile = await getMasterProfile();
  if (!profile) throw new Error('There is no master profile saved yet.');
  const raw = await aiJson({
    system: `You maintain Ahmed Anwar's master reference file. Apply the CHANGE to the FILE with a minimal edit.
Return ONLY JSON: {"find": "<an exact, unique snippet copied from the FILE to replace (one or a few lines)>", "replace": "<the new text for that snippet>", "log": "<one short Update Log entry, e.g. Added X to section 8>", "done": "<one line for Ahmed, in his language, saying what changed>"}
- To ADD something, set "find" to the exact line it should go after and "replace" to that same line plus the new line(s).
- Keep the file's style (plain text, same headings and bullet format). Never remove unrelated content. Never invent details not in the CHANGE.`,
    user: `CHANGE: ${change}\n\nFILE:\n${profile.text}`,
    feature: 'assistant',
    timeBudgetMs: 40_000,
  });
  const find = typeof raw.find === 'string' ? raw.find : '';
  const replace = typeof raw.replace === 'string' ? raw.replace : '';
  if (!find || !profile.text.includes(find)) throw new Error('Could not find the right place in the profile. Try saying it more specifically.');
  if (profile.text.split(find).length > 2) throw new Error('That part of the profile appears more than once. Try saying it more specifically.');
  let text = profile.text.replace(find, replace);
  // Dated line at the end of the Update Log (section 19), or at the end of the file.
  const logLine = `- ${cairoDate()}: ${typeof raw.log === 'string' && raw.log ? raw.log : change.slice(0, 200)}`;
  const anchor = text.indexOf('Update Log:');
  if (anchor >= 0) {
    const sectionEnd = text.indexOf('\n====', anchor);
    const at = sectionEnd >= 0 ? sectionEnd : text.length;
    text = `${text.slice(0, at).replace(/\s*$/, '')}\n${logLine}\n${text.slice(at)}`;
  } else {
    text = `${text.replace(/\s*$/, '')}\n\nUpdate Log:\n${logLine}\n`;
  }
  await setSetting(KEY, { text, updatedAt: new Date().toISOString() });
  return typeof raw.done === 'string' && raw.done ? raw.done : logLine.slice(2);
}
