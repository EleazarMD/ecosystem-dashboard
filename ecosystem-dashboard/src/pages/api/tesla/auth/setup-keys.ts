/**
 * Tesla Virtual Key Setup
 * 
 * POST /api/tesla/auth/setup-keys
 * Generates EC key pair and registers public key with Tesla Fleet API
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import pool from '@/lib/db';
import { refreshTeslaToken } from './refresh';

const TESLA_KEYS_URL = 'https://fleet-api.prd.na.vn.cloud.tesla.com/api/1/partner_accounts/public_key';

async function getValidToken(userId: string): Promise<string | null> {
  const result = await pool.query(`
    SELECT access_token, refresh_token, expires_at
    FROM tesla_tokens
    WHERE user_id = $1
  `, [userId]);

  if (result.rows.length === 0) return null;
  
  const token = result.rows[0];
  const isExpired = new Date(token.expires_at) < new Date();

  if (isExpired && token.refresh_token) {
    const newToken = await refreshTeslaToken(userId);
    return newToken;
  }

  return isExpired ? null : token.access_token;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = 'default';

  try {
    const accessToken = await getValidToken(userId);
    
    if (!accessToken) {
      return res.status(401).json({ 
        error: 'Not authenticated',
        message: 'Tesla account not connected or token expired',
      });
    }

    // Check if we already have keys
    const existingKeys = await pool.query(`
      SELECT public_key, private_key FROM tesla_keys WHERE user_id = $1
    `, [userId]);

    let publicKeyPem: string;
    let privateKeyPem: string;

    if (existingKeys.rows.length > 0) {
      // Use existing keys
      publicKeyPem = existingKeys.rows[0].public_key;
      privateKeyPem = existingKeys.rows[0].private_key;
      console.log('[Tesla Keys] Using existing key pair');
    } else {
      // Generate new EC key pair (secp256r1 / prime256v1)
      const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
        namedCurve: 'prime256v1',
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem',
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem',
        },
      });

      publicKeyPem = publicKey;
      privateKeyPem = privateKey;

      // Store keys in database
      await pool.query(`
        INSERT INTO tesla_keys (user_id, public_key, private_key, created_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          public_key = EXCLUDED.public_key,
          private_key = EXCLUDED.private_key,
          created_at = NOW()
      `, [userId, publicKeyPem, privateKeyPem]);

      console.log('[Tesla Keys] Generated and stored new key pair');
    }

    // Register public key with Tesla
    const response = await fetch(TESLA_KEYS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        public_key: publicKeyPem,
        domain: process.env.TESLA_DOMAIN || 'rtx-workstation.tailb64e64.ts.net',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Tesla Keys] Registration failed:', response.status, errorText);
      
      // 409 might mean key already registered
      if (response.status === 409) {
        return res.status(200).json({
          success: true,
          message: 'Public key already registered with Tesla',
          alreadyRegistered: true,
        });
      }
      
      return res.status(response.status).json({ 
        error: 'Key registration failed',
        details: errorText,
      });
    }

    const data = await response.json();
    console.log('[Tesla Keys] Public key registered successfully:', data);

    return res.status(200).json({
      success: true,
      message: 'Virtual key setup complete',
      data,
    });

  } catch (error: any) {
    console.error('[Tesla Keys] Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
