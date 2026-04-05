/**
 * Single Tenant API
 * 
 * GET - Get tenant details
 * PUT - Update tenant
 * DELETE - Archive tenant
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import {
  withPlatformAdmin,
  logAudit,
  AuthContext,
} from '@/lib/platform/auth-middleware';
import { TenantTier, TIER_LIMITS } from '@/lib/platform/tenant-types';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  ctx: AuthContext
) {
  const { tenantId } = req.query;
  
  if (!tenantId || typeof tenantId !== 'string') {
    return res.status(400).json({ success: false, error: 'Tenant ID required' });
  }
  
  switch (req.method) {
    case 'GET':
      return getTenant(req, res, ctx, tenantId);
    case 'PUT':
      return updateTenant(req, res, ctx, tenantId);
    case 'DELETE':
      return archiveTenant(req, res, ctx, tenantId);
    default:
      return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}

async function getTenant(
  req: NextApiRequest,
  res: NextApiResponse,
  ctx: AuthContext,
  tenantId: string
) {
  try {
    const result = await pool.query(
      `SELECT t.*, 
        (SELECT COUNT(*) FROM tenant_memberships WHERE tenant_id = t.id) as member_count,
        (SELECT json_agg(json_build_object(
          'id', u.id,
          'email', u.email,
          'name', u.name,
          'role', tm.role_id,
          'joinedAt', tm.joined_at
        )) FROM tenant_memberships tm 
         JOIN users u ON tm.user_id = u.id 
         WHERE tm.tenant_id = t.id) as members
       FROM tenants t
       WHERE t.id = $1`,
      [tenantId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found',
      });
    }
    
    const row = result.rows[0];
    
    return res.status(200).json({
      success: true,
      tenant: {
        id: row.id,
        slug: row.slug,
        name: row.name,
        description: row.description,
        status: row.status,
        tier: row.tier,
        ownerId: row.owner_id,
        ownerEmail: row.owner_email,
        limits: row.limits,
        usage: row.usage,
        config: row.config,
        memberCount: parseInt(row.member_count),
        members: row.members || [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastActiveAt: row.last_active_at,
      },
    });
  } catch (error) {
    console.error('[Tenant API] Get error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get tenant',
    });
  }
}

async function updateTenant(
  req: NextApiRequest,
  res: NextApiResponse,
  ctx: AuthContext,
  tenantId: string
) {
  const { name, description, status, tier, limits, config } = req.body;
  
  try {
    // Build update query dynamically
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(name);
    }
    
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(description);
    }
    
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(status);
    }
    
    if (tier !== undefined) {
      updates.push(`tier = $${paramIndex++}`);
      params.push(tier);
      
      // Update limits to tier defaults if not explicitly provided
      if (!limits) {
        updates.push(`limits = $${paramIndex++}`);
        params.push(JSON.stringify(TIER_LIMITS[tier as TenantTier]));
      }
    }
    
    if (limits !== undefined) {
      updates.push(`limits = $${paramIndex++}`);
      params.push(JSON.stringify(limits));
    }
    
    if (config !== undefined) {
      updates.push(`config = $${paramIndex++}`);
      params.push(JSON.stringify(config));
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No updates provided',
      });
    }
    
    params.push(tenantId);
    
    const result = await pool.query(
      `UPDATE tenants SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found',
      });
    }
    
    // Log audit
    await logAudit('tenant:updated', ctx, {
      tenantId,
      updates: Object.keys(req.body),
    }, 'tenant', tenantId);
    
    return res.status(200).json({
      success: true,
      tenant: {
        id: result.rows[0].id,
        slug: result.rows[0].slug,
        name: result.rows[0].name,
        status: result.rows[0].status,
        tier: result.rows[0].tier,
      },
      message: 'Tenant updated successfully',
    });
  } catch (error) {
    console.error('[Tenant API] Update error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update tenant',
    });
  }
}

async function archiveTenant(
  req: NextApiRequest,
  res: NextApiResponse,
  ctx: AuthContext,
  tenantId: string
) {
  try {
    // Don't allow archiving the homelab tenant
    const tenant = await pool.query(
      `SELECT slug FROM tenants WHERE id = $1`,
      [tenantId]
    );
    
    if (tenant.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found',
      });
    }
    
    if (tenant.rows[0].slug === 'homelab') {
      return res.status(403).json({
        success: false,
        error: 'Cannot archive the primary homelab tenant',
      });
    }
    
    // Archive (soft delete)
    await pool.query(
      `UPDATE tenants SET status = 'archived' WHERE id = $1`,
      [tenantId]
    );
    
    // Log audit
    await logAudit('tenant:archived', ctx, { tenantId }, 'tenant', tenantId);
    
    return res.status(200).json({
      success: true,
      message: 'Tenant archived successfully',
    });
  } catch (error) {
    console.error('[Tenant API] Archive error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to archive tenant',
    });
  }
}

export default withPlatformAdmin(handler);
