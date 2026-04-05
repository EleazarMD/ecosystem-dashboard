/**
 * Push Notification Service
 * 
 * Sends push notifications to registered devices for:
 * - Approval requests requiring user action
 * - Security alerts
 * - Critical system events
 * 
 * Supports:
 * - Apple Push Notification Service (APNs) for iOS
 * - Firebase Cloud Messaging (FCM) for Android/Web
 */

import { Pool } from 'pg';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as http2 from 'http2';

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  badge?: number;
  sound?: string;
  category?: string;
  threadId?: string;
  priority?: 'high' | 'normal';
}

export interface DeviceRegistration {
  id: string;
  userId: string;
  deviceToken: string;
  platform: 'ios' | 'android' | 'web';
  deviceName?: string;
  appVersion?: string;
  bundleId?: string;
  createdAt: Date;
  lastUsedAt: Date;
}

export interface PushServiceConfig {
  apns?: {
    keyId: string;
    teamId: string;
    privateKey: string;
    bundleId: string;
    production: boolean;
  };
  fcm?: {
    projectId: string;
    privateKey: string;
    clientEmail: string;
  };
}

/**
 * Push Notification Service
 */
export class PushNotificationService {
  private pool: Pool;
  private config: PushServiceConfig;

  constructor(pool: Pool, config: PushServiceConfig = {}) {
    this.pool = pool;
    this.config = config;
  }

  /**
   * Register a device for push notifications
   */
  async registerDevice(
    userId: string,
    deviceToken: string,
    platform: 'ios' | 'android' | 'web',
    deviceName?: string,
    appVersion?: string
  ): Promise<DeviceRegistration> {
    // device_id derived from token prefix for uniqueness
    const deviceId = `${platform}-${deviceToken.slice(0, 16)}`;
    const result = await this.pool.query(
      `INSERT INTO user_devices (user_id, device_id, push_token, push_token_type, platform, device_name, app_version, last_seen, is_active)
       VALUES ($1, $2, $3, 'apns', $4, $5, $6, NOW(), true)
       ON CONFLICT (user_id, device_id) DO UPDATE SET
         push_token = EXCLUDED.push_token,
         device_name = EXCLUDED.device_name,
         app_version = EXCLUDED.app_version,
         last_seen = NOW(),
         is_active = true
       RETURNING id, user_id, push_token, platform, device_name, app_version, created_at, last_seen`,
      [userId, deviceId, deviceToken, platform, deviceName, appVersion]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      deviceToken: row.push_token,
      platform: row.platform,
      deviceName: row.device_name,
      appVersion: row.app_version,
      createdAt: row.created_at,
      lastUsedAt: row.last_seen,
    };
  }

  /**
   * Unregister a device
   */
  async unregisterDevice(deviceToken: string): Promise<void> {
    await this.pool.query(
      `UPDATE user_devices SET is_active = false WHERE push_token = $1`,
      [deviceToken]
    );
  }

  /**
   * Get all devices for a user
   */
  async getUserDevices(userId: string): Promise<DeviceRegistration[]> {
    // Primary: mobile_devices table (where iOS/Android apps register)
    const mobileResult = await this.pool.query(
      `SELECT id, user_id, device_token, device_type AS platform, device_name, app_version, bundle_id, registered_at AS created_at, last_seen_at AS last_used_at
       FROM mobile_devices
       WHERE user_id = $1 AND is_active = true AND device_token IS NOT NULL
       ORDER BY last_seen_at DESC`,
      [userId]
    );

    // Fallback: user_devices table (web push, etc.)
    const webResult = await this.pool.query(
      `SELECT id, user_id, push_token AS device_token, platform, device_name, app_version, created_at, last_seen AS last_used_at
       FROM user_devices
       WHERE user_id = $1 AND is_active = true AND push_token IS NOT NULL
       ORDER BY last_seen DESC`,
      [userId]
    ).catch(() => ({ rows: [] }));

    const allRows = [...mobileResult.rows, ...webResult.rows];

    return allRows.map(row => ({
      id: String(row.id),
      userId: row.user_id,
      deviceToken: row.device_token,
      platform: row.platform,
      deviceName: row.device_name,
      appVersion: row.app_version,
      bundleId: row.bundle_id ?? undefined,
      createdAt: row.created_at,
      lastUsedAt: row.last_used_at,
    }));
  }

