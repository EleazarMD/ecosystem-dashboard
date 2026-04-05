/**
 * API Key Management Endpoint
 * POST /api/ai-inferencing/providers/[providerId]/api-key - Store API key
 * DELETE /api/ai-inferencing/providers/[providerId]/api-key - Delete API key
 */

import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

// Mock encrypted storage (in production, this would be a secure database)
const mockAPIKeyStorage = new Map<string, {
  configured: boolean;
  valid: boolean;
  masked: string;
  lastUsed: string;
  usageCount: number;
  rateLimit: {
    remaining: number;
    resetAt: string;
  };
  encryptedKey: string;
  metadata: {
    createdAt: string;
    permissions: string[];
    rateLimit: number;
  };
}>();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { providerId } = req.query;

  if (!providerId || typeof providerId !== 'string') {
    return res.status(400).json({ error: 'Provider ID is required' });
  }

  // Check API key authentication
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== 'ai-gateway-api-key-2024') {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  switch (req.method) {
    case 'POST':
      return handleStoreAPIKey(req, res, providerId);
    case 'DELETE':
      return handleDeleteAPIKey(req, res, providerId);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleStoreAPIKey(req: NextApiRequest, res: NextApiResponse, providerId: string) {
  const { key, name, permissions, rateLimit } = req.body;

  if (!key || typeof key !== 'string') {
    return res.status(400).json({ error: 'API key is required' });
  }

  try {
    // Encrypt the API key (mock encryption)
    const encryptedKey = encryptAPIKey(key);
    
    // Create masked version for display
    const masked = key.length > 10 
      ? key.substring(0, 8) + '...' + key.slice(-6)
      : key.substring(0, 3) + '...';

    // Store encrypted key with metadata
    const keyData = {
      configured: true,
      valid: true,
      masked,
      lastUsed: new Date().toISOString(),
      usageCount: 0,
      rateLimit: {
        remaining: rateLimit || 1000,
        resetAt: new Date(Date.now() + 60000).toISOString() // 1 minute from now
      },
      encryptedKey,
      metadata: {
        createdAt: new Date().toISOString(),
        permissions: permissions || [],
        rateLimit: rateLimit || 1000
      }
    };

    mockAPIKeyStorage.set(providerId, keyData);

    // Return success response (without the actual key)
    return res.status(200).json({
      success: true,
      providerId,
      masked,
      configured: true,
      message: `API key for ${providerId} configured successfully`
    });
  } catch (error) {
    console.error(`Error storing API key for ${providerId}:`, error);
    return res.status(500).json({ 
      error: 'Storage error',
      message: 'Failed to store API key securely'
    });
  }
}

async function handleDeleteAPIKey(req: NextApiRequest, res: NextApiResponse, providerId: string) {
  try {
    const keyData = mockAPIKeyStorage.get(providerId);
    
    if (!keyData) {
      return res.status(404).json({ 
        error: 'API key not found',
        message: `No API key configured for ${providerId}`
      });
    }

    // Delete the API key
    mockAPIKeyStorage.delete(providerId);

    return res.status(200).json({
      success: true,
      providerId,
      message: `API key for ${providerId} deleted successfully`
    });
  } catch (error) {
    console.error(`Error deleting API key for ${providerId}:`, error);
    return res.status(500).json({ 
      error: 'Deletion error',
      message: 'Failed to delete API key'
    });
  }
}

function encryptAPIKey(key: string): string {
  // Mock encryption - in production, use proper AES-256-GCM encryption
  const algorithm = 'aes-256-cbc';
  const secretKey = 'mock-encryption-key-32-chars-long';
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
  let encrypted = cipher.update(key, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}

function decryptAPIKey(encryptedKey: string): string {
  // Mock decryption - in production, use proper AES-256-GCM decryption
  const algorithm = 'aes-256-cbc';
  const secretKey = 'mock-encryption-key-32-chars-long';
  
  const [ivHex, encrypted] = encryptedKey.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  
  const decipher = crypto.createDecipheriv(algorithm, secretKey, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
