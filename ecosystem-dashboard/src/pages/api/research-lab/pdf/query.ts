/**
 * PDF RAG Query API Endpoint
 * 1. Semantic search across saved PDF documents using vector embeddings
 * 2. Feed retrieved chunks + conversation history to LLM for synthesized answer
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getPDFAnalysisService } from '../../../../lib/research/pdf-analysis-service';

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:8777';
const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY || process.env.NEXT_PUBLIC_AI_GATEWAY_API_KEY || 'ai-gateway-api-key-2024';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      query,
      workspace_id,
      limit = 8,
      conversation_history,
      synthesize = true,
    } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const workspaceIdInput = workspace_id || 'research-studio';
    // Map workspace name to UUID - 'research-studio' -> AI Homelab Workspace UUID
    const workspaceId = workspaceIdInput === 'research-studio' || workspaceIdInput === 'default'
      ? '3c8a382d-01f8-4699-9bea-d3c5082cfbbe'
      : workspaceIdInput;

    console.log(`[PDF RAG] Query: "${query.substring(0, 100)}" in workspace ${workspaceId}`);

    // Step 1: Vector search for relevant chunks
    const pdfService = getPDFAnalysisService();
    const chunks = await pdfService.queryDocuments(workspaceId, query, limit);

    console.log(`[PDF RAG] Retrieved ${chunks.length} chunks (distances: ${chunks.map(c => c.distance.toFixed(3)).join(', ')})`);

    // If no chunks found or synthesis not requested, return raw results
    if (chunks.length === 0) {
      return res.status(200).json({
        success: true,
        answer: 'No relevant document content found for your query. Try uploading a PDF first.',
        chunks: [],
        total: 0,
      });
    }

    if (!synthesize) {
      return res.status(200).json({
        success: true,
        chunks,
        total: chunks.length,
      });
    }

    // Step 2: Build context from retrieved chunks
    const contextParts = chunks.map((chunk, i) => {
      const source = chunk.fileName ? `[${chunk.fileName}, p.${chunk.pageNumber}]` : `[p.${chunk.pageNumber}]`;
      return `--- Chunk ${i + 1} ${source} (relevance: ${(1 - chunk.distance).toFixed(2)}) ---\n${chunk.chunkText}`;
    });
    const ragContext = contextParts.join('\n\n');

    // Step 3: Build messages for LLM
    const systemPrompt = `You are an AI research assistant with access to document content retrieved via semantic search. Answer the user's question based on the retrieved document chunks below. Be thorough, cite specific page numbers when relevant, and note if the retrieved context doesn't fully answer the question.

RETRIEVED DOCUMENT CONTEXT:
${ragContext}

INSTRUCTIONS:
- Base your answer primarily on the retrieved document content above
- Cite page numbers in brackets like [p.3] when referencing specific information
- If the context doesn't contain enough information, say so clearly
- Synthesize information across multiple chunks when relevant`;

    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    // Include recent conversation history for multi-turn context
    if (conversation_history && Array.isArray(conversation_history)) {
      const recent = conversation_history.slice(-6);
      for (const msg of recent) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({ role: msg.role, content: msg.content.substring(0, 2000) });
        }
      }
    }

    messages.push({ role: 'user', content: query });

    // Step 4: Send to Qwen3 via AI Gateway
    console.log(`[PDF RAG] Sending ${messages.length} messages to Qwen3 with ${ragContext.length} chars of context`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    const llmResponse = await fetch(`${AI_GATEWAY_URL}/api/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_GATEWAY_API_KEY}`,
        'X-Source': 'pdf-rag-query',
      },
      body: JSON.stringify({
        model: 'qwen3-32b',
        messages,
        max_tokens: 4096,
        temperature: 0.7,
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!llmResponse.ok) {
      const errorText = await llmResponse.text();
      console.error('[PDF RAG] LLM error:', llmResponse.status, errorText);
      return res.status(llmResponse.status).json({
        error: `LLM error: ${llmResponse.status}`,
        detail: errorText,
        // Fall back to raw chunks
        chunks,
        total: chunks.length,
      });
    }

    const llmData = await llmResponse.json();
    const answer = llmData.choices?.[0]?.message?.content || 'No answer generated.';

    console.log(`[PDF RAG] Answer generated: ${answer.length} chars`);

    return res.status(200).json({
      success: true,
      answer,
      chunks: chunks.map(c => ({
        text: c.chunkText.substring(0, 200) + '...',
        fileName: c.fileName,
        pageNumber: c.pageNumber,
        relevance: parseFloat((1 - c.distance).toFixed(3)),
      })),
      total: chunks.length,
      usage: llmData.usage || {},
      model: 'qwen3-32b',
    });

  } catch (error: any) {
    console.error('[PDF RAG] Error:', error);

    const isTimeout = error.name === 'AbortError';
    const isConnection = error.message?.includes('ECONNREFUSED') || error.message?.includes('fetch failed');

    return res.status(isTimeout ? 504 : isConnection ? 503 : 500).json({
      error: isTimeout
        ? 'Request timed out — LLM took too long to respond'
        : isConnection
        ? 'Cannot connect to AI Gateway. Is it running?'
        : `PDF RAG query failed: ${error.message}`,
    });
  }
}
