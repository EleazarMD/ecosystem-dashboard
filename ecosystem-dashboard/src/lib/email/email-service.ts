/**
 * Email Service
 * 
 * Centralized email sending service with template support
 * Currently logs to console in Beta mode - can be connected to SendGrid/SMTP later
 */

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

const APP_NAME = 'AI Homelab';
const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';
const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@aihomelab.local';

/**
 * Send an email (logs to console in Beta mode)
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string }> {
  const { to, subject, html, text, from = FROM_EMAIL } = options;

  // Log email for Beta mode
  console.log('[Email Service] Sending email:', {
    to,
    subject,
    from,
    preview: text?.substring(0, 100) || html.substring(0, 100),
  });

  // Store in database for tracking
  try {
    await pool.query(`
      INSERT INTO email_log (recipient, subject, status, sent_at)
      VALUES ($1, $2, 'sent', NOW())
    `, [to, subject]);
  } catch (e) {
    // Table might not exist yet, that's ok
  }

  // TODO: Enable actual email sending when ready
  // SendGrid:
  // if (process.env.SENDGRID_API_KEY) {
  //   const sgMail = require('@sendgrid/mail');
  //   sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  //   const result = await sgMail.send({ to, from, subject, html, text });
  //   return { success: true, messageId: result[0].headers['x-message-id'] };
  // }

  // SMTP/Nodemailer:
  // if (process.env.SMTP_HOST) {
  //   const nodemailer = require('nodemailer');
  //   const transporter = nodemailer.createTransport({
  //     host: process.env.SMTP_HOST,
  //     port: parseInt(process.env.SMTP_PORT || '587'),
  //     auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  //   });
  //   const result = await transporter.sendMail({ to, from, subject, html, text });
  //   return { success: true, messageId: result.messageId };
  // }

  return { success: true, messageId: `beta-${Date.now()}` };
}

/**
 * Family Invitation Email Template
 */
export function getFamilyInviteEmail(params: {
  inviteeName: string;
  inviterName: string;
  familyName: string;
  role: string;
  inviteLink: string;
  expiresAt: string;
}): EmailTemplate {
  const { inviteeName, inviterName, familyName, role, inviteLink, expiresAt } = params;
  const roleName = role === 'family-organizer' ? 'Family Organizer' : 'Family Adult';
  const expiryDate = new Date(expiresAt).toLocaleDateString();

  const subject = `${inviterName} invited you to join ${familyName}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Family Invitation</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">👨‍👩‍👧‍👦 Family Invitation</h1>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
    <p style="font-size: 18px; margin-top: 0;">Hi${inviteeName ? ` ${inviteeName}` : ''},</p>
    
    <p><strong>${inviterName}</strong> has invited you to join <strong>${familyName}</strong> on ${APP_NAME}.</p>
    
    <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 0 0 10px 0;"><strong>Family:</strong> ${familyName}</p>
      <p style="margin: 0 0 10px 0;"><strong>Your Role:</strong> ${roleName}</p>
      <p style="margin: 0;"><strong>Expires:</strong> ${expiryDate}</p>
    </div>
    
    <p>As a ${roleName}, you'll be able to:</p>
    <ul style="color: #555;">
      ${role === 'family-organizer' ? `
        <li>Manage family settings and billing</li>
        <li>Invite and remove family members</li>
        <li>Set up and manage child accounts</li>
        <li>Configure parental controls</li>
      ` : `
        <li>Access all family features</li>
        <li>Help manage child accounts</li>
        <li>View activity reports</li>
      `}
    </ul>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${inviteLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Accept Invitation
      </a>
    </div>
    
    <p style="color: #666; font-size: 14px;">
      Or copy this link: <a href="${inviteLink}" style="color: #667eea;">${inviteLink}</a>
    </p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    
    <p style="color: #888; font-size: 12px; margin-bottom: 0;">
      This invitation expires on ${expiryDate}. If you didn't expect this invitation, you can safely ignore this email.
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #888; font-size: 12px;">
    <p style="margin: 0;">${APP_NAME}</p>
  </div>
</body>
</html>
  `.trim();

  const text = `
Family Invitation

Hi${inviteeName ? ` ${inviteeName}` : ''},

${inviterName} has invited you to join ${familyName} on ${APP_NAME}.

Family: ${familyName}
Your Role: ${roleName}
Expires: ${expiryDate}

Accept the invitation here: ${inviteLink}

This invitation expires on ${expiryDate}.
  `.trim();

  return { subject, html, text };
}

