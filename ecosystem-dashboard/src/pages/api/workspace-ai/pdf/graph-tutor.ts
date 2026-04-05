/**
 * Graph Tutor API - AI-Generated Educational Content
 * Uses Qwen3 to generate learning materials for graph nodes
 */

import type { NextApiRequest, NextApiResponse } from 'next';

const LLM_ENDPOINT = 'http://localhost:8777/api/v1/chat/completions';
const LLM_MODEL = 'qwen3-14b';
const API_KEY = process.env.AI_GATEWAY_API_KEY || 'ai-gateway-api-key-2024';

// In-memory cache for tutor content (simple Map-based cache)
const tutorCache = new Map<string, { content: any; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour TTL

interface TutorRequest {
  node: {
    id: string;
    name: string;
    type: string;
    description?: string;
    metadata?: Record<string, any>;
  };
  connectedNodes?: Array<{
    name: string;
    type: string;
    relationLabel?: string;
  }>;
  documentContext?: string;
  workspaceId?: string;
  documentId?: string;
}

interface TutorResponse {
  explanation: string;
  keyPoints: string[];
  examples: string[];
  studyQuestions: string[];
  relatedTopics: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedReadTime: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { node, connectedNodes, documentContext, workspaceId, documentId } = req.body as TutorRequest;

  if (!node || !node.name) {
    return res.status(400).json({ error: 'Node information required' });
  }

  // Generate cache key from node properties
  const connectedNodeNames = connectedNodes?.map(n => n.name) || [];
  const cacheKey = `${node.id}-${node.name}-${node.type}-${documentId || ''}-${connectedNodeNames.sort().join(',')}`;

  // Check in-memory cache first
  const cached = tutorCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    console.log('[Graph Tutor] Cache HIT for:', node.name);
    return res.status(200).json({
      success: true,
      node: node.name,
      content: cached.content,
      source: 'cached',
      cacheHit: true,
    });
  }

  try {
    console.log('[Graph Tutor] Generating NEW educational content for:', node.name);

    // Build context for the LLM
    const connectionsContext = connectedNodes?.length 
      ? `\n\nRelated concepts in this document:\n${connectedNodes.slice(0, 8).map(n => `- ${n.name} (${n.type}): ${n.relationLabel || 'related'}`).join('\n')}`
      : '';

    const systemPrompt = `You are an expert AI tutor helping students understand concepts from technical documents. 
Your role is to explain concepts clearly, provide practical examples, and help learners build deep understanding.
Be concise but thorough. Use analogies when helpful. Focus on practical understanding.`;

    const userPrompt = `I'm studying a document and clicked on a node in the knowledge graph. Please help me understand this ${node.type}:

**${node.name}**
${node.description ? `\nDescription from document: ${node.description}` : ''}
${connectionsContext}

Please provide:
1. **Clear Explanation** (2-3 paragraphs): What is this concept and why does it matter?
2. **Key Points** (3-5 bullet points): The most important things to remember
3. **Practical Examples** (2-3): Real-world applications or code examples
4. **Study Questions** (2-3): Questions to test understanding
5. **Related Topics**: What should I learn next to deepen my understanding?

Format your response as JSON with these fields:
{
  "explanation": "...",
  "keyPoints": ["...", "..."],
  "examples": ["...", "..."],
  "studyQuestions": ["...", "..."],
  "relatedTopics": ["...", "..."],
  "difficulty": "beginner|intermediate|advanced",
  "estimatedReadTime": "X min"
}`;

    console.log('[Graph Tutor] Calling LLM:', { endpoint: LLM_ENDPOINT, model: LLM_MODEL });
    
    const response = await fetch(LLM_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'X-Source': 'graph-tutor',
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 2000,
        temperature: 0.7,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Graph Tutor] LLM error:', response.status, errorText);
      
      // Return fallback content if LLM fails
      return res.status(200).json(generateFallbackContent(node, connectedNodes));
    }

    const result = await response.json();
    let content = result.choices?.[0]?.message?.content || '';
    
    // Remove Qwen3 thinking tags if present
    content = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    
    console.log('[Graph Tutor] LLM response length:', content.length);

    // Try to parse JSON from response
    let tutorContent: TutorResponse;
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        tutorContent = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('[Graph Tutor] Failed to parse LLM response:', parseError);
      console.error('[Graph Tutor] Raw content:', content.slice(0, 500));
      tutorContent = generateFallbackContent(node, connectedNodes);
    }

    console.log('[Graph Tutor] Generated content for:', node.name);

    // Store in in-memory cache
    tutorCache.set(cacheKey, { content: tutorContent, timestamp: Date.now() });
    
    // Clean old cache entries (keep last 100)
    if (tutorCache.size > 100) {
      const oldestKey = tutorCache.keys().next().value;
      if (oldestKey) tutorCache.delete(oldestKey);
    }
    
    return res.status(200).json({
      success: true,
      node: node.name,
      content: tutorContent,
      source: 'ai-generated'
    });

  } catch (error: any) {
    console.error('[Graph Tutor] Error:', error.message);
    
    // Return fallback content on any error
    return res.status(200).json({
      success: true,
      node: node.name,
      content: generateFallbackContent(node, connectedNodes),
      source: 'fallback'
    });
  }
}

function generateFallbackContent(node: any, connectedNodes?: any[]): TutorResponse {
  const typeDescriptions: Record<string, string> = {
    topic: `${node.name} is a major theme explored in this document. Topics represent broad areas of knowledge that encompass multiple related concepts and techniques.`,
    concept: `${node.name} is a fundamental concept in this field. Understanding this concept is essential for grasping more advanced topics and practical applications.`,
    technique: `${node.name} is a practical technique or method used in real-world applications. Mastering this technique will help you solve specific problems effectively.`,
    insight: `${node.name} represents a key insight or observation from the document. These insights often connect different ideas and reveal deeper patterns.`,
    document: `This is the main document being analyzed. It covers multiple topics, concepts, and techniques that are interconnected in the knowledge graph.`,
  };

  const explanation = typeDescriptions[node.type] || 
    `${node.name} is discussed in this document as part of the broader subject matter. ${node.description || ''}`;

  const keyPoints = [
    `${node.name} is categorized as a ${node.type} in this knowledge graph`,
    connectedNodes?.length ? `It connects to ${connectedNodes.length} other concepts` : 'It is a standalone concept',
    node.metadata?.frequency ? `Mentioned ${node.metadata.frequency} times in the document` : 'Referenced throughout the document',
  ];

  const relatedTopics = connectedNodes?.slice(0, 5).map(n => n.name) || [];

  return {
    explanation,
    keyPoints,
    examples: [
      `See the document for specific examples of ${node.name} in context`,
      `Practice identifying ${node.name} in related materials`,
    ],
    studyQuestions: [
      `How does ${node.name} relate to the other concepts in this graph?`,
      `What are the practical applications of ${node.name}?`,
      `How would you explain ${node.name} to someone new to this field?`,
    ],
    relatedTopics,
    difficulty: 'intermediate',
    estimatedReadTime: '3 min',
  };
}
