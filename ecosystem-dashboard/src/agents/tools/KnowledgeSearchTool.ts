/**
 * Knowledge Search Tool - ADK/A2A Compliant
 * Searches knowledge graph and documentation
 */

import { Tool, ToolContext } from '../ADKAgent';

export class KnowledgeSearchTool implements Tool {
  name = 'knowledge_search';
  description = 'Search knowledge graph, documentation, and system information';
  
  input_schema = {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query'
      },
      type: {
        type: 'string',
        description: 'Type of knowledge to search',
        enum: ['documentation', 'system', 'history', 'all']
      },
      limit: {
        type: 'number',
        description: 'Maximum results to return',
        default: 5
      }
    },
    required: ['query']
  };

  output_schema = {
    type: 'object',
    properties: {
      status: { type: 'string' },
      results: { type: 'array' },
      sources: { type: 'array' },
      confidence: { type: 'number' }
    }
  };

  async execute(context: ToolContext, parameters: { query: string; type?: string; limit?: number }): Promise<any> {
    const { query, type = 'all', limit = 5 } = parameters;
    
    // Search memory entities first
    const memoryResults = context.state.memoryEntities
      .filter(entity => {
        const searchText = JSON.stringify(entity.content).toLowerCase();
        return searchText.includes(query.toLowerCase());
      })
      .sort((a, b) => b.importance - a.importance)
      .slice(0, limit);

    // Search conversation history
    const historyResults = context.state.conversationHistory
      .filter(msg => msg.content.toLowerCase().includes(query.toLowerCase()))
      .slice(-limit);

    // Simulate knowledge graph search
    const knowledgeResults = this.searchKnowledgeBase(query, type);

    const results = [
      ...memoryResults.map(m => ({
        type: 'memory',
        content: m.content,
        timestamp: m.timestamp,
        relevance: m.importance
      })),
      ...historyResults.map(h => ({
        type: 'conversation',
        content: h.content,
        timestamp: h.timestamp,
        relevance: 0.7
      })),
      ...knowledgeResults
    ].slice(0, limit);

    const confidence = results.length > 0 ? 
      results.reduce((acc, r) => acc + r.relevance, 0) / results.length : 0;

    // Add search to memory
    context.state.memoryEntities.push({
      id: `search-${Date.now()}`,
      type: 'knowledge_search',
      content: { query, results: results.length },
      timestamp: new Date(),
      importance: 0.6
    });

    return {
      status: 'success',
      results,
      sources: ['memory', 'conversation', 'knowledge_base'],
      confidence,
      query
    };
  }

  private searchKnowledgeBase(query: string, type: string): any[] {
    // Simulate knowledge base search
    const knowledgeBase = [
      {
        type: 'documentation',
        content: 'AI Homelab Ecosystem provides unified database infrastructure with PostgreSQL, Neo4j, and Redis',
        relevance: query.toLowerCase().includes('database') ? 0.9 : 0.3,
        timestamp: new Date()
      },
      {
        type: 'system',
        content: 'ADK/A2A framework enables multi-agent communication with memory state and callbacks',
        relevance: query.toLowerCase().includes('adk') || query.toLowerCase().includes('agent') ? 0.9 : 0.3,
        timestamp: new Date()
      },
      {
        type: 'documentation',
        content: 'Voice capabilities powered by Gemma3 LLM via Ollama integration',
        relevance: query.toLowerCase().includes('voice') || query.toLowerCase().includes('gemma') ? 0.9 : 0.3,
        timestamp: new Date()
      }
    ];

    return knowledgeBase
      .filter(item => type === 'all' || item.type === type)
      .filter(item => item.relevance > 0.5)
      .sort((a, b) => b.relevance - a.relevance);
  }
}
