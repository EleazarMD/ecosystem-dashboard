/**
 * Tenants API
 * 
 * List all tenants (platform admin) or user's tenants
 * Create new tenant (platform admin only)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = session.user as any;
  const isPlatformAdmin = user.platformRole === 'platform-admin';

  if (req.method === 'GET') {
    try {
      let query: string;
      let params: any[];

      if (isPlatformAdmin) {
        // Platform admins see all tenants
        query = `
          SELECT t.*, 
            (SELECT COUNT(*) FROM tenant_memberships tm WHERE tm.tenant_id = t.id AND tm.status = 'active') as member_count
          FROM tenants t
          ORDER BY t.created_at DESC
        `;
        params = [];
      } else {
        // Regular users see only their tenants
        query = `
          SELECT t.*, tm.role_id as user_role,
            (SELECT COUNT(*) FROM tenant_memberships tm2 WHERE tm2.tenant_id = t.id AND tm2.status = 'active') as member_count
          FROM tenants t
          JOIN tenant_memberships tm ON tm.tenant_id = t.id
          WHERE tm.user_id = $1 AND tm.status = 'active'
          ORDER BY t.created_at DESC
        `;
        params = [user.id];
      }

      const result = await pool.query(query, params);
      return res.status(200).json({ tenants: result.rows });
    } catch (error) {
      console.error('[Tenants API] Error:', error);
      return res.status(500).json({ error: 'Failed to fetch tenants' });
    }
  }

  if (req.method === 'POST') {
    if (!isPlatformAdmin) {
      return res.status(403).json({ error: 'Only platform admins can create tenants' });
    }

    const { name, slug, description } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ error: 'Name and slug are required' });
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return res.status(400).json({ error: 'Slug must be lowercase alphanumeric with hyphens only' });
    }

    try {
      const result = await pool.query(
        `INSERT INTO tenants (name, slug, description)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [name, slug, description || null]
      );

      return res.status(201).json({ tenant: result.rows[0] });
    } catch (error: any) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'A tenant with this slug already exists' });
      }
      console.error('[Tenants API] Error:', error);
      return res.status(500).json({ error: 'Failed to create tenant' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
