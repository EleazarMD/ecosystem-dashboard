/**
 * Audio Mixer - Phase 2: FFmpeg-based Audio Overlap Engine
 * 
 * Mixes multiple audio segments with precise timing, volume control, and crossfades
 * for NotebookLM-style natural podcast overlaps
 */

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export interface AudioSegment {
  audioBuffer: Buffer;
  startTime: number;  // Seconds from beginning
  duration: number;   // Seconds
  volume: number;     // 0.0 to 2.0 (1.0 = original)
  fadeIn: boolean;
  fadeInDuration?: number;  // Seconds (default: 0.3)
  label?: string;  // For debugging
}

/**
 * Mix multiple audio segments with overlaps using FFmpeg
 * 
 * @param segments - Array of audio segments with timing and volume info
 * @param outputFormat - Output format ('wav' or 'mp3')
 * @returns Buffer containing mixed audio
 */
export async function mixAudioSegments(
  segments: AudioSegment[],
  outputFormat: 'wav' | 'mp3' = 'wav'
): Promise<Buffer> {
  console.log(`🎛️  Mixing ${segments.length} audio segments with overlaps...`);
  
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'podcast-mixer-'));
  const tempFiles: string[] = [];

  try {
    // Step 1: Write all segment buffers to temp files
    for (let i = 0; i < segments.length; i++) {
      const segmentFile = path.join(tempDir, `segment_${i}.wav`);
      await fs.writeFile(segmentFile, segments[i].audioBuffer);
      tempFiles.push(segmentFile);
      console.log(`   📁 Wrote segment ${i}: ${segments[i].label || 'unlabeled'} (${(segments[i].audioBuffer.length / 1024).toFixed(1)}KB)`);
    }

    // Step 2: Build FFmpeg filter_complex for mixing with timing
    const { filterComplex, totalDuration } = buildFilterComplex(segments);
    
    console.log(`   🎚️  Filter complex: ${filterComplex.substring(0, 200)}...`);
    console.log(`   ⏱️  Total duration: ${totalDuration.toFixed(2)}s`);

    // Step 3: Build FFmpeg command
    const inputs = segments.map((_, i) => ['-i', tempFiles[i]]).flat();
    const outputFile = path.join(tempDir, `output.${outputFormat}`);
    
    const ffmpegArgs = [
      ...inputs,
      '-filter_complex', filterComplex,
      '-map', '[out]',
      '-ar', '44100',  // Sample rate
      '-ac', '2',      // Stereo
      outputFormat === 'mp3' ? '-b:a' : '-acodec',
      outputFormat === 'mp3' ? '192k' : 'pcm_s16le',
      outputFile
    ];

    console.log(`   🎬 Running FFmpeg with ${inputs.length / 2} inputs...`);

    // Step 4: Execute FFmpeg
    await runFFmpeg(ffmpegArgs);

    // Step 5: Read output file
    const outputBuffer = await fs.readFile(outputFile);
    console.log(`   ✅ Mixed audio: ${(outputBuffer.length / 1024 / 1024).toFixed(2)}MB`);

    return outputBuffer;

  } finally {
    // Cleanup temp files
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
      console.log(`   🧹 Cleaned up temp directory`);
    } catch (err) {
      console.error('   ⚠️  Failed to clean up temp directory:', err);
    }
  }
}

/**
 * Build FFmpeg filter_complex for audio mixing with precise timing
 */
function buildFilterComplex(segments: AudioSegment[]): { filterComplex: string; totalDuration: number } {
  const filters: string[] = [];
  let maxEndTime = 0;

  // Process each segment: delay, volume, fade
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const delayMs = Math.round(seg.startTime * 1000);
    const fadeInMs = seg.fadeIn ? Math.round((seg.fadeInDuration || 0.3) * 1000) : 0;
    
    // Calculate when this segment ends
    const segmentEndTime = seg.startTime + seg.duration;
    if (segmentEndTime > maxEndTime) {
      maxEndTime = segmentEndTime;
    }

    // Build filter chain for this segment
    const filterChain: string[] = [];
    
    // 1. Delay (shift in time)
    filterChain.push(`adelay=${delayMs}|${delayMs}`);
    
    // 2. Volume adjustment
    if (seg.volume !== 1.0) {
      filterChain.push(`volume=${seg.volume}`);
    }
    
    // 3. Fade in (if requested)
    if (seg.fadeIn && fadeInMs > 0) {
      filterChain.push(`afade=t=in:st=${seg.startTime}:d=${fadeInMs / 1000}`);
    }

    // Combine into single filter for this input
    const filterString = `[${i}:a]${filterChain.join(',')}[a${i}]`;
    filters.push(filterString);
  }

  // Mix all processed streams together
  const mixInputs = segments.map((_, i) => `[a${i}]`).join('');
  const mixFilter = `${mixInputs}amix=inputs=${segments.length}:duration=longest:dropout_transition=2[out]`;
  
  // Combine all filters
  const filterComplex = filters.join(';') + ';' + mixFilter;

  return { filterComplex, totalDuration: maxEndTime };
}

/**
 * Execute FFmpeg command and return promise
 */
function runFFmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', args, {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    const stderrChunks: Buffer[] = [];

    ffmpeg.stderr.on('data', (data) => {
      stderrChunks.push(data);
      // Optionally log progress
      const output = data.toString();
      if (output.includes('time=')) {
        const timeMatch = output.match(/time=(\d+:\d+:\d+\.\d+)/);
        if (timeMatch) {
          // Could emit progress events here
        }
      }
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        const stderr = Buffer.concat(stderrChunks).toString();
        reject(new Error(`FFmpeg exited with code ${code}. Stderr: ${stderr.substring(stderr.length - 500)}`));
      }
    });

    ffmpeg.on('error', (err) => {
      reject(new Error(`Failed to spawn FFmpeg: ${err.message}`));
    });
  });
}

/**
 * Check if FFmpeg is available
 */
export async function checkFFmpegAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const ffmpeg = spawn('ffmpeg', ['-version']);
    ffmpeg.on('close', (code) => {
      resolve(code === 0);
    });
    ffmpeg.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Get audio duration using FFprobe
 */
export async function getAudioDuration(audioBuffer: Buffer): Promise<number> {
  const tempFile = path.join(os.tmpdir(), `temp_${Date.now()}.wav`);
  
  try {
    await fs.writeFile(tempFile, audioBuffer);
    
    return new Promise((resolve, reject) => {
      const ffprobe = spawn('ffprobe', [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        tempFile
      ]);

      let output = '';
      ffprobe.stdout.on('data', (data) => {
        output += data.toString();
      });

      ffprobe.on('close', (code) => {
        if (code === 0) {
          const duration = parseFloat(output.trim());
          resolve(duration);
        } else {
          reject(new Error(`FFprobe exited with code ${code}`));
        }
      });

      ffprobe.on('error', reject);
    });
  } finally {
    // Cleanup
    try {
      await fs.unlink(tempFile);
    } catch (err) {
      // Ignore cleanup errors
    }
  }
}
