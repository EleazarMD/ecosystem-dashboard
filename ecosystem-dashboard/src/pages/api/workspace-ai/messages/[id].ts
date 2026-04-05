import type { NextApiRequest, NextApiResponse } from 'next';
import { conversationStore } from '@/lib/workspace-ai/conversation-store';

const GOOSE_API_URL = process.env.GOOSE_API_URL || 'http://localhost:9001';
// Using the IP found in agent-search.ts
const PERPLEXICA_API_URL = 'http://100.108.41.22:3000/api/agent-pipeline';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Invalid conversation ID' });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { content, role, mode, model, web_search_enabled } = req.body;

        if (!content || !role) {
            return res.status(400).json({ error: 'Content and role are required' });
        }

        // 1. Save User Message
        const userMessage = conversationStore.addMessage(id, {
            role: 'user',
            content,
            metadata: { mode, model }
        });

        // 2. Determine Action based on Mode
        const isSearchMode = mode === 'search' || web_search_enabled;

        if (isSearchMode) {
            // --- PERPLEXICA SEARCH FLOW ---
            console.log('[API] 🔍 Initiating Perplexica Search for:', content);

            try {
                // Call Perplexica search endpoint
                const searchRes = await fetch('http://100.108.41.22:3000/api/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query: content,
                        focusMode: 'webSearch',
                        optimizationMode: 'balanced',
                        chatModel: {
                            provider: 'openai',
                            model: 'mistralai/Mistral-7B-Instruct-v0.3',
                        },
                        embeddingModel: {
                            provider: 'transformers',
                            model: 'xenova/gte-small',
                        },
                        history: [],
                    }),
                });

                if (!searchRes.ok) {
                    throw new Error(`Perplexica search failed: ${searchRes.statusText}`);
                }

                // Check if it's a streaming response
                const contentType = searchRes.headers.get('content-type');
                let searchAnswer = '';
                let searchSources = [];

                if (contentType && contentType.includes('text/event-stream')) {
                    // Handle streaming response
                    console.log('[API] Perplexica returned streaming response');
                    const reader = searchRes.body?.getReader();
                    const decoder = new TextDecoder();

                    if (reader) {
                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) break;

                            const chunk = decoder.decode(value);
                            const lines = chunk.split('\n');

                            for (const line of lines) {
                                if (line.startsWith('data: ')) {
                                    try {
                                        const data = JSON.parse(line.slice(6));
                                        if (data.type === 'response') {
                                            searchAnswer += data.data;
                                        } else if (data.type === 'sources') {
                                            searchSources = data.data;
                                        }
                                    } catch (e) {
                                        // Ignore parse errors
                                    }
                                }
                            }
                        }
                    }
                } else {
                    // Handle JSON response
                    const data = await searchRes.json();
                    searchAnswer = data.message || data.answer || 'Search completed';
                    searchSources = data.sources || [];
                }

                console.log('[API] Search completed:', { answerLength: searchAnswer.length, sourcesCount: searchSources.length });

                // Save Assistant Message with search results
                const assistantMessage = conversationStore.addMessage(id, {
                    role: 'assistant',
                    content: searchAnswer || 'Search completed. Please check the sources below.',
                    metadata: {
                        type: 'search_result',
                        sources: searchSources,
                        model: 'perplexica'
                    }
                });

                return res.status(200).json({
                    message: userMessage,
                    response: assistantMessage
                });

            } catch (error: any) {
                console.error('[API] Search failed:', error);
                const errorMessage = conversationStore.addMessage(id, {
                    role: 'assistant',
                    content: `Search failed: ${error.message}`,
                    metadata: { error: true }
                });
                return res.status(500).json({ error: error.message, message: userMessage, response: errorMessage });
            }

        } else {
            // --- GOOSE CHAT FLOW ---
            console.log('[API] 🦆 Calling Goose Chat for:', content);

            try {
                // Get conversation history
                const conversation = conversationStore.getById(id);
                const history = conversation?.messages.map(m => ({
                    role: m.role,
                    content: m.content
                })) || [];

                const response = await fetch(`${GOOSE_API_URL}/api/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: content,
                        conversationHistory: history,
                        model: model || 'gpt-4o', // Default model
                    }),
                });

                if (!response.ok) {
                    throw new Error(`Goose API error: ${response.statusText}`);
                }

                const data = await response.json();
                const assistantContent = data.response || 'No response from AI';

                // Save Assistant Message
                const assistantMessage = conversationStore.addMessage(id, {
                    role: 'assistant',
                    content: assistantContent,
                    metadata: {
                        model: data.model,
                        tools_used: data.tools_used
                    }
                });

                return res.status(200).json({
                    message: userMessage,
                    response: assistantMessage
                });

            } catch (error: any) {
                console.error('[API] Chat failed:', error);
                const errorMessage = conversationStore.addMessage(id, {
                    role: 'assistant',
                    content: `I encountered an error: ${error.message}`,
                    metadata: { error: true }
                });
                return res.status(500).json({ error: error.message, message: userMessage, response: errorMessage });
            }
        }

    } catch (error: any) {
        console.error('[API] Message handler error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
