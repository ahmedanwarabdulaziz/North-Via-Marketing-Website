import { Download } from 'lucide-react';
import { InstagramDownloader } from '@/components/admin/InstagramDownloader';

export default function AdminInstagramPage() {
  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight flex items-center gap-3">
          <Download className="w-8 h-8 text-blue-500" />
          Instagram Downloader
        </h1>
        <p className="text-zinc-500 mt-2">Enter a public account, choose the videos and images you want, and download them.</p>
      </div>
      <InstagramDownloader />
    </div>
  );
}
