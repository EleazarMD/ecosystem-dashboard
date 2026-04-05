/**
 * API endpoint to list workspaces for a user
 * Supports multi-tenancy: returns owned workspaces + shared workspaces
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { workspaceService } from '../../../lib/workspace/workspace-service';
import { authenticateWorkspaceRequest } from '../../../lib/workspace/workspace-auth';

// Agent user IDs that should have their workspaces visible to all users
const SHARED_AGENT_IDS = ['openclaw-agent', 'goose-agent', 'system'];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await authenticateWorkspaceRequest(req, res);
    if (!auth) return;

    const { include_shared = true } = req.body;
    const user_id = auth.userId;

    console.log('[API] Fetching workspaces for user:', user_id);
    
    // Get user's own workspaces
    const ownedWorkspaces = await workspaceService.getUserWorkspaces(user_id);
    console.log(`[API] Found ${ownedWorkspaces.length} owned workspaces`);

    let allWorkspaces = [...ownedWorkspaces];

    // Include shared agent workspaces if requested
    if (include_shared) {
      for (const agentId of SHARED_AGENT_IDS) {
        if (agentId !== user_id) {
          const agentWorkspaces = await workspaceService.getUserWorkspaces(agentId);
          // Mark these as shared and add them
          const sharedWorkspaces = agentWorkspaces.map(ws => ({
            ...ws,
            is_shared: true,
            shared_from: agentId,
          }));
          allWorkspaces.push(...sharedWorkspaces);
        }
      }
    }

    // Deduplicate by ID (in case of overlaps)
    const uniqueWorkspaces = allWorkspaces.filter((ws, index, self) =>
      index === self.findIndex(w => w.id === ws.id)
    );

    console.log(`[API] ✅ Total workspaces (including shared): ${uniqueWorkspaces.length}`);
    
    return res.status(200).json({ 
      workspaces: uniqueWorkspaces,
      owned_count: ownedWorkspaces.length,
      shared_count: uniqueWorkspaces.length - ownedWorkspaces.length,
    });
  } catch (error: any) {
    console.error('[API] ❌ Failed to fetch workspaces:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch workspaces',
      details: error.message 
    });
  }
}
