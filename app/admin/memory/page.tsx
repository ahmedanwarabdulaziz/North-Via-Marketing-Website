import { Brain } from 'lucide-react';
import { getMemory } from '@/lib/assistant-memory';
import { getMasterProfile } from '@/lib/master-profile';
import { listFacts } from '@/lib/memory-files';
import { listChatSummaries } from '@/lib/chat-history';
import { listClientProfiles } from '@/lib/admin-ops';
import { MemoryManager } from '@/components/admin/MemoryManager';

export const dynamic = 'force-dynamic';

export default async function MemoryPage() {
  const [memory, master, profiles, summaries] = await Promise.all([getMemory(), getMasterProfile(), listClientProfiles().catch(() => []), listChatSummaries()]);
  const clients = profiles.filter((c) => c.id && c.brandName).map((c) => ({ id: c.id!, name: c.brandName }));
  const clientFiles = await Promise.all(clients.map(async (c) => ({ ...c, facts: await listFacts(`client:${c.id}`) })));
  const nameOf = new Map(clients.map((c) => [c.id, c.name]));

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight flex items-center gap-3">
          <Brain className="w-8 h-8 text-zinc-400" />
          Memory
        </h1>
        <p className="text-zinc-500 mt-2 max-w-2xl">
          Everything Anwarz remembers, in separate files. For a message about a client it reads only your general rules and that client’s file. When
          two rules disagree, the newer one wins.
        </p>
      </div>
      <MemoryManager
        masterText={master?.text || ''}
        masterUpdatedAt={master?.updatedAt || null}
        shortProfile={memory.profile}
        general={memory.facts}
        clients={clientFiles}
        chats={summaries.slice(0, 60).map((s) => ({ ...s, clientNames: s.clients.map((id) => nameOf.get(id) || 'Client') }))}
      />
    </div>
  );
}
