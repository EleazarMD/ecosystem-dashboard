/**
 * Platform Admin Overview API
 * 
 * GET - Get platform-wide statistics and status
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import {
  withPlatformAdmin,
  AuthContext,
} from '@/lib/platform/auth-middleware';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  ctx: AuthContext
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  
  try {
    // Get tenant stats
    const tenantStats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'suspended') as suspended,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE tier = 'free') as free_tier,
        COUNT(*) FILTER (WHERE tier = 'starter') as starter_tier,
        COUNT(*) FILTER (WHERE tier = 'pro') as pro_tier,
        COUNT(*) FILTER (WHERE tier = 'enterprise') as enterprise_tier
      FROM tenants
      WHERE status != 'archived'
    `);
    
    // Get user stats
    const userStats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE platform_role = 'platform-admin') as platform_admins
      FROM users
    `);
    
    // Get usage stats (last 30 days)
    const usageStats = await pool.query(`
      SELECT 
        COALESCE(SUM(api_calls), 0) as total_api_calls,
        COALESCE(SUM(tokens_used), 0) as total_tokens
      FROM usage_daily
      WHERE date >= CURRENT_DATE - INTERVAL '30 days'
    `);
    
    // Get recent audit log
    const recentActivity = await pool.query(`
      SELECT 
        a.action,
        a.resource_type,
        a.created_at as timestamp,
        u.name as user_name,
        t.name as tenant_name
      FROM audit_log a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN tenants t ON a.tenant_id = t.id
      ORDER BY a.created_at DESC
      LIMIT 10
    `);
    
    // Get recent tenants
    const recentTenants = await pool.query(`
      SELECT id, slug, name, tier, status, created_at
      FROM tenants
      WHERE status != 'archived'
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    const ts = tenantStats.rows[0];
    const us = userStats.rows[0];
    const usage = usageStats.rows[0];
    
    return res.status(200).json({
      success: true,
      overview: {
        tenants: {
          total: parseInt(ts.total),
          active: parseInt(ts.active),
          suspended: parseInt(ts.suspended),
          pending: parseInt(ts.pending),
          byTier: {
            free: parseInt(ts.free_tier),
            starter: parseInt(ts.starter_tier),
            pro: parseInt(ts.pro_tier),
            enterprise: parseInt(ts.enterprise_tier),
          },
        },
        users: {
          total: parseInt(us.total),
          active: parseInt(us.active),
          platformAdmins: parseInt(us.platform_admins),
        },
        usage: {
          apiCallsLast30Days: parseInt(usage.total_api_calls),
          tokensLast30Days: parseInt(usage.total_tokens),
        },
        recentActivity: recentActivity.rows.map(row => ({
          action: row.action,
          resourceType: row.resource_type,
          timestamp: row.timestamp,
          userName: row.user_name,
          tenantName: row.tenant_name,
        })),
        recentTenants: recentTenants.rows.map(row => ({
          id: row.id,
          slug: row.slug,
          name: row.name,
          tier: row.tier,
          status: row.status,
          createdAt: row.created_at,
        })),
      },
    });
  } catch (error) {
    console.error('[Platform Admin API] Overview error:', error);
    
    // Return mock data if database not available
    return res.status(200).json({
      success: true,
      overview: {
        tenants: {
          total: 1,
          active: 1,
          suspended: 0,
          pending: 0,
          byTier: { free: 0, starter: 0, pro: 0, enterprise: 1 },
        },
        users: {
          total: 1,
          active: 1,
          platformAdmins: 1,
        },
        usage: {
          apiCallsLast30Days: 0,
          tokensLast30Days: 0,
        },
        recentActivity: [],
        recentTenants: [{
          id: 'homelab',
          slug: 'homelab',
          name: 'AI Homelab',
          tier: 'enterprise',
          status: 'active',
          createdAt: new Date().toISOString(),
        }],
      },
      warning: 'Using mock data (database may not be initialized)',
    });
  }
}

export default withPlatformAdmin(handler);
