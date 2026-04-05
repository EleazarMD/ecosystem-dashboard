/**
 * Debug endpoint for GooseMind recipe loading
 * 
 * Returns the current recipe configuration for a child user
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { getChildServiceContext } from '@/lib/platform/child-service-middleware';
import {
  buildChildGooseMindConfig,
  getActiveRecipeForChild,
  getRecipeAssignments,
  getTopInterests,
} from '@/lib/platform/child-learning-service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = session.user as any;

  try {
    // Get child context
    const context = await getChildServiceContext(req, res);
    if (!context) return;

    // Get active recipe
    const activeRecipe = await getActiveRecipeForChild(context.userId);
    
    // Get all assignments
    const assignments = await getRecipeAssignments(context.userId);
    
    // Get interests
    const interests = await getTopInterests(context.userId, 5);

    // Build full config if child account
    let fullConfig: Awaited<ReturnType<typeof buildChildGooseMindConfig>> | null = null;
    if (context.accountType === 'child' && context.parentalControls) {
      fullConfig = await buildChildGooseMindConfig(
        context.userId,
        context.parentalControls
      );
    }

    return res.status(200).json({
      userId: context.userId,
      accountType: context.accountType,
      activeRecipe: activeRecipe ? {
        id: activeRecipe.id,
        name: activeRecipe.name,
        characterName: activeRecipe.characterName,
        characterEmoji: activeRecipe.characterEmoji,
        characterPersonality: activeRecipe.characterPersonality,
        instructionsPreview: activeRecipe.instructions?.substring(0, 500),
        educationalFocus: activeRecipe.educationalFocus,
      } : null,
      assignments: assignments.map(a => ({
        recipeId: a.recipeId,
        recipeName: a.recipe?.name,
        isActive: a.isActive,
        isDefault: a.isDefault,
        timesUsed: a.timesUsed,
      })),
      interests,
      fullConfig: fullConfig ? {
        hasRecipe: !!fullConfig.recipe,
        recipeName: fullConfig.recipe?.name,
        characterName: fullConfig.recipe?.characterName,
        systemPromptPreview: fullConfig.systemPrompt?.substring(0, 300),
        safetyPromptPreview: fullConfig.safetyPrompt?.substring(0, 200),
        personalizationContext: fullConfig.personalizationContext,
      } : null,
    });
  } catch (error) {
    console.error('[GooseMind Debug] Error:', error);
    return res.status(500).json({ 
      error: 'Failed to load debug info',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
