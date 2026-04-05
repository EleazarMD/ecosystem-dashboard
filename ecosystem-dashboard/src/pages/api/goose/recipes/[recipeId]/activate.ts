import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db/client';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { recipeId } = req.query;
    const { agent_id, session_id } = req.body;

    if (!recipeId || typeof recipeId !== 'string') {
        return res.status(400).json({ error: 'Invalid recipe ID' });
    }

    if (!agent_id || !session_id) {
        return res.status(400).json({ error: 'Missing agent_id or session_id' });
    }

    try {
        // Upsert session with active recipe
        const sql = `
      INSERT INTO goose.agent_sessions (agent_id, session_id, active_recipe_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (session_id) 
      DO UPDATE SET 
        active_recipe_id = $3,
        agent_id = $1, -- Update agent_id just in case
        updated_at = NOW() -- Assuming we might add updated_at later, but for now standard fields
    `;

        // Note: My migration didn't add updated_at, so I'll skip it in the query for now to be safe,
        // or I should have added it. The migration had created_at.
        // Let's stick to the schema I created: id, agent_id, session_id, active_recipe_id, created_at, expires_at, metadata

        const upsertSql = `
      INSERT INTO goose.agent_sessions (agent_id, session_id, active_recipe_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (session_id) 
      DO UPDATE SET active_recipe_id = $3
      RETURNING *
    `;

        const result = await query(upsertSql, [agent_id, session_id, recipeId]);

        // Increment usage count for the recipe
        await query(`UPDATE goose.recipes SET usage_count = usage_count + 1 WHERE id = $1`, [recipeId]);

        res.status(200).json({
            success: true,
            session: result.rows[0]
        });
    } catch (error) {
        console.error('Error activating recipe:', error);
        res.status(500).json({ error: 'Failed to activate recipe' });
    }
}
