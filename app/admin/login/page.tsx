'use client';

import { useState, useTransition } from 'react';
import { Lock, ShieldCheck, ArrowRight, AlertCircle } from 'lucide-react';
import { loginAdmin } from '@/app/actions/auth';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.append('password', password);
      
      const result = await loginAdmin(formData);
      
      if (result.success) {
        // Redirect to admin dashboard
        router.push('/admin');
        router.refresh();
      } else {
        setError(result.error || 'Authentication failed. Please try again.');
        setPassword('');
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-zinc-800 rounded-full mix-blend-multiply filter blur-[128px] opacity-50 animate-blob" />
      <div className="absolute bottom-[-20%] right-[-10%] w-96 h-96 bg-neutral-800 rounded-full mix-blend-multiply filter blur-[128px] opacity-50 animate-blob animation-delay-2000" />
      
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-8 relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-zinc-800/50 p-4 rounded-full border border-zinc-700/50 mb-4 inline-flex shadow-inner">
            <ShieldCheck className="w-8 h-8 text-neutral-300" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-light text-white mb-2 tracking-wide">
            Secure Access
          </h1>
          <p className="text-sm text-zinc-400 text-center">
            Enter the master password to access the administrative controls.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-950/50 border border-red-900/50 flex items-start gap-3 text-red-400">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-zinc-500" />
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter master password"
              className="w-full pl-11 pr-4 py-3 bg-zinc-950/50 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:border-transparent transition-all duration-200"
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={isPending || !password}
            className={`w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-all duration-200 ${
              isPending || !password
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                : 'bg-white text-black hover:bg-neutral-200 shadow-lg shadow-white/10'
            }`}
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-zinc-500 border-t-white rounded-full animate-spin"></span>
                Authenticating...
              </span>
            ) : (
              <>
                Access Dashboard
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-zinc-800/80 text-center">
          <p className="text-xs text-zinc-500 flex items-center justify-center gap-1.5">
            <Lock className="w-3.5 h-3.5" />
            Secure Encrypted Session Token
          </p>
        </div>
      </div>
    </div>
  );
}
