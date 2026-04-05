import { NextApiRequest, NextApiResponse } from 'next';

// Use local vLLM directly (AI Inferencing Service doesn't have chat completions endpoint mounted)
const VLLM_URL = process.env.VLLM_URL || 'http://localhost:8010/v1';

// Context window limits (in characters, roughly 4 chars per token)
const QWEN_CONTEXT_LIMIT_CHARS = 32000 * 4; // ~32K tokens for Qwen3-32B
const GEMINI_FLASH_CONTEXT_LIMIT_CHARS = 1000000 * 4; // ~1M tokens for Gemini Flash

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Estimate total context size from messages
 */
function estimateContextSize(messages: Message[]): number {
  return messages.reduce((total, msg) => total + (msg.content?.length || 0), 0);
}

/**
 * Call Gemini Flash API for large context
 */
async function callGeminiFlash(messages: Message[], temperature: number, maxTokens: number): Promise<any> {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured. Set GEMINI_API_KEY or GOOGLE_API_KEY environment variable.');
  }
  
  const model = 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  
  // Convert messages to Gemini format
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));
  
  // Add system instruction if present
  const systemMessage = messages.find(m => m.role === 'system');
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_API_KEY,
    },
    body: JSON.stringify({
      contents,
      systemInstruction: systemMessage ? { parts: [{ text: systemMessage.content }] } : undefined,
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      },
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }
  
  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  // Return in OpenAI-compatible format
  return {
    choices: [{
      message: {
        role: 'assistant',
        content,
      },
      finish_reason: 'stop',
    }],
    model: 'gemini-2.0-flash',
    usage: {
      prompt_tokens: data.usageMetadata?.promptTokenCount || 0,
      completion_tokens: data.usageMetadata?.candidatesTokenCount || 0,
      total_tokens: data.usageMetadata?.totalTokenCount || 0,
    },
    _autoSwitched: true,
    _reason: 'Context exceeded Qwen limit, auto-switched to Gemini Flash',
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, model = 'qwen3-32b', temperature = 0.3, max_tokens = 2000 } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Estimate context size
    const contextSize = estimateContextSize(messages);
    const isLargeContext = contextSize > QWEN_CONTEXT_LIMIT_CHARS;
    
    console.log(`💬 Chat request: ${messages.length} messages, model: ${model}, context: ${Math.round(contextSize / 1000)}K chars`);

    // Auto-switch to Gemini Flash for large contexts
    if (isLargeContext && (model === 'qwen3-32b' || model.startsWith('qwen'))) {
      console.log(`⚡ Context (${Math.round(contextSize / 1000)}K chars) exceeds Qwen limit (${Math.round(QWEN_CONTEXT_LIMIT_CHARS / 1000)}K chars)`);
      console.log(`🔄 Auto-switching to Gemini 2.0 Flash for large document processing`);
      
      try {
        const geminiResponse = await callGeminiFlash(messages, temperature, max_tokens);
        console.log('✅ Gemini Flash response generated successfully (auto-switched)');
        return res.status(200).json(geminiResponse);
      } catch (geminiError) {
        console.error('❌ Gemini Flash fallback failed:', geminiError);
        // Continue to try vLLM anyway as last resort
      }
    }

    console.log(`🔌 Using local vLLM: ${VLLM_URL}`);

    // Call local vLLM directly
    const aiResponse = await fetch(`${VLLM_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('❌ vLLM error:', {
        status: aiResponse.status,
        statusText: aiResponse.statusText,
        error: errorText,
      });
      
      // If vLLM fails with context error, try Gemini as fallback
      if (aiResponse.status === 400 && errorText.includes('context')) {
        console.log('🔄 vLLM context error, attempting Gemini Flash fallback...');
        try {
          const geminiResponse = await callGeminiFlash(messages, temperature, max_tokens);
          console.log('✅ Gemini Flash fallback successful');
          return res.status(200).json(geminiResponse);
        } catch (geminiError) {
          console.error('❌ Gemini Flash fallback also failed:', geminiError);
        }
      }
      
      return res.status(aiResponse.status).json({
        error: `vLLM request failed: ${aiResponse.statusText}`,
        details: errorText,
      });
    }

    const data = await aiResponse.json();

    console.log('✅ Chat response generated successfully');

    return res.status(200).json(data);
  } catch (error) {
    console.error('❌ Chat API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
