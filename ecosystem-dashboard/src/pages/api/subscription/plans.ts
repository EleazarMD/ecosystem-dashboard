/**
 * Subscription Plans API
 * 
 * GET: List available subscription plans with pricing
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await pool.query(`
      SELECT 
        id,
        name,
        display_name,
        description,
        storage_quota_bytes,
        image_count_limit,
        daily_image_generations_limit,
        monthly_image_generations_limit,
        price_monthly_cents,
        price_yearly_cents,
        features
      FROM subscription_plans
      WHERE is_active = TRUE
        AND name NOT IN ('administrator', 'child') -- Hide admin and child plans from upgrade UI
      ORDER BY price_monthly_cents ASC
    `);

    // Format plans for frontend
    const plans = result.rows.map(plan => ({
      id: plan.id,
      name: plan.name,
      displayName: plan.display_name,
      description: plan.description,
      storage: {
        bytes: plan.storage_quota_bytes,
        formatted: formatBytes(plan.storage_quota_bytes),
      },
      limits: {
        images: plan.image_count_limit,
        dailyGenerations: plan.daily_image_generations_limit,
        monthlyGenerations: plan.monthly_image_generations_limit,
      },
      pricing: {
        monthly: {
          cents: plan.price_monthly_cents,
          formatted: formatPrice(plan.price_monthly_cents),
        },
        yearly: {
          cents: plan.price_yearly_cents,
          formatted: formatPrice(plan.price_yearly_cents),
          monthlyEquivalent: formatPrice(Math.round(plan.price_yearly_cents / 12)),
          savings: plan.price_monthly_cents > 0 
            ? Math.round((1 - (plan.price_yearly_cents / 12) / plan.price_monthly_cents) * 100)
            : 0,
        },
      },
      features: plan.features || {},
      isFree: plan.price_monthly_cents === 0,
    }));

    return res.status(200).json({ plans });
  } catch (error: any) {
    console.error('[Plans API] Error:', error);
    return res.status(500).json({ error: 'Failed to fetch plans' });
  }
}

function formatBytes(bytes: number | null): string {
  if (bytes === null) return 'Unlimited';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(0)) + ' ' + sizes[i];
}

function formatPrice(cents: number): string {
  if (cents === 0) return 'Free';
  return '$' + (cents / 100).toFixed(2);
}
