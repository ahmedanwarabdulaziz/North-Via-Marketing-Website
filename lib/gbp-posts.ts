import crypto from 'crypto';
import { aiJson, type AiImage } from './ai-json';
import { fetchClientKeywords } from './ads-metrics';
import { getDoc } from './data/store';
import type { LocalPostAction, LocalPostTopic } from './google-business';
import { supabase } from './supabase';
import type { GbpLocation } from '@/types/database';

// Google Business Profile posts written by the AI from a photo and a short brief (voice or
// text), using the client's top Google Ads keywords. Stored in gbp_posts until published.

export interface PostDraft {
  summary: string;
  topicType: LocalPostTopic;
  eventTitle?: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;
  couponCode?: string;
  terms?: string;
  ctaType: LocalPostAction | 'NONE';
  keywordsUsed: string[];
  note?: string; // anything the owner should check (a detail the AI wasn't sure of)
}

export interface GbpPost {
  id: string;
  chat_id: string;
  client_id: string | null;
  location_id: string;
  status: 'collecting' | 'revising' | 'draft' | 'published' | 'cancelled' | 'deleted';
  telegram_file_id: string | null;
  image_path: string | null;
  brief: string | null;
  post: Partial<PostDraft>;
  google_name: string | null;
  google_state: string | null;
  search_url: string | null;
  preview_message_id: number | null;
  extra: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

const BUCKET = 'gbp-posts';
// A post being set up only takes the chat's photos, voice notes and texts for this long.
const ACTIVE_FOR_MS = 30 * 60_000;
export const MAX_SUMMARY = 1500; // Google's limit

function check<T>(result: { data: T; error: { message: string } | null }) {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

export async function createPost(chatId: number | string, location: GbpLocation & { id: string }) {
  const row = {
    id: crypto.randomBytes(6).toString('base64url'),
    chat_id: String(chatId),
    client_id: location.clientId,
    location_id: location.id,
    status: 'collecting',
  };
  return check(await supabase.from('gbp_posts').insert(row).select().single()) as GbpPost;
}

export async function getPost(id: string) {
  return check(await supabase.from('gbp_posts').select().eq('id', id).maybeSingle()) as GbpPost | null;
}

export async function updatePost(id: string, fields: Partial<Omit<GbpPost, 'id' | 'created_at'>>) {
  return check(await supabase.from('gbp_posts').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id).select().single()) as GbpPost;
}

/** The chat's post that is waiting for a photo, a brief or changes, if it was touched recently. */
export async function activePost(chatId: number | string) {
  const since = new Date(Date.now() - ACTIVE_FOR_MS).toISOString();
  const rows = check(
    await supabase.from('gbp_posts').select().eq('chat_id', String(chatId)).in('status', ['collecting', 'revising']).gte('updated_at', since).order('updated_at', { ascending: false }).limit(1)
  ) as GbpPost[];
  return rows[0] || null;
}

export async function getPostLocation(post: GbpPost) {
  const location = await getDoc<GbpLocation>('gbp_locations', post.location_id);
  if (!location) throw new Error('That Google location is no longer connected.');
  return location;
}

export async function storePostImage(postId: string, data: Buffer, mimeType: string) {
  const path = `${new Date().toISOString().slice(0, 7)}/${postId}.${mimeType.includes('png') ? 'png' : 'jpg'}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, data, { contentType: mimeType, upsert: true });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return path;
}

export async function readPostImage(path: string): Promise<AiImage> {
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) throw new Error(`Couldn’t read the photo: ${error?.message || 'missing'}`);
  return { data: Buffer.from(await data.arrayBuffer()).toString('base64'), mimeType: data.type || 'image/jpeg' };
}

/** A link Google can download the photo from while it creates the post. */
export async function signedImageUrl(path: string) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 24 * 60 * 60);
  if (error || !data) throw new Error(`Couldn’t share the photo with Google: ${error?.message || 'no link'}`);
  return data.signedUrl;
}

// ---------- Writing ----------

const TOPICS: LocalPostTopic[] = ['STANDARD', 'EVENT', 'OFFER'];
const ACTIONS: Array<LocalPostAction | 'NONE'> = ['LEARN_MORE', 'ORDER', 'BOOK', 'SHOP', 'SIGN_UP', 'CALL', 'NONE'];

/** Today and the next 13 days in Toronto, so "this weekend" or "Friday" resolve to the right dates. */
function torontoCalendar() {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'long' });
  return Array.from({ length: 14 }, (_, i) => {
    const parts = Object.fromEntries(fmt.formatToParts(new Date(Date.now() + i * 86_400_000)).map((p) => [p.type, p.value]));
    return `${parts.weekday} ${parts.year}-${parts.month}-${parts.day}${i === 0 ? ' (today)' : ''}`;
  }).join(', ');
}

const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** The client's best Google Ads keywords (or search terms) from the last 90 days; empty without Ads. */
export async function clientAdsKeywords(clientId: string | null) {
  if (!clientId) return [];
  const day = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
  try {
    const { items } = await fetchClientKeywords(clientId, day(90), day(1));
    return items.map((k) => k.text);
  } catch (error) {
    console.error('Post keywords failed:', error instanceof Error ? error.message : error);
    return [];
  }
}

const SYSTEM = `You are a senior local-SEO copywriter who writes Google Business Profile posts for small businesses in Canada.
You get: the business, its Google Ads keywords (the searches that bring it paying customers), the owner's brief (often a transcribed voice note, maybe in Arabic or mixed), maybe a photo, and maybe changes the owner asked for on an earlier draft.

Write ONE post that Google approves and that ranks and converts:
- Google content policy: no phone numbers, no links or URLs, no email addresses, no hashtags, no ALL-CAPS words, no clickbait, nothing misleading. At most 2 emojis, or none.
- Facts: only what the brief says or the photo clearly shows. Never invent prices, discounts, dates, menu items, awards, years in business, opening hours, reviews or what customers say.
- Keywords: work 3–6 of the given Ads keywords into the text naturally, choosing the ones that fit this topic. Use the keyword's core phrase, not the search wording: drop "near me", "best" and "open now" and put the city instead ("halal restaurant near me" → "halal restaurant in Mississauga"). The main keyword and the city go in the first sentence. Never stuff or list keywords, and never write the text as a question a searcher would type; it must read like the business wrote it. keywordsUsed lists the phrases as they appear in the text. With no Ads keywords, use the searches a local customer would type for this business.
- Length and shape: 600–1,000 characters (never over 1,400). Google shows only about the first 100 characters before "More", so open with the strongest line. Then 2 short paragraphs on the specifics: what it is, why it's good, who it's for. End with one clear call to action that matches the button.
- Language: English with Canadian spelling, unless the owner explicitly asks for another language. Translate the meaning of an Arabic brief; don't transliterate.
- The first sentence names the business, says what's new or on offer, and carries the main keyword and city, as one grammatical sentence (e.g. "Oasis Grill, your halal restaurant in Mississauga, is taking 20% off every grill this weekend.").
- Tone: warm, confident, professional; no exaggeration beyond what the owner said. No rankings or popularity claims ("top", "#1", "favourite", "most popular") unless the owner said them.

Before answering, check every sentence: is each dish, ingredient, number, date and claim in the brief or clearly visible in the photo? Remove anything that isn't.

Post type:
- "OFFER" only when the owner describes a deal/discount with dates; "EVENT" only for an event with dates; otherwise "STANDARD". OFFER and EVENT need eventTitle (max 58 chars) and startDate/endDate (YYYY-MM-DD, resolved from words like "this weekend" or "Friday" using the calendar given; a weekend is Friday–Sunday only if the owner says Friday, otherwise Saturday–Sunday). If dates are missing, use STANDARD.
- Button (ctaType): ORDER for food ordering, BOOK for reservations/appointments, SHOP for products, SIGN_UP for registrations, CALL to call the business, LEARN_MORE otherwise. Without a website, only CALL or NONE.

Return JSON only:
{"summary": string, "topicType": "STANDARD"|"EVENT"|"OFFER", "eventTitle": string|null, "startDate": string|null, "endDate": string|null, "couponCode": string|null, "terms": string|null, "ctaType": "LEARN_MORE"|"ORDER"|"BOOK"|"SHOP"|"SIGN_UP"|"CALL"|"NONE", "keywordsUsed": string[], "note": string|null}
"note" is a short line for the owner only when something needs checking (e.g. the photo doesn't match the brief); otherwise null.`;

export async function writePost(opts: {
  businessName: string;
  address?: string;
  website?: string;
  keywords: string[];
  brief: string;
  image?: AiImage;
  previous?: Partial<PostDraft>;
  changes?: string;
}): Promise<PostDraft> {
  const user = [
    `Calendar: ${torontoCalendar()}`,
    `Business: ${opts.businessName}${opts.address ? ` — ${opts.address}` : ''}`,
    `Website: ${opts.website || 'none'}`,
    `Google Ads keywords (best first): ${opts.keywords.length ? opts.keywords.join(' | ') : 'none'}`,
    `Owner's brief: ${opts.brief}`,
    opts.image ? 'A photo for the post is attached.' : 'No photo.',
    ...(opts.previous?.summary ? ['', `Earlier draft:\n${opts.previous.summary}`, `Owner's changes: ${opts.changes || 'Write a fresh version with a different angle.'}`] : []),
  ].join('\n');

  const raw = await aiJson({ system: SYSTEM, user, feature: 'posts', image: opts.image, timeBudgetMs: 45_000, geminiFirst: true });
  let summary = String(raw.summary || '').trim();
  if (!summary) throw new Error('The AI returned an empty post.');
  if (summary.length > MAX_SUMMARY) summary = summary.slice(0, MAX_SUMMARY - 1).replace(/\s+\S*$/, '') + '…';

  let topicType = TOPICS.includes(raw.topicType as LocalPostTopic) ? (raw.topicType as LocalPostTopic) : 'STANDARD';
  const eventTitle = typeof raw.eventTitle === 'string' ? raw.eventTitle.trim().slice(0, 58) : '';
  if (topicType !== 'STANDARD' && !(eventTitle && isDate(raw.startDate) && isDate(raw.endDate))) topicType = 'STANDARD';

  let ctaType = ACTIONS.includes(raw.ctaType as LocalPostAction) ? (raw.ctaType as LocalPostAction | 'NONE') : 'LEARN_MORE';
  if (!opts.website && ctaType !== 'CALL') ctaType = 'NONE';

  return {
    summary,
    topicType,
    ...(topicType !== 'STANDARD' ? { eventTitle, startDate: raw.startDate as string, endDate: raw.endDate as string } : {}),
    ...(topicType === 'OFFER' && typeof raw.couponCode === 'string' && raw.couponCode ? { couponCode: raw.couponCode.slice(0, 58) } : {}),
    ...(topicType === 'OFFER' && typeof raw.terms === 'string' && raw.terms ? { terms: raw.terms.slice(0, 500) } : {}),
    ctaType,
    keywordsUsed: Array.isArray(raw.keywordsUsed) ? raw.keywordsUsed.map(String).slice(0, 8) : [],
    ...(typeof raw.note === 'string' && raw.note.trim() ? { note: raw.note.trim().slice(0, 300) } : {}),
  };
}
