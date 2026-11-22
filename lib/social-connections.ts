import { listClientProfiles } from './admin-ops';
import { listDocs } from './data/store';
import { getMetaConnections, metaConfigured, META_SCOPES, SOCIAL_ACCOUNTS } from './meta';
import type { SocialAccount } from '@/types/database';

// Facebook & Instagram connections at a glance, for Admin → Facebook & Instagram and the Anwarz
// app's Social screen: the Facebook logins, every Page / Instagram account they can manage, and
// which client each one belongs to.

export interface SocialConnectionRow {
  id: string;
  via: 'admin' | 'client_link';
  userName: string;
  clientName: string | null;
  status: 'connected' | 'error';
  lastError: string | null;
  connectedAt: string;
  updatedAt: string;
  missingScopes: string[];
  pages: number;
}

export interface SocialPageRow {
  id: string;
  pageName: string;
  igUsername: string | null;
  clientId: string | null;
  source: string;
  lastError: string | null;
  lastSyncedAt: string | null;
}

export interface SocialConnectionsData {
  configured: boolean;
  connections: SocialConnectionRow[];
  pages: SocialPageRow[];
  clients: Array<{ id: string; name: string }>;
}

export async function loadSocialConnections(): Promise<SocialConnectionsData> {
  const [connections, accounts, clients] = await Promise.all([
    getMetaConnections().catch(() => []),
    listDocs<SocialAccount>(SOCIAL_ACCOUNTS).catch(() => []),
    listClientProfiles(),
  ]);

  const clientNames = new Map(clients.filter((c) => c.id).map((c) => [c.id!, c.brandName]));
  // Permissions the login dialog asks for; anything missing means some features won't work.
  const wanted = META_SCOPES.filter((s) => s !== 'ads_management');

  const connectionRows: SocialConnectionRow[] = connections
    .map((c) => ({
      id: c.id!,
      via: c.connectedVia,
      userName: c.metaUserName,
      clientName: c.clientId ? clientNames.get(c.clientId) ?? 'Deleted client' : null,
      status: c.status,
      lastError: c.lastError ?? null,
      connectedAt: c.connectedAt,
      updatedAt: c.updatedAt,
      missingScopes: wanted.filter((s) => !c.scopes?.includes(s)),
      pages: accounts.filter((a) => a.connectionId === c.id).length,
    }))
    .sort((a, b) => (a.via === b.via ? a.userName.localeCompare(b.userName) : a.via === 'admin' ? -1 : 1));

  const connectionNames = new Map(connectionRows.map((c) => [c.id, c.via === 'admin' ? `Your login (${c.userName})` : `${c.clientName}’s own login`]));

  const pages: SocialPageRow[] = accounts
    .map((a) => ({
      id: a.id!,
      pageName: a.pageName,
      igUsername: a.igUsername ?? null,
      clientId: a.linked && a.clientId ? a.clientId : null,
      source: connectionNames.get(a.connectionId) ?? 'Old login',
      lastError: a.lastError ?? null,
      lastSyncedAt: a.lastSyncedAt ?? null,
    }))
    .sort((a, b) => a.pageName.localeCompare(b.pageName));

  return {
    configured: metaConfigured(),
    connections: connectionRows,
    pages,
    clients: clients.filter((c) => c.id).map((c) => ({ id: c.id!, name: c.brandName })),
  };
}
