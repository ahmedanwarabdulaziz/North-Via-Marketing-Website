import { getClientProfileById, listClientProfiles } from '@/lib/admin-ops';
import { ClientSwitcher } from '@/components/admin/ClientSwitcher';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Edit3, ArrowLeft, Building2, User, Mail, Phone } from 'lucide-react';
import { getAgencyConnection, getGbpConnection, listClientLocations } from '@/lib/google-business';
import { ClientGbpCard } from '@/components/admin/ClientGbpCard';
import { ReplyStyleCard } from '@/components/admin/ReplyStyleCard';
import { getReplySettings, listReviewQueue } from '@/lib/review-engine';
import { WebsitesCard } from '@/components/admin/WebsitesCard';
import { listClientWebsites } from '@/lib/website-monitor';
import { ClientSocialCard } from '@/components/admin/ClientSocialCard';
import { getMetaConnections, listClientAccounts, metaConfigured } from '@/lib/meta';
import { socialOverview } from '@/lib/social-sync';
import { ClientAdsCard } from '@/components/admin/ClientAdsCard';
import { clientAdsCard } from '@/lib/ads-metrics';
import { ClientMetaAdsCard } from '@/components/admin/ClientMetaAdsCard';
import { clientMetaAdAccounts, describeMetaAdsError, fetchClientMetaAds, metaAdsConnected } from '@/lib/meta-ads';
import { cairoDay } from '@/lib/social-sync';
import { ClientTabs, type ClientTab, type OverviewTile } from '@/components/admin/ClientTabs';
import { ClientAnalyticsCard } from '@/components/admin/ClientAnalyticsCard';
import { analyticsConnected, describeGaError, getGa4Summary, refreshGa4Summary } from '@/lib/ga4';
import { listClaritySnapshots } from '@/lib/clarity';
import { ClientSearchCard } from '@/components/admin/ClientSearchCard';
import { describeSearchError, getSearchSummary, refreshSearchSummary, searchConsoleReady } from '@/lib/search-console';
import { TasksBoard } from '@/components/admin/TasksBoard';
import { listAdminTasks } from '@/lib/admin-tasks';
import { cairoParts } from '@/lib/tasks';
import { listKnowledge } from '@/lib/knowledge';

