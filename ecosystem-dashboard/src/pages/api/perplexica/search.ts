import { NextApiRequest, NextApiResponse } from 'next';

/**
 * Perplexica Search API Proxy
 * Proxies requests to the local Perplexica instance on RTX Workstation
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { query, focusMode, optimizationMode, chatModel, embeddingModel, history } = req.body;

    if (!query) {
        return res.status(400).json({ error: 'Query is required' });
    }

    // Perplexica Endpoint (RTX Workstation)
    // Port 3000 exposes the API via Next.js frontend proxy
    const PERPLEXICA_API_URL = 'http://100.108.41.22:3000/api/search';

    try {
        console.log('🔍 Perplexica Search:', { query, focusMode });

        const response = await fetch(PERPLEXICA_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query,
                focusMode: focusMode || 'webSearch',
                optimizationMode: optimizationMode || 'balanced',
                chatModel: chatModel || {
                    provider: 'openai', // Configured as OpenAI-compatible in Perplexica
                    model: 'qwen/qwen2.5-coder-32b-instruct', // Exact ID from docs
                },
                embeddingModel: embeddingModel || {
                    provider: 'openai', // Configured as OpenAI-compatible in Perplexica
                    model: 'nvidia/nv-embedqa-e5-v5', // Exact ID from docs
                },
                history: history || [],
            }),
        });

        if (!response.ok) {
            throw new Error(`Perplexica responded with ${response.status}: ${response.statusText}`);
        }

        // Perplexica returns a stream or JSON depending on config?
        // Usually it returns a stream of events.
        // For now, let's assume we want to pipe the response or read it all.
        // If it's a stream, we should probably pipe it.
        // But for simplicity in this first pass, let's try to read it as text/json if possible,
        // or just pipe the stream to the client.

        // Check content type
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/event-stream')) {
            // It's a stream! Pipe it.
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            });

            if (response.body) {
                // @ts-ignore - ReadableStream/Node stream mismatch
                const reader = response.body.getReader();
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    res.write(value);
                }
            }
            res.end();
        } else {
            // JSON response
            const data = await response.json();
            res.status(200).json(data);
        }

    } catch (error: any) {
        console.error('❌ Perplexica Proxy Error:', error);
        const isConnectionError = error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed');

        res.status(isConnectionError ? 503 : 500).json({
            error: isConnectionError
                ? 'Cannot connect to Perplexica (RTX Workstation). Please ensure the service is running on port 3001.'
                : error.message
        });
    }
}
