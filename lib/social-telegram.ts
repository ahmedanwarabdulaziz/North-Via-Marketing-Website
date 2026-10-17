import { listClientProfiles } from './admin-ops';
import {
  findCommentByShortRef,
  getStoredComment,
  hideStoredComment,
  listCommentQueue,
  markCommentsSent,
  postApprovedCommentReply,
  regenerateCommentDraft,
  setCommentDraft,
  skipComment,
  socialOverview,
  syncSocial,
  type StoredComment,
  type SocialSyncSummary,
} from './social-sync';
import { OutgoingMessage, allowedChatIds, answerCallback, editMessage, escapeHtml as h, sendMessage, truncate } from './telegram';

// Facebook & Instagram comments in Telegram. Button data is "sc:<action>:<shortRef>":
//   a/A approve → confirm   e edit   g regenerate   s skip   c cancel   h/H hide → confirm
// Risky comments are sent the hour they're found; the rest come with the 9 AM / 9 PM digest.

const MAX_CARDS = 25;
const DATE = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', dateStyle: 'medium', timeStyle: 'short' });
const isPending = (c: StoredComment) => c.status === 'draft_ready' || c.status === 'needs_draft';
const platformLabel = (c: StoredComment) => (c.platform === 'facebook' ? '📘 Facebook' : '📸 Instagram');

async function clientNames() {
  return new Map((await listClientProfiles()).map((c) => [c.id, c.brandName]));
}

const compact = (n?: number) =>
  n === undefined ? '—' : n >= 10_000 ? `${(n / 1000).toFixed(0)}k` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
const signed = (n?: number) => (n === undefined ? '' : n > 0 ? `+${n}` : String(n));

// ---------- Cards ----------

function riskLine(c: StoredComment) {
  if (c.riskLevel === 'high') return `🚨 <b>High risk${c.riskCategory ? ` · ${h(c.riskCategory)}` : ''}</b>${c.riskReason ? `\n<i>${h(c.riskReason)}</i>` : ''}`;
  if (c.riskLevel === 'watch') return `⚠️ <b>Watch${c.riskCategory ? ` · ${h(c.riskCategory)}` : ''}</b>${c.riskReason ? ` — <i>${h(c.riskReason)}</i>` : ''}`;
  return '';
}

export function commentCard(c: StoredComment, clientName: string, note?: string): OutgoingMessage {
  const ref = c.shortRef;
  const lines = [
    `${platformLabel(c)} · <b>${h(clientName)}</b>`,
    riskLine(c),
    `<b>${h(c.authorName || 'Someone')}</b> · ${DATE.format(new Date(c.createdTime))}`,
    c.postExcerpt ? `<i>On: “${h(truncate(c.postExcerpt, 120))}”</i>` : '',
    '',
    `💬 “${h(truncate(c.message, 1500))}”`,
    '',
  ].filter((l, i) => l !== '' || i > 3);
  const open = c.postPermalink ? [{ text: '🔗 Open post', url: c.postPermalink }] : [];

  if (c.status === 'posted') {
    lines.push('✅ <b>Reply posted:</b>', h(truncate(c.postedReply || '', 1500)));
    return { text: lines.join('\n'), buttons: open.length ? [open] : undefined };
  }
  if (c.status === 'hidden') {
    lines.push('🙈 <b>Hidden.</b> Only the commenter and their friends can see it. You can unhide it in Facebook/Instagram.');
    return { text: lines.join('\n'), buttons: open.length ? [open] : undefined };
  }
  if (c.status === 'skipped') {
    lines.push('⏭ <b>Skipped</b> — no reply will be posted.');
    return { text: lines.join('\n'), buttons: open.length ? [open] : undefined };
  }
  if (c.status === 'replied') {
    lines.push('💬 Already answered on the page.');
    return { text: lines.join('\n'), buttons: open.length ? [open] : undefined };
  }

  if (c.draft) lines.push('<b>Draft reply:</b>', h(truncate(c.draft, 1500)));
  else if (c.riskLevel) lines.push('<i>No reply suggested for this one. Hide it, write a reply, or skip.</i>');
  else lines.push(`⚠️ <i>Not checked yet${c.draftError ? ` (${h(truncate(c.draftError, 150))})` : ''}. Tap Regenerate or Write reply.</i>`);
  if (note) lines.push('', note);

  const first = c.draft
    ? [{ text: '✅ Approve', callback_data: `sc:a:${ref}` }, { text: '✏️ Edit', callback_data: `sc:e:${ref}` }]
    : [{ text: '✏️ Write reply', callback_data: `sc:e:${ref}` }];
  return {
    text: lines.join('\n'),
    buttons: [
      first,
      [{ text: '🔄 Regenerate', callback_data: `sc:g:${ref}` }, { text: '⏭ Skip', callback_data: `sc:s:${ref}` }],
      [{ text: '🙈 Hide comment', callback_data: `sc:h:${ref}` }, ...open],
    ],
  };
}

