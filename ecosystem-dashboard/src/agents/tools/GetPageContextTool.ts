/**
 * Get Page Context Tool - Context MCP Integration
 * Retrieves real-time context from dashboard pages via Context MCP Server
 */

import { Tool, ToolContext } from '../ADKAgent';
import { ContextMCPClient, PageContext } from '../../lib/context-mcp-client';

export class GetPageContextTool implements Tool {
  public name = 'get_page_context';
  public description = 'Get real-time context from the current dashboard page including entities (services, agents, databases), metrics (performance data), filters, user selections, and activity. Use this when user asks "what am I looking at?", "what page is this?", or needs context about their current view.';
  
  public input_schema = {
    type: 'object',
    properties: {
      page_id: {
        type: 'string',
        description: 'Page identifier (e.g., "knowledge-graph", "ai-inferencing", "workspace", "podcast-studio")',
        enum: ['knowledge-graph', 'ai-inferencing', 'workspace', 'podcast-studio', 'research-lab']
      },
      include_visual: {
        type: 'boolean',
        description: 'Include visual screenshot data (default: false)',
        default: false
      }
    },
    required: ['page_id']
  };

  public output_schema = {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      context: {
        type: 'object',
        properties: {
          pageId: { type: 'string' },
          pageTitle: { type: 'string' },
          pageType: { type: 'string' },
          entities: { type: 'array' },
          metrics: { type: 'array' },
          filters: { type: 'array' },
          selections: { type: 'array' },
          userActivity: { type: 'object' },
          suggestions: { type: 'array' },
          timestamp: { type: 'string' }
        }
      },
      message: { type: 'string' }
    }
  };

  private contextClient: ContextMCPClient;

  constructor() {
    const contextServerUrl = process.env.NEXT_PUBLIC_CONTEXT_MCP_URL || 'http://localhost:8405';
    this.contextClient = new ContextMCPClient(contextServerUrl);
  }

  public async execute(context: ToolContext, parameters: Record<string, any>): Promise<any> {
    const { page_id, include_visual = false } = parameters;
    const startTime = Date.now();

    try {
      console.log(`[GetPageContextTool] Fetching context for page: ${page_id}`);

      // Get page context via REST API fallback (MCP not required for this)
      const pageContext = await this.contextClient.getPageContext(page_id, include_visual);

      if (!pageContext) {
        return {
          success: false,
          message: `Page "${page_id}" not found or not currently active. Make sure the user is on this page.`,
          available_pages: ['knowledge-graph', 'ai-inferencing'],
          execution_time: Date.now() - startTime
        };
      }

      // Format the context for the agent
      const formattedContext = this.formatContextForAgent(pageContext);

      console.log(`[GetPageContextTool] Context retrieved successfully in ${Date.now() - startTime}ms`);

      return {
        success: true,
        context: formattedContext,
        message: `Retrieved context for "${pageContext.pageTitle}" page`,
        execution_time: Date.now() - startTime
      };

    } catch (error: any) {
      console.error('[GetPageContextTool] Error:', error);
      
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve page context. Context MCP Server may not be available.',
        hint: 'Make sure the user is on a page that streams context (Knowledge Graph, AI Inferencing)',
        execution_time: Date.now() - startTime
      };
    }
  }

  /**
   * Format page context into a structured format for the agent
   */
  private formatContextForAgent(context: PageContext): any {
    const formatted: any = {
      page: {
        id: context.pageId,
        title: context.pageTitle,
        type: context.pageType,
        url: context.url
      },
      timestamp: context.timestamp
    };

    // Format entities
    if (context.entities && context.entities.length > 0) {
      formatted.entities = {
        count: context.entities.length,
        types: this.groupByType(context.entities),
        list: context.entities.map(e => ({
          name: e.name,
          type: e.type,
          status: e.status,
          metadata: e.metadata
        }))
      };
    }

    // Format metrics
    if (context.metrics && context.metrics.length > 0) {
      formatted.metrics = {
        count: context.metrics.length,
        summary: context.metrics.map(m => ({
          label: m.label,
          value: m.value,
          unit: m.unit,
          key: m.key
        }))
      };
    }

    // Format filters
    if (context.filters && context.filters.length > 0) {
      formatted.activeFilters = context.filters.map(f => ({
        field: f.field,
        operator: f.operator,
        value: f.value
      }));
    }

    // Format selections
    if (context.selections && context.selections.length > 0) {
      formatted.userSelections = context.selections.map(s => ({
        type: s.type,
        id: s.id,
        metadata: s.metadata
      }));
    }

    // User activity
    if (context.userActivity) {
      formatted.userActivity = {
        action: context.userActivity.action,
        element: context.userActivity.element,
        elementType: context.userActivity.elementType,
        interactionCount: context.userActivity.interactionCount,
        metadata: context.userActivity.metadata
      };
    }

    // Suggestions
    if (context.suggestions && context.suggestions.length > 0) {
      formatted.suggestions = context.suggestions;
    }

    return formatted;
  }

  /**
   * Group entities by type for summary
   */
  private groupByType(entities: any[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    
    entities.forEach(entity => {
      const type = entity.type || 'unknown';
      grouped[type] = (grouped[type] || 0) + 1;
    });

    return grouped;
  }
}
