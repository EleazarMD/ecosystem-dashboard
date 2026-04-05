/**
 * Child Account Notifications Service
 * 
 * Handles daily activity reports and push notifications for parental controls
 */

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

// ============================================================
// Daily Activity Report
// ============================================================

export interface DailyActivityReport {
  childId: string;
  childName: string;
  childEmail: string;
  parentId: string;
  parentName: string;
  parentEmail: string;
  reportDate: string;
  
  // Usage Summary
  totalMinutes: number;
  dailyLimit: number;
  usagePercent: number;
  
  // Activity Counts
  conversationCount: number;
  messageCount: number;
  blockedAttempts: number;
  
  // Service Usage
  serviceUsage: Record<string, number>;
  
  // Notable Events
  blockedEvents: Array<{
    time: string;
    reason: string;
    serviceId?: string;
  }>;
  
  // Pending Approvals
  pendingApprovals: number;
}

export async function generateDailyReport(childId: string, date?: Date): Promise<DailyActivityReport | null> {
  const reportDate = date || new Date();
  const dateStr = reportDate.toISOString().split('T')[0];
  
  try {
    // Get child and parent info
    const userResult = await pool.query(`
      SELECT 
        c.id as child_id,
        c.name as child_name,
        c.email as child_email,
        p.id as parent_id,
        p.name as parent_name,
        p.email as parent_email,
        pc.daily_usage_limit_minutes,
        pc.send_daily_activity_report
      FROM users c
      JOIN users p ON c.parent_user_id = p.id
      LEFT JOIN parental_controls_config pc ON pc.child_user_id = c.id
      WHERE c.id = $1 AND c.account_type = 'child'
    `, [childId]);
    
    if (userResult.rows.length === 0) return null;
    
    const user = userResult.rows[0];
    
    // Check if reports are enabled
    if (!user.send_daily_activity_report) return null;
    
    // Get daily usage
    const usageResult = await pool.query(`
      SELECT 
        COALESCE(total_minutes, 0) as total_minutes,
        COALESCE(conversation_count, 0) as conversation_count,
        COALESCE(message_count, 0) as message_count,
        COALESCE(blocked_attempts, 0) as blocked_attempts,
        COALESCE(service_usage, '{}'::jsonb) as service_usage
      FROM child_daily_usage
      WHERE child_user_id = $1 AND usage_date = $2
    `, [childId, dateStr]);
    
    const usage = usageResult.rows[0] || {
      total_minutes: 0,
      conversation_count: 0,
      message_count: 0,
      blocked_attempts: 0,
      service_usage: {},
    };
    
    // Get blocked events
    const blockedResult = await pool.query(`
      SELECT 
        created_at as time,
        filter_reason as reason,
        service_id
      FROM child_activity_log
      WHERE child_user_id = $1 
        AND DATE(created_at) = $2
        AND was_filtered = true
      ORDER BY created_at DESC
      LIMIT 10
    `, [childId, dateStr]);
    
    // Get pending approvals count
    const approvalsResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM parental_approval_requests
      WHERE child_user_id = $1 AND status = 'pending'
    `, [childId]);
    
    const dailyLimit = user.daily_usage_limit_minutes || 120;
    
    return {
      childId: user.child_id,
      childName: user.child_name,
      childEmail: user.child_email,
      parentId: user.parent_id,
      parentName: user.parent_name,
      parentEmail: user.parent_email,
      reportDate: dateStr,
      
      totalMinutes: usage.total_minutes,
      dailyLimit,
      usagePercent: Math.round((usage.total_minutes / dailyLimit) * 100),
      
      conversationCount: usage.conversation_count,
      messageCount: usage.message_count,
      blockedAttempts: usage.blocked_attempts,
      
      serviceUsage: usage.service_usage,
      
      blockedEvents: blockedResult.rows.map(row => ({
        time: new Date(row.time).toLocaleTimeString(),
        reason: row.reason || 'Content filtered',
        serviceId: row.service_id,
      })),
      
      pendingApprovals: parseInt(approvalsResult.rows[0].count),
    };
  } catch (error) {
    console.error('[DailyReport] Error generating report:', error);
    return null;
  }
}

export function formatDailyReportEmail(report: DailyActivityReport): { subject: string; html: string; text: string } {
  const subject = `Daily Activity Report for ${report.childName} - ${report.reportDate}`;
  
  const usageBar = '█'.repeat(Math.floor(report.usagePercent / 10)) + '░'.repeat(10 - Math.floor(report.usagePercent / 10));
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
    .stat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
    .stat-box { background: white; padding: 15px; border-radius: 8px; text-align: center; }
    .stat-number { font-size: 28px; font-weight: bold; color: #667eea; }
    .stat-label { font-size: 12px; color: #666; text-transform: uppercase; }
    .progress-bar { background: #e0e0e0; border-radius: 10px; height: 20px; overflow: hidden; margin: 10px 0; }
    .progress-fill { background: linear-gradient(90deg, #4CAF50, #8BC34A); height: 100%; transition: width 0.3s; }
    .progress-fill.warning { background: linear-gradient(90deg, #FF9800, #FFC107); }
    .progress-fill.danger { background: linear-gradient(90deg, #f44336, #FF5722); }
    .alert { padding: 15px; border-radius: 8px; margin: 15px 0; }
    .alert-warning { background: #fff3cd; border-left: 4px solid #ffc107; }
    .alert-danger { background: #f8d7da; border-left: 4px solid #dc3545; }
    .alert-success { background: #d4edda; border-left: 4px solid #28a745; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    .btn { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">📊 Daily Activity Report</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">${report.childName} • ${new Date(report.reportDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>
    
    <div class="content">
      <h2>Usage Summary</h2>
      <div class="progress-bar">
        <div class="progress-fill ${report.usagePercent > 80 ? 'danger' : report.usagePercent > 50 ? 'warning' : ''}" style="width: ${Math.min(100, report.usagePercent)}%"></div>
      </div>
      <p><strong>${report.totalMinutes} minutes</strong> of ${report.dailyLimit} minute daily limit (${report.usagePercent}%)</p>
      
      <div class="stat-grid">
        <div class="stat-box">
          <div class="stat-number">${report.conversationCount}</div>
          <div class="stat-label">Conversations</div>
        </div>
        <div class="stat-box">
          <div class="stat-number">${report.messageCount}</div>
          <div class="stat-label">Messages</div>
        </div>
        <div class="stat-box">
          <div class="stat-number" style="color: ${report.blockedAttempts > 0 ? '#dc3545' : '#28a745'}">${report.blockedAttempts}</div>
          <div class="stat-label">Blocked Attempts</div>
        </div>
        <div class="stat-box">
          <div class="stat-number" style="color: ${report.pendingApprovals > 0 ? '#ffc107' : '#28a745'}">${report.pendingApprovals}</div>
          <div class="stat-label">Pending Approvals</div>
        </div>
      </div>
      
      ${report.blockedAttempts > 0 ? `
      <div class="alert alert-warning">
        <strong>⚠️ Blocked Content Attempts</strong>
        <ul style="margin: 10px 0 0 0; padding-left: 20px;">
          ${report.blockedEvents.slice(0, 5).map(e => `<li>${e.time}: ${e.reason}</li>`).join('')}
        </ul>
      </div>
      ` : `
      <div class="alert alert-success">
        <strong>✅ All Clear</strong>
        <p style="margin: 5px 0 0 0;">No blocked content attempts today.</p>
      </div>
      `}
      
      ${report.pendingApprovals > 0 ? `
      <div class="alert alert-warning">
        <strong>🔔 ${report.pendingApprovals} Pending Approval${report.pendingApprovals > 1 ? 's' : ''}</strong>
        <p style="margin: 5px 0 0 0;">${report.childName} has requests waiting for your review.</p>
      </div>
      ` : ''}
      
      <div style="text-align: center; margin-top: 30px;">
        <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/admin/family/${report.childId}" class="btn">View Full Activity</a>
        <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/admin/family/${report.childId}/controls" class="btn" style="background: #6c757d;">Manage Controls</a>
      </div>
    </div>
    
    <div class="footer">
      <p>This report was sent because daily activity reports are enabled for ${report.childName}.</p>
      <p>You can disable these reports in the parental controls settings.</p>
      <p>AI Homelab Family Safety System</p>
    </div>
  </div>
</body>
</html>
  `.trim();
  
  const text = `
Daily Activity Report for ${report.childName}
${report.reportDate}

USAGE SUMMARY
${usageBar} ${report.usagePercent}%
${report.totalMinutes} minutes of ${report.dailyLimit} minute daily limit

ACTIVITY
- Conversations: ${report.conversationCount}
- Messages: ${report.messageCount}
- Blocked Attempts: ${report.blockedAttempts}
- Pending Approvals: ${report.pendingApprovals}

${report.blockedAttempts > 0 ? `
BLOCKED CONTENT ATTEMPTS
${report.blockedEvents.map(e => `- ${e.time}: ${e.reason}`).join('\n')}
` : 'No blocked content attempts today.'}

View full activity: ${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/admin/family/${report.childId}

---
AI Homelab Family Safety System
  `.trim();
  
  return { subject, html, text };
}

// ============================================================
// Push Notifications
// ============================================================

export interface PushNotification {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  url?: string;
  icon?: string;
  badge?: number;
}

export async function sendApprovalNotification(
  parentId: string,
  childName: string,
  requestType: string,
  requestTitle: string,
  approvalId: string
): Promise<void> {
  const notification: PushNotification = {
    userId: parentId,
    title: `🔔 Approval Request from ${childName}`,
    body: requestTitle,
    data: {
      type: 'approval_request',
      approvalId,
      requestType,
    },
    url: `/admin/family?approval=${approvalId}`,
    icon: '/icons/family-notification.png',
    badge: 1,
  };
  
  await sendPushNotification(notification);
}

export async function sendBlockedContentAlert(
  parentId: string,
  childName: string,
  reason: string,
  childId: string
): Promise<void> {
  const notification: PushNotification = {
    userId: parentId,
    title: `⚠️ Blocked Content Alert`,
    body: `${childName} attempted to access blocked content: ${reason}`,
    data: {
      type: 'blocked_content',
      childId,
    },
    url: `/admin/family/${childId}/activity`,
    icon: '/icons/alert-notification.png',
  };
  
  await sendPushNotification(notification);
}

export async function sendUsageLimitWarning(
  parentId: string,
  childName: string,
  remainingMinutes: number,
  childId: string
): Promise<void> {
  const notification: PushNotification = {
    userId: parentId,
    title: `⏰ Usage Limit Warning`,
    body: `${childName} has ${remainingMinutes} minutes remaining today`,
    data: {
      type: 'usage_warning',
      childId,
      remainingMinutes,
    },
    url: `/admin/family/${childId}`,
    icon: '/icons/clock-notification.png',
  };
  
  await sendPushNotification(notification);
}

async function sendPushNotification(notification: PushNotification): Promise<void> {
  // Check if user has push subscriptions
  const subscriptionsResult = await pool.query(`
    SELECT subscription_data
    FROM push_subscriptions
    WHERE user_id = $1 AND is_active = true
  `, [notification.userId]);
  
  if (subscriptionsResult.rows.length === 0) {
    console.log(`[PushNotification] No active subscriptions for user ${notification.userId}`);
    return;
  }
  
  // Store notification in database for retrieval
  await pool.query(`
    INSERT INTO user_notifications (
      user_id, title, body, data, url, icon, is_read, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, false, NOW())
  `, [
    notification.userId,
    notification.title,
    notification.body,
    JSON.stringify(notification.data || {}),
    notification.url,
    notification.icon,
  ]);
  
  // Send to each subscription
  for (const row of subscriptionsResult.rows) {
    try {
      const subscription = row.subscription_data;
      
      // Use web-push library to send notification
      // This requires VAPID keys to be configured
      const webpush = require('web-push');
      
      if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
        webpush.setVapidDetails(
          `mailto:${process.env.VAPID_EMAIL || 'admin@example.com'}`,
          process.env.VAPID_PUBLIC_KEY,
          process.env.VAPID_PRIVATE_KEY
        );
        
        await webpush.sendNotification(subscription, JSON.stringify({
          title: notification.title,
          body: notification.body,
          icon: notification.icon,
          badge: notification.badge,
          data: {
            ...notification.data,
            url: notification.url,
          },
        }));
      }
    } catch (error: any) {
      console.error('[PushNotification] Failed to send:', error.message);
      
      // If subscription is invalid, mark it as inactive
      if (error.statusCode === 410) {
        await pool.query(`
          UPDATE push_subscriptions
          SET is_active = false
          WHERE subscription_data = $1
        `, [row.subscription_data]);
      }
    }
  }
}

