/**
 * Research Cost Tracker — tracks cumulative spend across research sessions.
 *
 * Stores cost entries in localStorage with model breakdown,
 * daily/weekly/monthly aggregation, and budget alerts.
 */

export interface CostEntry {
  id: string;
  sessionId?: string;
  model: string;
  cost: number;           // USD
  inputTokens?: number;
  outputTokens?: number;
  query: string;
  createdAt: number;      // epoch ms
}

export interface CostSummary {
  totalSpend: number;
  totalSessions: number;
  todaySpend: number;
  weekSpend: number;
  monthSpend: number;
  byModel: Record<string, { spend: number; sessions: number }>;
  averageCostPerSession: number;
  mostExpensiveSession: CostEntry | null;
}

const STORAGE_KEY = 'research-cost-tracker';
const MAX_ENTRIES = 500;

// ── CRUD ────────────────────────────────────────────────────────

function getAll(): CostEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persist(entries: CostEntry[]): void {
  const trimmed = entries.slice(-MAX_ENTRIES);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export function trackCost(opts: {
  sessionId?: string;
  model: string;
  cost: number;
  inputTokens?: number;
  outputTokens?: number;
  query: string;
}): CostEntry {
  const entry: CostEntry = {
    id: `cost-${Date.now()}`,
    sessionId: opts.sessionId,
    model: opts.model,
    cost: opts.cost,
    inputTokens: opts.inputTokens,
    outputTokens: opts.outputTokens,
    query: opts.query,
    createdAt: Date.now(),
  };
  const entries = getAll();
  entries.push(entry);
  persist(entries);
  return entry;
}

export function getCostEntries(): CostEntry[] {
  return getAll();
}

export function clearCostHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// ── Aggregation ─────────────────────────────────────────────────

export function getCostSummary(): CostSummary {
  const entries = getAll();
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const weekMs = 7 * dayMs;
  const monthMs = 30 * dayMs;

  const todayStart = now - dayMs;
  const weekStart = now - weekMs;
  const monthStart = now - monthMs;

  const byModel: Record<string, { spend: number; sessions: number }> = {};
  let totalSpend = 0;
  let todaySpend = 0;
  let weekSpend = 0;
  let monthSpend = 0;
  let mostExpensive: CostEntry | null = null;

  for (const entry of entries) {
    totalSpend += entry.cost;
    if (entry.createdAt >= todayStart) todaySpend += entry.cost;
    if (entry.createdAt >= weekStart) weekSpend += entry.cost;
    if (entry.createdAt >= monthStart) monthSpend += entry.cost;

    if (!byModel[entry.model]) {
      byModel[entry.model] = { spend: 0, sessions: 0 };
    }
    byModel[entry.model].spend += entry.cost;
    byModel[entry.model].sessions += 1;

    if (!mostExpensive || entry.cost > mostExpensive.cost) {
      mostExpensive = entry;
    }
  }

  return {
    totalSpend: parseFloat(totalSpend.toFixed(4)),
    totalSessions: entries.length,
    todaySpend: parseFloat(todaySpend.toFixed(4)),
    weekSpend: parseFloat(weekSpend.toFixed(4)),
    monthSpend: parseFloat(monthSpend.toFixed(4)),
    byModel,
    averageCostPerSession: entries.length > 0 ? parseFloat((totalSpend / entries.length).toFixed(4)) : 0,
    mostExpensiveSession: mostExpensive,
  };
}

// ── Budget alerts ───────────────────────────────────────────────

const BUDGET_KEY = 'research-cost-budget';

export interface BudgetConfig {
  dailyLimit: number;
  weeklyLimit: number;
  monthlyLimit: number;
  enabled: boolean;
}

export function getBudgetConfig(): BudgetConfig {
  if (typeof window === 'undefined') return { dailyLimit: 10, weeklyLimit: 50, monthlyLimit: 200, enabled: false };
  try {
    const raw = localStorage.getItem(BUDGET_KEY);
    return raw ? JSON.parse(raw) : { dailyLimit: 10, weeklyLimit: 50, monthlyLimit: 200, enabled: false };
  } catch {
    return { dailyLimit: 10, weeklyLimit: 50, monthlyLimit: 200, enabled: false };
  }
}

export function setBudgetConfig(config: BudgetConfig): void {
  localStorage.setItem(BUDGET_KEY, JSON.stringify(config));
}

export function checkBudgetAlerts(): { exceeded: boolean; alerts: string[] } {
  const config = getBudgetConfig();
  if (!config.enabled) return { exceeded: false, alerts: [] };

  const summary = getCostSummary();
  const alerts: string[] = [];

  if (summary.todaySpend >= config.dailyLimit) {
    alerts.push(`Daily budget exceeded: $${summary.todaySpend.toFixed(2)} / $${config.dailyLimit}`);
  } else if (summary.todaySpend >= config.dailyLimit * 0.8) {
    alerts.push(`Daily budget 80% used: $${summary.todaySpend.toFixed(2)} / $${config.dailyLimit}`);
  }

  if (summary.weekSpend >= config.weeklyLimit) {
    alerts.push(`Weekly budget exceeded: $${summary.weekSpend.toFixed(2)} / $${config.weeklyLimit}`);
  }

  if (summary.monthSpend >= config.monthlyLimit) {
    alerts.push(`Monthly budget exceeded: $${summary.monthSpend.toFixed(2)} / $${config.monthlyLimit}`);
  }

  return { exceeded: alerts.some(a => a.includes('exceeded')), alerts };
}

// ── Daily breakdown for charts ──────────────────────────────────

export function getDailyBreakdown(days = 30): { date: string; spend: number; sessions: number }[] {
  const entries = getAll();
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const result: { date: string; spend: number; sessions: number }[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const dayStart = now - (i + 1) * dayMs;
    const dayEnd = now - i * dayMs;
    const dayEntries = entries.filter(e => e.createdAt >= dayStart && e.createdAt < dayEnd);
    const spend = dayEntries.reduce((s, e) => s + e.cost, 0);
    result.push({
      date: new Date(dayEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      spend: parseFloat(spend.toFixed(4)),
      sessions: dayEntries.length,
    });
  }

  return result;
}
