import type { NextApiRequest, NextApiResponse } from 'next';
import { databaseService } from '@/lib/workspace/database-service';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const { pageId, propertyId } = req.query;
    const { value } = req.body;

    if (!pageId || typeof pageId !== 'string' || !propertyId || typeof propertyId !== 'string') {
        return res.status(400).json({ error: 'Invalid parameters' });
    }

    if (req.method === 'PUT') {
        try {
            await databaseService.updatePropertyValue(pageId, propertyId, value);
            return res.status(200).json({ success: true });
        } catch (error) {
            console.error('Error updating property value:', error);
            return res.status(500).json({ error: 'Failed to update property value' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
