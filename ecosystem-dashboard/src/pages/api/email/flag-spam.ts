/**
 * API endpoint for flagging emails as spam or phishing
 * 
 * This endpoint:
 * 1. Records the user's spam/phishing flag locally
 * 2. Forwards to Hermes Core for learning (if available)
 * 3. Optionally quarantines future emails from the sender
 * 
 * POST /api/email/flag-spam
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { hermesFetch, HERMES_URL } from '@/lib/hermes-client';
import fs from 'fs';
import path from 'path';

interface SpamFlag {
  email_id: string;
  flag_type: 'spam' | 'phishing';
  sender_email: string;
  sender_domain: string;
  subject: string;
  indicators: Array<{
    type: string;
    severity: string;
    description?: string;
    message?: string;
  }>;
  brand_impersonation?: {
    detected: boolean;
    claimed_brand: string | null;
    actual_domain: string;
  };
  user_feedback: {
    flagged_at: string;
    reason: string;
  };
}

interface QuarantineRule {
  sender_email?: string;
  sender_domain: string;
  flag_type: 'spam' | 'phishing';
  created_at: string;
  email_ids: string[];
  confidence: number;
}

// Local storage for spam flags (in production, use a database)
const SPAM_FLAGS_FILE = path.join(process.cwd(), 'data', 'spam-flags.json');
const QUARANTINE_RULES_FILE = path.join(process.cwd(), 'data', 'quarantine-rules.json');

function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function loadSpamFlags(): SpamFlag[] {
  try {
    if (fs.existsSync(SPAM_FLAGS_FILE)) {
      return JSON.parse(fs.readFileSync(SPAM_FLAGS_FILE, 'utf-8'));
    }
  } catch (error) {
    console.error('Error loading spam flags:', error);
  }
  return [];
}

function saveSpamFlags(flags: SpamFlag[]) {
  ensureDataDir();
  fs.writeFileSync(SPAM_FLAGS_FILE, JSON.stringify(flags, null, 2));
}

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

function saveQuarantineRules(rules: QuarantineRule[]) {
  ensureDataDir();
  fs.writeFileSync(QUARANTINE_RULES_FILE, JSON.stringify(rules, null, 2));
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const flag: SpamFlag = req.body;

    // Validate required fields
    if (!flag.email_id || !flag.flag_type || !flag.sender_email) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['email_id', 'flag_type', 'sender_email']
      });
    }

    // Load existing flags
    const existingFlags = loadSpamFlags();
    
    // Check if already flagged
    const alreadyFlagged = existingFlags.some(f => f.email_id === flag.email_id);
    if (alreadyFlagged) {
      return res.status(200).json({ 
        success: true,
        message: 'Email already flagged',
        quarantine_enabled: true
      });
    }

    // Add new flag
    existingFlags.push(flag);
    saveSpamFlags(existingFlags);

    // Update quarantine rules
    const quarantineRules = loadQuarantineRules();
    const domain = flag.sender_domain || flag.sender_email.split('@')[1];
    
    // Find existing rule for this domain
    let rule = quarantineRules.find(r => r.sender_domain === domain);
    
    if (rule) {
      // Update existing rule
      rule.email_ids.push(flag.email_id);
      rule.confidence = Math.min(1.0, rule.confidence + 0.1);
      // Escalate to phishing if any flag is phishing
      if (flag.flag_type === 'phishing') {
        rule.flag_type = 'phishing';
      }
    } else {
      // Create new rule
      rule = {
        sender_domain: domain,
        sender_email: flag.sender_email,
        flag_type: flag.flag_type,
        created_at: new Date().toISOString(),
        email_ids: [flag.email_id],
        confidence: flag.flag_type === 'phishing' ? 0.8 : 0.5,
      };
      quarantineRules.push(rule);
    }
    
    saveQuarantineRules(quarantineRules);

    // Try to forward to Hermes Core for learning
    let hermesResponse = null;
    try {
      const response = await hermesFetch('/v1/security/flag-spam', {
        method: 'POST',
        body: JSON.stringify({
          email_id: flag.email_id,
          flag_type: flag.flag_type,
          sender_email: flag.sender_email,
          sender_domain: domain,
          subject: flag.subject,
          indicators: flag.indicators,
          brand_impersonation: flag.brand_impersonation,
          user_feedback: flag.user_feedback,
        }),
      });
      
      if (response.ok) {
        hermesResponse = await response.json();
      }
    } catch (error) {
      // Hermes Core might not have this endpoint yet - that's OK
      console.log('Hermes Core flag-spam endpoint not available, stored locally');
    }

    // Move email to trash (quarantine) via Hermes Core bulk-delete (soft delete)
    let movedToTrash = false;
    try {
      const trashResponse = await hermesFetch(
        `/v1/emails/bulk-delete?sender=${encodeURIComponent(flag.sender_email)}&permanent=false`,
        { method: 'POST' }
      );
      
      if (trashResponse.ok) {
        movedToTrash = true;
        console.log(`[flag-spam] Moved emails from ${flag.sender_email} to trash (quarantine)`);
      } else {
        console.log(`[flag-spam] Failed to move to trash: ${trashResponse.status}`);
      }
    } catch (error) {
      console.log('[flag-spam] Could not move to trash:', error);
    }

    // Return success
    return res.status(200).json({
      success: true,
      message: `Email flagged as ${flag.flag_type}${movedToTrash ? ' and moved to trash' : ''}`,
      quarantine_enabled: true,
      moved_to_trash: movedToTrash,
      quarantine_rule: {
        domain,
        confidence: rule.confidence,
        total_flagged: rule.email_ids.length,
      },
      hermes_synced: !!hermesResponse,
    });

  } catch (error) {
    console.error('Error flagging spam:', error);
    return res.status(500).json({ 
      error: 'Failed to flag email',
      detail: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
