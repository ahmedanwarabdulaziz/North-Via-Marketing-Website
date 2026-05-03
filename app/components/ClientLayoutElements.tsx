'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';

export function ConditionalHeader() {
  const pathname = usePathname();
  // Hide header on any admin route
  if (pathname?.startsWith('/admin')) {
    return null;
  }
  return <Header />;
}

export function ConditionalFooter() {
  const pathname = usePathname();
  // Hide footer on any admin route
  if (pathname?.startsWith('/admin')) {
    return null;
  }
  return <Footer />;
}
