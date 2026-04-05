/**
 * useOpenClawGateway — OpenClaw Gateway Client via HTTP proxy
 *
 * Uses /api/openclaw/gateway-rpc (server-side WebSocket proxy) instead of a
 * direct WebSocket connection, so it works from any network (Tailscale, remote, etc.)
 *
 * State is lifted to a module-level singleton so multiple hook instances / remounts
 * all share the same connection state without resetting in-flight requests.
 */

import { useCallback, useEffect, useState } from 'react';

const RPC_PROXY = '/api/openclaw/gateway-rpc';
const GATEWAY_API = '/api/gateway/openclaw';

async function proxyRpc<T = unknown>(method: string, params?: unknown): Promise<T> {
  const res = await fetch(RPC_PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, params }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    const msg = data.error ?? `RPC ${method} failed (${res.status})`;
    const err = new Error(msg) as Error & { offline?: boolean };
    if (data.offline) err.offline = true;
    throw err;
  }
  return data.result as T;
}

// HTTP API helper for AI Gateway endpoints (no WS device pairing needed)
async function gatewayHttp<T = unknown>(path: string): Promise<T> {
  const res = await fetch(`${GATEWAY_API}${path}`);
  const data = await res.json();
  if (!res.ok || !data.ok) {
    const msg = data.error ?? `Gateway HTTP ${path} failed (${res.status})`;
    throw new Error(msg);
  }
  return data.result as T;
}

// ─── Gateway types ────────────────────────────────────────────────────────────

export type GatewayAgentRow = {
  id: string;
  name?: string;
  identity?: { name?: string; theme?: string; emoji?: string; avatar?: string; avatarUrl?: string };
};

export type GatewaySessionRow = {
  key: string;
  kind: 'direct' | 'group' | 'global' | 'unknown';
  label?: string;
  displayName?: string;
  surface?: string;
  updatedAt: number | null;
  sessionId?: string;
  thinkingLevel?: string;
  verboseLevel?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  model?: string;
  modelProvider?: string;
  agentId?: string;
};

export type SessionsUsageTotals = {
  input: number; output: number; cacheRead: number; cacheWrite: number;
  totalTokens: number; totalCost: number; inputCost: number; outputCost: number;
  cacheReadCost: number; cacheWriteCost: number; missingCostEntries: number;
};

export type SessionsUsageEntry = {
  key: string; label?: string; agentId?: string; channel?: string;
  model?: string; modelProvider?: string;
  usage: { input: number; output: number; totalTokens: number; totalCost: number;
           firstActivity?: number; lastActivity?: number;
           dailyBreakdown?: Array<{ date: string; tokens: number; cost: number }> } | null;
};

export type SessionsUsageResult = {
  updatedAt: number; startDate: string; endDate: string;
  sessions: SessionsUsageEntry[]; totals: SessionsUsageTotals;
  aggregates: {
    byModel: Array<{ provider?: string; model?: string; count: number; totals: SessionsUsageTotals }>;
    byAgent: Array<{ agentId: string; totals: SessionsUsageTotals }>;
    daily: Array<{ date: string; tokens: number; cost: number; messages: number }>;
  };
};

export type CostUsageSummary = {
  updatedAt: number; days: number; totals: SessionsUsageTotals;
  daily: Array<SessionsUsageTotals & { date: string }>;
};

export type CronJob = {
  id: string; agentId?: string; name: string; description?: string;
  enabled: boolean; createdAtMs: number; updatedAtMs: number;
  schedule: { kind: 'at'; at: string } | { kind: 'every'; everyMs: number } | { kind: 'cron'; expr: string; tz?: string };
  sessionTarget: 'main' | 'isolated';
  wakeMode: 'next-heartbeat' | 'now';
  payload: { kind: 'systemEvent'; text: string } | { kind: 'agentTurn'; message: string; timeoutSeconds?: number };
  delivery?: { mode: 'none' | 'announce'; channel?: string; to?: string };
  state?: { nextRunAtMs?: number; lastRunAtMs?: number; lastStatus?: 'ok' | 'error' | 'skipped'; lastError?: string; lastDurationMs?: number };
};

