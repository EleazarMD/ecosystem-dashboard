/**
 * Tesla OAuth Authorization Endpoint
 * 
 * GET /api/tesla/auth/authorize
 * Redirects user to Tesla OAuth consent page
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

const TESLA_AUTH_URL = 'https://auth.tesla.com/oauth2/v3/authorize';
const AI_INFERENCING_URL = process.env.AI_INFERENCING_URL || 'http://localhost:9000';

async function getTeslaClientId(): Promise<string> {
  const res = await fetch(`${AI_INFERENCING_URL}/api/v1/keys/nova-agent/tesla`);
  if (!res.ok) {
    throw new Error('Failed to fetch Tesla client ID from AI Inferencing');
  }
  const data = await res.json();
  return data.apiKey;
}

// All available scopes for full access
const SCOPES = [
  'openid',
  'offline_access',
  'user_data',
  'vehicle_device_data',
  'vehicle_location',
  'vehicle_cmds',
  'vehicle_charging_cmds',
  'energy_device_data',
  'energy_cmds',
].join(' ');

function getRedirectUri(req: NextApiRequest): string {
  // Use env var if set, otherwise auto-detect from request
  if (process.env.TESLA_REDIRECT_URI) {
    return process.env.TESLA_REDIRECT_URI;
  }
  
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:8404';
  return `${protocol}://${host}/api/tesla/auth/callback`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const clientId = await getTeslaClientId();
    const redirectUri = getRedirectUri(req);

    // Generate state for CSRF protection
    const state = crypto.randomBytes(16).toString('hex');
    
    // Store state in cookie for verification on callback
    res.setHeader('Set-Cookie', `tesla_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`);

    // Build authorization URL
    const params = new URLSearchParams({
      client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    state,
    locale: 'en-US',
  });

    const authUrl = `${TESLA_AUTH_URL}?${params.toString()}`;
    
    // Redirect to Tesla OAuth
    res.redirect(302, authUrl);
  } catch (error: any) {
    console.error('[Tesla Auth] Error:', error.message);
    return res.redirect(`/tesla?error=${encodeURIComponent(error.message)}`);
  }
}
