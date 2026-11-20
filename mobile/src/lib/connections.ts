// Shapes of /api/app/connections (More → Connections, Home banner).

export interface ConnectionRow {
  id: string;
  group: 'Email' | 'Google' | 'Facebook & Instagram';
  name: string;
  detail: string;
  ok: boolean;
  problem: string | null;
  kind: 'gmail' | 'outlook' | 'imap' | 'google_ads' | 'gbp' | 'meta';
  clientId: string | null;
}

export interface ConnectionsData {
  connections: ConnectionRow[];
  automation: { lastRunAt: string | null };
}

/** Minutes since the 5-minute job last ran (null when unknown). */
export function automationQuietFor(data: ConnectionsData | null) {
  const at = data?.automation.lastRunAt;
  return at ? Math.round((Date.now() - Date.parse(at)) / 60_000) : null;
}
