/**
 * Test endpoint for GooseMind data flow verification
 * 
 * Traces the complete flow:
 * 1. UI → Dashboard API
 * 2. Dashboard API → Recipe Loading
 * 3. Dashboard API → Content Filtering
 * 4. Dashboard API → AI Gateway (port 8777)
 * 5. AI Gateway → AI Inferencing (port 9000) for key management
 * 6. AI Gateway → LLM Provider
 * 7. Response back through the chain
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { getChildServiceContext } from '@/lib/platform/child-service-middleware';
import {
  buildChildGooseMindConfig,
  getActiveRecipeForChild,
} from '@/lib/platform/child-learning-service';

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:8777';
const AI_INFERENCING_URL = process.env.AI_INFERENCING_URL || 'http://localhost:9000';

interface FlowStep {
  step: string;
  status: 'success' | 'error' | 'skipped';
  duration?: number;
  details?: any;
  error?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const flowSteps: FlowStep[] = [];
  const startTime = Date.now();

  // Step 1: Authentication
  let stepStart = Date.now();
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      flowSteps.push({
        step: '1. Authentication',
        status: 'error',
        duration: Date.now() - stepStart,
        error: 'No session found',
      });
      return res.status(401).json({ error: 'Unauthorized', flowSteps });
    }
    flowSteps.push({
      step: '1. Authentication',
      status: 'success',
      duration: Date.now() - stepStart,
      details: { userId: (session.user as any).id, accountType: (session.user as any).accountType },
    });
  } catch (error: any) {
    flowSteps.push({
      step: '1. Authentication',
      status: 'error',
      duration: Date.now() - stepStart,
      error: error.message,
    });
    return res.status(500).json({ error: 'Auth failed', flowSteps });
  }

  // Step 2: Get Child Context
  stepStart = Date.now();
  let context: any;
  try {
    context = await getChildServiceContext(req, res);
    if (!context) {
      flowSteps.push({
        step: '2. Child Context',
        status: 'error',
        duration: Date.now() - stepStart,
        error: 'Failed to get child context',
      });
      return res.status(400).json({ error: 'Context failed', flowSteps });
    }
    flowSteps.push({
      step: '2. Child Context',
      status: 'success',
      duration: Date.now() - stepStart,
      details: {
        userId: context.userId,
        accountType: context.accountType,
        hasParentalControls: !!context.parentalControls,
        remainingMinutes: context.remainingMinutes,
      },
    });
  } catch (error: any) {
    flowSteps.push({
      step: '2. Child Context',
      status: 'error',
      duration: Date.now() - stepStart,
      error: error.message,
    });
    return res.status(500).json({ error: 'Context failed', flowSteps });
  }

  // Step 3: Load Recipe
  stepStart = Date.now();
  let recipe: any = null;
  let config: any = null;
  try {
    recipe = await getActiveRecipeForChild(context.userId);
    if (context.accountType === 'child' && context.parentalControls) {
      config = await buildChildGooseMindConfig(context.userId, context.parentalControls);
    }
    flowSteps.push({
      step: '3. Recipe Loading',
      status: recipe ? 'success' : 'skipped',
      duration: Date.now() - stepStart,
      details: recipe ? {
        recipeId: recipe.id,
        recipeName: recipe.name,
        characterName: recipe.characterName,
        characterEmoji: recipe.characterEmoji,
        hasInstructions: !!recipe.instructions,
        instructionsLength: recipe.instructions?.length || 0,
      } : { message: 'No recipe assigned' },
    });
  } catch (error: any) {
    flowSteps.push({
      step: '3. Recipe Loading',
      status: 'error',
      duration: Date.now() - stepStart,
      error: error.message,
    });
  }

  // Step 4: Check AI Gateway Health
  stepStart = Date.now();
  try {
    const gatewayResponse = await fetch(`${AI_GATEWAY_URL}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    const gatewayHealth = await gatewayResponse.json();
    flowSteps.push({
      step: '4. AI Gateway Health',
      status: gatewayResponse.ok ? 'success' : 'error',
      duration: Date.now() - stepStart,
      details: {
        url: AI_GATEWAY_URL,
        status: gatewayHealth.status,
        version: gatewayHealth.version,
        endpoints: gatewayHealth.endpoints?.slice(0, 3),
      },
    });
  } catch (error: any) {
    flowSteps.push({
      step: '4. AI Gateway Health',
      status: 'error',
      duration: Date.now() - stepStart,
      error: `Cannot connect to AI Gateway at ${AI_GATEWAY_URL}: ${error.message}`,
    });
  }

  // Step 5: Check AI Inferencing Health
  stepStart = Date.now();
  try {
    const inferencingResponse = await fetch(`${AI_INFERENCING_URL}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    const inferencingHealth = await inferencingResponse.json();
    flowSteps.push({
      step: '5. AI Inferencing Health',
      status: inferencingResponse.ok ? 'success' : 'error',
      duration: Date.now() - stepStart,
      details: {
        url: AI_INFERENCING_URL,
        status: inferencingHealth.status,
        version: inferencingHealth.version,
        database: inferencingHealth.database,
      },
    });
  } catch (error: any) {
    flowSteps.push({
      step: '5. AI Inferencing Health',
      status: 'error',
      duration: Date.now() - stepStart,
      error: `Cannot connect to AI Inferencing at ${AI_INFERENCING_URL}: ${error.message}`,
    });
  }

  // Step 6: Test AI Gateway Chat Completion (dry run)
  stepStart = Date.now();
  const testMessage = 'Hello, this is a test message for flow verification.';
  const systemPrompt = config?.systemPrompt || 'You are a helpful assistant.';
  
  try {
    const chatResponse = await fetch(`${AI_GATEWAY_URL}/api/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CHILD_SAFETY_API_KEY || 'child-safety-key'}`,
        'X-Service-Id': 'goosemind-test',
        'X-Client-Id': 'dashboard-flow-test',
      },
      body: JSON.stringify({
        model: process.env.CHILD_AI_MODEL || 'qwen3-8b',
        messages: [
          { role: 'system', content: systemPrompt.substring(0, 500) },
          { role: 'user', content: testMessage },
        ],
        temperature: 0.7,
        max_tokens: 100,
        metadata: {
          user_type: 'child',
          content_filter: 'strict',
          recipe_id: recipe?.id,
          test_flow: true,
        },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (chatResponse.ok) {
      const chatResult = await chatResponse.json();
      flowSteps.push({
        step: '6. AI Gateway Chat Completion',
        status: 'success',
        duration: Date.now() - stepStart,
        details: {
          model: chatResult.model,
          responseLength: chatResult.choices?.[0]?.message?.content?.length || 0,
          responsePreview: chatResult.choices?.[0]?.message?.content?.substring(0, 100),
          usage: chatResult.usage,
          finishReason: chatResult.choices?.[0]?.finish_reason,
        },
      });
    } else {
      const errorText = await chatResponse.text();
      flowSteps.push({
        step: '6. AI Gateway Chat Completion',
        status: 'error',
        duration: Date.now() - stepStart,
        error: `HTTP ${chatResponse.status}: ${errorText.substring(0, 200)}`,
      });
    }
  } catch (error: any) {
    flowSteps.push({
      step: '6. AI Gateway Chat Completion',
      status: 'error',
      duration: Date.now() - stepStart,
      error: error.message,
    });
  }

  // Step 7: Check Telemetry (if available)
  stepStart = Date.now();
  try {
    const telemetryResponse = await fetch(`${AI_INFERENCING_URL}/api/telemetry/summary?hours=1`, {
      headers: {
        'Authorization': `Bearer ${process.env.AI_INFERENCING_API_KEY || 'ai-inferencing-admin-key-2024'}`,
      },
      signal: AbortSignal.timeout(5000),
    });
    if (telemetryResponse.ok) {
      const telemetryData = await telemetryResponse.json();
      flowSteps.push({
        step: '7. Telemetry Check',
        status: 'success',
        duration: Date.now() - stepStart,
        details: {
          recentRequests: telemetryData.totalRequests || 0,
          providers: telemetryData.byProvider || {},
        },
      });
    } else {
      flowSteps.push({
        step: '7. Telemetry Check',
        status: 'skipped',
        duration: Date.now() - stepStart,
        details: { message: 'Telemetry endpoint not available' },
      });
    }
  } catch (error: any) {
    flowSteps.push({
      step: '7. Telemetry Check',
      status: 'skipped',
      duration: Date.now() - stepStart,
      details: { message: 'Telemetry check skipped', error: error.message },
    });
  }

  // Summary
  const totalDuration = Date.now() - startTime;
  const successCount = flowSteps.filter(s => s.status === 'success').length;
  const errorCount = flowSteps.filter(s => s.status === 'error').length;

  return res.status(200).json({
    summary: {
      totalSteps: flowSteps.length,
      successful: successCount,
      errors: errorCount,
      skipped: flowSteps.length - successCount - errorCount,
      totalDuration: `${totalDuration}ms`,
      overallStatus: errorCount === 0 ? 'healthy' : errorCount < 3 ? 'degraded' : 'unhealthy',
    },
    flowSteps,
    config: config ? {
      hasRecipe: !!config.recipe,
      recipeName: config.recipe?.name,
      characterName: config.recipe?.characterName,
      personalizationContext: config.personalizationContext,
    } : null,
  });
}
