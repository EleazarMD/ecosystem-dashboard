import { NextApiRequest, NextApiResponse } from 'next';
import { ideMemoryMCPClient } from '../../../lib/mcp-integration';

const IDE_MEMORY_API_URL = process.env.IDE_MEMORY_API_URL || 'http://localhost:9577';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('[ide-memory/list] Enhanced API handler called for large dataset');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { 
    filter, 
    include_context = true, 
    exclude_contradictory = false,
    include_relationships = true,
    depth = 2,
    // Enhanced pagination parameters
    page = 1,
    limit = 50,
    search = '',
    tags = [],
    workspace = '',
    sort_by = 'updated_at',
    sort_order = 'desc'
  } = req.body;

  console.log('[ide-memory/list] Request params:', { 
    page, limit, search, tags, workspace, sort_by, sort_order 
  });

  try {
    // Try to get memories from MCP server first
    console.log('[ide-memory/list] Fetching from MCP server...');
    
    const mcpResult = await ideMemoryMCPClient.callTool('mcp0_mcp0_list_memories', {
      limit: limit,
      offset: (page - 1) * limit,
      filter: search,
      workspace: workspace
    });

    console.log(`[ide-memory/list] MCP returned:`, mcpResult);

    let memories = mcpResult.memories || [];
    let totalMemories = mcpResult.total || memories.length;

    // Apply client-side search if specified
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
    const offset = (page - 1) * limit;
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
      meta: {
        api_version: '2.0',
        response_time: Date.now(),
        backend_url: IDE_MEMORY_API_URL,
        enhanced_features: true,
        large_dataset_support: true,
        k3d_backend: true
      }
    };

    console.log(`[ide-memory/list] Returning ${memories.length} memories (page ${page}/${totalPages})`);
    
    res.status(200).json(response_data);

  } catch (error: any) {
    console.error('[ide-memory/list] Error:', error.message);
    
    // Provide fallback response for development
    const fallbackResponse = {
      memories: [],
      pagination: {
        current_page: page,
        total_pages: 0,
        total_memories: 0,
        memories_per_page: limit,
        has_next_page: false,
        has_prev_page: false,
        offset: 0
      },
      error: {
        message: error.message,
        type: 'k3d_backend_connection_error',
        fallback_active: true
      },
      meta: {
        api_version: '2.0',
        response_time: Date.now(),
        backend_url: IDE_MEMORY_API_URL,
        enhanced_features: true,
        large_dataset_support: true,
        k3d_backend: true
      }
    };

    res.status(200).json(fallbackResponse);
  }
}
