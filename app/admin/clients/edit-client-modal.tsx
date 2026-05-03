'use client';

import { useState, useTransition } from 'react';
import { ClientProfile, GoogleAdsAccount } from '@/types/database';
import { createOrUpdateClient } from '@/app/actions/clients';
import { Loader2, X, Save, Briefcase, Target, MapPin, BrainCircuit, Link as LinkIcon } from 'lucide-react';

function StringArrayInput({ label, values, onChange, placeholder }: { label: string, values: string[], onChange: (v: string[]) => void, placeholder?: string }) {
  const [inputValue, setInputValue] = useState('');
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = inputValue.trim();
      if (val && !values.includes(val)) {
        onChange([...values, val]);
      }
      setInputValue('');
    }
  };

  const removeValue = (index: number) => {
    onChange(values.filter((_, i) => i !== index));
  };

  return (
    <div>
      <label className="block text-sm font-semibold mb-2">{label}</label>
      <div className="bg-neutral-50 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-xl p-2 focus-within:ring-2 focus-within:ring-blue-500 transition-shadow">
        <div className="flex flex-wrap gap-2 mb-2">
          {values.map((v, i) => (
            <span key={i} className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-700 px-2.5 py-1 rounded-md text-[13px] font-medium shadow-sm">
              {v}
              <button type="button" onClick={() => removeValue(i)} className="text-neutral-400 hover:text-red-500 focus:outline-none">
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
        <input 
          type="text" 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent outline-none text-sm px-2 py-1 text-neutral-900 dark:text-white placeholder-neutral-400"
          placeholder={values.length === 0 ? placeholder : "Type and press enter..."}
        />
      </div>
    </div>
  );
}

const TABS = [
  { id: 'basics', label: 'Business Basics', icon: Briefcase },
  { id: 'goals', label: 'Reporting Goals', icon: Target },
  { id: 'location', label: 'Location Strategy', icon: MapPin },
  { id: 'ai', label: 'AI & Intelligence', icon: BrainCircuit },
  { id: 'connections', label: 'Connections', icon: LinkIcon }
] as const;

type TabId = typeof TABS[number]['id'];

export function EditClientModal({ 
  client,
  adsAccounts,
  onClose,
  onSuccess
}: { 
  client?: ClientProfile;
  adsAccounts: GoogleAdsAccount[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('basics');

  const [form, setForm] = useState({
    businessName: client?.businessName || '',
    contactName: client?.contactName || '',
    email: client?.email || '',
    reportingEmails: client?.reportingEmails || [],
    industry: client?.industry || '',
    businessDescription: client?.businessDescription || '',
    primaryServices: client?.primaryServices || [],
    averageJobValue: client?.averageJobValue?.toString() || '',
    targetCostPerLead: client?.targetCostPerLead?.toString() || '',
    monthlyAdBudget: client?.monthlyAdBudget?.toString() || '',
    mainGoal: client?.mainGoal || '',
    primaryObjective: client?.primaryObjective || 'lead_generation',
    conversionDefinition: client?.conversionDefinition || '',
    serviceAreas: client?.serviceAreas || [],
    targetCities: client?.targetCities || [],
    excludedCities: client?.excludedCities || [],
    reportTone: client?.reportTone || 'executive',
    clientConcerns: client?.clientConcerns || '',
    nextStepNotes: client?.nextStepNotes || '',
    aiBehavioralNotes: client?.aiBehavioralNotes || '',
    aiAvoidanceWarnings: client?.aiAvoidanceWarnings || '',
    linkedGoogleAdsIds: client?.linkedGoogleAdsIds || [],
  });

  const handleSave = () => {
    if (!form.businessName || !form.contactName) {
      setError('Business Name and Contact Name are required.');
      setActiveTab('basics');
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await createOrUpdateClient({
        id: client?.id,
        businessName: form.businessName,
        contactName: form.contactName,
        email: form.email,
        reportingEmails: form.reportingEmails,
        industry: form.industry,
        businessDescription: form.businessDescription,
        primaryServices: form.primaryServices,
        averageJobValue: form.averageJobValue ? Number(form.averageJobValue) : undefined,
        targetCostPerLead: form.targetCostPerLead ? Number(form.targetCostPerLead) : undefined,
        monthlyAdBudget: form.monthlyAdBudget ? Number(form.monthlyAdBudget) : undefined,
        mainGoal: form.mainGoal,
        primaryObjective: form.primaryObjective as any,
        conversionDefinition: form.conversionDefinition,
        serviceAreas: form.serviceAreas,
        targetCities: form.targetCities,
        excludedCities: form.excludedCities,
        reportTone: form.reportTone as any,
        clientConcerns: form.clientConcerns,
        nextStepNotes: form.nextStepNotes,
        aiBehavioralNotes: form.aiBehavioralNotes,
        aiAvoidanceWarnings: form.aiAvoidanceWarnings,
        linkedGoogleAdsIds: form.linkedGoogleAdsIds
      });

      if (res.success) {
        onSuccess();
      } else {
        setError(res.error || 'Failed to save client target matrix.');
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !isPending && onClose()} />

      <div className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-4xl border border-neutral-200 dark:border-zinc-800 flex flex-col max-h-[90vh] min-h-[70vh]">
        
        {/* Header Block */}
        <div className="p-6 border-b border-neutral-200 dark:border-zinc-800 flex items-center justify-between sticky top-0 bg-white dark:bg-zinc-900 z-10 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold tracking-tight">{client ? 'Edit Master Client Matrix' : 'Enroll Master Client'}</h2>
            <p className="text-sm text-neutral-500 mt-1">Configure CRM variables to tightly constrain AI reporting outputs.</p>
          </div>
          <button onClick={onClose} disabled={isPending} className="p-2 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded-lg text-neutral-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center px-6 border-b border-neutral-200 dark:border-zinc-800 overflow-x-auto no-scrollbar">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabId)}
                className={`flex items-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${isActive ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400' : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'}`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Block */}
        <div className="p-6 overflow-y-auto flex-1 bg-neutral-50/50 dark:bg-zinc-900/50">
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium border border-red-200 dark:border-red-900/50 flex items-center gap-3 shadow-sm">
              <span className="flex-shrink-0 w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              {error}
            </div>
          )}

          <div className="space-y-6">
            
            {/* BASICS TAB */}
            {activeTab === 'basics' && (
              <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Business Name <span className="text-red-500">*</span></label>
                    <input type="text" value={form.businessName} onChange={e => setForm({...form, businessName: e.target.value})} className="w-full bg-white dark:bg-zinc-800 text-neutral-900 dark:text-white border-neutral-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 border outline-none shadow-sm" placeholder="e.g. Apex Roofing" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Primary Contact Name <span className="text-red-500">*</span></label>
                    <input type="text" value={form.contactName} onChange={e => setForm({...form, contactName: e.target.value})} className="w-full bg-white dark:bg-zinc-800 text-neutral-900 dark:text-white border-neutral-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 border outline-none shadow-sm" placeholder="e.g. Michael" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Email Address</label>
                    <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full bg-white dark:bg-zinc-800 text-neutral-900 dark:text-white border-neutral-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 border outline-none shadow-sm" placeholder="contact@domain.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Industry</label>
                    <input type="text" value={form.industry} onChange={e => setForm({...form, industry: e.target.value})} className="w-full bg-white dark:bg-zinc-800 text-neutral-900 dark:text-white border-neutral-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 border outline-none shadow-sm" placeholder="e.g. Home Services, SaaS" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Business Description</label>
                  <textarea 
                    value={form.businessDescription} 
                    onChange={e => setForm({...form, businessDescription: e.target.value})} 
                    rows={3}
                    placeholder="Short description of what the business actually does..."
                    className="w-full bg-white dark:bg-zinc-800 text-neutral-900 dark:text-white border-neutral-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 border outline-none resize-none shadow-sm" 
                  />
                </div>

                <div className="pt-2">
                  <StringArrayInput 
                    label="Primary Services" 
                    values={form.primaryServices} 
                    onChange={(v) => setForm({...form, primaryServices: v})}
                    placeholder="e.g. Roof Replacement, Leak Repair..."
                  />
                </div>
              </div>
            )}

            {/* GOALS TAB */}
            {activeTab === 'goals' && (
              <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div>
                  <label className="block text-sm font-semibold mb-3">Campaign Objective Architecture</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <label className={`flex flex-col p-4 border rounded-xl cursor-pointer transition-colors ${form.primaryObjective === 'lead_generation' ? 'border-blue-600 bg-blue-50/50 dark:border-blue-500 dark:bg-blue-900/20' : 'border-neutral-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-neutral-50 dark:hover:bg-zinc-800/80'}`}>
                      <div className="flex items-center gap-3 mb-1">
                        <input 
                          type="radio" 
                          name="primaryObjective"
                          value="lead_generation"
                          checked={form.primaryObjective === 'lead_generation'}
                          onChange={(e) => setForm({...form, primaryObjective: e.target.value})}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-neutral-300 pointer-events-none"
                        />
                        <span className="font-bold text-sm text-neutral-900 dark:text-white">Lead Generation</span>
                      </div>
                      <p className="text-xs text-neutral-500 pl-7">AI evaluates success on CPA, Form Fills, & Target Conversions calculation.</p>
                    </label>

                    <label className={`flex flex-col p-4 border rounded-xl cursor-pointer transition-colors ${form.primaryObjective === 'traffic_optimization' ? 'border-purple-600 bg-purple-50/50 dark:border-purple-500 dark:bg-purple-900/20' : 'border-neutral-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-neutral-50 dark:hover:bg-zinc-800/80'}`}>
                      <div className="flex items-center gap-3 mb-1">
                        <input 
                          type="radio" 
                          name="primaryObjective"
                          value="traffic_optimization"
                          checked={form.primaryObjective === 'traffic_optimization'}
                          onChange={(e) => setForm({...form, primaryObjective: e.target.value})}
                          className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-neutral-300 pointer-events-none"
                        />
                        <span className="font-bold text-sm text-neutral-900 dark:text-white">Traffic Optimization</span>
                      </div>
                      <p className="text-xs text-neutral-500 pl-7">AI ignores conversions/Leads and celebrates Clicks, CPC drops, & Volume scale.</p>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Primary Reporting Goal</label>
                  <input type="text" value={form.mainGoal} onChange={e => setForm({...form, mainGoal: e.target.value})} className="w-full bg-white dark:bg-zinc-800 text-neutral-900 dark:text-white border-neutral-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 border outline-none shadow-sm" placeholder="e.g. Maximize Lead Volume, Maintain strict ROI" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-sm font-semibold mb-2 flex items-center gap-1.5 justify-between">Target CPL <span className="text-xs font-normal text-neutral-400">($)</span></label>
                    <input type="number" step="0.01" value={form.targetCostPerLead} onChange={e => setForm({...form, targetCostPerLead: e.target.value})} className="w-full bg-white dark:bg-zinc-800 text-neutral-900 dark:text-white border-neutral-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 border outline-none shadow-sm font-mono" placeholder="45.00" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 flex items-center gap-1.5 justify-between">Avg Job Value <span className="text-xs font-normal text-neutral-400">($)</span></label>
                    <input type="number" step="0.01" value={form.averageJobValue} onChange={e => setForm({...form, averageJobValue: e.target.value})} className="w-full bg-white dark:bg-zinc-800 text-neutral-900 dark:text-white border-neutral-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 border outline-none shadow-sm font-mono" placeholder="2500.00" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 flex items-center gap-1.5 justify-between">Monthly Budget <span className="text-xs font-normal text-neutral-400">($)</span></label>
                    <input type="number" step="0.01" value={form.monthlyAdBudget} onChange={e => setForm({...form, monthlyAdBudget: e.target.value})} className="w-full bg-white dark:bg-zinc-800 text-neutral-900 dark:text-white border-neutral-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 border outline-none shadow-sm font-mono" placeholder="10000.00" />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-sm font-semibold mb-2">What qualifies as a valid "Conversion"?</label>
                  <textarea 
                    value={form.conversionDefinition} 
                    onChange={e => setForm({...form, conversionDefinition: e.target.value})} 
                    rows={3}
                    placeholder="e.g. Only phone calls lasting over 30 seconds or direct form submissions."
                    className="w-full bg-white dark:bg-zinc-800 text-neutral-900 dark:text-white border-neutral-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 border outline-none resize-none shadow-sm" 
                  />
                  <p className="text-xs text-neutral-500 mt-1.5 font-medium">This stops AI from treating spam hits natively as equal conversions.</p>
                </div>
              </div>
            )}

            {/* LOCATION TAB */}
            {activeTab === 'location' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <StringArrayInput 
                  label="General Service Areas" 
                  values={form.serviceAreas} 
                  onChange={(v) => setForm({...form, serviceAreas: v})}
                  placeholder="e.g. Greater Toronto Area, Ontario Region..."
                />
                
                <StringArrayInput 
                  label="Strict Target Cities" 
                  values={form.targetCities} 
                  onChange={(v) => setForm({...form, targetCities: v})}
                  placeholder="e.g. Toronto, Mississauga, Oakville..."
                />

                <div className="p-4 bg-red-50/50 dark:bg-red-950/10 rounded-2xl border border-red-100 dark:border-red-900/30">
                  <StringArrayInput 
                    label="Excluded / Waste Regions" 
                    values={form.excludedCities} 
                    onChange={(v) => setForm({...form, excludedCities: v})}
                    placeholder="e.g. Brampton, Hamilton..."
                  />
                  <p className="text-xs text-red-600 dark:text-red-400 mt-2 font-medium">If the reporting API picks up clicks or spend natively in these exact regions, the AI will heavily flag it as an optimization leak.</p>
                </div>
              </div>
            )}

            {/* AI TAB */}
            {activeTab === 'ai' && (
              <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                
                <div>
                  <label className="block text-sm font-semibold mb-2">Automated Output Tone</label>
                  <select 
                    value={form.reportTone} 
                    onChange={e => setForm({...form, reportTone: e.target.value as any})}
                    className="w-full bg-white dark:bg-zinc-800 text-neutral-900 dark:text-white border-neutral-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 border outline-none shadow-sm cursor-pointer"
                  >
                    <option value="executive">Executive (Professional, data-driven, concise)</option>
                    <option value="reassuring">Reassuring (Positive, stable, relationship-focused)</option>
                    <option value="technical">Technical (Granular, metric-heavy, optimization focus)</option>
                    <option value="friendly">Friendly (Casual, easy to understand, enthusiastic)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-blue-600 dark:text-blue-400">Psychological Notes (Internal Context)</label>
                  <textarea 
                    value={form.aiBehavioralNotes}
                    onChange={e => setForm({...form, aiBehavioralNotes: e.target.value})}
                    placeholder="e.g. Client gets anxious quickly. Make sure to frame any CPC spikes as investing in higher intent traffic."
                    rows={3}
                    className="w-full bg-blue-50/50 dark:bg-blue-900/10 text-neutral-900 dark:text-white border-blue-200 dark:border-blue-800/30 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 border resize-none outline-none shadow-sm placeholder-blue-300 dark:placeholder-blue-800"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-red-600 dark:text-red-400 mb-2">Strict Avoidance Warnings</label>
                  <textarea 
                    value={form.aiAvoidanceWarnings}
                    onChange={e => setForm({...form, aiAvoidanceWarnings: e.target.value})}
                    placeholder="e.g. Never ask for more budget right now. Do not mention Facebook Ads."
                    rows={2}
                    className="w-full bg-red-50 dark:bg-red-950/20 text-red-900 dark:text-red-100 border-red-200 dark:border-red-900/50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500 border resize-none placeholder-red-300 dark:placeholder-red-800/50 outline-none shadow-sm"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-neutral-700 dark:text-neutral-300">Active Client Concerns</label>
                    <textarea 
                      value={form.clientConcerns}
                      onChange={e => setForm({...form, clientConcerns: e.target.value})}
                      rows={3}
                      className="w-full bg-white dark:bg-zinc-800 text-neutral-900 dark:text-white border-neutral-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 border resize-none outline-none shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-emerald-700 dark:text-emerald-400">Next Step Plan Notes</label>
                    <textarea 
                      value={form.nextStepNotes}
                      onChange={e => setForm({...form, nextStepNotes: e.target.value})}
                      placeholder="e.g. We are building a new landing page."
                      rows={3}
                      className="w-full bg-emerald-50/30 dark:bg-emerald-950/10 text-neutral-900 dark:text-white border-emerald-200 dark:border-emerald-800/30 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 border resize-none outline-none shadow-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* CONNECTIONS TAB */}
            {activeTab === 'connections' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-2xl p-5 shadow-sm">
                  <h3 className="font-bold text-sm text-neutral-900 dark:text-white mb-1">Report Automated Deliverables</h3>
                  <p className="text-[12px] text-neutral-500 mb-4">When a mass-dispatch is triggered, the AI PDF will be emailed to all of these specific addresses.</p>
                  <StringArrayInput 
                    label="Executive Delivery Emails" 
                    values={form.reportingEmails} 
                    onChange={(v) => setForm({...form, reportingEmails: v})}
                    placeholder="ceo@company.com, marketing@company.com"
                  />
                </div>

                <div className="bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-4 border-b border-neutral-200 dark:border-zinc-700 bg-neutral-50 dark:bg-zinc-900/50">
                    <h3 className="font-bold text-sm text-neutral-900 dark:text-white">Google Ads Matrix Target</h3>
                    <p className="text-[11px] text-neutral-500 mt-0.5">Select exactly which accounts inherit this CRM brain profile.</p>
                  </div>
                  
                  <div className="max-h-96 overflow-y-auto">
                    {adsAccounts.length === 0 ? (
                      <div className="p-10 text-center flex flex-col items-center">
                        <LinkIcon className="w-8 h-8 text-neutral-300 mb-3" />
                        <div className="text-sm text-neutral-500 dark:text-zinc-400 font-medium">No Google Ads accounts detected in system.</div>
                      </div>
                    ) : (
                      <div className="divide-y divide-neutral-100 dark:divide-zinc-700/50">
                        {adsAccounts.map(a => (
                          <label key={a.customerId} className="flex items-center gap-4 px-5 py-3.5 hover:bg-neutral-50 dark:hover:bg-zinc-700 cursor-pointer transition-colors group">
                            <input 
                              type="checkbox" 
                              checked={form.linkedGoogleAdsIds.includes(a.customerId)}
                              onChange={(e) => {
                                const newIds = e.target.checked 
                                  ? [...form.linkedGoogleAdsIds, a.customerId] 
                                  : form.linkedGoogleAdsIds.filter(id => id !== a.customerId);
                                setForm({...form, linkedGoogleAdsIds: newIds});
                              }}
                              className="w-5 h-5 text-blue-600 rounded bg-neutral-100 dark:bg-zinc-900 border-neutral-300 dark:border-zinc-600 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-800 flex-shrink-0 cursor-pointer"
                            />
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-neutral-900 dark:text-white group-hover:text-blue-600 transition-colors">{a.descriptiveName || 'Unnamed Resource'}</span>
                              <span className="text-xs text-neutral-500 dark:text-zinc-400 font-mono mt-0.5 tracking-wider">{a.customerId}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Footer Fix */}
        <div className="p-5 border-t border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-b-2xl sticky bottom-0 z-10 flex gap-3">
          <button onClick={onClose} disabled={isPending} className="px-6 py-3 bg-neutral-100 dark:bg-zinc-800 hover:bg-neutral-200 dark:hover:bg-zinc-700 text-neutral-700 dark:text-neutral-300 font-semibold rounded-xl transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={isPending} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 shadow-md shadow-blue-500/20">
            {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> {client ? 'Save Configuration' : 'Enroll Target Client'}</>}
          </button>
        </div>
      </div>
    </div>
  );
}
