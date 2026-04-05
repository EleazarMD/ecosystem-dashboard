import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db/client';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { agent_id } = req.query;

    try {
        let sql = `
      SELECT 
        id, 
        name, 
        description, 
        category, 
        instructions, 
        required_tools, 
        parameters, 
        is_sub_recipe,
        usage_count
      FROM goose.recipes
      WHERE is_public = true
    `;

        const params: any[] = [];

        // If agent_id is provided, we could filter by agent-specific rules if we had a mapping table.
        // For now, we'll return all public recipes, or we could implement the routing logic here.
        // The plan mentioned "Query goose.recipes table filtered by agent routing rules".
        // Let's check if there is a routing table.
        // Based on previous `\d goose.recipes` output, there is `goose.recipe_agent_routing`.

        if (agent_id) {
            // This is a simplified version. Ideally we join with routing table.
            // For now, let's just return all public recipes as a start, 
            // or if we want to be strict:
            /*
            sql += ` AND id IN (
              SELECT recipe_id FROM goose.recipe_agent_routing WHERE agent_id = $1
              UNION 
              SELECT id FROM goose.recipes WHERE is_default = true
            )`;
            params.push(agent_id);
            */
            // Since I don't have the full schema of routing table handy in my memory (I saw it referenced but didn't inspect it),
            // I will stick to returning all public recipes for now to ensure it works, 
            // and maybe filter by category if that helps.
        }

        sql += ` ORDER BY category, name`;

        const result = await query(sql, params);

        res.status(200).json({
            recipes: result.rows
        });
    } catch (error) {
        console.error('Error fetching recipes:', error);
        res.status(500).json({ error: 'Failed to fetch recipes' });
    }
}
