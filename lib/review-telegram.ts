import crypto from 'crypto';
import { getDoc, setDoc, setDocs } from './data/store';
import { listClientProfiles } from './admin-ops';
import {
  GBP_REVIEWS,
  findReviewByShortRef,
  getStoredReview,
  listReviewQueue,
  postApprovedReply,
  reviewShortRef,
  regenerateReviewDraft,
  setReviewDraft,
  skipStoredReview,
  syncAllReviews,
  type SyncSummary,
} from './review-engine';
import {
  OutgoingMessage,
  allowedChatIds,
  answerCallback,
  editMessage,
  escapeHtml as h,
  sendMessage,
  truncate,
} from './telegram';
import { whatsAppShareLink } from './whatsapp-share';
import { websiteDigestLine } from './website-monitor';
import type { GbpStoredReview } from '@/types/database';

// Telegram review approvals.
// Button data (max 64 bytes) is "<action>:<id>" where id is a review shortRef or a batch id:
//   a/A approve → confirm   e edit   g regenerate   s skip   c cancel
//   b/B bulk 5★ → confirm   k cancel bulk   x show batch one by one
const BATCHES = 'gbp_telegram_batches' as const;
const MAX_CARDS_PER_DIGEST = 25;
const PANEL_URL = 'https://www.northviamarketing.com/admin/reviews';

type Review = GbpStoredReview & { id: string };

const DATE = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', dateStyle: 'medium' });
const stars = (n: number) => (n > 0 ? '★'.repeat(n) + '☆'.repeat(5 - n) : 'No rating');
const isPending = (r: GbpStoredReview) => r.status === 'draft_ready' || r.status === 'needs_draft';
const isFiveReady = (r: GbpStoredReview) => r.rating === 5 && r.status === 'draft_ready' && Boolean(r.draft);

async function clientNameMap() {
  const clients = await listClientProfiles();
  return new Map(clients.map((c) => [c.id, c.brandName]));
}

// ---------- Message builders ----------

const whatsAppRow = (kind: 'r' | 'b', id: string) => [{ text: '📲 Forward to WhatsApp', url: whatsAppShareLink(kind, id) }];

function reviewCard(review: Review, clientName: string, note?: string): OutgoingMessage {
  const ref = review.shortRef!;
  const share = [whatsAppRow('r', ref)];
  const lines = [
    `${stars(review.rating)}  <b>${h(clientName)}</b> · ${h(review.locationTitle)}`,
    `<b>${h(review.reviewerName || 'Anonymous')}</b> · ${DATE.format(new Date(review.createTime))}`,
    '',
    review.comment ? `“${h(truncate(review.comment, 1500))}”` : '<i>Rating only, no written review.</i>',
    '',
  ];

  if (review.status === 'posted') {
    lines.push('✅ <b>Posted on Google:</b>', h(truncate(review.postedReply || review.draft || '', 1800)));
    return { text: lines.join('\n'), buttons: share };
  }
  if (review.status === 'skipped') {
    lines.push('⏭ <b>Skipped</b> — no reply will be posted.');
    return { text: lines.join('\n'), buttons: share };
  }
  if (review.status === 'replied') {
    lines.push('💬 Already has a reply on Google.');
    return { text: lines.join('\n'), buttons: share };
  }

  if (review.draft) {
    lines.push('<b>Draft reply:</b>', h(truncate(review.draft, 1800)));
  } else {
    lines.push(`⚠️ <i>No draft yet${review.draftError ? ` (${h(truncate(review.draftError, 150))})` : ''}. Tap Regenerate or Edit.</i>`);
  }
  if (note) lines.push('', note);

  const firstRow = review.draft
    ? [{ text: '✅ Approve', callback_data: `a:${ref}` }, { text: '✏️ Edit', callback_data: `e:${ref}` }]
    : [{ text: '✏️ Write reply', callback_data: `e:${ref}` }];
  return {
    text: lines.join('\n'),
    buttons: [firstRow, [{ text: '🔄 Regenerate', callback_data: `g:${ref}` }, { text: '⏭ Skip', callback_data: `s:${ref}` }], ...share],
  };
}

