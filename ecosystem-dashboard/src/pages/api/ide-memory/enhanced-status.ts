import { NextApiRequest, NextApiResponse } from 'next';

// Enhanced IDE Memory Status API - Updated for Memory Watcher Integration
// Provides comprehensive status of IDE Memory ecosystem including offline sync capabilities

interface MemoryWatcherStatus {
  healthy: boolean;
  filesTracked: number;
  syncStatus: 'idle' | 'syncing' | 'offline';
  memoryStats: {
    total: number;
    synced: number;
    failed: number;
    lastSyncTime: string;
  };
  offlineSync: {
    enabled: boolean;
    lastOfflineSync?: string;
    filesProcessedOffline?: number;
  };
}

interface IDEMemoryBackendStatus {
  healthy: boolean;
  memoriesLoaded: number;
  kgConnected: boolean;
  workspaceIsolation: boolean;
  syncFrequency: string;
  approvalQueue: {
    pending: number;
    processed: number;
  };
}

interface KnowledgeGraphStatus {
  healthy: boolean;
  agentsConnected: number;
  a2aProtocol: boolean;
  memoryValidation: boolean;
  truthEngine: boolean;
}

// Check Memory Watcher status
async function checkMemoryWatcherStatus(): Promise<MemoryWatcherStatus> {
  try {
    const response = await fetch('http://localhost:9578/health', {
      method: 'GET',
      timeout: 3000,
    });

    if (response.ok) {
      const data = await response.json();
      return {
        healthy: true,
        filesTracked: data.files_tracked || 0,
        syncStatus: data.sync_status || 'idle',
        memoryStats: data.memory_stats || {
          total: 0,
          synced: 0,
          failed: 0,
          lastSyncTime: new Date().toISOString()
        },
        offlineSync: {
          enabled: true,
          lastOfflineSync: data.last_offline_sync,
          filesProcessedOffline: data.offline_files_processed
        }
      };
    }
  } catch (error) {
    console.error('Memory Watcher health check failed:', error);
  }

  return {
    healthy: false,
    filesTracked: 0,
    syncStatus: 'offline',
    memoryStats: {
      total: 0,
      synced: 0,
      failed: 0,
      lastSyncTime: new Date().toISOString()
    },
    offlineSync: {
      enabled: false
    }
  };
}

// Check IDE Memory Backend status
async function checkIDEMemoryBackendStatus(): Promise<IDEMemoryBackendStatus> {
  try {
    const response = await fetch('http://localhost:9579/health', {
      method: 'GET',
      timeout: 3000,
    });

    if (response.ok) {
      const data = await response.json();
      return {
        healthy: true,
        memoriesLoaded: data.memories_loaded || 0,
        kgConnected: data.kg_connected || false,
        workspaceIsolation: data.workspace_isolation || true,
        syncFrequency: data.sync_frequency || '5 minutes',
        approvalQueue: {
          pending: data.approval_queue?.pending || 0,
          processed: data.approval_queue?.processed || 0
        }
      };
    }
  } catch (error) {
    console.error('IDE Memory Backend health check failed:', error);
  }

  return {
    healthy: false,
    memoriesLoaded: 0,
    kgConnected: false,
    workspaceIsolation: false,
    syncFrequency: 'unknown',
    approvalQueue: {
      pending: 0,
      processed: 0
    }
  };
}

// Check Knowledge Graph integration status
async function checkKnowledgeGraphStatus(): Promise<KnowledgeGraphStatus> {
  try {
    const response = await fetch('http://localhost:8765/health', {
      method: 'GET',
      timeout: 3000,
    });

    if (response.ok) {
      const data = await response.json();
      return {
        healthy: true,
        agentsConnected: data.agents_connected || 0,
        a2aProtocol: data.a2a_protocol || false,
        memoryValidation: data.memory_validation || false,
        truthEngine: data.truth_engine || false
      };
    }
  } catch (error) {
    console.error('Knowledge Graph health check failed:', error);
  }

  return {
    healthy: false,
    agentsConnected: 0,
    a2aProtocol: false,
    memoryValidation: false,
    truthEngine: false
  };
}

// Get comprehensive IDE Memory ecosystem status
async function getEnhancedIDEMemoryStatus() {
  const [memoryWatcher, memoryBackend, knowledgeGraph] = await Promise.all([
    checkMemoryWatcherStatus(),
    checkIDEMemoryBackendStatus(),
    checkKnowledgeGraphStatus()
  ]);

  const overallHealth = memoryWatcher.healthy && memoryBackend.healthy && knowledgeGraph.healthy;
  const syncEfficiency = memoryWatcher.memoryStats.total > 0 
    ? (memoryWatcher.memoryStats.synced / memoryWatcher.memoryStats.total) * 100 
    : 0;

  return {
    status: overallHealth ? 'fully_operational' : 'degraded',
    components: {
      memoryWatcher,
      memoryBackend,
      knowledgeGraph
    },
    metrics: {
      overallHealth,
      syncEfficiency: Math.round(syncEfficiency),
      totalMemories: memoryWatcher.memoryStats.total,
      syncedMemories: memoryWatcher.memoryStats.synced,
      failedMemories: memoryWatcher.memoryStats.failed,
      pendingApprovals: memoryBackend.approvalQueue.pending
    },
    capabilities: {
      offlineSync: memoryWatcher.offlineSync.enabled,
      workspaceIsolation: memoryBackend.workspaceIsolation,
      a2aProtocol: knowledgeGraph.a2aProtocol,
      memoryValidation: knowledgeGraph.memoryValidation,
      truthEngine: knowledgeGraph.truthEngine
    },
    lastUpdate: new Date().toISOString()
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ 
      success: false, 
      message: `Method ${req.method} not allowed` 
    });
  }

  try {
    const enhancedStatus = await getEnhancedIDEMemoryStatus();
    return res.status(200).json({
      success: true,
      data: enhancedStatus
    });
  } catch (error: any) {
    console.error('Enhanced IDE Memory status error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to get enhanced IDE Memory status',
      error: error.message 
    });
  }
}
