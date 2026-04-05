/**
 * Hermes Core API Client
 * 
 * Provides authenticated fetch wrapper for server-side API routes
 * that call Hermes Core directly. Generates short-lived JWT tokens
 * using the shared NEXTAUTH_SECRET / JWT_SECRET.
 */

import jwt from 'jsonwebtoken';

const HERMES_URL = process.env.NEXT_PUBLIC_HERMES_URL || process.env.EMAIL_GRAPHRAG_URL || 'http://localhost:8780';
const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || '';
const DEFAULT_USER_ID = process.env.ADMIN_USER_ID || 'dfd9379f-a9cd-4241-99e7-140f5e89e3cd';

/**
 * Generate a short-lived JWT for Hermes Core service-to-service calls.
 */
export function generateHermesToken(userId?: string): string {
  if (!JWT_SECRET) {
    console.warn('[hermes-client] JWT_SECRET not configured — requests will be unauthenticated');
    return '';
  }

  const payload = {
    sub: userId || DEFAULT_USER_ID,
    userId: userId || DEFAULT_USER_ID,
    email: 'eleazarf@mac.com',
    name: 'Eleazar',
    roles: ['admin'],
    permissions: ['*'],
    platformRole: 'admin',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    iss: 'hermes-core',
  };

  return jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' });
}

/**
 * Build Authorization header object for Hermes Core requests.
 */
export function hermesAuthHeaders(userId?: string): Record<string, string> {
  const token = generateHermesToken(userId);
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

/**
 * Authenticated fetch wrapper for Hermes Core.
 * 
 * Usage:
 *   const data = await hermesFetch('/v1/emails/recent?limit=10');
 *   const data = await hermesFetch('/v1/emails/123', { method: 'PATCH', body: JSON.stringify({...}) });
 */
export async function hermesFetch(
  path: string,
  init?: RequestInit,
  userId?: string,
): Promise<Response> {
  const url = `${HERMES_URL}${path.startsWith('/') ? path : '/' + path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...hermesAuthHeaders(userId),
    ...(init?.headers as Record<string, string> || {}),
  };

  return fetch(url, {
    ...init,
    headers,
  });
}

export { HERMES_URL };
