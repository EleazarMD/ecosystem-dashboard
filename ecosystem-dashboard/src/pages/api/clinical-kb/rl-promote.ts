import type { NextApiRequest, NextApiResponse } from 'next';
import { readFileSync, existsSync, readdirSync, writeFileSync, copyFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const ORCHESTRATOR_PATH = '/home/eleazar/clinical-agentic-orchestrator';
const GOOSE_AGENT_PATH = '/home/eleazar/goose-medical-agent';
const TRAINING_RESULTS_DIR = join(ORCHESTRATOR_PATH, 'training_results');
const PROMOTION_LOG_FILE = join(ORCHESTRATOR_PATH, 'promotion_log.json');

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

function evaluateCriteria(cycles: any[], prodScore: number) {
  if (cycles.length === 0) return { allPassed: false, criteria: [] };
  const latestScore = cycles[cycles.length - 1]?.overall_score || 0;
  const recentN = Math.min(5, cycles.length);
  const recentScores = cycles.slice(-recentN).map(c => c.overall_score || 0);
  const avgRecent = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
  const successRate = cycles.filter(c => (c.overall_score || 0) >= 7.0).length / cycles.length;
  const criteria = [
    { name: 'Minimum Score',    threshold: 7.0,  actual: latestScore,   passed: latestScore >= 7.0 },
    { name: 'Avg Recent Score', threshold: 6.5,  actual: avgRecent,     passed: avgRecent >= 6.5 },
    { name: 'Success Rate',     threshold: 0.4,  actual: successRate,   passed: successRate >= 0.4 },
    { name: 'Minimum Cycles',   threshold: 10,   actual: cycles.length, passed: cycles.length >= 10 },
    { name: 'No Regression',    threshold: prodScore > 0 ? prodScore * 0.95 : 0,
      actual: latestScore,
      passed: prodScore === 0 || latestScore >= prodScore * 0.95 },
  ];
  return { allPassed: criteria.every(c => c.passed), criteria };
}

function appendPromotionLog(entry: any) {
  let log: any[] = [];
  if (existsSync(PROMOTION_LOG_FILE)) {
    try { log = JSON.parse(readFileSync(PROMOTION_LOG_FILE, 'utf-8')); } catch { log = []; }
  }
  log.push(entry);
  writeFileSync(PROMOTION_LOG_FILE, JSON.stringify(log, null, 2));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // GET: dry-run — return what would happen
  if (req.method === 'GET') {
    const cycles = loadCycles();
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
    const latestScore = cycles[cycles.length - 1]?.overall_score || 0;
    return res.status(200).json({
      dry_run: true,
      promotion_ready: allPassed,
      staging_cycles: cycles.length,
      staging_latest_score: latestScore,
      production_version: prodVersion,
      production_score: prodScore,
      criteria,
      message: allPassed
        ? 'Ready to promote. POST to this endpoint with { "action": "promote" } to execute.'
        : `Not ready: ${criteria.filter((c: any) => !c.passed).map((c: any) => c.name).join(', ')} not met.`,
    });
  }

  // POST: execute promotion or force-promote with override
  if (req.method === 'POST') {
    let body: any = {};
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    } catch { body = {}; }

    const action = body.action; // 'promote' | 'force_promote' | 'reject'
    const reason = body.reason || '';
    const reviewedBy = body.reviewed_by || 'ios-agent';

    if (!['promote', 'force_promote', 'reject'].includes(action)) {
      return res.status(400).json({
        error: 'Invalid action. Use: promote | force_promote | reject',
      });
    }

    const cycles = loadCycles();
    if (cycles.length === 0) {
      return res.status(409).json({ error: 'No training cycles available to promote.' });
    }

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

    // Handle reject
    if (action === 'reject') {
      const entry = {
        timestamp: new Date().toISOString(),
        action: 'rejected',
        reason,
        reviewed_by: reviewedBy,
        staging_cycles: cycles.length,
        staging_score: latestScore,
      };
      appendPromotionLog(entry);
      return res.status(200).json({ success: true, action: 'rejected', entry });
    }

    // Enforce criteria unless force_promote
    if (!allPassed && action !== 'force_promote') {
      return res.status(409).json({
        error: 'Promotion criteria not met. Use action: "force_promote" to override.',
        criteria,
        failed: criteria.filter((c: any) => !c.passed).map((c: any) => c.name),
      });
    }

    // Execute promotion: copy staging params → production, bump version
    try {
      const stagingFile = join(GOOSE_AGENT_PATH, 'dashboard_rl_params_staging.json');
      const newVersion = prodVersion + 1;

      let newParams: any = {
        version: newVersion,
        promoted_at: new Date().toISOString(),
        promoted_by: reviewedBy,
        score: latestScore,
        best_score: Math.max(...cycles.map(c => c.overall_score || 0)),
        cycles_included: cycles.length,
        force_promoted: action === 'force_promote',
      };

      // Merge in existing staging params if available
      if (existsSync(stagingFile)) {
        try {
          const staging = JSON.parse(readFileSync(stagingFile, 'utf-8'));
          newParams = { ...staging, ...newParams };
        } catch { /* use defaults */ }
      }

      writeFileSync(paramsFile, JSON.stringify(newParams, null, 2));

      // Also copy staging → production via rl_control.py if available
      const rlControl = join(ORCHESTRATOR_PATH, 'rl_control.py');
      const venv = join(ORCHESTRATOR_PATH, 'venv/bin/python3');
      if (existsSync(rlControl) && existsSync(venv)) {
        try {
          execSync(`cd ${ORCHESTRATOR_PATH} && ${venv} ${rlControl} promote --version ${newVersion}`, {
            timeout: 30000,
            stdio: 'ignore',
          });
        } catch { /* rl_control promote is best-effort */ }
      }

      const entry = {
        timestamp: new Date().toISOString(),
        action: action === 'force_promote' ? 'force_promoted' : 'promoted',
        reason,
        reviewed_by: reviewedBy,
        from_version: prodVersion,
        to_version: newVersion,
        staging_cycles: cycles.length,
        staging_score: latestScore,
        criteria_passed: allPassed,
      };
      appendPromotionLog(entry);

      return res.status(200).json({
        success: true,
        action: entry.action,
        from_version: prodVersion,
        to_version: newVersion,
        score: latestScore,
        entry,
        message: `✅ Promoted to production v${newVersion} (score: ${latestScore.toFixed(2)})`,
      });
    } catch (e: any) {
      return res.status(500).json({ error: 'Promotion failed', message: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
