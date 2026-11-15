import { AppError, appRoute, jsonBody } from '@/lib/app-auth';
import { appEmail } from '@/lib/app-api';
import {
  addIgnoreRule,
  conversationWith,
  draftEmailReply,
  getEmailAccount,
  getEmailItem,
  isNoReply,
  sendEmailReply,
  updateEmailAccount,
  updateEmailItem,
} from '@/lib/email/inbox';
import { transcribeAudio } from '@/lib/task-ai';

const AUTO_PREFIX = 'No notes from Ahmed:';

/** The "✨ AI reply" instructions: Ahmed gave no notes, so the AI answers in his name without deciding for him. */
function autoBrief(item: { from_name: string | null; from_email: string | null; to_email: string | null; body: string | null }, inbox: string) {
  const sender = [item.from_name, item.from_email ? `<${item.from_email}>` : null].filter(Boolean).join(' ') || 'the sender';
  const to = item.to_email || '';
  const toAhmed = to.toLowerCase().includes(inbox.toLowerCase());
  const greeting = (item.body || '').trim().split('\n')[0].slice(0, 80);
  return [
    `${AUTO_PREFIX} write the best professional reply yourself.`,
    `YOU ARE AHMED ANWAR (North Via Marketing, inbox ${inbox}), replying to ${sender}. Greet the sender by their first name.`,
    toAhmed
      ? `The email was sent to Ahmed (To: ${to}).`
      : `IMPORTANT: this email was NOT addressed to Ahmed (To: ${to || 'someone else'}${greeting ? `; it opens with "${greeting}"` : ''}); Ahmed was only copied. Do NOT answer its questions or make promises for the people it was addressed to. Write a brief reply from Ahmed as the sender's marketing partner: acknowledge it, add anything useful from his side, and say he will follow up with them where needed.`,
    'Never answer on behalf of other people or companies in the email.',
    'Keep it short: 3–6 sentences unless the email asks several direct questions to Ahmed.',
    'Do not promise, confirm or invent anything only Ahmed can decide (prices, dates, times, decisions): write a short placeholder in square brackets instead, e.g. [date], so he fills it in before sending.',
  ].join('\n');
}

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

async function load(params: Ctx['params']) {
  const { id } = await params;
  const item = await getEmailItem(id);
  if (!item) throw new AppError('Email not found.', 404);
  const account = await getEmailAccount(item.account_id);
  if (!account) throw new AppError('This inbox was disconnected.', 410);
  return { item, account };
}

/** One email in full, with the earlier emails with the same person. */
export const GET = appRoute<Ctx>(async (_request, _device, { params }) => {
  const { item, account } = await load(params);
  const history = await conversationWith(item).catch(() => []);
  return {
    email: appEmail(item, account, true),
    canReply: item.status !== 'sent' && !isNoReply(item.from_email),
    history: history.filter((h) => h.id !== item.id).map((h) => appEmail(h, account)),
  };
});

/**
 * Same steps as the Telegram email card; nothing is sent without action "send".
 *   draft   { text } or { audio: { data, mimeType } }   what to say; added to earlier notes, AI writes the reply
 *   draft   { auto: true }                                no notes: the AI writes a professional reply from the email itself
 *   edit    { draft }                                     replace the draft with Ahmed's own text
 *   send                                                  send the current draft from the same inbox and thread
 *   cancel                                                drop the draft
 *   done | ignore                                         ignore = this sender is skipped in this inbox from now on
 *   ignore_similar                                        emails like this one (same sender + subject, or same kind) are skipped from now on
 */
export const POST = appRoute<Ctx>(async (request, _device, { params }) => {
  const { item, account } = await load(params);
  const body = await jsonBody<{ action?: unknown; text?: unknown; audio?: { data?: unknown; mimeType?: unknown }; draft?: unknown; auto?: unknown }>(request);
  const reply = (updated: typeof item, extra: Record<string, unknown> = {}) => ({ email: appEmail(updated, account, true), ...extra });

  switch (body.action) {
    case 'draft': {
      if (item.status === 'sent') throw new AppError('Already replied.', 409);
      if (isNoReply(item.from_email)) throw new AppError('This is a no-reply address: nobody reads replies to it.', 409);
      let said = typeof body.text === 'string' ? body.text.trim().slice(0, 4000) : '';
      let heard: string | null = null;
      if (!said && body.audio && typeof body.audio.data === 'string' && typeof body.audio.mimeType === 'string') {
        if (body.audio.data.length > 14_000_000) throw new AppError('The voice note is too long.', 413);
        said = heard = await transcribeAudio({ data: body.audio.data, mimeType: body.audio.mimeType });
      }
      const auto = !said && body.auto === true;
      if (!said && !auto) throw new AppError('Say or type what the reply should say.');
      // No notes: the AI answers from the email and the conversation, inventing nothing Ahmed must decide.
      const earlier = item.status === 'draft' || item.status === 'replying' ? item.brief : null;
      const brief = auto ? autoBrief(item, account.email) : [earlier?.startsWith(AUTO_PREFIX) ? null : earlier, said].filter(Boolean).join('\n');
      let draft: string;
      try {
        draft = await draftEmailReply({ ...item, brief }, account, brief);
      } catch (error) {
        console.error('App email draft failed:', error);
        await updateEmailItem(item.id, { status: 'replying', brief });
        throw new AppError('The AI couldn’t write the reply right now. Try again in a minute.', 503);
      }
      return reply(await updateEmailItem(item.id, { status: 'draft', draft, brief }), { heard });
    }
    case 'edit': {
      if (item.status === 'sent') throw new AppError('Already replied.', 409);
      if (typeof body.draft !== 'string' || body.draft.trim().length < 2) throw new AppError('draft must be the reply text.');
      return reply(await updateEmailItem(item.id, { status: 'draft', draft: body.draft.trim().slice(0, 20_000) }));
    }
    case 'send': {
      if (item.status === 'sent') throw new AppError('Already sent.', 409);
      if (item.status !== 'draft' || !item.draft) throw new AppError('There’s no draft to send.', 409);
      try {
        await sendEmailReply(item, account);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        throw new AppError(`Not sent. ${reason.slice(0, 300)}`, 502);
      }
      return reply(await updateEmailItem(item.id, { status: 'sent', sent_at: new Date().toISOString() }));
    }
    case 'cancel':
      if (item.status === 'sent') throw new AppError('Already sent.', 409);
      return reply(await updateEmailItem(item.id, { status: 'new', draft: null, brief: null }));
    case 'done':
      return reply(await updateEmailItem(item.id, { status: 'done' }));
    case 'ignore_similar': {
      await addIgnoreRule(item);
      return reply(await updateEmailItem(item.id, { status: 'ignored' }));
    }
    case 'ignore': {
      if (item.from_email && !account.ignored_senders.includes(item.from_email)) {
        await updateEmailAccount(account.id, { ignored_senders: [...account.ignored_senders, item.from_email] });
      }
      return reply(await updateEmailItem(item.id, { status: 'ignored' }));
    }
    default:
      throw new AppError('Unknown action.');
  }
});
