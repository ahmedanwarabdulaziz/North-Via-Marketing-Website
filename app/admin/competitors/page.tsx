import { Eye } from 'lucide-react';
import { listClientProfiles } from '@/lib/admin-ops';
import { competitorStatus, googleConfigured, googleGrowth, listCompetitors, listFindings } from '@/lib/competitors';
import { adLibraryUrl } from '@/lib/competitor-telegram';
import { CompetitorsManager } from '@/components/admin/CompetitorsManager';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export default async function CompetitorsPage({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const params = await searchParams;
  const clients = (await listClientProfiles().catch(() => [])).filter((c) => c.id && c.brandName).map((c) => ({ id: c.id!, name: c.brandName }));
  const clientId = clients.find((c) => c.id === params.client)?.id || clients[0]?.id || '';
  const competitors = clientId ? await listCompetitors(clientId) : [];
  const rows = await Promise.all(
    competitors.map(async (c) => ({ id: c.id, name: c.name, website: c.website, instagram: c.instagram, googleQuery: c.google, notes: c.notes, status: await competitorStatus(c.id), growth: await googleGrowth(c.id), adsUrl: adLibraryUrl(c) }))
  );
  const findings = clientId ? (await listFindings(clientId)).slice(0, 25) : [];

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight flex items-center gap-3">
          <Eye className="w-8 h-8 text-zinc-400" />
          Competitors
        </h1>
        <p className="text-zinc-500 mt-2 max-w-2xl">
          Instagram is checked every 3 hours (new posts, offers, followers), websites and Google once a day. Offers and new products come to Telegram right
          away; a weekly report arrives on Mondays at 10:00 Cairo.
          {!googleConfigured() && ' Google ratings start once GOOGLE_PLACES_API_KEY is set in Vercel.'}
        </p>
      </div>
      <CompetitorsManager clients={clients} clientId={clientId} competitors={rows} findings={findings} />
    </div>
  );
}
