import { getDigestSchedule, nextDigestRun, saveDigestSchedule } from './digest-schedule';
import { DIGEST_TIMEZONES } from './digest-schedule-options';
import { checkReviewsNow, reviewQueueOverview, showWaitingReviews } from './review-telegram';
import { backlogOverview, draftBacklog, releaseBacklog, scanForOldReviews, type BacklogScope } from './review-engine';
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
import { aiUsageScreen, checkGroqNow } from './ai-usage-telegram';
import { libraryCount, libraryHomeScreen } from './knowledge-telegram';
import { startConversation } from './assistant-telegram';
import { postLocationsScreen } from './gbp-post-telegram';

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
    id: 'gp',
    label: async () => '📝 Google post',
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
  {
    id: 'kb',
    label: async () => {
      const total = await libraryCount();
      return `📚 Library${total ? ` (${total})` : ''}`;
    },
  },
  {
    id: 'ch',
    label: async () => '💬 Chat with AI',
  },
  {
    id: 'ai',
    label: async () => '🤖 AI usage',
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
  { command: 'tomorrow', description: '🌅 Tomorrow’s tasks' },
  { command: 'week', description: '🗓 Your week ahead by client' },
  { command: 'reviews', description: '⭐ Google Reviews' },
  { command: 'post', description: '📝 New Google post (photo + voice → AI writes it)' },
  { command: 'social', description: '📱 Facebook & Instagram' },
  { command: 'ads', description: '📈 Google Ads' },
  { command: 'analytics', description: '🧭 Website analytics' },
  { command: 'reports', description: '📊 Client reports' },
  { command: 'websites', description: '🌐 Websites' },
  { command: 'library', description: '📚 Library (screenshots, links, notes)' },
  { command: 'find', description: '🔎 Search the library, e.g. /find reel ideas' },
  { command: 'chat', description: '💬 Chat with AI about your tasks, clients and library' },
  { command: 'end', description: '👋 End the chat' },
  { command: 'ai', description: '🤖 AI usage (Groq and Gemini)' },
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
  const [{ total, clients }, schedule, backlog] = await Promise.all([reviewQueueOverview(), getDigestSchedule(), backlogOverview().catch(() => null)]);
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
  if (backlog?.total) lines.push('', `📦 <b>${backlog.total}</b> old unanswered review${backlog.total === 1 ? '' : 's'} found by the full scan, not drafted yet.`);
  if (note) lines.push('', note);

  return {
    text: lines.join('\n'),
    buttons: [
      [
        { text: '📋 Show waiting reviews', callback_data: 'm:gr:show' },
        { text: '🔎 Check Google now', callback_data: 'm:gr:check' },
      ],
      backlog?.total
        ? [{ text: `📦 Choose old reviews to answer (${backlog.total})`, callback_data: 'm:gr:bl' }]
        : [{ text: '🗂 Find old unanswered reviews', callback_data: 'm:gr:scan' }],
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

/** Old unanswered reviews from the full scan, and what to draft. */
async function backlogScreen(note?: string): Promise<OutgoingMessage> {
  const b = await backlogOverview();
  if (!b.total) {
    return {
      text: ['📦 <b>Old unanswered reviews</b>', '', note || '✅ None waiting. Every review the full scan found is answered or already in your queue.'].join('\n'),
      buttons: [
        [{ text: '🗂 Scan again', callback_data: 'm:gr:scan' }],
        [{ text: '⬅️ Back', callback_data: 'm:gr' }],
      ],
    };
  }
  const lines = [
    '📦 <b>Old unanswered reviews</b>',
    `<b>${b.total}</b> found · ${b.last3m} from the last 3 months · ${b.last12m} from the last 12 months`,
    '',
    ...b.clients.map((c) => `• ${h(c.name)} — ${c.total}${c.low ? ` (${c.low} with 1–3★)` : ''}`),
    '',
    'Which ones should I draft replies for? They come to you for approval like any other review (5★ in bulk per client). <b>Nothing is posted without your OK.</b>',
    '<i>The hourly checks never draft these on their own.</i>',
  ];
  if (note) lines.push('', note);
  const row: InlineButton[] = [];
  if (b.last3m) row.push({ text: `✍️ Last 3 months (${b.last3m})`, callback_data: 'm:gr:bl3' });
  if (b.last12m > b.last3m) row.push({ text: `✍️ Last 12 months (${b.last12m})`, callback_data: 'm:gr:bl12' });
  return {
    text: lines.join('\n'),
    buttons: [
      ...(row.length ? [row] : []),
      [
        { text: `✍️ All (${b.total})`, callback_data: 'm:gr:blall' },
        { text: '🙈 Leave them', callback_data: 'm:gr:blnone' },
      ],
      [{ text: '⬅️ Back', callback_data: 'm:gr' }],
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
  '/tomorrow': () => taskListScreen('tomorrow'),
  '/reviews': () => reviewsScreen(),
  '/post': postLocationsScreen,
  '/social': () => socialScreen(),
  '/ads': () => periodScreen('ad', 7),
  '/analytics': () => periodScreen('an', 7),
  '/reports': reportsScreen,
  '/websites': () => websitesScreen(),
  '/library': libraryHomeScreen,
  '/ai': () => aiUsageScreen(),
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
      if (action === 'scan' || action === 'scanmore') {
        await answerCallback(query.id, 'Reading every review from Google…');
        await editMessage(chatId, messageId, { text: '🗂 <b>Reading every review from Google…</b>\n<i>This takes up to a minute.</i>' });
        const run = await scanForOldReviews({ restart: action === 'scan', timeBudgetMs: 42_000 });
        if (!run.complete) {
          await editMessage(chatId, messageId, {
            text: `🗂 Read ${run.scanned} of ${run.total} locations so far (${run.found} unanswered found). Tap Continue for the rest.`,
            buttons: [[{ text: '▶️ Continue', callback_data: 'm:gr:scanmore' }], [{ text: '⬅️ Back', callback_data: 'm:gr' }]],
          });
          return;
        }
        const errors = run.errors.length ? `\n⚠️ Couldn’t read: ${run.errors.map((e) => h(e.location)).join(', ')}` : '';
        await editMessage(chatId, messageId, await backlogScreen(`🗂 <i>Read all ${run.total} locations: ${run.found} new unanswered found.</i>${errors}`));
        return;
      }
      if (action === 'bl') {
        await editMessage(chatId, messageId, await backlogScreen());
        return answerCallback(query.id);
      }
      if (action === 'bl3' || action === 'bl12' || action === 'blall' || action === 'blnone') {
        const scope = ({ bl3: '3m', bl12: '12m', blall: 'all', blnone: 'none' } as const)[action];
        await answerCallback(query.id, scope === 'none' ? 'Leaving them…' : 'Queuing them for drafts…');
        const result = await releaseBacklog(scope as BacklogScope | 'none');
        if (scope === 'none') {
          await editMessage(chatId, messageId, await reviewsScreen(`🙈 <i>Left ${result.dismissed} old reviews unanswered. They won’t come up again.</i>`));
          return;
        }
        // Start drafting right away; the hourly runs continue with the rest.
        const drafted = await draftBacklog({ timeBudgetMs: 35_000 }).catch(() => ({ drafted: 0, remaining: result.released }));
        await editMessage(
          chatId,
          messageId,
          await reviewsScreen(
            `✍️ <i>${result.released} queued; ${drafted.drafted} drafted already${drafted.remaining ? `, the other ${drafted.remaining} over the next hourly runs (about 20 an hour)` : ''}. Tap 📋 Show waiting reviews to approve.${result.remaining ? ` ${result.remaining} older ones are still parked.` : ''}</i>`
          )
        );
        return;
      }
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

    if (screen === 'gp') {
      await editMessage(chatId, messageId, await postLocationsScreen());
      return answerCallback(query.id);
    }

    if (screen === 'ch') {
      await answerCallback(query.id);
      await startConversation(chatId, null);
      return;
    }

    if (screen === 'kb') {
      await editMessage(chatId, messageId, await libraryHomeScreen());
      return answerCallback(query.id);
    }

    if (screen === 'ai') {
      if (action === 'live') {
        await answerCallback(query.id, 'Asking Groq…');
        await editMessage(chatId, messageId, await aiUsageScreen(await checkGroqNow()));
        return;
      }
      await editMessage(chatId, messageId, await aiUsageScreen());
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