function confirmCard(review: Review, clientName: string): OutgoingMessage {
  const card = reviewCard(review, clientName);
  return {
    text: `${card.text}\n\n❓ <b>Post this reply publicly on Google?</b>`,
    buttons: [[
      { text: '✅ Yes, post it', callback_data: `A:${review.shortRef}` },
      { text: '↩️ Cancel', callback_data: `c:${review.shortRef}` },
    ]],
  };
}

interface GroupPart {
  part: number; // 1-based
  parts: number;
  total: number; // all 5★ ready for this client across every part
  startIndex: number; // numbering continues across parts
}

/**
 * One message of a client's 5★ list. Long lists are split to fit Telegram's
 * 4096-char limit; only the last part carries the buttons, and they act on every part.
 */
function groupMessage(batchId: string, clientName: string, reviews: Review[], { part, parts, total, startIndex }: GroupPart): OutgoingMessage {
  const items = reviews.map((r, i) =>
    [
      `<b>${startIndex + i}. ${h(r.reviewerName || 'Anonymous')}</b> · ${h(r.locationTitle)}`,
      r.comment ? `“${h(truncate(r.comment, 220))}”` : '<i>Rating only</i>',
      `↳ ${h(truncate(r.draft || '', 3000))}`, // full draft in practice; cap only guards the 4096-char message limit
    ].join('\n')
  );
  const partLabel = parts > 1 ? ` (part ${part} of ${parts})` : '';
  const header = `⭐⭐⭐⭐⭐ <b>${h(clientName)}</b> — ${total} five-star repl${total === 1 ? 'y' : 'ies'} ready${partLabel}`;
  const text = [header, '', items.join('\n\n')].join('\n');

  if (part < parts) return { text: `${text}\n\n⬇️ <i>Continued in the next message.</i>` };
  return {
    text,
    buttons: [[
      { text: `✅ Approve all ${total}`, callback_data: `b:${batchId}` },
      { text: '🔍 One by one', callback_data: `x:${batchId}` },
    ], whatsAppRow('b', batchId)],
  };
}

function groupConfirmMessage(batchId: string, clientName: string, total: number, parts: number): OutgoingMessage {
  return {
    text: [
      `⭐⭐⭐⭐⭐ <b>${h(clientName)}</b>`,
      `❓ <b>Post all ${total} five-star replies publicly on Google?</b>`,
      parts > 1 ? `<i>This includes every review in the ${parts} messages above.</i>` : '',
    ].filter(Boolean).join('\n'),
    buttons: [[
      { text: `✅ Yes, post ${total}`, callback_data: `B:${batchId}` },
      { text: '↩️ Cancel', callback_data: `k:${batchId}` },
    ]],
  };
}

/** Splits 5★ reviews into groups that fit comfortably in one Telegram message (4096 chars). */
function chunkForTelegram(reviews: Review[]) {
  const chunks: Review[][] = [];
  let current: Review[] = [];
  let size = 0;
  for (const r of reviews) {
    const estimate = 120 + Math.min(r.comment.length, 220) + (r.draft || '').length;
    if (current.length && (size + estimate > 3600 || current.length >= 8)) {
      chunks.push(current);
      current = [];
      size = 0;
    }
    current.push(r);
    size += estimate;
  }
  if (current.length) chunks.push(current);
  return chunks;
}

async function createBatch(clientName: string, reviewIds: string[], lastPartIds: string[], parts: number) {
  const batchId = crypto.randomBytes(6).toString('base64url');
  await setDoc(BATCHES, batchId, { clientName, reviewIds, lastPartIds, parts, createdAt: new Date().toISOString() });
  return batchId;
}

