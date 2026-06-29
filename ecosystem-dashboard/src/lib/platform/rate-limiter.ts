/**
 * Rate Limiter — P2.10
 * ============================================================================
 * Simple in-memory rate limiter for API routes.
 * Limits per-IP and per-account (email/userId) to blunt credential stuffing
 * and token enumeration.
 *
 * Usage:
 *   import { checkRateLimit } from '@/lib/platform/rate-limiter';
 *
 *   const ip = getIP(req);
 *   if (!checkRateLimit(`signup:ip:${ip}`, 5, 15 * 60 * 1000)) {
 *     return res.status(429).json({ error: 'Too many requests' });
 *   }
 *
 * For production, replace with Redis-backed limiter.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup expired entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  store.forEach((entry, key) => {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  });
}

/**
 * Check if a request is within the rate limit.
 * Returns true if allowed, false if rate-limited.
 * Increments the counter on each call.
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): boolean {
  cleanup();
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count++;
  return true;
}

/**
 * Get client IP from request headers.
 */
export function getIP(req: { headers: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } }): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

/**
 * Rate limit configurations for specific endpoints.
 */
export const RATE_LIMITS = {
  signup: { maxRequests: 5, windowMs: 15 * 60 * 1000 },      // 5 per 15 min
  mobileLogin: { maxRequests: 10, windowMs: 15 * 60 * 1000 }, // 10 per 15 min
  refresh: { maxRequests: 30, windowMs: 15 * 60 * 1000 },     // 30 per 15 min
  devicePairing: { maxRequests: 5, windowMs: 10 * 60 * 1000 }, // 5 per 10 min
  revoke: { maxRequests: 10, windowMs: 5 * 60 * 1000 },       // 10 per 5 min
};
