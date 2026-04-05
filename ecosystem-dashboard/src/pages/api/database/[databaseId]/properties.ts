import type { NextApiRequest, NextApiResponse } from 'next';
import { databaseService } from '@/lib/workspace/database-service';
import { PropertyType } from '@/types/workspace';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const { databaseId } = req.query;

    if (!databaseId || typeof databaseId !== 'string') {
        return res.status(400).json({ error: 'Invalid database ID' });
    }

    if (req.method === 'POST') {
        try {
            const { name, type, config } = req.body;

            if (!name || !type) {
                return res.status(400).json({ error: 'Missing name or type' });
            }

            // Validate type
            const validTypes: PropertyType[] = ['text', 'number', 'select', 'multi_select', 'date', 'person', 'checkbox', 'url', 'email', 'phone', 'formula', 'relation', 'rollup', 'created_time', 'created_by', 'last_edited_time', 'last_edited_by'];
            if (!validTypes.includes(type as PropertyType)) {
                return res.status(400).json({ error: `Invalid property type: ${type}` });
            }

            const property = await databaseService.addProperty(
                databaseId,
                name,
                type as PropertyType,
                config || {}
            );

            return res.status(200).json(property);
        } catch (error) {
            console.error('Error adding property:', error);
            return res.status(500).json({ error: 'Failed to add property' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
