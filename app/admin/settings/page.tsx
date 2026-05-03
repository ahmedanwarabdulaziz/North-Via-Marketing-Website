import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminShell } from '@/components/admin/AdminShell';
import { checkGoogleAdsConnection } from '@/app/actions/google-ads';
import { AdminSettingsForm } from './client-form';
import { AdsAccountsSelector } from './ads-accounts';
import { db } from '@/lib/firebase';
import { GoogleAdsAccount } from '@/types/database';

export default async function SettingsPage() {
  const { isConnected } = await checkGoogleAdsConnection();

  let managedAccounts: GoogleAdsAccount[] = [];
  
  if (isConnected) {
    const snapshot = await db.collection('google_ads_accounts').where('googleConnectionId', '==', 'master_admin_connection').get();
    managedAccounts = snapshot.docs.map(doc => doc.data() as GoogleAdsAccount);
  }

  return (
    <AdminShell>
      <AdminHeader title="System Settings" />
      <div className="p-4 md:p-8 max-w-4xl mx-auto w-full flex flex-col items-start justify-start py-8">
        
        <div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-2xl p-6 w-full shadow-sm">
          <h2 className="text-xl font-semibold mb-4 border-b border-neutral-200 dark:border-zinc-800 pb-4">Integrations</h2>
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 bg-neutral-50 dark:bg-zinc-800/50 rounded-xl">
            <div>
              <h3 className="font-medium text-lg flex items-center gap-2">
                Google Ads API
                {isConnected && (
                  <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full flex items-center gap-1.5 align-middle">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    Authorized
                  </span>
                )}
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm">
                Connect your Google account to grant secure REST API access. This token is securely encrypted inside Firestore.
              </p>
            </div>

            <AdminSettingsForm isConnected={!!isConnected} />
          </div>
        </div>

        {isConnected && <AdsAccountsSelector initialAccounts={managedAccounts} />}

      </div>
    </AdminShell>
  );
}
