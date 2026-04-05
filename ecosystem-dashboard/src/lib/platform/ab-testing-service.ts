/**
 * A/B Testing Service for Kids Portal
 * 
 * Provides functions to:
 * - Get active experiments for a user
 * - Assign users to variants
 * - Apply variant configurations to chat requests
 * - Log events for analysis
 */

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export interface UserContext {
  userId: string;
  theme?: string;
  age?: number;
  sessionId?: string;
}

export interface VariantConfig {
  experimentId: string;
  experimentName: string;
  experimentType: string;
  variantId: string;
  variantName: string;
  isControl: boolean;
  config: Record<string, any>;
}

export interface RecipeOverrides {
  temperature?: number;
  max_tokens?: number;
  recipe_id?: string;
  hint_injection_count?: number;
}

/**
 * Get all active experiments applicable to a user
 */
export async function getActiveExperimentsForUser(
  userContext: UserContext
): Promise<VariantConfig[]> {
  try {
    // Get running experiments that match user criteria
    const experimentsResult = await pool.query(`
      SELECT e.*, ua.variant_id, v.name as variant_name, v.config, v.is_control
      FROM ab_testing.experiments e
      LEFT JOIN ab_testing.user_assignments ua 
        ON ua.experiment_id = e.id AND ua.user_id = $1
      LEFT JOIN ab_testing.variants v ON v.id = ua.variant_id
      WHERE e.status = 'running'
        AND e.target_audience IN ('child', 'all')
        AND (e.target_themes = '[]'::jsonb OR e.target_themes @> $2::jsonb OR e.target_themes IS NULL)
        AND (e.target_age_min IS NULL OR e.target_age_min <= $3)
        AND (e.target_age_max IS NULL OR e.target_age_max >= $3)
    `, [
      userContext.userId,
      JSON.stringify([userContext.theme]),
      userContext.age || 10
    ]);

    const variants: VariantConfig[] = [];

    for (const exp of experimentsResult.rows) {
      if (exp.variant_id) {
        // User already assigned
        variants.push({
          experimentId: exp.id,
          experimentName: exp.name,
          experimentType: exp.experiment_type,
          variantId: exp.variant_id,
          variantName: exp.variant_name,
          isControl: exp.is_control,
          config: exp.config || {},
        });
      } else {
        // Need to assign user
        const assignment = await assignUserToExperiment(exp.id, userContext);
        if (assignment) {
          variants.push(assignment);
        }
      }
    }

    return variants;
  } catch (error) {
    console.error('[A/B Testing] Error getting experiments:', error);
    return [];
  }
}

/**
 * Assign a user to an experiment variant
 */
async function assignUserToExperiment(
  experimentId: string,
  userContext: UserContext
): Promise<VariantConfig | null> {
  try {
    // Check traffic percentage
    const expResult = await pool.query(
      'SELECT * FROM ab_testing.experiments WHERE id = $1',
      [experimentId]
    );
    
    if (expResult.rows.length === 0) return null;
    
    const experiment = expResult.rows[0];
    
    // Traffic sampling
    if (experiment.traffic_percentage < 100) {
      const hash = hashString(userContext.userId + experimentId);
      if (hash > experiment.traffic_percentage) {
        return null; // User not in sample
      }
    }

    // Get variants with weights
    const variantsResult = await pool.query(`
      SELECT * FROM ab_testing.variants WHERE experiment_id = $1
    `, [experimentId]);

    if (variantsResult.rows.length === 0) return null;

    const variants = variantsResult.rows;
    const totalWeight = variants.reduce((sum: number, v: any) => sum + v.weight, 0);
    
    // Weighted random selection
    const random = Math.random() * totalWeight;
    let cumulative = 0;
    let selectedVariant = variants[0];
    
    for (const variant of variants) {
      cumulative += variant.weight;
      if (random <= cumulative) {
        selectedVariant = variant;
        break;
      }
    }

    // Create assignment
    await pool.query(`
      INSERT INTO ab_testing.user_assignments (experiment_id, variant_id, user_id, assignment_reason)
      VALUES ($1, $2, $3, 'random')
      ON CONFLICT (experiment_id, user_id) DO NOTHING
    `, [experimentId, selectedVariant.id, userContext.userId]);

    return {
      experimentId: experiment.id,
      experimentName: experiment.name,
      experimentType: experiment.experiment_type,
      variantId: selectedVariant.id,
      variantName: selectedVariant.name,
      isControl: selectedVariant.is_control,
      config: selectedVariant.config || {},
    };
  } catch (error) {
    console.error('[A/B Testing] Error assigning user:', error);
    return null;
  }
}

