/**
 * Child Art Studio - Async Job Submission API
 * 
 * Creates an async image generation job for children and returns immediately with a jobId.
 * The actual generation is handled by the background worker.
 * Multi-tenant compliant with child-specific safety and parental controls.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { getChildServiceContext, isServiceAllowedForChild } from '@/lib/platform/child-service-middleware';
import { filterChildContent } from '@/lib/platform/content-filter-service';
import { checkPromptSafety } from '@/lib/safety/llm-safety-filter';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

const BLOCKED_IMAGE_TERMS = [
  'scary', 'horror', 'violent', 'blood', 'weapon', 'gun', 'knife',
  'inappropriate', 'adult', 'nsfw', 'nude', 'naked'
];

interface SubmitJobRequest {
  prompt: string;
  style?: string;
  styleLabel?: string;
  styleDescription?: string;
  size?: string;
  sizeRatio?: string;
}

interface SubmitJobResponse {
  success: boolean;
  jobId?: string;
  status?: string;
  message?: string;
  error?: string;
  blocked?: boolean;
  requiresApproval?: boolean;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SubmitJobResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  // Get child service context (handles auth, parental controls, time limits)
  const context = await getChildServiceContext(req, res);
  if (!context) return;

  const { prompt, style, styleLabel, styleDescription, size, sizeRatio } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ 
      success: false,
      error: 'Prompt is required' 
    });
  }

  // Check quota before proceeding
  const quotaCheck = await pool.query(
    'SELECT check_user_quota($1, $2, $3) as result',
    [context.userId, 'image_generation', 2000000] // ~2MB estimated image size
  );
  const quotaResult = quotaCheck.rows[0]?.result;
  
  if (quotaResult && !quotaResult.allowed) {
    return res.status(200).json({
      success: false,
      blocked: true,
      message: quotaResult.message || 'You have reached your image generation limit.',
    });
  }

  // Check if service is allowed
  if (context.accountType === 'child') {
    const serviceCheck = await isServiceAllowedForChild(context.userId, 'image-studio');
    
    if (!serviceCheck.allowed) {
      return res.status(200).json({
        success: false,
        blocked: true,
        message: serviceCheck.reason || 'Art studio is not available right now.',
      });
    }

    if (serviceCheck.requiresApproval) {
      return res.status(200).json({
        success: false,
        requiresApproval: true,
        message: serviceCheck.reason || 'Please ask your parent for permission to use the art studio.',
      });
    }
  }

  // Keyword-based content filtering
  const contentFilter = await filterChildContent(context.userId, prompt, 'input');
  if (!contentFilter.passed) {
    return res.status(200).json({
      success: false,
      blocked: true,
      message: "Let's create something fun and friendly instead! 🎨",
    });
  }

  // Skip LLM safety check here - AI Gateway has Llama Guard for this
  // The job will be filtered by Llama Guard when it's processed by the worker

  // Check for blocked terms
  const lowerPrompt = prompt.toLowerCase();
  for (const term of BLOCKED_IMAGE_TERMS) {
    if (lowerPrompt.includes(term)) {
      return res.status(200).json({
        success: false,
        blocked: true,
        message: "Let's create something fun and friendly instead! What's your favorite animal or place? 🎨",
      });
    }
  }

  try {
    // Get tenant_id for multi-tenant isolation
    let tenantId = null;
    try {
      const tenantResult = await pool.query(
        `SELECT tenant_id FROM tenant_memberships WHERE user_id = $1 ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END LIMIT 1`,
        [context.userId]
      );
      tenantId = tenantResult.rows[0]?.tenant_id || null;
    } catch (e) {
      console.log('[Child Art Jobs API] Could not fetch tenant_id:', e);
    }

    // Check pending job count for this child (limit to 2 concurrent jobs)
    const pendingCount = await pool.query(`
      SELECT COUNT(*) FROM image_generation_jobs
      WHERE user_id = $1 AND status IN ('pending', 'processing')
    `, [context.userId]);

    if (parseInt(pendingCount.rows[0].count) >= 2) {
      return res.status(200).json({
        success: false,
        blocked: true,
        message: 'You have 2 pictures being created! Please wait for them to finish. 🎨',
      });
    }

    // Check daily limit from parental controls (default 20, but can be configured)
    const dailyLimit = context.parentalControls?.dailyImageGenerationLimit || 20;
    const dailyCount = await pool.query(`
      SELECT COUNT(*) FROM image_generation_jobs
      WHERE user_id = $1 AND created_at > CURRENT_DATE
    `, [context.userId]);

    if (parseInt(dailyCount.rows[0].count) >= dailyLimit) {
      return res.status(200).json({
        success: false,
        blocked: true,
        message: "You've created lots of amazing art today! Try again tomorrow. 🌟",
      });
    }

    // Create the job with child-specific metadata
    const result = await pool.query(`
      INSERT INTO image_generation_jobs (
        user_id, tenant_id, prompt, negative_prompt, model,
        width, height, steps, cfg_scale, seed,
        status, source_service, is_child_request, priority,
        timeout_seconds, expires_at, metadata
      ) VALUES (
        $1, $2, $3, $4, $5,
        1024, 1024, 28, 7.0, -1,
        'pending', 'child-art-studio', true, 10,
        300, CURRENT_TIMESTAMP + INTERVAL '60 minutes',
        $6
      )
      RETURNING id, status, created_at, expires_at
    `, [
      context.userId,
      tenantId,
      prompt, // Raw prompt - will be augmented by worker
      '', // No negative prompt (will be added by worker based on child-safe requirements)
      'hidream-i1-full-nf4', // Full quality HiDream model
      JSON.stringify({
        style: style || 'cartoon',
        styleLabel: styleLabel || 'Cartoon',
        styleDescription: styleDescription || 'Fun and colorful',
        size: size || 'square',
        sizeRatio: sizeRatio || '1:1',
        isChildSafe: true,
        requiresAugmentation: true,
      })
    ]);

    const job = result.rows[0];
    console.log(`[Child Art Jobs API] Job created: ${job.id}, expires: ${job.expires_at}`);

    // Track usage time (estimate 5 minutes per image generation for time tracking)
    if (context.accountType === 'child') {
      await pool.query(`
        INSERT INTO child_daily_usage (child_user_id, usage_date, total_minutes, last_activity_at)
        VALUES ($1, CURRENT_DATE, 5, NOW())
        ON CONFLICT (child_user_id, usage_date)
        DO UPDATE SET 
          total_minutes = child_daily_usage.total_minutes + 5,
          last_activity_at = NOW()
      `, [context.userId]);
    }

    return res.status(201).json({
      success: true,
      jobId: job.id,
      status: job.status,
      message: 'Creating your masterpiece! This might take a moment... ✨',
    });

  } catch (error) {
    console.error('[Child Art Jobs API] Failed to create job:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to queue image generation',
      message: 'Oops! Something went wrong. Please try again! 🎨',
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
