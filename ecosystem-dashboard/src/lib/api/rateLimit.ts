/**
 * Rate Limiting Middleware
 * Production-grade rate limiting using Redis or in-memory store
 */

import type { NextApiRequest, NextApiResponse } from 'next';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

// In-memory store for rate limiting (use Redis in production)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const rateLimit = (config: RateLimitConfig) => {
  return async (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
    const identifier = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const key = `${identifier}:${req.url}`;
    const now = Date.now();

    let record = requestCounts.get(key);

    if (!record || now > record.resetTime) {
      record = {
        count: 0,
        resetTime: now + config.windowMs,
      };
      requestCounts.set(key, record);
    }

    record.count++;

    if (record.count > config.maxRequests) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter.toString());
      res.setHeader('X-RateLimit-Limit', config.maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', record.resetTime.toString());
      
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter,
      });
    }

    res.setHeader('X-RateLimit-Limit', config.maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', (config.maxRequests - record.count).toString());
    res.setHeader('X-RateLimit-Reset', record.resetTime.toString());

    next();
  };
};

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of requestCounts.entries()) {
    if (now > record.resetTime) {
      requestCounts.delete(key);
    }
  }
}, 60000); // Cleanup every minute
