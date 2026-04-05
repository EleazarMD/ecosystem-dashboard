import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { getUserFeatureAccess, checkFeatureAccess } from '@/lib/feature-access';
import { getUserLimits } from '@/lib/subscription-tiers';
import { checkPromptSafety, getSafetyLevelForUser } from '@/lib/safety/llm-safety-filter';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:8777';
const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY || 'ai-gateway-api-key-2024';

interface GenerateRequest {
  prompt: string;
  negativePrompt?: string;
  model?: string;
  width?: number;
  height?: number;
  steps?: number;
  cfgScale?: number;
  seed?: number;
}

interface GenerateResponse {
  success: boolean;
  images?: Array<{ url: string; filename: string }>;
  error?: string;
  message?: string;
  blocked?: boolean;
  violations?: string[];
  category?: string;
  seed?: number;
  generationTime?: number;
  promptId?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GenerateResponse>
) {
  console.log('[Image Studio API] Request received:', req.method);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    console.log('[Image Studio API] No session found');
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  const userId = (session.user as any).id;
  
  // Get tenant_id from tenant_memberships for multi-tenant isolation
  let tenantId = (session.user as any).tenantId || (session.user as any).defaultTenantId || null;
  if (!tenantId) {
    try {
      const tenantResult = await pool.query(
        `SELECT tenant_id FROM tenant_memberships WHERE user_id = $1 ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END LIMIT 1`,
        [userId]
      );
      tenantId = tenantResult.rows[0]?.tenant_id || null;
    } catch (e) {
      console.log('[Image Studio API] Could not fetch tenant_id:', e);
    }
  }
  console.log('[Image Studio API] User authenticated:', userId, 'Tenant:', tenantId);

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
  }: GenerateRequest = req.body;

  console.log('[Image Studio API] Request body:', JSON.stringify({
    prompt: prompt?.substring(0, 100),
    negativePrompt: negativePrompt?.substring(0, 50),
    model,
    width,
    height,
    steps,
    cfgScale,
    seed
  }));

  if (!prompt || prompt.trim().length === 0) {
    console.log('[Image Studio API] Empty prompt rejected');
    return res.status(400).json({
      success: false,
      error: 'Prompt is required',
    });
  }

  // Get user's subscription limits and platform role
  const userAccess = await getUserFeatureAccess(userId);
  const limits = getUserLimits(userAccess);
  
  // Check if user is platform admin (unrestricted access)
  const userResult = await pool.query(
    'SELECT platform_role, account_type, settings FROM users WHERE id = $1',
    [userId]
  );
  const userSettings = userResult.rows[0]?.settings || {};
  const isPlatformAdmin = userResult.rows[0]?.platform_role === 'platform-admin';
  const safetyLevel = userSettings.safety_level || (isPlatformAdmin ? 'unrestricted' : 'standard');

  // Safety filtering is handled by AI Gateway (Llama Guard)
  // Platform admins have unrestricted access
  console.log(`[Image Studio API] User safety level: ${safetyLevel}, Platform admin: ${isPlatformAdmin}`);

  // Apply model restrictions based on subscription tier
  let allowedModel = model;
  const tier = userAccess.subscriptionTier;
  
  // Free tier: only fast models
  if (tier === 'free') {
    allowedModel = 'hidream-i1-fast-nf4';
  }
  // Basic tier: fast and dev models
  else if (tier === 'basic') {
    if (!['hidream-i1-fast-nf4', 'hidream-i1-dev-nf4'].includes(model)) {
      allowedModel = 'hidream-i1-dev-nf4';
    }
  }
  // Pro and above: all models available
  
  // Validate model name format (must have -nf4 suffix for HiDream models)
  if (allowedModel.startsWith('hidream') && !allowedModel.endsWith('-nf4')) {
    allowedModel = allowedModel + '-nf4';
  }
  
  console.log(`[Image Studio API] Final model selection: ${allowedModel} (requested: ${model}, tier: ${tier})`);

  try {
    // Call AI Gateway's image generation endpoint
    const requestPayload = {
      provider: 'comfyui',
      model: allowedModel,
      prompt,
      negativePrompt,
      width,
      height,
      steps,
      cfgScale,
      seed,
      userId,
      serviceId: 'image-studio',
      safetyLevel: safetyLevel, // Send safety level to AI Gateway
      safetyCategories: safetyLevel === 'unrestricted' ? [] : undefined, // Empty array = no restrictions
    };
    
    console.log(`[Image Studio API] Sending to AI Gateway:`, JSON.stringify({
      ...requestPayload,
      prompt: prompt.substring(0, 100),
      negativePrompt: negativePrompt?.substring(0, 50)
    }));
    
    const response = await fetch(`${AI_GATEWAY_URL}/api/v1/images/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': AI_GATEWAY_API_KEY,
        'X-Service-ID': 'image-studio',
        'X-User-ID': userId,
      },
      body: JSON.stringify(requestPayload),
    });

    console.log(`[Image Studio API] AI Gateway response status: ${response.status}`);
    
    const result = await response.json();
    console.log(`[Image Studio API] AI Gateway full response:`, JSON.stringify(result, null, 2));
    console.log(`[Image Studio API] AI Gateway response summary:`, JSON.stringify({
      success: result.success,
      blocked: result.blocked,
      imagesCount: result.images?.length,
      error: result.error,
      message: result.message
    }));

    // Handle safety filter blocks
    if (result.blocked) {
      console.log(`[Image Studio API] Content blocked by AI Gateway`);
      return res.status(403).json({
        success: false,
        blocked: true,
        message: result.message || 'Content blocked by safety filter',
        violations: result.violations,
      });
    }

    // Handle errors
    if (!response.ok || !result.success) {
      console.log(`[Image Studio API] Generation failed:`, result.error || result.message);
      return res.status(response.status || 500).json({
        success: false,
        error: result.error || 'Generation failed',
        message: result.message || 'Please try again',
      });
    }

    // Success - transform image URLs to use ComfyUI direct proxy
    console.log('[Image Studio API] Raw AI Gateway response images:', JSON.stringify(result.images));
    
    const proxyImages = result.images?.map((img: { url: string; filename: string; subfolder?: string }, index: number) => {
      try {
        console.log(`[Image Studio API] Processing image ${index}:`, img);
        // Parse the AI Gateway URL and create a proxy URL
        const urlParams = new URL(img.url).searchParams;
        const filename = urlParams.get('filename') || img.filename;
        const subfolder = urlParams.get('subfolder') || '';
        const type = urlParams.get('type') || 'output';
        
        console.log(`[Image Studio API] Parsed params - filename: ${filename}, subfolder: ${subfolder}, type: ${type}`);
        
        const proxyUrl = `/api/image-studio/image?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder)}&type=${encodeURIComponent(type)}`;
        console.log('[Image Studio API] Transformed URL:', img.url, '→', proxyUrl);
        
        return {
          ...img,
          url: proxyUrl,
        };
      } catch (error) {
        console.error('[Image Studio API] Failed to parse image URL:', img.url, error);
        return img;
      }
    });
    
    console.log('[Image Studio API] Final proxy images:', JSON.stringify(proxyImages));
    console.log(`[Image Studio API] Returning ${proxyImages?.length || 0} images to client`);

    // Save generated image to database for gallery/collections
    try {
      for (const img of proxyImages || []) {
        const urlParams = new URLSearchParams(img.url.split('?')[1] || '');
        const filename = urlParams.get('filename') || img.filename || `generated_${Date.now()}.png`;
        const filePath = `/api/image-studio/image?filename=${encodeURIComponent(filename)}&subfolder=&type=output`;
        
        await pool.query(`
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
          result.seed || seed,
          filename,
          filePath,
          'comfyui',
          result.generationTime || null,
          'private',  // Default visibility
          false,      // is_child_generated (standard user)
          true        // content_filter_applied (we ran safety check)
        ]);
        console.log('[Image Studio API] Saved image to database:', filename);
      }
    } catch (dbError) {
      console.error('[Image Studio API] Failed to save image to database:', dbError);
      // Don't fail the request if DB save fails - image was still generated
    }

    return res.status(200).json({
      success: true,
      images: proxyImages,
      seed: result.seed,
      generationTime: result.generationTime,
      promptId: result.promptId,
    });

  } catch (error) {
    console.error('[Image Studio API] Generation error:', error);
    console.error('[Image Studio API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
    responseLimit: false,
  },
};