function confirmCard(c: StoredComment, clientName: string, kind: 'post' | 'hide'): OutgoingMessage {
  const card = commentCard(c, clientName);
  return kind === 'post'
    ? {
        text: `${card.text}\n\n❓ <b>Post this reply publicly on ${c.platform === 'facebook' ? 'Facebook' : 'Instagram'}?</b>`,
        buttons: [[{ text: '✅ Yes, post it', callback_data: `sc:A:${c.shortRef}` }, { text: '↩️ Cancel', callback_data: `sc:c:${c.shortRef}` }]],
      }
    : {
        text: `${card.text}\n\n❓ <b>Hide this comment?</b> Everyone except the commenter and their friends will stop seeing it. Nothing is deleted.`,
        buttons: [[{ text: '🙈 Yes, hide it', callback_data: `sc:H:${c.shortRef}` }, { text: '↩️ Cancel', callback_data: `sc:c:${c.shortRef}` }]],
      };
}

// ---------- Sending ----------

/** Sends risky comments right away, once each. */
export async function sendRiskAlerts(risky: StoredComment[], chatIds = allowedChatIds()) {
  const fresh = risky.filter((c) => !c.riskAlertedAt && isPending(c));
  if (!fresh.length || !chatIds.length) return 0;
  const names = await clientNames();
  for (const chatId of chatIds) {
    for (const c of fresh) {
      const card = commentCard(c, names.get(c.clientId) || 'Client');
      await sendMessage(chatId, { ...card, text: `🚨 <b>Risky comment</b>\n\n${card.text}` });
    }
  }
  await markCommentsSent(fresh.map((c) => c.id), 'riskAlertedAt');
  await markCommentsSent(fresh.map((c) => c.id), 'telegramSentAt');
  return fresh.length;
}

