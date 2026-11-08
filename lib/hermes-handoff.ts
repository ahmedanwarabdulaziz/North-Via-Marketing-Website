import { sendMessage } from './telegram';

// Since 8 Nov 2026, tasks, reminders, the library and AI chat live in the Hermes bot on the
// VPS (it has lasting memory). Anwarz keeps reviews, social, posts, ads, reports and websites.
// The old task/library/chat code is still in the repo; to bring it back, revert this change.

export const HERMES_BOT = '@Hermesanwar_bot';
export const HERMES_NOTE = `✅ Tasks, 📚 library and 💬 chat are now in ${HERMES_BOT}`;

const MOVED_COMMANDS = new Set(['/tasks', '/today', '/tomorrow', '/week', '/library', '/find', '/search', '/chat', '/end']);

export async function sendMovedToHermes(chatId: number | string) {
  return sendMessage(chatId, {
    text: `${HERMES_NOTE}.\nSend them to Hermes instead: it remembers everything and has your old tasks and library.`,
  });
}

/** Old task/library/chat commands: points to Hermes. False for any other message. */
export async function handleMovedCommand(message: { text?: string; chat: { id: number } }): Promise<boolean> {
  const command = (message.text || '').trim().split(/[\s@]/)[0].toLowerCase();
  if (!MOVED_COMMANDS.has(command)) return false;
  await sendMovedToHermes(message.chat.id);
  return true;
}
