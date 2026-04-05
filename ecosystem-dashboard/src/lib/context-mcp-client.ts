/**
 * Context MCP Client (Browser-Safe Version)
 * REST-only client for browser environments
 * Server-side MCP is handled in API routes
 */

export interface PageContext {
  pageId: string;
  pageTitle: string;
  pageType: string;
  url: string;
  entities: any[];
  metrics: any[];
  filters: any[];
  selections: any[];
  userActivity?: any;
  visual?: any;
  suggestions: string[];
  timestamp: string;
  version: number;
}

export class ContextMCPClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:8405') {
    this.baseUrl = baseUrl;
  }

  /**
   * Get current context for a page (via REST API)
   */
  async getPageContext(pageId: string, includeVisual: boolean = false): Promise<PageContext | null> {
    return this.getPageContextViaREST(pageId);
  }

  /**
   * Get context via REST API (fallback)
   */
  private async getPageContextViaREST(pageId: string): Promise<PageContext | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${this.baseUrl}/api/context/${pageId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.debug(`🔇 Context MCP: Page ${pageId} not found`);
        return null;
      }

      const data = await response.json();
      return data.success ? data.context : null;
    } catch (error: any) {
      console.debug('🔇 Context MCP: REST request failed', error.message);
      return null;
    }
  }

  /**
   * Get context history for a page
   */
  async getContextHistory(pageId: string, limit: number = 10): Promise<PageContext[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${this.baseUrl}/api/context/${pageId}/history?limit=${limit}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.success ? data.history : [];
    } catch (error: any) {
      console.debug('🔇 Context MCP: History request failed', error.message);
      return [];
    }
  }

  /**
   * Get all active pages (via REST API)
   */
  async getActivePages(): Promise<any[]> {
    return this.getActivePagesViaREST();
  }

  /**
   * Get active pages via REST with timeout
   */
  private async getActivePagesViaREST(): Promise<any[]> {
    try {
      // Create an AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`⚠️ Context MCP: Service returned ${response.status}`);
        return [];
      }

      const data = await response.json();
      return data.pages || [];
    } catch (error: any) {
      // Don't log as error if it's just the service being unavailable
      if (error.name === 'AbortError') {
        console.debug('🔇 Context MCP: Request timeout (service may not be running)');
      } else {
        console.debug('🔇 Context MCP: Service unavailable', error.message);
      }
      return [];
    }
  }

  /**
   * Get suggestions for a page
   */
  async getSuggestions(pageId: string): Promise<string[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${this.baseUrl}/api/suggestions/${pageId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.success ? data.suggestions : [];
    } catch (error: any) {
      console.debug('🔇 Context MCP: Suggestions request failed', error.message);
      return [];
    }
  }

  /**
   * No cleanup needed for REST-only client
   */
  async close(): Promise<void> {
    // No-op for REST client
  }

  /**
   * Check server health
   */
  async checkHealth(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

// Singleton instance for use across the application
let contextMCPClient: ContextMCPClient | null = null;

export function getContextMCPClient(): ContextMCPClient {
  if (!contextMCPClient) {
    const contextServerUrl = process.env.NEXT_PUBLIC_CONTEXT_MCP_URL || 'http://localhost:8405';
    contextMCPClient = new ContextMCPClient(contextServerUrl);
  }
  return contextMCPClient;
}
