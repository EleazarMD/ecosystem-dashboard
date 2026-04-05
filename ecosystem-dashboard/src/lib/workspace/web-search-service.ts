/**
 * Web Search Service
 * Integrates with Tavily API for real-time web search
 * Part of Phase 1: Dual-Search Engine
 */

import { tavily } from '@tavily/core';

export interface WebSearchResult {
  url: string;
  title: string;
  snippet: string;
  domain: string;
  publishedDate?: string;
  relevanceScore: number;
  raw?: any;
}

export interface WebSearchOptions {
  maxResults?: number;
  searchDepth?: 'basic' | 'advanced';
  includeImages?: boolean;
  includeDomains?: string[];
  excludeDomains?: string[];
}

export class WebSearchService {
  private client: any;
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.TAVILY_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('[WebSearchService] No Tavily API key configured. Web search will be disabled.');
    }
  }

  /**
   * Check if web search is available
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Perform web search using Tavily API
   */
  async search(query: string, options?: WebSearchOptions): Promise<WebSearchResult[]> {
    if (!this.apiKey) {
      throw new Error('Tavily API key not configured. Please set TAVILY_API_KEY environment variable.');
    }

    try {
      const tvly = tavily({ apiKey: this.apiKey });

      const response = await tvly.search(query, {
        maxResults: options?.maxResults || 10,
        searchDepth: options?.searchDepth || 'basic',
        includeImages: options?.includeImages || false,
        includeDomains: options?.includeDomains || [],
        excludeDomains: options?.excludeDomains || [],
      });

      if (!response.results || !Array.isArray(response.results)) {
        console.error('[WebSearchService] Invalid response format:', response);
        return [];
      }

      return response.results.map((result: any) => ({
        url: result.url,
        title: result.title || 'Untitled',
        snippet: result.content || '',
        domain: this.extractDomain(result.url),
        publishedDate: result.publishedDate,
        relevanceScore: result.score || 0.5,
        raw: result,
      }));
    } catch (error) {
      console.error('[WebSearchService] Search error:', error);
      throw new Error(`Web search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search with answer synthesis (Tavily's answer feature)
   */
  async searchWithAnswer(query: string, options?: WebSearchOptions): Promise<{
    answer: string;
    results: WebSearchResult[];
  }> {
    if (!this.apiKey) {
      throw new Error('Tavily API key not configured. Please set TAVILY_API_KEY environment variable.');
    }

    try {
      const tvly = tavily({ apiKey: this.apiKey });

      const response = await tvly.search(query, {
        maxResults: options?.maxResults || 10,
        searchDepth: options?.searchDepth || 'advanced',
        includeAnswer: true,
        includeImages: options?.includeImages || false,
        includeDomains: options?.includeDomains || [],
        excludeDomains: options?.excludeDomains || [],
      });

      const results = (response.results || []).map((result: any) => ({
        url: result.url,
        title: result.title || 'Untitled',
        snippet: result.content || '',
        domain: this.extractDomain(result.url),
        publishedDate: result.publishedDate,
        relevanceScore: result.score || 0.5,
        raw: result,
      }));

      return {
        answer: response.answer || '',
        results,
      };
    } catch (error) {
      console.error('[WebSearchService] Search with answer error:', error);
      throw new Error(`Web search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return 'unknown';
    }
  }

  /**
   * Validate Tavily API key
   */
  async validateApiKey(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      const tvly = tavily({ apiKey: this.apiKey });
      await tvly.search('test', { maxResults: 1 });
      return true;
    } catch {
      return false;
    }
  }
}

// Singleton instance
let webSearchServiceInstance: WebSearchService | null = null;

export function getWebSearchService(): WebSearchService {
  if (!webSearchServiceInstance) {
    webSearchServiceInstance = new WebSearchService();
  }
  return webSearchServiceInstance;
}
