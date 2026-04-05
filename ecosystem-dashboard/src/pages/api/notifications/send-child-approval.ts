/**
 * Send Child Approval Push Notification API
 * 
 * Sends push notifications to parents when children request approvals.
 * Supports iOS Safari push notifications via Web Push API.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

interface NotificationPayload {
  parentId: string;
  childName: string;
  requestType: string;
  title: string;
  approvalId: string;
  priority?: 'normal' | 'high' | 'critical';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify internal API key for server-to-server calls
  const apiKey = req.headers['x-internal-api-key'];
  if (apiKey !== process.env.INTERNAL_API_KEY && process.env.NODE_ENV === 'production') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { parentId, childName, requestType, title, approvalId, priority = 'normal' } = req.body as NotificationPayload;

    if (!parentId || !childName || !requestType || !title || !approvalId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get parent's push subscriptions
    const subscriptionsResult = await pool.query(`
      SELECT subscription_data, device_type, device_name
      FROM push_subscriptions
      WHERE user_id = $1 AND is_active = true
    `, [parentId]);

    if (subscriptionsResult.rows.length === 0) {
      console.log(`[ChildApprovalNotification] No active subscriptions for parent ${parentId}`);
      return res.status(200).json({ 
        success: true, 
        sent: 0, 
        message: 'No active push subscriptions' 
      });
    }

    // Build notification payload optimized for iOS
    const notificationPayload = {
      title: `🔔 ${childName} needs approval`,
      body: title,
      icon: '/icons/family-notification-192.png',
      badge: '/icons/badge-72.png',
      tag: `child-approval-${approvalId}`,
      renotify: true,
      requireInteraction: priority === 'high' || priority === 'critical',
      data: {
        type: 'child_approval',
        approvalId,
        childName,
        requestType,
        url: `/approvals?tab=children&id=${approvalId}`,
        timestamp: new Date().toISOString(),
      },
      actions: [
        {
          action: 'approve',
          title: '✅ Approve',
          icon: '/icons/approve-action.png',
        },
        {
          action: 'view',
          title: '👁️ View',
          icon: '/icons/view-action.png',
        },
      ],
      vibrate: priority === 'critical' ? [200, 100, 200, 100, 200] : [100, 50, 100],
    };

    // Store notification in database for retrieval
    await pool.query(`
      INSERT INTO user_notifications (
        user_id, 
        title, 
        body, 
        data, 
        url, 
        icon, 
        notification_type,
        priority,
        is_read, 
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, NOW())
    `, [
      parentId,
      notificationPayload.title,
      notificationPayload.body,
      JSON.stringify(notificationPayload.data),
      notificationPayload.data.url,
      notificationPayload.icon,
      'child_approval',
      priority,
    ]);

    // Send to each subscription
    let sentCount = 0;
    let failedCount = 0;

    for (const row of subscriptionsResult.rows) {
      try {
        const subscription = row.subscription_data;
        
        // Use web-push library
        const webpush = require('web-push');
        
        if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
          webpush.setVapidDetails(
            `mailto:${process.env.VAPID_EMAIL || 'admin@aihomelab.local'}`,
            process.env.VAPID_PUBLIC_KEY,
            process.env.VAPID_PRIVATE_KEY
          );
          
          await webpush.sendNotification(
            subscription,
            JSON.stringify(notificationPayload),
            {
              TTL: 86400, // 24 hours
              urgency: priority === 'critical' ? 'high' : 'normal',
              topic: 'child-approval',
            }
          );
          
          sentCount++;
          console.log(`[ChildApprovalNotification] Sent to ${row.device_type || 'unknown'} device`);
        }
      } catch (error: any) {
        console.error('[ChildApprovalNotification] Failed to send:', error.message);
        failedCount++;
        
        // If subscription is invalid (410 Gone), mark it as inactive
        if (error.statusCode === 410 || error.statusCode === 404) {
          await pool.query(`
            UPDATE push_subscriptions
            SET is_active = false, deactivated_at = NOW(), deactivation_reason = $1
            WHERE subscription_data = $2
          `, [error.message, row.subscription_data]);
        }
      }
    }

    return res.status(200).json({
      success: true,
      sent: sentCount,
      failed: failedCount,
      total: subscriptionsResult.rows.length,
    });

  } catch (error) {
    console.error('[ChildApprovalNotification] Error:', error);
    return res.status(500).json({ error: 'Failed to send notification' });
  }
}
