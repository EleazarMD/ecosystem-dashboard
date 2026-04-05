/**
 * Get Active Pages Tool - Context MCP Integration
 * Lists all pages currently streaming context to the Context MCP Server
 */

import { Tool, ToolContext } from '../ADKAgent';
import { ContextMCPClient } from '../../lib/context-mcp-client';

export class GetActivePagesTool implements Tool {
  public name = 'get_active_pages';
  public description = 'List all dashboard pages currently streaming real-time context. Use this to see which pages the user has open and are providing context data.';
  
  public input_schema = {
    type: 'object',
    properties: {
      include_summary: {
        type: 'boolean',
        description: 'Include summary statistics for each page (default: true)',
        default: true
      }
    }
  };

  public output_schema = {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      activePages: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            pageId: { type: 'string' },
            pageTitle: { type: 'string' },
            pageType: { type: 'string' },
            connected: { type: 'boolean' },
            lastUpdate: { type: 'string' },
            summary: { type: 'object' }
          }
        }
      },
      totalPages: { type: 'number' },
      message: { type: 'string' }
    }
  };

  private contextClient: ContextMCPClient;

  constructor() {
    const contextServerUrl = process.env.NEXT_PUBLIC_CONTEXT_MCP_URL || 'http://localhost:8405';
    this.contextClient = new ContextMCPClient(contextServerUrl);
  }

  public async execute(context: ToolContext, parameters: Record<string, any>): Promise<any> {
    const { include_summary = true } = parameters;
    const startTime = Date.now();

    try {
      console.log('[GetActivePagesTool] Fetching active pages');

      // Get active pages via REST API
      const activePages = await this.contextClient.getActivePages();

      if (!activePages || activePages.length === 0) {
        return {
          success: true,
          activePages: [],
          totalPages: 0,
          message: 'No pages are currently streaming context. User may need to navigate to a page.',
          hint: 'Pages that support context: Knowledge Graph, AI Inferencing',
          execution_time: Date.now() - startTime
        };
      }

      // Format pages with optional summaries
      const formattedPages = await Promise.all(
        activePages.map(async (page: any) => {
          const formatted: any = {
            pageId: page.pageId,
            pageTitle: page.pageTitle,
            pageType: page.pageType,
            connected: page.connected || true,
            lastUpdate: page.lastUpdate || page.timestamp
          };

          // Include summary if requested
          if (include_summary && page.pageId) {
            try {
              const pageContext = await this.contextClient.getPageContext(page.pageId, false);
              if (pageContext) {
                formatted.summary = {
                  entityCount: pageContext.entities?.length || 0,
                  metricCount: pageContext.metrics?.length || 0,
                  activeFilters: pageContext.filters?.length || 0,
                  hasUserActivity: !!pageContext.userActivity,
                  topEntities: (pageContext.entities || [])
                    .slice(0, 3)
                    .map((e: any) => `${e.name} (${e.type})`)
                };
              }
            } catch (error) {
              // Summary is optional, don't fail if we can't get it
              formatted.summary = null;
            }
          }

          return formatted;
        })
      );

      console.log(`[GetActivePagesTool] Found ${activePages.length} active page(s) in ${Date.now() - startTime}ms`);

      return {
        success: true,
        activePages: formattedPages,
        totalPages: activePages.length,
        message: `Found ${activePages.length} page(s) streaming context`,
        execution_time: Date.now() - startTime
      };

    } catch (error: any) {
      console.error('[GetActivePagesTool] Error:', error);
      
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve active pages. Context MCP Server may not be available.',
        execution_time: Date.now() - startTime
      };
    }
  }
}
