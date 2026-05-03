'use client';

import { useEffect } from 'react';

export function PrintTrigger() {
  useEffect(() => {
    // Wait for Next.js hydration and fonts to fully load before locking the thread with the print dialog
    const timer = setTimeout(() => {
      window.print();
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return null;
}
