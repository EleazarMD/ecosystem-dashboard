# Podcast Studio LLM Integration

## Overview

The Podcast Studio uses the AI Homelab's centralized **AI Gateway** for all LLM operations. This provides seamless access to both **open source** (via Ollama) and **closed source** models without requiring direct API key management in the dashboard.

## Architecture

```
Podcast Studio → AI Gateway (Port 8777) → Providers
                                         ├── Ollama (Open Source)
                                         ├── OpenAI (Closed Source)
                                         ├── Anthropic (Closed Source)
                                         └── Google (Closed Source)
```

## Model Routing

The LLM service automatically routes models to the correct provider:

### Open Source Models (via Ollama)
All open source models are served through the local Ollama instance:

```typescript
'llama-3.1-70b'   → ollama/llama3.1:70b
'llama-3.1-8b'    → ollama/llama3.1:8b
'mixtral-8x7b'    → ollama/mixtral:8x7b
'qwen-2.5-72b'    → ollama/qwen2.5:72b
'deepseek-v2.5'   → ollama/deepseek-v2.5
'gemma-2-27b'     → ollama/gemma2:27b
```

### Closed Source Models (via Cloud APIs)
Closed source models route through their respective providers:

```typescript
'gpt-4'              → openai/gpt-4
'claude-3.5-sonnet'  → anthropic/claude-3.5-sonnet
'gemini-1.5-pro'     → google/gemini-1.5-pro
```

## Configuration

### Centralized API Key Management

**IMPORTANT:** Podcast Studio does NOT manage API keys directly. All provider API keys (OpenAI, Anthropic, Google) are managed centrally through the **AI Inferencing Dashboard** page.

### Architecture Flow

```
1. AI Inferencing Page → Configure Provider API Keys
   ├── OpenAI API Key (sk-...)
   ├── Anthropic API Key (sk-ant-...)
   └── Google API Key (...)

2. AI Gateway → Stores Encrypted Keys
   ├── Validates keys on configuration
   ├── Encrypts and stores securely
   └── Routes requests to correct provider

3. Dashboard Components → Use Single Gateway Key
   ├── Podcast Studio (uses NEXT_PUBLIC_AI_GATEWAY_API_KEY)
   ├── Voice Assistant (uses NEXT_PUBLIC_AI_GATEWAY_API_KEY)
   ├── DashAI (uses NEXT_PUBLIC_AI_GATEWAY_API_KEY)
   └── All other components (same key)
```

### Step-by-Step Setup

**1. Configure Dashboard Environment** (`.env.local`):
```bash
# AI Gateway Connection (same for ALL dashboard components)
NEXT_PUBLIC_AI_GATEWAY_AI_CLIENT_URL=http://localhost:8777
NEXT_PUBLIC_AI_GATEWAY_API_KEY=ai-gateway-api-key-2024

# PostgreSQL Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=ecosystem_dashboard
DATABASE_USER=dashboard_user
DATABASE_PASSWORD=your_secure_password

# Podcast Studio Preferences
PODCAST_CHAT_MODEL=gpt-4
PODCAST_ANALYSIS_MODEL=llama-3.1-70b
PODCAST_SCRIPT_MODEL=claude-3.5-sonnet
```

**2. Configure Provider Keys in AI Inferencing Dashboard:**

Navigate to **AI Inferencing** page in the dashboard and configure provider API keys:

- **OpenAI:** Enter `sk-...` key → Validate → Configure
- **Anthropic:** Enter `sk-ant-...` key → Validate → Configure  
- **Google:** Enter API key → Validate → Configure
- **Ollama:** No key needed (runs locally)

**3. Keys are Now Available Across Dashboard:**

Once configured in AI Inferencing, ALL dashboard components can use those providers:
- ✅ Podcast Studio can use GPT-4 for chat
- ✅ Voice Assistant can use Claude for responses
- ✅ DashAI can use Gemini for analysis
- ✅ All components share the same provider keys

## API Endpoints

### Chat Completions
```bash
POST /api/podcast-studio/llm/chat
Content-Type: application/json

{
  "model": "llama-3.1-70b",
  "messages": [
    { "role": "system", "content": "You are a helpful assistant" },
    { "role": "user", "content": "Analyze this document..." }
  ],
  "temperature": 0.7,
  "max_tokens": 2000
}
```

### Document Analysis
```bash
POST /api/podcast-studio/llm/analyze
Content-Type: application/json

{
  "content": "Document text here...",
  "type": "insights",  // or "summary" or "custom"
  "model": "llama-3.1-70b"
}
```

### Available Models
```bash
GET /api/podcast-studio/llm/models

Response:
{
  "health": {
    "healthy": true,
    "availableModels": ["llama3.1:70b", "gpt-4", ...],
    "providers": ["ollama", "openai", "anthropic"]
  },
  "configured": {
    "chatModel": "gpt-4",
    "analysisModel": "llama-3.1-70b",
    "scriptModel": "claude-3.5-sonnet"
  }
}
```

## Usage Examples

### Chat with AI
```typescript
import { podcastLLMService } from '@/lib/podcast-studio/llm-service';

const response = await podcastLLMService.chat({
  model: 'llama-3.1-70b',  // Open source via Ollama
  messages: [
    { role: 'user', content: 'What are the key findings?' }
  ],
  temperature: 0.7,
});

console.log(response.content);
```

### Analyze Document
```typescript
const insights = await podcastLLMService.extractInsights(
  documentContent
);

const summary = await podcastLLMService.summarizeDocument(
  documentContent,
  500 // max characters
);
```

