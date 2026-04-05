/**
 * Subscription Upgrade API
 * 
 * POST: Process subscription upgrade
 * BETA MODE: Skips payment processing - upgrades are free during beta
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = session.user as any;
  const { plan_id, billing_cycle = 'monthly', card_last_four = '4242' } = req.body;

  if (!plan_id) {
    return res.status(400).json({ error: 'plan_id required' });
  }

  if (!['monthly', 'yearly'].includes(billing_cycle)) {
    return res.status(400).json({ error: 'Invalid billing_cycle' });
  }

  try {
    // Get plan details for response
    const planResult = await pool.query(
      'SELECT name, display_name, price_monthly_cents, price_yearly_cents FROM subscription_plans WHERE id = $1',
      [plan_id]
    );

    if (planResult.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    const plan = planResult.rows[0];

    // Check if user is trying to downgrade (not allowed via this endpoint)
    const currentPlanResult = await pool.query(`
      SELECT sp.price_monthly_cents
      FROM user_quotas uq
      JOIN subscription_plans sp ON sp.id = uq.subscription_plan_id
      WHERE uq.user_id = $1
    `, [user.id]);

    const currentPrice = currentPlanResult.rows[0]?.price_monthly_cents || 0;
    const newPrice = plan.price_monthly_cents;

    // BETA MODE: Allow all plan changes (no payment required)
    const isBetaMode = process.env.BETA_MODE !== 'false'; // Default to beta mode
    
    if (!isBetaMode && newPrice < currentPrice) {
      return res.status(400).json({ 
        error: 'Downgrades not supported via this endpoint',
        message: 'Please contact support to downgrade your plan'
      });
    }

    // Process upgrade using database function (no payment in beta)
    const upgradeResult = await pool.query(
      'SELECT upgrade_subscription($1, $2, $3) as result',
      [user.id, plan_id, billing_cycle]
    );

    const result = upgradeResult.rows[0]?.result;

    if (!result?.success) {
      return res.status(400).json({
        error: result?.error || 'Upgrade failed',
        message: result?.message || 'Payment could not be processed'
      });
    }

    // Get updated quota
    const quotaResult = await pool.query(
      'SELECT * FROM get_user_effective_quota($1)',
      [user.id]
    );

    return res.status(200).json({
      success: true,
      message: `Successfully upgraded to ${plan.display_name}!`,
      plan: {
        name: plan.name,
        displayName: plan.display_name,
      },
      billing_cycle,
      payment_id: result.payment_id,
      subscription_id: result.subscription_id,
      newQuota: quotaResult.rows[0] || null,
      // Simulated receipt info
      receipt: {
        amount: billing_cycle === 'yearly' ? plan.price_yearly_cents : plan.price_monthly_cents,
        currency: 'USD',
        description: `${plan.display_name} - ${billing_cycle === 'yearly' ? 'Annual' : 'Monthly'} subscription`,
        date: new Date().toISOString(),
        isSimulated: true,
      }
    });
  } catch (error: any) {
    console.error('[Upgrade API] Error:', error);
    return res.status(500).json({ error: 'Failed to process upgrade' });
  }
}
