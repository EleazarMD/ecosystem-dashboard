/**
 * Atlas Trigger API
 * 
 * Triggers the Atlas insight generation script to analyze PIC data
 * and generate new insights on demand.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Run the Atlas insight generation script
    const scriptPath = path.join(
      process.cwd(),
      '..',
      'services',
      'atlas-agent',
      'skills',
      'atlas-analytics',
      'scripts',
      'generate_atlas_insights.py'
    );

    const { stdout, stderr } = await execAsync(
      `cd /home/eleazar/Projects/AIHomelab && python3 ${scriptPath}`,
      { timeout: 120000 } // 2 minute timeout
    );

    // Parse output for insights generated
    const generatedMatch = stdout.match(/Generated:\s*(\d+)/);
    const storedMatch = stdout.match(/Stored:\s*(\d+)/);
    const duplicatesMatch = stdout.match(/Duplicates skipped:\s*(\d+)/);

    const generated = generatedMatch ? parseInt(generatedMatch[1]) : 0;
    const stored = storedMatch ? parseInt(storedMatch[1]) : 0;
    const duplicates = duplicatesMatch ? parseInt(duplicatesMatch[1]) : 0;

    res.status(200).json({
      success: true,
      generated,
      stored,
      duplicates,
      stdout: stdout.slice(-2000), // Last 2000 chars for debugging
      stderr: stderr || null,
    });
  } catch (error) {
    console.error('Atlas trigger error:', error);
    res.status(500).json({
      error: 'Failed to trigger Atlas insight generation',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
