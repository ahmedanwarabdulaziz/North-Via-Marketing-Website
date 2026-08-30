'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveClientFromForm } from '@/app/actions/clients';
import { Save, X, Building2, User, Mail, Phone, Facebook, Instagram, Music, Globe, BarChart3, KeyRound } from 'lucide-react';
import type { ClientProfile } from '@/types/database';

type ClientFormData = Partial<ClientProfile> & {
  clarityApiTokenSet?: boolean;
};

export function ClientForm({ initialData }: { initialData?: ClientFormData }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const result = await saveClientFromForm(formData);
    
    if (!result.success) {
      setError(result.error || 'Failed to save client');
      setIsPending(false);
    } else {
      router.push('/admin/clients');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      
      {initialData?.id && <input type="hidden" name="id" value={initialData.id} />}
      
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden transition-all duration-300 hover:shadow-md">
        <div className="p-6 border-b border-zinc-100 bg-zinc-50/50">
          <h2 className="text-lg font-semibold text-zinc-900">Core Information</h2>
          <p className="text-sm text-zinc-500 mt-1">Basic details about the client and their brand.</p>
        </div>
        
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-zinc-400" />
              Brand Name *
            </label>
            <input 
              required
              name="brandName"
              defaultValue={initialData?.brandName}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
              placeholder="e.g. North Via Marketing"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 flex items-center gap-2">
              <User className="w-4 h-4 text-zinc-400" />
              Owner Name *
            </label>
            <input 
              required
              name="ownerName"
              defaultValue={initialData?.ownerName}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
              placeholder="e.g. John Doe"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 flex items-center gap-2">
              <Mail className="w-4 h-4 text-zinc-400" />
              Email Address *
            </label>
            <input 
              required
              type="email"
              name="email"
              defaultValue={initialData?.email}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
              placeholder="hello@brand.com"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 flex items-center gap-2">
              <Phone className="w-4 h-4 text-zinc-400" />
              Mobile Number
            </label>
            <input 
              name="mobileNumber"
              defaultValue={initialData?.mobileNumber}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
              placeholder="+1 (555) 123-4567"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden transition-all duration-300 hover:shadow-md">
        <div className="p-6 border-b border-zinc-100 bg-zinc-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">Website Analytics Integrations</h2>
              <p className="text-sm text-zinc-500 mt-1">Connect website data for future campaign and customer-journey reports.</p>
            </div>
            {initialData?.clarityApiTokenSet && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-full">
                <KeyRound className="w-3.5 h-3.5" />
                Clarity token saved
              </span>
            )}
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 flex items-center gap-2">
              <Globe className="w-4 h-4 text-zinc-400" />
              Professional Website URL
            </label>
            <input
              type="url"
              name="websiteUrl"
              defaultValue={initialData?.websiteUrl}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
              placeholder="https://www.example.com"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-zinc-400" />
                GA4 Property ID
              </label>
              <input
                name="ga4PropertyId"
                defaultValue={initialData?.ga4PropertyId}
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                placeholder="e.g. 123456789"
              />
              <p className="text-xs text-zinc-400">The Google account connection must have read access to this property.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-zinc-400" />
                Clarity Project ID
              </label>
              <input
                name="clarityProjectId"
                defaultValue={initialData?.clarityProjectId}
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                placeholder="e.g. abc123..."
              />
              <p className="text-xs text-zinc-400">Found in the Clarity project setup or tracking code.</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-zinc-400" />
              Clarity Data Export API Token
            </label>
            <input
              type="password"
              name="clarityApiToken"
              autoComplete="new-password"
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
              placeholder={initialData?.clarityApiTokenSet ? 'Leave blank to keep the saved token' : 'Paste the project API token'}
            />
            <p className="text-xs text-zinc-400">Stored encrypted. Generate this token from Clarity Project Settings &gt; Data Export.</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden transition-all duration-300 hover:shadow-md">
        <div className="p-6 border-b border-zinc-100 bg-zinc-50/50">
          <h2 className="text-lg font-semibold text-zinc-900">Social Profiles</h2>
          <p className="text-sm text-zinc-500 mt-1">Links to the client's public presence.</p>
        </div>
        
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 flex items-center gap-2">
              <Facebook className="w-4 h-4 text-zinc-400" />
              Facebook Link
            </label>
            <input 
              name="facebookLink"
              defaultValue={initialData?.facebookLink}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
              placeholder="https://facebook.com/..."
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 flex items-center gap-2">
              <Instagram className="w-4 h-4 text-zinc-400" />
              Instagram Link
            </label>
            <input 
              name="instagramLink"
              defaultValue={initialData?.instagramLink}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
              placeholder="https://instagram.com/..."
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 flex items-center gap-2">
              <Music className="w-4 h-4 text-zinc-400" />
              TikTok Link
            </label>
            <input 
              name="tiktokLink"
              defaultValue={initialData?.tiktokLink}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
              placeholder="https://tiktok.com/@..."
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 flex items-center gap-2">
              <Globe className="w-4 h-4 text-zinc-400" />
              Google Business Link
            </label>
            <input 
              name="googleLink"
              defaultValue={initialData?.googleLink}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
              placeholder="https://g.page/..."
            />
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-end gap-4 pt-4 border-t border-zinc-200">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2.5 text-sm font-medium text-zinc-600 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors flex items-center gap-2"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/20 flex items-center gap-2 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isPending ? 'Saving...' : 'Save Client'}
        </button>
      </div>
    </form>
  );
}
