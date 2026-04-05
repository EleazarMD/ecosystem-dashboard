# AI Inferencing Keys - Quick Reference

## 🚀 Quick Start

```typescript
import { PodcastStudioKeys } from '@/lib/ai-inferencing-keys';

// Get Gemini API key
const geminiKey = await PodcastStudioKeys.getGeminiKey();

// Get OpenAI API key
const openaiKey = await PodcastStudioKeys.getOpenAIKey();

// Get Anthropic API key
const anthropicKey = await PodcastStudioKeys.getAnthropicKey();
```

## 📋 API Reference

### `getAPIKey(service, provider)`
Get API key from AI Inferencing Service.

**Parameters:**
- `service` (string) - Service name (e.g., 'podcast-studio')
- `provider` (string) - Provider name (e.g., 'google', 'openai', 'anthropic')

**Returns:** `Promise<string>` - Decrypted API key

**Example:**
```typescript
import { getAPIKey } from '@/lib/ai-inferencing-keys';

const key = await getAPIKey('podcast-studio', 'google');
```

### `getCachedAPIKey(service, provider)`
Get API key with 5-minute caching.

**Parameters:** Same as `getAPIKey()`

**Returns:** `Promise<string>` - Cached or fresh API key

**Example:**
```typescript
import { getCachedAPIKey } from '@/lib/ai-inferencing-keys';

const key = await getCachedAPIKey('podcast-studio', 'google');
```

### `clearKeyCache(service?, provider?)`
Clear key cache.

**Parameters:**
- `service` (optional) - Clear specific service
- `provider` (optional) - Clear specific provider

**Example:**
```typescript
import { clearKeyCache } from '@/lib/ai-inferencing-keys';

// Clear specific key
clearKeyCache('podcast-studio', 'google');

// Clear all keys
clearKeyCache();
```

### `PodcastStudioKeys`
Convenience object for Podcast Studio.

**Methods:**
- `getGeminiKey()` - Get Gemini API key
- `getOpenAIKey()` - Get OpenAI API key
- `getAnthropicKey()` - Get Anthropic API key

**Example:**
```typescript
import { PodcastStudioKeys } from '@/lib/ai-inferencing-keys';

const gemini = await PodcastStudioKeys.getGeminiKey();
const openai = await PodcastStudioKeys.getOpenAIKey();
```

## 🔒 Security

### Environment Variables Required:
```bash
# .env.local
NEXT_PUBLIC_AI_INFERENCING_URL=http://localhost:9000
NEXT_PUBLIC_AI_INFERENCING_ADMIN_KEY=ai-inferencing-admin-key-2024
```

### Key Storage:
- ✅ Keys encrypted at rest in PostgreSQL
- ✅ Transmitted over HTTPS in production
- ✅ Never logged or exposed
- ✅ Cached in memory for 5 minutes only

## 🎯 Error Handling

### Key Not Found:
```typescript
try {
  const key = await PodcastStudioKeys.getGeminiKey();
} catch (error) {
  console.error('Key not found:', error);
  // Fallback logic or show error to user
}
```

### Service Unavailable:
System will **fail loudly** with detailed error message:

```typescript
// Strict enforcement - no fallbacks:
1. AI Inferencing Service (REQUIRED)
2. Throw error with resolution steps (if unavailable)

// Error includes:
- Service and provider details
- Health check URL
- Steps to add key
- No silent degradation
```

## 📊 Monitoring

### Check Key Usage:
Navigate to: **AI Inferencing → Provider Performance**

### Logs:
```
🔑 Fetching google key for podcast-studio from AI Inferencing...
✅ Retrieved google key for podcast-studio
📦 Using cached google key for podcast-studio (next 5min)
```

## 🧪 Testing

### Local Testing:
```bash
# Start AI Inferencing service
npm run dev  # Auto-starts all services

# Test key retrieval
curl http://localhost:9000/api/v1/keys/podcast-studio/google \
  -H "x-api-key: ai-inferencing-admin-key-2024"
```

### Unit Test Example:
```typescript
import { getAPIKey, clearKeyCache } from '@/lib/ai-inferencing-keys';

describe('AI Inferencing Keys', () => {
  beforeEach(() => {
    clearKeyCache();
  });

  it('should fetch Gemini key', async () => {
    const key = await getAPIKey('podcast-studio', 'google');
    expect(key).toBeDefined();
    expect(key.startsWith('AIza')).toBe(true);
  });

  it('should cache keys', async () => {
    const key1 = await getCachedAPIKey('podcast-studio', 'google');
    const key2 = await getCachedAPIKey('podcast-studio', 'google');
    expect(key1).toBe(key2);
  });
});
```

## 🔄 Migration from Direct Env Access

### Before:
```typescript
const geminiApiKey = process.env.GEMINI_API_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;
```

### After:
```typescript
import { PodcastStudioKeys } from '@/lib/ai-inferencing-keys';

const geminiApiKey = await PodcastStudioKeys.getGeminiKey();
const openaiApiKey = await PodcastStudioKeys.getOpenAIKey();
```

## 💡 Best Practices

1. **Always use cached version** in production:
   ```typescript
   const key = await getCachedAPIKey('service', 'provider');
   ```

2. **Handle errors gracefully**:
   ```typescript
   try {
     const key = await PodcastStudioKeys.getGeminiKey();
   } catch (error) {
     console.error('Failed to get key:', error);
     // Fallback or user notification
   }
   ```

3. **Clear cache after key rotation**:
   ```typescript
   // After updating key in AI Inferencing
   clearKeyCache('podcast-studio', 'google');
   ```

4. **Use service-specific helpers**:
   ```typescript
   // Good: Type-safe, clear intent
   const key = await PodcastStudioKeys.getGeminiKey();
   
   // Avoid: Generic, requires knowing service name
   const key = await getAPIKey('podcast-studio', 'google');
   ```

## 🆘 Troubleshooting

### "Failed to get API key: 404"
**Cause:** Key not registered in AI Inferencing Service

**Fix:** Go to AI Inferencing → API Keys → Add key for your service

### "Failed to get API key: 401"
**Cause:** Invalid admin API key

**Fix:** Check `NEXT_PUBLIC_AI_INFERENCING_ADMIN_KEY` in `.env.local`

### "Failed to get API key: ECONNREFUSED"
**Cause:** AI Inferencing service not running

**Fix:** Run `npm run dev` to start all services

### Using fallback environment variable
**Cause:** AI Inferencing service unavailable

**Fix:** Check service health at http://localhost:9000/health

## 📚 Related Documentation

- [Podcast Studio Key Migration](../PODCAST_STUDIO_KEY_MIGRATION.md)
- [AI Inferencing API](../../../../services/ai-inferencing/API_ENDPOINTS.md)
- [Auto-Start Services](../AUTO_START_SERVICES.md)
