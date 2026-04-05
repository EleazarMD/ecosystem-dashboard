/**
 * useTrainingHubApi - React hooks for AI Training Hub API
 */

import { useState, useEffect, useCallback } from 'react';
import trainingHubApi, {
  HubStatus,
  TrainingProject,
  ProjectDetails,
  TrainingJob,
  JobMetrics,
  JobLogs,
  StartJobRequest,
  StartJobResponse,
  StopJobResponse,
} from '@/services/dgxSparkApi';

interface UseApiOptions {
  enabled?: boolean;
  pollInterval?: number;
  onError?: (error: Error) => void;
}

interface UseApiResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// ============ Hub Status Hook ============

/**
 * Hook for fetching hub status with all active jobs
 */
export function useTrainingHubStatus(options: UseApiOptions = {}): UseApiResult<HubStatus> {
  const { enabled = true, pollInterval, onError } = options;
  const [data, setData] = useState<HubStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    
    setIsLoading(true);
    try {
      const result = await trainingHubApi.getStatus();
      setData(result);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch status';
      setError(errorMessage);
      if (onError && err instanceof Error) {
        onError(err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [enabled, onError]);

  useEffect(() => {
    fetchData();

    if (pollInterval && pollInterval > 0) {
      const interval = setInterval(fetchData, pollInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, pollInterval]);

  return { data, isLoading, error, refetch: fetchData };
}

// Legacy alias
export const useDGXSparkStatus = useTrainingHubStatus;

// ============ Projects Hooks ============

/**
 * Hook for fetching all projects
 */
export function useTrainingProjects(options: UseApiOptions = {}): UseApiResult<TrainingProject[]> {
  const { enabled = true, pollInterval, onError } = options;
  const [data, setData] = useState<TrainingProject[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    
    setIsLoading(true);
    try {
      const result = await trainingHubApi.getProjects();
      setData(result);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch projects';
      setError(errorMessage);
      if (onError && err instanceof Error) {
        onError(err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [enabled, onError]);

  useEffect(() => {
    fetchData();

    if (pollInterval && pollInterval > 0) {
      const interval = setInterval(fetchData, pollInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, pollInterval]);

  return { data, isLoading, error, refetch: fetchData };
}

/**
 * Hook for fetching a single project with details
 */
export function useTrainingProject(projectId: string, options: UseApiOptions = {}): UseApiResult<ProjectDetails> {
  const { enabled = true, onError } = options;
  const [data, setData] = useState<ProjectDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled || !projectId) return;
    
    setIsLoading(true);
    try {
      const result = await trainingHubApi.getProject(projectId);
      setData(result);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch project';
      setError(errorMessage);
      if (onError && err instanceof Error) {
        onError(err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [enabled, projectId, onError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

// ============ Jobs Hooks ============

/**
 * Hook for fetching all jobs (running + history)
 */
export function useTrainingJobs(options: UseApiOptions = {}): UseApiResult<TrainingJob[]> {
  const { enabled = true, pollInterval, onError } = options;
  const [data, setData] = useState<TrainingJob[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    
    setIsLoading(true);
    try {
      const result = await trainingHubApi.getJobs();
      setData(result);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch jobs';
      setError(errorMessage);
      if (onError && err instanceof Error) {
        onError(err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [enabled, onError]);

  useEffect(() => {
    fetchData();

    if (pollInterval && pollInterval > 0) {
      const interval = setInterval(fetchData, pollInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, pollInterval]);

  return { data, isLoading, error, refetch: fetchData };
}

/**
 * Hook for fetching active jobs only
 */
export function useActiveJobs(options: UseApiOptions = {}): UseApiResult<TrainingJob[]> {
  const { enabled = true, pollInterval, onError } = options;
  const [data, setData] = useState<TrainingJob[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    
    setIsLoading(true);
    try {
      const result = await trainingHubApi.getActiveJobs();
      setData(result);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch active jobs';
      setError(errorMessage);
      if (onError && err instanceof Error) {
        onError(err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [enabled, onError]);

  useEffect(() => {
    fetchData();

    if (pollInterval && pollInterval > 0) {
      const interval = setInterval(fetchData, pollInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, pollInterval]);

  return { data, isLoading, error, refetch: fetchData };
}

/**
 * Hook for fetching job metrics
 */
export function useJobMetrics(jobId: string, options: UseApiOptions = {}): UseApiResult<JobMetrics[]> {
  const { enabled = true, pollInterval, onError } = options;
  const [data, setData] = useState<JobMetrics[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled || !jobId) return;
    
    setIsLoading(true);
    try {
      const result = await trainingHubApi.getJobMetrics(jobId);
      setData(result);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch job metrics';
      setError(errorMessage);
      if (onError && err instanceof Error) {
        onError(err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [enabled, jobId, onError]);

  useEffect(() => {
    fetchData();

    if (pollInterval && pollInterval > 0) {
      const interval = setInterval(fetchData, pollInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, pollInterval]);

  return { data, isLoading, error, refetch: fetchData };
}

/**
 * Hook for fetching job logs
 */
export function useJobLogs(jobId: string, options: UseApiOptions = {}): UseApiResult<JobLogs> {
  const { enabled = true, pollInterval, onError } = options;
  const [data, setData] = useState<JobLogs | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled || !jobId) return;
    
    setIsLoading(true);
    try {
      const result = await trainingHubApi.getJobLogs(jobId);
      setData(result);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch job logs';
      setError(errorMessage);
      if (onError && err instanceof Error) {
        onError(err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [enabled, jobId, onError]);

  useEffect(() => {
    fetchData();

    if (pollInterval && pollInterval > 0) {
      const interval = setInterval(fetchData, pollInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, pollInterval]);

  return { data, isLoading, error, refetch: fetchData };
}

// ============ Job Actions Hook ============

interface UseJobActionsResult {
  startJob: (request: StartJobRequest) => Promise<StartJobResponse>;
  stopJob: (jobId: string) => Promise<StopJobResponse>;
  isStarting: boolean;
  isStopping: boolean;
  error: string | null;
}

/**
 * Hook for starting and stopping training jobs
 */
export function useJobActions(): UseJobActionsResult {
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startJob = useCallback(async (request: StartJobRequest): Promise<StartJobResponse> => {
    setIsStarting(true);
    setError(null);
    try {
      const result = await trainingHubApi.startJob(request);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start job';
      setError(errorMessage);
      throw err;
    } finally {
      setIsStarting(false);
    }
  }, []);

  const stopJob = useCallback(async (jobId: string): Promise<StopJobResponse> => {
    setIsStopping(true);
    setError(null);
    try {
      const result = await trainingHubApi.stopJob(jobId);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop job';
      setError(errorMessage);
      throw err;
    } finally {
      setIsStopping(false);
    }
  }, []);

  return { startJob, stopJob, isStarting, isStopping, error };
}

// ============ Connection Hook ============

/**
 * Hook to check Training Hub connectivity
 */
export function useDGXSparkConnection(): {
  isConnected: boolean;
  isChecking: boolean;
  checkConnection: () => Promise<boolean>;
} {
  const [isConnected, setIsConnected] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const checkConnection = useCallback(async () => {
    setIsChecking(true);
    try {
      const connected = await trainingHubApi.ping();
      setIsConnected(connected);
      return connected;
    } catch {
      setIsConnected(false);
      return false;
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  return { isConnected, isChecking, checkConnection };
}

// Legacy exports for backward compatibility
export const useDGXSparkMetrics = useJobMetrics;
export const useDGXSparkLogs = useJobLogs;
