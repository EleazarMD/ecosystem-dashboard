/**
 * Child Art Studio — Gemini Image Generation API
 *
 * Child-safe image generation endpoint that connects to Google Imagen
 * (Gemini). Follows the FSD Agentic Harness safety pipeline:
 *   1. Authenticate child service context
 *   2. Filter prompt through child content filter
 *  3. Call Gemini Imagen with child-safe parameters
 *   4. Save image to disk + record in generated_images
 *   5. Log activity for parental oversight
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';
import {
  getChildServiceContext,
  isServiceAllowedForChild,
} from '@/lib/platform/child-service-middleware';
import { filterChildContent } from '@/lib/platform/content-filter-service';
import { v4 as uuidv4 } from 'uuid';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

const GEMINI_API_KEY = process.env.CHILD_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
const GEMINI_IMAGEN_URL = 'https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict';

const ART_IMAGE_DIR = process.env.CHILD_ART_IMAGE_DIR || '/home/eleazar/Projects/AIHomelab/data/images/child-art';

export const config = {
  api: {
    bodyParser: { sizeLimit: '1mb' },
    responseLimit: false,
  },
  maxDuration: 120,
};

interface GenerateRequest {
  prompt: string;
  style?: string;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3';
  enhancePrompt?: boolean;
}

interface GenerateResponse {
  success?: boolean;
  imageUrl?: string;
  imageId?: string;
  prompt?: string;
  error?: string;
  blocked?: boolean;
  requiresApproval?: boolean;
  message?: string;
}

const STYLE_PROMPTS: Record<string, string> = {
  cartoon: 'cartoon illustration, bold outlines, vibrant colors, playful, kid-friendly, wholesome',
  watercolor: 'soft watercolor painting, gentle brushstrokes, dreamy pastel colors, artistic, kid-friendly',
  pixel: 'pixel art, retro 8-bit game style, bright colors, cute sprites, kid-friendly',
  storybook: 'storybook illustration, whimsical fairy tale art, warm colors, magical, kid-friendly',
  '3d': '3D render, smooth surfaces, Pixar-like quality, cheerful lighting, kid-friendly',
};

const ASPECT_RATIOS: Record<string, string> = {
  '1:1': '1:1',
  '16:9': '16:9',
  '9:16': '9:16',
  '4:3': '4:3',
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GenerateResponse>,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const context = await getChildServiceContext(req, res);
  if (!context) return;

  const { prompt, style = 'cartoon', aspectRatio = '1:1', enhancePrompt = true } = req.body as GenerateRequest;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  // Check service access
  if (context.accountType === 'child') {
    const serviceCheck = await isServiceAllowedForChild(context.userId, 'image-studio');
    if (!serviceCheck.allowed) {
      return res.status(200).json({
        blocked: true,
        message: serviceCheck.reason || 'Art studio is not available right now.',
      });
    }
    if (serviceCheck.requiresApproval) {
      return res.status(200).json({
        requiresApproval: true,
        message: serviceCheck.reason || 'Please ask your parent for permission to create art.',
      });
    }
  }

  // Filter prompt
  const filterResult = await filterChildContent(context.userId, prompt, 'input');
  if (!filterResult.passed) {
    return res.status(200).json({
      blocked: true,
      message: "Let's create something fun and friendly instead! 🎨",
    });
  }

  // Check quota
  const quotaCheck = await pool.query(
    'SELECT check_user_quota($1, $2, $3) as result',
    [context.userId, 'image_generation', 2000000],
  );
  const quotaResult = quotaCheck.rows[0]?.result;
  if (quotaResult && !quotaResult.allowed) {
    return res.status(200).json({
      blocked: true,
      message: quotaResult.message || 'You have reached your image generation limit.',
    });
  }

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Gemini API key not configured' });
  }

  const stylePrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.cartoon;
  const finalPrompt = enhancePrompt
    ? `${prompt}, ${stylePrompt}, safe for children, age-appropriate, wholesome, cheerful`
    : prompt;

  try {
    const response = await fetch(`${GEMINI_IMAGEN_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt: finalPrompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: ASPECT_RATIOS[aspectRatio] || '1:1',
          personGeneration: 'dont_allow',
          safetyFilterLevel: 'block_medium_and_above',
        },
      }),
      signal: AbortSignal.timeout(90000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Art Studio Gemini] API error:', response.status, errorText);
      return res.status(500).json({
        error: 'Image generation service returned an error. Please try again!',
      });
    }

    const data = await response.json();
    const imageBase64 = data.predictions?.[0]?.bytesBase64Encoded;
    if (!imageBase64) {
      return res.status(500).json({ error: 'No image was generated. Please try again!' });
    }

    // Save to disk
    if (!fs.existsSync(ART_IMAGE_DIR)) {
      fs.mkdirSync(ART_IMAGE_DIR, { recursive: true });
    }

    const imageId = uuidv4();
    const imageFilename = `${imageId}.png`;
    const imageFilePath = path.join(ART_IMAGE_DIR, imageFilename);
    const imageBuffer = Buffer.from(imageBase64, 'base64');
    fs.writeFileSync(imageFilePath, imageBuffer);

    const imageUrl = `/api/child/art-studio/image?file=${encodeURIComponent(imageFilename)}`;

    // Save to DB
    let savedImageId = imageId;
    try {
      const userTenant = await pool.query(
        `SELECT tenant_id FROM tenant_memberships WHERE user_id = $1 ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END LIMIT 1`,
        [context.userId],
      );
      const tenantId = userTenant.rows[0]?.tenant_id || null;

      const imageRecord = await pool.query(
        `INSERT INTO generated_images (
          user_id, tenant_id, prompt, model, width, height, filename, file_path,
          source_service, visibility, is_child_generated, content_filter_applied
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id, created_at`,
        [
          context.userId,
          tenantId,
          prompt,
          'imagen-3.0-generate-002',
          1024,
          1024,
          imageFilename,
          imageUrl,
          'child-art-studio-gemini',
          context.accountType === 'child' ? 'family' : 'private',
          context.accountType === 'child',
          true,
        ],
      );
      savedImageId = imageRecord.rows[0]?.id || imageId;
    } catch (dbError: any) {
      console.error('[Art Studio Gemini] DB save error (non-fatal):', dbError.message);
    }

    // Record quota
    try {
      await pool.query(
        'SELECT record_quota_usage($1, $2, $3, $4, $5, $6)',
        [context.userId, 'image_created', 'image', savedImageId, 2000000, 1],
      );
    } catch (quotaError: any) {
      console.error('[Art Studio Gemini] Quota recording error (non-fatal):', quotaError.message);
    }

    return res.status(200).json({
      success: true,
      imageUrl,
      imageId: savedImageId,
      prompt,
      message: "Your masterpiece is ready! 🎨",
    });
  } catch (error: any) {
    console.error('[Art Studio Gemini] Error:', error);
    return res.status(500).json({
      error: error.message?.includes('timeout')
        ? 'Image creation took too long. Please try a simpler prompt!'
        : 'Something went wrong creating your image. Please try again!',
    });
  }
}
