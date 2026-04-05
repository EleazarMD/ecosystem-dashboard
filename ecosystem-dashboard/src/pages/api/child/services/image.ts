/**
 * Child Image Studio API
 * 
 * Child-friendly image generation endpoint that:
 * 1. Filters prompts through content filter
 * 2. Requires parental approval if configured
 * 3. Uses child-safe image generation parameters
 * 4. Logs all activity for parental oversight
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import {
  getChildServiceContext,
  getChildPromptSuggestions,
  isServiceAllowedForChild,
} from '@/lib/platform/child-service-middleware';
import { logChildActivity } from '@/lib/platform/content-filter-service';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || process.env.AI_GATEWAY_AI_URL || 'http://localhost:8777';

// Child-safe style modifiers (avoid using blocked terms even in negative context)
const CHILD_SAFE_STYLE = 'cartoon style, friendly, colorful, age-appropriate, safe for children, happy, cheerful, wholesome';

// Style definitions for LLM augmentation
const STYLE_PROMPTS: Record<string, string> = {
  cartoon: 'cartoon illustration style, bold outlines, vibrant colors, fun and playful',
  watercolor: 'soft watercolor painting style, gentle brushstrokes, dreamy pastel colors, artistic and flowing',
  pixel: 'pixel art style, retro 8-bit game aesthetic, blocky colorful pixels, nostalgic gaming look',
  storybook: 'storybook illustration style, whimsical fairy tale art, warm colors, magical and enchanting',
  '3d': '3D rendered style, smooth shiny surfaces, modern CGI look, Pixar-like quality',
};

interface AugmentOptions {
  prompt: string;
  userId: string;
  style?: string;
  styleLabel?: string;
  styleDescription?: string;
  size?: string;
  sizeRatio?: string;
}

/**
 * LLM-based prompt augmenter for children's art studio
 * Uses local qwen3-8b model to semantically enhance simple prompts
 * into detailed, child-friendly image generation prompts
 */
async function augmentChildPromptWithLLM(options: AugmentOptions): Promise<string> {
  const { prompt, userId, style = 'cartoon', styleLabel = 'Cartoon', styleDescription = 'Fun and colorful' } = options;
  
  // Skip augmentation for already detailed prompts (>12 words)
  const wordCount = prompt.split(/\s+/).length;
  if (wordCount > 12) {
    console.log(`[Prompt Augmenter] Prompt already detailed (${wordCount} words), skipping augmentation`);
    return prompt;
  }

  const stylePrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.cartoon;

  const systemPrompt = `You are a creative assistant that enhances simple image prompts for a children's art studio.

Your task: Take the child's simple prompt and expand it into a detailed, descriptive prompt optimized for AI image generation.

IMPORTANT - Apply this specific art style: ${styleLabel} (${styleDescription})
Style details to incorporate: ${stylePrompt}

Rules:
1. Keep the child's original idea as the MAIN SUBJECT - don't change what they want to draw
2. Apply the requested art style consistently throughout the description
3. Add vivid descriptive details: colors, textures, lighting, mood, composition
4. Make everything cute, friendly, appealing, and age-appropriate (NOT scary)
5. Add an appropriate background/setting that complements the subject
6. Include atmospheric details: lighting, time of day, weather if relevant
7. Keep the enhanced prompt between 30-60 words
8. Output ONLY the enhanced prompt text, nothing else - no quotes, no explanations

Style-specific examples:
- Cartoon style: "cat" → "adorable chubby cartoon cat with soft gray fur, big sparkly eyes, pink nose, sitting happily on a rainbow, bright blue sky with fluffy white clouds, bold outlines, vibrant cheerful colors"
- Watercolor style: "cat" → "gentle watercolor painting of a fluffy cat with soft blended fur, dreamy pastel pink and lavender background, delicate brushstrokes, artistic flowing style, warm golden sunlight"
- Pixel art style: "cat" → "cute pixel art cat sprite, 16-bit retro game style, orange tabby with big eyes, green grass tiles, blue sky pixels, nostalgic colorful palette"
- Storybook style: "cat" → "whimsical storybook illustration of a curious cat in a magical garden, fairy tale art style, warm golden hour lighting, enchanting flowers and butterflies"
- 3D style: "cat" → "adorable 3D rendered cat with smooth shiny fur, big expressive eyes, Pixar-quality CGI, soft studio lighting, clean colorful background"`;

  try {
    const response = await fetch(`${AI_GATEWAY_URL}/api/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.AI_GATEWAY_API_KEY || 'ai-gateway-api-key-2024',
        'X-Service-ID': 'prompt-augmenter',
        'X-User-ID': userId,
      },
      body: JSON.stringify({
        model: 'qwen3-8b', // Local model, no external API calls
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Enhance this prompt using ${styleLabel} style: "${prompt}"` }
        ],
        temperature: 0.7, // Some creativity for varied results
        max_tokens: 200,
      }),
      signal: AbortSignal.timeout(20000), // 20 second timeout
    });

    if (!response.ok) {
      console.error('[Prompt Augmenter] LLM request failed:', response.status);
      // Fall back to basic style addition
      return `${prompt}, ${stylePrompt}`;
    }

    const data = await response.json();
    let augmentedPrompt = data.choices?.[0]?.message?.content?.trim();

    // Clean up any quotes or extra formatting the LLM might add
    if (augmentedPrompt) {
      augmentedPrompt = augmentedPrompt.replace(/^["']|["']$/g, '').trim();
    }

    if (augmentedPrompt && augmentedPrompt.length > 0) {
      console.log(`[Prompt Augmenter] LLM enhanced (${styleLabel}): "${prompt}" → "${augmentedPrompt.substring(0, 80)}..."`);
      return augmentedPrompt;
    }

    // Fall back to basic style addition
    return `${prompt}, ${stylePrompt}`;
  } catch (error: any) {
    console.error('[Prompt Augmenter] LLM error:', error.message);
    // Fall back to basic style addition
    return `${prompt}, ${stylePrompt}`;
  }
}


