/**
 * API endpoint to create a new workspace
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { workspaceService } from '../../../lib/workspace/workspace-service';
import { authenticateWorkspaceRequest } from '../../../lib/workspace/workspace-auth';

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

    const { name } = req.body;
    const user_id = auth.userId;

    console.log('[API] Creating workspace:', { user_id, name });
    
    // Create default workspace with welcome content
    const workspace = await workspaceService.createDefaultWorkspace(user_id);
    
    // If a custom name was provided, update it
    if (name && name !== 'My Workspace') {
      const updated = await workspaceService.updateWorkspace(workspace.id, { name });
      console.log(`[API] ✅ Created and updated workspace:`, updated.id);
      return res.status(200).json(updated);
    }
    
    console.log(`[API] ✅ Created workspace:`, workspace.id);
    return res.status(200).json(workspace);
  } catch (error: any) {
    console.error('[API] ❌ Failed to create workspace:', error);
    return res.status(500).json({ 
      error: 'Failed to create workspace',
      details: error.message 
    });
  }
}
