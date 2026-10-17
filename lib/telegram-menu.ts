import { getDigestSchedule, nextDigestRun, saveDigestSchedule } from './digest-schedule';
import { DIGEST_TIMEZONES } from './digest-schedule-options';
import { checkReviewsNow, reviewQueueOverview, showWaitingReviews } from './review-telegram';
import { InlineButton, OutgoingMessage, answerCallback, editMessage, escapeHtml as h, sendMessage } from './telegram';
import { runWebsiteChecks, websiteOverview, websitesScreenText } from './website-monitor';
import { listCommentQueue } from './social-sync';
import { checkSocialNow, showWaitingComments, socialStatsLines } from './social-telegram';

// Main bot menu. Button data is "m:<screen>" or "m:<screen>:<action>".
// To add a new area (e.g. Tasks, Invoices), add a section here and a screen below.
const PANEL_URL = 'https://www.northviamarketing.com/admin/reviews';

interface MenuSection {
  id: string;
  label: () => Promise<string>;
}

const SECTIONS: MenuSection[] = [
  {
    id: 'gr',
    label: async () => {
      const { total } = await reviewQueueOverview();
      return `⭐ Google Reviews${total ? ` (${total} waiting)` : ''}`;
    },
  },
  {
    id: 'sm',
    label: async () => {
      const waiting = (await listCommentQueue()).length;
      return `📱 Facebook & Instagram${waiting ? ` (${waiting} comments)` : ''}`;
    },
  },
  {
    id: 'ws',
    label: async () => {
      const { sites, down } = await websiteOverview();
      if (!sites.length) return '🌐 Websites';
      return `🌐 Websites (${down.length ? `${down.length} down` : 'all up'})`;
    },
  },
];

async function homeScreen(): Promise<OutgoingMessage> {
  const buttons: InlineButton[][] = [];
  for (const section of SECTIONS) buttons.push([{ text: await section.label(), callback_data: `m:${section.id}` }]);
  return {
    text: ['🧭 <b>North Via</b>', 'What would you like to do?'].join('\n'),
    buttons,
  };
}

function formatHour(hour: number) {
  return `${hour % 12 === 0 ? 12 : hour % 12} ${hour < 12 ? 'AM' : 'PM'}`;
}

