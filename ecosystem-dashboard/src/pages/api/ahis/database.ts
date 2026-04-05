/**
 * AHIS Database API Endpoint
 * 
 * Provides PostgreSQL database information including agents, tables, and metrics
 */

import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

// AHIS server configuration
const AHIS_BASE_URL = process.env.AHIS_BASE_URL || 'http://ahis-server.aihomelab-core.svc.cluster.local:8888';
const AHIS_FALLBACK_URL = process.env.AHIS_FALLBACK_URL || 'http://localhost:8888';

interface DatabaseInfo {
  agents: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    created_at: string;
    last_activity: string;
    capabilities: string[];
  }>;
  tables: Array<{
    name: string;
    rows: number;
    size: string;
    last_updated: string;
  }>;
  metrics: {
    total_agents: number;
    active_agents: number;
    total_tables: number;
    database_size: string;
    connections: number;
    uptime: string;
  };
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Try to fetch database info from AHIS server
    let response;
    let endpoint = AHIS_BASE_URL;
    
    try {
      response = await axios.get(`${AHIS_BASE_URL}/api/database/info`, {
        timeout: 5000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'AI-Homelab-Dashboard/1.0'
        }
      });
    } catch (primaryError) {
      console.warn('Primary AHIS endpoint failed, trying fallback:', primaryError);
      
      endpoint = AHIS_FALLBACK_URL;
      response = await axios.get(`${AHIS_FALLBACK_URL}/api/database/info`, {
        timeout: 5000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'AI-Homelab-Dashboard/1.0'
        }
      });
    }
    
    return res.status(200).json(response.data);
  } catch (error) {
    console.error('Error fetching AHIS database info:', error);
    
    // Return mock database data for development
    const mockDatabaseData: DatabaseInfo = {
      agents: [
        {
          id: 'agent-001',
          name: 'Knowledge Graph Agent',
          type: 'knowledge_management',
          status: 'active',
          created_at: '2025-08-20T10:00:00Z',
          last_activity: '2025-08-24T18:00:00Z',
          capabilities: ['query_processing', 'data_indexing', 'semantic_search']
        },
        {
          id: 'agent-002',
          name: 'Project Registry Agent',
          type: 'project_management',
          status: 'active',
          created_at: '2025-08-21T14:30:00Z',
          last_activity: '2025-08-24T17:45:00Z',
          capabilities: ['project_tracking', 'status_monitoring', 'reporting']
        },
        {
          id: 'agent-003',
          name: 'Port Registry Agent',
          type: 'infrastructure',
          status: 'idle',
          created_at: '2025-08-22T09:15:00Z',
          last_activity: '2025-08-24T16:30:00Z',
          capabilities: ['port_management', 'conflict_detection', 'allocation']
        },
        {
          id: 'agent-004',
          name: 'Health Monitor Agent',
          type: 'monitoring',
          status: 'active',
          created_at: '2025-08-23T11:20:00Z',
          last_activity: '2025-08-24T18:05:00Z',
          capabilities: ['health_checks', 'alerting', 'metrics_collection']
        }
      ],
      tables: [
        {
          name: 'agents',
          rows: 4,
          size: '128 KB',
          last_updated: '2025-08-24T18:00:00Z'
        },
        {
          name: 'projects',
          rows: 12,
          size: '256 KB',
          last_updated: '2025-08-24T17:30:00Z'
        },
        {
          name: 'ports',
          rows: 45,
          size: '64 KB',
          last_updated: '2025-08-24T16:45:00Z'
        },
        {
          name: 'health_checks',
          rows: 1250,
          size: '2.1 MB',
          last_updated: '2025-08-24T18:05:00Z'
        },
        {
          name: 'agent_activities',
          rows: 3420,
          size: '5.8 MB',
          last_updated: '2025-08-24T18:05:00Z'
        },
        {
          name: 'system_logs',
          rows: 8765,
          size: '12.4 MB',
          last_updated: '2025-08-24T18:05:00Z'
        }
      ],
      metrics: {
        total_agents: 4,
        active_agents: 3,
        total_tables: 6,
        database_size: '20.8 MB',
        connections: 8,
        uptime: '72h 15m'
      }
    };
    
    return res.status(200).json({
      ...mockDatabaseData,
      usingMockData: true,
      error: 'AHIS server unavailable - using mock data'
    });
  }
}

export default handler;
