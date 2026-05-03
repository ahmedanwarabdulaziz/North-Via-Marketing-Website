import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminShell } from '@/components/admin/AdminShell';
import { checkGoogleAdsConnection } from '@/app/actions/google-ads';
import { db } from '@/lib/firebase';
import { GoogleAdsAccount, ClientProfile } from '@/types/database';
import { AdsDashboardClient } from './ads-dashboard-client';

export default async function AdsDashboardPage({ searchParams }: { searchParams: Promise<{ accountId?: string }> }) {
  const { isConnected } = await checkGoogleAdsConnection();

  if (!isConnected) {
    return (
      <AdminShell>
        <AdminHeader title="Google Ads Performance" />
        <div className="p-8 max-w-4xl mx-auto text-center py-24">
          <h2 className="text-xl font-semibold mb-2">Not Connected</h2>
          <p className="text-neutral-500">You must authorize Google Ads in settings to view real-time reports.</p>
        </div>
      </AdminShell>
    );
  }

  // Await the Next.js 15 asynchronous searchParams object
  const resolvedParams = await searchParams;
  
  const snapshot = await db.collection('google_ads_accounts').where('googleConnectionId', '==', 'master_admin_connection').get();
  const accounts = snapshot.docs.map(doc => doc.data() as GoogleAdsAccount);

  const clientSnap = await db.collection('clients').get();
  const clients = clientSnap.docs.map(d => ({ id: d.id, ...d.data() })) as ClientProfile[];

  // Support either ?accountId=... or ?clientId=...
  const selectedTargetId = resolvedParams.accountId || (clients.length > 0 ? clients[0].id! : (accounts.length > 0 ? accounts[0].customerId : null));

  return (
    <AdminShell>
      <AdminHeader title="Google Ads Performance" />
      <div className="p-4 md:p-8 max-w-6xl mx-auto w-full flex flex-col items-start justify-start">
        <AdsDashboardClient 
          accounts={accounts} 
          clients={clients}
          selectedTargetId={selectedTargetId} 
        />
      </div>
    </AdminShell>
  );
}