/**
 * Welcome to Family Email Template
 */
export function getWelcomeToFamilyEmail(params: {
  memberName: string;
  familyName: string;
  role: string;
  dashboardLink: string;
}): EmailTemplate {
  const { memberName, familyName, role, dashboardLink } = params;
  const roleName = role === 'family-organizer' ? 'Family Organizer' : 'Family Adult';

  const subject = `Welcome to ${familyName}!`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Welcome to the Family</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">🎉 Welcome to the Family!</h1>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
    <p style="font-size: 18px; margin-top: 0;">Hi ${memberName},</p>
    
    <p>You've successfully joined <strong>${familyName}</strong> as a <strong>${roleName}</strong>.</p>
    
    <p>You can now:</p>
    <ul style="color: #555;">
      <li>Access shared family content</li>
      <li>Help manage child accounts</li>
      <li>View activity and usage reports</li>
      <li>Use all family features</li>
    </ul>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${dashboardLink}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600;">
        Go to Family Dashboard
      </a>
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
Welcome to ${familyName}!

Hi ${memberName},

You've successfully joined ${familyName} as a ${roleName}.

Go to your family dashboard: ${dashboardLink}
  `.trim();

  return { subject, html, text };
}

/**
 * Daily Activity Report Email Template
 */
export function getDailyReportEmail(params: {
  parentName: string;
  childName: string;
  date: string;
  totalMinutes: number;
  conversationCount: number;
  blockedAttempts: number;
  topTopics: string[];
  dashboardLink: string;
}): EmailTemplate {
  const { parentName, childName, date, totalMinutes, conversationCount, blockedAttempts, topTopics, dashboardLink } = params;

  const subject = `Daily Activity Report for ${childName} - ${date}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Daily Activity Report</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">📊 Daily Activity Report</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">${childName} • ${date}</p>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
    <p style="margin-top: 0;">Hi ${parentName},</p>
    
    <p>Here's ${childName}'s activity summary for ${date}:</p>
    
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0;">
      <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; text-align: center;">
        <div style="font-size: 24px; font-weight: bold; color: #3b82f6;">${totalMinutes}m</div>
        <div style="font-size: 12px; color: #666;">Total Usage</div>
      </div>
      <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; text-align: center;">
        <div style="font-size: 24px; font-weight: bold; color: #10b981;">${conversationCount}</div>
        <div style="font-size: 12px; color: #666;">Conversations</div>
      </div>
      <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; text-align: center;">
        <div style="font-size: 24px; font-weight: bold; color: ${blockedAttempts > 0 ? '#ef4444' : '#10b981'};">${blockedAttempts}</div>
        <div style="font-size: 12px; color: #666;">Blocked</div>
      </div>
    </div>
    
    ${topTopics.length > 0 ? `
      <p><strong>Topics explored:</strong></p>
      <p style="color: #555;">${topTopics.join(', ')}</p>
    ` : ''}
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${dashboardLink}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">
        View Full Report
      </a>
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
Daily Activity Report for ${childName} - ${date}

Hi ${parentName},

Here's ${childName}'s activity summary:

- Total Usage: ${totalMinutes} minutes
- Conversations: ${conversationCount}
- Blocked Attempts: ${blockedAttempts}
${topTopics.length > 0 ? `- Topics: ${topTopics.join(', ')}` : ''}

View full report: ${dashboardLink}
  `.trim();

  return { subject, html, text };
}
