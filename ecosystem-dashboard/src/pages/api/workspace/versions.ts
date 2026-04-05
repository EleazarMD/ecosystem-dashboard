/**
 * Workspace Versions API
 * 
 * Manage version history for workspace pages:
 * - List versions
 * - Get specific version
 * - Compare versions (diff)
 * - Restore to previous version
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db/client';
import { blockService } from '@/lib/workspace/block-service';
import { withAPIAuth, type APIAuthContext } from '@/lib/security/api-auth';

interface VersionOperation {
  operation:
    | 'list_versions'
    | 'get_version'
    | 'compare_versions'
    | 'restore_version';
  page_id?: string;
  user_id?: string;
  data?: Record<string, unknown>;
}

export default withAPIAuth(async (req, res, authContext) => handler(req, res, authContext));

interface VersionResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  timestamp: string;
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<VersionResponse>,
  authContext: APIAuthContext
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.',
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const op: VersionOperation = req.body;
    const userId = authContext.userId;

    if (op.user_id && op.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'user_id does not match authenticated user',
        timestamp: new Date().toISOString(),
      });
    }

    if (!op.operation) {
      return res.status(400).json({
        success: false,
        error: 'operation is required',
        timestamp: new Date().toISOString(),
      });
    }

    let result: unknown;

    switch (op.operation) {
      // ========================================
      // LIST VERSIONS
      // ========================================
      case 'list_versions': {
        const { page_id, limit = 50 } = { ...op.data, page_id: op.page_id };

        if (!page_id) {
          return res.status(400).json({
            success: false,
            error: 'page_id is required for list_versions',
            timestamp: new Date().toISOString(),
          });
        }

        const versionsResult = await query(
          `SELECT id, version_number, change_type, changed_by, changed_at, change_summary
           FROM block_versions
           WHERE block_id = $1
           ORDER BY version_number DESC
           LIMIT $2`,
          [page_id, limit]
        );

        result = {
          page_id,
          versions: versionsResult.rows,
          total: versionsResult.rows.length,
        };
        break;
      }

      // ========================================
      // GET VERSION
      // ========================================
      case 'get_version': {
        const { page_id, version_number } = { ...op.data, page_id: op.page_id };

        if (!page_id || version_number === undefined) {
          return res.status(400).json({
            success: false,
            error: 'page_id and version_number are required for get_version',
            timestamp: new Date().toISOString(),
          });
        }

        const versionResult = await query(
          `SELECT * FROM block_versions
           WHERE block_id = $1 AND version_number = $2`,
          [page_id, version_number]
        );

        if (versionResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Version not found',
            timestamp: new Date().toISOString(),
          });
        }

        result = {
          version: versionResult.rows[0],
        };
        break;
      }

      // ========================================
      // COMPARE VERSIONS
      // ========================================
      case 'compare_versions': {
        const { page_id, from_version, to_version } = { ...op.data, page_id: op.page_id };

        if (!page_id || from_version === undefined || to_version === undefined) {
          return res.status(400).json({
            success: false,
            error: 'page_id, from_version, and to_version are required for compare_versions',
            timestamp: new Date().toISOString(),
          });
        }

        const versionsResult = await query(
          `SELECT * FROM block_versions
           WHERE block_id = $1 AND version_number IN ($2, $3)
           ORDER BY version_number ASC`,
          [page_id, from_version, to_version]
        );

        if (versionsResult.rows.length !== 2) {
          return res.status(404).json({
            success: false,
            error: 'One or both versions not found',
            timestamp: new Date().toISOString(),
          });
        }

        const [oldVersion, newVersion] = versionsResult.rows;

        // Simple diff - compare properties
        const oldProps = oldVersion.properties || {};
        const newProps = newVersion.properties || {};

        const diff = {
          title: {
            old: oldProps.title?.[0]?.text?.content || '',
            new: newProps.title?.[0]?.text?.content || '',
            changed: oldProps.title?.[0]?.text?.content !== newProps.title?.[0]?.text?.content,
          },
          icon: {
            old: oldProps.icon?.emoji || '',
            new: newProps.icon?.emoji || '',
            changed: oldProps.icon?.emoji !== newProps.icon?.emoji,
          },
          properties_changed: JSON.stringify(oldProps) !== JSON.stringify(newProps),
        };

        result = {
          page_id,
          from_version: oldVersion,
          to_version: newVersion,
          diff,
        };
        break;
      }

      // ========================================
      // RESTORE VERSION
      // ========================================
      case 'restore_version': {
        const { page_id, version_number } = { ...op.data, page_id: op.page_id };

        if (!page_id || version_number === undefined) {
          return res.status(400).json({
            success: false,
            error: 'page_id and version_number are required for restore_version',
            timestamp: new Date().toISOString(),
          });
        }

        // Get the version to restore
        const versionResult = await query(
          `SELECT * FROM block_versions
           WHERE block_id = $1 AND version_number = $2`,
          [page_id, version_number]
        );

        if (versionResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Version not found',
            timestamp: new Date().toISOString(),
          });
        }

        const versionToRestore = versionResult.rows[0];

        // Update the block with the old version's properties
        const updatedPage = await blockService.updateBlock(page_id as string, {
          properties: versionToRestore.properties,
          style: versionToRestore.style,
          layout: versionToRestore.layout,
          last_edited_by: userId,
        });

        // The trigger will automatically create a new version with change_type 'restore'
        // But we need to manually set the change_type since the trigger uses 'update'
        // Get the latest version and update it
        const latestVersion = await query(
          `SELECT id FROM block_versions
           WHERE block_id = $1
           ORDER BY version_number DESC
           LIMIT 1`,
          [page_id]
        );

        if (latestVersion.rows.length > 0) {
          await query(
            `UPDATE block_versions SET change_type = 'restore', change_summary = $1
             WHERE id = $2`,
            [`Restored to version ${version_number}`, latestVersion.rows[0].id]
          );
        }

        result = {
          restored: true,
          page_id,
          restored_to_version: version_number,
          page: updatedPage,
        };
        break;
      }

      default:
        return res.status(400).json({
          success: false,
          error: `Unknown operation: ${op.operation}`,
          timestamp: new Date().toISOString(),
        });
    }

    return res.status(200).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Workspace Versions] Error:', error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}
