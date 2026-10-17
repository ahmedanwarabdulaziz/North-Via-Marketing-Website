import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Cairo } from 'next/font/google';
import { getClientReport, percentChange, type Compared, type PlatformStats, type ReportData, type ReportLanguage } from '@/lib/client-report';
import { REPORT_TEXT, compactNumber, numberFormat, periodLabel } from '@/lib/report-i18n';
import { PrintButton } from './PrintButton';

export const dynamic = 'force-dynamic';

const cairo = Cairo({ subsets: ['arabic', 'latin'], weight: ['400', '600', '700'], display: 'swap' });

type T = (typeof REPORT_TEXT)[ReportLanguage];

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const report = await getClientReport(id).catch(() => null);
  if (!report) return { title: 'Report | North Via Marketing', robots: { index: false, follow: false } };
  const t = REPORT_TEXT[report.language];
  const title = `${report.data.clientName} — ${report.periodDays === 7 ? t.weekly : t.monthly}`;
  const description = `${periodLabel(report.periodStart, report.periodEnd, report.language)} · ${t.preparedBy}`;
  return {
    title,
    description,
    robots: { index: false, follow: false },
    metadataBase: new URL('https://www.northviamarketing.com'),
    openGraph: { title, description, images: [{ url: '/Logo-1.png', width: 400, height: 400 }], type: 'article' },
  };
}

function ChangeBadge({ m, t, lowerIsBetter = false, neutral = false, suffix = '%', against = 'previous' }: { m: Compared; t: T; lowerIsBetter?: boolean; neutral?: boolean; suffix?: string; against?: 'previous' | 'lastYear' }) {
  if (m.current === null) return null;
  if (m[against] === null || m[against] === undefined) return <span className="text-xs text-zinc-400">{t.noPrevious}</span>;
  const pct = percentChange(m, against);
  if (pct === null) return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{t.newLabel}</span>;
  if (pct === 0) return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">= 0{suffix}</span>;
  const good = lowerIsBetter ? pct < 0 : pct > 0;
  const tone = neutral ? 'bg-zinc-100 text-zinc-700' : good ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700';
  return (
    <span className={`whitespace-nowrap text-xs font-semibold px-2 py-0.5 rounded-full ${tone}`} dir="ltr">
      {pct > 0 ? '▲' : '▼'} {Math.abs(pct)}
      {suffix}
    </span>
  );
}

