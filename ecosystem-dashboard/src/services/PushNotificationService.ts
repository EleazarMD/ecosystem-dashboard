/**
 * Push Notification Service
 * 
 * Handles push notifications for the approval system.
 * Supports Web Push API for mobile browser notifications.
 */

// VAPID public key (generate your own for production)
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
  vibrate?: number[];
}

class PushNotificationService {
  private registration: ServiceWorkerRegistration | null = null;
  private subscription: PushSubscription | null = null;
  
  /**
   * Check if push notifications are supported
   */
  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }
  
  /**
   * Get the current notification permission
   */
  getPermission(): NotificationPermission | 'unsupported' {
    if (!this.isSupported()) {
      return 'unsupported';
    }
    return Notification.permission;
  }
  
  /**
   * Request notification permission
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      throw new Error('Push notifications not supported');
    }
    
    const permission = await Notification.requestPermission();
    console.log('[PushNotificationService] Permission:', permission);
    return permission;
  }
  
  /**
   * Register service worker and subscribe to push
   */
  async subscribe(userId: string): Promise<PushSubscriptionData | null> {
    if (!this.isSupported()) {
      console.warn('[PushNotificationService] Push not supported');
      return null;
    }
    
    try {
      // Check permission
      if (Notification.permission !== 'granted') {
        const permission = await this.requestPermission();
        if (permission !== 'granted') {
          console.warn('[PushNotificationService] Permission denied');
          return null;
        }
      }
      
      // Register service worker
      this.registration = await navigator.serviceWorker.register('/sw-push.js');
      console.log('[PushNotificationService] Service worker registered');
      
      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      
      // Subscribe to push
      this.subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });
      
      console.log('[PushNotificationService] Subscribed to push');
      
      // Convert subscription to data format
      const subscriptionData: PushSubscriptionData = {
        endpoint: this.subscription.endpoint,
        keys: {
          p256dh: this.arrayBufferToBase64(this.subscription.getKey('p256dh')!),
          auth: this.arrayBufferToBase64(this.subscription.getKey('auth')!),
        },
      };
      
      // Send subscription to server
      await this.saveSubscription(userId, subscriptionData);
      
      return subscriptionData;
      
    } catch (error) {
      console.error('[PushNotificationService] Subscribe error:', error);
      return null;
    }
  }
  
  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(userId: string): Promise<boolean> {
    try {
      if (this.subscription) {
        await this.subscription.unsubscribe();
        this.subscription = null;
      }
      
      // Remove from server
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });
      
      return true;
    } catch (error) {
      console.error('[PushNotificationService] Unsubscribe error:', error);
      return false;
    }
  }
  
  /**
   * Save subscription to server
   */
  private async saveSubscription(userId: string, subscription: PushSubscriptionData): Promise<void> {
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        subscription,
      }),
    });
  }
  
  /**
   * Show a local notification (for testing or when push isn't available)
   */
  async showLocalNotification(payload: PushNotificationPayload): Promise<void> {
    if (!this.isSupported()) {
      console.warn('[PushNotificationService] Notifications not supported');
      return;
    }
    
    if (Notification.permission !== 'granted') {
      console.warn('[PushNotificationService] Permission not granted');
      return;
    }
    
    // Use service worker notification if available
    if (this.registration) {
      // Service worker notifications support extended options
      // Use type assertion for extended notification options (actions, vibrate)
      const options: Record<string, unknown> = {
        body: payload.body,
        icon: payload.icon || '/icons/approval-icon.png',
        badge: payload.badge || '/icons/badge-icon.png',
        tag: payload.tag,
        data: payload.data,
        requireInteraction: payload.requireInteraction,
        vibrate: payload.vibrate || [200, 100, 200],
      };
      
      if (payload.actions) {
        options.actions = payload.actions;
      }
      
      await this.registration.showNotification(payload.title, options as NotificationOptions);
    } else {
      // Fallback to basic notification
      new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/icons/approval-icon.png',
        tag: payload.tag,
        data: payload.data,
      });
    }
  }
  
  /**
   * Show approval notification
   */
  async showApprovalNotification(approval: {
    id: string;
    title: string;
    summary: string;
    priority: string;
    agent_name: string;
  }): Promise<void> {
    const isCritical = approval.priority === 'critical';
    
    await this.showLocalNotification({
      title: isCritical ? '🚨 Critical Approval Required' : '🔐 Approval Required',
      body: `${approval.agent_name}: ${approval.summary}`,
      icon: '/icons/approval-icon.png',
      tag: `approval-${approval.id}`,
      data: {
        type: 'approval',
        approvalId: approval.id,
        url: `/approvals?id=${approval.id}`,
      },
      actions: [
        { action: 'approve', title: '✓ Approve' },
        { action: 'reject', title: '✗ Reject' },
      ],
      requireInteraction: isCritical,
      vibrate: isCritical ? [200, 100, 200, 100, 200] : [200, 100, 200],
    });
  }
  
  // Utility functions
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
  
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
}

// Singleton instance
export const pushNotificationService = new PushNotificationService();

export default pushNotificationService;
