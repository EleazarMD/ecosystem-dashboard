import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { getUserFeatureAccess, checkFeatureAccess } from '@/lib/feature-access';
import { checkPromptSafety, getSafetyLevelForUser } from '@/lib/safety/llm-safety-filter';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:8777';
const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY || 'ai-gateway-api-key-2024';

interface EditRequest {
  sourceImage: string; // Base64 data URL or image URL
  prompt: string;
  negativePrompt?: string;
  strength?: number; // 0.0 - 1.0, how much to change the image
  width?: number;
  height?: number;
  steps?: number;
  cfgScale?: number;
  seed?: number;
}

interface EditResponse {
  success: boolean;
  images?: Array<{ url: string; filename: string }>;
  error?: string;
  message?: string;
  blocked?: boolean;
  violations?: string[];
  seed?: number;
  generationTime?: number;
  strength?: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<EditResponse>
) {
  console.log('[Image Edit API] Request received:', req.method);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    console.log('[Image Edit API] No session found');
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  const userId = (session.user as any).id;
  const userType = (session.user as any).userType;
  
  // Block child accounts from image editing (premium adult feature)
  if (userType === 'child') {
    return res.status(403).json({
      success: false,
      error: 'Image editing is not available for child accounts',
      message: 'This is a premium feature for adult accounts only.',
    });
  }

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
      console.log('[Image Edit API] Could not fetch tenant_id:', e);
    }
  }
  console.log('[Image Edit API] User authenticated:', userId, 'Tenant:', tenantId);

  // Check feature access - require premium tier for image editing
  const userAccess = await getUserFeatureAccess(userId);
  const tier = userAccess.subscriptionTier;
  
  // Get user role from database (session may be cached)
  let isAdmin = false;
  try {
    const roleResult = await pool.query(
      'SELECT role, platform_role, account_type FROM users WHERE id = $1',
      [userId]
    );
    const dbUser = roleResult.rows[0];
    isAdmin = dbUser?.role === 'admin' || 
              dbUser?.role === 'administrator' ||
              dbUser?.platform_role === 'platform-admin' ||
              dbUser?.account_type === 'admin';
  } catch (e) {
    console.log('[Image Edit API] Could not fetch user role:', e);
  }
  
  // Image editing requires Pro tier or higher, admin tier, or administrator role
  const hasAccess = isAdmin || ['pro', 'premium', 'enterprise', 'admin'].includes(tier);
  if (!hasAccess) {
    return res.status(403).json({
      success: false,
      error: 'Image editing requires Pro subscription or higher',
      message: 'Upgrade to Pro to unlock image editing with AI. This feature uses SD 1.5 img2img to transform your images.',
    });
  }

  const {
    sourceImage,
    prompt,
    negativePrompt = '',
    strength = 0.7,
    width = 512,
    height = 512,
    steps = 30,
    cfgScale = 7.0,
    seed = -1,
  }: EditRequest = req.body;

  console.log('[Image Edit API] Request params:', JSON.stringify({
    prompt: prompt?.substring(0, 100),
    negativePrompt: negativePrompt?.substring(0, 50),
    strength,
    width,
    height,
    steps,
    cfgScale,
    seed,
    hasSourceImage: !!sourceImage,
    sourceImageLength: sourceImage?.length || 0
  }));

  // Validate required fields
  if (!sourceImage) {
    return res.status(400).json({
      success: false,
      error: 'Source image is required',
    });
  }

  if (!prompt || prompt.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Prompt is required',
    });
  }

  // Validate strength parameter
  const validStrength = Math.min(1.0, Math.max(0.0, strength));

  // Safety filtering is handled by AI Gateway (Llama Guard)
  // No dashboard-level filtering - all safety checks at AI Gateway

  try {
    // Call AI Gateway's image editing endpoint
    const requestPayload = {
      sourceImage,
      prompt,
      negativePrompt,
      strength: validStrength,
      width,
      height,
      steps,
      cfgScale,
      seed,
      userId,
      serviceId: 'image-studio-edit',
    };
    
    console.log(`[Image Edit API] Sending to AI Gateway edit endpoint`);
    
    const response = await fetch(`${AI_GATEWAY_URL}/api/v1/images/edit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': AI_GATEWAY_API_KEY,
        'X-Service-ID': 'image-studio-edit',
        'X-User-ID': userId,
      },
      body: JSON.stringify(requestPayload),
    });

    const result = await response.json();
    console.log(`[Image Edit API] AI Gateway response status: ${response.status}`);
    console.log(`[Image Edit API] AI Gateway response:`, JSON.stringify({
      success: result.success,
      blocked: result.blocked,
      imagesCount: result.images?.length,
      error: result.error
    }));

    // Handle safety filter blocks
    if (result.blocked) {
      return res.status(403).json({
        success: false,
        blocked: true,
        message: result.message || 'Content blocked by safety filter',
        violations: result.violations,
      });
    }

    // Handle errors
    if (!response.ok || !result.success) {
      console.log(`[Image Edit API] Edit failed:`, result.error || result.message);
      return res.status(response.status || 500).json({
        success: false,
        error: result.error || 'Image editing failed',
        message: result.message || 'Please try again',
      });
    }

    // Transform image URLs to use local proxy
    const proxyImages = result.images?.map((img: { url: string; filename: string; subfolder?: string }) => {
      try {
        const urlParams = new URL(img.url).searchParams;
        const filename = urlParams.get('filename') || img.filename;
        const subfolder = urlParams.get('subfolder') || '';
        const type = urlParams.get('type') || 'output';
        
        const proxyUrl = `/api/image-studio/image?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder)}&type=${encodeURIComponent(type)}`;
        
        return {
          ...img,
          url: proxyUrl,
        };
      } catch (error) {
        console.error('[Image Edit API] Failed to parse image URL:', img.url, error);
        return img;
      }
    });

    // Save edited image to database
    try {
      for (const img of proxyImages || []) {
        const urlParams = new URLSearchParams(img.url.split('?')[1] || '');
        const filename = urlParams.get('filename') || img.filename || `edited_${Date.now()}.png`;
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
          `[EDIT] ${prompt}`,
          negativePrompt || null,
          'sd-1.5-img2img',
          width,
          height,
          steps,
          cfgScale,
          result.seed || seed,
          filename,
          filePath,
          'comfyui-edit',
          result.generationTime || null,
          'private',
          false,
          true
        ]);
        console.log('[Image Edit API] Saved edited image to database:', filename);
      }
    } catch (dbError) {
      console.error('[Image Edit API] Failed to save image to database:', dbError);
    }

    return res.status(200).json({
      success: true,
      images: proxyImages,
      seed: result.seed,
      generationTime: result.generationTime,
      strength: validStrength,
    });

  } catch (error) {
    console.error('[Image Edit API] Edit error:', error);
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
      sizeLimit: '50mb', // Larger limit for image uploads
    },
    responseLimit: false,
  },
};
