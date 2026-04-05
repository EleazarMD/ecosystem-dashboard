/**
 * Tesla Token Refresh Endpoint
 * 
 * POST /api/tesla/auth/refresh
 * Refreshes expired Tesla access token using refresh token
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

export async function refreshTeslaToken(userId: string): Promise<string | null> {
  try {
    // Get current refresh token and existing scopes
    const result = await pool.query(`
      SELECT refresh_token, scopes
      FROM tesla_tokens
      WHERE user_id = $1
    `, [userId]);

    if (result.rows.length === 0 || !result.rows[0].refresh_token) {
      console.log('[Tesla Refresh] No refresh token found for user:', userId);
      return null;
    }

    const refreshToken = result.rows[0].refresh_token;
    const existingScopes = result.rows[0].scopes || '';
    const { clientId, clientSecret } = await getTeslaCredentials();

    // Request new tokens
    const tokenResponse = await fetch(TESLA_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[Tesla Refresh] Token refresh failed:', tokenResponse.status, errorText);
      return null;
    }

    const tokens = await tokenResponse.json();
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // CRITICAL: Preserve existing scopes - Tesla doesn't return them in refresh response
    // Update tokens in database (keep existing scopes)
    await pool.query(`
      UPDATE tesla_tokens
      SET access_token = $1,
          refresh_token = $2,
          expires_at = $3,
          updated_at = NOW()
      WHERE user_id = $4
    `, [
      tokens.access_token,
      tokens.refresh_token || refreshToken,
      expiresAt,
      userId,
    ]);

    console.log('[Tesla Refresh] Tokens refreshed for user:', userId);
    return tokens.access_token;

  } catch (error: any) {
    console.error('[Tesla Refresh] Error:', error.message);
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = 'default'; // TODO: Get from session

  try {
    const accessToken = await refreshTeslaToken(userId);
    
    if (!accessToken) {
      return res.status(401).json({ 
        error: 'Refresh failed',
        message: 'Could not refresh Tesla token. Please re-authenticate.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
    });

  } catch (error: any) {
    console.error('[Tesla Refresh API] Error:', error.message);
    return res.status(500).json({ error: 'Failed to refresh token' });
  }
}
