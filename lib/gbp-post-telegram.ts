import { getDoc, listDocs } from './data/store';
import {
  activePost,
  clientAdsKeywords,
  createPost,
  getPost,
  getPostLocation,
  readPostImage,
  signedImageUrl,
  storePostImage,
  updatePost,
  writePost,
  type GbpPost,
  type PostDraft,
} from './gbp-posts';
import { createLocalPost, deleteLocalPost, getLocalPost, type LocalPostAction, type LocalPostInput } from './google-business';
import type { AiImage } from './ai-json';
import { transcribeAudio } from './task-ai';
import { InlineButton, OutgoingMessage, answerCallback, downloadFile, editMessage, escapeHtml as h, sendMessage, sendPhoto, telegram, truncate } from './telegram';
import { supabase } from './supabase';
import type { GbpLocation } from '@/types/database';

// "📝 Google post" in the bot: pick a location, send a photo and a voice note or text about the
// post, the AI writes it with the client's top Google Ads keywords, and it goes to Google only
// when Publish is tapped. Button data: "gp:<action>:<id>[:<value>]".

interface PhotoSize {
  file_id: string;
  file_size?: number;
  width?: number;
  height?: number;
}

interface TelegramAudio {
  file_id: string;
  file_size?: number;
  mime_type?: string;
}

interface IncomingMessage {
  message_id?: number;
  text?: string;
  caption?: string;
  chat: { id: number };
  photo?: PhotoSize[];
  document?: { file_id: string; mime_type?: string; file_size?: number };
  voice?: TelegramAudio;
  audio?: TelegramAudio;
}

