import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '@/lib/db/podcast-studio-db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { projectId } = req.query;

  try {
    // Query audio generations only (no joins - projects table doesn't exist yet)
    let query = `
      SELECT 
        id,
        project_id,
        script_id,
        file_path as audio_url,
        duration_seconds as duration,
        file_size_bytes as file_size,
        format,
        status,
        tts_provider,
        tts_model,
        error_details,
        created_at
      FROM podcast.audio_generations
      WHERE status IN ('generated', 'failed')
    `;

    const params: any[] = [];

    if (projectId && typeof projectId === 'string') {
      query += ` AND project_id = $1`;
      params.push(projectId);
    }

    query += ` ORDER BY created_at DESC LIMIT 50`;

    const result = await pool.query(query, params);
    
    console.log('📀 Raw database rows:', result.rows.map(r => ({
      id: r.id,
      file_path: r.file_path,
      audio_url: r.audio_url,
      duration: r.duration
    })));

    const episodes = result.rows.map((row, index) => {
      // Convert file path to accessible URL
      // The SQL query aliases file_path as audio_url, so we access it via row.audio_url
      let audioUrl = row.audio_url || row.file_path || '';
      console.log(`📀 Episode ${index}:`, {
        raw_audio_url: row.audio_url,
        raw_file_path: row.file_path,
        final_audioUrl: audioUrl,
        all_keys: Object.keys(row)
      });
      if (audioUrl && !audioUrl.startsWith('http')) {
        if (!audioUrl.startsWith('/')) {
          audioUrl = '/' + audioUrl;
        }
      }
      
      // Default metadata (script metadata will be added later when schema is updated)
      const language = 'english';
      const voices: string[] = [];
      const speakers: string[] = [];
      
      // Generate smart title based on available metadata
      const dateStr = new Date(row.created_at).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // Format duration nicely
      const mins = Math.floor((row.duration || 0) / 60);
      const secs = Math.floor((row.duration || 0) % 60);
      const durationStr = `${mins}:${secs.toString().padStart(2, '0')}`;
      
      // Build descriptive title (no project title available)
      const title = language === 'spanish' ? `Podcast en Español` : `Podcast Episode`;
      
      // Build subtitle with metadata
      const subtitleParts = [];
      if (durationStr !== '0:00') subtitleParts.push(durationStr);
      if (language === 'spanish') subtitleParts.push('🇪🇸 Spanish');
      if (speakers.length > 0) subtitleParts.push(`${speakers.length} speakers`);
      
      return {
        id: row.id,
        projectId: row.project_id,
        scriptId: row.script_id,
        title: title,
        subtitle: subtitleParts.join(' • '),
        audioUrl: audioUrl,
        filePath: audioUrl, // Include filePath as well for compatibility
        duration: row.duration || 0,
        durationFormatted: durationStr,
        fileSize: row.file_size,
        fileSizeFormatted: row.file_size ? `${(row.file_size / 1024 / 1024).toFixed(1)} MB` : '',
        format: row.format,
        status: row.status,
        ttsProvider: row.tts_provider,
        ttsModel: row.tts_model,
        language: language,
        voices: voices,
        speakers: speakers,
        projectTitle: '',
        createdAt: row.created_at,
        createdAtFormatted: dateStr,
        errorDetails: row.error_details || null,
      };
    });

    return res.status(200).json({ episodes });
  } catch (error) {
    console.error('❌ Error fetching episodes:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error: error
    });
    return res.status(500).json({
      error: 'Failed to fetch episodes',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : String(error)
    });
  }
}
