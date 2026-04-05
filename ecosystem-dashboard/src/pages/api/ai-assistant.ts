import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:8777';
const KG_ORCHESTRATOR_URL = process.env.KG_ORCHESTRATOR_URL || 'http://localhost:41240';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { message, context = {} } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        console.log(`🤖 AI Assistant request: ${message}`);

        // Try Knowledge Graph Orchestrator first for specialized queries
        let kgResponse = null;
        try {
            const kgResult = await axios.post(`${KG_ORCHESTRATOR_URL}/orchestrate`, {
                query: message,
                context,
                options: { mode: 'comprehensive' }
            }, { timeout: 15000 });

            if (kgResult.data?.success && kgResult.data?.result) {
                kgResponse = kgResult.data.result;
                console.log(`📊 KG Orchestrator response: ${kgResponse.summary}`);
            }
        } catch (kgError) {
            console.warn(`⚠️ KG Orchestrator unavailable:`, kgError.message);
        }

        // Prepare AI Gateway request
        const aiGatewayPayload = {
            model: 'gemini-2.5-flash',
            messages: [
                {
                    role: 'system',
                    content: `You are an AI assistant for the AI Homelab Ecosystem Dashboard. You help users understand and manage their AI infrastructure, services, and data.

${kgResponse ? `
Knowledge Graph Context:
- Query: ${kgResponse.query}
- Summary: ${kgResponse.summary}
- Results: ${JSON.stringify(kgResponse.results, null, 2)}
- Confidence: ${kgResponse.confidence}
- Sources: ${kgResponse.sources?.join(', ') || 'None'}
- Data: ${JSON.stringify(kgResponse.data, null, 2)}

Use this context to provide accurate, data-driven responses.
` : 'No specialized knowledge graph data available for this query.'}

Provide helpful, accurate responses about the AI Homelab ecosystem.`
                },
                {
                    role: 'user',
                    content: message
                }
            ],
            temperature: 0.7,
            max_tokens: 1000
        };

        // Call AI Gateway with fallback between AI Gateway v2 and direct Ollama
        let aiResponse;
        try {
            aiResponse = await axios.post(`${AI_GATEWAY_URL}/api/v1/chat/completions`, aiGatewayPayload, {
                timeout: 30000,
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': 'ai-gateway-api-key-2024'
                }
            });
        } catch (err: any) {
            // Fallback to Ollama-compatible path when 404 (gateway not present)
            if (err?.response?.status === 404) {
                aiResponse = await axios.post(`${AI_GATEWAY_URL}/v1/chat/completions`, aiGatewayPayload, {
                    timeout: 30000,
                    headers: { 'Content-Type': 'application/json' }
                });
            } else {
                throw err;
            }
        }

        // Support both OpenAI-style and Ollama-style response formats
        const openAIContent = aiResponse.data?.choices?.[0]?.message?.content;
        const ollamaContent = aiResponse.data?.message?.content;
        const assistantResponse = openAIContent || ollamaContent;

        if (assistantResponse) {
            
            res.json({
                success: true,
                response: assistantResponse,
                knowledgeGraph: kgResponse ? {
                    summary: kgResponse.summary,
                    confidence: kgResponse.confidence,
                    sources: kgResponse.sources,
                    dataPoints: kgResponse.data?.length || 0
                } : null,
                timestamp: new Date().toISOString()
            });
        } else {
            throw new Error('Invalid AI Gateway response format');
        }

    } catch (error) {
        console.error('❌ AI Assistant error:', error);
        
        let errorMessage = 'AI Assistant is temporarily unavailable';
        let statusCode = 500;

        if (error.code === 'ECONNREFUSED') {
            errorMessage = 'AI services are currently offline. Please check that the AI Gateway and Knowledge Graph services are running.';
            statusCode = 503;
        } else if (error.response?.status === 503) {
            errorMessage = 'Knowledge Graph services are temporarily unavailable. The AI Assistant is running with limited capabilities.';
            statusCode = 503;
        }

        res.status(statusCode).json({
            success: false,
            error: errorMessage,
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
            timestamp: new Date().toISOString()
        });
    }
}
