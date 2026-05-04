/**
 * Workspace File Upload API
 * 
 * Accepts multipart/form-data image uploads from iOS and web clients.
 * Stores files locally and returns a serving URL for embedding in workspace pages.
 * 
 * POST /api/workspace/upload
 * Headers: X-Internal-Service-Key + X-User-Id (service auth) OR session cookie (browser)
 * Body (multipart/form-data):
 *   - file: image file (JPEG, PNG, HEIC, WebP, GIF)
 *   - workspace_id: (optional) target workspace UUID
 *   - page_id: (optional) target page UUID to attach image to
 *   - caption: (optional) image description
 * 
 * Returns: { success, file: { id, url, fileName, fileType, fileSize, caption } }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import formidable from 'formidable';
import { query } from '../../../lib/db/client';
import { validateAPIAuth } from '../../../lib/security/api-auth';
import { workspaceService } from '../../../lib/workspace/workspace-service';

// Disable Next.js body parser for multipart
export const config = {
  api: {
    bodyParser: false,
  },
};

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'workspace-files');

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/heic': '.heic',
  'image/heif': '.heif',
  'image/svg+xml': '.svg',
  'image/tiff': '.tiff',
};

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

interface ParsedForm {
  fields: formidable.Fields;
  files: formidable.Files;
}

function parseForm(req: NextApiRequest): Promise<ParsedForm> {
  return new Promise((resolve, reject) => {
    const form = formidable({
      maxFileSize: MAX_FILE_SIZE,
      keepExtensions: true,
      allowEmptyFiles: false,
    });

    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  try {
    // Authenticate
    const authResult = await validateAPIAuth(req, res);
    if (!authResult.authenticated || !authResult.context) {
      return res.status(401).json({ success: false, error: authResult.error || 'Authentication required' });
    }
    const userId = authResult.context.userId;

    // Parse multipart form
    const { fields, files } = await parseForm(req);

    // Get the uploaded file (formidable v3 returns arrays)
    const fileArr = files.file;
    const file = Array.isArray(fileArr) ? fileArr[0] : fileArr;
    if (!file) {
      return res.status(400).json({ success: false, error: 'No file provided. Send as "file" field in multipart/form-data.' });
    }

    // Validate file type
    const mimeType = file.mimetype || '';
    if (!ALLOWED_IMAGE_TYPES[mimeType]) {
      // Clean up temp file
      await fs.unlink(file.filepath).catch(() => {});
      return res.status(400).json({
        success: false,
        error: `Unsupported image type: ${mimeType}. Allowed: ${Object.keys(ALLOWED_IMAGE_TYPES).join(', ')}`,
      });
    }

    // Extract fields
    const workspaceId = Array.isArray(fields.workspace_id) ? fields.workspace_id[0] : fields.workspace_id;
    const pageId = Array.isArray(fields.page_id) ? fields.page_id[0] : fields.page_id;
    const caption = Array.isArray(fields.caption) ? fields.caption[0] : fields.caption;

    // If workspace_id provided, verify ownership
    let resolvedWorkspaceId = workspaceId;
    if (resolvedWorkspaceId) {
      const ws = await workspaceService.getWorkspace(resolvedWorkspaceId);
      if (!ws) {
        await fs.unlink(file.filepath).catch(() => {});
        return res.status(404).json({ success: false, error: 'Workspace not found' });
      }
      if (ws.workspace.owner_id !== userId) {
        await fs.unlink(file.filepath).catch(() => {});
        return res.status(403).json({ success: false, error: 'You do not have access to this workspace' });
      }
    } else {
      // Auto-resolve to user's workspace
      const userWorkspaces = await workspaceService.getUserWorkspaces(userId);
      if (userWorkspaces.length > 0) {
        resolvedWorkspaceId = userWorkspaces[0].id;
      }
    }

    // Generate file ID and final path
    const fileId = randomUUID();
    const ext = ALLOWED_IMAGE_TYPES[mimeType];
    const fileName = file.originalFilename || `image-${fileId}${ext}`;
    const storedName = `${fileId}${ext}`;
    const storagePath = path.join(UPLOAD_DIR, storedName);

    // Ensure upload directory exists
    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    // Move temp file to storage
    await fs.copyFile(file.filepath, storagePath);
    await fs.unlink(file.filepath).catch(() => {});

    // The serving URL (accessible via Next.js public directory)
    const servingUrl = `/workspace-files/${storedName}`;

    // Store metadata in DB
    await query(
      `INSERT INTO workspace.files (id, workspace_id, file_name, file_type, file_size, storage_url, uploaded_by, page_id, caption)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [fileId, resolvedWorkspaceId || null, fileName, mimeType, file.size, servingUrl, userId, pageId || null, caption || null]
    );

    console.log(`[Upload] ✅ Image uploaded: ${fileName} (${fileId}) by ${userId} → ${servingUrl}`);

    return res.status(200).json({
      success: true,
      url: servingUrl,
      imageUrl: servingUrl,
      id: fileId,
      file: {
        id: fileId,
        url: servingUrl,
        fileName,
        fileType: mimeType,
        fileSize: file.size,
        caption: caption || null,
        workspaceId: resolvedWorkspaceId || null,
        pageId: pageId || null,
      },
    });
  } catch (error: any) {
    console.error('[Upload] ❌ Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Upload failed',
    });
  }
}