export type CronRunEntry = {
  ts: number; jobId: string; status: 'ok' | 'error' | 'skipped';
  durationMs?: number; error?: string; summary?: string;
};

export type LogEntry = {
  raw: string; time?: string | null; level?: string | null;
  subsystem?: string | null; message?: string | null;
};

export type NodeEntry = {
  nodeId: string; displayName?: string; remoteIp?: string;
  connected: boolean; caps?: string[]; commands?: string[];
};

export type AgentFileEntry = {
  name: string; path: string; missing: boolean;
  size?: number; updatedAtMs?: number; content?: string;
};

// ─── Hook state ───────────────────────────────────────────────────────────────

export type GatewayState = {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  gatewayVersion: string | null;
  agents: GatewayAgentRow[];
  selectedAgentId: string | null;
  sessions: GatewaySessionRow[];
  cronJobs: CronJob[];
  nodes: NodeEntry[];
  logEntries: LogEntry[];
  logCursor: number | null;
};

// ─── Module-level singleton state ─────────────────────────────────────────────
// Shared across all hook instances so remounts don't reset in-flight connections.

type Listener = () => void;

let _state: GatewayState = {
  connected: false, connecting: false, error: null, gatewayVersion: null,
  agents: [], selectedAgentId: null, sessions: [], cronJobs: [], nodes: [],
  logEntries: [], logCursor: null,
};
let _connectPromise: Promise<void> | null = null;
const _listeners = new Set<Listener>();

function _getState() { return _state; }

function _setState(updater: (prev: GatewayState) => GatewayState) {
  _state = updater(_state);
  _listeners.forEach((l) => l());
}

