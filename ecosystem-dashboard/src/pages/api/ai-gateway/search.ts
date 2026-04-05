import { NextApiRequest, NextApiResponse } from 'next';

/**
 * AI Gateway Perplexity Search API Endpoint
 * Proxies search requests to Perplexity AI via AI Gateway service
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query, options = {} } = req.body;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Query parameter is required' });
  }

  try {
    console.log('🔍 Perplexity Search API:', { query: query.substring(0, 100) });

    // Forward request to AI Gateway completions endpoint with search context (Port 8777 for AI operations)
    const response = await fetch('http://localhost:8777/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Source': 'dashboard-search-proxy'
      },
      body: JSON.stringify({
        model: options.model || 'llama3.2:3b',
        messages: [{
          role: 'system',
          content: 'You are a research assistant. Provide comprehensive, well-researched answers with citations when possible. Focus on current, accurate information.'
        }, {
          role: 'user',
          content: `Please research and provide detailed information about: ${query.trim()}`
        }],
        max_tokens: options.max_tokens || 1000,
        temperature: options.temperature || 0.2,
        stream: false
      }),
      signal: (() => {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 45000);
        return controller.signal;
      })() // Longer timeout for web search
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway search error:', response.status, errorText);
      throw new Error(`AI Gateway search failed with ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    
    console.log('✅ Perplexity search response received');

    // Transform response to standardized format
    const transformedResponse = {
      id: `search-${Date.now()}`,
      object: 'search.result',
      created: Math.floor(Date.now() / 1000),
      query: query,
      model: result.model || options.model,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: result.message?.content || result.content || 'No search results found'
        },
        finish_reason: result.done_reason || 'stop'
      }],
      citations: [], // Mock citations for now since we're using local LLM
      images: [],
      related_questions: [], // Mock related questions
      usage: {
        prompt_tokens: result.prompt_eval_count || 0,
        completion_tokens: result.eval_count || 0,
        total_tokens: (result.prompt_eval_count || 0) + (result.eval_count || 0)
      }
    };

    res.json(transformedResponse);

  } catch (error) {
    console.error('❌ Perplexity search error:', error);
    
    res.status(500).json({
      error: {
        message: `Perplexity search is unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'api_error',
        code: 'search_unavailable'
      },
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: 'I apologize, but I cannot perform web searches at the moment. The Perplexity search service is unavailable.'
        },
        finish_reason: 'error'
      }],
      citations: [],
      images: [],
      related_questions: []
    });
  }
}
