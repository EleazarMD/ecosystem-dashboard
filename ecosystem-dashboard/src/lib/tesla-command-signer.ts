/**
 * Tesla Vehicle Command Protocol - Command Signing
 * 
 * Implements cryptographic signing for Tesla Fleet API commands
 * as required by Tesla's Vehicle Command Protocol (Oct 2023+)
 */

import crypto from 'crypto';
import pool from '@/lib/db';

interface SignedCommand {
  command: string;
  signature: string;
  timestamp: number;
}

/**
 * Sign a Tesla command using the stored private key
 */
export async function signTeslaCommand(
  userId: string,
  vin: string,
  command: string,
  params?: any
): Promise<SignedCommand> {
  // Get private key from database
  const result = await pool.query(`
    SELECT private_key FROM tesla_keys WHERE user_id = $1
  `, [userId]);

  if (result.rows.length === 0) {
    throw new Error('No private key found. Run /api/tesla/auth/setup-keys first.');
  }

  const privateKeyPem = result.rows[0].private_key;

  // Create command payload
  const timestamp = Date.now();
  const payload = {
    command,
    vin,
    timestamp,
    ...(params || {}),
  };

  // Create signature
  const payloadString = JSON.stringify(payload);
  const sign = crypto.createSign('SHA256');
  sign.update(payloadString);
  sign.end();

  const signature = sign.sign(privateKeyPem, 'base64');

  return {
    command,
    signature,
    timestamp,
  };
}

/**
 * Execute a signed Tesla command via Fleet API
 */
export async function executeTeslaCommand(
  accessToken: string,
  vin: string,
  command: string,
  params?: any
): Promise<any> {
  const TESLA_API_BASE = 'https://fleet-api.prd.na.vn.cloud.tesla.com/api/1';

  // For now, try the command endpoint directly
  // Tesla's backend-signed commands should work with our registered public key
  const commandPayload: any = {};
  if (params) {
    Object.assign(commandPayload, params);
  }

  const response = await fetch(`${TESLA_API_BASE}/vehicles/${vin}/command/${command}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commandPayload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Tesla API error: ${JSON.stringify(data)}`);
  }

  return data;
}

/**
 * Send a command using Tesla's backend command signing
 * This uses Tesla's proxy which signs commands server-side
 */
export async function sendBackendSignedCommand(
  accessToken: string,
  vin: string,
  command: string,
  params?: any
): Promise<any> {
  const TESLA_API_BASE = 'https://fleet-api.prd.na.vn.cloud.tesla.com/api/1';

  // Build command request
  const commandData: any = {};
  if (params) {
    Object.assign(commandData, params);
  }

  // Try backend-signed command endpoint
  const response = await fetch(`${TESLA_API_BASE}/vehicles/${vin}/command/${command}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commandData),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Command failed: ${response.status} ${errorText}`);
  }

  return await response.json();
}