async function reviewsScreen(note?: string): Promise<OutgoingMessage> {
  const [{ total, clients }, schedule] = await Promise.all([reviewQueueOverview(), getDigestSchedule()]);
  const tzLabel = DIGEST_TIMEZONES.find((t) => t.value === schedule.timezone)?.label || schedule.timezone;
  const next = nextDigestRun(schedule);
  const nextText = next
    ? new Intl.DateTimeFormat('en-CA', { timeZone: schedule.timezone, weekday: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(next))
    : null;

  const lines = ['⭐ <b>Google Reviews</b>', ''];
  if (total === 0) {
    lines.push('✅ Nothing waiting for approval.');
  } else {
    lines.push(`<b>${total}</b> repl${total === 1 ? 'y' : 'ies'} waiting:`);
    for (const c of clients) {
      const parts = [c.fiveStar ? `${c.fiveStar} × 5★` : '', c.oneByOne ? `${c.oneByOne} to check` : ''].filter(Boolean).join(', ');
      lines.push(`• ${h(c.name)} — ${parts}`);
    }
  }
  lines.push(
    '',
    schedule.enabled
      ? `⏰ Daily digest: ${schedule.hours.map(formatHour).join(', ')} · ${h(tzLabel)}${nextText ? ` · next ${h(nextText)}` : ''}`
      : '⏸ Daily digest is paused.'
  );
  if (note) lines.push('', note);

  return {
    text: lines.join('\n'),
    buttons: [
      [
        { text: '📋 Show waiting reviews', callback_data: 'm:gr:show' },
        { text: '🔎 Check Google now', callback_data: 'm:gr:check' },
      ],
      [
        schedule.enabled
          ? { text: '⏸ Pause daily digest', callback_data: 'm:gr:pause' }
          : { text: '▶️ Resume daily digest', callback_data: 'm:gr:resume' },
        { text: '🌐 Open panel', url: PANEL_URL },
      ],
      [{ text: '⬅️ Back to menu', callback_data: 'm:home' }],
    ],
  };
}

async function socialScreen(note?: string): Promise<OutgoingMessage> {
  const lines = await socialStatsLines(true);
  const text = [
    '📱 <b>Facebook & Instagram</b>',
    '',
    ...(lines.length ? lines : ['No pages connected yet.', 'Connect them on each client’s page in the panel.']),
    'Checked hourly · risky comments are alerted right away.',
  ].join('\n').trim();
  return {
    text: note ? `${text}\n\n${note}` : text,
    buttons: [
      [
        { text: '📋 Show waiting comments', callback_data: 'm:sm:show' },
        { text: '🔎 Check now', callback_data: 'm:sm:check' },
      ],
      [{ text: '⬅️ Back to menu', callback_data: 'm:home' }],
    ],
  };
}

async function websitesScreen(note?: string): Promise<OutgoingMessage> {
  const { text, panelUrl } = await websitesScreenText();
  return {
    text: note ? `${text}

${note}` : text,
    buttons: [
      [
        { text: '🔁 Check all now', callback_data: 'm:ws:check' },
        { text: '🌐 Open panel', url: panelUrl },
      ],
      [{ text: '⬅️ Back to menu', callback_data: 'm:home' }],
    ],
  };
}

export async function sendMenu(chatId: number | string) {
  return sendMessage(chatId, await homeScreen());
}

export async function handleMenuCallback(query: { id: string; data?: string; message?: { message_id: number; chat: { id: number }; text?: string } }) {
  const chatId = query.message?.chat.id;
  const messageId = query.message?.message_id;
  if (!chatId || !messageId) return answerCallback(query.id);
  const [, screen, action] = (query.data || '').split(':');

  try {
    if (screen === 'home') {
      await editMessage(chatId, messageId, await homeScreen());
      return answerCallback(query.id);
    }

    if (screen === 'gr') {
      if (action === 'show') {
        await answerCallback(query.id, 'Sending waiting reviews…');
        await showWaitingReviews(chatId);
        return;
      }
      if (action === 'check') {
        await answerCallback(query.id, 'Checking Google…');
        await checkReviewsNow(chatId);
        await editMessage(chatId, messageId, await reviewsScreen('🔎 <i>Checked just now.</i>'));
        return;
      }
      if (action === 'pause' || action === 'resume') {
        const current = await getDigestSchedule();
        await saveDigestSchedule({ ...current, enabled: action === 'resume' });
        await editMessage(chatId, messageId, await reviewsScreen(action === 'pause' ? '⏸ <i>Daily digest paused.</i>' : '▶️ <i>Daily digest resumed.</i>'));
        return answerCallback(query.id, action === 'pause' ? 'Paused' : 'Resumed');
      }
      await editMessage(chatId, messageId, await reviewsScreen());
      return answerCallback(query.id);
    }

    if (screen === 'sm') {
      if (action === 'show') {
        await answerCallback(query.id, 'Sending waiting comments…');
        await showWaitingComments(chatId);
        return;
      }
      if (action === 'check') {
        await answerCallback(query.id, 'Checking Facebook and Instagram…');
        await checkSocialNow(chatId);
        await editMessage(chatId, messageId, await socialScreen('🔎 <i>Checked just now.</i>'));
        return;
      }
      await editMessage(chatId, messageId, await socialScreen());
      return answerCallback(query.id);
    }

    if (screen === 'ws') {
      if (action === 'check') {
        await answerCallback(query.id, 'Checking websites…');
        // Alerts for any change go to this chat as separate messages.
        const run = await runWebsiteChecks({ chatIds: [String(chatId)] });
        const note = run.checked ? `🔁 <i>Checked ${run.checked} just now.</i>` : '';
        // "Check again" on an alert sends a fresh status screen; from the menu, update it in place.
        const fromMenu = query.message?.text?.startsWith('🌐');
        if (fromMenu) await editMessage(chatId, messageId, await websitesScreen(note));
        else await sendMessage(chatId, await websitesScreen(note));
        return;
      }
      await editMessage(chatId, messageId, await websitesScreen());
      return answerCallback(query.id);
    }

    return answerCallback(query.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Something went wrong';
    await answerCallback(query.id, message.slice(0, 180));
  }
}
