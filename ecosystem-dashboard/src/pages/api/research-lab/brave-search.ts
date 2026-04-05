/**
 * Brave Search API Endpoint
 * POST /api/research-lab/brave-search
 * 
 * Direct Brave Search integration for web search without Perplexity
 */

import type { NextApiRequest, NextApiResponse } from 'next';

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

interface BraveSearchRequest {
  query: string;
  count?: number;
  freshness?: string;
}

interface BraveSearchResult {
  title: string;
  url: string;
  description: string;
  age?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query, count = 10, freshness } = req.body as BraveSearchRequest;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    if (!BRAVE_API_KEY) {
      return res.status(500).json({ error: 'Brave API key not configured' });
    }

    console.log(`[Brave Search] Searching for: ${query}`);

    // Search with Brave
    const searchResults = await searchBrave(query, count, freshness);

    // Synthesize results with Claude
    const synthesis = await synthesizeResults(query, searchResults);

    return res.status(200).json({
      success: true,
      query,
      results: searchResults,
      synthesis,
      resultCount: searchResults.length,
    });

  } catch (error) {
    console.error('[Brave Search] Error:', error);
    return res.status(500).json({
      error: 'Search failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

async function searchBrave(
  query: string,
  count: number,
  freshness?: string
): Promise<BraveSearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    count: count.toString(),
  });

  if (freshness) {
    params.append('freshness', freshness);
  }

  const response = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'X-Subscription-Token': BRAVE_API_KEY!,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Brave Search API error: ${response.status} - ${error}`);
  }

  const data = await response.json();

  // Extract web results
  const results: BraveSearchResult[] = [];
  
  if (data.web?.results) {
    for (const result of data.web.results.slice(0, count)) {
      results.push({
        title: result.title,
        url: result.url,
        description: result.description,
        age: result.age,
      });
    }
  }

  return results;
}

async function synthesizeResults(
  query: string,
  results: BraveSearchResult[]
): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    // Return simple concatenation if no Claude API
    return results.map((r, i) => 
      `${i + 1}. **${r.title}**\n   ${r.description}\n   Source: ${r.url}\n`
    ).join('\n');
  }

  // Build context from search results
  const context = results.map((r, i) => 
    `[${i + 1}] ${r.title}\n${r.description}\nURL: ${r.url}`
  ).join('\n\n');

  const prompt = `Based on the following search results, provide a comprehensive answer to the query: "${query}"

Search Results:
${context}

Provide a well-structured response that:
- Directly answers the query
- Synthesizes information from multiple sources
- Includes relevant citations [1], [2], etc.
- Is accurate and up-to-date`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content[0].text;
}
