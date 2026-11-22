import { Share2 } from 'lucide-react';
import { loadSocialConnections } from '@/lib/social-connections';
import { SocialConnectionsManager } from '@/components/admin/SocialConnectionsManager';

// Admin → Facebook & Instagram: your Facebook login (and any client's own login), every Page and
// Instagram account they can manage, and which client each one belongs to.

export const dynamic = 'force-dynamic';

export default async function SocialConnectionsPage({ searchParams }: { searchParams: Promise<{ meta?: string; reason?: string }> }) {
  const { meta, reason } = await searchParams;
  const data = await loadSocialConnections();

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight flex items-center gap-3">
          <Share2 className="w-8 h-8 text-zinc-400" />
          Social media
        </h1>
        <p className="text-zinc-500 mt-2">Facebook &amp; Instagram: connect Facebook once, then choose which client each Page and Instagram account belongs to.</p>
      </div>

      <SocialConnectionsManager {...data} notice={meta === 'connected' || meta === 'error' ? meta : undefined} reason={reason} />
    </div>
  );
}
