/**
 * Mobile App Authentication Helper
 * Validates X-API-Key header for mobile app access (GooseMind iOS)
 * Uses the same API key as AI Gateway for consistency
 */

import type { NextApiRequest } from 'next';

// Mobile apps use the AI Gateway API key for authentication
const MOBILE_API_KEY = process.env.AI_GATEWAY_API_KEY || 'ai-gateway-api-key-2024';

// Default user ID for mobile app requests (primary user)
const MOBILE_DEFAULT_USER_ID = process.env.ADMIN_USER_ID || process.env.MOBILE_DEFAULT_USER_ID || 'dfd9379f-a9cd-4241-99e7-140f5e89e3cd';

export interface MobileAuthResult {
  authenticated: boolean;
  userId?: string;
  source: 'session' | 'api-key' | 'mobile-header' | 'none';
}

/**
 * Validate mobile app authentication via X-API-Key header
 * Returns the default user ID if API key is valid
 */
export function validateMobileApiKey(req: NextApiRequest): MobileAuthResult {
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    return { authenticated: false, source: 'none' };
  }
  
  if (apiKey === MOBILE_API_KEY) {
    return {
      authenticated: true,
      userId: MOBILE_DEFAULT_USER_ID,
      source: 'api-key',
    };
  }
  
  return { authenticated: false, source: 'none' };
}

/**
 * Validate mobile app via X-Client + X-User-ID headers (no API key needed)
 * Trusted clients like Hyperspace-iOS identify themselves with these headers
 */
export function validateMobileClient(req: NextApiRequest): MobileAuthResult {
  const client = req.headers['x-client'] as string;
  const userId = req.headers['x-user-id'] as string;
  
  // Only trust known mobile clients
  const trustedClients = ['Hyperspace-iOS', 'Hyperspace-iPadOS', 'Hyperspace-macOS'];
  if (client && trustedClients.includes(client) && userId) {
    return {
      authenticated: true,
      userId: MOBILE_DEFAULT_USER_ID,
      source: 'mobile-header',
    };
  }
  
  return { authenticated: false, source: 'none' };
}

/**
 * Get user ID from either session, API key, or mobile client headers
 * Priority: session > API key > trusted mobile client headers
 */
export function getMobileOrSessionUserId(
  sessionUserId: string | undefined,
  req: NextApiRequest
): string | null {
  // Session auth takes priority
  if (sessionUserId) {
    return sessionUserId;
  }
  
  // Fall back to API key auth for mobile
  const mobileAuth = validateMobileApiKey(req);
  if (mobileAuth.authenticated && mobileAuth.userId) {
    return mobileAuth.userId;
  }
  
  // Fall back to trusted mobile client headers (X-Client + X-User-ID)
  const clientAuth = validateMobileClient(req);
  if (clientAuth.authenticated && clientAuth.userId) {
    return clientAuth.userId;
  }
  
  return null;
}