### Generate Script
```typescript
const script = await podcastLLMService.generateScript({
  sources: [
    { title: 'Research Paper', content: '...' },
    { title: 'Article', content: '...' }
  ],
  length: 'default',
  tone: 'conversational',
  audience: 'general',
  style: 'co-host',
  includeStories: true,
  includeExamples: true,
});
```

## Model Selection in UI

Users can select models in the **Chat Settings** panel:

1. **Chat Model** - For conversational responses
2. **Source Analysis Model** - For PDF/document processing

Models are organized by:
- 🔒 **Closed Source** (Premium) - OpenAI, Anthropic, Google
- 🔓 **Open Source** (Free) - Llama, Mixtral, Qwen, etc.
- ⚡ **Specialized** - RAG-optimized, efficient models

## Benefits of Centralized Architecture

### ✅ Single Source of Truth
- **One place to manage API keys:** AI Inferencing dashboard
- **All components share keys:** No duplicate configuration
- **Consistent access control:** Single gateway authentication key

### 🔐 Enhanced Security  
- **Provider keys encrypted:** Stored securely in AI Gateway
- **No frontend exposure:** Keys never reach browser
- **Single attack surface:** Protect one gateway vs. multiple components
- **Audit trail:** All API calls logged centrally

### 💰 Cost Management
- **Unified billing:** Track costs across all dashboard features
- **Shared rate limits:** Optimize usage across components
- **Provider comparison:** See actual costs per feature in one place
- **Budget controls:** Set limits once, apply everywhere

### 🔄 Operational Simplicity
- **Update once, apply everywhere:** Change OpenAI key → all components updated
- **No coordination needed:** Podcast Studio, Voice Agent, DashAI all work immediately
- **Automatic failover:** AI Gateway handles provider outages
- **Load balancing:** Distribute requests across providers

### 📊 Centralized Monitoring
- **Single dashboard:** See all LLM usage in AI Inferencing page
- **Per-component metrics:** Track which features use which providers
- **Performance insights:** Compare latency across providers
- **Cost attribution:** Know which features cost what

### 🏠 Privacy Options
- **Local-first possible:** Use only Ollama, zero cloud API calls
- **Hybrid mode:** Free local for analysis, premium cloud for generation  
- **Data residency:** Control where your data goes
- **No vendor lock-in:** Switch providers without changing components

### ✅ Cost Optimization
- Use free open source models for analysis
- Reserve premium models for final generation
- Track usage and costs centrally

### ✅ Flexibility
- Switch between models without code changes
- Test different models for different tasks
- A/B test model performance

## Recommended Model Combinations

### Budget-Conscious (All Open Source)
```bash
PODCAST_CHAT_MODEL=llama-3.1-70b
PODCAST_ANALYSIS_MODEL=llama-3.1-70b
PODCAST_SCRIPT_MODEL=mixtral-8x22b
```

### Balanced (Mixed)
```bash
PODCAST_CHAT_MODEL=gpt-4
PODCAST_ANALYSIS_MODEL=llama-3.1-70b  # Free for bulk analysis
PODCAST_SCRIPT_MODEL=claude-3.5-sonnet # Premium for quality
```

### Premium (All Closed Source)
```bash
PODCAST_CHAT_MODEL=gpt-4o
PODCAST_ANALYSIS_MODEL=claude-3-opus
PODCAST_SCRIPT_MODEL=claude-3.5-sonnet
```

### Privacy-First (Local Only)
```bash
PODCAST_CHAT_MODEL=llama-3.1-70b
PODCAST_ANALYSIS_MODEL=llama-3.1-70b
PODCAST_SCRIPT_MODEL=mixtral-8x22b
# All data stays on your machine via Ollama
```

## Troubleshooting

### AI Gateway Connection Issues
```bash
# Check AI Gateway is running
curl -H "X-API-Key: ai-gateway-api-key-2024" \
  http://localhost:8777/api/v1/health/comprehensive

# Check Ollama is running
curl http://localhost:11434/api/tags
```

### Model Not Available
```bash
# Pull model in Ollama
ollama pull llama3.1:70b

# Verify in AI Gateway
curl -H "X-API-Key: ai-gateway-api-key-2024" \
  http://localhost:8777/api/v1/models
```

### Provider Not Configured
```bash
# Check AI Gateway provider status
curl -H "X-API-Key: ai-gateway-api-key-2024" \
  http://localhost:8777/api/v1/providers/status
```

## Integration with DynamicModelConfig

The LLM service integrates with the existing `DynamicModelConfig` singleton for ecosystem-wide model management:

```typescript
import { modelConfig } from '@/lib/DynamicModelConfig';

// Get current global model
const currentModel = modelConfig.getCurrentModel();

// Update global model (notifies all agents)
await modelConfig.updateModel('llama3.1:70b');

// Subscribe to model changes
modelConfig.onModelChange((newModel) => {
  console.log('Model changed to:', newModel);
});
```

## Security

- ✅ API keys never exposed to frontend
- ✅ All requests authenticated via AI Gateway
- ✅ Rate limiting handled by AI Gateway
- ✅ Request logging for audit trails
- ✅ Support for private/local models via Ollama

## Performance

- **Open Source**: ~2-5s response time (local Ollama)
- **Closed Source**: ~1-3s response time (cloud APIs)
- **Streaming**: Supported for real-time responses
- **Batch Processing**: Parallel document analysis

## Future Enhancements

- [ ] Streaming responses for real-time feedback
- [ ] Model performance benchmarking
- [ ] Automatic model selection based on task
- [ ] Cost tracking per podcast project
- [ ] Model A/B testing framework
- [ ] Fine-tuned models for podcast generation