// Increase timeout for image generation (HiDream can take 2+ minutes on first load)
export const config = {
  maxDuration: 300, // 5 minutes
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // GET: Return prompt suggestions
  if (req.method === 'GET') {
    const suggestions = getChildPromptSuggestions('image-studio');
    return res.status(200).json({ suggestions });
  }

  // POST: Generate image
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Debug: Check session directly
  const session = await getServerSession(req, res, authOptions);
  console.log('[Child Image API] Session check:', session ? `User: ${(session.user as any)?.name || session.user?.email}` : 'No session');
  
  const context = await getChildServiceContext(req, res);
  if (!context) return;

  const { prompt, style, styleLabel, styleDescription, size, sizeRatio, fast } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  // Check quota before proceeding
  const quotaCheck = await pool.query(
    'SELECT check_user_quota($1, $2, $3) as result',
    [context.userId, 'image_generation', 2000000] // ~2MB estimated image size
  );
  const quotaResult = quotaCheck.rows[0]?.result;
  
  if (quotaResult && !quotaResult.allowed) {
    return res.status(200).json({
      blocked: true,
      message: quotaResult.message || 'You have reached your image generation limit.',
      quotaExceeded: true,
      reason: quotaResult.reason,
    });
  }

  // Check if service is allowed
  if (context.accountType === 'child') {
    const serviceCheck = await isServiceAllowedForChild(context.userId, 'image-studio');
    
    if (!serviceCheck.allowed) {
      return res.status(200).json({
        blocked: true,
        message: serviceCheck.reason,
      });
    }

    // Check if requires approval
    if (serviceCheck.requiresApproval) {
      // Create approval request
      await pool.query(`
        INSERT INTO parental_approval_requests (
          child_user_id, request_type, request_data, status, expires_at
        ) VALUES ($1, 'image_generation', $2, 'pending', NOW() + INTERVAL '24 hours')
        RETURNING id
      `, [context.userId, JSON.stringify({ prompt })]);

      return res.status(200).json({
        requiresApproval: true,
        message: "I've asked your parent for permission to create this image. Check back soon! 🎨",
      });
    }

    // Safety filtering is handled by AI Gateway (Llama Guard)
    // No dashboard-level filtering - all safety checks at AI Gateway
  }

  try {
    // Augment simple prompts with detailed descriptors using LLM (local model)
    // Pass style options for style-aware augmentation
    const augmentedPrompt = context.accountType === 'child' 
      ? await augmentChildPromptWithLLM({
          prompt,
          userId: context.userId,
          style,
          styleLabel,
          styleDescription,
          size,
          sizeRatio,
        })
      : prompt;
    
    // Add child-safe modifiers (LLM already applies style, this adds safety terms)
    const safePrompt = context.accountType === 'child'
      ? `${augmentedPrompt}, safe for children, age-appropriate, wholesome`
      : augmentedPrompt;
    
    console.log('[Child Image API] Original prompt:', prompt);
    console.log('[Child Image API] Style:', styleLabel || 'Cartoon');
    console.log('[Child Image API] Augmented prompt:', augmentedPrompt.substring(0, 100) + '...');
    console.log('[Child Image API] Final safe prompt:', safePrompt.substring(0, 120) + '...');

    // Call image generation API with extended timeout for HiDream
    console.log('[Child Image API] Using AI Gateway URL:', AI_GATEWAY_URL);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout
    
    const response = await fetch(`${AI_GATEWAY_URL}/api/v1/images/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.CHILD_SAFETY_API_KEY || 'child-safety-key',
      },
      body: JSON.stringify({
        prompt: safePrompt,
        model: fast ? 'hidream-i1-fast-nf4' : 'hidream-i1-full-nf4', // Fast model for stories, full for art studio
        width: fast ? 768 : 1024,
        height: fast ? 768 : 1024,
        steps: fast ? 12 : 28, // Fewer steps for faster generation in stories
        // Child-safe parameters
        metadata: {
          user_type: context.accountType,
          content_filter: 'strict',
          original_prompt: prompt,
          fast_mode: fast || false,
        },
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Child Image API] AI Gateway error:', errorData);
      
      // Pass through specific error messages
      if (errorData.blocked || errorData.error) {
        return res.status(200).json({
          blocked: true,
          message: errorData.error || errorData.message || "Your prompt contains content that is not allowed. Please try a different idea! 🎨"
        });
      }
      
      throw new Error('Image generation service unavailable');
    }

    const data = await response.json();
    console.log('[Child Image API] AI Gateway response:', JSON.stringify(data).substring(0, 200));
    
    // Check if the response indicates blocked content
    if (data.blocked) {
      return res.status(200).json({
        blocked: true,
        message: data.message || data.error || "Your prompt contains content that is not allowed. Please try a different idea! 🎨"
      });
    }
    
    // AI Gateway returns data array, not images array
    const aiGatewayImageUrl = data.data?.[0]?.url || data.images?.[0]?.url;
    const filename = data.data?.[0]?._filename || data.images?.[0]?.filename || `generated_${Date.now()}.png`;

    if (!aiGatewayImageUrl) {
      console.error('[Child Image API] No image URL in response:', data);
      throw new Error('No image URL returned from generation service');
    }

    // Extract query params from AI Gateway URL and rewrite to use ComfyUI direct proxy
    // This avoids SSL certificate issues when accessing via Tailscale HTTPS
    const urlObj = new URL(aiGatewayImageUrl);
    const filenameParam = urlObj.searchParams.get('filename') || filename;
    const subfolderParam = urlObj.searchParams.get('subfolder') || '';
    const typeParam = urlObj.searchParams.get('type') || 'output';
    
    // Use image-studio proxy endpoint which directly accesses ComfyUI
    const imageUrl = `/api/image-studio/image?filename=${encodeURIComponent(filenameParam)}&subfolder=${encodeURIComponent(subfolderParam)}&type=${encodeURIComponent(typeParam)}`;
    console.log('[Child Image API] Rewritten image URL:', imageUrl);

    // Save image to database (skip if it fails - image is still generated)
    let savedImage = { id: `temp_${Date.now()}` };
    try {
      // Get user's tenant_id from tenant_memberships for multi-tenant isolation
      const userTenant = await pool.query(
        `SELECT tenant_id FROM tenant_memberships WHERE user_id = $1 ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END LIMIT 1`,
        [context.userId]
      );
      const tenantId = userTenant.rows[0]?.tenant_id || null;

      const imageRecord = await pool.query(`
        INSERT INTO generated_images (
          user_id, tenant_id, prompt, model, width, height, steps,
          filename, file_path, source_service,
          visibility, is_child_generated, content_filter_applied
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id, created_at
      `, [
        context.userId,
        tenantId,
        prompt,
        'hidream-i1-fast-nf4',
        1024,
        1024,
        16,
        filename,
        imageUrl,
        'comfyui',
        context.accountType === 'child' ? 'family' : 'private',
        context.accountType === 'child',
        context.accountType === 'child',
      ]);
      savedImage = imageRecord.rows[0];
      console.log('[Child Image API] Saved image to database:', savedImage.id, 'tenant:', tenantId);
    } catch (dbError: any) {
      console.error('[Child Image API] Database save error (non-fatal):', dbError.message);
      // Continue - image was generated successfully
    }

    // Record quota usage (skip if it fails)
    try {
      await pool.query(
        'SELECT record_quota_usage($1, $2, $3, $4, $5, $6)',
        [context.userId, 'image_created', 'image', savedImage.id, 2000000, 1]
      );
    } catch (quotaError: any) {
      console.error('[Child Image API] Quota recording error (non-fatal):', quotaError.message);
    }

    // Log activity
    if (context.accountType === 'child') {
      try {
        await logChildActivity(context.userId, 'image_generation', {
          serviceId: 'image-studio',
          userMessage: prompt,
          metadata: { imageUrl, imageId: savedImage.id },
        });
      } catch (logError: any) {
        console.error('[Child Image API] Activity log error (non-fatal):', logError.message);
      }
    }

    return res.status(200).json({
      success: true,
      imageUrl,
      imageId: savedImage.id,
      message: "Here's your creation! 🎨",
    });
  } catch (error: any) {
    console.error('[Child Image API] Error:', error.message);
    console.error('[Child Image API] Stack:', error.stack);
    
    // Provide specific error messages when possible
    let errorMessage = 'Something went wrong creating your image. Please try again!';
    
    if (error.message?.includes('service unavailable')) {
      errorMessage = 'The image creation service is currently unavailable. Please try again in a moment!';
    } else if (error.message?.includes('timeout')) {
      errorMessage = 'Image creation is taking too long. Please try a simpler prompt!';
    } else if (error.message?.includes('No image URL')) {
      errorMessage = 'Image was created but we couldn\'t retrieve it. Please try again!';
    } else if (error.message && error.message.length < 200) {
      // Use the actual error message if it's reasonably short and descriptive
      errorMessage = error.message;
    }
    
    return res.status(500).json({
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
