import type { NextApiRequest, NextApiResponse } from 'next';
import { getAudioGenerationsByProject, getCurrentAudioGeneration, deleteAudioGenerationsByProject, pool } from '@/lib/db/podcast-studio-db';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { projectId, current, audioIds } = req.query;

  // Handle DELETE request
  if (req.method === 'DELETE') {
    try {
      // Batch delete by IDs: ?audioIds=id1,id2,id3
      if (audioIds && typeof audioIds === 'string') {
        const idList = audioIds.split(',').filter(Boolean);
        if (idList.length === 0) {
          return res.status(400).json({ error: 'No valid audio IDs provided' });
        }
        
        console.log(`🗑️ Batch deleting ${idList.length} audio generations`);
        
        // Get file paths before deleting from DB
        const placeholders = idList.map((_, i) => `$${i + 1}`).join(', ');
        const filesResult = await pool.query(
          `SELECT id, file_path FROM podcast.audio_generations WHERE id IN (${placeholders})`,
          idList
        );
        
        // Delete files from filesystem
        for (const audio of filesResult.rows) {
          if (audio.file_path) {
            const filePath = path.join(process.cwd(), 'public', audio.file_path);
            try {
              if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`🗑️ Deleted audio file: ${filePath}`);
              }
            } catch (fsError) {
              console.warn(`Could not delete file ${filePath}:`, fsError);
            }
          }
        }
        
        // Delete from database
        const result = await pool.query(
          `DELETE FROM podcast.audio_generations WHERE id IN (${placeholders}) RETURNING id`,
          idList
        );
        
        console.log(`✅ Batch deleted ${result.rowCount} audio generations`);
        return res.status(200).json({ 
          success: true, 
          deletedCount: result.rowCount,
          deletedIds: result.rows.map(r => r.id)
        });
      }
      
      // Delete all for project: ?projectId=xxx
      if (!projectId || typeof projectId !== 'string') {
        return res.status(400).json({ error: 'projectId is required (or use ?audioIds=id1,id2,id3)' });
      }
      
      // Get audio files to delete from filesystem
      const audioList = await getAudioGenerationsByProject(projectId);
      
      // Delete files from filesystem
      for (const audio of audioList) {
        if (audio.file_path) {
          // Convert URL path to filesystem path
          const filePath = path.join(process.cwd(), 'public', audio.file_path);
          try {
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              console.log(`🗑️ Deleted audio file: ${filePath}`);
            }
          } catch (fsError) {
            console.warn(`Could not delete file ${filePath}:`, fsError);
          }
        }
      }
      
      // Delete from database
      await deleteAudioGenerationsByProject(projectId);
      
      console.log(`✅ Deleted ${audioList.length} audio generation(s) for project ${projectId}`);
      return res.status(200).json({ success: true, deletedCount: audioList.length });
    } catch (error) {
      console.error('❌ Error deleting audio generations:', error);
      return res.status(500).json({
        error: 'Failed to delete audio generations',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
  
  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({ error: 'projectId is required' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (current === 'true') {
      // Get only the current (most recent) audio generation
      const audio = await getCurrentAudioGeneration(projectId);
      
      if (!audio) {
        return res.status(404).json({ error: 'No audio generation found' });
      }

      return res.status(200).json({
        id: audio.id,
        audioUrl: audio.file_path,
        duration: audio.duration_seconds,
        fileSize: audio.file_size_bytes,
        format: audio.format,
        status: audio.status,
        createdAt: audio.created_at,
      });
    } else {
      // Get all audio generations for the project
      const audioList = await getAudioGenerationsByProject(projectId);
      
      return res.status(200).json({
        audioGenerations: audioList.map(audio => ({
          id: audio.id,
          audioUrl: audio.file_path,
          duration: audio.duration_seconds,
          fileSize: audio.file_size_bytes,
          format: audio.format,
          status: audio.status,
          createdAt: audio.created_at,
        })),
      });
    }
  } catch (error) {
    console.error('❌ Error fetching audio generations:', error);
    return res.status(500).json({
      error: 'Failed to fetch audio generations',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
