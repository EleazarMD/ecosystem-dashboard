/**
 * Conversational Research API Endpoint
 * POST /api/research-lab/conversational-research
 * 
 * Handles conversational research queries with optional web search.
 * Supports multiple LLM providers (Claude, OpenAI, Perplexity).
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createResearchSession, initializeResearchDatabase, getResearchSession } from '@/lib/db/research-storage';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
const AI_GATEWAY_URL = process.env.NEXT_PUBLIC_AI_GATEWAY_AI_CLIENT_URL || 'http://localhost:8777';
const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY || process.env.NEXT_PUBLIC_AI_GATEWAY_API_KEY || 'ai-gateway-api-key-2024';
const HERMES_CORE_URL = process.env.HERMES_CORE_URL || 'http://localhost:8780';
const AI_INFERENCING_URL = process.env.AI_INFERENCING_URL || 'http://localhost:9000';

// Get Perplexity API key - env var first (fast), then AI Inferencing service
async function getPerplexityKey(): Promise<string | null> {
  // Check environment variable first (instant, no network call)
  const envKey = process.env.PERPLEXITY_API_KEY;
  if (envKey) {
    console.log('[Conversational Research] Using Perplexity key from environment');
    return envKey;
  }

  // Fallback: try AI Inferencing service with 2s timeout
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const response = await fetch(`${AI_INFERENCING_URL}/api/v1/keys/research-agent/perplexity`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (response.ok) {
      const data = await response.json();
      if (data.apiKey) return data.apiKey;
    }
  } catch (error) {
    console.warn('[Conversational Research] AI Inferencing key fetch failed/timed out:', error);
  }

  return null;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ConversationalResearchRequest {
  message: string;
  sessionId?: string;
  parentSessionId?: string;
  conversationHistory?: Message[];
  model: string;
  webSearch?: boolean;
  emailContext?: {
    emailId: string;
    contextSummary: string;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      message,
      sessionId,
      parentSessionId,
      conversationHistory = [],
      model,
      webSearch = false,
      emailContext,
    } = req.body as ConversationalResearchRequest;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const startTime = Date.now();
    console.log(`[Conversational Research] Model: ${model}, WebSearch: ${webSearch}`);

    // Generate or use existing session ID
    const currentSessionId = sessionId || `research-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Build conversation context
    const messages: Message[] = [
      {
        role: 'system',
        content: buildSystemPrompt(webSearch, emailContext),
      },
      ...conversationHistory.slice(-10), // Keep last 10 messages for context
      {
        role: 'user',
        content: message,
      },
    ];

    // Route to appropriate LLM based on model selection
    let response: string;
    let estimatedCost: number;
    let sources: Array<{ title: string; url: string; snippet?: string }> = [];

    if (model.toLowerCase().includes('claude') || model.toLowerCase().includes('sonnet')) {
      ({ response, estimatedCost } = await callClaude(messages, model));
    } else if (model.toLowerCase().includes('o1') || model.toLowerCase().includes('gpt')) {
      ({ response, estimatedCost } = await callOpenAI(messages, model));
    } else if (webSearch) {
      // Web search explicitly enabled — use Perplexity if available, otherwise Brave + Qwen
      console.log(`[Conversational Research] Fetching Perplexity key... (+${Date.now() - startTime}ms)`);
      const perplexityKey = await getPerplexityKey();
      console.log(`[Conversational Research] Key fetch done (+${Date.now() - startTime}ms), key found: ${!!perplexityKey}`);
      if (perplexityKey) {
        console.log(`[Conversational Research] Calling Perplexity API... (+${Date.now() - startTime}ms)`);
        const result = await callPerplexity(messages, model, perplexityKey);
        response = result.response;
        estimatedCost = result.estimatedCost;
        sources = result.sources || [];
        console.log(`[Conversational Research] Perplexity response received (+${Date.now() - startTime}ms), sources: ${sources.length}`);
      } else if (BRAVE_API_KEY) {
        console.log('[Conversational Research] Using Brave Search fallback (no Perplexity key)');
        ({ response, estimatedCost } = await callBraveSearch(message));
      } else {
        throw new Error('Web search requires either PERPLEXITY_API_KEY or BRAVE_API_KEY');
      }
    } else {
      // No web search — use local Qwen3 via AI Gateway (free, no API key needed)
      console.log(`[Conversational Research] Routing to Qwen via AI Gateway (webSearch=${webSearch}, model=${model})`);
      ({ response, estimatedCost } = await callLocalQwen(messages));
    }

    // Persist session to database so it appears in sidebar and inherits project_id
    try {
      await initializeResearchDatabase();

      // Inherit project_id from parent session if available
      let inheritedProjectId: string | undefined;
      const lookupId = parentSessionId || sessionId;
      if (lookupId) {
        try {
          const parentSession = await getResearchSession(lookupId);
          if (parentSession?.project_id) {
            inheritedProjectId = parentSession.project_id;
            console.log(`[Conversational Research] Inheriting project_id=${inheritedProjectId} from ${lookupId}`);
          }
        } catch (err) {
          console.warn('[Conversational Research] Failed to look up parent project:', err);
        }
      }

      await createResearchSession({
        session_id: currentSessionId,
        question: message.substring(0, 500),
        model: model as any,
        status: 'completed',
        progress: 100,
        report: response,
        estimated_cost: estimatedCost,
        parent_session_id: parentSessionId || sessionId || undefined,
        session_type: parentSessionId || sessionId ? 'follow_up' : 'original',
        project_id: inheritedProjectId,
      });
      console.log(`[Conversational Research] Session ${currentSessionId} saved to DB (project: ${inheritedProjectId || 'none'})`);
    } catch (dbErr) {
      console.warn('[Conversational Research] Failed to persist session to DB:', dbErr);
      // Non-fatal — still return the response
    }

    return res.status(200).json({
      success: true,
      response,
      sources,
      sessionId: currentSessionId,
      estimatedCost,
      model,
      webSearch,
    });

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Conversational Research] Error:', errMsg);
    console.error('[Conversational Research] Stack:', error instanceof Error ? error.stack : '');
    
    // Surface the actual upstream error so the frontend can display it
    const isTimeout = errMsg.includes('aborted') || errMsg.includes('timeout');
    const isConnection = errMsg.includes('ECONNREFUSED') || errMsg.includes('fetch failed');
    const isAuthError = errMsg.includes('401') || errMsg.includes('403') || errMsg.includes('Unauthorized');
    
    const userMessage = isTimeout
      ? 'Request timed out — the LLM took too long to respond. Try again or switch models.'
      : isConnection
      ? 'Cannot connect to the AI provider. Check that the service is running and API keys are valid.'
      : isAuthError
      ? 'Authentication failed — your API key may be invalid or expired. Check your .env.local settings.'
      : errMsg;

    return res.status(isTimeout ? 504 : isConnection ? 503 : isAuthError ? 401 : 500).json({
      error: userMessage,
      detail: errMsg,
    });
  }
}

function buildSystemPrompt(webSearch: boolean, emailContext?: any): string {
  let prompt = `You are an expert AI research assistant. Provide clear, accurate, and well-researched responses.`;

  if (webSearch) {
    prompt += ` You have access to real-time web search. Use it to provide up-to-date information with citations.`;
  }

  if (emailContext) {
    prompt += `\n\nEmail Context:\n${emailContext.contextSummary}`;
  }

  prompt += `\n\nFormat your responses with:
- Clear structure and headings
- Bullet points for lists
- Citations when referencing sources
- Code blocks for technical content`;

  return prompt;
}

async function callClaude(messages: Message[], model: string): Promise<{ response: string; estimatedCost: number }> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('Anthropic API key not configured');
  }

  const modelMap: Record<string, string> = {
    'claude-sonnet-4-5': 'claude-sonnet-4-20250514',
    'claude-sonnet-4': 'claude-sonnet-4-20250514',
    'claude-opus-4': 'claude-opus-4-20250514',
  };

  const apiModel = modelMap[model.toLowerCase()] || 'claude-sonnet-4-20250514';

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: apiModel,
      max_tokens: 4096,
      messages: messages.filter(m => m.role !== 'system'),
      system: messages.find(m => m.role === 'system')?.content,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.content[0].text;

  // Estimate cost (Claude Sonnet 4: $3/$15 per million tokens)
  const inputTokens = data.usage.input_tokens;
  const outputTokens = data.usage.output_tokens;
  const estimatedCost = (inputTokens * 3 + outputTokens * 15) / 1_000_000;

  return { response: content, estimatedCost };
}

async function callOpenAI(messages: Message[], model: string): Promise<{ response: string; estimatedCost: number }> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const modelMap: Record<string, string> = {
    'o1': 'o1',
    'o1-pro': 'o1-pro',
    'gpt-4': 'gpt-4-turbo',
    'gpt-4-turbo': 'gpt-4-turbo',
  };

  const apiModel = modelMap[model.toLowerCase()] || 'gpt-4-turbo';

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: apiModel,
      messages,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  // Estimate cost (GPT-4 Turbo: $10/$30 per million tokens)
  const inputTokens = data.usage.prompt_tokens;
  const outputTokens = data.usage.completion_tokens;
  const estimatedCost = (inputTokens * 10 + outputTokens * 30) / 1_000_000;

  return { response: content, estimatedCost };
}

async function callPerplexity(messages: Message[], model: string, apiKey: string): Promise<{ response: string; estimatedCost: number }> {
  // Use the selected Sonar model, fallback to sonar-pro for non-sonar models
  const apiModel = model.startsWith('sonar') ? model : 'sonar-pro';

  console.log(`[Conversational Research] Perplexity model: ${apiModel} (requested: ${model})`);

  // Build request body
  const requestBody: any = {
    model: apiModel,
    messages,
  };

  // sonar-pro and sonar support web_search_options
  if (apiModel === 'sonar-pro' || apiModel === 'sonar') {
    requestBody.web_search_options = { search_context_size: 'high' };
  }

  // 60s timeout for Perplexity API
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
    signal: controller.signal,
  });
  clearTimeout(timeout);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Perplexity API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  let content = data.choices[0].message.content;

  // Process Perplexity search_results
  const searchResults = data.search_results;
  const sources: Array<{ title: string; url: string; snippet?: string }> = [];

  if (searchResults && Array.isArray(searchResults) && searchResults.length > 0) {
    // Build URL map and sources array
    const urlMap: Record<number, string> = {};
    searchResults.forEach((source: any, index: number) => {
      urlMap[index + 1] = source.url;
      sources.push({
        title: source.title || source.url,
        url: source.url,
        snippet: source.snippet,
      });
    });

    // Replace inline [N] references with clickable markdown links [[N]](url)
    content = content.replace(/\[(\d+)\](?!\()/g, (match: string, num: string) => {
      const idx = parseInt(num, 10);
      if (urlMap[idx]) {
        return `[[${num}]](${urlMap[idx]})`;
      }
      return match;
    });
  }

  // Estimate cost (Sonar Pro: $3/$15 per million tokens)
  const inputTokens = data.usage?.prompt_tokens || 1000;
  const outputTokens = data.usage?.completion_tokens || 1000;
  const estimatedCost = (inputTokens * 3 + outputTokens * 15) / 1_000_000;

  return { response: content, estimatedCost, sources };
}

async function callBraveSearch(query: string): Promise<{ response: string; estimatedCost: number }> {
  if (!BRAVE_API_KEY) {
    throw new Error('Brave API key not configured');
  }

  // Search with Brave
  const params = new URLSearchParams({
    q: query,
    count: '10',
  });

  const searchResponse = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'X-Subscription-Token': BRAVE_API_KEY,
    },
  });

  if (!searchResponse.ok) {
    const error = await searchResponse.text();
    throw new Error(`Brave Search API error: ${searchResponse.status} - ${error}`);
  }

  const searchData = await searchResponse.json();

  // Extract search results
  const results = searchData.web?.results?.slice(0, 10) || [];
  const context = results.map((r: any, i: number) => 
    `[${i + 1}] ${r.title}\n${r.description}\nURL: ${r.url}`
  ).join('\n\n');

  // Synthesize with Qwen3 32B via AI Gateway
  const prompt = `Based on the following search results, provide a comprehensive answer to: "${query}"

Search Results:
${context}

Provide a well-structured response that:
- Directly answers the query
- Synthesizes information from multiple sources
- Includes relevant citations [1], [2], etc.
- Is accurate and up-to-date`;

  const qwenResponse = await fetch(`${AI_GATEWAY_URL}/api/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AI_GATEWAY_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'qwen3-32b',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 2048,
      temperature: 0.7,
    }),
  });

  if (!qwenResponse.ok) {
    const error = await qwenResponse.text();
    throw new Error(`AI Gateway error: ${qwenResponse.status} - ${error}`);
  }

  const qwenData = await qwenResponse.json();
  const content = qwenData.choices[0].message.content;

  // Local inference is free
  const estimatedCost = 0;

  return { response: content, estimatedCost };
}

async function callLocalQwen(messages: Message[]): Promise<{ response: string; estimatedCost: number }> {
  console.log('[Conversational Research] Using local Qwen3-32B via AI Gateway');

  const response = await fetch(`${AI_GATEWAY_URL}/api/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AI_GATEWAY_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'qwen3-32b',
      messages,
      max_tokens: 4096,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AI Gateway error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || 'No response generated';

  // Local inference is free
  return { response: content, estimatedCost: 0 };
}
