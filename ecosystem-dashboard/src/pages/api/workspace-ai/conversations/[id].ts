import type { NextApiRequest, NextApiResponse } from 'next';
import { conversationStore } from '@/lib/workspace-ai/conversation-store';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Invalid conversation ID' });
    }

    if (req.method === 'GET') {
        const conversation = conversationStore.getById(id);
        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }
        return res.status(200).json({ conversation });
    }

    if (req.method === 'PATCH') {
        try {
            const updates = req.body;
            const conversation = conversationStore.update(id, updates);
            if (!conversation) {
                return res.status(404).json({ error: 'Conversation not found' });
            }
            return res.status(200).json({ conversation });
        } catch (error) {
            console.error('Error updating conversation:', error);
            return res.status(500).json({ error: 'Failed to update conversation' });
        }
    }

    if (req.method === 'DELETE') {
        try {
            const deleted = conversationStore.delete(id);
            if (!deleted) {
                return res.status(404).json({ error: 'Conversation not found' });
            }
            return res.status(200).json({ success: true });
        } catch (error) {
            console.error('Error deleting conversation:', error);
            return res.status(500).json({ error: 'Failed to delete conversation' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