  /**
   * Send push notification to a user's devices
   */
  async sendToUser(
    userId: string,
    payload: PushNotificationPayload
  ): Promise<{ sent: number; failed: number }> {
    const devices = await this.getUserDevices(userId);
    
    let sent = 0;
    let failed = 0;

    for (const device of devices) {
      try {
        await this.sendToDevice(device, payload);
        sent++;
      } catch (error) {
        console.error(`[Push] Failed to send to device ${device.id}:`, error);
        failed++;
        
        // Remove invalid tokens
        if (this.isInvalidTokenError(error)) {
          await this.unregisterDevice(device.deviceToken);
        }
      }
    }

    return { sent, failed };
  }

  /**
   * Send push notification to a specific device
   */
  async sendToDevice(
    device: DeviceRegistration,
    payload: PushNotificationPayload
  ): Promise<void> {
    switch (device.platform) {
      case 'ios':
        await this.sendApns(device.deviceToken, payload, device.bundleId);
        break;
      case 'android':
      case 'web':
        await this.sendFcm(device.deviceToken, payload);
        break;
      default:
        throw new Error(`Unsupported platform: ${device.platform}`);
    }

    // Update last used timestamp in whichever table holds this token
    await this.pool.query(
      `UPDATE mobile_devices SET last_seen_at = NOW() WHERE device_token = $1`,
      [device.deviceToken]
    ).catch(() => {});
    await this.pool.query(
      `UPDATE user_devices SET last_seen = NOW() WHERE push_token = $1`,
      [device.deviceToken]
    ).catch(() => {});
  }

  /**
   * Send notification via Apple Push Notification Service (HTTP/2)
   */
  private async sendApns(
    deviceToken: string,
    payload: PushNotificationPayload,
    deviceBundleId?: string
  ): Promise<void> {
    if (!this.config.apns) {
      console.warn('[Push] APNs not configured, skipping iOS notification');
      return;
    }

    const { keyId, teamId, privateKey, bundleId: defaultBundleId, production } = this.config.apns;
    const bundleId = deviceBundleId || defaultBundleId;

    // Build APNs payload
    const apnsPayload = JSON.stringify({
      aps: {
        alert: {
          title: payload.title,
          body: payload.body,
        },
        badge: payload.badge,
        sound: payload.sound || 'default',
        category: payload.category,
        'thread-id': payload.threadId,
        'mutable-content': 1,
      },
      ...payload.data,
    });

    // Generate JWT for APNs authentication
    const jwt = await this.generateApnsJwt(keyId, teamId, privateKey);

    const host = production
      ? 'api.push.apple.com'
      : 'api.sandbox.push.apple.com';

    // APNs requires HTTP/2
    return new Promise<void>((resolve, reject) => {
      const client = http2.connect(`https://${host}`);

      client.on('error', (err) => {
        client.close();
        reject(new Error(`APNs connection error: ${err.message}`));
      });

      const req = client.request({
        ':method': 'POST',
        ':path': `/3/device/${deviceToken}`,
        'authorization': `bearer ${jwt}`,
        'apns-topic': bundleId,
        'apns-push-type': 'alert',
        'apns-priority': payload.priority === 'high' ? '10' : '5',
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(apnsPayload),
      });

      let responseData = '';
      let statusCode = 0;

      req.on('response', (headers) => {
        statusCode = headers[':status'] as number;
      });

      req.on('data', (chunk: Buffer) => {
        responseData += chunk.toString();
      });

      req.on('end', () => {
        client.close();
        console.log(`[Push] APNs response: status=${statusCode} host=${host} bundle=${bundleId} token=${deviceToken.slice(0, 12)}... body=${responseData || '(empty)'}`);
        if (statusCode === 200) {
          resolve();
        } else {
          reject(new Error(`APNs error: ${statusCode} - ${responseData}`));
        }
      });

      req.on('error', (err) => {
        client.close();
        reject(new Error(`APNs request error: ${err.message}`));
      });

      req.end(apnsPayload);
    });
  }