async function loadBatch(batchId: string) {
  const data = await getDoc<{ clientName: string; reviewIds: string[]; lastPartIds?: string[]; parts?: number }>(BATCHES, batchId);
  if (!data) return null;
  const reviews = (await Promise.all(data.reviewIds.map((id) => getStoredReview(id)))).filter((r): r is Review => Boolean(r));
  return { clientName: data.clientName, reviews, lastPartIds: data.lastPartIds || data.reviewIds, parts: data.parts || 1 };
}

// ---------- WhatsApp text ----------

/** Plain text (WhatsApp formatting) for a review card, from the current data. */
function reviewWhatsAppText(review: Review, clientName: string) {
  const reply =
    review.status === 'posted' ? ['*Posted reply:*', review.postedReply || review.draft || '']
    : review.status === 'replied' ? ['*Reply on Google:*', review.existingReply || '']
    : review.draft ? ['*Draft reply:*', review.draft]
    : ['_No reply drafted yet._'];
  return [
    `${stars(review.rating)}  *${clientName}* · ${review.locationTitle || ''}`,
    `${review.reviewerName || 'Anonymous'} · ${DATE.format(new Date(review.createTime))}`,
    '',
    review.comment ? `“${review.comment}”` : '_Rating only, no written review._',
    '',
    ...reply,
  ].join('\n');
}

/** Text behind a "Forward to WhatsApp" button, or null if the review or list is gone. */
export async function whatsAppTextFor(kind: 'r' | 'b', id: string) {
  const names = await clientNameMap();
  if (kind === 'r') {
    const review = await findReviewByShortRef(id);
    return review ? reviewWhatsAppText(review, names.get(review.clientId) || 'Client') : null;
  }
  const batch = await loadBatch(id);
  if (!batch) return null;
  const items = batch.reviews.map((r, i) =>
    [
      `*${i + 1}. ${r.reviewerName || 'Anonymous'}* · ${r.locationTitle || ''}`,
      r.comment ? `“${r.comment}”` : '_Rating only_',
      `↳ ${r.status === 'posted' ? r.postedReply || r.draft || '' : r.draft || '_No draft yet_'}`,
    ].join('\n')
  );
  return [`⭐⭐⭐⭐⭐ *${batch.clientName}* — ${batch.reviews.length} five-star review${batch.reviews.length === 1 ? '' : 's'}`, '', items.join('\n\n')].join('\n');
}

// ---------- Digest ----------

/**
 * Sends pending reviews to the allowed chats: 5★ grouped per client with
 * "Approve all", everything else as one card per review (worst first).
 * With onlyUnsent, reviews already delivered earlier are summarized, not resent.
 */
