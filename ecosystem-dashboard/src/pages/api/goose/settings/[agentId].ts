/**
 * API Endpoint: /api/goose/settings/[agentId]
 * GET: Fetch agent configuration including performance settings
 * PUT: Update agent configuration
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'ecosystem_unified',
  user: process.env.POSTGRES_USER || 'eleazar',
  password: process.env.POSTGRES_PASSWORD || '',
  max: 10,
  idleTimeoutMillis: 30000,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { agentId } = req.query;

  if (!agentId || typeof agentId !== 'string') {
    return res.status(400).json({ error: 'agentId parameter required' });
  }

  if (req.method === 'GET') {
    return handleGet(agentId, res);
  } else if (req.method === 'PUT') {
    return handlePut(agentId, req.body, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleGet(agentId: string, res: NextApiResponse) {
  try {
    const result = await pool.query(
      `SELECT 
        id as agent_id,
        name as agent_name,
        model,
        temperature,
        max_tokens,
        tools as enabled_tools,
        
        -- Performance Settings
        enable_tool_caching,
        cache_default_ttl,
        streaming_enabled as enable_streaming,
        enable_parallel_tools,
        max_parallel_tools,
        enable_retry_logic,
        max_retry_attempts,
        enable_tool_monitoring,
        
        updated_at
       FROM dashboard.dashboard_agents 
       WHERE id = $1`,
      [agentId]
    );

    if (result.rows.length === 0) {
      // Return default configuration if not found
      return res.status(200).json({
        agentId,
        agentName: agentId,
        model: 'claude-haiku-4-5',
        temperature: 0.7,
        maxTokens: 4096,
        enabledTools: ['workspace', 'perplexity', 'developer', 'memory'],
        agencyMode: 'autonomous',
        isActive: true,

        // Performance defaults
        enableToolCaching: true,
        cacheDefaultTTL: 300,
        enableStreaming: false,
        enableParallelTools: false,
        maxParallelTools: 5,
        enableRetryLogic: true,
        maxRetryAttempts: 3,
        enableToolMonitoring: true,
      });
    }

    const config = result.rows[0];

    res.status(200).json({
      agentId: config.agent_id,
      agentName: config.agent_name,
      model: config.model,
      temperature: config.temperature,
      maxTokens: config.max_tokens,
      enabledTools: config.enabled_tools || [],
      agencyMode: config.agency_mode,
      isActive: config.is_active,

      // Advanced Settings
      maxTurns: config.max_turns,
      contextStrategy: config.context_strategy,
      autoCompactThreshold: config.auto_compact_threshold,
      sessionAutosave: config.session_autosave,
      enableLeadWorker: config.enable_lead_worker,
      leadModel: config.lead_model,
      leadTurns: config.lead_turns,
      enablePlanning: config.enable_planning,
      plannerModel: config.planner_model,
      enableRouter: config.enable_router,
      enableToolshim: config.enable_toolshim,
      toolOutputPriority: config.tool_output_priority,
      securityPromptEnabled: config.security_prompt_enabled,
      securityThreshold: config.security_threshold,
      debugEnabled: config.debug_enabled,
      showCosts: config.show_costs,

      // Performance Settings (NEW)
      enableToolCaching: config.enable_tool_caching,
      cacheDefaultTTL: config.cache_default_ttl,
      enableStreaming: config.enable_streaming,
      enableParallelTools: config.enable_parallel_tools,
      maxParallelTools: config.max_parallel_tools,
      enableRetryLogic: config.enable_retry_logic,
      maxRetryAttempts: config.max_retry_attempts,
      enableToolMonitoring: config.enable_tool_monitoring,

      updatedAt: config.updated_at,
    });

  } catch (error) {
    console.error('Error fetching agent settings:', error);
    res.status(500).json({
      error: 'Failed to fetch agent settings',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handlePut(agentId: string, body: any, res: NextApiResponse) {
  try {
    // Build dynamic UPDATE query based on provided fields
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Map camelCase to snake_case for all possible fields
    const fieldMapping: Record<string, string> = {
      agentName: 'agent_name',
      model: 'model',
      temperature: 'temperature',
      maxTokens: 'max_tokens',
      enabledTools: 'enabled_tools',
      agencyMode: 'agency_mode',
      isActive: 'is_active',
      maxTurns: 'max_turns',
      contextStrategy: 'context_strategy',
      autoCompactThreshold: 'auto_compact_threshold',
      sessionAutosave: 'session_autosave',
      enableLeadWorker: 'enable_lead_worker',
      leadModel: 'lead_model',
      leadTurns: 'lead_turns',
      enablePlanning: 'enable_planning',
      plannerModel: 'planner_model',
      enableRouter: 'enable_router',
      enableToolshim: 'enable_toolshim',
      toolOutputPriority: 'tool_output_priority',
      securityPromptEnabled: 'security_prompt_enabled',
      securityThreshold: 'security_threshold',
      debugEnabled: 'debug_enabled',
      showCosts: 'show_costs',
      // Performance settings
      enableToolCaching: 'enable_tool_caching',
      cacheDefaultTTL: 'cache_default_ttl',
      enableStreaming: 'enable_streaming',
      enableParallelTools: 'enable_parallel_tools',
      maxParallelTools: 'max_parallel_tools',
      enableRetryLogic: 'enable_retry_logic',
      maxRetryAttempts: 'max_retry_attempts',
      enableToolMonitoring: 'enable_tool_monitoring',
    };

    for (const [camelKey, snakeKey] of Object.entries(fieldMapping)) {
      if (body[camelKey] !== undefined) {
        fields.push(`${snakeKey} = $${paramIndex}`);
        values.push(body[camelKey]);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Add updated_at
    fields.push(`updated_at = NOW()`);
    values.push(agentId);

    const query = `
      UPDATE dashboard.dashboard_agents
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agent configuration not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Configuration updated successfully',
      config: result.rows[0],
    });

  } catch (error) {
    console.error('Error updating agent settings:', error);
    res.status(500).json({
      error: 'Failed to update agent settings',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
