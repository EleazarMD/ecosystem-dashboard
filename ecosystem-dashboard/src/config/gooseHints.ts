/**
 * Goose Hints Configuration
 * Provides UI metadata for Goose recipes (not system prompts - those are in YAML recipes)
 */

export interface GooseHint {
  id: string;
  name: string;
  description: string;
  trigger: 'manual' | 'automatic';
  systemPrompt: string; // Empty for recipe-driven workflows
  parameters?: Record<string, any>;
}

export const DEEP_RESEARCH_HINT: GooseHint = {
  id: 'deep-research-planner',
  name: 'Deep Research Planning Agent',
  description: 'Three-phase workflow: Clarification → Strategic Planning → Execution with Perplexity sonar-reasoning',
  trigger: 'manual', // Activated when user clicks Deep Research button
  // systemPrompt is defined in the YAML recipe file:
  // ~/.config/goose/recipes/perplexity-deep-research.yaml
  systemPrompt: '', // Recipe-driven workflow
  parameters: {
    recipePath: '~/.config/goose/recipes/perplexity-deep-research.yaml',
    agencyMode: 'manual', // Requires user approval before execution
    enablePlanning: true,
    maxTurns: 5, // Limit clarification phase
  },
};

export const CODE_ASSISTANCE_HINT: GooseHint = {
  id: 'code-assistant',
  name: 'Code Assistant',
  description: 'Helps with code-related tasks using workspace context',
  trigger: 'automatic',
  systemPrompt: '', // Recipe-driven
};

export const GOOSE_HINTS: Record<string, GooseHint> = {
  'deep-research': DEEP_RESEARCH_HINT,
  'code-assistance': CODE_ASSISTANCE_HINT,
};

/**
 * Get Goose hint by ID
 */
export function getHintById(id: string): GooseHint | undefined {
  return GOOSE_HINTS[id];
}

/**
 * Get hints matching context
 */
export function getHintsForContext(context: {
  hasDeepResearch?: boolean;
  hasCodeContext?: boolean;
}): GooseHint[] {
  const hints: GooseHint[] = [];
  
  if (context.hasDeepResearch) {
    hints.push(DEEP_RESEARCH_HINT);
  }
  
  if (context.hasCodeContext) {
    hints.push(CODE_ASSISTANCE_HINT);
  }
  
  return hints;
}
