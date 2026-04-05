/**
 * Image Generation Job Submission API
 * 
 * Creates an async image generation job and returns immediately with a jobId.
 * The actual generation is handled by the background worker.
 * Multi-tenant compliant.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { getUserFeatureAccess, checkFeatureAccess } from '@/lib/feature-access';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

interface SubmitJobRequest {
  prompt: string;
  negativePrompt?: string;
  model?: string;
  width?: number;
  height?: number;
  steps?: number;
  cfgScale?: number;
  seed?: number;
}

interface SubmitJobResponse {
  success: boolean;
  jobId?: string;
  status?: string;
  message?: string;
  error?: string;
  blocked?: boolean;
  category?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SubmitJobResponse>
) {
  console.log('[Image Jobs API] Submit request received:', req.method);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  const userId = (session.user as any).id;
  const userType = (session.user as any).accountType || 'adult';
  const isChild = userType === 'child';
  const userSettings = (session.user as any).settings || {};
  const userSafetyLevel = userSettings.safety_level || (isChild ? 'strict' : 'standard');
  const platformRole = (session.user as any).platformRole || null;
  const isPlatformAdmin = platformRole === 'platform-admin';
  
  // Get tenant_id for multi-tenant isolation
  let tenantId = (session.user as any).tenantId || (session.user as any).defaultTenantId || null;
  if (!tenantId) {
    try {
      const tenantResult = await pool.query(
        `SELECT tenant_id FROM tenant_memberships WHERE user_id = $1 ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END LIMIT 1`,
        [userId]
      );
      tenantId = tenantResult.rows[0]?.tenant_id || null;
    } catch (e) {
      console.log('[Image Jobs API] Could not fetch tenant_id:', e);
    }
  }
  console.log('[Image Jobs API] User:', userId, 'Tenant:', tenantId, 'IsChild:', isChild, 'PlatformAdmin:', isPlatformAdmin);

  // Check feature access
  const hasAccess = await checkFeatureAccess(userId, 'image-studio');
  if (!hasAccess) {
    return res.status(403).json({
      success: false,
      error: 'Image Studio access not available in your subscription plan',
      message: 'Please upgrade to Basic or higher to use Image Studio',
    });
  }

  const {
    prompt,
    negativePrompt = '',
    model = 'hidream-i1-full-nf4',
    width = 1024,
    height = 1024,
    steps = 30,
    cfgScale = 7.0,
    seed = -1,
  }: SubmitJobRequest = req.body;

  if (!prompt || prompt.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Prompt is required',
    });
  }

  // Get user's subscription for model restrictions
  const userAccess = await getUserFeatureAccess(userId);
  
  // Safety filtering is handled by Llama Guard in AI Gateway
  console.log(`[Image Jobs API] Safety filtering delegated to AI Gateway (Llama Guard)`);
  console.log(`[Image Jobs API] User tier: ${userAccess.subscriptionTier}`);

  // Apply model restrictions based on subscription tier
  let allowedModel = model;
  const tier = userAccess.subscriptionTier;
  
  if (tier === 'free') {
    allowedModel = 'hidream-i1-fast-nf4';
  } else if (tier === 'basic') {
    if (!['hidream-i1-fast-nf4', 'hidream-i1-dev-nf4'].includes(model)) {
      allowedModel = 'hidream-i1-dev-nf4';
    }
  }
  
  // Ensure -nf4 suffix for HiDream models
  if (allowedModel.startsWith('hidream') && !allowedModel.endsWith('-nf4')) {
    allowedModel = allowedModel + '-nf4';
  }

  // Resource limits based on subscription tier
  // Jobs are processed on-demand immediately, so expiration is just a safety net
  const JOB_LIMITS: Record<string, { maxPending: number; maxDaily: number; timeoutSeconds: number; expiresMinutes: number }> = {
    free: { maxPending: 2, maxDaily: 10, timeoutSeconds: 180, expiresMinutes: 1440 },      // 24 hours
    basic: { maxPending: 5, maxDaily: 50, timeoutSeconds: 300, expiresMinutes: 1440 },     // 24 hours
    pro: { maxPending: 10, maxDaily: 200, timeoutSeconds: 600, expiresMinutes: 1440 },     // 24 hours
    premium: { maxPending: 20, maxDaily: 500, timeoutSeconds: 900, expiresMinutes: 1440 }, // 24 hours
    enterprise: { maxPending: 50, maxDaily: 2000, timeoutSeconds: 1200, expiresMinutes: 1440 }, // 24 hours
  };

  const limits = JOB_LIMITS[tier] || JOB_LIMITS.free;

  try {
    // Platform admins bypass all resource limits
    if (!isPlatformAdmin) {
      // Check pending job count for this user
      const pendingCount = await pool.query(`
        SELECT COUNT(*) FROM image_generation_jobs
        WHERE user_id = $1 AND status IN ('pending', 'processing')
      `, [userId]);

      if (parseInt(pendingCount.rows[0].count) >= limits.maxPending) {
        return res.status(429).json({
          success: false,
          error: 'Too many pending jobs',
          message: `You have ${limits.maxPending} jobs in queue. Please wait for them to complete.`,
        });
      }

      // Check daily job count
      const dailyCount = await pool.query(`
        SELECT COUNT(*) FROM image_generation_jobs
        WHERE user_id = $1 AND created_at > CURRENT_DATE
      `, [userId]);

      if (parseInt(dailyCount.rows[0].count) >= limits.maxDaily) {
        return res.status(429).json({
          success: false,
          error: 'Daily limit reached',
          message: `You've reached your daily limit of ${limits.maxDaily} image generations. Try again tomorrow.`,
        });
      }
    } else {
      console.log('[Image Jobs API] Platform admin - bypassing resource limits');
    }

    // Create the job with expiration and safety level
    const result = await pool.query(`
      INSERT INTO image_generation_jobs (
        user_id, tenant_id, prompt, negative_prompt, model,
        width, height, steps, cfg_scale, seed,
        status, source_service, is_child_request, priority,
        timeout_seconds, expires_at, metadata
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        'pending', 'image-studio', $11, $12,
        $13, CURRENT_TIMESTAMP + ($14 || ' minutes')::INTERVAL, $15
      )
      RETURNING id, status, created_at, expires_at
    `, [
      userId,
      tenantId,
      prompt,
      negativePrompt || null,
      allowedModel,
      width,
      height,
      steps,
      cfgScale,
      seed,
      isChild,
      isChild ? -1 : 0,
      limits.timeoutSeconds,
      limits.expiresMinutes,
      JSON.stringify({ 
        safety_level: userSafetyLevel,
        platform_role: platformRole,
        is_platform_admin: isPlatformAdmin
      })
    ]);

    const job = result.rows[0];
    console.log(`[Image Jobs API] Job created: ${job.id}, expires: ${job.expires_at}`);

    // Trigger job processor asynchronously (non-blocking)
    // This processes the job immediately without making the client wait
    fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8404'}/api/image-studio/jobs/process`, {
      method: 'POST',
      headers: {
        'x-internal-call': 'true',
      },
    }).catch(err => {
      console.error('[Image Jobs API] Failed to trigger job processor:', err);
      // Don't fail the request if processor trigger fails - job will be picked up later
    });

    return res.status(201).json({
      success: true,
      jobId: job.id,
      status: job.status,
      message: 'Image generation job queued. You can navigate away and check back later.',
    });

  } catch (error) {
    console.error('[Image Jobs API] Failed to create job:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to queue image generation job',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};
