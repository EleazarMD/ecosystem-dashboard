/**
 * Agent Registry API — runtime configuration of agent-to-task bindings.
 *
 * GET    /api/learn/lessons/agents              → list all providers + bindings
 * POST   /api/learn/lessons/agents?action=rebind    → rebind a negotiable task to a different agent
 * POST   /api/learn/lessons/agents?action=update_model → update a provider's gateway model ID
 * POST   /api/learn/lessons/agents?action=enable     → enable a provider
 * POST   /api/learn/lessons/agents?action=disable    → disable a provider
 * POST   /api/learn/lessons/agents?action=register   → register a custom agent
 * GET    /api/learn/lessons/agents?action=config     → full config snapshot
 * POST   /api/learn/lessons/agents?action=load_config → load config from snapshot
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { agentRegistry, type ModelProviderConfig, type TaskBinding } from '@/lib/kids-pic/AgentRegistry';
import type { AgentId, TaskType } from '@/lib/kids-pic/LessonLifecycleService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method, query, body } = req;
  const action = (query.action as string) || (method === 'GET' ? 'list' : '');

  try {
    // ── GET: list providers and bindings ───────────────────────────────────

    if (method === 'GET' || action === 'list') {
      const snapshot = agentRegistry.getConfigSnapshot();
      return res.status(200).json({
        providers: snapshot.providers.map((p) => ({
          agentId: p.agentId,
          label: p.label,
          gatewayModel: p.gatewayModel,
          isChildSafe: p.isChildSafe,
          specializations: p.specializations,
          costTier: p.costTier,
          enabled: p.enabled,
        })),
        bindings: snapshot.bindings,
        customAgents: snapshot.customAgents,
        negotiableTasks: agentRegistry.listNegotiableBindings(),
        lockedTasks: agentRegistry.listLockedBindings(),
      });
    }

    if (method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // ── POST actions ───────────────────────────────────────────────────────

    if (action === 'rebind') {
      if (!body.taskType) return res.status(400).json({ error: 'taskType is required' });
      if (!body.agentId) return res.status(400).json({ error: 'agentId is required' });

      const result = agentRegistry.rebindTask(
        body.taskType as TaskType,
        body.agentId as AgentId
      );

      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }

      return res.status(200).json({
        success: true,
        message: result.message,
        binding: agentRegistry.getBinding(body.taskType as TaskType),
      });
    }

    if (action === 'update_model') {
      if (!body.agentId) return res.status(400).json({ error: 'agentId is required' });
      if (!body.gatewayModel) return res.status(400).json({ error: 'gatewayModel is required' });

      agentRegistry.updateProviderModel(body.agentId as AgentId, body.gatewayModel);

      return res.status(200).json({
        success: true,
        message: `Updated ${body.agentId} to use model ${body.gatewayModel}`,
        provider: agentRegistry.getProvider(body.agentId as AgentId),
      });
    }

    if (action === 'enable') {
      if (!body.agentId) return res.status(400).json({ error: 'agentId is required' });
      agentRegistry.enableProvider(body.agentId as AgentId);
      return res.status(200).json({
        success: true,
        message: `Enabled ${body.agentId}`,
        provider: agentRegistry.getProvider(body.agentId as AgentId),
      });
    }

    if (action === 'disable') {
      if (!body.agentId) return res.status(400).json({ error: 'agentId is required' });
      agentRegistry.disableProvider(body.agentId as AgentId);
      return res.status(200).json({
        success: true,
        message: `Disabled ${body.agentId}`,
        provider: agentRegistry.getProvider(body.agentId as AgentId),
      });
    }

    if (action === 'register') {
      if (!body.agentId) return res.status(400).json({ error: 'agentId is required' });
      if (!body.gatewayModel) return res.status(400).json({ error: 'gatewayModel is required' });

      const config: ModelProviderConfig = {
        agentId: body.agentId as AgentId,
        label: body.label || body.agentId,
        gatewayModel: body.gatewayModel,
        endpoint: body.endpoint || `${process.env.AI_GATEWAY_URL || 'http://localhost:8777'}/api/v1/chat/completions`,
        isChildSafe: body.isChildSafe || false,
        specializations: body.specializations || [],
        costTier: body.costTier || 3,
        enabled: true,
      };

      agentRegistry.registerCustomAgent(config);

      return res.status(200).json({
        success: true,
        message: `Registered custom agent ${body.agentId}`,
        provider: config,
      });
    }

    if (action === 'config') {
      return res.status(200).json(agentRegistry.getConfigSnapshot());
    }

    if (action === 'load_config') {
      if (!body.config) return res.status(400).json({ error: 'config is required' });
      agentRegistry.loadConfigSnapshot(body.config);
      return res.status(200).json({
        success: true,
        message: 'Configuration loaded',
        config: agentRegistry.getConfigSnapshot(),
      });
    }

    return res.status(400).json({
      error: 'Unknown action. Use rebind, update_model, enable, disable, register, config, or load_config.',
    });
  } catch (error: any) {
    console.error('[agent-registry-api]', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
