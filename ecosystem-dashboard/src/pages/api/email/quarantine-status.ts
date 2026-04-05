/**
 * API endpoint to check quarantine status for a sender
 * 
 * GET /api/email/quarantine-status?sender_email=xxx@example.com
 * GET /api/email/quarantine-status?sender_domain=example.com
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

interface QuarantineRule {
  sender_email?: string;
  sender_domain: string;
  flag_type: 'spam' | 'phishing';
  created_at: string;
  email_ids: string[];
  confidence: number;
}

const QUARANTINE_RULES_FILE = path.join(process.cwd(), 'data', 'quarantine-rules.json');

function loadQuarantineRules(): QuarantineRule[] {
  try {
    if (fs.existsSync(QUARANTINE_RULES_FILE)) {
      return JSON.parse(fs.readFileSync(QUARANTINE_RULES_FILE, 'utf-8'));
    }
  } catch (error) {
    console.error('Error loading quarantine rules:', error);
  }
  return [];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sender_email, sender_domain } = req.query;
    
    if (!sender_email && !sender_domain) {
      return res.status(400).json({ 
        error: 'Missing required parameter',
        required: 'sender_email or sender_domain'
      });
    }

    const rules = loadQuarantineRules();
    const domain = sender_domain as string || (sender_email as string)?.split('@')[1];
    
    // Find matching rule
    const rule = rules.find(r => 
      r.sender_domain === domain || 
      r.sender_email === sender_email
    );

    if (rule) {
      return res.status(200).json({
        quarantined: true,
        flag_type: rule.flag_type,
        confidence: rule.confidence,
        total_flagged: rule.email_ids.length,
        created_at: rule.created_at,
      });
    }

    return res.status(200).json({
      quarantined: false,
    });

  } catch (error) {
    console.error('Error checking quarantine status:', error);
    return res.status(500).json({ 
      error: 'Failed to check quarantine status',
      detail: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
