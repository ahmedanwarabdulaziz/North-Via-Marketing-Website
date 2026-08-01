import { getClientProfileById } from '@/lib/admin-ops';
import { notFound } from 'next/navigation';
import { ClientForm } from '@/components/admin/ClientForm';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await getClientProfileById(id);
  
  if (!client) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <Link 
          href={`/admin/clients/${id}`} 
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Profile
        </Link>
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Edit Client Profile</h1>
        <p className="text-zinc-500 mt-2">Update the information and settings for {client.brandName}.</p>
      </div>

      <ClientForm initialData={client} />
    </div>
  );
}
