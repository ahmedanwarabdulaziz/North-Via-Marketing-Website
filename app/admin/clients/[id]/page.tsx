import { getClientProfileById } from '@/lib/admin-ops';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Edit3, ArrowLeft, Building2, User, Mail, Globe } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await getClientProfileById(id);
  
  if (!client) {
    notFound();
  }


  return (
    <div className="max-w-4xl mx-auto p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <Link 
          href="/admin/clients" 
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Clients
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">{client.brandName}</h1>
            <div className="flex items-center gap-4 mt-3 text-sm text-zinc-600">
              <span className="flex items-center gap-1.5"><User className="w-4 h-4" /> {client.ownerName}</span>
              <span className="flex items-center gap-1.5"><Mail className="w-4 h-4" /> {client.email}</span>
            </div>
          </div>
          <Link 
            href={`/admin/clients/${id}/edit`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
          >
            <Edit3 className="w-4 h-4" />
            Edit Profile
          </Link>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200">
          <h3 className="font-semibold text-zinc-900 flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-zinc-400" />
            Client Details
          </h3>
          <div className="space-y-4">
            <div>
              <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Mobile</div>
              <div className="text-sm text-zinc-900">{client.mobileNumber || 'Not provided'}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Socials</div>
              <div className="flex flex-col gap-2 mt-2">
                {client.facebookLink ? (
                  <a href={client.facebookLink} className="text-sm text-blue-600 hover:underline block truncate">Facebook Profile</a>
                ) : null}
                {client.instagramLink ? (
                  <a href={client.instagramLink} className="text-sm text-blue-600 hover:underline block truncate">Instagram Profile</a>
                ) : null}
                {client.tiktokLink ? (
                  <a href={client.tiktokLink} className="text-sm text-blue-600 hover:underline block truncate">TikTok Profile</a>
                ) : null}
                {!client.facebookLink && !client.instagramLink && !client.tiktokLink && (
                  <span className="text-sm text-zinc-500">No socials provided</span>
                )}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Added On</div>
              <div className="text-sm text-zinc-900">{client.createdAt ? new Date(client.createdAt).toLocaleDateString() : 'Unknown'}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Website</div>
              {client.googleLink ? (
                <a href={client.googleLink} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                  {client.googleLink}
                </a>
              ) : (
                <div className="text-sm text-zinc-500">Not provided</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
