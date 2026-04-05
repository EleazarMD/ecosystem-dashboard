/**
 * Tenants API
 * 
 * GET - List all tenants (platform admin only)
 * POST - Create new tenant (platform admin only)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import {
  withPlatformAdmin,
  logAudit,
  AuthContext,
} from '@/lib/platform/auth-middleware';
import {
  Tenant,
  CreateTenantRequest,
  TenantTier,
  TIER_LIMITS,
} from '@/lib/platform/tenant-types';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  ctx: AuthContext
) {
  switch (req.method) {
    case 'GET':
      return listTenants(req, res, ctx);
    case 'POST':
      return createTenant(req, res, ctx);
    default:
      return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}

async function listTenants(
  req: NextApiRequest,
  res: NextApiResponse,
  ctx: AuthContext
) {
  const { status, tier, search, limit = '50', offset = '0' } = req.query;
  
  try {
    let query = `
      SELECT t.*, 
        (SELECT COUNT(*) FROM tenant_memberships WHERE tenant_id = t.id) as member_count
      FROM tenants t
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;
    
    if (status) {
      query += ` AND t.status = $${paramIndex++}`;
      params.push(status);
    }
    
    if (tier) {
      query += ` AND t.tier = $${paramIndex++}`;
      params.push(tier);
    }
    
    if (search) {
      query += ` AND (t.name ILIKE $${paramIndex} OR t.slug ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    query += ` ORDER BY t.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(parseInt(limit as string), parseInt(offset as string));
    
    const result = await pool.query(query, params);
    
    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM tenants WHERE status != 'archived'`
    );
    
    const tenants = result.rows.map(row => ({
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
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastActiveAt: row.last_active_at,
    }));
    
    return res.status(200).json({
      success: true,
      tenants,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    console.error('[Tenants API] List error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to list tenants',
    });
  }
}

async function createTenant(
  req: NextApiRequest,
  res: NextApiResponse,
  ctx: AuthContext
) {
  const { name, slug, ownerEmail, tier, description } = req.body as CreateTenantRequest;
  
  // Validation
  if (!name || !slug || !ownerEmail) {
    return res.status(400).json({
      success: false,
      error: 'name, slug, and ownerEmail are required',
    });
  }
  
  // Validate slug format
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return res.status(400).json({
      success: false,
      error: 'slug must be lowercase alphanumeric with hyphens only',
    });
  }
  
  const tenantTier = (tier || 'free') as TenantTier;
  const limits = TIER_LIMITS[tenantTier];
  
  try {
    // Check if slug is taken
    const existing = await pool.query(
      `SELECT id FROM tenants WHERE slug = $1`,
      [slug]
    );
    
    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Tenant slug already exists',
      });
    }
    
    // Check if owner user exists, create if not
    let ownerResult = await pool.query(
      `SELECT id FROM users WHERE email = $1`,
      [ownerEmail]
    );
    
    let ownerId: string;
    
    if (ownerResult.rows.length === 0) {
      // Create new user
      ownerId = uuidv4();
      await pool.query(
        `INSERT INTO users (id, email, name, status)
         VALUES ($1, $2, $3, 'pending')`,
        [ownerId, ownerEmail, ownerEmail.split('@')[0]]
      );
    } else {
      ownerId = ownerResult.rows[0].id;
    }
    
    // Create tenant
    const tenantId = uuidv4();
    const result = await pool.query(
      `INSERT INTO tenants (id, slug, name, description, owner_id, owner_email, tier, status, limits, config)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8, $9)
       RETURNING *`,
      [
        tenantId,
        slug,
        name,
        description || null,
        ownerId,
        ownerEmail,
        tenantTier,
        JSON.stringify(limits),
        JSON.stringify({
          enabledServices: limits.allowedFeatures.includes('*') ? ['*'] : [],
          enabledAgents: limits.allowedFeatures.includes('*') ? ['*'] : ['goose-mind'],
          enabledLLMs: limits.allowedLLMs,
          enabledFeatures: limits.allowedFeatures,
          customSettings: {},
        }),
      ]
    );
    
    // Add owner as tenant admin
    await pool.query(
      `INSERT INTO tenant_memberships (tenant_id, user_id, role_id, invited_by)
       VALUES ($1, $2, 'tenant-admin', $3)`,
      [tenantId, ownerId, ctx.user.id]
    );
    
    // Log audit
    await logAudit('tenant:created', ctx, {
      tenantId,
      slug,
      tier: tenantTier,
      ownerEmail,
    }, 'tenant', tenantId);
    
    return res.status(201).json({
      success: true,
      tenant: {
        id: result.rows[0].id,
        slug: result.rows[0].slug,
        name: result.rows[0].name,
        tier: result.rows[0].tier,
        status: result.rows[0].status,
      },
      message: 'Tenant created successfully',
    });
  } catch (error) {
    console.error('[Tenants API] Create error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create tenant',
    });
  }
}

export default withPlatformAdmin(handler);
