import type { NextApiRequest, NextApiResponse } from 'next';
import { readFileSync, existsSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const GOOSE_AGENT_PATH = '/home/eleazar/goose-medical-agent';
const ORCHESTRATOR_PATH = '/home/eleazar/clinical-agentic-orchestrator';
const TRAINING_RESULTS_DIR = join(ORCHESTRATOR_PATH, 'training_results');

interface RLStagingStatus {
  production_version: number;
  staging_version: number;
  is_identical: boolean;
  diff_count: number;
  diffs: any[];
  staging_ui_url: string;
  production_ui_url: string;
}

interface RLPhaseEntry {
  timestamp: string;
  phase_id: string;
  action: string;
  before_version: number;
  after_version: number;
  score: number;
  improvement?: number;
  promotion_gate?: any;
  promotion_blocked?: boolean;
}

interface RLSummary {
  total_phases: number;
  avg_score: number;
  best_score: number;
  worst_score: number;
  latest_version: number;
  latest_score: number;
  latest_action: string;
  promoted_phases?: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { endpoint } = req.query;

  try {
    switch (endpoint) {
      case 'status':
        return handleStatus(res);
      
      case 'history':
        return handleHistory(res);
      
      case 'phases':
        return handlePhases(res);
      
      case 'summary':
        return handleSummary(res);

      case 'promotion-gate':
        return handlePromotionGate(req, res);
      
      default:
        return res.status(400).json({ error: 'Invalid endpoint' });
    }
  } catch (error: any) {
    console.error('RL Monitoring API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

function handleStatus(res: NextApiResponse) {
  const paramsFile = join(GOOSE_AGENT_PATH, 'dashboard_rl_params.json');
  const stagingFile = join(GOOSE_AGENT_PATH, 'dashboard_rl_params_staging.json');
  
  let prodVersion = 0;
  let stagingVersion = 0;
  
  if (existsSync(paramsFile)) {
    const params = JSON.parse(readFileSync(paramsFile, 'utf-8'));
    prodVersion = params.version || 0;
  }
  
  if (existsSync(stagingFile)) {
    const params = JSON.parse(readFileSync(stagingFile, 'utf-8'));
    stagingVersion = params.version || 0;
  }
  
  const status: RLStagingStatus = {
    production_version: prodVersion,
    staging_version: stagingVersion,
    is_identical: prodVersion === stagingVersion,
    diff_count: Math.abs(prodVersion - stagingVersion),
    diffs: [],
    staging_ui_url: 'http://localhost:3021',
    production_ui_url: 'http://localhost:3020'
  };
  
  return res.status(200).json(status);
}

function loadV2Cycles(): any[] {
  if (!existsSync(TRAINING_RESULTS_DIR)) return [];
  
  // Load both v2 and v3 cycle files
  const files = readdirSync(TRAINING_RESULTS_DIR)
    .filter(f => (f.startsWith('v2_cycle_') || f.startsWith('v3_cycle_')) && f.endsWith('.json'))
    .sort((a, b) => {
      // Sort by version prefix (v2 before v3), then cycle number, then timestamp
      const verA = a.startsWith('v3_') ? 1 : 0;
      const verB = b.startsWith('v3_') ? 1 : 0;
      if (verA !== verB) return verA - verB;
      const numA = parseInt(a.match(/v[23]_cycle_(\d+)/)?.[1] || '0');
      const numB = parseInt(b.match(/v[23]_cycle_(\d+)/)?.[1] || '0');
      if (numA !== numB) return numA - numB;
      return a.localeCompare(b);
    });
  
  // Deduplicate: keep last file per (version, cycle_number)
  const cycleFileMap = new Map<string, string>();
  for (const file of files) {
    const ver = file.startsWith('v3_') ? 'v3' : 'v2';
    const cycleMatch = file.match(/v[23]_cycle_(\d+)/);
    const num = cycleMatch ? parseInt(cycleMatch[1]) : -1;
    if (num >= 0) {
      cycleFileMap.set(`${ver}_${num}`, file);
    }
  }

  const dedupedFiles = Array.from(cycleFileMap.entries())
    .sort((a, b) => {
      // Sort v2 before v3, then by cycle number
      const [aVer, aNum] = a[0].split('_').slice(0, 2);
      const [bVer, bNum] = b[0].split('_').slice(0, 2);
      if (aVer !== bVer) return aVer.localeCompare(bVer);
      return parseInt(aNum) - parseInt(bNum);
    })
    .map(([_, file]) => file);

  const cycles: any[] = [];
  for (const file of dedupedFiles) {
    try {
      const data = JSON.parse(readFileSync(join(TRAINING_RESULTS_DIR, file), 'utf-8'));
      const cycleMatch = file.match(/v[23]_cycle_(\d+)/);
      data.cycle_number = cycleMatch ? parseInt(cycleMatch[1]) : cycles.length;
      data._version = file.startsWith('v3_') ? 'v3' : 'v2';
      cycles.push(data);
    } catch {
      // Skip unreadable files
    }
  }
  return cycles;
}

function handleHistory(res: NextApiResponse) {
  const cycles = loadV2Cycles();
  
  const history = cycles.map((cycle, i) => ({
    timestamp: cycle.timestamp || '',
    action: 'approved',
    from_version: i,
    to_version: i + 1,
    reason: `Cycle ${cycle.cycle_number}: score ${(cycle.overall_score || 0).toFixed(2)} (content: ${(cycle.content_accuracy || 0).toFixed(1)}, visual: ${(cycle.visual_quality || 0).toFixed(1)})`
  }));
  
  return res.status(200).json(history.slice(-50));
}

function handlePhases(res: NextApiResponse) {
  const cycles = loadV2Cycles();
  
  const phases: any[] = cycles.map((cycle, i) => ({
    timestamp: cycle.timestamp || '',
    phase_id: `${cycle._version || 'v2'}_cycle_${cycle.cycle_number || i}`,
    action: cycle.action?.name || 'RL_TRAINING_CYCLE',
    action_category: cycle.action?.category || '',
    action_success: cycle.action?.success ?? true,
    action_message: cycle.action?.message || '',
    domain: cycle.domain || '',
    queries: cycle.queries || [],
    batch_size: cycle.batch_size || cycle.queries_evaluated || 0,
    before_version: i,
    after_version: i + 1,
    score: cycle.overall_score || 0,
    content_accuracy: cycle.content_accuracy || 0,
    visual_quality: cycle.visual_quality || 0,
    improvement: i > 0 ? (cycle.overall_score || 0) - (cycles[i - 1]?.overall_score || 0) : 0,
    promotion_gate: {
      passed: (cycle.overall_score || 0) >= 7.0,
      actual: {
        explicit_contract_coverage: (cycle.content_accuracy || 0) / 10,
        field_completeness: (cycle.visual_quality || 0) / 10,
      }
    },
    promotion_blocked: (cycle.overall_score || 0) < 7.0,
    version: cycle._version || 'v2',
  }));
  
  return res.status(200).json({
    total_phases: phases.length,
    phases: phases.slice(-100)
  });
}

function handlePromotionGate(req: NextApiRequest, res: NextApiResponse) {
  // POST = approve/reject, GET = get gate status
  const cycles = loadV2Cycles();
  const promotionLogFile = join(ORCHESTRATOR_PATH, 'promotion_log.json');

  // Load promotion log
  let promotionLog: any[] = [];
  if (existsSync(promotionLogFile)) {
    try {
      promotionLog = JSON.parse(readFileSync(promotionLogFile, 'utf-8'));
    } catch { promotionLog = []; }
  }

  if (req.method === 'POST') {
    // Handle approve/reject
    // Body comes as query params for GET-style or we parse body
    let body: any = {};
    try {
      if (typeof req.body === 'string') body = JSON.parse(req.body);
      else body = req.body || {};
    } catch { body = {}; }

    const action = body.action; // 'approve' or 'reject'
    const reason = body.reason || '';
    const entry = {
      timestamp: new Date().toISOString(),
      action,
      reason,
      staging_version: cycles.length,
      staging_score: cycles.length > 0 ? cycles[cycles.length - 1]?.overall_score || 0 : 0,
    };
    promotionLog.push(entry);
    try {
      writeFileSync(promotionLogFile, JSON.stringify(promotionLog, null, 2));
    } catch (e: any) {
      return res.status(500).json({ error: 'Failed to write promotion log', message: e.message });
    }
    return res.status(200).json({ success: true, entry });
  }

  // GET: compute promotion gate status
  if (cycles.length === 0) {
    return res.status(200).json({
      ready: false,
      reason: 'No training cycles completed',
      staging: { version: 0, score: 0, cycles: 0 },
      production: { version: 0, score: 0 },
      criteria: [],
      history: [],
    });
  }

  // Production baseline from params file
  const paramsFile = join(GOOSE_AGENT_PATH, 'dashboard_rl_params.json');
  let prodVersion = 0;
  let prodScore = 0;
  if (existsSync(paramsFile)) {
    try {
      const params = JSON.parse(readFileSync(paramsFile, 'utf-8'));
      prodVersion = params.version || 0;
      prodScore = params.best_score || params.score || 0;
    } catch { /* ignore */ }
  }

  // Staging stats from recent cycles
  const recentN = Math.min(5, cycles.length);
  const recentCycles = cycles.slice(-recentN);
  const recentScores = recentCycles.map(c => c.overall_score || 0);
  const avgRecent = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
  const bestRecent = Math.max(...recentScores);
  const latestScore = cycles[cycles.length - 1]?.overall_score || 0;
  const allScores = cycles.map(c => c.overall_score || 0).filter(s => s > 0);
  const successRate = cycles.filter(c => (c.overall_score || 0) >= 7.0).length / cycles.length;

  // Promotion criteria
  const criteria = [
    {
      name: 'Minimum Score',
      threshold: 7.0,
      actual: latestScore,
      passed: latestScore >= 7.0,
      description: 'Latest cycle score ≥ 7.0',
    },
    {
      name: 'Average Recent Score',
      threshold: 6.5,
      actual: avgRecent,
      passed: avgRecent >= 6.5,
      description: `Average of last ${recentN} cycles ≥ 6.5`,
    },
    {
      name: 'Success Rate',
      threshold: 0.4,
      actual: successRate,
      passed: successRate >= 0.4,
      description: 'At least 40% of cycles pass promotion gate (≥7.0)',
    },
    {
      name: 'Minimum Cycles',
      threshold: 10,
      actual: cycles.length,
      passed: cycles.length >= 10,
      description: 'At least 10 training cycles completed',
    },
    {
      name: 'No Regression',
      threshold: prodScore > 0 ? prodScore * 0.95 : 0,
      actual: latestScore,
      passed: prodScore === 0 || latestScore >= prodScore * 0.95,
      description: 'Latest score within 5% of production baseline',
    },
  ];

  const allPassed = criteria.every(c => c.passed);

  return res.status(200).json({
    ready: allPassed,
    reason: allPassed
      ? 'All promotion criteria met — ready to promote'
      : `${criteria.filter(c => !c.passed).length} criteria not met`,
    staging: {
      version: cycles.length,
      score: latestScore,
      avg_score: avgRecent,
      best_score: bestRecent,
      cycles: cycles.length,
      success_rate: successRate,
    },
    production: {
      version: prodVersion,
      score: prodScore,
    },
    criteria,
    history: promotionLog.slice(-10).reverse(),
  });
}

function handleSummary(res: NextApiResponse) {
  const cycles = loadV2Cycles();
  
  if (cycles.length === 0) {
    return res.status(200).json({
      total_phases: 0,
      avg_score: 0,
      best_score: 0,
      worst_score: 0,
      latest_version: 0,
      latest_score: 0,
      latest_action: 'none',
    });
  }
  
  const scores = cycles.map(c => c.overall_score || 0).filter(s => s > 0);
  const promotedPhases = cycles.filter(c => (c.overall_score || 0) >= 7.0).length;
  
  const summary: RLSummary = {
    total_phases: cycles.length,
    avg_score: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
    best_score: scores.length > 0 ? Math.max(...scores) : 0,
    worst_score: scores.length > 0 ? Math.min(...scores) : 0,
    latest_version: cycles.length,
    latest_score: cycles[cycles.length - 1]?.overall_score || 0,
    latest_action: `v2_cycle_${cycles[cycles.length - 1]?.cycle_number || 0}`,
    promoted_phases: promotedPhases
  };
  
  return res.status(200).json(summary);
}
