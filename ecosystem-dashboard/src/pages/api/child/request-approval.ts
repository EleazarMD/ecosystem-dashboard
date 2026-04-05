/**
 * Child Approval Request API
 * 
 * Allows child accounts to request parental approval for actions
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { Pool } from 'pg';
import { sendApprovalNotification } from '@/lib/platform/child-account-notifications';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = session.user as any;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { requestType, title, description, serviceId, details } = req.body;

    if (!requestType || !title) {
      return res.status(400).json({ error: 'Request type and title are required' });
    }

    // Get child account info
    const userResult = await pool.query(`
      SELECT 
        u.id,
        u.name,
        u.account_type,
        u.parent_user_id
      FROM users u
      WHERE u.id = $1
    `, [user.id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userResult.rows[0];

    if (userData.account_type !== 'child' || !userData.parent_user_id) {
      return res.status(403).json({ error: 'Only child accounts can request approval' });
    }

    // Check for existing APPROVED request of same type that hasn't expired
    const approvedResult = await pool.query(`
      SELECT id, expires_at FROM parental_approval_requests
      WHERE child_user_id = $1 
        AND request_type = $2 
        AND status = 'approved'
        AND expires_at > NOW()
      ORDER BY responded_at DESC
      LIMIT 1
    `, [user.id, requestType]);

    if (approvedResult.rows.length > 0) {
      // Already have a valid approval - no need to request again
      return res.status(200).json({ 
        success: true,
        alreadyApproved: true,
        approvalId: approvedResult.rows[0].id,
        expiresAt: approvedResult.rows[0].expires_at,
        message: 'You already have approval for this. Go ahead!',
      });
    }

    // Check for existing pending request of same type
    const existingResult = await pool.query(`
      SELECT id FROM parental_approval_requests
      WHERE child_user_id = $1 
        AND request_type = $2 
        AND status = 'pending'
        AND expires_at > NOW()
      LIMIT 1
    `, [user.id, requestType]);

    if (existingResult.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Pending request exists',
        message: 'You already have a pending request. Please wait for your parent to respond.',
      });
    }

    // Create approval request
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry

    const requestData = {
      title,
      description: description || '',
      serviceId: serviceId || null,
      details: details || {},
    };

    const insertResult = await pool.query(`
      INSERT INTO parental_approval_requests (
        child_user_id,
        parent_user_id,
        request_type,
        request_data,
        expires_at
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [user.id, userData.parent_user_id, requestType, JSON.stringify(requestData), expiresAt]);

    const approvalId = insertResult.rows[0].id;

    // Send push notification to parent (both legacy and new iOS-optimized)
    try {
      // Legacy notification
      await sendApprovalNotification(
        userData.parent_user_id,
        userData.name,
        requestType,
        title,
        approvalId
      );
      
      // Also send via new iOS-optimized endpoint
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      await fetch(`${baseUrl}/api/notifications/send-child-approval`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-api-key': process.env.INTERNAL_API_KEY || 'dev-key',
        },
        body: JSON.stringify({
          parentId: userData.parent_user_id,
          childName: userData.name,
          requestType,
          title,
          approvalId,
          priority: 'normal',
        }),
      });
    } catch (notifyError) {
      console.error('[Approval Request] Failed to send notification:', notifyError);
      // Don't fail the request if notification fails
    }

    return res.status(201).json({
      success: true,
      approvalId,
      message: 'Request sent to your parent',
      expiresAt: expiresAt.toISOString(),
    });

  } catch (error) {
    console.error('[Child Approval Request API] Error:', error);
    return res.status(500).json({ error: 'Failed to create approval request' });
  }
}
