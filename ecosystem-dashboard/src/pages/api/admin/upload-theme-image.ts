/**
 * Theme Image Upload API
 * 
 * Handles uploading background images for child themes
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

const ALLOWED_THEMES = ['pusheen', 'minecraft', 'default'];
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Helper to validate UUID format
const isValidUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Allow any authenticated non-child account to upload theme images
  if (session.user.accountType === 'child') {
    return res.status(403).json({ error: 'Forbidden - Child accounts cannot upload images' });
  }

  try {
    const form = formidable({
      maxFileSize: MAX_FILE_SIZE,
      filter: ({ mimetype }) => {
        return mimetype?.startsWith('image/') || false;
      },
    });

    const [fields, files] = await form.parse(req);
    
    const themeId = Array.isArray(fields.themeId) ? fields.themeId[0] : fields.themeId;
    const childId = Array.isArray(fields.childId) ? fields.childId[0] : fields.childId;
    const imageType = Array.isArray(fields.imageType) ? fields.imageType[0] : fields.imageType || 'background';
    const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!themeId || !ALLOWED_THEMES.includes(themeId)) {
      return res.status(400).json({ error: 'Invalid theme ID' });
    }

    // childId is required for per-child image isolation
    if (!childId || !isValidUUID(childId)) {
      return res.status(400).json({ error: 'Valid child ID required' });
    }

    if (!uploadedFile) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validate file extension
    const ext = path.extname(uploadedFile.originalFilename || '').toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return res.status(400).json({ error: 'Invalid file type. Allowed: PNG, JPG, GIF, WebP' });
    }

    // Create child-specific theme directory: /themes/{childId}/{themeId}/
    const themeDir = path.join(process.cwd(), 'public', 'themes', 'children', childId, themeId);
    if (!fs.existsSync(themeDir)) {
      fs.mkdirSync(themeDir, { recursive: true });
    }

    // Generate filename based on image type
    const filename = `${imageType}${ext}`;
    const destPath = path.join(themeDir, filename);

    // Move file to destination
    fs.copyFileSync(uploadedFile.filepath, destPath);
    fs.unlinkSync(uploadedFile.filepath);

    const publicPath = `/themes/children/${childId}/${themeId}/${filename}`;

    return res.status(200).json({
      success: true,
      path: publicPath,
      filename,
      themeId,
      imageType,
    });
  } catch (error) {
    console.error('[Upload Theme Image] Error:', error);
    return res.status(500).json({ error: 'Failed to upload image' });
  }
}
