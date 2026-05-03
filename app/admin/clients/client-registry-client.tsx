'use client';

import { useState } from 'react';
import { ClientProfile, GoogleAdsAccount } from '@/types/database';
import { deleteClientProfile } from '@/app/actions/clients';
import { Edit2, Plus, Trash2, Users, Search, BrainCircuit, AlertTriangle } from 'lucide-react';
import { EditClientModal } from './edit-client-modal';

export function ClientRegistryClient({ initialClients, adsAccounts }: { initialClients: ClientProfile[], adsAccounts: GoogleAdsAccount[] }) {
  const [clients, setClients] = useState<ClientProfile[]>(initialClients);
  const [search, setSearch] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientProfile | undefined>(undefined);

  const filteredClients = clients.filter(c => 
    c.businessName.toLowerCase().includes(search.toLowerCase()) ||
    c.contactName.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    setEditingClient(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (client: ClientProfile) => {
    setEditingClient(client);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to permanently delete the CRM profile for ${name}?`)) {
      await deleteClientProfile(id);
      setClients(prev => prev.filter(c => c.id !== id));
    }
  };

  const getAdsAccountNames = (ids: string[] | undefined) => {
    if (!ids || ids.length === 0) return <span className="text-neutral-500 font-normal">Unlinked</span>;
    return ids.map(id => {
      const acc = adsAccounts.find(a => a.customerId === id);
      return acc ? acc.descriptiveName : id;
    }).join(' • ');
  };

  return (
    <>
      {/* Top Bar Actions */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-4 mb-4">
        <div className="relative w-full md:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-neutral-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2.5 bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="Search CRM..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <button
          onClick={handleCreate}
          className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black font-semibold rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Enroll New Client
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredClients.length === 0 ? (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-neutral-200 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center bg-white dark:bg-zinc-900/50">
            <Users className="w-12 h-12 text-neutral-300 mb-4" />
            <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">No Clients Registered</h3>
            <p className="text-neutral-500 max-w-sm mb-6 text-sm">Build your CRM portfolio to activate strict AI reporting instructions and cross-link Google Ads accounts.</p>
            <button onClick={handleCreate} className="px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black font-semibold rounded-xl text-sm">Create First Client</button>
          </div>
        ) : (
          filteredClients.map(client => (
            <div key={client.id} className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm flex flex-col hover:border-neutral-300 dark:hover:border-zinc-600 transition-all hover:shadow-md">
              <div className="p-5 border-b border-neutral-100 dark:border-zinc-800 flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-white">{client.businessName}</h3>
                  <p className="text-neutral-500 text-sm mt-0.5">{client.contactName} • {client.email}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => handleEdit(client)} className="p-2 text-neutral-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(client.id!, client.businessName)} className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="p-5 bg-neutral-50 dark:bg-zinc-800/10 flex-1 space-y-5">
                <div className="flex items-center gap-2 text-sm bg-white dark:bg-zinc-900 p-2.5 rounded-xl border border-neutral-100 dark:border-zinc-800">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${client.linkedGoogleAdsIds?.length > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-neutral-600 dark:text-zinc-400 font-medium">Ads Links:</span>
                  <span className="font-bold text-neutral-900 dark:text-neutral-200 truncate">{getAdsAccountNames(client.linkedGoogleAdsIds)}</span>
                </div>

                <div className="pt-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">
                    <BrainCircuit className="w-3.5 h-3.5" /> AI Strategy
                  </div>
                  <p className="text-sm text-neutral-600 dark:text-zinc-400 line-clamp-3 italic">
                    {client.aiBehavioralNotes ? `"${client.aiBehavioralNotes}"` : 'No proactive instructions set.'}
                  </p>
                </div>

                {client.aiAvoidanceWarnings && (
                  <div className="pt-2 border-t border-neutral-200/50 dark:border-zinc-800/50">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-2 mt-3">
                      <AlertTriangle className="w-3.5 h-3.5" /> Negative Rules
                    </div>
                    <p className="text-sm text-red-800 dark:text-red-300 line-clamp-2 bg-red-50 dark:bg-red-950/30 p-3 rounded-xl border border-red-100 dark:border-red-900/30">
                      {client.aiAvoidanceWarnings}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Editor Modal */}
      {isModalOpen && (
        <EditClientModal 
          client={editingClient} 
          adsAccounts={adsAccounts} 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={() => {
            setIsModalOpen(false);
            window.location.reload();
          }} 
        />
      )}
    </>
  );
}