  /**
   * Send notification via Firebase Cloud Messaging
   */
  private async sendFcm(
    deviceToken: string,
    payload: PushNotificationPayload
  ): Promise<void> {
    if (!this.config.fcm) {
      console.warn('[Push] FCM not configured, skipping Android/Web notification');
      return;
    }

    const { projectId, privateKey, clientEmail } = this.config.fcm;

    // Build FCM payload
    const fcmPayload = {
      message: {
        token: deviceToken,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data,
        android: {
          priority: payload.priority === 'high' ? 'HIGH' : 'NORMAL',
          notification: {
            sound: payload.sound || 'default',
            channelId: payload.category || 'default',
          },
        },
        webpush: {
          notification: {
            icon: '/icon-192.png',
            badge: '/badge-72.png',
          },
        },
      },
    };

    // Generate OAuth2 token for FCM
    const accessToken = await this.generateFcmToken(privateKey, clientEmail);

    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fcmPayload),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`FCM error: ${response.status} - ${JSON.stringify(error)}`);
    }
  }

  /**
   * Generate JWT for APNs authentication using ES256
   */
  private async generateApnsJwt(
    keyId: string,
    teamId: string,
    privateKeyPem: string
  ): Promise<string> {
    const header = Buffer.from(JSON.stringify({
      alg: 'ES256',
      kid: keyId,
    })).toString('base64url');

    const payload = Buffer.from(JSON.stringify({
      iss: teamId,
      iat: Math.floor(Date.now() / 1000),
    })).toString('base64url');

    const signingInput = `${header}.${payload}`;

    const sign = crypto.createSign('SHA256');
    sign.update(signingInput);
    sign.end();

    // Sign with ES256 and convert DER to raw R+S for JWT
    const derSig = sign.sign({ key: privateKeyPem, dsaEncoding: 'ieee-p1363' });
    const signature = derSig.toString('base64url');

    return `${signingInput}.${signature}`;
  }

  /**
   * Generate OAuth2 token for FCM
   */
  private async generateFcmToken(
    privateKey: string,
    clientEmail: string
  ): Promise<string> {
    // Use google-auth-library in production
    // This is a simplified placeholder
    console.warn('[Push] FCM token generation requires google-auth-library');
    return 'fcm-access-token';
  }

  /**
   * Check if error indicates invalid device token
   */
  private isInvalidTokenError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('unregistered') ||
        message.includes('invalid') ||
        message.includes('notregistered') ||
        message.includes('baddevicetoken')
      );
    }
    return false;
  }

  /**
   * Send approval request notification
   */
  async sendApprovalNotification(
    userId: string,
    approvalId: string,
    toolName: string,
    riskLevel: string,
    agentId: string
  ): Promise<void> {
    const payload: PushNotificationPayload = {
      title: `🔐 Approval Required: ${toolName}`,
      body: `Agent ${agentId} wants to execute ${toolName} (${riskLevel} risk)`,
      data: {
        type: 'approval_request',
        approvalId,
        toolName,
        riskLevel,
        agentId,
      },
      category: 'APPROVAL_REQUEST',
      threadId: `approval-${approvalId}`,
      priority: riskLevel === 'critical' || riskLevel === 'high' ? 'high' : 'normal',
      sound: riskLevel === 'critical' ? 'alarm.caf' : 'default',
    };

    await this.sendToUser(userId, payload);
  }

  /**
   * Send security alert notification
   */
  async sendSecurityAlert(
    userId: string,
    alertType: string,
    message: string,
    severity: 'info' | 'warning' | 'error' | 'critical'
  ): Promise<void> {
    const emoji = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '🚨',
      critical: '🔴',
    }[severity];

    const payload: PushNotificationPayload = {
      title: `${emoji} Security Alert`,
      body: message,
      data: {
        type: 'security_alert',
        alertType,
        severity,
      },
      category: 'SECURITY_ALERT',
      priority: severity === 'critical' || severity === 'error' ? 'high' : 'normal',
      sound: severity === 'critical' ? 'alarm.caf' : 'default',
    };

    await this.sendToUser(userId, payload);
  }

  /**
   * Cleanup old device registrations
   */
  async cleanupOldDevices(daysInactive: number = 90): Promise<number> {
    const result = await this.pool.query(
      `DELETE FROM user_devices 
       WHERE last_used_at < NOW() - INTERVAL '${daysInactive} days'
       RETURNING id`
    );
    return result.rowCount ?? 0;
  }
}

/**
 * Create push notification service
 */
export function createPushNotificationService(
  pool: Pool,
  config?: PushServiceConfig
): PushNotificationService {
  return new PushNotificationService(pool, config);
}
