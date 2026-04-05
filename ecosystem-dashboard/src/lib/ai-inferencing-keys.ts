/**
 * AI Inferencing Key Management
 * Centralized service for retrieving API keys from AI Inferencing Service
 */

const AI_INFERENCING_URL = process.env.NEXT_PUBLIC_AI_INFERENCING_URL || 'http://localhost:9000';
const ADMIN_KEY = process.env.NEXT_PUBLIC_AI_INFERENCING_ADMIN_KEY || 'ai-inferencing-admin-key-2024';

interface APIKeyResponse {
  success: boolean;
  apiKey: string;
  provider: string;
  metadata?: {
    isPrimary: boolean;
    costLimitDaily: number;
    rateLimitPerMinute: number;
  };
  error?: string;
}

/**
 * Get API key from AI Inferencing Service
 * @param service - Service name (e.g., 'podcast-studio')
 * @param provider - Provider name (e.g., 'google', 'openai', 'anthropic')
 * @returns Decrypted API key
 */
export async function getAPIKey(service: string, provider: string): Promise<string> {
  try {
    const url = `${AI_INFERENCING_URL}/api/v1/keys/${service}/${provider}`;
    
    console.log(`🔑 Fetching ${provider} key for ${service} from AI Inferencing...`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-api-key': ADMIN_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Failed to get API key: ${response.status} ${response.statusText}. ${errorData.error || ''}`
      );
    }

    const data: APIKeyResponse = await response.json();

    if (!data.success || !data.apiKey) {
      throw new Error(data.error || 'No API key returned from AI Inferencing Service');
    }

    console.log(`✅ Retrieved ${provider} key for ${service}`);
    
    return data.apiKey;
  } catch (error) {
    console.error(`❌ Failed to get ${provider} key for ${service}:`, error);
    console.error(`
╔════════════════════════════════════════════════════════════════╗
║  API Key Retrieval Failed                                      ║
╠════════════════════════════════════════════════════════════════╣
║  Service:   ${service.padEnd(50)} ║
║  Provider:  ${provider.padEnd(50)} ║
╠════════════════════════════════════════════════════════════════╣
║  Required Action:                                              ║
║  1. Ensure AI Inferencing Service is running (port 9000)       ║
║  2. Check: http://localhost:9000/health                        ║
║  3. Add API key in: AI Inferencing → API Keys tab             ║
║     - Project: ${service.padEnd(44)} ║
║     - Service: main-service                                    ║
║     - Provider: ${provider.padEnd(43)} ║
╠════════════════════════════════════════════════════════════════╣
║  No fallback to .env - Centralized key management required     ║
╚════════════════════════════════════════════════════════════════╝
    `);
    
    throw new Error(
      `API key for ${provider} (service: ${service}) not available. ` +
      `Please add key in AI Inferencing dashboard at http://localhost:9000`
    );
  }
}

/**
 * Cache for API keys to reduce API calls
 * Keys are cached for 5 minutes
 */
const keyCache = new Map<string, { key: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get API key with caching
 * @param service - Service name
 * @param provider - Provider name
 * @returns Cached or fresh API key
 */
export async function getCachedAPIKey(service: string, provider: string): Promise<string> {
  const cacheKey = `${service}:${provider}`;
  const cached = keyCache.get(cacheKey);

  // Return cached key if still valid
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`📦 Using cached ${provider} key for ${service}`);
    return cached.key;
  }

  // Fetch fresh key
  const key = await getAPIKey(service, provider);

  // Update cache
  keyCache.set(cacheKey, {
    key,
    timestamp: Date.now(),
  });

  return key;
}

/**
 * Clear key cache (useful after key rotation)
 */
export function clearKeyCache(service?: string, provider?: string) {
  if (service && provider) {
    const cacheKey = `${service}:${provider}`;
    keyCache.delete(cacheKey);
    console.log(`🗑️  Cleared cache for ${service}:${provider}`);
  } else {
    keyCache.clear();
    console.log('🗑️  Cleared all key cache');
  }
}

/**
 * Podcast Studio specific helpers
 */
export const PodcastStudioKeys = {
  /**
   * Get Gemini API key for TTS and script generation
   */
  getGeminiKey: () => getCachedAPIKey('podcast-studio', 'google'),

  /**
   * Get OpenAI API key for TTS
   */
  getOpenAIKey: () => getCachedAPIKey('podcast-studio', 'openai'),

  /**
   * Get Anthropic API key (if needed for script generation)
   */
  getAnthropicKey: () => getCachedAPIKey('podcast-studio', 'anthropic'),
};
