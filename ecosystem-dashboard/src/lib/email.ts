/**
 * Email Service using Nodemailer (SMTP)
 * 
 * Handles transactional emails like password reset, welcome emails, etc.
 * Works with any SMTP server: Gmail, iCloud, self-hosted, etc.
 */

import nodemailer from 'nodemailer';

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'AI Homelab';
const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

// Create reusable transporter
function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for other ports
    auth: { user, pass },
  });
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  const transporter = createTransporter();
  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;

  if (!transporter || !fromEmail) {
    console.warn('[Email] SMTP not configured, logging email instead');
    console.log('[Email] Would send to:', to);
    console.log('[Email] Subject:', subject);
    console.log('[Email] Text:', text?.substring(0, 200));
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const info = await transporter.sendMail({
      from: `${APP_NAME} <${fromEmail}>`,
      to,
      subject,
      html,
      text,
    });

    console.log('[Email] Sent successfully:', info.messageId);
    return { success: true, id: info.messageId };
  } catch (error) {
    console.error('[Email] Send error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to send email' };
  }
}

export async function sendPasswordResetEmail(email: string, resetToken: string) {
  const resetUrl = `${APP_URL}/auth/reset-password?token=${resetToken}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">🔐 Password Reset</h1>
      </div>
      
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
        <p>Hi there,</p>
        
        <p>We received a request to reset your password for your <strong>${APP_NAME}</strong> account.</p>
        
        <p style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
            Reset Password
          </a>
        </p>
        
        <p style="color: #6b7280; font-size: 14px;">
          This link will expire in <strong>1 hour</strong>. If you didn't request this, you can safely ignore this email.
        </p>
        
        <p style="color: #9ca3af; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${resetUrl}" style="color: #667eea; word-break: break-all;">${resetUrl}</a>
        </p>
      </div>
      
      <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
        © ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
      </p>
    </body>
    </html>
  `;

  const text = `
Password Reset Request

Hi there,

We received a request to reset your password for your ${APP_NAME} account.

Click here to reset your password: ${resetUrl}

This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.

© ${new Date().getFullYear()} ${APP_NAME}
  `.trim();

  return sendEmail({
    to: email,
    subject: `Reset your ${APP_NAME} password`,
    html,
    text,
  });
}

export async function sendWelcomeEmail(email: string, name: string) {
  const loginUrl = `${APP_URL}/auth/signin`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">🎉 Welcome to ${APP_NAME}!</h1>
      </div>
      
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
        <p>Hi ${name || 'there'},</p>
        
        <p>Welcome to <strong>${APP_NAME}</strong>! Your account has been created successfully.</p>
        
        <p style="text-align: center; margin: 30px 0;">
          <a href="${loginUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
            Sign In Now
          </a>
        </p>
        
        <p>If you have any questions, feel free to reach out!</p>
      </div>
      
      <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
        © ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
      </p>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `Welcome to ${APP_NAME}!`,
    html,
  });
}
