import { db } from '@/lib/firebase';
import { ClientProfile, GoogleAdsAccount } from '@/types/database';
import { ClientRegistryClient } from './client-registry-client';
import { AdminShell } from '@/components/admin/AdminShell';
import { AdminHeader } from '@/components/admin/AdminHeader';

export const dynamic = 'force-dynamic';

export default async function ClientsPage() {
  // Fetch active Google Ads accounts for the mapping dropdown
  const adsSnapshot = await db.collection('google_ads_accounts').get();
  const adsAccounts = adsSnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as GoogleAdsAccount[];

  // Fetch Master CRM Clients
  const clientsSnapshot = await db.collection('clients').orderBy('createdAt', 'desc').get();
  const clients = clientsSnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as ClientProfile[];

  return (
    <AdminShell>
      <AdminHeader title="Client CRM Portfolio" />
      <div className="flex flex-col min-h-screen bg-neutral-50 dark:bg-zinc-950 p-4 md:p-8 max-w-7xl mx-auto w-full">
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white mb-2">Master Client Portfolio</h1>
            <p className="text-neutral-500 dark:text-zinc-400 text-sm md:text-base">
              Centrally manage your agency clients, cross-link their multi-channel data sources, and configure global AI instruction directives.
            </p>
          </div>
        </div>
        
        <ClientRegistryClient initialClients={clients} adsAccounts={adsAccounts} />
      </div>
    </AdminShell>
  );
}