/** Followers and latest-post lines per client, for the digest and the menu. */
export async function socialStatsLines(detailed: boolean) {
  const [stats, names] = await Promise.all([socialOverview(), clientNames()]);
  const lines: string[] = [];
  for (const s of stats) {
    const name = h(names.get(s.clientId) || 'Client');
    const parts = [
      s.fb ? `📘 ${compact(s.fb.followers)}${s.fb.day ? ` (${signed(s.fb.day)})` : ''}` : '',
      s.ig ? `📸 ${compact(s.ig.followers)}${s.ig.day ? ` (${signed(s.ig.day)})` : ''}` : '',
    ].filter(Boolean);
    if (!detailed) {
      lines.push(`• ${name}: ${parts.join(' · ') || 'no data yet'}`);
      continue;
    }
    lines.push(`<b>${name}</b>`);
    const followerLine = [
      s.fb ? `📘 ${compact(s.fb.followers)} followers${s.fb.day || s.fb.week ? ` (${signed(s.fb.day) || '0'} today, ${signed(s.fb.week) || '0'} this week)` : ''}` : '',
      s.ig ? `📸 ${compact(s.ig.followers)} followers${s.ig.day || s.ig.week ? ` (${signed(s.ig.day) || '0'} today, ${signed(s.ig.week) || '0'} this week)` : ''}` : '',
    ].filter(Boolean);
    lines.push(...(followerLine.length ? followerLine : ['No numbers yet: the first check runs within the hour.']));
    for (const p of s.latest) {
      const reachLabel = p.platform === 'facebook' ? 'views' : 'reach';
      lines.push(
        `${p.platform === 'facebook' ? '📘' : '📸'} Latest: “${h(truncate(p.message || 'No caption', 50))}” — ${compact(p.reach)} ${reachLabel} · ${compact(p.likes)} ❤ · ${compact(p.commentsCount)} 💬`
      );
    }
    for (const a of s.accounts) if (a.lastError) lines.push(`⚠️ ${h(a.pageName)}: ${h(a.lastError)}`);
    lines.push(s.waiting ? `💬 ${s.waiting} comment${s.waiting === 1 ? '' : 's'} waiting` : '✅ No comments waiting', '');
  }
  return lines;
}

/**
 * Sends waiting comments: a short header with followers per client, then one card per
 * comment (risky first). With onlyUnsent, comments already delivered are only counted.
 */
