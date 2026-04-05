/**
 * Child Recipe Management API
 * 
 * Endpoints for managing recipe assignments for children.
 * Parents can assign/unassign recipes, children can view their assigned recipes.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import {
  getChildRecipes,
  getRecipeAssignments,
  assignRecipeToChild,
  getActiveRecipeForChild,
} from '@/lib/platform/child-learning-service';
import { DEFAULT_CHARACTERS } from '@/lib/platform/child-learning-types';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = session.user as any;

  // GET: Fetch recipes
  if (req.method === 'GET') {
    try {
      const { childId, type } = req.query;

      // Get available child recipes
      if (type === 'available') {
        const category = req.query.category as string;
        
        // For child-education category, return character personas from DEFAULT_CHARACTERS
        if (category === 'child-education') {
          // Get child's preferred theme if logged in as child
          let theme: string | undefined;
          if (user.accountType === 'child') {
            const userResult = await pool.query(
              'SELECT preferred_theme FROM users WHERE id = $1',
              [user.id]
            );
            theme = userResult.rows[0]?.preferred_theme;
          }
          
          // Convert DEFAULT_CHARACTERS to recipe format
          const characterRecipes = Object.values(DEFAULT_CHARACTERS)
            .filter(char => {
              // Filter by theme if specified
              if (theme === 'child-minecraft' || theme === 'minecraft') {
                return ['steve', 'alex', 'creeper', 'enderman', 'villager', 'irongolem', 'redstone'].includes(char.id);
              }
              if (theme === 'child-pusheen' || theme === 'pusheen') {
                return ['pusheen', 'stormy', 'pip', 'sloth', 'bo', 'cheek'].includes(char.id);
              }
              return true; // Return all if no theme
            })
            .map(char => ({
              id: char.id,
              name: char.name,
              description: char.personality,
              category: 'child-education',
              characterName: char.name,
              characterEmoji: char.emoji,
              characterPersonality: char.personality,
              iconPath: char.iconPath,
            }));
          
          return res.status(200).json({ recipes: characterRecipes });
        }
        
        // For other categories, use database recipes
        const includeSeasonal = req.query.includeSeasonal === 'true';
        const childAge = req.query.age ? parseInt(req.query.age as string) : undefined;

        let theme: string | undefined;
        if (user.accountType === 'child') {
          const userResult = await pool.query(
            'SELECT preferred_theme FROM users WHERE id = $1',
            [user.id]
          );
          theme = userResult.rows[0]?.preferred_theme;
        }

        const recipes = await getChildRecipes({
          category,
          includeSeasonal,
          childAge,
          theme,
        });

        return res.status(200).json({ recipes });
      }

      // Get assigned recipes for a child
      if (type === 'assigned' && childId) {
        const assignments = await getRecipeAssignments(childId as string);
        return res.status(200).json({ assignments });
      }

      // Get active recipe for a child
      if (type === 'active' && childId) {
        const recipeType = req.query.recipeType as string;
        const recipe = await getActiveRecipeForChild(childId as string, recipeType);
        return res.status(200).json({ recipe });
      }

      // Default: return available recipes
      const recipes = await getChildRecipes({ includeSeasonal: true });
      return res.status(200).json({ recipes });

    } catch (error) {
      console.error('[Child Recipes API] Error:', error);
      return res.status(500).json({ error: 'Failed to fetch recipes' });
    }
  }

  // POST: Assign recipe to child
  if (req.method === 'POST') {
    try {
      const { childId, recipeId, isDefault, priority, validFrom, validUntil, reason } = req.body;

      if (!childId || !recipeId) {
        return res.status(400).json({ error: 'childId and recipeId are required' });
      }

      // Verify user is parent of this child
      const parentCheck = await pool.query(`
        SELECT id FROM users 
        WHERE id = $1 AND parent_user_id = $2
      `, [childId, user.id]);

      if (parentCheck.rows.length === 0 && user.role !== 'admin') {
        return res.status(403).json({ error: 'Not authorized to manage this child' });
      }

      const assignment = await assignRecipeToChild(childId, recipeId, user.id, {
        isDefault,
        priority,
        validFrom,
        validUntil,
        reason,
      });

      return res.status(201).json({ assignment });

    } catch (error) {
      console.error('[Child Recipes API] Error:', error);
      return res.status(500).json({ error: 'Failed to assign recipe' });
    }
  }

  // DELETE: Remove recipe assignment
  if (req.method === 'DELETE') {
    try {
      const { childId, recipeId } = req.query;

      if (!childId || !recipeId) {
        return res.status(400).json({ error: 'childId and recipeId are required' });
      }

      // Verify user is parent of this child
      const parentCheck = await pool.query(`
        SELECT id FROM users 
        WHERE id = $1 AND parent_user_id = $2
      `, [childId, user.id]);

      if (parentCheck.rows.length === 0 && user.role !== 'admin') {
        return res.status(403).json({ error: 'Not authorized to manage this child' });
      }

      await pool.query(`
        UPDATE child_learning.recipe_assignments
        SET is_active = false, updated_at = NOW()
        WHERE child_user_id = $1 AND recipe_id = $2
      `, [childId, recipeId]);

      return res.status(200).json({ success: true });

    } catch (error) {
      console.error('[Child Recipes API] Error:', error);
      return res.status(500).json({ error: 'Failed to remove recipe assignment' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
