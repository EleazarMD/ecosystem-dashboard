/**
 * Child Chat API — Compatibility Shim
 *
 * PI Code Convergence (§8.2): This endpoint now delegates to the unified
 * agent-turn handler which runs the PiCodeTransport cognitive loop.
 *
 * The old request shape ({ serviceId, recipeId, spanishMode, creativeMode,
 * conversationHistory }) is mapped into the agent-turn request shape
 * ({ message, activityId, intent, contextState }) and forwarded.
 *
 * Frontend callers should migrate to /api/child/companion/agent-turn directly.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import agentTurnHandler from './companion/agent-turn';
import { KNOWN_ACTIVITY_IDS } from '@/domains/learning/shared/activity-registry';

/** Map old serviceId/recipeId to a known activityId. */
function resolveActivityId(serviceId?: string, recipeId?: string): string {
  const id = (serviceId || recipeId || '').toLowerCase();
  if (id.includes('learn')) return KNOWN_ACTIVITY_IDS.LEARN_HUB;
  if (id.includes('art')) return KNOWN_ACTIVITY_IDS.ART_STUDIO;
  if (id.includes('journal') || id.includes('write')) return KNOWN_ACTIVITY_IDS.JOURNAL;
  if (id.includes('book')) return KNOWN_ACTIVITY_IDS.BOOKS;
  if (id.includes('plan')) return KNOWN_ACTIVITY_IDS.PLANNER;
  if (id.includes('workspace') || id.includes('build')) return KNOWN_ACTIVITY_IDS.WORKSPACE;
  return KNOWN_ACTIVITY_IDS.FREE_CHAT;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    message,
    serviceId,
    recipeId,
    spanishMode,
    creativeMode,
    conversationHistory,
    conversationId,
    storyContinuation,
  } = req.body || {};

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Map old request shape → agent-turn request shape
  const activityId = resolveActivityId(serviceId, recipeId);

  const contextState: Record<string, unknown> = {};
  if (spanishMode) contextState.spanishMode = spanishMode;
  if (creativeMode) contextState.creativeMode = creativeMode;
  if (conversationHistory) contextState.conversationHistory = conversationHistory;
  if (conversationId) contextState.conversationId = conversationId;
  if (recipeId) contextState.recipeId = recipeId;
  if (serviceId) contextState.serviceId = serviceId;
  if (storyContinuation) contextState.storyContinuation = true;

  // Mutate req.body for the agent-turn handler
  req.body = {
    message,
    activityId,
    intent: 'talk',
    contextState,
  };

  return agentTurnHandler(req, res);
}
