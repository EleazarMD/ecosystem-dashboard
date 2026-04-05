import type { NextApiRequest, NextApiResponse } from 'next';
import { readFileSync, existsSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const ORCHESTRATOR_PATH = '/home/eleazar/clinical-agentic-orchestrator';
const GOOSE_AGENT_PATH = '/home/eleazar/goose-medical-agent';
const TRAINING_RESULTS_DIR = join(ORCHESTRATOR_PATH, 'training_results');
const HEARTBEAT_STATE_FILE = join(ORCHESTRATOR_PATH, 'heartbeat_state.json');

function loadCycles(): any[] {
  if (!existsSync(TRAINING_RESULTS_DIR)) return [];
  const files = readdirSync(TRAINING_RESULTS_DIR)
    .filter(f => (f.startsWith('v2_cycle_') || f.startsWith('v3_cycle_')) && f.endsWith('.json'))
    .sort((a, b) => {
      const numA = parseInt(a.match(/v[23]_cycle_(\d+)/)?.[1] || '0');
      const numB = parseInt(b.match(/v[23]_cycle_(\d+)/)?.[1] || '0');
      return numA - numB;
    });

  const cycleMap = new Map<string, string>();
  for (const f of files) {
    const ver = f.startsWith('v3_') ? 'v3' : 'v2';
    const m = f.match(/v[23]_cycle_(\d+)/);
    if (m) cycleMap.set(`${ver}_${m[1]}`, f);
  }

  return Array.from(cycleMap.values()).map(f => {
    try {
      const d = JSON.parse(readFileSync(join(TRAINING_RESULTS_DIR, f), 'utf-8'));
      const m = f.match(/v[23]_cycle_(\d+)/);
      d.cycle_number = m ? parseInt(m[1]) : 0;
      return d;
    } catch { return null; }
  }).filter(Boolean);
}

function getTrainingPid(): number | null {
  try {
    const pidFile = join(ORCHESTRATOR_PATH, 'rl_cycle.pid');
    if (existsSync(pidFile)) {
      const pid = parseInt(readFileSync(pidFile, 'utf-8').trim());
      execSync(`kill -0 ${pid}`, { stdio: 'ignore' });
      return pid;
    }
    const out = execSync(
      `pgrep -f "autonomous_training.py" 2>/dev/null || true`,
      { encoding: 'utf-8' }
    ).trim();
    return out ? parseInt(out.split('\n')[0]) : null;
  } catch { return null; }
}

function evaluateCriteria(cycles: any[], prodScore: number) {
  if (cycles.length === 0) return { allPassed: false, criteria: [] };
  const latestScore = cycles[cycles.length - 1]?.overall_score || 0;
  const recentN = Math.min(5, cycles.length);
  const recentScores = cycles.slice(-recentN).map(c => c.overall_score || 0);
  const avgRecent = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
  const successRate = cycles.filter(c => (c.overall_score || 0) >= 7.0).length / cycles.length;

  const criteria = [
    { name: 'Minimum Score',      threshold: 7.0,  actual: latestScore,   passed: latestScore >= 7.0 },
    { name: 'Avg Recent Score',   threshold: 6.5,  actual: avgRecent,     passed: avgRecent >= 6.5 },
    { name: 'Success Rate',       threshold: 0.4,  actual: successRate,   passed: successRate >= 0.4 },
    { name: 'Minimum Cycles',     threshold: 10,   actual: cycles.length, passed: cycles.length >= 10 },
    { name: 'No Regression',      threshold: prodScore > 0 ? prodScore * 0.95 : 0,
      actual: latestScore,
      passed: prodScore === 0 || latestScore >= prodScore * 0.95 },
  ];
  return { allPassed: criteria.every(c => c.passed), criteria };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cycles = loadCycles();
  const trainingPid = getTrainingPid();
  const isRunning = trainingPid !== null;

  let prodScore = 0;
  let prodVersion = 0;
  const paramsFile = join(GOOSE_AGENT_PATH, 'dashboard_rl_params.json');
  if (existsSync(paramsFile)) {
    try {
      const p = JSON.parse(readFileSync(paramsFile, 'utf-8'));
      prodScore = p.best_score || p.score || 0;
      prodVersion = p.version || 0;
    } catch { /* ignore */ }
  }

  const { allPassed, criteria } = evaluateCriteria(cycles, prodScore);
  const latestCycle = cycles[cycles.length - 1];
  const latestScore = latestCycle?.overall_score || 0;
  const recentScores = cycles.slice(-5).map(c => c.overall_score || 0);
  const avgRecent = recentScores.length > 0
    ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length : 0;

  // Track first-time promotion-ready for notification deduplication
  let prevState: any = {};
  if (existsSync(HEARTBEAT_STATE_FILE)) {
    try { prevState = JSON.parse(readFileSync(HEARTBEAT_STATE_FILE, 'utf-8')); } catch { /* ignore */ }
  }
  const justBecameReady = allPassed && !prevState.promotion_ready;
  try {
    writeFileSync(HEARTBEAT_STATE_FILE, JSON.stringify({
      promotion_ready: allPassed,
      last_cycle_count: cycles.length,
      last_check: new Date().toISOString(),
    }, null, 2));
  } catch { /* ignore */ }

  return res.status(200).json({
    training: {
      running: isRunning,
      pid: trainingPid,
      cycle_count: cycles.length,
      latest_cycle: latestCycle?.cycle_number || 0,
      latest_score: latestScore,
      avg_recent_score: Math.round(avgRecent * 100) / 100,
      best_score: cycles.length > 0 ? Math.max(...cycles.map(c => c.overall_score || 0)) : 0,
      latest_timestamp: latestCycle?.timestamp || null,
    },
    production: {
      version: prodVersion,
      score: prodScore,
    },
    promotion: {
      ready: allPassed,
      just_became_ready: justBecameReady,
      criteria,
      message: allPassed
        ? '✅ Training complete — all criteria met. Ready to promote to production.'
        : `⏳ Training in progress — ${criteria.filter((c: any) => !c.passed).length} criteria not yet met.`,
    },
    endpoints: {
      heartbeat:     'GET  /api/clinical-kb/rl-heartbeat',
      promotion_gate:'GET  /api/clinical-kb/rl-monitoring?endpoint=promotion-gate',
      promote:       'POST /api/clinical-kb/rl-promote',
      approve_gate:  'POST /api/clinical-kb/rl-monitoring?endpoint=promotion-gate  { action: "approve" }',
    },
  });
}
