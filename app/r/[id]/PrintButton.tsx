'use client';

import { Download } from 'lucide-react';

export function PrintButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm sm:px-4 sm:py-2 rounded-full bg-white/15 hover:bg-white/25 text-white font-medium backdrop-blur transition-colors"
    >
      <Download className="w-4 h-4" />
      {label}
    </button>
  );
}
