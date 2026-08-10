/**
 * PCG Client — Dashboard-side proxy to the Personal Context Graph.
 *
 * All dashboard ide-memory endpoints should use this client instead of
 * the dead MCP/AHIS services. It wraps PCG's /api/pic/* and /api/pcg/*
 * endpoints with PIC auth headers + X-User-Id for per-user routing.
 *
 * Architecture: docs/PLATFORM_DATA_ARCHITECTURE.md
 * ADR: docs/api/adr/0007-pcg-canonical-endpoint-map.md
 */

const PCG_URL = process.env.PCG_URL || 'http://localhost:8765';
const PIC_READ_KEY = process.env.PIC_READ_KEY || 'pic-read-O-1b4i12nR9gr3kzookTYGZ7NTA_nhSF';
const PIC_ADMIN_KEY = process.env.PIC_ADMIN_KEY || 'pic-admin-nee9oPtIqFwRUaj5vm96A8LEwMkYtUFU';

// Known users (from _USER_BOLT_URIS on the server)
export const KNOWN_USERS = [
  { id: 'dfd9379f-a9cd-4241-99e7-140f5e89e3cd', name: 'Eleazar', neo4j: 'hermes-neo4j :7689' },
  { id: '096f1fe3-16b3-4642-a1d9-2a11bf3843dd', name: 'Claudia', neo4j: 'claudia-neo4j :7720' },
  { id: 'bcb80071-81a4-4e4e-aff2-fe96d6702b08', name: 'Luca', neo4j: 'kids-neo4j :7690' },
  { id: '40c2f03c-60b7-4344-b215-dbbcf565f9a5', name: 'Sofia', neo4j: 'kids-neo4j :7690' },
];

const DEFAULT_USER_ID = KNOWN_USERS[0].id;

interface PCGOptions {
  userId?: string;
  method?: string;
  body?: unknown;
  timeout?: number;
}

async function pcgRequest(path: string, options: PCGOptions = {}): Promise<any> {
  const userId = options.userId || DEFAULT_USER_ID;
  const isWrite = (options.method || 'GET') !== 'GET';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-PIC-Read-Key': PIC_READ_KEY,
    'X-User-Id': userId,
  };
  if (isWrite) {
    headers['X-PIC-Admin-Key'] = PIC_ADMIN_KEY;
  }

  const url = `${PCG_URL}${path}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || 10000);

  try {
    const resp = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`PCG ${resp.status}: ${text.slice(0, 200)}`);
    }

    if (resp.status === 204) return null;
    return await resp.json();
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

// ─── Identity / Preferences / Goals (per-user, /api/pic/*) ───────────────

export async function getIdentity(userId?: string) {
  return pcgRequest('/api/pic/identity', { userId });
}

export async function getPreferences(userId?: string, tier?: string) {
  const params = tier ? `?tier=${encodeURIComponent(tier)}` : '';
  return pcgRequest(`/api/pic/preferences${params}`, { userId });
}

export async function getGoals(userId?: string) {
  const result = await pcgRequest('/api/pic/goals', { userId });
  return result?.goals ?? [];
}

export async function getContextSummary(userId?: string) {
  return pcgRequest('/api/pic/context', { userId });
}

export async function getObservations(userId?: string, status?: string, category?: string, limit?: number) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (category) params.set('category', category);
  params.set('limit', String(limit || 100));
  const result = await pcgRequest(`/api/pic/observations?${params}`, { userId });
  return result?.observations ?? [];
}

export async function recordObservation(observation: string, category?: string, source?: string, userId?: string) {
  return pcgRequest('/api/pic/learn', {
    userId,
    method: 'POST',
    body: { observation, category, source },
  });
}

// ─── Agent Memory Surface (/api/pcg/*) ──────────────────────────────────

export async function getExomindCapsule(surface: string, contact?: string, userId?: string) {
  const params = new URLSearchParams({ surface });
  if (contact) params.set('contact', contact);
  return pcgRequest(`/api/pcg/exomind/capsule?${params}`, { userId });
}

export async function getRecentInsights(limit?: number, userId?: string) {
  const result = await pcgRequest(`/api/pcg/insights/recent?limit=${limit || 20}`, { userId });
  return result?.insights ?? [];
}

export async function syncInterventions(records: unknown[], userId?: string) {
  return pcgRequest('/api/pcg/interventions/sync', {
    userId,
    method: 'POST',
    body: { interventions: records },
  });
}

export async function getInterventions(userId?: string, limit?: number) {
  const result = await pcgRequest(`/api/pcg/interventions?limit=${limit || 50}`, { userId });
  return result?.interventions ?? [];
}

export async function triggerConsolidation(lookbackHours?: number, userId?: string) {
  return pcgRequest(`/api/pcg/consolidate?lookback_hours=${lookbackHours || 24}`, {
    userId,
    method: 'POST',
    timeout: 60000,
  });
}

// ─── Graph Stats (shared, /api/kg/*) ────────────────────────────────────

export async function getGraphStats() {
  // No auth needed for /api/kg/stats
  const resp = await fetch(`${PCG_URL}/api/kg/stats`, { signal: AbortSignal.timeout(5000) });
  if (!resp.ok) return null;
  return await resp.json();
}

export async function getHealth() {
  try {
    const resp = await fetch(`${PCG_URL}/health`, { signal: AbortSignal.timeout(5000) });
    return { status: resp.ok ? 'healthy' : 'unhealthy', online: resp.ok };
  } catch {
    return { status: 'unreachable', online: false };
  }
}
