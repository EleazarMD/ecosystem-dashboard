import type { NextApiRequest, NextApiResponse } from 'next';
import { getScriptVersions, getCurrentScript, deleteScriptGeneration } from '@/lib/db/podcast-studio-db';
import { pool } from '@/lib/db/podcast-studio-db';

/**
 * API endpoint for managing script versions
 * GET: Fetch script versions for a project
 * DELETE: Delete a specific script version or batch delete multiple
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'DELETE') {
    const { scriptId, scriptIds } = req.query;
    
    // Batch delete: ?scriptIds=id1,id2,id3
    if (scriptIds && typeof scriptIds === 'string') {
      const idList = scriptIds.split(',').filter(Boolean);
      if (idList.length === 0) {
        return res.status(400).json({ error: 'No valid script IDs provided' });
      }
      
      try {
        console.log(`🗑️ Batch deleting ${idList.length} script versions`);
        
        // Use parameterized query for batch delete
        const placeholders = idList.map((_, i) => `$${i + 1}`).join(', ');
        const result = await pool.query(
          `DELETE FROM script_generations WHERE id IN (${placeholders}) RETURNING id`,
          idList
        );
        
        console.log(`✅ Batch deleted ${result.rowCount} script versions`);
        return res.status(200).json({ 
          success: true, 
          deletedCount: result.rowCount,
          deletedIds: result.rows.map(r => r.id)
        });
      } catch (error) {
        console.error('Failed to batch delete script versions:', error);
        return res.status(500).json({ 
          error: 'Failed to batch delete script versions',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    // Single delete: ?scriptId=xxx
    if (!scriptId || typeof scriptId !== 'string') {
      return res.status(400).json({ error: 'scriptId is required (use ?scriptId=xxx or ?scriptIds=id1,id2,id3)' });
    }
    
    try {
      console.log(`🗑️ Deleting script version: ${scriptId}`);
      await deleteScriptGeneration(scriptId);
      console.log(`✅ Script version deleted: ${scriptId}`);
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Failed to delete script version:', error);
      return res.status(500).json({ 
        error: 'Failed to delete script version',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { projectId, scriptLength } = req.query;

  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({ error: 'projectId is required' });
  }

  try {
    // Validate scriptLength if provided
    const validLengths = ['executive', 'essential', 'comprehensive', 'deep-dive'];
    const length = scriptLength && typeof scriptLength === 'string' && validLengths.includes(scriptLength)
      ? scriptLength as 'executive' | 'essential' | 'comprehensive' | 'deep-dive'
      : undefined;

    console.log(`📂 Fetching script versions for project ${projectId}${length ? ` (${length})` : ''}`);
    
    const versions = await getScriptVersions(projectId, length);
    
    console.log(`✅ Found ${versions.length} script version(s)`);
    
    return res.status(200).json(versions);
  } catch (error) {
    console.error('Failed to fetch script versions:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch script versions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