export async function sendCommentDigest(options: { onlyUnsent: boolean; chatIds?: string[]; summary?: SocialSyncSummary | null }) {
  const chatIds = options.chatIds ?? allowedChatIds();
  if (!chatIds.length) return { messagesSent: 0, commentsSent: 0 };
  const [queue, names] = await Promise.all([listCommentQueue(), clientNames()]);
  const stats = await socialStatsLines(false);
  if (!stats.length) return { messagesSent: 0, commentsSent: 0 }; // nothing connected yet

  const unsent = options.onlyUnsent ? queue.filter((c) => !c.telegramSentAt) : queue;
  const earlier = queue.length - unsent.length;
  const rank = (c: StoredComment) => (c.riskLevel === 'high' ? 0 : c.riskLevel === 'watch' ? 1 : 2);
  const toSend = [...unsent].sort((a, b) => rank(a) - rank(b)).slice(0, MAX_CARDS);

  const header = [
    '📱 <b>Facebook & Instagram</b>',
    ...stats,
    '',
    toSend.length
      ? options.onlyUnsent
        ? `🆕 ${unsent.length} new comment${unsent.length === 1 ? '' : 's'} waiting below.`
        : `${unsent.length} comment${unsent.length === 1 ? '' : 's'} waiting below.`
      : '✅ No new comments since the last message.',
    earlier > 0 ? `${earlier} sent earlier still waiting — send /comments to see them again.` : '',
    options.summary?.errors.length ? `⚠️ ${options.summary.errors.length} page(s) could not be read: ${options.summary.errors.map((e) => h(e.account)).join(', ')}` : '',
  ].filter((l, i, all) => l !== '' || (i > 0 && all[i - 1] !== '')).join('\n').trim();

  const messages: OutgoingMessage[] = [{ text: header }, ...toSend.map((c) => commentCard(c, names.get(c.clientId) || 'Client'))];
  if (unsent.length > toSend.length) messages.push({ text: `…and ${unsent.length - toSend.length} more. Send /comments later.` });

  for (const chatId of chatIds) {
    for (const m of messages) {
      await sendMessage(chatId, m);
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
  }
  if (toSend.length) await markCommentsSent(toSend.map((c) => c.id), 'telegramSentAt');
  return { messagesSent: messages.length * chatIds.length, commentsSent: toSend.length };
}

export async function showWaitingComments(chatId: number | string) {
  return sendCommentDigest({ onlyUnsent: false, chatIds: [String(chatId)] });
}

/** "Check now": sync Facebook/Instagram, alert risky ones, then send anything new. */
export async function checkSocialNow(chatId: number | string) {
  await sendMessage(chatId, { text: '🔎 Checking Facebook and Instagram…' });
  const summary = await syncSocial({ timeBudgetMs: 40_000 });
  await sendRiskAlerts(summary.risky, [String(chatId)]);
  return sendCommentDigest({ onlyUnsent: true, chatIds: [String(chatId)], summary });
}

// ---------- Buttons and replies ----------

interface CallbackQuery {
  id: string;
  data?: string;
  message?: { message_id: number; chat: { id: number } };
}

export async function handleSocialCallback(query: CallbackQuery) {
  const chatId = query.message?.chat.id;
  const messageId = query.message?.message_id;
  const [, action, ref] = (query.data || '').split(':');
  if (!chatId || !messageId || !action || !ref) return answerCallback(query.id);

  try {
    const comment = await findCommentByShortRef(ref);
    if (!comment) return answerCallback(query.id, 'Comment not found.');
    const clientName = (await clientNames()).get(comment.clientId) || 'Client';
    const refresh = async (note?: string) => editMessage(chatId, messageId, commentCard((await getStoredComment(comment.id))!, clientName, note));

    if (!isPending(comment) && action !== 'c') {
      await refresh();
      return answerCallback(query.id, 'Already handled.');
    }

    switch (action) {
      case 'a':
        if (!comment.draft) return answerCallback(query.id, 'No reply to post.');
        await editMessage(chatId, messageId, confirmCard(comment, clientName, 'post'));
        return answerCallback(query.id);
      case 'h':
        await editMessage(chatId, messageId, confirmCard(comment, clientName, 'hide'));
        return answerCallback(query.id);
      case 'c':
        await refresh();
        return answerCallback(query.id, 'Cancelled');
      case 'A':
        await answerCallback(query.id, 'Posting…');
        await postApprovedCommentReply(comment.id);
        return refresh();
      case 'H':
        await answerCallback(query.id, 'Hiding…');
        await hideStoredComment(comment.id);
        return refresh();
      case 's':
        await skipComment(comment.id);
        await refresh();
        return answerCallback(query.id, 'Skipped');
      case 'g':
        await answerCallback(query.id, 'Writing a new draft…');
        await regenerateCommentDraft(comment.id);
        return refresh('🔄 <i>New draft generated.</i>');
      case 'e':
        await answerCallback(query.id);
        await sendMessage(chatId, {
          text: [
            `✏️ New reply to <b>${h(comment.authorName || 'this comment')}</b> (${h(clientName)}).`,
            'Reply to <b>this message</b> with the exact text to use. You will see it again before anything is posted.',
            '',
            `<code>cref:${comment.shortRef}</code>`,
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

/** Replies to a comment "Edit" prompt, and the /comments command. False when not for this module. */
export async function handleSocialMessage(message: { text?: string; chat: { id: number }; reply_to_message?: { text?: string } }) {
  const chatId = message.chat.id;
  const text = (message.text || '').trim();
  const refMatch = message.reply_to_message?.text?.match(/cref:([A-Za-z0-9_-]{10})/);
  if (refMatch && text && !text.startsWith('/')) {
    const comment = await findCommentByShortRef(refMatch[1]);
    if (!comment) await sendMessage(chatId, { text: 'Comment not found.' });
    else if (!isPending(comment)) await sendMessage(chatId, { text: 'This comment was already handled.' });
    else {
      await setCommentDraft(comment.id, text);
      const clientName = (await clientNames()).get(comment.clientId) || 'Client';
      await sendMessage(chatId, commentCard((await getStoredComment(comment.id))!, clientName, '✏️ <i>Your edited reply. Tap Approve to post it.</i>'));
    }
    return true;
  }
  const command = text.split(/[\s@]/)[0].toLowerCase();
  if (command === '/comments') {
    await showWaitingComments(chatId);
    return true;
  }
  return false;
}
