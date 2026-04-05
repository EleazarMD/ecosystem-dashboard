import { NextApiRequest, NextApiResponse } from 'next';
import { ideMemoryMCPClient } from '../../../lib/mcp-integration';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('[ide-memory/list-enhanced] API handler connecting to MCP service');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { 
    page = 1,
    limit = 20,
    search = '',
    tags = [],
    workspace = '',
    sort_by = 'updated_at',
    sort_order = 'desc'
  } = req.body;

  console.log('[ide-memory/list-enhanced] Request params:', { 
    page, limit, search, tags, workspace, sort_by, sort_order 
  });

  try {
    // Calculate offset for pagination
    const offset = (page - 1) * limit;
    
    console.log('[ide-memory/list-enhanced] Connecting to IDE Memory MCP service via kubectl');
    
    // Use real MCP client to get memories
    const memoriesResult = await ideMemoryMCPClient.callTool('mcp0_mcp0_list_memories', {
      limit,
      offset,
      tags: tags.length > 0 ? tags : undefined
    });
    
    console.log('[ide-memory/list-enhanced] Successfully retrieved memories from MCP service');
    
    // Transform MCP response to expected format
    let memories = memoriesResult.memories || [];
    const totalMemories = memoriesResult.total || memories.length;
    
    // If no memories from MCP, we have a connection issue - don't fall back to mock data
    if (!memories || memories.length === 0) {
      throw new Error('No memories retrieved from MCP service - connection may be failing');
    }
    
    // Apply search filter if specified
    if (search && search.trim()) {
      const searchTerm = search.toLowerCase().trim();
      memories = memories.filter((memory: any) => 
        memory.title?.toLowerCase().includes(searchTerm) ||
        memory.content?.toLowerCase().includes(searchTerm) ||
        memory.context?.toLowerCase().includes(searchTerm) ||
        memory.tags?.some((tag: string) => tag.toLowerCase().includes(searchTerm))
      );
    }

    // Apply client-side sorting
    memories.sort((a: any, b: any) => {
      let aValue = a[sort_by] || '';
      let bValue = b[sort_by] || '';
      
      // Handle date sorting
      if (sort_by === 'created_at' || sort_by === 'updated_at') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }
      
      if (sort_order === 'desc') {
        return bValue > aValue ? 1 : -1;
      } else {
        return aValue > bValue ? 1 : -1;
      }
    });

    // Calculate pagination info
    const totalPages = Math.ceil(totalMemories / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Prepare response
    const response_data = {
      memories: memories,
      pagination: {
        current_page: page,
        total_pages: totalPages,
        total_memories: totalMemories,
        memories_per_page: limit,
        has_next_page: hasNextPage,
        has_prev_page: hasPrevPage,
        offset: offset
      },
      filters: {
        search: search,
        tags: tags,
        workspace: workspace,
        sort_by: sort_by,
        sort_order: sort_order
      },
      // Statistics calculated from MCP response
      stats: {
        total: totalMemories,
        healthy: memories.filter((m: any) => (m.health_score || 100) > 80).length,
        conflicts: memories.filter((m: any) => m.conflicts && m.conflicts.length > 0).length,
        outdated: memories.filter((m: any) => (m.health_score || 100) < 70).length,
        sync_rate: totalMemories > 0 ? Math.round((memories.length / totalMemories) * 100) : 100,
        last_sync: new Date().toISOString(),
        health_score: memories.length > 0 ? Math.round(memories.reduce((sum: number, m: any) => sum + (m.health_score || 100), 0) / memories.length) : 100,
        workspaces: new Set(memories.map((m: any) => m.workspace || m.corpus_names?.[0] || 'default')).size,
        unique_tags: new Set(memories.flatMap((m: any) => m.tags || [])).size
      },
      meta: {
        api_version: '2.0',
        response_time: Date.now(),
        backend_service: 'ide-memory-mcp',
        enhanced_features: true,
        large_dataset_support: true
      }
    };

    console.log(`[ide-memory/list-enhanced] Returning ${memories.length} memories (page ${page}/${totalPages})`);
    
    res.status(200).json(response_data);

  } catch (error: any) {
    console.error('[ide-memory/list-enhanced] Error:', error.message);
    
    return res.status(503).json({
      error: 'IDE Memory Service Unavailable',
      message: 'Unable to connect to IDE Memory MCP service',
      details: {
        error: error.message,
        timestamp: new Date().toISOString(),
        troubleshooting: {
          steps: [
            'Verify k3d cluster is running: k3d cluster list',
            'Check IDE Memory MCP deployment: kubectl get deployments -n knowledge-graph',
            'Verify MCP service connectivity: kubectl logs -n knowledge-graph deployment/ide-memory-mcp',
            'Ensure proper MCP client configuration'
          ],
          documentation: 'See MCP integration documentation for setup instructions'
        }
      },
      metadata: {
        source: 'ide-memory-mcp',
        version: '2.0.0',
        cache_status: 'error'
      }
    });
  }
}