interface CallbackQuery {
  id: string;
  data?: string;
  message?: { message_id: number; chat: { id: number } };
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // Google's limit for post photos
const MAX_AUDIO_BYTES = 12 * 1024 * 1024;
const PASS_THROUGH = new Set(['x', 'menu', 'm', 'start', 'help']);

const CTA_LABELS: Record<LocalPostAction | 'NONE', string> = {
  LEARN_MORE: 'Learn more',
  ORDER: 'Order online',
  BOOK: 'Book',
  SHOP: 'Shop',
  SIGN_UP: 'Sign up',
  CALL: 'Call now',
  NONE: 'No button',
};
const TOPIC_LABELS = { STANDARD: 'Update', EVENT: 'Event', OFFER: 'Offer' } as const;

function typing(chatId: number | string, action = 'typing') {
  return telegram('sendChatAction', { chat_id: chatId, action }).catch(() => undefined);
}

async function clientWebsite(clientId: string | null) {
  if (!clientId) return undefined;
  const client = await getDoc<{ websiteUrl?: string }>('clients', clientId);
  const url = client?.websiteUrl?.trim();
  if (!url) return undefined;
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/** The website link on the post's button, tagged so the visits show up as Google posts in analytics. */
function trackedUrl(url: string) {
  try {
    const u = new URL(url);
    u.searchParams.set('utm_source', 'google');
    u.searchParams.set('utm_medium', 'organic');
    u.searchParams.set('utm_campaign', 'gbp_post');
    return u.toString();
  } catch {
    return url;
  }
}

// ---------- Screens ----------

export async function postLocationsScreen(): Promise<OutgoingMessage> {
  const locations = (await listDocs<GbpLocation>('gbp_locations', { where: { linked: true } })).sort((a, b) => a.title.localeCompare(b.title));
  if (!locations.length) {
    return { text: '📝 <b>Google post</b>\n\nNo Google Business Profile is connected yet. Connect one on the client’s page in the panel.', buttons: [[{ text: '⬅️ Back to menu', callback_data: 'm:home' }]] };
  }
  return {
    text: ['📝 <b>New Google post</b>', '', 'Which business is it for?'].join('\n'),
    buttons: [...locations.map((l) => [{ text: truncate(l.title, 40), callback_data: `gp:l:${l.id}` }]), [{ text: '⬅️ Back to menu', callback_data: 'm:home' }]],
  };
}

function collectingScreen(post: GbpPost, title: string): OutgoingMessage {
  return {
    text: [
      `📝 <b>New Google post · ${h(title)}</b>`,
      '',
      '1️⃣ Send the <b>photo</b> for the post',
      '2️⃣ Send a <b>voice note or text</b>: what it’s about (new dish, offer and its dates, event…)',
      '',
      'Either order works. I’ll write it with this client’s top Google Ads keywords and show you the draft. <b>Nothing is posted until you tap Publish.</b>',
    ].join('\n'),
    buttons: [[{ text: '❌ Cancel', callback_data: `gp:c:${post.id}` }]],
  };
}

function previewScreen(post: GbpPost, title: string, website?: string): OutgoingMessage {
  const p = post.post as PostDraft;
  const type =
    p.topicType === 'STANDARD'
      ? TOPIC_LABELS.STANDARD
      : `${TOPIC_LABELS[p.topicType]}: ${h(p.eventTitle || '')} (${p.startDate} → ${p.endDate})${p.couponCode ? ` · code ${h(p.couponCode)}` : ''}`;
  const button = p.topicType === 'OFFER' ? (website ? 'Redeem online → website' : 'none') : `${CTA_LABELS[p.ctaType]}${p.ctaType !== 'CALL' && p.ctaType !== 'NONE' ? ' → website' : ''}`;
  return {
    text: [
      `📝 <b>Google post draft · ${h(title)}</b>`,
      `<i>${type} · Button: ${button} · ${post.image_path ? '📸 with photo' : 'no photo'} · ${p.summary.length} chars</i>`,
      '',
      h(p.summary),
      ...(p.terms ? ['', `<i>Terms: ${h(p.terms)}</i>`] : []),
      '',
      p.keywordsUsed.length ? `🔑 <b>Keywords used:</b> ${h(p.keywordsUsed.join(', '))}` : '🔑 <i>No Google Ads keywords for this client, so I used local search terms.</i>',
      ...(p.note ? [`⚠️ ${h(p.note)}`] : []),
      '',
      '<i>Nothing is posted until you tap Publish.</i>',
    ].join('\n'),
    buttons: [
      [{ text: '✅ Publish to Google', callback_data: `gp:p:${post.id}` }],
      [
        { text: '✏️ Change something', callback_data: `gp:e:${post.id}` },
        { text: '🔁 Rewrite', callback_data: `gp:r:${post.id}` },
      ],
      [
        ...(p.topicType === 'OFFER' ? [] : [{ text: `🔘 Button: ${CTA_LABELS[p.ctaType]}`, callback_data: `gp:b:${post.id}` }]),
        { text: '❌ Cancel', callback_data: `gp:c:${post.id}` },
      ],
    ],
  };
}

function publishedScreen(post: GbpPost, title: string, note?: string): OutgoingMessage {
  const state = post.google_state;
  const status =
    state === 'LIVE' ? '✅ <b>Live on Google</b>' : state === 'REJECTED' ? '⛔️ <b>Rejected by Google</b>. Try a rewrite (no phone numbers or links in the text) and post again.' : '⏳ <b>Sent to Google</b>. Google reviews it, usually within minutes.';
  const buttons: InlineButton[][] = [];
  if (post.search_url) buttons.push([{ text: '🔗 View on Google', url: post.search_url }]);
  buttons.push([
    { text: '🔄 Check status', callback_data: `gp:s:${post.id}` },
    { text: '🗑 Delete from Google', callback_data: `gp:x:${post.id}` },
  ]);
  return {
    text: [`📝 <b>Google post · ${h(title)}</b>`, status, ...(note ? [note] : []), '', h(truncate((post.post as PostDraft).summary || '', 3000))].join('\n'),
    buttons,
  };
}

// ---------- Writing ----------

/** Writes (or rewrites) the draft and sends the preview. */
async function generate(chatId: number, post: GbpPost, opts: { changes?: string; image?: AiImage; resendPhoto?: boolean } = {}) {
  await typing(chatId);
  const location = await getPostLocation(post);
  const [website, keywords, image] = await Promise.all([
    clientWebsite(post.client_id),
    clientAdsKeywords(post.client_id),
    opts.image ?? (post.image_path ? readPostImage(post.image_path) : Promise.resolve(undefined)),
  ]);
  const rewriting = Boolean(post.post?.summary);
  const draft = await writePost({
    businessName: location.title,
    address: location.address,
    website,
    keywords,
    brief: post.brief || '',
    image,
    ...(rewriting ? { previous: post.post, changes: opts.changes } : {}),
  });
  const updated = await updatePost(post.id, { status: 'draft', post: draft });
  if (post.telegram_file_id && (opts.resendPhoto || !rewriting)) {
    await sendPhoto(chatId, post.telegram_file_id, { text: `📸 Photo for the ${h(location.title)} post` });
  }
  const sent = await sendMessage(chatId, previewScreen(updated, location.title, website));
  await updatePost(post.id, { preview_message_id: (sent as { message_id?: number }).message_id ?? null });
}

async function downloadAudio(file: TelegramAudio): Promise<AiImage> {
  const { data, path } = await downloadFile(file.file_id);
  if (data.length > MAX_AUDIO_BYTES) throw new Error('Audio file too large.');
  return { data: data.toString('base64'), mimeType: file.mime_type || (/\.mp3$/i.test(path) ? 'audio/mpeg' : 'audio/ogg') };
}

/** Photos, voice notes and texts for a post being set up. False = not for a post. */
export async function handleGbpPostMessage(message: IncomingMessage): Promise<boolean> {
  const chatId = message.chat.id;
  const text = (message.text || '').trim();
  if (text.startsWith('/') || PASS_THROUGH.has(text.toLowerCase())) return false;

  const post = await activePost(chatId);
  if (!post) return false;

  const imageDoc = message.document?.mime_type?.startsWith('image/') ? message.document : null;
  const photo = message.photo?.length ? message.photo[message.photo.length - 1] : null; // largest size
  const voice = message.voice || message.audio;
  const caption = (message.caption || '').trim();
  if (!photo && !imageDoc && !voice && !text) {
    await sendMessage(chatId, { text: '📝 For the Google post, send a photo, a voice note or text. Or tap ❌ Cancel on the post.' });
    return true;
  }

  try {
    let image: AiImage | undefined;
    let current = post;
    if (photo || imageDoc) {
      const file = (photo || imageDoc)!;
      if ((file.file_size || 0) > MAX_IMAGE_BYTES) {
        await sendMessage(chatId, { text: '📸 That photo is over 5 MB, Google’s limit. Send it as a normal photo (not a file) so Telegram shrinks it.' });
        return true;
      }
      if (photo && Math.min(photo.width || 999, photo.height || 999) < 250) {
        await sendMessage(chatId, { text: '📸 That photo is too small for Google (at least 250 × 250). Please send a bigger one.' });
        return true;
      }
      await typing(chatId, 'upload_photo');
      const mimeType = imageDoc?.mime_type === 'image/png' ? 'image/png' : 'image/jpeg';
      const { data } = await downloadFile(file.file_id);
      if (data.length > MAX_IMAGE_BYTES) {
        await sendMessage(chatId, { text: '📸 That photo is over 5 MB, Google’s limit. Please send a smaller one.' });
        return true;
      }
      const path = await storePostImage(post.id, data, mimeType);
      image = { data: data.toString('base64'), mimeType };
      current = await updatePost(post.id, { telegram_file_id: file.file_id, image_path: path });
    }

    // What was said: a voice note, a text, or a photo's caption.
    let said = '';
    if (voice) {
      if ((voice.file_size || 0) > MAX_AUDIO_BYTES) {
        await sendMessage(chatId, { text: '🎙 That recording is too long. Please send a shorter voice note.' });
        return true;
      }
      await typing(chatId);
      said = await transcribeAudio(await downloadAudio(voice));
      await sendMessage(chatId, { text: `🎙 <i>Heard:</i> ${h(truncate(said, 800))}` });
    } else {
      said = text || caption;
    }

    if (current.status === 'revising') {
      if (said) current = await updatePost(post.id, { brief: [current.brief, `Change: ${said}`].filter(Boolean).join('\n') });
      await generate(chatId, current, { changes: said || 'Use the new photo.', image, resendPhoto: Boolean(image) });
      return true;
    }

    if (said) current = await updatePost(post.id, { brief: [current.brief, said].filter(Boolean).join('\n') });
    if (!current.brief) {
      await sendMessage(chatId, { text: '📸 Got the photo. Now send a voice note or text about what the post is for.', buttons: [[{ text: '❌ Cancel', callback_data: `gp:c:${post.id}` }]] });
      return true;
    }
    if (!current.image_path) {
      await sendMessage(chatId, {
        text: '👍 Got it. Now send the photo for the post (posts with a photo get far more views).',
        buttons: [[{ text: '✍️ Write it without a photo', callback_data: `gp:w:${post.id}` }], [{ text: '❌ Cancel', callback_data: `gp:c:${post.id}` }]],
      });
      return true;
    }
    await generate(chatId, current, { image });
  } catch (error) {
    console.error('Google post message failed:', error);
    await sendMessage(chatId, { text: '⚠️ I couldn’t write the post right now (the AI may be busy). Send that again in a minute.' });
  }
  return true;
}

// ---------- Buttons ----------

async function publish(post: GbpPost, location: GbpLocation) {
  const p = post.post as PostDraft;
  const website = await clientWebsite(post.client_id);
  const input: LocalPostInput = { summary: p.summary, topicType: p.topicType };
  if (post.image_path) input.imageUrl = await signedImageUrl(post.image_path);
  if (p.topicType !== 'STANDARD' && p.eventTitle && p.startDate && p.endDate) input.event = { title: p.eventTitle, startDate: p.startDate, endDate: p.endDate };
  if (p.topicType === 'OFFER') {
    input.offer = { ...(p.couponCode ? { couponCode: p.couponCode } : {}), ...(website ? { redeemOnlineUrl: trackedUrl(website) } : {}), ...(p.terms ? { termsConditions: p.terms } : {}) };
  } else if (p.ctaType === 'CALL') {
    input.callToAction = { actionType: 'CALL' };
  } else if (p.ctaType !== 'NONE' && website) {
    input.callToAction = { actionType: p.ctaType, url: trackedUrl(website) };
  }
  return createLocalPost(location, input);
}

export async function handleGbpPostCallback(query: CallbackQuery) {
  const chatId = query.message?.chat.id;
  const messageId = query.message?.message_id;
  if (!chatId || !messageId) return answerCallback(query.id);
  const [, action, id, value] = (query.data || '').split(':');

  try {
    if (action === 'home') {
      await editMessage(chatId, messageId, await postLocationsScreen());
      return answerCallback(query.id);
    }
    if (action === 'l') {
      const location = await getDoc<GbpLocation>('gbp_locations', id);
      if (!location?.linked) return answerCallback(query.id, 'That location is no longer connected.');
      // Starting a new post leaves any unfinished one aside.
      await supabase.from('gbp_posts').update({ status: 'cancelled' }).eq('chat_id', String(chatId)).in('status', ['collecting', 'revising']);
      const post = await createPost(chatId, location);
      await editMessage(chatId, messageId, collectingScreen(post, location.title));
      return answerCallback(query.id);
    }

    const post = await getPost(id);
    if (!post) return answerCallback(query.id, 'That post wasn’t found.');
    const location = await getPostLocation(post);

    if (action === 'c') {
      if (post.status === 'published') return answerCallback(query.id, 'Already posted. Use Delete instead.');
      await updatePost(post.id, { status: 'cancelled' });
      await editMessage(chatId, messageId, { text: `📝 <s>Google post for ${h(location.title)}</s>\n<i>Cancelled. Nothing was posted.</i>` });
      return answerCallback(query.id, 'Cancelled');
    }
    if (action === 'w') {
      if (post.status !== 'collecting' || !post.brief) return answerCallback(query.id);
      await answerCallback(query.id, 'Writing the post…');
      await generate(chatId, post);
      return;
    }
    if (action === 'e') {
      if (post.status !== 'draft') return answerCallback(query.id, 'This draft is no longer open.');
      await updatePost(post.id, { status: 'revising' });
      await sendMessage(chatId, {
        text: '✏️ What should change? Send a voice note or text (e.g. “shorter”, “mention the weekend brunch”, “make it an offer until Sunday”). You can also send a different photo.',
        buttons: [[{ text: '❌ Cancel the post', callback_data: `gp:c:${post.id}` }]],
      });
      return answerCallback(query.id);
    }
    if (action === 'r') {
      if (post.status !== 'draft') return answerCallback(query.id, 'This draft is no longer open.');
      await answerCallback(query.id, 'Writing another version…');
      await generate(chatId, post);
      return;
    }
    if (action === 'b') {
      if (post.status !== 'draft') return answerCallback(query.id, 'This draft is no longer open.');
      const website = await clientWebsite(post.client_id);
      const choices = (Object.keys(CTA_LABELS) as Array<LocalPostAction | 'NONE'>).filter((a) => website || a === 'CALL' || a === 'NONE');
      const buttons: InlineButton[][] = [];
      for (let i = 0; i < choices.length; i += 2) buttons.push(choices.slice(i, i + 2).map((a) => ({ text: CTA_LABELS[a], callback_data: `gp:B:${post.id}:${a}` })));
      await editMessage(chatId, messageId, {
        text: `🔘 <b>Which button under the post?</b>\n${website ? `<i>Links go to ${h(website)}. Call uses the phone on the Google profile.</i>` : '<i>This client has no website saved, so only Call is possible.</i>'}`,
        buttons,
      });
      return answerCallback(query.id);
    }
    if (action === 'B') {
      if (post.status !== 'draft' || !(value in CTA_LABELS)) return answerCallback(query.id);
      const updated = await updatePost(post.id, { post: { ...post.post, ctaType: value as LocalPostAction | 'NONE' } });
      await editMessage(chatId, messageId, previewScreen(updated, location.title, await clientWebsite(post.client_id)));
      return answerCallback(query.id, `Button: ${CTA_LABELS[value as LocalPostAction | 'NONE']}`);
    }
    if (action === 'p') {
      // Claim the draft first so a double tap can't post it twice.
      const { data: claimed } = await supabase.from('gbp_posts').update({ status: 'published', updated_at: new Date().toISOString() }).eq('id', post.id).eq('status', 'draft').select('id');
      if (!claimed?.length) return answerCallback(query.id, post.status === 'published' ? 'Already posted.' : 'This draft is no longer open.');
      await answerCallback(query.id, 'Posting to Google…');
      try {
        const sent = await publish(post, location);
        const updated = await updatePost(post.id, { google_name: sent.name, google_state: sent.state || 'PROCESSING', search_url: sent.searchUrl || null });
        await editMessage(chatId, messageId, publishedScreen(updated, location.title));
      } catch (error) {
        await updatePost(post.id, { status: 'draft' });
        const reason = error instanceof Error ? error.message : 'Unknown error';
        await sendMessage(chatId, { text: `⚠️ Google didn’t accept the post: ${h(truncate(reason, 300))}\n<i>The draft is still open; you can change it and try again.</i>` });
      }
      return;
    }
    if (action === 's') {
      if (!post.google_name) return answerCallback(query.id);
      const live = await getLocalPost(location, post.google_name);
      const updated = await updatePost(post.id, { google_state: live.state || post.google_state, search_url: live.searchUrl || post.search_url });
      await editMessage(chatId, messageId, publishedScreen(updated, location.title, `<i>Checked just now.</i>`));
      return answerCallback(query.id, live.state === 'LIVE' ? 'Live' : live.state === 'REJECTED' ? 'Rejected' : 'Still processing');
    }
    if (action === 'x') {
      if (!post.google_name || post.status !== 'published') return answerCallback(query.id);
      await editMessage(chatId, messageId, {
        text: `🗑 Delete this post from the <b>${h(location.title)}</b> Google profile? This can’t be undone.`,
        buttons: [[{ text: '🗑 Yes, delete it', callback_data: `gp:X:${post.id}` }, { text: '↩️ Keep it', callback_data: `gp:k:${post.id}` }]],
      });
      return answerCallback(query.id);
    }
    if (action === 'k') {
      await editMessage(chatId, messageId, publishedScreen(post, location.title));
      return answerCallback(query.id);
    }
    if (action === 'X') {
      if (!post.google_name || post.status !== 'published') return answerCallback(query.id);
      await deleteLocalPost(location, post.google_name);
      await updatePost(post.id, { status: 'deleted' });
      await editMessage(chatId, messageId, { text: `🗑 <s>Google post for ${h(location.title)}</s>\n<i>Deleted from Google.</i>` });
      return answerCallback(query.id, 'Deleted');
    }
    return answerCallback(query.id);
  } catch (error) {
    console.error('Google post button failed:', error);
    if (action === 'w' || action === 'r') {
      await sendMessage(chatId, { text: '⚠️ I couldn’t write the post right now (the AI may be busy). Try again in a minute.' });
      return;
    }
    return answerCallback(query.id, (error instanceof Error ? error.message : 'Something went wrong').slice(0, 180));
  }
}
