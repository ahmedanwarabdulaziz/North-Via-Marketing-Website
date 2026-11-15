// The "✨ AI reply" brief, shared by the Inbox (app/api/app/emails/[id]) and the AI chat (lib/app-chat.ts).

export const AUTO_PREFIX = 'No notes from Ahmed:';

/** The "✨ AI reply" instructions: Ahmed gave no notes, so the AI answers in his name without deciding for him. */
export function autoBrief(item: { from_name: string | null; from_email: string | null; to_email: string | null; body: string | null }, inbox: string) {
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
