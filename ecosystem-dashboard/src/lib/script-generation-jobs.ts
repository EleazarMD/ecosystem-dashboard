/**
 * Shared job storage for script generation
 * 
 * This module provides a singleton Map that persists across API route invocations
 * to track async script generation jobs.
 */

export interface ScriptGenerationJob {
  status: 'pending' | 'processing' | 'complete' | 'error';
  progress: number;
  message: string;
  currentStage: string;
  stageOutputs?: Record<string, any>;
  result?: any;
  error?: string;
}

// Use global to persist across hot reloads in development
const globalForJobs = globalThis as unknown as {
  scriptGenerationJobs: Map<string, ScriptGenerationJob> | undefined;
};

export const jobs = globalForJobs.scriptGenerationJobs ?? new Map<string, ScriptGenerationJob>();

if (process.env.NODE_ENV !== 'production') {
  globalForJobs.scriptGenerationJobs = jobs;
}

export function getJobStatus(jobId: string): ScriptGenerationJob | undefined {
  return jobs.get(jobId);
}

export function setJobStatus(jobId: string, job: ScriptGenerationJob): void {
  jobs.set(jobId, job);
}

export function updateJobStatus(jobId: string, updates: Partial<ScriptGenerationJob>): void {
  const existing = jobs.get(jobId);
  if (existing) {
    jobs.set(jobId, { ...existing, ...updates });
  }
}
