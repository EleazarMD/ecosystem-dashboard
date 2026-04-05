/**
 * Brave Search Service
 * Web search via Brave Search API - routed through AI Gateway
 */

export interface BraveSearchResult {
  title: string;
  url: string;
  snippet: string;
  age?: string;
  score?: number;
}

export interface BraveSearchResponse {
  success: boolean;
  query: string;
  results: BraveSearchResult[];
  totalResults: number;
  error?: string;
}

export interface BraveSearchOptions {
  count?: number;
  freshness?: 'pd' | 'pw' | 'pm' | 'py' | '';
}

const BRAVE_SEARCH_URL = 'https://api.search.brave.com/res/v1/web/search';

/**
 * Get Brave API key from environment or AI Gateway
 */
async function getBraveApiKey(): Promise<string> {
  // Try environment variable first
  const envKey = process.env.BRAVE_API_KEY || process.env.NEXT_PUBLIC_BRAVE_API_KEY;
  if (envKey) {
    return envKey;
  }

  // Try fetching from AI Inferencing Service
  try {
    const response = await fetch('http://localhost:9000/api/v1/keys/workspace-ai/brave');
    if (response.ok) {
      const data = await response.json();
      if (data.apiKey) {
        return data.apiKey;
      }
    }
  } catch (error) {
    console.warn('[BraveSearch] Could not fetch API key from AI Inferencing:', error);
  }

  return '';
}

/**
 * Search the web using Brave Search API
 */
export async function braveSearch(
  query: string,
  options: BraveSearchOptions = {}
): Promise<BraveSearchResponse> {
  const { count = 10, freshness = '' } = options;

  const apiKey = await getBraveApiKey();
  if (!apiKey) {
    return {
      success: false,
      query,
      results: [],
      totalResults: 0,
      error: 'Brave API key not configured',
    };
  }

  try {
    const params = new URLSearchParams({
      q: query,
      count: String(Math.min(count, 20)),
    });

    if (freshness) {
      params.append('freshness', freshness);
    }

    const response = await fetch(`${BRAVE_SEARCH_URL}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        query,
        results: [],
        totalResults: 0,
        error: `Brave API error: ${response.status} - ${errorText}`,
      };
    }

    const data = await response.json();
    const webResults = data.web?.results || [];

    const results: BraveSearchResult[] = webResults.slice(0, count).map((result: any, index: number) => ({
      title: result.title || 'Untitled',
      url: result.url || '',
      snippet: result.description || '',
      age: result.age || '',
      score: 1 - (index / count),
    }));

    return {
      success: true,
      query,
      results,
      totalResults: results.length,
    };
  } catch (error) {
    console.error('[BraveSearch] Search error:', error);
    return {
      success: false,
      query,
      results: [],
      totalResults: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Format search results for display
 */
export function formatBraveResults(response: BraveSearchResponse): string {
  if (!response.success) {
    return `Search failed: ${response.error}`;
  }

  if (response.results.length === 0) {
    return `No results found for: ${response.query}`;
  }

  let formatted = `## Web Search Results for: ${response.query}\n\n`;

  response.results.forEach((result, index) => {
    formatted += `### ${index + 1}. ${result.title}\n`;
    formatted += `**URL:** ${result.url}\n`;
    if (result.age) {
      formatted += `**Age:** ${result.age}\n`;
    }
    if (result.snippet) {
      formatted += `${result.snippet}\n`;
    }
    formatted += '\n';
  });

  formatted += `\n*${response.results.length} results from Brave Search*`;

  return formatted;
}

export default {
  search: braveSearch,
  formatResults: formatBraveResults,
};
