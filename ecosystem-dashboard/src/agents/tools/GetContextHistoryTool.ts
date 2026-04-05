/**
 * Get Context History Tool - Context MCP Integration
 * Retrieves historical context snapshots for a page
 */

import { Tool, ToolContext } from '../ADKAgent';
import { ContextMCPClient } from '../../lib/context-mcp-client';

export class GetContextHistoryTool implements Tool {
  public name = 'get_context_history';
  public description = 'Get historical context snapshots for a dashboard page to see how the page state has changed over time. Use this to analyze trends, compare previous states, or understand user workflow patterns.';
  
  public input_schema = {
    type: 'object',
    properties: {
      page_id: {
        type: 'string',
        description: 'Page identifier to get history for',
        enum: ['knowledge-graph', 'ai-inferencing', 'workspace', 'podcast-studio', 'research-lab']
      },
      limit: {
        type: 'number',
        description: 'Maximum number of historical snapshots to return (default: 10, max: 50)',
        default: 10,
        minimum: 1,
        maximum: 50
      }
    },
    required: ['page_id']
  };

  public output_schema = {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      history: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            timestamp: { type: 'string' },
            snapshot: { type: 'object' }
          }
        }
      },
      count: { type: 'number' },
      message: { type: 'string' }
    }
  };

  private contextClient: ContextMCPClient;

  constructor() {
    const contextServerUrl = process.env.NEXT_PUBLIC_CONTEXT_MCP_URL || 'http://localhost:8405';
    this.contextClient = new ContextMCPClient(contextServerUrl);
  }

  public async execute(context: ToolContext, parameters: Record<string, any>): Promise<any> {
    const { page_id, limit = 10 } = parameters;
    const startTime = Date.now();

    try {
      console.log(`[GetContextHistoryTool] Fetching history for page: ${page_id} (limit: ${limit})`);

      // Get context history via REST API
      const history = await this.contextClient.getContextHistory(page_id, limit);

      if (!history || history.length === 0) {
        return {
          success: true,
          history: [],
          count: 0,
          message: `No historical context found for page "${page_id}"`,
          execution_time: Date.now() - startTime
        };
      }

      // Format history for the agent
      const formattedHistory = history.map((snapshot: any) => ({
        timestamp: snapshot.timestamp,
        summary: this.summarizeSnapshot(snapshot),
        changes: this.detectChanges(snapshot, history),
        entityCount: snapshot.entities?.length || 0,
        metricCount: snapshot.metrics?.length || 0
      }));

      console.log(`[GetContextHistoryTool] Retrieved ${history.length} snapshots in ${Date.now() - startTime}ms`);

      return {
        success: true,
        history: formattedHistory,
        count: history.length,
        message: `Retrieved ${history.length} historical context snapshot(s) for "${page_id}"`,
        execution_time: Date.now() - startTime
      };

    } catch (error: any) {
      console.error('[GetContextHistoryTool] Error:', error);
      
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve context history',
        execution_time: Date.now() - startTime
      };
    }
  }

  /**
   * Summarize a context snapshot
   */
  private summarizeSnapshot(snapshot: any): any {
    return {
      pageTitle: snapshot.pageTitle,
      entityTypes: this.groupByType(snapshot.entities || []),
      keyMetrics: (snapshot.metrics || []).slice(0, 5).map((m: any) => ({
        label: m.label,
        value: m.value,
        unit: m.unit
      })),
      activeFilters: (snapshot.filters || []).length,
      userAction: snapshot.userActivity?.action || 'unknown'
    };
  }

  /**
   * Detect changes between snapshots
   */
  private detectChanges(current: any, history: any[]): string[] {
    const changes: string[] = [];
    
    if (history.length < 2) return changes;
    
    const previous = history[1]; // Previous snapshot
    
    // Compare entity counts
    if (current.entities?.length !== previous.entities?.length) {
      changes.push(`Entity count changed: ${previous.entities?.length || 0} → ${current.entities?.length || 0}`);
    }
    
    // Compare filter count
    if ((current.filters?.length || 0) !== (previous.filters?.length || 0)) {
      changes.push(`Filters changed: ${previous.filters?.length || 0} → ${current.filters?.length || 0}`);
    }
    
    // Compare user activity
    if (current.userActivity?.action !== previous.userActivity?.action) {
      changes.push(`User action: ${previous.userActivity?.action} → ${current.userActivity?.action}`);
    }
    
    return changes;
  }

  /**
   * Group entities by type
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
