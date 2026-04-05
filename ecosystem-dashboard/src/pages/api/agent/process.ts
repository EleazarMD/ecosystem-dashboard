/**
 * Agent Process API Endpoint
 * 
 * Main endpoint for processing agent requests including queries, commands,
 * voice input, and multimodal interactions through the AI Agent Runtime.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { aiAgentRuntime, AgentRequest, AgentResponse } from '@/lib/agent/AIAgentRuntime';
import logger from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

interface ProcessRequestBody {
  type: 'query' | 'command' | 'voice' | 'multimodal' | 'proactive';
  content: string | Record<string, any>;
  context?: {
    userId?: string;
    sessionId?: string;
    currentPage: string;
    systemState?: Record<string, any>;
    recentActions?: string[];
    userPreferences?: Record<string, any>;
  };
  priority?: 'low' | 'medium' | 'high' | 'critical';
  timeout?: number;
}

interface ProcessResponse {
  success: boolean;
  request: {
    id: string;
    type: string;
    timestamp: string;
  };
  response?: AgentResponse;
  error?: string;
}

// Request size limits (in bytes)
const MAX_REQUEST_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_TEXT_LENGTH = 10000; // 10k characters

// Rate limiting (simple in-memory store - use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_REQUESTS = 30; // 30 requests per minute

function checkRateLimit(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = identifier;
  
  let entry = rateLimitStore.get(key);
  
  if (!entry || now > entry.resetTime) {
    entry = {
      count: 0,
      resetTime: now + RATE_LIMIT_WINDOW
    };
  }
  
  entry.count++;
  rateLimitStore.set(key, entry);
  
  const allowed = entry.count <= RATE_LIMIT_REQUESTS;
  const remaining = Math.max(0, RATE_LIMIT_REQUESTS - entry.count);
  
  return { allowed, remaining, resetTime: entry.resetTime };
}

function validateRequestBody(body: any): ProcessRequestBody | null {
  if (!body || typeof body !== 'object') {
    return null;
  }
  
  const { type, content, context, priority, timeout } = body;
  
  // Validate type
  if (!type || !['query', 'command', 'voice', 'multimodal', 'proactive'].includes(type)) {
    return null;
  }
  
  // Validate content
  if (content === undefined || content === null) {
    return null;
  }
  
  // Validate text content length
  if (typeof content === 'string' && content.length > MAX_TEXT_LENGTH) {
    return null;
  }
  
  // Validate priority
  if (priority && !['low', 'medium', 'high', 'critical'].includes(priority)) {
    return null;
  }
  
  // Validate timeout
  if (timeout && (typeof timeout !== 'number' || timeout < 1000 || timeout > 300000)) {
    return null;
  }
  
  return {
    type,
    content,
    context: context || { currentPage: 'unknown' },
    priority: priority || 'medium',
    timeout: timeout || 30000
  };
}

function sanitizeContent(content: string | Record<string, any>): string | Record<string, any> {
  if (typeof content === 'string') {
    // Basic XSS prevention
    return content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }
  
  if (typeof content === 'object' && content !== null) {
    // Recursively sanitize object properties
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(content)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeContent(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeContent(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
  
  return content;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ProcessResponse>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      success: false,
      request: { id: '', type: '', timestamp: new Date().toISOString() },
      error: 'Method not allowed'
    });
  }

  const requestId = uuidv4();
  const requestTimestamp = new Date().toISOString();
  
  try {
    // Rate limiting
    const clientIP = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';
    const rateLimit = checkRateLimit(clientIP);
    
    if (!rateLimit.allowed) {
      res.setHeader('X-RateLimit-Limit', RATE_LIMIT_REQUESTS.toString());
      res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());
      res.setHeader('X-RateLimit-Reset', rateLimit.resetTime.toString());
      
      return res.status(429).json({
        success: false,
        request: { id: requestId, type: '', timestamp: requestTimestamp },
        error: 'Rate limit exceeded'
      });
    }
    
    res.setHeader('X-RateLimit-Limit', RATE_LIMIT_REQUESTS.toString());
    res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());
    res.setHeader('X-RateLimit-Reset', rateLimit.resetTime.toString());

    // Validate request size
    const contentLength = parseInt(req.headers['content-length'] || '0');
    if (contentLength > MAX_REQUEST_SIZE) {
      return res.status(413).json({
        success: false,
        request: { id: requestId, type: '', timestamp: requestTimestamp },
        error: 'Request too large'
      });
    }

    // Validate and sanitize request body
    const validatedBody = validateRequestBody(req.body);
    if (!validatedBody) {
      return res.status(400).json({
        success: false,
        request: { id: requestId, type: '', timestamp: requestTimestamp },
        error: 'Invalid request body'
      });
    }

    // Sanitize content
    const sanitizedContent = sanitizeContent(validatedBody.content);

    logger.info(`[API] Processing ${validatedBody.type} request: ${requestId}`);

    // Check if agent is initialized
    const agentStatus = aiAgentRuntime.getStatus();
    if (!agentStatus.initialized) {
      // Try to initialize the agent
      try {
        await aiAgentRuntime.initialize();
      } catch (initError) {
        logger.error('[API] Failed to initialize agent:', initError);
        return res.status(503).json({
          success: false,
          request: { id: requestId, type: validatedBody.type, timestamp: requestTimestamp },
          error: 'Agent not available'
        });
      }
    }

    // Create agent request
    const agentRequest: AgentRequest = {
      id: requestId,
      type: validatedBody.type,
      content: sanitizedContent,
      context: validatedBody.context,
      priority: validatedBody.priority,
      timeout: validatedBody.timeout
    };

    // Process request through agent runtime
    const agentResponse = await aiAgentRuntime.processRequest(agentRequest);

    // Handle different response types
    let responseContent: any = agentResponse.content;
    let contentType = 'application/json';

    if (agentResponse.type === 'voice' && agentResponse.content instanceof ArrayBuffer) {
      // Convert ArrayBuffer to base64 for JSON transmission
      const bytes = new Uint8Array(agentResponse.content);
      const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
      responseContent = {
        type: 'audio',
        data: Buffer.from(binary, 'binary').toString('base64'),
        format: 'wav'
      };
    }

    const response: ProcessResponse = {
      success: true,
      request: {
        id: requestId,
        type: validatedBody.type,
        timestamp: requestTimestamp
      },
      response: {
        ...agentResponse,
        content: responseContent
      }
    };

    // Set appropriate headers
    res.setHeader('Content-Type', contentType);
    
    // Cache control for agent responses
    if (validatedBody.type === 'query' && agentResponse.confidence > 0.8) {
      // Cache high-confidence query responses for 5 minutes
      res.setHeader('Cache-Control', 'private, max-age=300');
    } else {
      // Don't cache dynamic or low-confidence responses
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }

    res.status(200).json(response);

    logger.info(`[API] Request ${requestId} completed successfully in ${agentResponse.executionTime}ms`);

  } catch (error) {
    logger.error(`[API] Request ${requestId} failed:`, error);

    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    
    res.status(500).json({
      success: false,
      request: {
        id: requestId,
        type: req.body?.type || 'unknown',
        timestamp: requestTimestamp
      },
      error: errorMessage
    });
  }
}

// Helper to handle multipart/form-data for file uploads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}
