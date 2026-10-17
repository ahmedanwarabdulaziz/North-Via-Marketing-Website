// Labels for client reports (page and WhatsApp message). No server imports here.
import type { Compared, ReportData, ReportLanguage } from './client-report';

export const REPORT_TEXT = {
  en: {
    weekly: 'Weekly report',
    monthly: 'Monthly report',
    vsWeek: 'vs previous week',
    vsMonth: 'vs previous month',
    preparedBy: 'Prepared by North Via Marketing',
    social: 'Facebook & Instagram',
    facebook: 'Facebook',
    instagram: 'Instagram',
    followers: 'Followers',
    newFollowers: 'New followers',
    posts: 'Posts',
    views: 'Views',
    reach: 'Reach',
    likes: 'Likes',
    comments: 'Comments',
    topPosts: 'Top posts this period',
    openPost: 'Open post',
    reviews: 'Google reviews',
    newReviews: 'New reviews',
    avgRating: 'Average rating',
    answered: 'Answered',
    ratingMix: 'Ratings this period',
    websites: 'Website health',
    uptime: 'Uptime',
    incidents: 'Outages',
    speed: 'Average load time',
    ssl: 'SSL certificate',
    sslDays: (d: number) => (d < 0 ? 'Expired' : `${d} days left`),
    trackingSince: (d: string) => `Tracking since ${d}; comparison available after a full period.`,
    noPrevious: 'No earlier data',
    newLabel: 'New',
    savePdf: 'Save as PDF',
    previousPeriod: 'Previous period',
    before: 'before',
    noData: 'No activity in this period.',
    fullReport: 'Full report',
  },
  ar: {
    weekly: 'التقرير الأسبوعي',
    monthly: 'التقرير الشهري',
    vsWeek: 'مقارنة بالأسبوع السابق',
    vsMonth: 'مقارنة بالشهر السابق',
    preparedBy: 'إعداد North Via Marketing',
    social: 'فيسبوك وإنستغرام',
    facebook: 'فيسبوك',
    instagram: 'إنستغرام',
    followers: 'المتابعون',
    newFollowers: 'متابعون جدد',
    posts: 'المنشورات',
    views: 'المشاهدات',
    reach: 'الوصول',
    likes: 'الإعجابات',
    comments: 'التعليقات',
    topPosts: 'أفضل المنشورات في هذه الفترة',
    openPost: 'عرض المنشور',
    reviews: 'تقييمات جوجل',
    newReviews: 'تقييمات جديدة',
    avgRating: 'متوسط التقييم',
    answered: 'تم الرد عليها',
    ratingMix: 'توزيع التقييمات',
    websites: 'صحة الموقع',
    uptime: 'مدة التشغيل',
    incidents: 'مرات التوقف',
    speed: 'متوسط سرعة التحميل',
    ssl: 'شهادة الأمان SSL',
    sslDays: (d: number) => (d < 0 ? 'منتهية' : `متبقٍ ${d} يوم`),
    trackingSince: (d: string) => `بدأ التتبع في ${d}؛ تظهر المقارنة بعد اكتمال فترة كاملة.`,
    noPrevious: 'لا توجد بيانات سابقة',
    newLabel: 'جديد',
    savePdf: 'حفظ كملف PDF',
    previousPeriod: 'الفترة السابقة',
    before: 'السابق',
    noData: 'لا يوجد نشاط في هذه الفترة.',
    fullReport: 'التقرير الكامل',
  },
} as const;

export function numberFormat(lang: ReportLanguage) {
  return new Intl.NumberFormat(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', { maximumFractionDigits: 1 });
}

export function compactNumber(n: number | null, lang: ReportLanguage) {
  if (n === null) return '—';
  // Arabic gets full numbers: compact forms ("25.5 ألف") flip around in mixed-direction text.
  if (lang === 'ar') return new Intl.NumberFormat('en-US').format(n);
  return new Intl.NumberFormat('en-US', { notation: n >= 10_000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(n);
}

/** "Oct 10 – Oct 16, 2026" in the report's language (dates are Cairo days). */
export function periodLabel(start: string, end: string, lang: ReportLanguage) {
  const fmt = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const year = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', { year: 'numeric', timeZone: 'UTC' });
  const day = (d: string) => fmt.format(new Date(`${d}T12:00:00Z`));
  return `${day(start)} – ${day(end)}${lang === 'ar' ? '، ' : ', '}${year.format(new Date(`${end}T12:00:00Z`))}`;
}

function change(m: Compared) {
  if (m.current === null || m.previous === null) return '';
  if (m.previous === 0) return m.current === 0 ? '' : ' 🆕';
  const pct = Math.round(((m.current - m.previous) / Math.abs(m.previous)) * 100);
  return pct === 0 ? ' (=)' : ` (${pct > 0 ? '▲' : '▼'} ${Math.abs(pct)}%)`;
}

/** WhatsApp message (WhatsApp formatting) with the headline numbers and the link. */
export function reportWhatsAppText(data: ReportData, lang: ReportLanguage, url: string) {
  const t = REPORT_TEXT[lang];
  const n = (v: number | null) => compactNumber(v, lang);
  const lines = [
    `📊 *${data.clientName} — ${data.days === 7 ? t.weekly : t.monthly}*`,
    `${periodLabel(data.periodStart, data.periodEnd, lang)} · ${data.days === 7 ? t.vsWeek : t.vsMonth}`,
    '',
  ];
  const fb = data.social?.facebook;
  const ig = data.social?.instagram;
  const platformLine = (icon: string, name: string, p: NonNullable<typeof fb>, reachLabel: string) =>
    `${icon} *${name}* — ${reachLabel}: ${n(p.reach.current)}${change(p.reach)} · ${t.posts}: ${n(p.posts.current)}` +
    (p.followers !== null ? ` · ${t.followers}: ${n(p.followers)}` : '');
  if (fb) lines.push(platformLine('📘', t.facebook, fb, t.views));
  if (ig) lines.push(platformLine('📸', t.instagram, ig, t.reach));
  if (data.reviews) {
    const r = data.reviews;
    lines.push(
      `⭐ *${t.reviews}* — ${t.newReviews}: ${n(r.newReviews.current)}${change(r.newReviews)}` +
        (r.averageRating.current !== null ? ` · ${t.avgRating}: ${numberFormat(lang).format(r.averageRating.current)}★` : '')
    );
  }
  if (data.websites && data.websites.uptime.current !== null) {
    lines.push(`🌐 *${t.websites}* — ${t.uptime}: ${numberFormat(lang).format(data.websites.uptime.current)}%${change(data.websites.uptime)}`);
  }
  lines.push('', `${t.fullReport}: ${url}`, '', `— North Via Marketing`);
  return lines.join('\n');
}
