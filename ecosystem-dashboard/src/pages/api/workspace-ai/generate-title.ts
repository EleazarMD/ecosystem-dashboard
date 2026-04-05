import type { NextApiRequest, NextApiResponse } from 'next';
import { conversationStore } from '@/lib/workspace-ai/conversation-store';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { conversation_id, first_message } = req.body;

        if (!conversation_id) {
            return res.status(400).json({ error: 'conversation_id is required' });
        }

        // Get the conversation
        const conversation = conversationStore.getById(conversation_id);
        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        // Generate a simple title from the first message
        let title = 'New Conversation';

        if (first_message) {
            // Take first 50 chars of the message as title
            title = first_message.length > 50
                ? first_message.substring(0, 50) + '...'
                : first_message;
        } else if (conversation.messages.length > 0) {
            // Use first user message
            const firstUserMsg = conversation.messages.find(m => m.role === 'user');
            if (firstUserMsg) {
                title = firstUserMsg.content.length > 50
                    ? firstUserMsg.content.substring(0, 50) + '...'
                    : firstUserMsg.content;
            }
        }

        // Update the conversation title
        conversationStore.update(conversation_id, { title });

        return res.status(200).json({ title });
    } catch (error) {
        console.error('Error generating title:', error);
        return res.status(500).json({ error: 'Failed to generate title' });
    }
}
