import { transcribeAudio } from '../task-ai';
import { answerCallback, downloadFile, editMessage, escapeHtml as h, sendMessage, truncate, type OutgoingMessage } from '../telegram';
import {
  draftEmailReply,
  emailAwaitingReply,
  emailCard,
  getEmailAccount,
  getEmailItem,
  isNoReply,
  sendEmailReply,
  updateEmailAccount,
  updateEmailItem,
  type EmailAccount,
  type EmailItem,
} from './inbox';

// Telegram side of email. Button data: "em:<action>:<item id>".
//   r reply (asks for a voice note or text)   f full email   d done   i ignore sender
//   s send the draft   c change the draft    x cancel the reply
// Nothing is ever sent without the ✅ Send tap on the preview.

interface CallbackQuery {
  id: string;
  data?: string;
  message?: { message_id: number; chat: { id: number } };
}

interface IncomingMessage {
  chat: { id: number };
  text?: string;
  caption?: string;
  voice?: { file_id: string; mime_type?: string; file_size?: number };
  audio?: { file_id: string; mime_type?: string; file_size?: number };
}

function previewCard(item: EmailItem, account: EmailAccount): OutgoingMessage {
  return {
    text: [
      `✉️ <b>Reply draft</b> · ${h(account.label || account.email)} → ${h(item.from_name || item.from_email || '')}`,
      `<i>Re: ${h(truncate(item.subject || '', 120))}</i>`,
      '',
      h(truncate(item.draft || '', 3300)),
      '',
      '<i>Nothing is sent until you tap ✅ Send.</i>',
    ].join('\n'),
    buttons: [
      [
        { text: '✅ Send', callback_data: `em:s:${item.id}` },
        { text: '✏️ Change', callback_data: `em:c:${item.id}` },
      ],
      [{ text: '✖️ Cancel', callback_data: `em:x:${item.id}` }],
    ],
  };
}

const ASK_TEXT =
  '🎙 <b>What should I reply?</b>\nSend a voice note or text, rough is fine (Arabic or English). I’ll write it professionally and show it to you before anything is sent.';

