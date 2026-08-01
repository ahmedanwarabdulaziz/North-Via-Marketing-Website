import { checkGoogleAdsConnection } from '@/app/actions/google-ads';
import { db } from '@/lib/firebase';
import { listClientProfiles } from '@/lib/admin-ops';
import { GoogleAdsManager } from '@/components/admin/GoogleAdsManager';
import { Settings } from 'lucide-react';
import type { GoogleAdsAccount } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const { isConnected } = await checkGoogleAdsConnection();
  
  let accounts: GoogleAdsAccount[] = [];
  if (isConnected) {
    const snapshot = await db.collection('google_ads_accounts').get();
    accounts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as GoogleAdsAccount[];
  }

  const clients = await listClientProfiles();

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight flex items-center gap-3">
          <Settings className="w-8 h-8 text-zinc-400" />
          System Settings
        </h1>
        <p className="text-zinc-500 mt-2">Manage your integrations, global configurations, and preferences.</p>
      </div>

      <GoogleAdsManager 
        isConnected={isConnected} 
        accounts={accounts} 
        clients={clients} 
      />
    </div>
  );
}
