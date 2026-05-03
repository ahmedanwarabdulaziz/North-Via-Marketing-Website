'use client';

import { useState, useTransition } from 'react';
import { GoogleAdsAccount } from '@/types/database';
import { updateClientProfile } from '@/app/actions/client-profile';
import { Loader2, Settings, X, Save } from 'lucide-react';

export function ClientProfileEditor({ account }: { account: GoogleAdsAccount }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [businessName, setBusinessName] = useState(account.clientBusinessName || '');
  const [contactName, setContactName] = useState(account.clientContactName || '');
  const [aiNotes, setAiNotes] = useState(account.aiPromptNotes || '');

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const res = await updateClientProfile(account.customerId, {
        clientBusinessName: businessName,
        clientContactName: contactName,
        aiPromptNotes: aiNotes
      });

      if (res.success) {
        setIsOpen(false);
      } else {
        setError(res.error || 'Failed to update profile');
      }
    });
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-3 md:py-2 bg-neutral-100 dark:bg-zinc-800 text-neutral-700 dark:text-neutral-300 text-sm font-semibold rounded-xl hover:bg-neutral-200 dark:hover:bg-zinc-700 transition-colors shrink-0 border border-neutral-200 dark:border-zinc-700 justify-center w-full md:w-auto"
      >
        <Settings className="w-4 h-4" />
        AI Strategy Profile
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !isPending && setIsOpen(false)}
          />

          {/* Modal */}
          <div className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-lg border border-neutral-200 dark:border-zinc-800 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-neutral-200 dark:border-zinc-800 flex items-center justify-between sticky top-0 bg-white dark:bg-zinc-900 z-10 rounded-t-2xl">
              <div>
                <h2 className="text-xl font-bold">Client AI Strategy</h2>
                <p className="text-sm text-neutral-500 mt-1 flex flex-wrap gap-1 items-center">
                  Target Account: <span className="font-mono text-xs bg-neutral-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">{account.customerId}</span>
                </p>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                disabled={isPending}
                className="p-2 hover:bg-neutral-100 dark:bg-zinc-800/80 dark:hover:bg-zinc-700 rounded-lg transition-colors text-neutral-500 disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              {error && (
                <div className="p-3 mb-6 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm border border-red-200 dark:border-red-900/50">
                  {error}
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold mb-2">Display Business Name</label>
                  <input 
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder={account.descriptiveName}
                    className="w-full bg-neutral-50 dark:bg-zinc-800/50 border border-neutral-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow"
                  />
                  <p className="text-xs text-neutral-500 mt-1.5">Overrides the Google Ads generic title on the PDF Header.</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Contact Person Name</label>
                  <input 
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="e.g., John Doe"
                    className="w-full bg-neutral-50 dark:bg-zinc-800/50 border border-neutral-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow"
                  />
                  <p className="text-xs text-neutral-500 mt-1.5">The AI will naturally address the report directly to this name.</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">AI Behavioral Notes (Agency Internal Context)</label>
                  <textarea 
                    value={aiNotes}
                    onChange={(e) => setAiNotes(e.target.value)}
                    placeholder="e.g., John keeps calling complaining that leads are low this month. Reassure him that the algorithm relies on volume, and while quantity dropped, the cost-per-lead is strictly enforced and high-intent traffic is being isolated..."
                    rows={6}
                    className="w-full bg-neutral-50 dark:bg-zinc-800/50 border border-neutral-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none placeholder-neutral-400 dark:placeholder-neutral-600 transition-shadow"
                  />
                  <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
                    These notes are hidden from the client. Gemini will read these instructions and actively attempt to weave your exact psychological reassurances perfectly into the Summary block!
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-neutral-200 dark:border-zinc-800 bg-neutral-50 dark:bg-zinc-800/30 rounded-b-2xl sticky bottom-0">
              <button
                onClick={handleSave}
                disabled={isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Save AI Strategy
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
