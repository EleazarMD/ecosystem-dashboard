import type { NextApiRequest, NextApiResponse } from 'next';
import { conversationStore } from '@/lib/workspace-ai/conversation-store';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method === 'GET') {
        try {
            const conversations = conversationStore.getAll();
            return res.status(200).json({ conversations });
        } catch (error) {
            console.error('Error fetching conversations:', error);
            return res.status(500).json({ error: 'Failed to fetch conversations' });
        }
    }

    if (req.method === 'POST') {
        try {
            const { title, config } = req.body;
            const conversation = conversationStore.create(title || 'New Conversation', config);
            return res.status(201).json({ conversation });
        } catch (error) {
            console.error('Error creating conversation:', error);
            return res.status(500).json({ error: 'Failed to create conversation' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