export async function sendReviewDigest(options: {
  onlyUnsent: boolean;
  chatIds?: string[];
  summary?: SyncSummary | null;
  followUp?: boolean; // sent later the same day once held-back drafts are ready
}) {
  const chatIds = options.chatIds ?? allowedChatIds();
  if (chatIds.length === 0) throw new Error('TELEGRAM_ALLOWED_CHAT_IDS is not configured.');

  const [queue, names] = await Promise.all([listReviewQueue(), clientNameMap()]);
  // shortRef is derived from the id, so reviews stored before it existed get one here.
  const pending = queue.filter(isPending).map((r) => ({ ...r, shortRef: r.shortRef || reviewShortRef(r.id) }));
  const unsent = options.onlyUnsent ? pending.filter((r) => !r.telegramSentAt) : pending;
  // Automatic digests only send reviews that have a draft; the rest follow once drafted.
  const toSend = options.onlyUnsent ? unsent.filter((r) => r.draft) : unsent;
  const stillDrafting = unsent.length - toSend.length;
  const earlier = pending.length - unsent.length;

  // A follow-up with nothing new to show would just be noise.
  if (options.followUp && toSend.length === 0) return { messagesSent: 0, reviewsSent: 0 };

  const messages: OutgoingMessage[] = [];
  const sentIds: string[] = [];

  const header = [
    options.followUp ? '✍️ <b>More review replies are ready</b>' : '📋 <b>Google reviews</b>',
    // Counts are about what you haven't seen in Telegram yet. A review found by an
    // earlier check (e.g. the overnight sync) is still new here until it's been sent.
    options.summary ? `🔎 Checked ${options.summary.locationsChecked} location(s) on Google.` : '',
    toSend.length
      ? options.onlyUnsent
        ? `🆕 ${toSend.length} new review${toSend.length === 1 ? '' : 's'} waiting for your approval below.`
        : `${toSend.length} waiting for your approval below.`
      : '✅ Nothing new since the last message.',
    stillDrafting > 0 ? `✍️ ${stillDrafting} more are still being drafted — they'll be sent here once ready.` : '',
    earlier > 0 ? `${earlier} sent earlier still waiting — send /reviews to see them again.` : '',
  ].filter(Boolean).join('\n');
  // Scheduled digests and "Check now" also carry the one-line website status.
  const websiteLine = options.summary && !options.followUp ? await websiteDigestLine().catch(() => '') : '';
  messages.push({ text: websiteLine ? `${header}

${websiteLine}` : header, buttons: [[{ text: 'Open reviews panel', url: PANEL_URL }]] });

  const byClient = new Map<string, Review[]>();
  for (const r of toSend) byClient.set(r.clientId, [...(byClient.get(r.clientId) || []), r]);

  let cards = 0;
  let overflow = 0;
  for (const [clientId, reviews] of byClient) {
    const clientName = names.get(clientId) || 'Client';

    const fiveStar = reviews.filter(isFiveReady);
    const chunks = chunkForTelegram(fiveStar);
    if (chunks.length) {
      // One batch per client: the last part's "Approve all" covers every part.
      const batchId = await createBatch(clientName, fiveStar.map((r) => r.id), chunks[chunks.length - 1].map((r) => r.id), chunks.length);
      let startIndex = 1;
      chunks.forEach((chunk, i) => {
        messages.push(groupMessage(batchId, clientName, chunk, { part: i + 1, parts: chunks.length, total: fiveStar.length, startIndex }));
        startIndex += chunk.length;
      });
      sentIds.push(...fiveStar.map((r) => r.id));
    }

    const individual = reviews.filter((r) => !isFiveReady(r)).sort((a, b) => (a.rating || 6) - (b.rating || 6));
    for (const r of individual) {
      if (cards >= MAX_CARDS_PER_DIGEST) {
        overflow++;
        continue;
      }
      messages.push(reviewCard(r, clientName));
      sentIds.push(r.id);
      cards++;
    }
  }
  if (overflow) messages.push({ text: `…and ${overflow} more. Send /reviews later or open the panel.`, buttons: [[{ text: 'Open reviews panel', url: PANEL_URL }]] });

  for (const chatId of chatIds) {
    for (const message of messages) {
      await sendMessage(chatId, message);
      await new Promise((resolve) => setTimeout(resolve, 60)); // stay well under Telegram's per-chat rate limit
    }
  }

  if (sentIds.length) {
    const now = new Date().toISOString();
    // Merge-writes rows that exist (every sent id came from the review queue).
    await setDocs(GBP_REVIEWS, sentIds.map((id) => ({ id, data: { telegramSentAt: now, shortRef: reviewShortRef(id) } })), { merge: true });
  }

  return { messagesSent: messages.length * chatIds.length, reviewsSent: sentIds.length };
}

/** Daily job: check Google for new reviews, draft replies, then send what's new. */
export async function runDailyDigest() {
  const summary = await syncAllReviews();
  const delivery = await sendReviewDigest({ onlyUnsent: true, summary });
  return { summary, delivery };
}

// ---------- Button and message handling ----------

interface CallbackQuery {
  id: string;
  data?: string;
  message?: { message_id: number; chat: { id: number } };
}

