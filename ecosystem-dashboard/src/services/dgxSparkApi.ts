/**
 * AI Training Hub API Service
 * Connects to the DGX Spark AI Training Hub for ML training management
 * Hub URL: http://100.86.3.105:8765
 */

const TRAINING_HUB_BASE_URL = '/api/training-hub';

// ============ Project Types ============

export interface TrainingProject {
  id: string;
  name: string;
  path: string;
  scripts: string[];
  description?: string;
}

export interface ProjectDetails extends TrainingProject {
  available_scripts: string[];
  config?: Record<string, unknown>;
}

// ============ Job Types ============

export interface TrainingJob {
  id: string;
  project_id: string;
  script: string;
  status: 'running' | 'completed' | 'failed' | 'stopped';
  pid?: number;
  started_at: string;
  ended_at?: string;
  exit_code?: number;
}

export interface JobMetrics {
  job_id: string;
  step: number;
  epoch: number;
  loss: number;
  learning_rate: number;
  tokens_per_second?: number;
  samples_per_second?: number;
  gpu_memory_used?: number;
  gpu_utilization?: number;
  timestamp: string;
}

export interface JobLogs {
  job_id: string;
  logs: string[];
  total_lines: number;
}

// ============ Status Types ============

export interface GPUStatus {
  index: number;
  name: string;
  memory_used: number;
  memory_total: number;
  memory_percent: number;
  gpu_utilization: number;
  temperature: number;
  power_draw: number;
  power_limit: number;
}

export interface SystemStatus {
  cpu_percent: number;
  memory_percent: number;
  memory_used_gb: number;
  memory_total_gb: number;
  disk_percent: number;
  uptime_seconds: number;
}

export interface HubStatus {
  hub_name: string;
  version: string;
  active_jobs: TrainingJob[];
  total_jobs: number;
  projects: TrainingProject[];
  system?: SystemStatus;
  gpus?: GPUStatus[];
  timestamp: string;
}

// ============ SSE Stream Types ============

export interface StreamUpdate {
  type: 'status' | 'job_update' | 'metrics' | 'log';
  data: HubStatus | TrainingJob | JobMetrics | string;
  timestamp: string;
}

// ============ Request Types ============

export interface StartJobRequest {
  project_id: string;
  script: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface StartJobResponse {
  success: boolean;
  job_id: string;
  message: string;
}

export interface StopJobResponse {
  success: boolean;
  message: string;
}

// Legacy compatibility types
export interface MetricPoint {
  timestamp: string;
  step: number;
  loss: number;
  learning_rate: number;
  tokens_per_second: number;
  gpu_memory_percent: number;
  gpu_utilization: number;
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
}

class TrainingHubApiService {
  private baseUrl: string;

  constructor(baseUrl: string = TRAINING_HUB_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // ============ Status Endpoints ============

  /**
   * Get hub status with all active jobs
   */
  async getStatus(): Promise<HubStatus> {
    const response = await fetch(`${this.baseUrl}/api/status`);
    if (!response.ok) {
      throw new Error(`Failed to fetch status: ${response.statusText}`);
    }
    return response.json();
  }

  // ============ Project Endpoints ============

  /**
   * List all registered projects
   */
  async getProjects(): Promise<TrainingProject[]> {
    const response = await fetch(`${this.baseUrl}/api/projects`);
    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Get project details with available scripts
   */
  async getProject(projectId: string): Promise<ProjectDetails> {
    const response = await fetch(`${this.baseUrl}/api/projects/${projectId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch project: ${response.statusText}`);
    }
    return response.json();
  }

  // ============ Job Endpoints ============

  /**
   * Get all jobs (running + history)
   */
  async getJobs(): Promise<TrainingJob[]> {
    const response = await fetch(`${this.baseUrl}/api/jobs`);
    if (!response.ok) {
      throw new Error(`Failed to fetch jobs: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Get active jobs only
   */
  async getActiveJobs(): Promise<TrainingJob[]> {
    const response = await fetch(`${this.baseUrl}/api/jobs/active`);
    if (!response.ok) {
      throw new Error(`Failed to fetch active jobs: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Get job details
   */
  async getJob(jobId: string): Promise<TrainingJob> {
    const response = await fetch(`${this.baseUrl}/api/jobs/${jobId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch job: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Get job training metrics
   */
  async getJobMetrics(jobId: string): Promise<JobMetrics[]> {
    const response = await fetch(`${this.baseUrl}/api/jobs/${jobId}/metrics`);
    if (!response.ok) {
      throw new Error(`Failed to fetch job metrics: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Get job logs
   */
  async getJobLogs(jobId: string): Promise<JobLogs> {
    const response = await fetch(`${this.baseUrl}/api/jobs/${jobId}/logs`);
    if (!response.ok) {
      throw new Error(`Failed to fetch job logs: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Start a new training job
   */
  async startJob(request: StartJobRequest): Promise<StartJobResponse> {
    const response = await fetch(`${this.baseUrl}/api/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      throw new Error(`Failed to start job: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Stop a training job
   */
  async stopJob(jobId: string): Promise<StopJobResponse> {
    const response = await fetch(`${this.baseUrl}/api/jobs/${jobId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to stop job: ${response.statusText}`);
    }
    return response.json();
  }

  // ============ Streaming ============

  /**
   * Create SSE stream connection for real-time updates
   */
  createStream(onMessage: (data: HubStatus) => void, onError?: (error: Event) => void): EventSource {
    const eventSource = new EventSource(`${this.baseUrl}/api/stream`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error('Failed to parse SSE message:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      if (onError) {
        onError(error);
      }
    };

    return eventSource;
  }

  /**
   * Check if Training Hub is reachable
   */
  async ping(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/status`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const trainingHubApi = new TrainingHubApiService();

// Legacy alias for backward compatibility
export const dgxSparkApi = trainingHubApi;
export default trainingHubApi;