// ============================================================
// Scheduled Jobs
// ============================================================

export async function sendAllDailyReports(): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  
  try {
    // Get all children with daily reports enabled
    const childrenResult = await pool.query(`
      SELECT DISTINCT c.id
      FROM users c
      JOIN parental_controls_config pc ON pc.child_user_id = c.id
      WHERE c.account_type = 'child'
        AND c.status = 'active'
        AND pc.send_daily_activity_report = true
        AND pc.is_active = true
    `);
    
    for (const row of childrenResult.rows) {
      try {
        const report = await generateDailyReport(row.id);
        if (report) {
          const email = formatDailyReportEmail(report);
          
          // Send email using your email service
          await sendEmail({
            to: report.parentEmail,
            subject: email.subject,
            html: email.html,
            text: email.text,
          });
          
          sent++;
        }
      } catch (error) {
        console.error(`[DailyReport] Failed for child ${row.id}:`, error);
        failed++;
      }
    }
  } catch (error) {
    console.error('[DailyReport] Failed to send reports:', error);
  }
  
  return { sent, failed };
}

async function sendEmail(options: { to: string; subject: string; html: string; text: string }): Promise<void> {
  // Email sending placeholder - logs to console
  // To enable actual email sending, install @sendgrid/mail or nodemailer
  // and uncomment the appropriate section below
  
  console.log('[Email] Would send email:', {
    to: options.to,
    subject: options.subject,
    // Uncomment to see full content:
    // text: options.text,
  });
  
  // TODO: To enable SendGrid, install @sendgrid/mail and uncomment:
  // if (process.env.SENDGRID_API_KEY) {
  //   const sgMail = require('@sendgrid/mail');
  //   sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  //   await sgMail.send({ ... });
  // }
  
  // TODO: To enable SMTP, install nodemailer and uncomment:
  // if (process.env.SMTP_HOST) {
  //   const nodemailer = require('nodemailer');
  //   const transporter = nodemailer.createTransport({ ... });
  //   await transporter.sendMail({ ... });
  // }
}
