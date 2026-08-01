import { ClientForm } from '@/components/admin/ClientForm';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewClientPage() {
  return (
    <div className="max-w-4xl mx-auto p-6 md:p-8">
      <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
        <Link 
          href="/admin/clients" 
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Clients
        </Link>
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Add New Client</h1>
        <p className="text-zinc-500 mt-2">Create a new client profile to track their information and campaigns.</p>
      </div>
      
      <ClientForm />
    </div>
  );
}
