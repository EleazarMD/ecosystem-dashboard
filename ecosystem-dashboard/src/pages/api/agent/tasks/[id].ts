/**
 * Knowledge Graph Agent Task Management API
 * 
 * This endpoint handles operations on specific agent tasks by ID,
 * allowing retrieval, updates, and status changes for long-running tasks.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { HomelabAIAgentClient } from '@/lib/stubs/agent-client-sdk';

// Agent task endpoint
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Extract task ID from query parameters
  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Invalid task ID' });
  }

  // Get agent URL from env
  const agentUrl = process.env.A2A_AGENT_URL || 'http://localhost:8888';

  try {
    // Initialize the agent client
    const agentClient = new HomelabAIAgentClient({
      agentId: 'dashboard-kg-agent',
      agentName: 'Knowledge Graph Agent',
      kgUrl: process.env.KNOWLEDGE_GRAPH_URL || 'http://localhost:8765'
    });

    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        // Get task details
        const response = await axios.get(`${agentUrl}/tasks/${id}`, {
          timeout: 5000,
          headers: {
            'Authorization': req.headers.authorization || '',
            'X-Dashboard-ID': 'ecosystem-dashboard'
          }
        });
        
        res.status(200).json(response.data);
        break;

      case 'PUT':
        // Update task status or details
        const updateResponse = await axios.put(`${agentUrl}/tasks/${id}`, req.body, {
          timeout: 5000,
          headers: {
            'Authorization': req.headers.authorization || '',
            'Content-Type': 'application/json',
            'X-Dashboard-ID': 'ecosystem-dashboard'
          }
        });
        
        res.status(200).json(updateResponse.data);
        break;

      case 'DELETE':
        // Cancel a task
        const deleteResponse = await axios.delete(`${agentUrl}/tasks/${id}`, {
          timeout: 5000,
          headers: {
            'Authorization': req.headers.authorization || '',
            'X-Dashboard-ID': 'ecosystem-dashboard'
          }
        });
        
        res.status(200).json(deleteResponse.data);
        break;

      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error(`Error managing task ${id}:`, error);
    
    res.status(error.response?.status || 500).json({
      error: `Failed to manage task ${id}`,
      details: error.message
    });
  }
}