export async function handleCallback(query: CallbackQuery) {
  const chatId = query.message?.chat.id;
  const messageId = query.message?.message_id;
  const [action, id] = (query.data || '').split(':');
  if (!chatId || !messageId || !action || !id) return answerCallback(query.id);

  try {
    // Bulk 5★ actions
    if ('bBkx'.includes(action)) {
      const batch = await loadBatch(id);
      if (!batch) return answerCallback(query.id, 'This list has expired.');
      const ready = batch.reviews.filter(isFiveReady);

      if (action === 'x') {
        await answerCallback(query.id);
        const names = await clientNameMap();
        for (const r of batch.reviews.filter(isPending)) {
          await sendMessage(chatId, reviewCard({ ...r, shortRef: r.shortRef || reviewShortRef(r.id) }, names.get(r.clientId) || batch.clientName));
        }
        return;
      }
      if (ready.length === 0) {
        await editMessage(chatId, messageId, { text: `⭐⭐⭐⭐⭐ <b>${h(batch.clientName)}</b> — nothing left to approve in this list.` });
        return answerCallback(query.id, 'Already handled.');
      }
      if (action === 'b') {
        await editMessage(chatId, messageId, groupConfirmMessage(id, batch.clientName, ready.length, batch.parts));
        return answerCallback(query.id);
      }
      if (action === 'k') {
        // Restore the last part (the message holding the buttons), skipping anything handled meanwhile.
        const lastReady = ready.filter((r) => batch.lastPartIds.includes(r.id));
        await editMessage(chatId, messageId, groupMessage(id, batch.clientName, lastReady, {
          part: batch.parts,
          parts: batch.parts,
          total: ready.length,
          startIndex: ready.length - lastReady.length + 1,
        }));
        return answerCallback(query.id, 'Cancelled');
      }
      // B: confirmed — post each reply; ratings and status were re-checked above.
      await answerCallback(query.id, `Posting ${ready.length}…`);
      let posted = 0;
      const failed: string[] = [];
      for (const r of ready) {
        try {
          await postApprovedReply(r.id, r.draft!);
          posted++;
        } catch (error) {
          failed.push(`${r.reviewerName || 'Anonymous'}: ${error instanceof Error ? error.message : 'failed'}`);
        }
      }
      await editMessage(chatId, messageId, {
        text: [
          `⭐⭐⭐⭐⭐ <b>${h(batch.clientName)}</b>`,
          `✅ Posted ${posted} repl${posted === 1 ? 'y' : 'ies'} on Google.`,
          ...failed.map((f) => `⚠️ ${h(truncate(f, 200))}`),
        ].join('\n'),
      });
      return;
    }

    const review = await findReviewByShortRef(id);
    if (!review) return answerCallback(query.id, 'Review not found.');
    const clientName = (await clientNameMap()).get(review.clientId) || 'Client';

    if (!isPending(review) && action !== 'c') {
      await editMessage(chatId, messageId, reviewCard(review, clientName));
      return answerCallback(query.id, 'Already handled.');
    }

    switch (action) {
      case 'a':
        await editMessage(chatId, messageId, confirmCard(review, clientName));
        return answerCallback(query.id);
      case 'c':
        await editMessage(chatId, messageId, reviewCard(review, clientName));
        return answerCallback(query.id, 'Cancelled');
      case 'A': {
        if (!review.draft) return answerCallback(query.id, 'No draft to post.');
        await answerCallback(query.id, 'Posting…');
        await postApprovedReply(review.id, review.draft);
        const updated = await getStoredReview(review.id);
        await editMessage(chatId, messageId, reviewCard(updated!, clientName));
        return;
      }
      case 's':
        await skipStoredReview(review.id);
        await editMessage(chatId, messageId, reviewCard({ ...review, status: 'skipped' }, clientName));
        return answerCallback(query.id, 'Skipped');
      case 'g': {
        await answerCallback(query.id, 'Writing a new draft…');
        await regenerateReviewDraft(review.id);
        const updated = await getStoredReview(review.id);
        await editMessage(chatId, messageId, reviewCard(updated!, clientName, '🔄 <i>New draft generated.</i>'));
        return;
      }
      case 'e':
        await answerCallback(query.id);
        await sendMessage(chatId, {
          text: [
            `✏️ New reply for <b>${h(review.reviewerName || 'Anonymous')}</b> (${h(clientName)}).`,
            'Reply to <b>this message</b> with the exact text to use. You will see it again before anything is posted.',
            '',
            `<code>ref:${review.shortRef}</code>`,
          ].join('\n'),
          forceReply: true,
        });
        return;
      default:
        return answerCallback(query.id);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Something went wrong';
    await answerCallback(query.id, truncate(message, 180));
    await sendMessage(chatId, { text: `⚠️ ${h(truncate(message, 500))}` }).catch(() => undefined);
  }
}

interface IncomingMessage {
  text?: string;
  chat: { id: number };
  reply_to_message?: { text?: string };
}

/** "Show waiting reviews": everything pending, including reviews sent before. */
export async function showWaitingReviews(chatId: number | string) {
  return sendReviewDigest({ onlyUnsent: false, chatIds: [String(chatId)] });
}

/** "Check Google now": sync, draft, then send only what's new. */
export async function checkReviewsNow(chatId: number | string) {
  await sendMessage(chatId, { text: '🔎 Checking Google for new reviews…' });
  const summary = await syncAllReviews();
  return sendReviewDigest({ onlyUnsent: true, chatIds: [String(chatId)], summary });
}

/** Waiting counts per client, for the menu. */
export async function reviewQueueOverview() {
  const [queue, names] = await Promise.all([listReviewQueue(), clientNameMap()]);
  const perClient = new Map<string, { name: string; fiveStar: number; oneByOne: number }>();
  for (const r of queue.filter(isPending)) {
    const entry = perClient.get(r.clientId) || { name: names.get(r.clientId) || 'Client', fiveStar: 0, oneByOne: 0 };
    if (isFiveReady(r)) entry.fiveStar++;
    else entry.oneByOne++;
    perClient.set(r.clientId, entry);
  }
  const clients = Array.from(perClient.values()).sort((a, b) => b.fiveStar + b.oneByOne - (a.fiveStar + a.oneByOne));
  return { total: clients.reduce((sum, c) => sum + c.fiveStar + c.oneByOne, 0), clients };
}

/**
 * Handles review-specific messages: replies to an "Edit" prompt and the
 * /reviews and /check commands. Returns false when the message isn't for this module.
 */
export async function handleReviewMessage(message: IncomingMessage): Promise<boolean> {
  const chatId = message.chat.id;
  const text = (message.text || '').trim();

  // A reply to an "Edit" prompt sets a new draft and shows the card again for approval.
  const refMatch = message.reply_to_message?.text?.match(/ref:([A-Za-z0-9_-]{10})/);
  if (refMatch && text && !text.startsWith('/')) {
    const review = await findReviewByShortRef(refMatch[1]);
    if (!review) await sendMessage(chatId, { text: 'Review not found.' });
    else if (!isPending(review)) await sendMessage(chatId, { text: 'This review was already handled.' });
    else {
      await setReviewDraft(review.id, text);
      const updated = await getStoredReview(review.id);
      const clientName = (await clientNameMap()).get(review.clientId) || 'Client';
      await sendMessage(chatId, reviewCard(updated!, clientName, '✏️ <i>Your edited reply. Tap Approve to post it.</i>'));
    }
    return true;
  }

  const command = text.split(/[\s@]/)[0].toLowerCase();
  if (command === '/reviews' || command === '/pending') { // /pending kept as an old alias
    await showWaitingReviews(chatId);
    return true;
  }
  if (command === '/check') {
    await checkReviewsNow(chatId);
    return true;
  }
  return false;
}
