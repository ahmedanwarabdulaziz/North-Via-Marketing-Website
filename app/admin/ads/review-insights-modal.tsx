'use client';

import { useState, useEffect } from 'react';
import { generateDraftInsights, storeSnapshotAndDispatchEmail, regenerateSingleDraft } from '@/app/actions/dispatch-reports';
import { Loader2, X, Send, Bot, CheckCircle2, FileEdit, AlertTriangle, Sparkles } from 'lucide-react';
import { ClientProfile } from '@/types/database';

interface ReviewInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountStreams: any[];
  timeframe: string;
  bounds: any;
  targetClient: ClientProfile;
  clientId: string;
}

export function ReviewInsightsModal({
  isOpen, onClose, accountStreams, timeframe, bounds, targetClient, clientId
}: ReviewInsightsModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [draftsMap, setDraftsMap] = useState<Record<string, any>>({});
  const [errorMap, setErrorMap] = useState<Record<string, string>>({});
  const [instructionMap, setInstructionMap] = useState<Record<string, string>>({});
  const [regenLoadingMap, setRegenLoadingMap] = useState<Record<string, boolean>>({});
  const [hasGenerated, setHasGenerated] = useState(false);

  useEffect(() => {
    if (isOpen && !hasGenerated) {
      handleGenerate();
    }
  }, [isOpen]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setHasGenerated(true);
    const { success, drafts, error } = await generateDraftInsights(accountStreams, timeframe, bounds, targetClient);
    setIsGenerating(false);

    if (success && drafts) {
      const newDrafts: Record<string, any> = {};
      const newErrors: Record<string, string> = {};
      drafts.forEach((d: any) => {
        newDrafts[d.customerId] = d.summary || {};
        if (d.summaryError) newErrors[d.customerId] = d.summaryError;
      });
      setDraftsMap(newDrafts);
      setErrorMap(newErrors);
    } else {
      alert("Failed to generate drafts: " + error);
    }
  };

  const handleTextChange = (customerId: string, field: string, newText: string) => {
    setDraftsMap(prev => ({
      ...prev,
      [customerId]: {
        ...(prev[customerId] || {}),
        [field]: newText
      }
    }));
  };

  const handleInstructionChange = (customerId: string, newText: string) => {
    setInstructionMap(prev => ({ ...prev, [customerId]: newText }));
  };

  const handleRegenerateNode = async (customerId: string) => {
    const instruction = instructionMap[customerId];
    if (!instruction || instruction.trim() === '') return;

    setRegenLoadingMap(prev => ({ ...prev, [customerId]: true }));
    
    const stream = accountStreams.find(s => s.account.customerId === customerId);
    if (stream) {
      const { success, summary, summaryError } = await regenerateSingleDraft(
        stream, timeframe, bounds, targetClient, instruction, draftsMap[customerId] || ''
      );

      if (success) {
        setDraftsMap(prev => ({ ...prev, [customerId]: summary }));
        setErrorMap(prev => ({ ...prev, [customerId]: summaryError || '' }));
        // Clear instruction on success
        setInstructionMap(prev => ({ ...prev, [customerId]: '' }));
      } else {
        alert("Failed to regenerate: " + summaryError);
      }
    }
    
    setRegenLoadingMap(prev => ({ ...prev, [customerId]: false }));
  };

  const handleDispatch = async () => {
    setIsDispatching(true);
    
    // Marry the edited drafts into the streams
    const editedStreams = accountStreams.map(stream => ({
      ...stream,
      summary: draftsMap[stream.account.customerId] || {},
      summaryError: errorMap[stream.account.customerId] || undefined
    }));

    const { success, error } = await storeSnapshotAndDispatchEmail(
      clientId, editedStreams, timeframe, bounds, targetClient
    );
    
    setIsDispatching(false);

    if (success) {
      alert("Executive Matrix Dispatched Successfully!");
      onClose();
    } else {
      alert("Dispatch Failed: " + error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-900 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600/20 p-2 rounded-lg border border-blue-600/30">
              <FileEdit className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Executive Editorial Desk</h2>
              <p className="text-sm font-medium text-zinc-400 mt-0.5 tracking-wide">Reviewing AI drafts for <span className="text-zinc-200 font-bold">{targetClient.businessName}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors border border-zinc-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-zinc-950/50 custom-scrollbar">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
              <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
              <p className="text-sm font-bold tracking-widest uppercase">Gemini 1.5 Pro is synthesizing data...</p>
            </div>
          ) : (
            accountStreams.map((stream, idx) => {
              const cid = stream.account.customerId;
              return (
                <div key={cid} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                  <div className="px-5 py-3 border-b border-zinc-800/80 bg-zinc-900/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded">Node #{idx + 1}</span>
                      <p className="font-semibold text-zinc-200 text-sm">{stream.account.descriptiveName}</p>
                    </div>
                    <span className="text-xs font-mono text-zinc-500">{cid}</span>
                  </div>
                  
                  <div className="p-5 flex flex-col gap-4 relative group">
                    {errorMap[cid] ? (
                      <div className="flex items-start gap-3 text-red-400 bg-red-950/30 p-4 rounded-lg border border-red-900/50">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        <span className="text-sm">{errorMap[cid]}</span>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="space-y-4">
                          {[
                            { key: 'campaignsInsight', label: 'Active Campaigns Analysis' },
                            { key: 'keywordsInsight', label: 'Top Keywords & Searches' },
                            { key: 'geoInsight', label: 'Geographic Heatmap' },
                            { key: 'deviceInsight', label: 'Device Funnel' }
                          ].map(field => (
                            <div key={field.key} className="flex flex-col gap-1.5 relative group/item">
                              <label className="text-[11px] font-black uppercase tracking-widest text-zinc-500 ml-1">{field.label}</label>
                              <textarea
                                value={draftsMap[cid]?.[field.key] || ''}
                                onChange={(e) => handleTextChange(cid, field.key, e.target.value)}
                                className={`w-full h-24 bg-zinc-950 border border-zinc-800 text-zinc-300 text-sm rounded-lg p-3 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none resize-y transition-all leading-relaxed custom-scrollbar placeholder:text-zinc-700 group-hover/item:border-zinc-700 ${regenLoadingMap[cid] ? 'opacity-30 blur-[1px]' : ''}`}
                                placeholder={`AI ${field.label} insight will populate here...`}
                                disabled={regenLoadingMap[cid]}
                              />
                            </div>
                          ))}
                        </div>
                        {regenLoadingMap[cid] && (
                          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/20 backdrop-blur-[1px] z-10 rounded-lg">
                            <div className="flex flex-col items-center gap-2">
                              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                              <span className="text-xs font-bold font-mono tracking-widest text-blue-400 uppercase">Rewriting Matrices...</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Co-Pilot Feedback Loop */}
                    <div className="flex items-center gap-2 bg-zinc-950 p-2 border border-zinc-800 rounded-lg group-hover:border-blue-900/40 transition-colors">
                      <input
                        type="text"
                        placeholder="Instruct AI to rewrite (e.g., 'Make it more aggressive', 'Mention our sale')..."
                        value={instructionMap[cid] || ''}
                        onChange={(e) => handleInstructionChange(cid, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRegenerateNode(cid);
                        }}
                        disabled={regenLoadingMap[cid]}
                        className="flex-1 bg-transparent border-none text-xs text-zinc-300 placeholder:text-zinc-600 outline-none px-2"
                      />
                      <button
                        onClick={() => handleRegenerateNode(cid)}
                        disabled={regenLoadingMap[cid] || !instructionMap[cid]?.trim()}
                        className="px-3 py-1.5 bg-blue-600/10 text-blue-500 hover:bg-blue-600/20 disabled:opacity-30 disabled:hover:bg-blue-600/10 rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors border border-blue-500/20"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Reprompt
                      </button>
                    </div>

                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-900 bg-zinc-900/80 flex items-center justify-between">
          <p className="text-xs font-medium text-zinc-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> All edits are securely published natively.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isDispatching}
              className="px-5 py-2.5 text-sm font-semibold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors border border-zinc-700"
            >
              Cancel
            </button>
            <button
              onClick={handleDispatch}
              disabled={isGenerating || isDispatching}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDispatching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {isDispatching ? "Publishing Matrix..." : "Approve & Dispatch"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