export async function handleEmailCallback(query: CallbackQuery) {
  const chatId = query.message?.chat.id;
  const messageId = query.message?.message_id;
  if (!chatId || !messageId) return answerCallback(query.id);
  const [, action, id] = (query.data || '').split(':');
  try {
    const item = await getEmailItem(id);
    if (!item) return answerCallback(query.id, 'This email is no longer available.');
    const account = await getEmailAccount(item.account_id);
    if (!account) return answerCallback(query.id, 'This inbox was disconnected.');

    if (action === 'f') {
      await answerCallback(query.id);
      const body = item.body || item.snippet || '(empty)';
      await sendMessage(chatId, {
        text: [`📄 <b>${h(truncate(item.subject || '', 150))}</b>`, `<i>${h(item.from_name || '')} &lt;${h(item.from_email || '')}&gt; · ${h(item.received_at?.slice(0, 16).replace('T', ' ') || '')}</i>`, '', h(truncate(body, 3500))].join('\n'),
        buttons: item.status === 'sent' || isNoReply(item.from_email) ? [] : [[{ text: '✍️ Reply', callback_data: `em:r:${item.id}` }]],
      });
      return;
    }
    if (action === 'r' || action === 'c') {
      if (item.status === 'sent') return answerCallback(query.id, 'Already replied.');
      if (isNoReply(item.from_email)) return answerCallback(query.id, 'This is a no-reply address: nobody reads replies to it.');
      await updateEmailItem(item.id, { status: 'replying', chat_id: String(chatId), ...(action === 'r' ? { brief: null, draft: null } : {}) });
      await answerCallback(query.id);
      await sendMessage(chatId, {
        text: action === 'c' ? '✏️ <b>What should I change?</b> Send a voice note or text, e.g. “shorter” or “say the meeting is Thursday at 2”.' : ASK_TEXT,
        buttons: [[{ text: '✖️ Cancel', callback_data: `em:x:${item.id}` }]],
      });
      return;
    }
    if (action === 'x') {
      await updateEmailItem(item.id, { status: 'new', draft: null, brief: null });
      await editMessage(chatId, messageId, { text: '✖️ <i>Reply cancelled. Nothing was sent.</i>' });
      return answerCallback(query.id, 'Cancelled');
    }
    if (action === 's') {
      if (item.status === 'sent') return answerCallback(query.id, 'Already sent.');
      if (item.status !== 'draft' || !item.draft) return answerCallback(query.id, 'There’s no draft to send.');
      await answerCallback(query.id, 'Sending…');
      try {
        await sendEmailReply(item, account);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        await sendMessage(chatId, { text: `⚠️ <b>Not sent.</b> ${h(truncate(reason, 300))}`, buttons: [[{ text: '🔁 Try again', callback_data: `em:s:${item.id}` }]] });
        return;
      }
      const sent = await updateEmailItem(item.id, { status: 'sent', sent_at: new Date().toISOString() });
      await editMessage(chatId, messageId, {
        text: [`✅ <b>Sent</b> from ${h(account.email)} to ${h(sent.from_email || '')}`, `<i>Re: ${h(truncate(sent.subject || '', 120))}</i>`, '', h(truncate(sent.draft || '', 3300))].join('\n'),
      });
      return;
    }
    if (action === 'd') {
      const done = await updateEmailItem(item.id, { status: 'done' });
      await editMessage(chatId, messageId, emailCard(done, account, `✅ <b>Done</b> · ${h(account.label || account.email)} · ${h(done.from_name || done.from_email || '')}`));
      return answerCallback(query.id, 'Done');
    }
    if (action === 'i') {
      if (item.from_email && !account.ignored_senders.includes(item.from_email)) {
        await updateEmailAccount(account.id, { ignored_senders: [...account.ignored_senders, item.from_email] });
      }
      const ignored = await updateEmailItem(item.id, { status: 'ignored' });
      await editMessage(chatId, messageId, emailCard(ignored, account, `🔕 <b>Ignoring ${h(item.from_email || '')}</b> in ${h(account.label || account.email)} from now on`));
      return answerCallback(query.id, 'Sender ignored');
    }
    return answerCallback(query.id);
  } catch (error) {
    console.error('Email button failed:', error);
    return answerCallback(query.id, 'Something went wrong. Try again.');
  }
}

/**
 * While an email is waiting for a reply (after ✍️ Reply or ✏️ Change), the next voice note or
 * text is what to say: it's drafted and shown with ✅ Send. False when no email is waiting.
 */
export async function handleEmailMessage(message: IncomingMessage): Promise<boolean> {
  const chatId = message.chat.id;
  const voice = message.voice || message.audio;
  const typed = (message.text || message.caption || '').trim();
  if (!voice && (!typed || typed.startsWith('/'))) return false;
  const item = await emailAwaitingReply(chatId).catch(() => null);
  if (!item) return false;
  const account = await getEmailAccount(item.account_id);
  if (!account) return false;

  let said = typed;
  if (voice) {
    try {
      const { data, path } = await downloadFile(voice.file_id);
      said = await transcribeAudio({ data: data.toString('base64'), mimeType: voice.mime_type || (/\.mp3$/i.test(path) ? 'audio/mpeg' : 'audio/ogg') });
    } catch (error) {
      console.error('Email voice note failed:', error);
      await sendMessage(chatId, { text: '⚠️ I couldn’t hear that voice note. Please try again or type it.' });
      return true;
    }
  }
  if (!said) return true;
  if (voice) await sendMessage(chatId, { text: `🎙 <i>“${h(truncate(said, 400))}”</i>\n✍️ Writing the reply…` });

  const brief = [item.brief, said].filter(Boolean).join('\n');
  try {
    const draft = await draftEmailReply({ ...item, brief }, account, brief);
    const updated = await updateEmailItem(item.id, { status: 'draft', draft, brief });
    await sendMessage(chatId, previewCard(updated, account));
  } catch (error) {
    console.error('Email draft failed:', error);
    await updateEmailItem(item.id, { brief });
    await sendMessage(chatId, { text: '⚠️ The AI couldn’t write the reply right now. Send your note again in a minute.', buttons: [[{ text: '✖️ Cancel', callback_data: `em:x:${item.id}` }]] });
  }
  return true;
}
