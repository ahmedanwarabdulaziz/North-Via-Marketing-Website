import { getDigestSchedule, nextDigestRun, saveDigestSchedule } from './digest-schedule';
import { DIGEST_TIMEZONES } from './digest-schedule-options';
import { checkReviewsNow, reviewQueueOverview, showWaitingReviews } from './review-telegram';
import { InlineButton, OutgoingMessage, answerCallback, editMessage, escapeHtml as h, sendMessage } from './telegram';
import { runWebsiteChecks, websiteOverview, websitesScreenText } from './website-monitor';
import { listCommentQueue } from './social-sync';
import { checkSocialNow, showWaitingComments, socialStatsLines } from './social-telegram';
import { createClientReport, type ReportDays, type ReportLanguage } from './client-report';
import { reportWhatsAppText } from './report-i18n';
import { whatsAppShareLink } from './whatsapp-share';
import { listClientProfiles } from './admin-ops';
import { listDocs } from './data/store';
import { adsScreenText } from './ads-telegram';
import { analyticsScreenText } from './analytics-telegram';
import { taskCounts, taskListScreen, tasksHomeScreen } from './task-telegram';

// Main bot menu. Button data is "m:<screen>" or "m:<screen>:<action>".
// To add a new area (e.g. Tasks, Invoices), add a section here and a screen below.
const PANEL_URL = 'https://www.northviamarketing.com/admin/reviews';

interface MenuSection {
  id: string;
  label: () => Promise<string>;
}

