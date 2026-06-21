/**
 * CIG (Communications Intelligence Graph) v2 client.
 *
 * Replaces the JWT-bearer hermes-client for any read-only call against
 * port 8780. CIG enforces X-API-Key auth; the dashboard impersonates the
 * `nova-agent` service identity for read endpoints (Tier 0/1).
 *
 * Do NOT use this for writes — use a per-route check.
 */

const CIG_URL =
  process.env.CIG_URL ||
  process.env.NEXT_PUBLIC_CIG_URL ||
  'http://localhost:8780';

const CIG_API_KEY =
  process.env.CIG_API_KEY ||
  process.env.NOVA_AGENT_KEY ||
  'nova-agent-key-2024';

export function cigAuthHeaders(): Record<string, string> {
  return {
    'X-API-Key': CIG_API_KEY,
    'Content-Type': 'application/json',
  };
}

export async function cigFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const url = `${CIG_URL}${path.startsWith('/') ? path : '/' + path}`;
  const headers: Record<string, string> = {
    ...cigAuthHeaders(),
    ...((init?.headers as Record<string, string>) || {}),
  };
  return fetch(url, { ...init, headers });
}

export { CIG_URL };
