/**
 * Payment History API
 * 
 * GET: Get user's payment and subscription history
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
    // Get current subscription
    const subscriptionResult = await pool.query(`
      SELECT 
        s.id,
        s.status,
        s.billing_cycle,
        s.current_period_start,
        s.current_period_end,
        s.cancel_at_period_end,
        sp.name as plan_name,
        sp.display_name as plan_display_name,
        sp.price_monthly_cents,
        sp.price_yearly_cents
      FROM subscriptions s
      JOIN subscription_plans sp ON sp.id = s.plan_id
      WHERE s.user_id = $1
      ORDER BY s.created_at DESC
      LIMIT 1
    `, [user.id]);

    // Get payment history
    const paymentsResult = await pool.query(`
      SELECT 
        id,
        amount_cents,
        currency,
        status,
        description,
        is_simulated,
        simulated_card_last_four,
        created_at
      FROM payments
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 20
    `, [user.id]);

    const subscription = subscriptionResult.rows[0] || null;
    const payments = paymentsResult.rows.map(p => ({
      id: p.id,
      amount: {
        cents: p.amount_cents,
        formatted: formatPrice(p.amount_cents),
      },
      currency: p.currency,
      status: p.status,
      description: p.description,
      isSimulated: p.is_simulated,
      cardLastFour: p.simulated_card_last_four,
      date: p.created_at,
    }));

    return res.status(200).json({
      subscription: subscription ? {
        id: subscription.id,
        status: subscription.status,
        billingCycle: subscription.billing_cycle,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        plan: {
          name: subscription.plan_name,
          displayName: subscription.plan_display_name,
        },
        nextBillingAmount: subscription.billing_cycle === 'yearly' 
          ? subscription.price_yearly_cents 
          : subscription.price_monthly_cents,
      } : null,
      payments,
    });
  } catch (error: any) {
    console.error('[History API] Error:', error);
    return res.status(500).json({ error: 'Failed to fetch history' });
  }
}

function formatPrice(cents: number): string {
  if (cents === 0) return 'Free';
  return '$' + (cents / 100).toFixed(2);
}
