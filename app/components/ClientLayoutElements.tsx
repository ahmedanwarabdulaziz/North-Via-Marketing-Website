'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';
import Chatbot from '@/components/Chatbot';

// Admin pages and shared client reports (/r/…) show no site chrome.
const bare = (pathname: string | null) => Boolean(pathname?.startsWith('/admin') || pathname?.startsWith('/r/'));

export function ConditionalHeader() {
  const pathname = usePathname();
  if (bare(pathname)) return null;
  return <Header />;
}

export function ConditionalFooter() {
  const pathname = usePathname();
  if (bare(pathname)) return null;
  return <Footer />;
}

export function ConditionalChatbot() {
  const pathname = usePathname();
  if (pathname?.startsWith('/r/')) return null;
  return <Chatbot />;
}