const SECTIONS: MenuSection[] = [
  {
    id: 'tk',
    label: async () => {
      const { today, overdue } = await taskCounts();
      const parts = [today ? `${today} today` : '', overdue ? `${overdue} overdue` : ''].filter(Boolean);
      return `✅ Tasks${parts.length ? ` (${parts.join(', ')})` : ''}`;
    },
  },
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
    id: 'ad',
    label: async () => '📈 Google Ads',
  },
  {
    id: 'an',
    label: async () => '🧭 Website analytics',
  },
  {
    id: 'rp',
    label: async () => '📊 Client reports',
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

/**
 * The bot's command menu (the "Menu" button next to the message box): one command per
 * section above, each opening the same screen as its button. Registered with Telegram by
 * the panel's "Connect bot" (app/api/admin/telegram/setup). /check, /comments and /pending still work.
 */
export const BOT_COMMANDS = [
  { command: 'menu', description: '🧭 Main menu (or just type x)' },
  { command: 'tasks', description: '✅ Tasks' },
  { command: 'today', description: '📅 Today’s tasks' },
  { command: 'reviews', description: '⭐ Google Reviews' },
  { command: 'social', description: '📱 Facebook & Instagram' },
  { command: 'ads', description: '📈 Google Ads' },
  { command: 'analytics', description: '🧭 Website analytics' },
  { command: 'reports', description: '📊 Client reports' },
  { command: 'websites', description: '🌐 Websites' },
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

/** Clients with something to report: Facebook/Instagram, Google reviews or a website. */
async function reportableClients() {
  const [clients, social, locations, sites] = await Promise.all([
    listClientProfiles(),
    listDocs<{ clientId?: string; linked?: boolean }>('social_accounts', { where: { linked: true } }),
    listDocs<{ clientId?: string; linked?: boolean }>('gbp_locations', { where: { linked: true } }),
    listDocs<{ clientId?: string; enabled?: boolean }>('websites', { where: { enabled: true } }),
  ]);
  const ids = new Set([...social, ...locations, ...sites].map((r) => r.clientId).filter(Boolean));
  return clients.filter((c) => ids.has(c.id));
}

async function reportsScreen(): Promise<OutgoingMessage> {
  const clients = await reportableClients();
  return {
    text: clients.length
      ? ['📊 <b>Client reports</b>', '', 'Choose a client. You’ll get a branded report link and a ready WhatsApp message, compared with the previous period.'].join('\n')
      : '📊 <b>Client reports</b>\n\nNo client has Facebook/Instagram, Google reviews or a website connected yet.',
    buttons: [...clients.map((c) => [{ text: c.brandName, callback_data: `m:rp:c:${c.id}` }]), [{ text: '⬅️ Back to menu', callback_data: 'm:home' }]],
  };
}

function reportOptionsScreen(clientId: string, clientName: string): OutgoingMessage {
  const opt = (days: ReportDays, lang: ReportLanguage, text: string) => ({ text, callback_data: `m:rp:g:${clientId}:${days}:${lang}` });
  return {
    text: `📊 <b>${h(clientName)}</b>\n\nWhich report?`,
    buttons: [
      [opt(7, 'en', '📅 Weekly · English'), opt(7, 'ar', '📅 أسبوعي · عربي')],
      [opt(30, 'en', '🗓 Monthly · English'), opt(30, 'ar', '🗓 شهري · عربي')],
      [{ text: '⬅️ Back', callback_data: 'm:rp' }],
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

/** Google Ads ('ad') or website analytics ('an': 7 days saved daily at 10 AM, 30 read live). */
async function periodScreen(screen: 'ad' | 'an', days: 7 | 30): Promise<OutgoingMessage> {
  return {
    text: screen === 'ad' ? await adsScreenText(days) : await analyticsScreenText(days),
    buttons: [
      [
        { text: `${days === 7 ? '✓ ' : ''}📅 7 days`, callback_data: `m:${screen}:7` },
        { text: `${days === 30 ? '✓ ' : ''}🗓 30 days`, callback_data: `m:${screen}:30` },
      ],
      [{ text: '⬅️ Back to menu', callback_data: 'm:home' }],
    ],
  };
}

export async function sendMenu(chatId: number | string) {
  return sendMessage(chatId, await homeScreen());
}

const COMMAND_SCREENS: Record<string, () => Promise<OutgoingMessage>> = {
  '/tasks': tasksHomeScreen,
  '/today': () => taskListScreen('today'),
  '/reviews': () => reviewsScreen(),
  '/social': () => socialScreen(),
  '/ads': () => periodScreen('ad', 7),
  '/analytics': () => periodScreen('an', 7),
  '/reports': reportsScreen,
  '/websites': () => websitesScreen(),
};

/** A section command from the Menu button: sends that section's screen. False if it isn't one. */
export async function handleMenuCommand(message: { text?: string; chat: { id: number } }): Promise<boolean> {
  const command = (message.text || '').trim().split(/[\s@]/)[0].toLowerCase();
  const screen = COMMAND_SCREENS[command];
  if (!screen) return false;
  try {
    await sendMessage(message.chat.id, await screen());
  } catch (error) {
    console.error(`Menu command ${command} failed:`, error);
    await sendMessage(message.chat.id, { text: '⚠️ Couldn’t load that right now. Please try again in a minute.' });
  }
  return true;
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

    if (screen === 'tk') {
      await editMessage(chatId, messageId, await tasksHomeScreen());
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

    if (screen === 'ad' || screen === 'an') {
      // m:ad / m:an = last 7 days, :30 = last 30 days; the open period is marked ✓.
      const days = action === '30' ? 30 : 7;
      await answerCallback(query.id, `Loading the last ${days} days…`);
      await editMessage(chatId, messageId, await periodScreen(screen, days));
      return;
    }

    if (screen === 'rp') {
      const [, , , clientId, days, lang] = (query.data || '').split(':');
      const client = clientId ? (await listClientProfiles()).find((c) => c.id === clientId) : undefined;
      if (action === 'c' && client) {
        await editMessage(chatId, messageId, reportOptionsScreen(client.id, client.brandName));
        return answerCallback(query.id);
      }
      if (action === 'g' && client && (days === '7' || days === '30') && (lang === 'en' || lang === 'ar')) {
        await answerCallback(query.id, 'Preparing the report…');
        const { id, url, report, warnings } = await createClientReport(client.id, Number(days) as ReportDays, lang);
        // Just the message to forward; warnings (e.g. Ads left out) go on top only when there are any.
        await sendMessage(chatId, {
          text: [...warnings.map((w) => `⚠️ ${h(w)}`), ...(warnings.length ? [''] : []), h(reportWhatsAppText(report.data, report.language, url))].join('\n'),
          buttons: [
            [{ text: '📲 Send on WhatsApp', url: whatsAppShareLink('p', id) }],
            [{ text: '🔗 Open report', url }],
            [{ text: '📊 Another report', callback_data: 'm:rp' }],
          ],
        });
        return;
      }
      await editMessage(chatId, messageId, await reportsScreen());
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
