/**
 * API endpoint to fetch agent configuration from Knowledge Graph database
 * Used by Dashboard AI Agent and other agents for database-driven configuration
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'knowledge_graph',
  user: process.env.POSTGRES_USER || 'ahe_user',
  password: process.env.POSTGRES_PASSWORD || 'ahe_password_2024',
  max: 10,
  idleTimeoutMillis: 30000,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { agentId } = req.query;

  if (!agentId || typeof agentId !== 'string') {
    return res.status(400).json({ error: 'agentId parameter required' });
  }

  try {
    const result = await pool.query(
      `SELECT 
        agent_id,
        agent_name,
        agent_type,
        config,
        status,
        capabilities,
        version,
        port,
        host,
        updated_at
       FROM agent_registry 
       WHERE agent_id = $1`,
      [agentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Agent not found',
        agentId 
      });
    }

    const agent = result.rows[0];

    res.status(200).json({
      success: true,
      agent: {
        id: agent.agent_id,
        name: agent.agent_name,
        type: agent.agent_type,
        config: agent.config,
        status: agent.status,
        capabilities: agent.capabilities,
        version: agent.version,
        port: agent.port,
        host: agent.host,
        lastUpdated: agent.updated_at
      }
    });

  } catch (error) {
    console.error('Error fetching agent config:', error);
    res.status(500).json({ 
      error: 'Failed to fetch agent configuration',
      details: error.message 
    });
  }
}