/**
 * Apply A/B test configurations to recipe parameters
 */
export function applyVariantOverrides(
  variants: VariantConfig[],
  baseParams: { temperature: number; max_tokens: number }
): RecipeOverrides {
  const overrides: RecipeOverrides = {};

  for (const variant of variants) {
    if (variant.experimentType === 'recipe_parameter') {
      if (variant.config.temperature !== undefined) {
        overrides.temperature = variant.config.temperature;
      }
      if (variant.config.max_tokens !== undefined) {
        overrides.max_tokens = variant.config.max_tokens;
      }
    }
    
    if (variant.experimentType === 'hint_injection') {
      if (variant.config.injection_count !== undefined) {
        overrides.hint_injection_count = variant.config.injection_count;
      }
    }
    
    if (variant.experimentType === 'character') {
      if (variant.config.recipe_id) {
        overrides.recipe_id = variant.config.recipe_id;
      }
    }
  }

  return overrides;
}

/**
 * Log an A/B testing event
 */
export async function logABTestEvent(
  userContext: UserContext,
  eventType: 'impression' | 'interaction' | 'conversion' | 'custom',
  eventName: string,
  eventValue?: number,
  metadata?: Record<string, any>,
  conversationId?: string
): Promise<void> {
  try {
    // Get user's experiment assignments
    const assignmentsResult = await pool.query(`
      SELECT ua.experiment_id, ua.variant_id
      FROM ab_testing.user_assignments ua
      JOIN ab_testing.experiments e ON e.id = ua.experiment_id
      WHERE ua.user_id = $1 AND e.status = 'running'
    `, [userContext.userId]);

    // Log event for each active experiment
    for (const assignment of assignmentsResult.rows) {
      await pool.query(`
        INSERT INTO ab_testing.events (
          experiment_id, variant_id, user_id, event_type, event_name,
          event_value, event_metadata, session_id, conversation_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        assignment.experiment_id,
        assignment.variant_id,
        userContext.userId,
        eventType,
        eventName,
        eventValue || null,
        JSON.stringify(metadata || {}),
        userContext.sessionId || null,
        conversationId || null
      ]);
    }
  } catch (error) {
    console.error('[A/B Testing] Error logging event:', error);
  }
}

/**
 * Get experiment results summary
 */
export async function getExperimentResults(experimentId: string): Promise<any> {
  try {
    const result = await pool.query(`
      SELECT 
        v.id as variant_id,
        v.name as variant_name,
        v.is_control,
        COUNT(DISTINCT ua.user_id) as users,
        COUNT(DISTINCT e.id) as events,
        AVG(e.event_value) as avg_value,
        STDDEV(e.event_value) as std_dev
      FROM ab_testing.variants v
      LEFT JOIN ab_testing.user_assignments ua ON ua.variant_id = v.id
      LEFT JOIN ab_testing.events e ON e.variant_id = v.id
      WHERE v.experiment_id = $1
      GROUP BY v.id, v.name, v.is_control
      ORDER BY v.is_control DESC
    `, [experimentId]);

    return result.rows;
  } catch (error) {
    console.error('[A/B Testing] Error getting results:', error);
    return [];
  }
}

/**
 * Simple hash function for consistent bucketing
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash % 100);
}
