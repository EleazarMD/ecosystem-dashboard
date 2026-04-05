/**
 * Theme Images API
 * 
 * List and delete theme background images
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import fs from 'fs';
import path from 'path';

const ALLOWED_THEMES = ['pusheen', 'minecraft', 'default'];

// Helper to validate UUID format
const isValidUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Allow any authenticated non-child account
  if (session.user.accountType === 'child') {
    return res.status(403).json({ error: 'Forbidden - Child accounts cannot manage theme images' });
  }

  const { themeId, childId } = req.query;

  if (req.method === 'GET') {
    try {
      // childId is required for per-child image isolation
      if (!childId || !isValidUUID(childId as string)) {
        return res.status(400).json({ error: 'Valid child ID required' });
      }

      // List all images for a theme or all themes for this child
      const themes = themeId && ALLOWED_THEMES.includes(themeId as string) 
        ? [themeId as string] 
        : ALLOWED_THEMES;

      const result: Record<string, string[]> = {};

      for (const theme of themes) {
        // Look in child-specific directory: /themes/children/{childId}/{themeId}/
        const themeDir = path.join(process.cwd(), 'public', 'themes', 'children', childId as string, theme);
        if (fs.existsSync(themeDir)) {
          const files = fs.readdirSync(themeDir)
            .filter(f => /\.(png|jpg|jpeg|gif|webp)$/i.test(f))
            .map(f => `/themes/children/${childId}/${theme}/${f}`);
          result[theme] = files;
        } else {
          result[theme] = [];
        }
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error('[Theme Images API] Error:', error);
      return res.status(500).json({ error: 'Failed to list images' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { imagePath } = req.body;
      
      if (!imagePath || typeof imagePath !== 'string') {
        return res.status(400).json({ error: 'Image path required' });
      }

      // Validate path is within themes directory
      if (!imagePath.startsWith('/themes/')) {
        return res.status(400).json({ error: 'Invalid image path' });
      }

      const fullPath = path.join(process.cwd(), 'public', imagePath);
      
      // Security check - ensure path is within public/themes
      const themesDir = path.join(process.cwd(), 'public', 'themes');
      if (!fullPath.startsWith(themesDir)) {
        return res.status(400).json({ error: 'Invalid image path' });
      }

      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        return res.status(200).json({ success: true, deleted: imagePath });
      } else {
        return res.status(404).json({ error: 'Image not found' });
      }
    } catch (error) {
      console.error('[Theme Images API] Delete error:', error);
      return res.status(500).json({ error: 'Failed to delete image' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
