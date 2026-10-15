import type { Metadata } from 'next';
import { CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Google Business Profile Connection | North Via Marketing',
  robots: { index: false, follow: false },
};

const MESSAGES = {
  success: {
    icon: CheckCircle2,
    color: 'text-emerald-500',
    title: 'Your Google Business Profile is connected',
    body: 'Thank you. North Via Marketing can now see your reviews and prepare replies. Nothing is posted publicly without approval. You can close this page.',
  },
  error: {
    icon: AlertTriangle,
    color: 'text-amber-500',
    title: 'The connection did not complete',
    body: 'Google did not grant access. Please try the link again and accept the Business Profile permission, or contact us and we will help.',
  },
  expired: {
    icon: Clock,
    color: 'text-zinc-400',
    title: 'This link has expired',
    body: 'For security, connection links only work for a limited time. Please ask North Via Marketing for a new link.',
  },
} as const;

export default async function GoogleConnectResultPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const message = MESSAGES[(status as keyof typeof MESSAGES) || 'error'] || MESSAGES.error;
  const Icon = message.icon;

  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4 py-16 bg-zinc-50">
      <div className="max-w-md w-full bg-white rounded-2xl border border-zinc-200 shadow-sm p-8 text-center">
        <Icon className={`w-12 h-12 mx-auto mb-4 ${message.color}`} />
        <h1 className="text-xl font-semibold text-zinc-900">{message.title}</h1>
        <p className="text-sm text-zinc-600 mt-3 leading-relaxed">{message.body}</p>
      </div>
    </main>
  );
}
