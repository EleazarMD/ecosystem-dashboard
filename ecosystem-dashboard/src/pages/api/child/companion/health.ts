/**
 * GET /api/child/companion/health
 *
 * Health check for the kids agent runtime stack:
 * - AI Gateway reachability
 * - PiCode transport mode (in-process vs external CLI)
 * - Context Hub compose path
 * - CORE tool roster gate check
 *
 * Returns 200 if all checks pass, 503 if any critical component is down.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getPiCodeTransport } from '@/domains/learning/shared/transports/picode-transport';
import { getContextHub } from '@/domains/learning/shared/context-hub-service';
import { CORE_TOOL_ROSTER, checkToolGate } from '@/domains/learning/shared/tool-roster';
import { activityRegistry } from '@/domains/learning/shared/activity-types';

interface HealthCheck {
  name: string;
  status: 'ok' | 'degraded' | 'down';
  detail?: string;
}

interface HealthResponse {
  overall: 'ok' | 'degraded' | 'down';
  checks: HealthCheck[];
  runtime: {
    mode: 'in-process' | 'external-cli';
    model: string;
    maxHops: number;
  };
  activities: { id: string; name: string; toolCount: number }[];
  timestamp: string;
}

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:8777';
const CHILD_AI_MODEL = process.env.CHILD_AI_MODEL || 'minimax-m3';
const PICODE_EXTERNAL_CLI = process.env.PICODE_EXTERNAL_CLI === 'true';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthResponse>,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).end();
    return;
  }

  const checks: HealthCheck[] = [];

  // 1. AI Gateway reachability
  let gatewayOk = false;
  let gatewayDetail = '';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const resp = await fetch(`${AI_GATEWAY_URL}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    gatewayOk = resp.ok;
    gatewayDetail = `HTTP ${resp.status}`;
  } catch (err) {
    gatewayDetail = err instanceof Error ? err.message : String(err);
  }
  checks.push({
    name: 'ai-gateway',
    status: gatewayOk ? 'ok' : 'down',
    detail: gatewayDetail || 'unreachable',
  });

  // 2. PiCode transport mode
  const transport = getPiCodeTransport();
  const transportMode = PICODE_EXTERNAL_CLI ? 'external-cli' : 'in-process';
  checks.push({
    name: 'picode-transport',
    status: 'ok',
    detail: `mode=${transportMode}`,
  });

  // 3. Context Hub compose path
  let hubOk = false;
  let hubDetail = '';
  try {
    const hub = getContextHub();
    const frame = hub.getFocusFrame();
    hubOk = true;
    hubDetail = frame ? `focus=${frame.title}` : 'no active focus (ok for cold start)';
  } catch (err) {
    hubDetail = err instanceof Error ? err.message : String(err);
  }
  checks.push({
    name: 'context-hub',
    status: hubOk ? 'ok' : 'down',
    detail: hubDetail,
  });

  // 4. CORE tool roster gate check
  let rosterOk = false;
  let rosterDetail = '';
  try {
    const sampleTool = CORE_TOOL_ROSTER.tools[0];
    const gate = checkToolGate(CORE_TOOL_ROSTER, sampleTool.id);
    rosterOk = gate.allowed;
    rosterDetail = `gate=${gate.allowed ? 'open' : 'closed'} tool=${sampleTool.id}`;
  } catch (err) {
    rosterDetail = err instanceof Error ? err.message : String(err);
  }
  checks.push({
    name: 'tool-roster-gate',
    status: rosterOk ? 'ok' : 'down',
    detail: rosterDetail,
  });

  // 5. Activity registry
  const activities = activityRegistry.all().map((a) => ({
    id: a.id,
    name: a.name,
    toolCount: a.toolRoster?.tools.length ?? 0,
  }));
  checks.push({
    name: 'activity-registry',
    status: activities.length > 0 ? 'ok' : 'degraded',
    detail: `${activities.length} activities registered`,
  });

  const anyDown = checks.some((c) => c.status === 'down');
  const anyDegraded = checks.some((c) => c.status === 'degraded');
  const overall = anyDown ? 'down' : anyDegraded ? 'degraded' : 'ok';

  const response: HealthResponse = {
    overall,
    checks,
    runtime: {
      mode: transportMode,
      model: CHILD_AI_MODEL,
      maxHops: 4,
    },
    activities,
    timestamp: new Date().toISOString(),
  };

  res.status(overall === 'down' ? 503 : 200).json(response);
}
