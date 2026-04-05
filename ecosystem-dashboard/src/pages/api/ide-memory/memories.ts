import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

// IDE Memory Backend Configuration
const IDE_MEMORY_API_URL = process.env.IDE_MEMORY_API_URL || 'http://localhost:30577';
const REQUEST_TIMEOUT = 10000; // 10 seconds

// Configure axios with timeout
const ideMemoryClient = axios.create({
  baseURL: IDE_MEMORY_API_URL,
  timeout: REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        await handleGetMemories(req, res);
        break;
      case 'POST':
        await handleCreateMemory(req, res);
        break;
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('IDE Memory API Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Handle GET /api/ide-memory/memories
 * Fetch memories from IDE Memory Backend with filtering and pagination
 */
async function handleGetMemories(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { limit = 10, offset = 0, tags, workspace } = req.query;

    // Forward request to IDE Memory Backend
    const response = await ideMemoryClient.get('/memories', {
      params: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        tags: tags as string,
        workspace: workspace as string,
      },
    });

    // Calculate statistics for dashboard
    const memories = response.data.memories || [];
    const stats = calculateMemoryStats(memories);

    res.status(200).json({
      memories,
      stats,
      total: response.data.total || 0,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        res.status(503).json({
          error: 'IDE Memory Backend unavailable',
          message: 'Cannot connect to IDE Memory service',
          fallback: true,
        });
      } else {
        res.status(error.response?.status || 500).json({
          error: 'IDE Memory Backend error',
          message: error.response?.data?.message || error.message,
        });
      }
    } else {
      throw error;
    }
  }
}

/**
 * Handle POST /api/ide-memory/memories
 * Create new memory in IDE Memory Backend
 */
async function handleCreateMemory(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { title, content, tags, context, workspace } = req.body;

    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Title and content are required',
      });
    }

    // Forward request to IDE Memory Backend
    const response = await ideMemoryClient.post('/memories', {
      title,
      content,
      tags: tags || [],
      context: context || '',
      workspace_id: workspace,
    });

    res.status(201).json(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        res.status(503).json({
          error: 'IDE Memory Backend unavailable',
          message: 'Cannot connect to IDE Memory service',
        });
      } else {
        res.status(error.response?.status || 500).json({
          error: 'IDE Memory Backend error',
          message: error.response?.data?.message || error.message,
        });
      }
    } else {
      throw error;
    }
  }
}

/**
 * Calculate memory statistics for dashboard display
 */
function calculateMemoryStats(memories: any[]) {
  const total = memories.length;
  let healthy = 0;
  let conflicts = 0;
  let outdated = 0;

  // Analyze memories for health metrics
  memories.forEach((memory) => {
    // Calculate health score based on various factors
    const age = Date.now() - new Date(memory.updated_at).getTime();
    const daysSinceUpdate = age / (1000 * 60 * 60 * 24);
    
    // Health criteria
    const hasContent = memory.content && memory.content.length > 10;
    const hasContext = memory.context && memory.context.length > 0;
    const isRecent = daysSinceUpdate < 30; // Updated within 30 days
    const hasTags = memory.tags && memory.tags.length > 0;
    
    // Simple health scoring
    let healthScore = 0;
    if (hasContent) healthScore += 25;
    if (hasContext) healthScore += 25;
    if (isRecent) healthScore += 25;
    if (hasTags) healthScore += 25;
    
    // Categorize based on health score
    if (healthScore >= 75) {
      healthy++;
    } else if (healthScore < 50) {
      outdated++;
    }
    
    // Check for potential conflicts (simplified)
    if (memory.title && memory.title.toLowerCase().includes('conflict')) {
      conflicts++;
    }
  });

  // Calculate sync rate (percentage of healthy memories)
  const syncRate = total > 0 ? Math.round((healthy / total) * 100) : 100;

  return {
    total,
    healthy,
    conflicts,
    outdated,
    sync_rate: syncRate,
    last_sync: new Date().toISOString(),
  };
}