function _subscribe(listener: Listener) {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

function parseLogLine(line: string): LogEntry {
  try {
    const obj = JSON.parse(line) as Record<string, unknown>;
    const meta = obj._meta as Record<string, unknown> | undefined;
    const time = typeof obj.time === 'string' ? obj.time : typeof meta?.date === 'string' ? meta.date as string : null;
    const level = (meta?.logLevelName ?? meta?.level ?? null) as string | null;
    const ctx = typeof obj['0'] === 'string' ? obj['0'] : null;
    let subsystem: string | null = null;
    if (ctx) {
      try { const c = JSON.parse(ctx) as Record<string, unknown>; subsystem = (c.subsystem ?? c.module ?? null) as string | null; } catch { subsystem = ctx.length < 120 ? ctx : null; }
    }
    const message = typeof obj['1'] === 'string' ? obj['1'] : typeof obj.message === 'string' ? obj.message as string : line;
    return { raw: line, time, level, subsystem, message };
  } catch { return { raw: line, message: line }; }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

type AgentsHttpResult = {
  agents: Array<{ id: string }>;
  defaultId?: string;
  enriched?: Array<{ id: string; name: string; model?: string; skills?: number; hasHeartbeat?: boolean; hasMemorySearch?: boolean }>;
};

async function _doConnect() {
  _setState((p) => ({ ...p, connecting: true, error: null }));
  try {
    // Use AI Gateway HTTP endpoint (no WS device pairing needed)
    const res = await gatewayHttp<AgentsHttpResult>('/agents');
    const enrichedData = res?.enriched ?? [];
    const enriched: GatewayAgentRow[] = enrichedData.map((a) => ({
      id: a.id,
      name: a.name,
      identity: { name: a.name },
    }));
    _setState((p) => ({
      ...p,
      connected: true,
      connecting: false,
      error: null,
      agents: enriched,
      selectedAgentId: p.selectedAgentId
        ?? (enriched.some(a => a.id === 'main') ? 'main' : null)
        ?? res?.defaultId ?? enriched[0]?.id ?? null,
    }));
  } catch (err: any) {
    _setState((p) => ({
      ...p,
      connected: false,
      connecting: false,
      error: err.message ?? 'Gateway offline',
    }));
  } finally {
    _connectPromise = null;
  }
}

export function useOpenClawGateway() {
  // Subscribe to module-level singleton state
  const [state, setLocalState] = useState<GatewayState>(_getState);

  useEffect(() => {
    setLocalState(_getState());
    return _subscribe(() => setLocalState(_getState()));
  }, []);

  // ─── connect: idempotent — deduplicates concurrent calls via promise ──────

  const connect = useCallback(async () => {
    if (_state.connected) return;
    if (!_connectPromise) {
      _connectPromise = _doConnect();
    }
    return _connectPromise;
  }, []);

  const disconnect = useCallback(() => {
    _connectPromise = null;
    _setState((p) => ({ ...p, connected: false, connecting: false }));
  }, []);

  // ─── API methods ─────────────────────────────────────────────────────────────

  const loadAgents = useCallback(async () => {
    // Use AI Gateway HTTP endpoint (no WS device pairing needed)
    const res = await gatewayHttp<AgentsHttpResult>('/agents');
    const enrichedData = res?.enriched ?? [];
    const enriched: GatewayAgentRow[] = enrichedData.map((a) => ({
      id: a.id,
      name: a.name,
      identity: { name: a.name },
    }));
    _setState((p) => ({
      ...p,
      connected: true,
      agents: enriched,
      selectedAgentId: p.selectedAgentId
        ?? (enriched.some(a => a.id === 'main') ? 'main' : null)
        ?? res?.defaultId ?? enriched[0]?.id ?? null,
    }));
    return enriched;
  }, []);

  const loadSessions = useCallback(async (opts?: { limit?: number; activeMinutes?: number }) => {
    const res = await proxyRpc<{ sessions: Array<Record<string, unknown>> }>('sessions.list', {
      includeGlobal: true, includeUnknown: false, limit: 50, ...opts,
    });
    const rawSessions = res?.sessions ?? [];
    const sessions: GatewaySessionRow[] = rawSessions.map((s) => {
      const key = (s.key as string) ?? '';
      const parts = key.split(':');
      const agentId = parts[1] ?? undefined;
      const surface = parts[2] ?? undefined;
      const shortId = parts[3] ? parts[3].slice(0, 8) : undefined;
      const displayName = (s.label as string | undefined)
        ?? (shortId ? `${agentId} · ${shortId}` : agentId ?? key.slice(0, 30));
      return {
        key,
        kind: (s.kind as GatewaySessionRow['kind']) ?? 'direct',
        label: s.label as string | undefined,
        displayName,
        surface,
        agentId,
        updatedAt: (s.updatedAt as number) ?? null,
        sessionId: s.sessionId as string | undefined,
        model: s.model as string | undefined,
        modelProvider: s.modelProvider as string | undefined,
      };
    });
    _setState((p) => ({ ...p, sessions }));
    return sessions;
  }, []);

  const patchSession = useCallback(async (key: string, patch: { label?: string | null; thinkingLevel?: string | null; verboseLevel?: string | null }) => {
    await proxyRpc('sessions.patch', { key, ...patch });
    await loadSessions();
  }, [loadSessions]);

  const deleteSession = useCallback(async (key: string) => {
    await proxyRpc('sessions.delete', { key, deleteTranscript: true });
    await loadSessions();
  }, [loadSessions]);

  const loadUsage = useCallback(async (startDate: string, endDate: string): Promise<{ usage: SessionsUsageResult; cost: CostUsageSummary }> => {
    const [usage, cost] = await Promise.all([
      proxyRpc<SessionsUsageResult>('sessions.usage', { startDate, endDate, limit: 500, includeContextWeight: false }),
      proxyRpc<CostUsageSummary>('usage.cost', { startDate, endDate }),
    ]);
    return { usage, cost };
  }, []);

  const loadCronJobs = useCallback(async () => {
    const res = await proxyRpc<{ jobs: CronJob[] }>('cron.list', { includeDisabled: true });
    const cronJobs = res?.jobs ?? [];
    _setState((p) => ({ ...p, cronJobs }));
    return cronJobs;
  }, []);

  const toggleCronJob = useCallback(async (id: string, enabled: boolean) => {
    await proxyRpc('cron.update', { id, patch: { enabled } });
    await loadCronJobs();
  }, [loadCronJobs]);

  const runCronJobNow = useCallback(async (id: string) => {
    await proxyRpc('cron.run', { id, mode: 'force' });
  }, []);

  const deleteCronJob = useCallback(async (id: string) => {
    await proxyRpc('cron.remove', { id });
    await loadCronJobs();
  }, [loadCronJobs]);

  const loadCronRuns = useCallback(async (jobId: string): Promise<CronRunEntry[]> => {
    const res = await proxyRpc<{ entries: CronRunEntry[] }>('cron.runs', { id: jobId, limit: 50 });
    return res?.entries ?? [];
  }, []);

  const loadLogs = useCallback(async (opts?: { reset?: boolean }) => {
    const cursor = opts?.reset ? undefined : (_state.logCursor ?? undefined);
    const res = await proxyRpc<{ lines?: string[]; cursor?: number; reset?: boolean }>('logs.tail', {
      cursor, limit: 300, maxBytes: 512 * 1024,
    });
    const lines = (res?.lines ?? []).filter((l): l is string => typeof l === 'string');
    const entries = lines.map(parseLogLine);
    const shouldReset = Boolean(opts?.reset || res?.reset || cursor == null);
    _setState((p) => ({
      ...p,
      logEntries: shouldReset ? entries : [...p.logEntries, ...entries].slice(-2000),
      logCursor: typeof res?.cursor === 'number' ? res.cursor : p.logCursor,
    }));
    return entries;
  }, []);

  const loadNodes = useCallback(async () => {
    const res = await proxyRpc<{ nodes?: NodeEntry[] }>('node.list', {});
    const nodes = Array.isArray(res?.nodes) ? res.nodes : [];
    _setState((p) => ({ ...p, nodes }));
    return nodes;
  }, []);

  const listAgentFiles = useCallback(async (agentId: string): Promise<AgentFileEntry[]> => {
    const res = await proxyRpc<{ files: AgentFileEntry[] }>('agents.files.list', { agentId });
    return res?.files ?? [];
  }, []);

  const getAgentFile = useCallback(async (agentId: string, fileName: string): Promise<AgentFileEntry> => {
    const res = await proxyRpc<{ file: AgentFileEntry }>('agents.files.get', { agentId, file: fileName });
    return res.file;
  }, []);

  const setAgentFile = useCallback(async (agentId: string, fileName: string, content: string): Promise<void> => {
    await proxyRpc('agents.files.set', { agentId, file: fileName, content });
  }, []);

  const setSelectedAgent = useCallback((agentId: string) => {
    _setState((p) => ({ ...p, selectedAgentId: agentId }));
  }, []);

  const request = useCallback(<T = unknown>(method: string, params?: unknown): Promise<T> => {
    return proxyRpc<T>(method, params);
  }, []);

  return {
    state,
    connect,
    disconnect,
    request,
    loadAgents,
    loadSessions,
    patchSession,
    deleteSession,
    loadUsage,
    loadCronJobs,
    toggleCronJob,
    runCronJobNow,
    deleteCronJob,
    loadCronRuns,
    loadLogs,
    loadNodes,
    listAgentFiles,
    getAgentFile,
    setAgentFile,
    setSelectedAgent,
  };
}

export default useOpenClawGateway;
