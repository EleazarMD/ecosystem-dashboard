/**
 * LLM-based Safety Filter using Llama Guard 3 style prompts
 * 
 * Provides semantic content filtering for image prompts using an LLM
 * to detect unsafe content that keyword filters might miss.
 */

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || process.env.AI_GATEWAY_AI_URL || 'http://localhost:8777';
const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY || 'ai-gateway-api-key-2024';

export interface SafetyCheckResult {
  safe: boolean;
  category?: string;
  reason?: string;
  confidence?: number;
}

export type SafetyLevel = 'strict' | 'standard' | 'permissive' | 'unrestricted';

// Llama Guard 3 style safety categories
const SAFETY_CATEGORIES = {
  strict: [
    'S1: Violent Crimes',
    'S2: Non-Violent Crimes', 
    'S3: Sex-Related Crimes',
    'S4: Child Sexual Exploitation',
    'S5: Defamation',
    'S6: Specialized Advice',
    'S7: Privacy',
    'S8: Intellectual Property',
    'S9: Indiscriminate Weapons',
    'S10: Hate',
    'S11: Suicide & Self-Harm',
    'S12: Sexual Content',
    'S13: Elections',
    'S14: Code Interpreter Abuse',
  ],
  standard: [
    'S1: Violent Crimes',
    'S3: Sex-Related Crimes',
    'S4: Child Sexual Exploitation',
    'S9: Indiscriminate Weapons',
    'S10: Hate',
    'S11: Suicide & Self-Harm',
    'S12: Sexual Content',
  ],
  permissive: [
    'S1: Violent Crimes',
    'S3: Sex-Related Crimes',
    'S4: Child Sexual Exploitation',
    'S10: Hate',
  ],
  unrestricted: [] // No safety restrictions for admin users
};

/**
 * Check if a prompt is safe for image generation using LLM-based filtering
 */
export async function checkPromptSafety(
  prompt: string,
  level: SafetyLevel = 'standard',
  userId?: string
): Promise<SafetyCheckResult> {
  if (!prompt || prompt.trim().length === 0) {
    return { safe: true };
  }

  try {
    const categories = SAFETY_CATEGORIES[level];
    
    // Construct Llama Guard 3 style prompt
    const systemPrompt = `You are a content safety classifier for image generation prompts. Your task is to determine if a prompt is safe or unsafe based on the following categories:

${categories.map((cat, idx) => `${idx + 1}. ${cat}`).join('\n')}

Analyze the prompt and respond with:
- "safe" if the prompt does not violate any categories
- "unsafe" followed by the category number and brief reason if it violates any category

Be strict but fair. Consider context and artistic intent. Prompts for educational, medical, or artistic purposes may be acceptable even if they touch on sensitive topics.`;

    const userPrompt = `Classify this image generation prompt:

"${prompt}"

Is this prompt safe or unsafe?`;

    // Call AI Gateway for LLM-based safety check using Llama Guard
    // Uses Llama Guard 3 via AI Gateway (local inference, no external calls)
    const response = await fetch(`${AI_GATEWAY_URL}/api/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': AI_GATEWAY_API_KEY,
        'X-Service-ID': 'safety-filter',
        'X-User-ID': userId || 'system',
      },
      body: JSON.stringify({
        model: 'llama-guard-3', // Llama Guard 3 for content safety (local inference)
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1, // Low temperature for consistent safety decisions
        max_tokens: 200,
      }),
      signal: AbortSignal.timeout(30000), // 30 second timeout for local inference
    });

    if (!response.ok) {
      console.error('[LLM Safety Filter] AI Gateway error:', response.status);
      // Fail open - if safety check fails, allow the request but log it
      return { 
        safe: true,
        reason: 'Safety check unavailable'
      };
    }

    const data = await response.json();
    let result = data.choices?.[0]?.message?.content || '';
    
    console.log('[LLM Safety Filter] Raw response:', result.substring(0, 500));
    
    // Strip out <think> tags if present (some models use these for reasoning)
    result = result.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    
    // Also strip any remaining XML-like tags
    result = result.replace(/<[^>]+>/g, '').trim();
    
    console.log('[LLM Safety Filter] After stripping tags:', result.substring(0, 200));
    
    const resultLower = result.toLowerCase();

    // Parse the response
    if (resultLower.includes('unsafe')) {
      // Extract category and reason
      const categoryMatch = result.match(/s(\d+)/i);
      const category = categoryMatch ? categories[parseInt(categoryMatch[1]) - 1] : 'Unknown';
      
      return {
        safe: false,
        category,
        reason: result.split('\n')[0].substring(0, 200),
        confidence: 0.9
      };
    }

    return { 
      safe: true,
      confidence: 0.9
    };

  } catch (error) {
    console.error('[LLM Safety Filter] Error:', error);
    // Fail open - if safety check fails, allow the request
    return { 
      safe: true,
      reason: 'Safety check error'
    };
  }
}

/**
 * Batch check multiple prompts for efficiency
 */
export async function checkPromptsBatch(
  prompts: string[],
  level: SafetyLevel = 'standard',
  userId?: string
): Promise<SafetyCheckResult[]> {
  // Run checks in parallel with a limit
  const BATCH_SIZE = 5;
  const results: SafetyCheckResult[] = [];
  
  for (let i = 0; i < prompts.length; i += BATCH_SIZE) {
    const batch = prompts.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(prompt => checkPromptSafety(prompt, level, userId))
    );
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * Get user's configured safety level from database
 * Falls back to account type defaults if not explicitly set
 */
export async function getUserSafetyLevel(userId: string): Promise<SafetyLevel> {
  try {
    const { Pool } = await import('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
    });
    
    const result = await pool.query(
      `SELECT settings, account_type FROM users WHERE id = $1`,
      [userId]
    );
    
    await pool.end();
    
    if (result.rows.length === 0) {
      return 'standard'; // Default fallback
    }
    
    const user = result.rows[0];
    const settings = user.settings || {};
    
    // Check if administrator has explicitly set a safety level for this user
    if (settings.safety_level) {
      return settings.safety_level as SafetyLevel;
    }
    
    // Fall back to account type defaults
    return getSafetyLevelForUser(user.account_type || 'adult');
  } catch (error) {
    console.error('[Safety Filter] Error fetching user safety level:', error);
    return 'standard'; // Safe default on error
  }
}

/**
 * Get appropriate safety level based on user type (default fallback)
 */
export function getSafetyLevelForUser(accountType: string): SafetyLevel {
  switch (accountType) {
    case 'child':
      return 'strict';
    case 'standard':
    case 'family':
      return 'standard';
    case 'admin':
    case 'enterprise':
      return 'permissive';
    default:
      return 'standard';
  }
}
