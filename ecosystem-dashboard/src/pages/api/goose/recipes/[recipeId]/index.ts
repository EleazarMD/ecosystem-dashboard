import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db/client';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { recipeId } = req.query;

    if (!recipeId || typeof recipeId !== 'string') {
        return res.status(400).json({ error: 'Invalid recipe ID' });
    }

    try {
        const sql = `
      SELECT *
      FROM goose.recipes
      WHERE id = $1
    `;

        const result = await query(sql, [recipeId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Recipe not found' });
        }

        res.status(200).json({
            recipe: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching recipe details:', error);
        res.status(500).json({ error: 'Failed to fetch recipe details' });
    }
}
