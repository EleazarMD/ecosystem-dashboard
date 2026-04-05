/**
 * Shared job storage for audio generation
 * 
 * This module provides a singleton Map that persists across API route invocations
 * to track async audio generation jobs.
 */

export type AudioPhase = 'initializing' | 'tts' | 'assembly' | 'mixing' | 'saving' | 'complete' | 'error';

export interface AudioGenerationJob {
  status: 'pending' | 'processing' | 'complete' | 'error';
  progress: number; // 0-100 overall weighted progress
  message: string;
  currentTurn: number;
  totalTurns: number;
  phase: AudioPhase;
  phaseDetail?: string; // e.g. "Generating turn 5/62: Alexa"
  estimatedTotalMs: number; // estimated total job duration in ms
  result?: {
    success: boolean;
    audioId: string;
    audioUrl: string;
    duration: number;
    fileSize: number;
    generationTimeMs: number;
    turns: number;
  };
  error?: string;
  startedAt: number;
}

// Use global to persist across hot reloads in development
const globalForJobs = globalThis as unknown as {
  audioGenerationJobs: Map<string, AudioGenerationJob> | undefined;
};

export const audioJobs = globalForJobs.audioGenerationJobs ?? new Map<string, AudioGenerationJob>();

if (process.env.NODE_ENV !== 'production') {
  globalForJobs.audioGenerationJobs = audioJobs;
}

export function getAudioJobStatus(jobId: string): AudioGenerationJob | undefined {
  return audioJobs.get(jobId);
}

export function setAudioJobStatus(jobId: string, job: AudioGenerationJob): void {
  audioJobs.set(jobId, job);
}

export function updateAudioJobStatus(jobId: string, updates: Partial<AudioGenerationJob>): void {
  const existing = audioJobs.get(jobId);
  if (existing) {
    audioJobs.set(jobId, { ...existing, ...updates });
  }
}
