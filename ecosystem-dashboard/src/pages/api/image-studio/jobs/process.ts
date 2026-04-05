/**
 * Image Generation Job Processor API
 * 
 * Processes pending image generation jobs from the queue.
 * Called by a cron job or can be triggered manually.
 * Sends jobs to ComfyUI/AI Inferencing service for actual generation.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

// AI Inferencing service URL (ComfyUI proxy)
const AI_INFERENCING_URL = process.env.AI_INFERENCING_URL || 'http://localhost:9000';

interface ProcessResponse {
  success: boolean;
  processed?: number;
  failed?: number;
  message?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ProcessResponse>
) {
  // Allow GET for cron jobs, POST for manual triggers
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  // Simple auth check - allow cron jobs with secret or internal calls
  const cronSecret = req.headers['x-cron-secret'] || req.query.secret;
  const isInternal = req.headers['x-internal-call'] === 'true';
  
  if (!cronSecret && !isInternal && process.env.NODE_ENV === 'production') {
    // In production, require auth
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
    });
  }

  try {
    // First, clean up expired jobs
    const expiredResult = await pool.query(`
      UPDATE image_generation_jobs
      SET status = 'failed',
          error_message = 'Job expired',
          completed_at = CURRENT_TIMESTAMP
      WHERE status IN ('pending', 'processing')
        AND expires_at IS NOT NULL
        AND expires_at < CURRENT_TIMESTAMP
      RETURNING id
    `);

    if (expiredResult.rows.length > 0) {
      console.log(`[Job Processor] Cleaned up ${expiredResult.rows.length} expired jobs`);
    }

    // Fetch pending jobs (limit to 5 at a time to avoid overload)
    const pendingResult = await pool.query(`
      SELECT id, user_id, tenant_id, prompt, negative_prompt, model,
             width, height, steps, cfg_scale, seed, metadata,
             source_service, is_child_request, priority
      FROM image_generation_jobs
      WHERE status = 'pending'
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
      ORDER BY priority DESC, created_at ASC
      LIMIT 5
    `);

    if (pendingResult.rows.length === 0) {
      return res.status(200).json({
        success: true,
        processed: 0,
        message: 'No pending jobs to process',
      });
    }

    console.log(`[Job Processor] Found ${pendingResult.rows.length} pending jobs`);

    let processed = 0;
    let failed = 0;

    for (const job of pendingResult.rows) {
      try {
        // Mark job as processing
        await pool.query(`
          UPDATE image_generation_jobs
          SET status = 'processing',
              progress = jsonb_build_object('percent', 10, 'message', 'Starting generation...')
          WHERE id = $1
        `, [job.id]);

        // Process the job
        const result = await processImageJob(job);

        if (result.success) {
          // Save image to gallery (generated_images table)
          try {
            const imageInsertResult = await pool.query(`
              INSERT INTO generated_images (
                user_id, tenant_id, prompt, negative_prompt, model,
                width, height, steps, cfg_scale, seed,
                filename, file_path, source_service, generation_time_ms,
                visibility, is_child_generated, content_filter_applied
              ) VALUES (
                $1, $2, $3, $4, $5,
                $6, $7, $8, $9, $10,
                $11, $12, $13, $14,
                $15, $16, $17
              )
              RETURNING id
            `, [
              job.user_id,
              job.tenant_id,
              job.prompt,
              job.negative_prompt || null,
              job.model,
              job.width,
              job.height,
              job.steps,
              job.cfg_scale,
              job.seed,
              result.filename,
              result.imageUrl,
              job.source_service || 'comfyui',
              null, // generation_time_ms will be calculated from job timing
              'private',
              job.is_child_request || false,
              true // content_filter_applied (safety check done by AI Gateway)
            ]);
            
            const generatedImageId = imageInsertResult.rows[0].id;
            console.log(`[Job Processor] Saved image to gallery: ${generatedImageId}`);
            
            // Mark job as completed with reference to generated image
            await pool.query(`
              UPDATE image_generation_jobs
              SET status = 'completed',
                  progress = jsonb_build_object('percent', 100, 'message', 'Complete!'),
                  result_url = $2,
                  result_filename = $3,
                  generated_image_id = $4,
                  completed_at = CURRENT_TIMESTAMP,
                  generation_time_ms = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - started_at)) * 1000
              WHERE id = $1
            `, [job.id, result.imageUrl, result.filename, generatedImageId]);
          } catch (dbError) {
            console.error(`[Job Processor] Failed to save image to gallery:`, dbError);
            // Still mark job as completed even if gallery save fails
            await pool.query(`
              UPDATE image_generation_jobs
              SET status = 'completed',
                  progress = jsonb_build_object('percent', 100, 'message', 'Complete!'),
                  result_url = $2,
                  result_filename = $3,
                  completed_at = CURRENT_TIMESTAMP,
                  generation_time_ms = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - started_at)) * 1000
              WHERE id = $1
            `, [job.id, result.imageUrl, result.filename]);
          }
          
          processed++;
          console.log(`[Job Processor] Job ${job.id} completed successfully`);
        } else {
          // Mark as failed
          await pool.query(`
            UPDATE image_generation_jobs
            SET status = 'failed',
                progress = jsonb_build_object('percent', 0, 'message', 'Failed'),
                error_message = $2
            WHERE id = $1
          `, [job.id, result.error || 'Unknown error']);
          
          failed++;
          console.error(`[Job Processor] Job ${job.id} failed:`, result.error);
        }
      } catch (jobError: any) {
        // Mark individual job as failed
        await pool.query(`
          UPDATE image_generation_jobs
          SET status = 'failed',
              progress = jsonb_build_object('percent', 0, 'message', 'Error'),
              error_message = $2
          WHERE id = $1
        `, [job.id, jobError.message || 'Processing error']);
        
        failed++;
        console.error(`[Job Processor] Job ${job.id} error:`, jobError);
      }
    }

    return res.status(200).json({
      success: true,
      processed,
      failed,
      message: `Processed ${processed} jobs, ${failed} failed`,
    });

  } catch (error: any) {
    console.error('[Job Processor] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to process jobs',
    });
  }
}

interface JobData {
  id: string;
  user_id: string;
  tenant_id: string | null;
  prompt: string;
  negative_prompt: string;
  model: string;
  width: number;
  height: number;
  steps: number;
  cfg_scale: number;
  seed: number;
  metadata: any;
  source_service: string;
  is_child_request: boolean;
  priority: number;
}

interface ProcessResult {
  success: boolean;
  imageUrl?: string;
  filename?: string;
  error?: string;
}

async function processImageJob(job: JobData): Promise<ProcessResult> {
  const metadata = job.metadata || {};
  const isPlatformAdmin = metadata.is_platform_admin || false;
  
  // Build the prompt with style augmentation for child requests
  let finalPrompt = job.prompt;
  let finalNegativePrompt = job.negative_prompt || '';
  
  if (job.is_child_request) {
    // Augment prompt with child-safe style
    const styleDescription = metadata.styleDescription || 'fun and colorful cartoon style';
    finalPrompt = `${job.prompt}, ${styleDescription}, child-friendly, safe for kids, wholesome, bright colors`;
    finalNegativePrompt = 'nsfw, nude, violence, gore, scary, dark, disturbing, inappropriate, adult content';
  }

  // Update progress to 20%
  await pool.query(`
    UPDATE image_generation_jobs
    SET progress = jsonb_build_object('percent', 20, 'message', 'Preparing image...')
    WHERE id = $1
  `, [job.id]);

  try {
    // Call AI Inferencing service (ComfyUI proxy)
    const response = await fetch(`${AI_INFERENCING_URL}/v1/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Call': 'true',
        'X-User-Id': job.user_id,
        'X-Tenant-Id': job.tenant_id || '',
        'X-Platform-Role': metadata.platform_role || '',
        'X-Is-Platform-Admin': isPlatformAdmin ? 'true' : 'false',
      },
      body: JSON.stringify({
        prompt: finalPrompt,
        negative_prompt: finalNegativePrompt,
        model: job.model || 'hidream-i1-full-nf4',
        width: parseInt(String(job.width || 1024)),
        height: parseInt(String(job.height || 1024)),
        steps: parseInt(String(job.steps || 28)),
        cfg_scale: parseFloat(String(job.cfg_scale || 5.0)),
        seed: parseInt(String(job.seed || -1)),
        jobId: job.id,
        userId: job.user_id,
        tenantId: job.tenant_id,
        isChildRequest: job.is_child_request,
        isPlatformAdmin: isPlatformAdmin,
      }),
    });

    // Update progress to 50%
    await pool.query(`
      UPDATE image_generation_jobs
      SET progress = jsonb_build_object('percent', 50, 'message', 'Generating image...')
      WHERE id = $1
    `, [job.id]);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Job Processor] AI Inferencing error for job ${job.id}:`, errorText);
      return {
        success: false,
        error: `AI service error: ${response.status}`,
      };
    }

    const result = await response.json();
    console.log('[Job Processor] AI Inferencing response:', JSON.stringify(result, null, 2));

    // Update progress to 90%
    await pool.query(`
      UPDATE image_generation_jobs
      SET progress = jsonb_build_object('percent', 90, 'message', 'Finishing up...')
      WHERE id = $1
    `, [job.id]);

    // AI Inferencing returns OpenAI-compatible format: { created, data: [{url, _filename, ...}] }
    if (result.data && Array.isArray(result.data) && result.data.length > 0) {
      const imageData = result.data[0];
      const imageUrl = imageData.url;
      const filename = imageData._filename || imageData.filename;
      
      if (imageUrl && filename) {
        // Convert AI Inferencing URL to dashboard's image proxy endpoint
        // From: /v1/images/view?filename=...&subfolder=...&type=...
        // To: /api/image-studio/image?filename=...&subfolder=...&type=...
        let proxyUrl = imageUrl;
        
        if (imageUrl.includes('/v1/images/view')) {
          // Extract query parameters from AI Inferencing URL
          const urlObj = new URL(imageUrl, AI_INFERENCING_URL);
          const params = urlObj.searchParams;
          
          // Build dashboard proxy URL
          proxyUrl = `/api/image-studio/image?filename=${params.get('filename') || ''}&subfolder=${params.get('subfolder') || ''}&type=${params.get('type') || 'output'}`;
        }
        
        return {
          success: true,
          imageUrl: proxyUrl,
          filename,
        };
      }
    }
    
    return {
      success: false,
      error: result.error?.message || 'No image returned',
    };
  } catch (fetchError: any) {
    console.error(`[Job Processor] Fetch error for job ${job.id}:`, fetchError);
    return {
      success: false,
      error: `Connection error: ${fetchError.message}`,
    };
  }
}
