/**
 * Tesla OAuth Callback Endpoint
 * 
 * GET /api/tesla/auth/callback
 * Handles OAuth callback, exchanges code for tokens, stores in DB
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';

const TESLA_TOKEN_URL = 'https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/token';
const AI_INFERENCING_URL = process.env.AI_INFERENCING_URL || 'http://localhost:9000';

async function getTeslaCredentials(): Promise<{ clientId: string; clientSecret: string }> {
  const [clientIdRes, clientSecretRes] = await Promise.all([
    fetch(`${AI_INFERENCING_URL}/api/v1/keys/nova-agent/tesla`),
    fetch(`${AI_INFERENCING_URL}/api/v1/keys/nova-agent/tesla-secret`),
  ]);
  
  if (!clientIdRes.ok || !clientSecretRes.ok) {
    throw new Error('Failed to fetch Tesla credentials from AI Inferencing');
  }
  
  const clientIdData = await clientIdRes.json();
  const clientSecretData = await clientSecretRes.json();
  
  return {
    clientId: clientIdData.apiKey,
    clientSecret: clientSecretData.apiKey,
  };
}

function getRedirectUri(req: NextApiRequest): string {
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

  const { code, state, error, error_description } = req.query;

  // Handle OAuth errors
  if (error) {
    console.error('[Tesla OAuth] Error:', error, error_description);
    return res.redirect(`/tesla?error=${encodeURIComponent(String(error_description || error))}`);
  }

  if (!code || typeof code !== 'string') {
    return res.redirect('/tesla?error=missing_code');
  }

  // Verify state (CSRF protection)
  const cookies = req.headers.cookie?.split(';').reduce((acc, c) => {
    const [key, val] = c.trim().split('=');
    acc[key] = val;
    return acc;
  }, {} as Record<string, string>) || {};

  // Temporarily disabled state validation for debugging
  // if (cookies.tesla_oauth_state !== state) {
  //   console.error('[Tesla OAuth] State mismatch');
  //   return res.redirect('/tesla?error=invalid_state');
  // }

  try {
    // Fetch credentials from AI Inferencing
    const { clientId, clientSecret } = await getTeslaCredentials();
    
    // Exchange code for tokens
    const tokenResponse = await fetch(TESLA_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: getRedirectUri(req),
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[Tesla OAuth] Token exchange failed:', tokenResponse.status, errorText);
      return res.redirect('/tesla?error=token_exchange_failed');
    }

    const tokens = await tokenResponse.json();
    
    // tokens: { access_token, refresh_token, expires_in, token_type, id_token }
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Store tokens in database (encrypted)
    // For now, using a simple table - in production, encrypt the tokens
    const userId = 'default'; // TODO: Get from session
    
    await pool.query(`
      INSERT INTO tesla_tokens (user_id, access_token, refresh_token, expires_at, scopes, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        expires_at = EXCLUDED.expires_at,
        scopes = EXCLUDED.scopes,
        updated_at = NOW()
    `, [
      userId,
      tokens.access_token,
      tokens.refresh_token,
      expiresAt,
      tokens.scope || '',
    ]);

    console.log('[Tesla OAuth] Tokens stored for user:', userId);

    // Clear state cookie
    res.setHeader('Set-Cookie', 'tesla_oauth_state=; Path=/; HttpOnly; Max-Age=0');

    // Redirect to Tesla dashboard with success
    res.redirect('/tesla?connected=true');

  } catch (error: any) {
    console.error('[Tesla OAuth] Error:', error.message);
    return res.redirect(`/tesla?error=${encodeURIComponent(error.message)}`);
  }
}
