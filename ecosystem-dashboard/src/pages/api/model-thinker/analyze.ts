/**
 * Model Thinker Analysis API
 * 
 * Applies Scott Page's many-model thinking framework to questions/decisions.
 * Selects relevant analytical models, applies each lens, and synthesizes
 * a multi-perspective analysis using the Diversity Prediction Theorem.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || 'YGYe_ZY4BobOHRrZ_a1zbTaMrPlwpc9J6JaOgtX9low';
const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:8777';

// ── Model Definitions ──────────────────────────────────────────────

interface ModelClass {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  dimensions: string[];
  purposes: string[];
}

const MODEL_CLASSES: ModelClass[] = [
  { id: 'normal_dist', name: 'Normal Distributions', description: 'Bell curve, central tendency, regression to mean, standard deviations', keywords: ['average', 'typical', 'deviation', 'variance', 'standard', 'expected'], dimensions: ['health', 'financial', 'clinical', 'chronobiology', 'metacognition'], purposes: ['predict', 'explain'] },
  { id: 'power_law', name: 'Power-Law Distributions', description: 'Long tails, extreme events, scale-free networks, 80/20 rule', keywords: ['extreme', 'tail', 'outlier', 'scale', 'inequality', 'rare event', 'black swan'], dimensions: ['financial', 'research', 'infrastructure'], purposes: ['predict', 'explain'] },
  { id: 'linear', name: 'Linear Models', description: 'Proportional relationships, regression, weighted factors', keywords: ['regression', 'factor', 'weight', 'proportion', 'correlation', 'trend'], dimensions: ['financial', 'clinical', 'research'], purposes: ['predict', 'explain'] },
  { id: 'concavity', name: 'Concavity & Convexity', description: 'Diminishing returns, risk diversification, averaging benefits', keywords: ['diminishing', 'returns', 'diversif', 'risk', 'portfolio', 'marginal', 'optimize'], dimensions: ['financial', 'goals', 'health', 'flow', 'attention', 'social_capital', 'habits'], purposes: ['design', 'act'] },
  { id: 'value_power', name: 'Value & Power (Shapley)', description: 'Resource allocation, coalition value, fair division', keywords: ['fair', 'allocat', 'value', 'power', 'coalition', 'contribution', 'share'], dimensions: ['family', 'goals', 'financial'], purposes: ['design', 'act'] },
  { id: 'network', name: 'Network Models', description: 'Connectivity, centrality, clustering, influence, weak ties', keywords: ['network', 'connect', 'central', 'influence', 'relationship', 'cluster', 'tie', 'dunbar', 'contact', 'mentor'], dimensions: ['communication', 'family', 'research', 'social_capital'], purposes: ['explain', 'predict'] },
  { id: 'contagion', name: 'Diffusion & Contagion', description: 'Information spread, adoption cascades, epidemics, viral dynamics', keywords: ['spread', 'viral', 'adopt', 'cascade', 'epidemic', 'diffus', 'contagion'], dimensions: ['clinical', 'communication', 'research'], purposes: ['predict', 'explain'] },
  { id: 'entropy', name: 'Entropy', description: 'Uncertainty measurement, information content, surprise, disorder', keywords: ['uncertain', 'information', 'entropy', 'surprise', 'disorder', 'predict'], dimensions: ['communication', 'financial', 'infrastructure', 'metacognition', 'attention', 'decision_fatigue'], purposes: ['predict', 'explore'] },
  { id: 'random_walk', name: 'Random Walks', description: 'Stochastic processes, market movement, unpredictable paths', keywords: ['random', 'stock', 'market', 'unpredictable', 'stochastic', 'walk', 'drift'], dimensions: ['financial', 'research', 'health'], purposes: ['predict', 'explore'] },
  { id: 'path_dependence', name: 'Path Dependence', description: 'Lock-in, increasing returns, history constrains choices, QWERTY', keywords: ['lock-in', 'path', 'history', 'irreversible', 'commit', 'switch', 'legacy', 'habit', 'stuck', 'routine'], dimensions: ['goals', 'infrastructure', 'research', 'habits', 'meaning', 'flow'], purposes: ['explain', 'act'] },
  { id: 'local_interaction', name: 'Local Interaction Models', description: 'Neighbor effects, segregation, peer influence, spatial patterns', keywords: ['neighbor', 'peer', 'local', 'segregat', 'community', 'nearby', 'spatial'], dimensions: ['family', 'clinical', 'communication'], purposes: ['explain', 'predict'] },
  { id: 'lyapunov', name: 'Lyapunov Functions', description: 'System stability, equilibrium convergence, energy dissipation', keywords: ['stab', 'equilibri', 'converge', 'sustain', 'balance', 'steady', 'recovery', 'restore'], dimensions: ['infrastructure', 'health', 'goals', 'decision_fatigue', 'chronobiology', 'attention'], purposes: ['predict', 'explain'] },
  { id: 'markov', name: 'Markov Models', description: 'State transitions, steady states, memoryless prediction', keywords: ['state', 'transition', 'phase', 'stage', 'progress', 'step', 'sequence', 'sleep', 'habit', 'cycle'], dimensions: ['health', 'financial', 'communication', 'chronobiology', 'habits', 'flow', 'attention'], purposes: ['predict', 'explain'] },
  { id: 'systems_dynamics', name: 'Systems Dynamics', description: 'Stocks, flows, feedback loops, delays, accumulation', keywords: ['feedback', 'loop', 'flow', 'accumulate', 'delay', 'stock', 'system', 'compound', 'burnout', 'energy', 'fatigue'], dimensions: ['health', 'infrastructure', 'financial', 'decision_fatigue', 'flow', 'chronobiology', 'meaning'], purposes: ['explain', 'design'] },
  { id: 'threshold', name: 'Threshold Models', description: 'Tipping points, critical mass, cascade triggers, phase transitions', keywords: ['tip', 'threshold', 'critical', 'cascade', 'trigger', 'mass', 'breakpoint', 'collapse', 'exhaust', 'overload'], dimensions: ['communication', 'clinical', 'family', 'decision_fatigue', 'attention', 'flow', 'habits', 'meaning'], purposes: ['predict', 'act'] },
  { id: 'spatial_hedonic', name: 'Spatial & Hedonic Choice', description: 'Location value, attribute pricing, preference mapping', keywords: ['location', 'attribute', 'price', 'prefer', 'hedonic', 'feature', 'property', 'house'], dimensions: ['financial', 'family', 'goals'], purposes: ['predict', 'design'] },
  { id: 'game_theory', name: 'Game Theory', description: 'Strategic interaction, Nash equilibrium, dominant strategies, payoffs', keywords: ['strategic', 'game', 'compete', 'negotiat', 'incentive', 'payoff', 'opponent'], dimensions: ['financial', 'communication', 'goals'], purposes: ['act', 'design'] },
  { id: 'cooperation', name: 'Cooperation Models', description: 'Repeated games, reciprocity, reputation, trust building', keywords: ['cooperat', 'trust', 'reciproc', 'reputat', 'repeat', 'relationship', 'collaborat'], dimensions: ['family', 'communication', 'clinical', 'social_capital'], purposes: ['act', 'design'] },
  { id: 'collective_action', name: 'Collective Action', description: 'Free rider problems, common pool resources, provision of public goods', keywords: ['free rider', 'collective', 'common', 'public', 'shared', 'contribut', 'team'], dimensions: ['family', 'goals', 'infrastructure'], purposes: ['design', 'act'] },
  { id: 'mechanism_design', name: 'Mechanism Design', description: 'Incentive engineering, auction design, truth revelation, rule design', keywords: ['incentive', 'mechanism', 'design', 'rule', 'auction', 'system', 'structure', 'policy', 'habit', 'nudge', 'default'], dimensions: ['goals', 'financial', 'family', 'decision_fatigue', 'habits', 'flow', 'meaning'], purposes: ['design', 'act'] },
  { id: 'signaling', name: 'Signaling Models', description: 'Credible communication, costly signals, screening, education as signal', keywords: ['signal', 'credib', 'credential', 'certif', 'demonstrat', 'prove', 'screen'], dimensions: ['communication', 'clinical', 'goals', 'social_capital', 'metacognition', 'meaning'], purposes: ['explain', 'act'] },
  { id: 'learning', name: 'Learning Models', description: 'Reinforcement learning, Bayesian updating, social learning, adaptation', keywords: ['learn', 'adapt', 'update', 'improv', 'train', 'experience', 'bayesian', 'habit', 'practice', 'skill'], dimensions: ['all'], purposes: ['explain', 'predict'] },
  { id: 'multi_armed_bandit', name: 'Multi-Armed Bandit', description: 'Explore vs exploit tradeoff, regret minimization, Thompson sampling', keywords: ['explore', 'exploit', 'try', 'experiment', 'option', 'alternative', 'choice', 'tradeoff'], dimensions: ['research', 'financial', 'goals', 'habits', 'meaning', 'decision_fatigue'], purposes: ['act', 'design'] },
  { id: 'rugged_landscape', name: 'Rugged Landscapes', description: 'Local optima, NK fitness, search strategies, innovation', keywords: ['optim', 'landscape', 'local', 'global', 'search', 'innovat', 'stuck', 'plateau'], dimensions: ['goals', 'research', 'infrastructure'], purposes: ['explore', 'act'] },
  { id: 'many_model', name: 'Many-Model Synthesis', description: 'Diversity prediction theorem, Condorcet jury, ensemble wisdom', keywords: ['ensemble', 'divers', 'synthesi', 'multiple', 'aggregate', 'wisdom', 'crowd'], dimensions: ['all'], purposes: ['predict', 'explore'] },
];

// ── Model Selection Logic ──────────────────────────────────────────

function selectModels(
  question: string,
  dimension?: string,
  purpose?: string,
  maxModels: number = 5
): ModelClass[] {
  const q = question.toLowerCase();
  const scored: { model: ModelClass; score: number }[] = [];

  for (const model of MODEL_CLASSES) {
    let score = 0;

    // Keyword matching
    for (const kw of model.keywords) {
      if (q.includes(kw)) score += 3;
    }

    // Dimension match
    if (dimension) {
      if (model.dimensions.includes(dimension) || model.dimensions.includes('all')) {
        score += 2;
      }
    }

    // Purpose match
    if (purpose) {
      if (model.purposes.includes(purpose)) {
        score += 1;
      }
    }

    if (score > 0) {
      scored.push({ model, score });
    }
  }

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Take top N, but ensure at least 3 if available
  const selected = scored.slice(0, maxModels).map(s => s.model);

  // If too few matched, add dimension-relevant defaults
  if (selected.length < 3 && dimension) {
    for (const model of MODEL_CLASSES) {
      if (selected.length >= 3) break;
      if (!selected.find(s => s.id === model.id) &&
          (model.dimensions.includes(dimension) || model.dimensions.includes('all'))) {
        selected.push(model);
      }
    }
  }

  // Always include many_model synthesis if 3+ models selected
  if (selected.length >= 3 && !selected.find(s => s.id === 'many_model')) {
    const manyModel = MODEL_CLASSES.find(m => m.id === 'many_model');
    if (manyModel) selected.push(manyModel);
  }

  return selected;
}

// ── Dimension Detection ────────────────────────────────────────────

function detectDimension(question: string): string {
  const q = question.toLowerCase();
  const dimKeywords: Record<string, string[]> = {
    clinical: ['patient', 'clinical', 'medical', 'treatment', 'diagnosis', 'symptom', 'drug', 'disease'],
    communication: ['email', 'reply', 'message', 'respond', 'write', 'draft', 'tone', 'communicate'],
    family: ['family', 'kids', 'child', 'school', 'sofia', 'luca', 'arik', 'spouse', 'schedule'],
    research: ['research', 'paper', 'study', 'literature', 'pubmed', 'journal', 'experiment', 'hypothesis'],
    health: ['sleep', 'exercise', 'health', 'stress', 'cognitive', 'wellness', 'diet', 'weight'],
    financial: ['invest', 'stock', 'portfolio', 'money', 'budget', 'expense', 'tax', 'market', 'property'],
    goals: ['goal', 'milestone', 'career', 'skill', 'plan', 'progress', 'objective', 'target'],
    infrastructure: ['server', 'docker', 'deploy', 'service', 'system', 'capacity', 'incident', 'backup'],
    metacognition: ['bias', 'overconfident', 'calibrat', 'thinking about thinking', 'dunning', 'self-aware', 'judgment'],
    decision_fatigue: ['fatigue', 'exhausted', 'too many choices', 'decision', 'willpower', 'depleted', 'overwhelm'],
    flow: ['flow', 'deep work', 'focus', 'immersed', 'distract', 'interrupt', 'concentration', 'zone'],
    attention: ['attention', 'cognitive load', 'overload', 'chunk', 'working memory', 'multitask', 'information'],
    chronobiology: ['circadian', 'chronotype', 'ultradian', 'morning', 'evening', 'energy', 'rhythm', 'peak'],
    social_capital: ['network', 'weak tie', 'dunbar', 'relationship', 'reciproc', 'connection', 'mentor', 'contact'],
    meaning: ['meaning', 'purpose', 'motivation', 'autonomy', 'competence', 'relatedness', 'burnout', 'fulfillment'],
    habits: ['habit', 'routine', 'streak', 'cue', 'reward', 'trigger', 'anchor', 'automatic', 'behavior'],
  };

  let bestDim = 'goals';
  let bestScore = 0;
  for (const [dim, kws] of Object.entries(dimKeywords)) {
    const score = kws.filter(kw => q.includes(kw)).length;
    if (score > bestScore) { bestScore = score; bestDim = dim; }
  }
  return bestDim;
}

function detectPurpose(question: string): string {
  const q = question.toLowerCase();
  if (q.includes('should i') || q.includes('what should') || q.includes('recommend')) return 'act';
  if (q.includes('predict') || q.includes('forecast') || q.includes('will') || q.includes('expect')) return 'predict';
  if (q.includes('why') || q.includes('how come') || q.includes('cause')) return 'explain';
  if (q.includes('design') || q.includes('create') || q.includes('build') || q.includes('structure')) return 'design';
  if (q.includes('what if') || q.includes('hypothetical') || q.includes('possible')) return 'explore';
  return 'act';
}

// ── LLM Analysis ───────────────────────────────────────────────────

async function generateMultiModelAnalysis(
  question: string,
  models: ModelClass[],
  dimension: string,
  purpose: string
): Promise<any> {
  const modelDescriptions = models
    .map((m, i) => `${i + 1}. **${m.name}**: ${m.description}`)
    .join('\n');

  const systemPrompt = `You are the Model Thinker Engine, powered by Scott Page's many-model thinking framework.

Your task: Apply MULTIPLE analytical models to a question, then synthesize using the Diversity Prediction Theorem.

## Rules
- Apply each model independently as an analytical lens
- Be specific and concrete — use numbers and examples where possible
- After all model perspectives, identify where they CONVERGE and DIVERGE
- Provide a confidence level and clear recommendation
- Be concise: 1-3 sentences per model perspective
- Write for a physician/MBA/data scientist who values precision and brevity

## Output JSON Format
{
  "models_applied": [
    { "model": "Model Name", "perspective": "Concrete analysis", "conclusion": "one_word" }
  ],
  "synthesis": {
    "convergence": "Where models agree",
    "divergence": "Where models disagree and why",
    "confidence": "high|medium|low",
    "recommendation": "Specific actionable recommendation"
  }
}`;

  const userPrompt = `Question: ${question}
Life Dimension: ${dimension}
Purpose: ${purpose}

Apply these ${models.length} analytical models:
${modelDescriptions}

Return ONLY valid JSON matching the format specified.`;

  try {
    const response = await fetch(`${AI_GATEWAY_URL}/api/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${INTERNAL_SERVICE_KEY}`,
      },
      body: JSON.stringify({
        model: 'openai/MiniMax-M2.5',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (err) {
    return null;
  }
}

// ── Handler ────────────────────────────────────────────────────────

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Auth check
  const apiKey = req.headers['x-internal-service-key'];
  if (apiKey !== INTERNAL_SERVICE_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    // Return available models and metadata
    return res.status(200).json({
      models: MODEL_CLASSES.map(m => ({
        id: m.id,
        name: m.name,
        description: m.description,
        dimensions: m.dimensions,
        purposes: m.purposes,
      })),
      dimensions: [
        'clinical', 'communication', 'family', 'research', 'health', 'financial', 'goals', 'infrastructure',
        'metacognition', 'decision_fatigue', 'flow', 'attention', 'chronobiology', 'social_capital', 'meaning', 'habits',
      ],
      purposes: ['reason', 'explain', 'design', 'communicate', 'act', 'predict', 'explore'],
      total_models: MODEL_CLASSES.length,
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { question, dimension: reqDimension, purpose: reqPurpose, depth = 'standard', max_models = 5 } = req.body;

  if (!question) {
    return res.status(400).json({ error: 'question is required' });
  }

  // Auto-detect or use provided values
  const dimension = reqDimension || detectDimension(question);
  const purpose = reqPurpose || detectPurpose(question);

  // Select relevant models
  const maxM = depth === 'quick' ? 3 : depth === 'deep' ? 7 : max_models;
  const selectedModels = selectModels(question, dimension, purpose, maxM);

  // Generate LLM-powered multi-model analysis
  const llmAnalysis = await generateMultiModelAnalysis(question, selectedModels, dimension, purpose);

  // Build response
  const response: any = {
    question,
    dimension,
    purpose,
    depth,
    models_selected: selectedModels.map(m => ({ id: m.id, name: m.name, description: m.description })),
    model_count: selectedModels.length,
  };

  if (llmAnalysis) {
    response.analysis = llmAnalysis;
  } else {
    // Fallback: return model selection without LLM synthesis
    response.analysis = {
      models_applied: selectedModels.map(m => ({
        model: m.name,
        perspective: `Apply ${m.name}: ${m.description}`,
        conclusion: 'pending_llm',
      })),
      synthesis: {
        convergence: 'LLM synthesis unavailable — review model perspectives manually',
        divergence: 'N/A',
        confidence: 'low',
        recommendation: 'Review each model perspective and synthesize manually',
      },
    };
  }

  return res.status(200).json(response);
}