function Stat({ label, m, lang, t, format, lowerIsBetter, neutral }: { label: string; m: Compared; lang: ReportLanguage; t: T; format?: (n: number) => string; lowerIsBetter?: boolean; neutral?: boolean }) {
  const show = (n: number | null) => (n === null ? '—' : format ? format(n) : compactNumber(n, lang));
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 break-inside-avoid">
      <div className="text-xs font-medium text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-zinc-900" dir="ltr">
        {show(m.current)}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <ChangeBadge m={m} t={t} lowerIsBetter={lowerIsBetter} neutral={neutral} />
        {m.previous !== null && (
          <span className="text-[11px] text-zinc-400 whitespace-nowrap">
            {t.before} <span dir="ltr">{show(m.previous)}</span>
          </span>
        )}
      </div>
      {m.lastYear !== undefined && m.lastYear !== null && (
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <ChangeBadge m={m} t={t} lowerIsBetter={lowerIsBetter} neutral={neutral} against="lastYear" />
          <span className="text-[11px] text-zinc-400 whitespace-nowrap">
            {t.vsLastYear} <span dir="ltr">{show(m.lastYear)}</span>
          </span>
        </div>
      )}
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 break-inside-avoid-page">
      <h2 className="flex items-center gap-2 text-lg font-bold text-zinc-900">
        <span aria-hidden>{icon}</span>
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function PlatformBlock({ p, kind, lang, t }: { p: PlatformStats; kind: 'facebook' | 'instagram'; lang: ReportLanguage; t: T }) {
  return (
    <div className="mt-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-semibold text-zinc-800">
          {kind === 'facebook' ? '📘 ' + t.facebook : '📸 ' + t.instagram}
          {' '}
          <bdi className="ms-1 text-sm font-normal text-zinc-500">{p.name}</bdi>
        </h3>
        {p.followers !== null && (
          <div className="text-sm text-zinc-600">
            <span className="font-semibold text-zinc-900" dir="ltr">{compactNumber(p.followers, lang)}</span> {t.followers}
          </div>
        )}
      </div>
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Stat label={kind === 'facebook' ? t.views : t.reach} m={p.reach} lang={lang} t={t} />
        {p.followersChange.current !== null && (
          <Stat label={t.newFollowers} m={p.followersChange} lang={lang} t={t} format={(n) => `${n > 0 ? '+' : ''}${numberFormat(lang).format(n)}`} />
        )}
        <Stat label={t.posts} m={p.posts} lang={lang} t={t} />
        <Stat label={t.likes} m={p.likes} lang={lang} t={t} />
        <Stat label={t.comments} m={p.comments} lang={lang} t={t} />
      </div>
    </div>
  );
}

function Report({ data, lang }: { data: ReportData; lang: ReportLanguage }) {
  const t = REPORT_TEXT[lang];
  const nf = numberFormat(lang);
  const dateFmt = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const day = (d: string) => dateFmt.format(new Date(`${d}T12:00:00Z`));

  return (
    <>
      {data.social && (data.social.facebook || data.social.instagram) && (
        <Section title={t.social} icon="📱">
          {data.social.facebook && <PlatformBlock p={data.social.facebook} kind="facebook" lang={lang} t={t} />}
          {data.social.instagram && <PlatformBlock p={data.social.instagram} kind="instagram" lang={lang} t={t} />}
          {data.social.followersTrackedSince && data.social.followersTrackedSince > data.previousStart && (
            <p className="mt-3 text-xs text-zinc-500">{t.followers}: {t.trackingSince(day(data.social.followersTrackedSince))}</p>
          )}
          {data.social.topPosts.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold text-zinc-800">{t.topPosts}</h3>
              <div className="mt-3 space-y-3">
                {data.social.topPosts.map((p, i) => (
                  <div key={i} className="rounded-2xl border border-zinc-200 bg-white p-4 break-inside-avoid">
                    <div className="flex items-center justify-between gap-3 text-xs text-zinc-500">
                      <span>{p.platform === 'facebook' ? '📘 ' + t.facebook : '📸 ' + t.instagram} · {day(p.createdTime.slice(0, 10))}</span>
                      {p.permalink && (
                        <a href={p.permalink} target="_blank" rel="noopener noreferrer" className="print:hidden text-blue-600 hover:underline">{t.openPost}</a>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-zinc-800 line-clamp-3">{p.message || '—'}</p>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-zinc-600" dir="ltr">
                      <span>👁 {compactNumber(p.reach, lang)}</span>
                      <span>❤️ {compactNumber(p.likes, lang)}</span>
                      <span>💬 {compactNumber(p.comments, lang)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>
      )}

      {data.reviews && (
        <Section title={t.reviews} icon="⭐">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Stat label={t.newReviews} m={data.reviews.newReviews} lang={lang} t={t} />
            <Stat label={t.avgRating} m={data.reviews.averageRating} lang={lang} t={t} format={(n) => `${nf.format(n)} ★`} />
            <Stat label={t.answered} m={data.reviews.answered} lang={lang} t={t} />
          </div>
          {data.reviews.newReviews.current ? (
            <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4 break-inside-avoid">
              <div className="text-xs font-medium text-zinc-500 mb-2">{t.ratingMix}</div>
              {data.reviews.stars.map((count, i) => {
                const max = Math.max(...data.reviews!.stars, 1);
                return (
                  <div key={i} className="flex items-center gap-3 text-sm" dir="ltr">
                    <span className="w-8 text-zinc-600">{5 - i}★</span>
                    <div className="flex-1 h-2 rounded-full bg-zinc-100 overflow-hidden">
                      <div className="h-full rounded-full bg-amber-400" style={{ width: `${(count / max) * 100}%` }} />
                    </div>
                    <span className="w-6 text-end text-zinc-600">{count}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">{t.noData}</p>
          )}
        </Section>
      )}

      {data.ads && (
        <Section title={t.ads} icon="📈">
          {(() => {
            const a = data.ads;
            const money = (n: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: a.currency, maximumFractionDigits: n >= 100 ? 0 : 2 }).format(n);
            return (
              <>
                {a.hasLastYear && (
                  <p className="-mt-1 mb-3 text-xs text-zinc-500">
                    {t.lastYear}: {periodLabel(a.lastYearStart, a.lastYearEnd, lang)}
                  </p>
                )}
                {/* The headline results: how many people saw the ads, and how many clicked. */}
                <div className="grid grid-cols-2 gap-3">
                  <Stat label={t.impressions} m={a.impressions} lang={lang} t={t} />
                  <Stat label={t.clicks} m={a.clicks} lang={lang} t={t} />
                </div>
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <Stat label={t.ctr} m={a.ctr} lang={lang} t={t} format={(n) => `${nf.format(n)}%`} />
                  {/* Spend going up or down isn't good or bad by itself, so it's shown in grey. */}
                  <Stat label={t.spend} m={a.spend} lang={lang} t={t} format={money} neutral />
                  <Stat label={t.avgCpc} m={a.avgCpc} lang={lang} t={t} format={money} lowerIsBetter />
                  {a.showConversions && (
                    <>
                      <Stat label={t.conversions} m={a.conversions} lang={lang} t={t} />
                      <Stat label={t.cpa} m={a.costPerConversion} lang={lang} t={t} format={money} lowerIsBetter />
                    </>
                  )}
                </div>

                {a.keywords.items.length > 0 && (
                  <div className="mt-4 rounded-2xl border border-zinc-200 bg-white overflow-hidden break-inside-avoid">
                    <div className="px-4 py-3 text-xs font-medium text-zinc-500 flex justify-between gap-3">
                      <span>{a.keywords.source === 'keywords' ? t.keywords : t.searchTerms}</span>
                      <span className="flex gap-6" dir="ltr">
                        <span>{t.impressions.split(' (')[0]}</span>
                        <span>{t.clicks}</span>
                      </span>
                    </div>
                    <ol className="divide-y divide-zinc-100">
                      {a.keywords.items.map((k, i) => (
                        <li key={k.text} className="px-4 py-2.5 flex items-center justify-between gap-3 text-sm">
                          <span className="min-w-0 truncate">
                            <span className="text-zinc-400 me-2" dir="ltr">{i + 1}.</span>
                            <bdi className="text-zinc-800">{k.text}</bdi>
                          </span>
                          <span className="flex gap-6 text-zinc-600 shrink-0 tabular-nums" dir="ltr">
                            <span className="w-14 text-end">{compactNumber(k.impressions, lang)}</span>
                            <span className="w-10 text-end font-semibold text-zinc-900">{compactNumber(k.clicks, lang)}</span>
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {a.campaigns.length > 0 && (
                  <div className="mt-4 rounded-2xl border border-zinc-200 bg-white divide-y divide-zinc-100 break-inside-avoid">
                    <div className="px-4 py-3 text-xs font-medium text-zinc-500">{t.campaigns}</div>
                    {a.campaigns.map((c, i) => (
                      <div key={i} className="px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                        <bdi className="font-medium text-zinc-800 min-w-0 truncate">{c.name}</bdi>
                        <div className="flex gap-4 text-xs text-zinc-600" dir="ltr">
                          <span>{compactNumber(c.clicks, lang)} {t.clicks}</span>
                          <span>{money(c.cost)}</span>
                          {a.showConversions && <span>{nf.format(c.conversions)} {t.conversions}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
        </Section>
      )}

      {data.analytics && (
        <Section title={t.visitorsSection} icon="👥">
          {data.analytics.ga && (() => {
            const g = data.analytics!.ga!;
            const totalSessions = g.channels.reduce((a, c) => a + c.sessions, 0) || 1;
            return (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Stat label={t.visitors} m={g.visitors} lang={lang} t={t} />
                  <Stat label={t.sessions} m={g.sessions} lang={lang} t={t} />
                </div>
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <Stat label={t.pageViews} m={g.pageViews} lang={lang} t={t} />
                  <Stat label={t.engagement} m={g.engagementRate} lang={lang} t={t} format={(n) => `${nf.format(n)}%`} />
                  {g.showKeyEvents && <Stat label={t.keyEvents} m={g.keyEvents} lang={lang} t={t} />}
                </div>
                {g.channels.length > 0 && (
                  <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4 break-inside-avoid">
                    <div className="text-xs font-medium text-zinc-500 mb-3">{t.sources}</div>
                    <div className="space-y-2">
                      {g.channels.map((c) => (
                        <div key={c.name} className="flex items-center gap-3 text-sm">
                          <bdi className="w-32 shrink-0 text-zinc-700 truncate">{c.name}</bdi>
                          <div className="flex-1 h-2 rounded-full bg-zinc-100 overflow-hidden">
                            <div className="h-full rounded-full bg-sky-500" style={{ width: `${(c.sessions / totalSessions) * 100}%` }} />
                          </div>
                          <span className="w-12 text-end text-zinc-600 tabular-nums" dir="ltr">{Math.round((c.sessions / totalSessions) * 100)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {g.pages.length > 0 && (
                  <div className="mt-4 rounded-2xl border border-zinc-200 bg-white divide-y divide-zinc-100 break-inside-avoid">
                    <div className="px-4 py-3 text-xs font-medium text-zinc-500">{t.topPages}</div>
                    {g.pages.map((p) => (
                      <div key={p.path} className="px-4 py-2.5 flex items-center justify-between gap-3 text-sm">
                        <div className="min-w-0">
                          <bdi className="block text-zinc-800 truncate">{p.title || p.path}</bdi>
                          <div className="text-xs text-zinc-400 truncate" dir="ltr">{p.path}</div>
                        </div>
                        <span className="shrink-0 font-semibold text-zinc-900 tabular-nums" dir="ltr">{compactNumber(p.views, lang)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
          {data.analytics.clarity && (
            <div className={data.analytics.ga ? 'mt-6' : ''}>
              <h3 className="font-semibold text-zinc-800">{t.behaviour}</h3>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Stat label={t.scrollDepth} m={data.analytics.clarity.scrollDepth} lang={lang} t={t} format={(n) => `${Math.round(n)}%`} />
                <Stat label={t.rageClicks} m={data.analytics.clarity.rageClickPct} lang={lang} t={t} format={(n) => `${nf.format(n)}%`} lowerIsBetter />
                <Stat label={t.deadClicks} m={data.analytics.clarity.deadClickPct} lang={lang} t={t} format={(n) => `${nf.format(n)}%`} lowerIsBetter />
              </div>
            </div>
          )}
        </Section>
      )}

      {data.websites && (
        <Section title={t.websites} icon="🌐">
          {data.websites.uptime.current !== null && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              <Stat label={t.uptime} m={data.websites.uptime} lang={lang} t={t} format={(n) => `${nf.format(n)}%`} />
              <Stat label={t.incidents} m={data.websites.incidents} lang={lang} t={t} lowerIsBetter />
              <Stat label={t.speed} m={data.websites.avgResponseMs} lang={lang} t={t} format={(n) => `${nf.format(Math.round(n / 100) / 10)}s`} lowerIsBetter />
            </div>
          )}
          <div className="rounded-2xl border border-zinc-200 bg-white divide-y divide-zinc-100 break-inside-avoid">
            {data.websites.pages.map((p, i) => (
              <div key={i} className="p-4 flex flex-wrap items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <div className="font-medium text-zinc-800">{p.label}</div>
                  <div className="text-xs text-zinc-500 break-all" dir="ltr">{p.url}</div>
                </div>
                <div className="flex gap-4 text-xs text-zinc-600">
                  {p.uptime !== null && <span dir="ltr">✅ {nf.format(p.uptime)}%</span>}
                  {p.sslDaysLeft !== null && <span>🔒 {t.sslDays(p.sslDaysLeft)}</span>}
                </div>
              </div>
            ))}
          </div>
          {data.websites.trackedSince && data.websites.trackedSince > data.previousStart && (
            <p className="mt-3 text-xs text-zinc-500">{t.trackingSince(day(data.websites.trackedSince))}</p>
          )}
        </Section>
      )}
    </>
  );
}

export default async function SharedReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = await getClientReport(id);
  if (!report) notFound();
  const { data, language: lang } = report;
  const t = REPORT_TEXT[lang];

  return (
    <main dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang} className={`min-h-screen bg-zinc-50 print:bg-white ${lang === 'ar' ? cairo.className : ''}`}>
      <header className="bg-gradient-to-br from-[#14306b] via-[#1e3a8a] to-[#b45309] text-white print:bg-none print:text-zinc-900">
        <div className="max-w-3xl mx-auto px-5 pt-8 pb-10">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white rounded-xl p-1.5">
                <Image src="/Logo-1.png" alt="North Via Marketing" width={36} height={36} priority />
              </div>
              <span className="text-sm font-semibold tracking-wide opacity-90">North Via Marketing</span>
            </div>
            <PrintButton label={t.savePdf} />
          </div>
          <h1 className="mt-8 text-3xl sm:text-4xl font-bold">{data.clientName}</h1>
          <p className="mt-2 text-lg opacity-90">{data.days === 7 ? t.weekly : t.monthly}</p>
          <p className="mt-1 text-sm opacity-80">
            {periodLabel(data.periodStart, data.periodEnd, lang)} · {data.days === 7 ? t.vsWeek : t.vsMonth}
          </p>
          <p className="mt-1 text-xs opacity-60">
            {t.previousPeriod}: {periodLabel(data.previousStart, data.previousEnd, lang)}
          </p>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-5 pb-12 -mt-2">
        <Report data={data} lang={lang} />
        <footer className="mt-12 pt-6 border-t border-zinc-200 text-center text-xs text-zinc-500">
          {t.preparedBy} · northviamarketing.com
        </footer>
      </div>
    </main>
  );
}
