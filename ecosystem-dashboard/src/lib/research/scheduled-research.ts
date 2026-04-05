/**
 * Scheduled Research — lightweight recurring research system.
 *
 * Stores scheduled research configs in localStorage.
 * A polling hook checks for due jobs and triggers them via the
 * existing research session create API.
 */

export interface ScheduledResearch {
  id: string;
  query: string;
  model: string;
  sonarModel?: string;
  audienceLevel: string;
  cronLabel: string;          // human-readable label
  intervalMs: number;         // polling interval in ms
  lastRunAt?: number;         // epoch ms
  nextRunAt: number;          // epoch ms
  enabled: boolean;
  createdAt: number;
  runCount: number;
  lastSessionId?: string;
}

const STORAGE_KEY = 'research-scheduled-jobs';

// ── CRUD ────────────────────────────────────────────────────────

export function getScheduledResearch(): ScheduledResearch[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persist(jobs: ScheduledResearch[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
}

export function addScheduledResearch(job: Omit<ScheduledResearch, 'id' | 'createdAt' | 'runCount' | 'nextRunAt'>): ScheduledResearch {
  const now = Date.now();
  const newJob: ScheduledResearch = {
    ...job,
    id: `sched-${now}`,
    createdAt: now,
    runCount: 0,
    nextRunAt: now + job.intervalMs,
  };
  const jobs = getScheduledResearch();
  jobs.push(newJob);
  persist(jobs);
  return newJob;
}

export function updateScheduledResearch(id: string, updates: Partial<ScheduledResearch>): void {
  const jobs = getScheduledResearch().map(j => j.id === id ? { ...j, ...updates } : j);
  persist(jobs);
}

export function deleteScheduledResearch(id: string): void {
  persist(getScheduledResearch().filter(j => j.id !== id));
}

export function toggleScheduledResearch(id: string): void {
  const jobs = getScheduledResearch().map(j => {
    if (j.id === id) {
      return { ...j, enabled: !j.enabled, nextRunAt: !j.enabled ? Date.now() + j.intervalMs : j.nextRunAt };
    }
    return j;
  });
  persist(jobs);
}

export function markJobRan(id: string, sessionId: string): void {
  const now = Date.now();
  const jobs = getScheduledResearch().map(j => {
    if (j.id === id) {
      return {
        ...j,
        lastRunAt: now,
        nextRunAt: now + j.intervalMs,
        runCount: j.runCount + 1,
        lastSessionId: sessionId,
      };
    }
    return j;
  });
  persist(jobs);
}

// ── Due jobs ────────────────────────────────────────────────────

export function getDueJobs(): ScheduledResearch[] {
  const now = Date.now();
  return getScheduledResearch().filter(j => j.enabled && j.nextRunAt <= now);
}

// ── Interval presets ────────────────────────────────────────────

export const SCHEDULE_PRESETS = [
  { label: 'Every 6 hours', intervalMs: 6 * 60 * 60 * 1000 },
  { label: 'Every 12 hours', intervalMs: 12 * 60 * 60 * 1000 },
  { label: 'Daily', intervalMs: 24 * 60 * 60 * 1000 },
  { label: 'Every 3 days', intervalMs: 3 * 24 * 60 * 60 * 1000 },
  { label: 'Weekly', intervalMs: 7 * 24 * 60 * 60 * 1000 },
  { label: 'Bi-weekly', intervalMs: 14 * 24 * 60 * 60 * 1000 },
  { label: 'Monthly', intervalMs: 30 * 24 * 60 * 60 * 1000 },
];
