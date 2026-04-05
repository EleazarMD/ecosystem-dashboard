import type { NextApiRequest, NextApiResponse } from 'next';
import {
  getResearchMaterials,
  addResearchMaterial,
  pool,
} from '@/lib/db/podcast-studio-db';

// Increase body size limit for large document content
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

/**
 * API endpoint for managing research materials within a project
 * 
 * GET: List materials for a project (requires projectId query param)
 * POST: Add a new material to a project
 * DELETE: Remove a material by ID
 */

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method === 'GET') {
      const { projectId } = req.query;
      
      if (!projectId || typeof projectId !== 'string') {
        return res.status(400).json({ error: 'projectId is required' });
      }
      
      const materials = await getResearchMaterials(projectId);
      return res.status(200).json(materials);
    }

    if (req.method === 'POST') {
      const {
        projectId,
        title,
        type,
        url,
        filePath,
        content,
        contentHash,
        pageCount,
        wordCount,
        isSelected,
        metadata,
      } = req.body;

      console.log(`📥 [materials API] POST request - projectId: ${projectId}, title: ${title}, type: ${type}, contentLength: ${content?.length || 0}`);
      
      // Sanitize content: remove null bytes and other invalid UTF-8 sequences
      let sanitizedContent = content;
      if (typeof content === 'string') {
        // Remove null bytes (0x00) which PostgreSQL doesn't accept
        sanitizedContent = content.replace(/\x00/g, '');
        // Also remove other control characters except newlines and tabs
        sanitizedContent = sanitizedContent.replace(/[\x01-\x08\x0B\x0C\x0E-\x1F]/g, '');
        if (sanitizedContent.length !== content.length) {
          console.log(`🧹 Sanitized content: removed ${content.length - sanitizedContent.length} invalid characters`);
        }
      }
      
      if (!projectId) {
        return res.status(400).json({ error: 'projectId is required' });
      }

      if (!title) {
        return res.status(400).json({ error: 'title is required' });
      }

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(projectId)) {
        console.error(`❌ [materials API] Invalid projectId format: ${projectId}`);
        return res.status(400).json({ error: 'Invalid projectId format - must be a valid UUID' });
      }

      const material = await addResearchMaterial({
        project_id: projectId,
        title,
        type: type || 'document',
        url: url || null,
        file_path: filePath || null,
        content: sanitizedContent || null,
        content_hash: contentHash || null,
        page_count: pageCount || null,
        word_count: wordCount || null,
        is_selected: isSelected ?? true,
        metadata: metadata || null,
      });

      console.log(`✅ Added research material "${title}" to project ${projectId}`);
      
      return res.status(201).json(material);
    }

    if (req.method === 'DELETE') {
      const { id, ids } = req.query;
      
      // Batch delete: ?ids=id1,id2,id3
      if (ids && typeof ids === 'string') {
        const idList = ids.split(',').filter(Boolean);
        if (idList.length === 0) {
          return res.status(400).json({ error: 'No valid IDs provided' });
        }
        
        // Use parameterized query for batch delete
        const placeholders = idList.map((_, i) => `$${i + 1}`).join(', ');
        const result = await pool.query(
          `DELETE FROM research_materials WHERE id IN (${placeholders}) RETURNING id`,
          idList
        );
        
        console.log(`🗑️ Batch deleted ${result.rowCount} research materials`);
        return res.status(200).json({ 
          success: true, 
          deletedCount: result.rowCount,
          deletedIds: result.rows.map(r => r.id)
        });
      }
      
      // Single delete: ?id=xxx
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Material ID is required (use ?id=xxx or ?ids=id1,id2,id3)' });
      }

      await pool.query('DELETE FROM research_materials WHERE id = $1', [id]);
      
      console.log(`🗑️ Deleted research material ${id}`);
      
      return res.status(200).json({ success: true, deletedId: id });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('❌ Materials API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
