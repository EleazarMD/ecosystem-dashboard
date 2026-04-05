/**
 * User Quota API
 * 
 * GET: Get current user's quota status
 * Returns storage usage, limits, and remaining capacity
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

  const user = session.user as any;

  try {
    // Get effective quota
    const quotaResult = await pool.query(
      'SELECT * FROM get_user_effective_quota($1)',
      [user.id]
    );

    if (quotaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quota not configured' });
    }

    const quota = quotaResult.rows[0];

    // Get plan details
    const planResult = await pool.query(`
      SELECT sp.name, sp.display_name, sp.description, sp.features
      FROM user_quotas uq
      JOIN subscription_plans sp ON sp.id = uq.subscription_plan_id
      WHERE uq.user_id = $1
    `, [user.id]);

    const plan = planResult.rows[0] || {};

    // Format response
    const response = {
      plan: {
        name: plan.name || quota.plan_name,
        displayName: plan.display_name,
        description: plan.description,
        features: plan.features,
      },
      storage: {
        quotaBytes: quota.storage_quota_bytes,
        usedBytes: quota.storage_used_bytes,
        remainingBytes: quota.storage_remaining_bytes,
        usedPercent: parseFloat(quota.storage_used_percent) || 0,
        // Human readable
        quotaFormatted: formatBytes(quota.storage_quota_bytes),
        usedFormatted: formatBytes(quota.storage_used_bytes),
        remainingFormatted: formatBytes(quota.storage_remaining_bytes),
      },
      images: {
        limit: quota.image_count_limit,
        count: quota.image_count,
        remaining: quota.images_remaining,
      },
      dailyGenerations: {
        limit: quota.daily_image_generations_limit,
        used: quota.daily_image_generations,
        remaining: quota.daily_generations_remaining,
      },
      monthlyGenerations: {
        limit: quota.monthly_image_generations_limit,
        used: quota.monthly_image_generations,
        remaining: quota.monthly_generations_remaining,
      },
      isQuotaExceeded: quota.is_quota_exceeded,
      isUnlimited: quota.plan_name === 'administrator',
    };

    return res.status(200).json(response);
  } catch (error: any) {
    console.error('[Quota API] Error:', error);
    return res.status(500).json({ error: 'Failed to fetch quota' });
  }
}

function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return 'Unlimited';
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
