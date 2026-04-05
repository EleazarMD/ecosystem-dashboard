import type { NextApiRequest, NextApiResponse } from 'next';
import { databaseService } from '@/lib/workspace/database-service';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const { pageId } = req.query;

    if (!pageId || typeof pageId !== 'string') {
        return res.status(400).json({ error: 'Invalid page ID' });
    }

    if (req.method === 'GET') {
        try {
            const values = await databaseService.getPagePropertyValues(pageId);
            return res.status(200).json({ values });
        } catch (error) {
            console.error('Error fetching property values:', error);
            return res.status(500).json({ error: 'Failed to fetch property values' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
