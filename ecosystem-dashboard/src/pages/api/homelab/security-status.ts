import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';

/**
 * Homelab Security Status API
 * 
 * Aggregates health status from homelab-monitor service and provides
 * unified security posture view for dashboard and Nova operational mode.
 * 
 * GET /api/homelab/security-status
 * 
 * Returns:
 * {
 *   "timestamp": "2026-03-29T14:00:00Z",
 *   "overall_status": "healthy" | "degraded" | "critical",
 *   "services": [...],
 *   "security_posture": {
 *     "anomalies_detected": 0,
 *     "pending_approvals": 2,
 *     "last_audit_event": "2026-03-29T14:00:00Z",
 *     "policy_violations": []
 *   },
 *   "operational_mode": {
 *     "active": false,
 *     "reason": null,
 *     "expires_at": null
 *   },
 *   "tiered_actions_available": {
 *     "auto": ["restart_hermes_container"],
 *     "requires_approval": ["restart_ai_gateway_service"]
 *   }
 * }
 */

interface ServiceHealth {
  service: string;
  healthy: boolean;
  status_code?: number;
  response_time_ms?: number;
  error?: string;
  critical: boolean;
  tier: number;
  timestamp: string;
}

interface HealthStatus {
  timestamp: string;
  healthy_count: number;
  unhealthy_count: number;
  critical_failures: number;
  total_services: number;
  services: ServiceHealth[];
  overall_status: 'healthy' | 'degraded' | 'critical';
}

interface SecurityStatus {
  timestamp: string;
  overall_status: 'healthy' | 'degraded' | 'critical';
  services: ServiceHealth[];
  security_posture: {
    anomalies_detected: number;
    pending_approvals: number;
    last_audit_event: string | null;
    policy_violations: string[];
  };
  operational_mode: {
    active: boolean;
    reason: string | null;
    expires_at: string | null;
  };
  tiered_actions_available: {
    auto: string[];
    requires_approval: string[];
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SecurityStatus | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Read health status from homelab-monitor
    const statusFile = '/tmp/homelab-monitor-status.json';
    let healthStatus: HealthStatus | null = null;

    try {
      const statusData = fs.readFileSync(statusFile, 'utf-8');
      healthStatus = JSON.parse(statusData);
    } catch (err) {
      // Monitor hasn't run yet or file doesn't exist
      healthStatus = null;
    }

    // Get pending approvals count from database
    const { Pool } = await import('pg');
    const pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'ecosystem_unified',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
    });

    let pendingApprovals = 0;
    let lastAuditEvent: string | null = null;

    try {
      // Count pending approvals
      const approvalResult = await pool.query(
        "SELECT COUNT(*) FROM approval_requests WHERE status = 'pending'"
      );
      pendingApprovals = parseInt(approvalResult.rows[0].count);

      // Get last audit event (if audit table exists)
      try {
        const auditResult = await pool.query(
          "SELECT timestamp FROM security_audit ORDER BY timestamp DESC LIMIT 1"
        );
        if (auditResult.rows.length > 0) {
          lastAuditEvent = auditResult.rows[0].timestamp;
        }
      } catch {
        // Audit table doesn't exist yet
      }
    } finally {
      await pool.end();
    }

    // Determine tiered actions
    const autoActions: string[] = [];
    const requiresApproval: string[] = [];

    if (healthStatus) {
      for (const service of healthStatus.services) {
        if (!service.healthy) {
          const action = `restart_${service.service.replace(/-/g, '_')}`;
          if (service.tier <= 1) {
            autoActions.push(action);
          } else {
            requiresApproval.push(action);
          }
        }
      }
    }

    // Build response
    const response: SecurityStatus = {
      timestamp: new Date().toISOString(),
      overall_status: healthStatus?.overall_status || 'unknown' as any,
      services: healthStatus?.services || [],
      security_posture: {
        anomalies_detected: 0, // TODO: Implement anomaly detection
        pending_approvals: pendingApprovals,
        last_audit_event: lastAuditEvent,
        policy_violations: [], // TODO: Implement policy violation detection
      },
      operational_mode: {
        active: false, // TODO: Check Nova operational mode status
        reason: null,
        expires_at: null,
      },
      tiered_actions_available: {
        auto: autoActions,
        requires_approval: requiresApproval,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching security status:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}
