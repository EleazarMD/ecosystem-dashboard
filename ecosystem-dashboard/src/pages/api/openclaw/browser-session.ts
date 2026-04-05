/**
 * OpenClaw Browser Session API
 *
 * Multi-tenant endpoint that gates access to the noVNC agent browser view.
 *
 * GET  → Returns the noVNC URL if the caller has permission, plus live
 *        agent-browser metadata (current URL, connected status).
 * POST → Logs a "browser-interact" audit event (optional: future use for
 *        requesting input control vs. view-only).
 *
 * Permissions:
 *  - platform-admin  → always allowed
 *  - tenant-admin    → allowed for agents owned by their tenant
 *  - tenant-member   → view-only (can watch, cannot interact)
 *
 * The noVNC URL itself is not secret (Cloudflare tunnel), but this endpoint
 * ensures only authenticated, authorised dashboard users receive it, and
 * every access is audit-logged with tenant context.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

// noVNC origins keyed by the requesting hostname's domain family
const NOVNC_ORIGINS: Record<string, string> = {
  cloudflare: 'https://vnc.hyperspaceanalytics.com',
  tailscale: 'https://rtx-workstation.tailb64e64.ts.net:6080',
  localhost: 'http://localhost:6080',
};

function resolveNoVncOrigin(req: NextApiRequest): string {
  const host = (
    req.headers['x-forwarded-host'] ||
    req.headers.host ||
    'localhost'
  ).toString().split(':')[0];

  if (host.endsWith('hyperspaceanalytics.com')) return NOVNC_ORIGINS.cloudflare;
  if (host.endsWith('.ts.net')) return NOVNC_ORIGINS.tailscale;
  return NOVNC_ORIGINS.localhost;
}

// Lightweight CDP probe to fetch the agent's current browser URL
async function getAgentBrowserUrl(): Promise<string | null> {
  try {
    const resp = await fetch('http://127.0.0.1:6080', {
      method: 'GET',
      signal: AbortSignal.timeout(2000),
    });
    if (!resp.ok) return null;
    // noVNC is reachable — now check the agent's CDP for active page
    const cdpResp = await fetch('http://localhost:9224/json/list', {
      signal: AbortSignal.timeout(2000),
    }).catch(() => null);
    if (!cdpResp || !cdpResp.ok) return null;
    const tabs: any[] = await cdpResp.json();
    const page = tabs.find((t) => t.type === 'page' && t.url !== 'about:blank');
    return page?.url || null;
  } catch {
    return null;
  }
}

interface BrowserSessionResponse {
  allowed: boolean;
  mode: 'interact' | 'view-only';
  vncUrl: string | null;
  vncOrigin: string | null;
  agentUrl: string | null;
  noVncReachable: boolean;
  tenant: { id: string; name: string } | null;
  user: { id: string; name: string; role: string } | null;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BrowserSessionResponse>
) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({
      allowed: false,
      mode: 'view-only',
      vncUrl: null,
      vncOrigin: null,
      agentUrl: null,
      noVncReachable: false,
      tenant: null,
      user: null,
      error: 'Authentication required',
    });
  }

  const user = session.user as any;
  const isPlatformAdmin = user.platformRole === 'platform-admin';

  // ── Tenant context ──────────────────────────────────────────────────────────
  const tenantId =
    (req.headers['x-tenant-id'] as string) ||
    (req.query.tenantId as string) ||
    user.defaultTenantId;

  const tenants: Array<{ tenantId: string; tenantName: string; roleId: string }> =
    user.tenants || [];
  const currentTenant = tenants.find((t) => t.tenantId === tenantId);

  // Permission check
  const isTenantAdmin =
    isPlatformAdmin || currentTenant?.roleId === 'tenant-admin';
  const isMember = isPlatformAdmin || !!currentTenant;

  if (!isMember) {
    return res.status(403).json({
      allowed: false,
      mode: 'view-only',
      vncUrl: null,
      vncOrigin: null,
      agentUrl: null,
      noVncReachable: false,
      tenant: tenantId ? { id: tenantId, name: 'unknown' } : null,
      user: { id: user.id, name: user.name, role: 'none' },
      error: 'Not a member of this tenant',
    });
  }

  const mode = isTenantAdmin ? 'interact' : 'view-only';

  // ── GET: return noVNC access details ────────────────────────────────────────
  if (req.method === 'GET') {
    const vncOrigin = resolveNoVncOrigin(req);
    const vncUrl = `${vncOrigin}/vnc.html?autoconnect=true&resize=scale&reconnect=true&reconnect_delay=3000${
      mode === 'view-only' ? '&view_only=true' : ''
    }`;

    // Probe noVNC + agent browser in parallel
    const [agentUrl, noVncReachable] = await Promise.all([
      getAgentBrowserUrl(),
      fetch(vncOrigin, { method: 'HEAD', signal: AbortSignal.timeout(2000) })
        .then((r) => r.ok || r.status === 200)
        .catch(() => false),
    ]);

    // ── Audit log ─────────────────────────────────────────────────────────────
    try {
      await pool.query(
        `INSERT INTO audit_log (user_id, tenant_id, action, resource_type, resource_id, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          user.id,
          tenantId || null,
          'browser-session.view',
          'openclaw-novnc',
          'agent-browser',
          JSON.stringify({
            mode,
            agentUrl,
            noVncReachable,
            ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
          }),
        ]
      );
    } catch {
      // Audit logging is best-effort — don't fail the request
    }

    return res.status(200).json({
      allowed: true,
      mode,
      vncUrl,
      vncOrigin,
      agentUrl,
      noVncReachable,
      tenant: currentTenant
        ? { id: currentTenant.tenantId, name: (currentTenant as any).tenantName || '' }
        : null,
      user: { id: user.id, name: user.name, role: isPlatformAdmin ? 'platform-admin' : currentTenant?.roleId || 'member' },
    });
  }

  // ── POST: log interaction event ─────────────────────────────────────────────
  if (req.method === 'POST') {
    if (!isTenantAdmin) {
      return res.status(403).json({
        allowed: false,
        mode: 'view-only',
        vncUrl: null,
        vncOrigin: null,
        agentUrl: null,
        noVncReachable: false,
        tenant: currentTenant
          ? { id: currentTenant.tenantId, name: (currentTenant as any).tenantName || '' }
          : null,
        user: { id: user.id, name: user.name, role: currentTenant?.roleId || 'member' },
        error: 'Tenant admin required for interaction mode',
      });
    }

    const { action: interactAction } = req.body || {};

    try {
      await pool.query(
        `INSERT INTO audit_log (user_id, tenant_id, action, resource_type, resource_id, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          user.id,
          tenantId || null,
          `browser-session.interact.${interactAction || 'generic'}`,
          'openclaw-novnc',
          'agent-browser',
          JSON.stringify({
            interactAction,
            ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
          }),
        ]
      );
    } catch {
      // best-effort
    }

    const vncOrigin = resolveNoVncOrigin(req);
    return res.status(200).json({
      allowed: true,
      mode: 'interact',
      vncUrl: `${vncOrigin}/vnc.html?autoconnect=true&resize=scale&reconnect=true&reconnect_delay=3000`,
      vncOrigin,
      agentUrl: null,
      noVncReachable: true,
      tenant: currentTenant
        ? { id: currentTenant.tenantId, name: (currentTenant as any).tenantName || '' }
        : null,
      user: { id: user.id, name: user.name, role: isPlatformAdmin ? 'platform-admin' : 'tenant-admin' },
    });
  }

  return res.status(405).json({
    allowed: false,
    mode: 'view-only',
    vncUrl: null,
    vncOrigin: null,
    agentUrl: null,
    noVncReachable: false,
    tenant: null,
    user: null,
    error: 'Method not allowed',
  });
}
