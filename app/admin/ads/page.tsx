import { listClientProfiles } from '@/lib/admin-ops';
import { AdsDashboardViewer } from '@/components/admin/AdsDashboardViewer';
import { BarChart3 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminAdsPage() {
  const allClients = await listClientProfiles();
  const clientsWithAds = allClients.filter(c => c.linkedGoogleAdsIds && c.linkedGoogleAdsIds.length > 0);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-blue-500" />
          Google Ads Dashboard
        </h1>
        <p className="text-zinc-500 mt-2">View and analyze ad performance across all your connected clients.</p>
      </div>

      <AdsDashboardViewer clients={clientsWithAds} />
    </div>
  );
}
