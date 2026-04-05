/**
 * API endpoint for security health check
 * 
 * GET /api/security/health - Get security system health status
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  database: process.env.DATABASE_NAME || 'ecosystem_unified',
  user: process.env.DATABASE_USER || 'eleazar',
  password: process.env.DATABASE_PASSWORD || '',
});

interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  latencyMs?: number;
}

interface SecurityHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: HealthCheck[];
  summary: {
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const checks: HealthCheck[] = [];

  // Check database connectivity
  checks.push(await checkDatabase());

  // Check token revocation table
  checks.push(await checkTokenRevocation());

  // Check approval system
  checks.push(await checkApprovalSystem());

  // Check audit logging
  checks.push(await checkAuditLogging());

  // Check rate limiting
  checks.push(await checkRateLimiting());

  // Calculate summary
  const summary = {
    healthy: checks.filter(c => c.status === 'healthy').length,
    degraded: checks.filter(c => c.status === 'degraded').length,
    unhealthy: checks.filter(c => c.status === 'unhealthy').length,
  };

  // Determine overall status
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  if (summary.unhealthy > 0) {
    status = 'unhealthy';
  } else if (summary.degraded > 0) {
    status = 'degraded';
  }

  const health: SecurityHealth = {
    status,
    timestamp: new Date().toISOString(),
    checks,
    summary,
  };

  const statusCode = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503;
  return res.status(statusCode).json(health);
}

async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    await pool.query('SELECT 1');
    return {
      name: 'database',
      status: 'healthy',
      message: 'Database connection successful',
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      name: 'database',
      status: 'unhealthy',
      message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      latencyMs: Date.now() - start,
    };
  }
}

async function checkTokenRevocation(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM revoked_tokens WHERE expires_at > NOW()`
    );
    const count = parseInt(result.rows[0].count, 10);
    
    return {
      name: 'token_revocation',
      status: 'healthy',
      message: `Token revocation active (${count} active revocations)`,
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      name: 'token_revocation',
      status: 'unhealthy',
      message: `Token revocation check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      latencyMs: Date.now() - start,
    };
  }
}

async function checkApprovalSystem(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    // Check for stuck pending approvals (older than 1 hour)
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM approval_requests 
       WHERE status = 'pending' 
       AND created_at < NOW() - INTERVAL '1 hour'
       AND expires_at > NOW()`
    );
    const stuckCount = parseInt(result.rows[0].count, 10);
    
    if (stuckCount > 10) {
      return {
        name: 'approval_system',
        status: 'degraded',
        message: `${stuckCount} pending approvals older than 1 hour`,
        latencyMs: Date.now() - start,
      };
    }
    
    return {
      name: 'approval_system',
      status: 'healthy',
      message: 'Approval system operational',
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      name: 'approval_system',
      status: 'unhealthy',
      message: `Approval system check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      latencyMs: Date.now() - start,
    };
  }
}

async function checkAuditLogging(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    // Check if we've logged events in the last 5 minutes
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM security_audit_log 
       WHERE timestamp > NOW() - INTERVAL '5 minutes'`
    );
    const recentCount = parseInt(result.rows[0].count, 10);
    
    // Also check total count to ensure table exists and has data
    const totalResult = await pool.query(
      `SELECT COUNT(*) as count FROM security_audit_log`
    );
    const totalCount = parseInt(totalResult.rows[0].count, 10);
    
    if (totalCount === 0) {
      return {
        name: 'audit_logging',
        status: 'degraded',
        message: 'Audit log is empty - no events recorded yet',
        latencyMs: Date.now() - start,
      };
    }
    
    return {
      name: 'audit_logging',
      status: 'healthy',
      message: `Audit logging active (${recentCount} events in last 5 min, ${totalCount} total)`,
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      name: 'audit_logging',
      status: 'unhealthy',
      message: `Audit logging check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      latencyMs: Date.now() - start,
    };
  }
}

async function checkRateLimiting(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    // Check rate limit buckets table
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM rate_limit_buckets`
    );
    const bucketCount = parseInt(result.rows[0].count, 10);
    
    return {
      name: 'rate_limiting',
      status: 'healthy',
      message: `Rate limiting active (${bucketCount} active buckets)`,
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      name: 'rate_limiting',
      status: 'unhealthy',
      message: `Rate limiting check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      latencyMs: Date.now() - start,
    };
  }
}
