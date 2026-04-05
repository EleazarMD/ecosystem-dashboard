/**
 * Workspace multi-tenancy authentication helpers.
 *
 * Provides reusable auth + ownership verification for all workspace API
 * endpoints. Uses validateAPIAuth for identity, then checks workspace
 * ownership before allowing mutations.
 *
 * Usage:
 *   const auth = await authenticateWorkspaceRequest(req, res);
 *   if (!auth) return; // already sent 401
 *
 *   const ok = await verifyWorkspaceAccess(auth.userId, workspaceId, res);
 *   if (!ok) return; // already sent 403/404
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { validateAPIAuth, type APIAuthContext } from '@/lib/security/api-auth';
import { workspaceService } from '@/lib/workspace/workspace-service';

/**
 * Authenticate the request and return the auth context.
 * Sends 401 and returns null if authentication fails.
 */
export async function authenticateWorkspaceRequest(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<APIAuthContext | null> {
  const authResult = await validateAPIAuth(req, res);
  if (!authResult.authenticated || !authResult.context) {
    res.status(401).json({
      error: 'Authentication required',
      message: authResult.error || 'Provide session cookie, API key, or internal service key',
    });
    return null;
  }
  return authResult.context;
}

/**
 * Verify that the authenticated user owns (or has access to) the workspace.
 * Sends 404/403 and returns false if the check fails.
 */
export async function verifyWorkspaceAccess(
  userId: string,
  workspaceId: string,
  res: NextApiResponse
): Promise<boolean> {
  const ws = await workspaceService.getWorkspace(workspaceId);
  if (!ws) {
    res.status(404).json({ error: 'Workspace not found' });
    return false;
  }
  if (ws.workspace.owner_id !== userId) {
    res.status(403).json({ error: 'You do not have access to this workspace' });
    return false;
  }
  return true;
}