export const dynamic = 'force-dynamic';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const compact = (n?: number) => (n === undefined ? '—' : n >= 10_000 ? `${(n / 1000).toFixed(0)}k` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ gbp?: string; meta?: string; ads?: string; ga?: string; tab?: string }>;
}) {
  const { id } = await params;
  const { gbp, meta, ads, ga, tab } = await searchParams;
  const client = await getClientProfileById(id);

  if (!client) {
    notFound();
  }

  const [allClients, gbpConnection, gbpAgency, gbpLocations, replySettings, websites, socialAccounts, metaConnections, socialStats, reviewQueue, adsCard, clientTasks, libraryItems] = await Promise.all([
    listClientProfiles().catch(() => []),
    getGbpConnection(id).catch(() => null),
    getAgencyConnection().catch(() => null),
    listClientLocations(id).catch(() => []),
    getReplySettings(id),
    listClientWebsites(id).catch(() => []),
    listClientAccounts(id).catch(() => []),
    getMetaConnections().catch(() => []),
    socialOverview().then((all) => all.find((s) => s.clientId === id) || null).catch(() => null),
    listReviewQueue().then((q) => q.filter((r) => r.clientId === id && (r.status === 'draft_ready' || r.status === 'needs_draft'))).catch(() => []),
    clientAdsCard(id).catch(() => ({ connected: false, accounts: [] })),
    listAdminTasks({ clientId: id }).catch(() => []),
    listKnowledge({ clientId: id, limit: 100 }).catch(() => []),
  ]);

  // ---------- Facebook Ads (last 7 days including today, read live) ----------
  const [fbAdsConnected, fbAdAccounts] = await Promise.all([metaAdsConnected().catch(() => false), clientMetaAdAccounts(id).catch(() => [])]);
  let fbAds = null;
  let fbAdsError: string | undefined;
  if (fbAdAccounts.length) {
    try {
      fbAds = await fetchClientMetaAds(id, cairoDay(new Date(Date.now() - 6 * 86_400_000)), cairoDay());
    } catch (error) {
      fbAdsError = describeMetaAdsError(error);
    }
  }

  // ---------- Website analytics (GA4 last 7 days vs the 7 before, latest Clarity day) ----------
  const [gaConnected, claritySnapshots] = await Promise.all([analyticsConnected().catch(() => false), listClaritySnapshots(id).catch(() => [])]);
  // GA4 is refreshed once a day at 10 AM Cairo; fetched live only when there's no
  // saved summary yet for this property (e.g. right after choosing it).
  let gaStats = null;
  let gaError: string | undefined;
  if (gaConnected && client.ga4PropertyId) {
    try {
      const saved = await getGa4Summary(id);
      gaStats = saved?.propertyId === client.ga4PropertyId ? saved : await refreshGa4Summary(id, client.ga4PropertyId);
    } catch (error) {
      gaError = describeGaError(error);
    }
  }
  // Search Console shares the GA4 login; same daily refresh, fetched live only for a newly chosen site.
  const searchReady = await searchConsoleReady().catch(() => ({ connected: false, hasScope: false }));
  let searchSummary = null;
  let searchError: string | undefined;
  if (searchReady.hasScope && client.searchConsoleSite) {
    try {
      const saved = await getSearchSummary(id);
      searchSummary = saved?.siteUrl === client.searchConsoleSite ? saved : (await refreshSearchSummary(id, client.searchConsoleSite)).summary;
    } catch (error) {
      searchError = describeSearchError(error);
    }
  }
  const clarityLatest = claritySnapshots.at(-1) || null;
  const clarityOn = Boolean(client.clarityApiTokenEncrypted);

  // ---------- Status per area (tab dots and overview tiles) ----------
  const monitoredLocations = gbpLocations.filter((l) => l.linked);
  // Reviews work with the client's own Google login or through the shared one on the Reviews page.
  const gbpActive = Boolean(gbpConnection) || monitoredLocations.length > 0;
  const reviewsStatus: OverviewTile['status'] = !gbpActive ? 'off' : gbpConnection?.status === 'error' || !monitoredLocations.length ? 'warn' : 'ok';
  const socialStatus: OverviewTile['status'] = !socialAccounts.length ? 'off' : socialAccounts.some((a) => a.lastError) ? 'warn' : 'ok';
  const adsStatus: OverviewTile['status'] = !adsCard.accounts.length ? 'off' : adsCard.connected ? 'ok' : 'warn';
  const fbAdsStatus: OverviewTile['status'] = !fbAdAccounts.length ? 'off' : fbAdsError || !fbAdsConnected ? 'warn' : 'ok';
  const enabledSites = websites.filter((w) => w.enabled);
  const downSites = enabledSites.filter((w) => w.status === 'down');
  const websitesStatus: OverviewTile['status'] = !enabledSites.length ? 'off' : downSites.length ? 'warn' : 'ok';
  const searchStatus: OverviewTile['status'] = !client.searchConsoleSite ? 'off' : searchError ? 'warn' : 'ok';
  const analyticsStatus: OverviewTile['status'] = !client.ga4PropertyId && !clarityOn ? 'off' : gaError ? 'warn' : 'ok';

  // Tasks for this client (from Telegram or the panel); overdue = before now in Cairo.
  const now = cairoParts(new Date());
  const openTasks = clientTasks.filter((t) => t.status === 'open');
  const overdueTasks = openTasks.filter((t) => t.date && (t.date < now.date || (t.date === now.date && t.time && t.time < now.time)));
  const nextTask = openTasks.filter((t) => t.date && !overdueTasks.includes(t)).sort((a, b) => `${a.date} ${a.time || ''}`.localeCompare(`${b.date} ${b.time || ''}`))[0];
  const tasksStatus: OverviewTile['status'] = !openTasks.length ? 'off' : overdueTasks.length ? 'warn' : 'ok';

  const tabs: ClientTab[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'tasks', label: `Tasks${openTasks.length ? ` (${openTasks.length})` : ''}`, status: tasksStatus },
    { id: 'reviews', label: 'Google Reviews', status: reviewsStatus },
    { id: 'social', label: 'Facebook & Instagram', status: socialStatus },
    { id: 'ads', label: 'Google Ads', status: adsStatus },
    { id: 'fbads', label: 'Facebook Ads', status: fbAdsStatus },
    { id: 'websites', label: 'Websites', status: websitesStatus },
    { id: 'analytics', label: 'Analytics', status: analyticsStatus },
    { id: 'search', label: 'Search Console', status: searchStatus },
    { id: 'details', label: 'Details' },
  ];

  const overview: OverviewTile[] = [
    {
      tab: 'tasks',
      title: 'Tasks',
      status: tasksStatus,
      value: !openTasks.length ? 'Nothing open' : overdueTasks.length ? `${overdueTasks.length} overdue` : `${plural(openTasks.length, 'open task')}`,
      detail: nextTask ? `Next: ${nextTask.title}` : openTasks.length ? 'No dates set' : 'Send the Telegram bot a task for this client, or add one here.',
    },
    {
      tab: 'reviews',
      title: 'Google Reviews',
      status: reviewsStatus,
      value: !gbpActive ? 'Not connected' : reviewQueue.length ? plural(reviewQueue.length, 'reply') + ' waiting' : 'All answered',
      detail: !gbpActive ? 'Connect the Business Profile to monitor reviews.' : `${plural(monitoredLocations.length, 'location')} monitored`,
    },
    {
      tab: 'social',
      title: 'Facebook & Instagram',
      status: socialStatus,
      value: !socialAccounts.length
        ? 'Not connected'
        : [socialStats?.fb ? `📘 ${compact(socialStats.fb.followers)}` : '', socialStats?.ig ? `📸 ${compact(socialStats.ig.followers)}` : ''].filter(Boolean).join('  ·  ') || 'Connected',
      detail: !socialAccounts.length
        ? 'Connect the Page and Instagram for followers, reach and comments.'
        : socialAccounts.find((a) => a.lastError)?.lastError || (socialStats?.waiting ? plural(socialStats.waiting, 'comment') + ' waiting' : 'No comments waiting'),
    },
    {
      tab: 'ads',
      title: 'Google Ads',
      status: adsStatus,
      value: adsCard.accounts.length ? plural(adsCard.accounts.length, 'ad account') : 'Not linked',
      detail: !adsCard.accounts.length
        ? 'Link the ad accounts to track reach, clicks and spend.'
        : !adsCard.connected
          ? 'Google Ads needs reconnecting.'
          : adsCard.accounts.map((a) => a.name).join(', '),
    },
    {
      tab: 'fbads',
      title: 'Facebook Ads',
      status: fbAdsStatus,
      value: fbAds ? `${fbAds.totals.clicks.toLocaleString('en-CA')} clicks` : fbAdAccounts.length ? 'Linked' : 'Not linked',
      detail: !fbAdAccounts.length
        ? 'Link the Facebook ad account to track each ad’s reach and clicks.'
        : fbAdsError || (fbAds ? `7 days · ${fbAds.totals.reach.toLocaleString('en-CA')} reach · ${plural(fbAds.ads.length, 'ad')}` : 'Facebook needs reconnecting.'),
    },
    {
      tab: 'websites',
      title: 'Websites',
      status: websitesStatus,
      value: !enabledSites.length ? 'Not monitored' : downSites.length ? `${downSites.length} down` : `All ${enabledSites.length} up`,
      detail: !enabledSites.length ? 'Add the website to get uptime and SSL alerts.' : enabledSites.map((w) => w.label || w.url).join(', '),
    },
  ];

  overview.push({
    tab: 'analytics',
    title: 'Website analytics',
    status: analyticsStatus,
    value: gaStats ? `${gaStats.visitors.toLocaleString('en-CA')} visitors` : client.ga4PropertyId || clarityOn ? 'Connected' : 'Not connected',
    detail: gaError || (gaStats ? 'Last 7 days (GA4)' : 'Connect GA4 and Clarity for visitors and behaviour.') + (clarityOn ? ' · Clarity on' : ''),
  });

  overview.push({
    tab: 'search',
    title: 'Google search (organic)',
    status: searchStatus,
    value: searchSummary ? `${searchSummary.clicks.toLocaleString('en-CA')} Google clicks` : client.searchConsoleSite ? 'Connected' : 'Not connected',
    detail: searchError || (searchSummary ? `7 days · avg position ${searchSummary.position}` : 'Choose the Search Console site for free search traffic.'),
  });

  const initial = tab || (gbp ? 'reviews' : meta ? 'social' : ads ? 'ads' : ga ? 'analytics' : 'overview');

  const panels = {
    tasks: (
      <>
        <div className="flex items-center justify-between gap-3 -mt-1">
          <p className="text-sm text-zinc-500">Tasks for {client.brandName}, from Telegram or added here. Reminders go to Telegram.</p>
          <Link href={`/admin/library?client=${id}`} className="text-sm text-blue-600 hover:underline shrink-0">
            📚 Library items ({libraryItems.length})
          </Link>
        </div>
        <TasksBoard
          initial={clientTasks}
          clients={allClients.filter((c) => c.id).map((c) => ({ id: c.id!, name: c.brandName }))}
          today={now.date}
          nowTime={now.time}
          fixedClientId={id}
        />
      </>
    ),
    reviews: (
      <>
        <ClientGbpCard
          clientId={id}
          connection={
            gbpConnection
              ? { googleEmail: gbpConnection.googleEmail, status: gbpConnection.status, lastError: gbpConnection.lastError, connectedAt: gbpConnection.connectedAt }
              : null
          }
          locations={gbpLocations}
          notice={gbp === 'connected' || gbp === 'error' ? gbp : undefined}
          agencyEmail={gbpAgency?.accountEmail}
        />
        {(gbpConnection || gbpLocations.some((l) => l.linked)) && <ReplyStyleCard initial={replySettings} />}
      </>
    ),
    social: (
      <ClientSocialCard
        clientId={id}
        configured={metaConfigured()}
        adminConnected={metaConnections.some((c) => c.id === 'admin')}
        accounts={socialAccounts.map((a) => ({ id: a.id, pageName: a.pageName, igUsername: a.igUsername, lastError: a.lastError }))}
        stats={socialStats ? { fb: socialStats.fb, ig: socialStats.ig, latest: socialStats.latest, waiting: socialStats.waiting } : null}
        notice={meta === 'connected' || meta === 'error' ? meta : undefined}
      />
    ),
    ads: <ClientAdsCard clientId={id} connected={adsCard.connected} accounts={adsCard.accounts} notice={ads === 'connected' ? 'connected' : ads ? 'error' : undefined} />,
    fbads: (
      <ClientMetaAdsCard
        clientId={id}
        connected={fbAdsConnected}
        accounts={fbAdAccounts.map((a) => ({ id: a.id, name: a.name, currency: a.currency }))}
        summary={fbAds ? { currency: fbAds.currency, totals: fbAds.totals, ads: fbAds.ads } : null}
        error={fbAdsError}
        clientNames={Object.fromEntries(allClients.filter((c) => c.id).map((c) => [c.id!, c.brandName]))}
      />
    ),
    websites: <WebsitesCard clientId={id} initial={websites} suggestedUrl={client.websiteUrl || undefined} />,
    analytics: (
      <ClientAnalyticsCard
        clientId={id}
        gaConnected={gaConnected}
        propertyId={client.ga4PropertyId || undefined}
        gaStats={gaStats}
        gaError={gaError}
        clarityConnected={clarityOn}
        clarityLatest={clarityLatest ? { day: clarityLatest.day, sessions: clarityLatest.sessions, scrollDepth: clarityLatest.scrollDepth, rageClickPct: clarityLatest.rageClickPct, deadClickPct: clarityLatest.deadClickPct } : null}
        notice={ga === 'connected' ? 'connected' : ga ? 'error' : undefined}
      />
    ),
    search: (
      <ClientSearchCard
        clientId={id}
        connected={searchReady.connected}
        hasScope={searchReady.hasScope}
        siteUrl={client.searchConsoleSite || undefined}
        summary={searchSummary}
        error={searchError}
      />
    ),
    details: (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200">
        <h3 className="font-semibold text-zinc-900 flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-zinc-400" />
          Client details
        </h3>
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
          {(
            [
              ['Owner', client.ownerName],
              ['Email', client.email],
              ['Mobile (used for WhatsApp reports)', client.mobileNumber],
              ['Website', client.websiteUrl],
              ['Google Business link', client.googleLink],
              ['Facebook', client.facebookLink],
              ['Instagram', client.instagramLink],
              ['TikTok', client.tiktokLink],
              ['GA4 property', client.ga4PropertyId],
              ['Added on', client.createdAt ? new Date(client.createdAt).toLocaleDateString() : undefined],
            ] as Array<[string, string | undefined]>
          ).map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">{label}</dt>
              <dd className="text-zinc-900 break-words">
                {!value ? (
                  <span className="text-zinc-400">Not provided</span>
                ) : /^https?:\/\//.test(value) ? (
                  <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{value}</a>
                ) : (
                  value
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    ),
  };

  return (
    <div className="max-w-4xl mx-auto px-6 md:px-8 pb-8 animate-in fade-in duration-300">
      <ClientSwitcher clients={allClients.map((c) => ({ id: c.id, name: c.brandName }))} currentId={id} />
      <div className="mt-5 mb-6">
        <Link href="/admin/clients" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" />
          All clients
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">{client.brandName}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-sm text-zinc-600">
              {client.ownerName && <span className="flex items-center gap-1.5"><User className="w-4 h-4" /> {client.ownerName}</span>}
              {client.email && <span className="flex items-center gap-1.5"><Mail className="w-4 h-4" /> {client.email}</span>}
              {client.mobileNumber && <span className="flex items-center gap-1.5"><Phone className="w-4 h-4" /> {client.mobileNumber}</span>}
            </div>
          </div>
          <Link
            href={`/admin/clients/${id}/edit`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
          >
            <Edit3 className="w-4 h-4" />
            Edit Profile
          </Link>
        </div>
      </div>

      <ClientTabs tabs={tabs} panels={panels} overview={overview} initial={initial} />
    </div>
  );
}
