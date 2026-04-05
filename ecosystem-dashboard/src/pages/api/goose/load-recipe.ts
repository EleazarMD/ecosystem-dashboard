import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import * as yaml from 'js-yaml';
import os from 'os';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { recipeName } = req.body;
    
    if (!recipeName) {
      return res.status(400).json({ error: 'Recipe name required' });
    }

    // Load recipe from Goose config
    const recipePath = path.join(os.homedir(), '.config', 'goose', 'recipes', `${recipeName}.yaml`);
    
    console.log('[load-recipe] Looking for recipe at:', recipePath);
    
    if (!fs.existsSync(recipePath)) {
      console.error('[load-recipe] Recipe file not found:', recipePath);
      return res.status(404).json({ 
        error: `Recipe not found: ${recipeName}`,
        path: recipePath,
      });
    }

    const recipeContent = fs.readFileSync(recipePath, 'utf-8');
    console.log('[load-recipe] Recipe file read successfully, parsing YAML...');
    
    const recipe = yaml.load(recipeContent) as any;
    
    if (!recipe) {
      console.error('[load-recipe] Recipe parsed but is empty');
      return res.status(500).json({ error: 'Recipe file is empty or invalid' });
    }

    console.log('[load-recipe] Recipe loaded successfully:', recipe.title);

    // Return recipe metadata
    res.status(200).json({
      success: true,
      recipeName,
      title: recipe.title,
      description: recipe.description,
      instructions: recipe.instructions,
    });
  } catch (error: any) {
    console.error('[load-recipe] Error:', error);
    console.error('[load-recipe] Error stack:', error.stack);
    res.status(500).json({ 
      error: error.message || 'Failed to load recipe',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}
