/**
 * useImageJobs Hook
 * 
 * Manages async image generation jobs with polling for status updates.
 * Multi-tenant compliant - only shows user's own jobs.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface ImageJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: { percent: number; message: string };
  prompt: string;
  model: string;
  width?: number;
  height?: number;
  resultUrl?: string;
  resultFilename?: string;
  generatedImageId?: string;
  errorMessage?: string;
  generationTimeMs?: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

interface SubmitJobParams {
  prompt: string;
  negativePrompt?: string;
  model?: string;
  width?: number;
  height?: number;
  steps?: number;
  cfgScale?: number;
  seed?: number;
}

interface UseImageJobsReturn {
  activeJobs: ImageJob[];
  completedJobs: ImageJob[];
  isLoading: boolean;
  isPolling: boolean;
  submitJob: (params: SubmitJobParams) => Promise<{ success: boolean; jobId?: string; error?: string; blocked?: boolean; message?: string }>;
  cancelJob: (jobId: string) => Promise<boolean>;
  refreshJobs: () => Promise<void>;
  getJobStatus: (jobId: string) => Promise<ImageJob | null>;
  stopPolling: () => void;
}

// Polling configuration with exponential backoff
const INITIAL_POLL_INTERVAL = 2000; // Start at 2 seconds
const MAX_POLL_INTERVAL = 30000; // Max 30 seconds between polls
const BACKOFF_MULTIPLIER = 1.5; // Increase interval by 50% each time
const MAX_POLL_DURATION = 600000; // Stop polling after 10 minutes
const MAX_CONSECUTIVE_ERRORS = 5; // Stop after 5 consecutive errors

export function useImageJobs(): UseImageJobsReturn {
  const [activeJobs, setActiveJobs] = useState<ImageJob[]>([]);
  const [completedJobs, setCompletedJobs] = useState<ImageJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  
  // Polling state refs (to avoid re-renders)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollStartTimeRef = useRef<number>(0);
  const currentIntervalRef = useRef<number>(INITIAL_POLL_INTERVAL);
  const consecutiveErrorsRef = useRef<number>(0);

  // Stop polling function
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setIsPolling(false);
    currentIntervalRef.current = INITIAL_POLL_INTERVAL;
    consecutiveErrorsRef.current = 0;
    console.log('[useImageJobs] Polling stopped');
  }, []);

  // Fetch all jobs for the user
  const fetchJobs = useCallback(async () => {
    try {
      const [activeRes, completedRes] = await Promise.all([
        fetch('/api/image-studio/jobs?active=true&limit=10'),
        fetch('/api/image-studio/jobs?status=completed&limit=20'),
      ]);

      if (activeRes.ok) {
        const activeData = await activeRes.json();
        setActiveJobs(activeData.jobs || []);
      }

      if (completedRes.ok) {
        const completedData = await completedRes.json();
        setCompletedJobs(completedData.jobs || []);
      }
    } catch (error) {
      console.error('[useImageJobs] Failed to fetch jobs:', error);
    }
  }, []);

  // Submit a new job
  const submitJob = useCallback(async (params: SubmitJobParams) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/image-studio/jobs/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const data = await res.json();

      if (data.success && data.jobId) {
        // Immediately add to active jobs
        const newJob: ImageJob = {
          id: data.jobId,
          status: 'pending',
          progress: { percent: 0, message: 'Queued' },
          prompt: params.prompt,
          model: params.model || 'hidream-i1-full-nf4',
          width: params.width,
          height: params.height,
          createdAt: new Date().toISOString(),
        };
        setActiveJobs(prev => [newJob, ...prev]);
      }

      return data;
    } catch (error) {
      console.error('[useImageJobs] Failed to submit job:', error);
      return { success: false, error: 'Failed to submit job' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Cancel a pending job
  const cancelJob = useCallback(async (jobId: string) => {
    try {
      const res = await fetch(`/api/image-studio/jobs/${jobId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setActiveJobs(prev => prev.filter(j => j.id !== jobId));
        return true;
      }
      return false;
    } catch (error) {
      console.error('[useImageJobs] Failed to cancel job:', error);
      return false;
    }
  }, []);

  // Get status of a specific job
  const getJobStatus = useCallback(async (jobId: string): Promise<ImageJob | null> => {
    try {
      const res = await fetch(`/api/image-studio/jobs/${jobId}`);
      if (res.ok) {
        const data = await res.json();
        return data.job || null;
      }
      return null;
    } catch (error) {
      console.error('[useImageJobs] Failed to get job status:', error);
      return null;
    }
  }, []);

  // Poll for updates on active jobs with backoff and limits
  const pollActiveJobs = useCallback(async () => {
    if (activeJobs.length === 0) {
      stopPolling();
      return;
    }

    // Check if we've exceeded max poll duration
    if (Date.now() - pollStartTimeRef.current > MAX_POLL_DURATION) {
      console.log('[useImageJobs] Max poll duration exceeded, stopping');
      stopPolling();
      return;
    }

    try {
      const updatedJobs: ImageJob[] = [];
      const newlyCompleted: ImageJob[] = [];

      for (const job of activeJobs) {
        const updated = await getJobStatus(job.id);
        if (updated) {
          if (updated.status === 'completed' || updated.status === 'failed' || updated.status === 'cancelled') {
            newlyCompleted.push(updated);
          } else {
            updatedJobs.push(updated);
          }
        }
      }

      setActiveJobs(updatedJobs);
      
      if (newlyCompleted.length > 0) {
        setCompletedJobs(prev => [...newlyCompleted, ...prev].slice(0, 50));
      }

      // Reset error count on success
      consecutiveErrorsRef.current = 0;

      // If all jobs completed, stop polling
      if (updatedJobs.length === 0) {
        stopPolling();
      }
    } catch (error) {
      consecutiveErrorsRef.current++;
      console.error(`[useImageJobs] Poll error (${consecutiveErrorsRef.current}/${MAX_CONSECUTIVE_ERRORS}):`, error);
      
      if (consecutiveErrorsRef.current >= MAX_CONSECUTIVE_ERRORS) {
        console.log('[useImageJobs] Max consecutive errors, stopping polling');
        stopPolling();
        return;
      }

      // Apply exponential backoff on error
      currentIntervalRef.current = Math.min(
        currentIntervalRef.current * BACKOFF_MULTIPLIER,
        MAX_POLL_INTERVAL
      );
    }
  }, [activeJobs, getJobStatus, stopPolling]);

  // Start polling when active jobs exist
  useEffect(() => {
    if (activeJobs.length > 0 && !pollIntervalRef.current) {
      console.log('[useImageJobs] Starting polling for', activeJobs.length, 'active jobs');
      setIsPolling(true);
      pollStartTimeRef.current = Date.now();
      currentIntervalRef.current = INITIAL_POLL_INTERVAL;
      
      // Use dynamic interval with setTimeout for backoff support
      const poll = () => {
        pollActiveJobs().finally(() => {
          if (pollIntervalRef.current !== null) {
            pollIntervalRef.current = setTimeout(poll, currentIntervalRef.current) as unknown as NodeJS.Timeout;
          }
        });
      };
      
      pollIntervalRef.current = setTimeout(poll, currentIntervalRef.current) as unknown as NodeJS.Timeout;
    } else if (activeJobs.length === 0 && pollIntervalRef.current) {
      stopPolling();
    }

    return () => {
      if (pollIntervalRef.current) {
        clearTimeout(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [activeJobs.length, pollActiveJobs, stopPolling]);

  // Initial fetch on mount
  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  return {
    activeJobs,
    completedJobs,
    isLoading,
    isPolling,
    submitJob,
    cancelJob,
    refreshJobs: fetchJobs,
    getJobStatus,
    stopPolling,
  };
}
