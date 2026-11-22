import { Link2 } from 'lucide-react';
import { loadAccountLinks, type LinkKind } from '@/lib/account-links';
import { AccountLinksManager } from '@/components/admin/AccountLinksManager';

// Admin → Google & Ads: Google Business locations, Google Ads and Facebook ad accounts, GA4
// properties and Search Console sites, each linked to its client.

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export default async function AccountLinksPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const data = await loadAccountLinks();
  // Back from a Google login: open that tab and say how it went.
  const back = (['gbp', 'ads', 'ga'] as const).find((k) => params[k]);
  const tab: LinkKind | undefined = back === 'gbp' ? 'gbp' : back === 'ads' ? 'google_ads' : back === 'ga' ? 'ga4' : (params.tab as LinkKind | undefined);
  const notice = back ? (params[back] === 'connected' ? 'connected' : 'error') : undefined;

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight flex items-center gap-3">
          <Link2 className="w-8 h-8 text-zinc-400" />
          Google &amp; Ads
        </h1>
        <p className="text-zinc-500 mt-2">Link each Google Business location, ad account, Analytics property and Search Console site to its client.</p>
      </div>
      <AccountLinksManager {...data} initialTab={tab} notice={notice} />
    </div>
  );
}
