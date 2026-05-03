import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Dashboard | North Via Marketing',
  description: 'Admin dashboard for North Via Marketing',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans">
      {/* 
        We use a simple wrapper here. 
        The login page and dashboard will define their own specific containers.
      */}
      {children}
    </div>
  );
}
