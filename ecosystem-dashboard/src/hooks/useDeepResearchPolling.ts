import { useEffect, useRef } from 'react';

export type DeepResearchPollingStatus = {
  status?: string;
  job_status?: string;
  progress?: number;
  job_progress?: number;
  currentStep?: string;
  job_current_step?: string;
  error?: string;
  errorMessage?: string;
  message?: string;
  [key: string]: any;
};

export type UseDeepResearchPollingOptions = {
  interval?: number;
  onComplete?: (status: DeepResearchPollingStatus) => void | Promise<void>;
  onError?: (status: DeepResearchPollingStatus) => void;
  onUpdate?: (status: DeepResearchPollingStatus) => void;
};

const normalizeStatus = (status: DeepResearchPollingStatus): DeepResearchPollingStatus => ({
  ...status,
  job_progress: status.job_progress ?? status.progress ?? 0,
  job_current_step: status.job_current_step ?? status.currentStep ?? status.message ?? '',
});

const isComplete = (status: DeepResearchPollingStatus) => {
  const state = status.job_status ?? status.status;
  return state === 'completed' || state === 'complete' || state === 'done';
};

const isFailed = (status: DeepResearchPollingStatus) => {
  const state = status.job_status ?? status.status;
  return state === 'failed' || state === 'error' || state === 'cancelled';
};

export function useDeepResearchPolling(
  messageId: string | null | undefined,
  options: UseDeepResearchPollingOptions = {}
) {
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    if (!messageId) {
      return;
    }

    let isActive = true;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const interval = optionsRef.current.interval ?? 5000;

    const poll = async () => {
      try {
        const response = await fetch(`/api/deep-research/status?messageId=${encodeURIComponent(messageId)}`);

        if (!response.ok) {
          throw new Error(`Deep research status request failed: ${response.status}`);
        }

        const status = normalizeStatus(await response.json());

        if (!isActive) {
          return;
        }

        if (isComplete(status)) {
          await optionsRef.current.onComplete?.(status);
          return;
        }

        if (isFailed(status)) {
          optionsRef.current.onError?.(status);
          return;
        }

        optionsRef.current.onUpdate?.(status);
        timeoutId = setTimeout(poll, interval);
      } catch (error) {
        if (!isActive) {
          return;
        }

        optionsRef.current.onError?.({
          status: 'error',
          errorMessage: error instanceof Error ? error.message : 'Failed to poll deep research status',
          job_progress: 0,
          job_current_step: 'Unable to check deep research status',
        });
      }
    };

    poll();

    return () => {
      isActive = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [messageId]);
}
