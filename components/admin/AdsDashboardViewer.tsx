'use client';

import { useState } from 'react';
import { ClientAdsDashboard } from './ClientAdsDashboard';
import { ProfessionalAdsReport } from './ProfessionalAdsReport';
import type { ClientProfile } from '@/types/database';

export function AdsDashboardViewer({ clients }: { clients: ClientProfile[] }) {
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id || '');
  
  const selectedClient = clients.find(c => c.id === selectedClientId);
  const adsCustomerId = selectedClient?.linkedGoogleAdsIds?.[0];

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="text-sm font-medium text-zinc-700">
          Select Client Account:
        </div>
        <select 
          value={selectedClientId}
          onChange={(e) => setSelectedClientId(e.target.value)}
          className="bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-full sm:w-64"
        >
          {clients.length === 0 && <option value="">No clients with Ads found</option>}
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.brandName}</option>
          ))}
        </select>
      </div>
      
      {adsCustomerId ? (
        <>
          <ProfessionalAdsReport customerId={adsCustomerId} brandName={selectedClient.brandName} />
          <ClientAdsDashboard customerId={adsCustomerId} brandName={selectedClient.brandName} />
        </>
      ) : (
        <div className="text-center p-12 bg-white rounded-2xl shadow-sm border border-zinc-200 text-zinc-500">
          {clients.length === 0 ? "You don't have any clients with linked Google Ads accounts yet." : "Please select a client to view their Google Ads dashboard."}
        </div>
      )}
    </div>
  );
}
