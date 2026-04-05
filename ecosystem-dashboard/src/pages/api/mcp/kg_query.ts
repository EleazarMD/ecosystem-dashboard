import { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import logger from '@/lib/logger';
import kgGateway, { KGError } from '@/lib/kg-gateway';

interface KGQueryRequest {
  query: string;
  params?: Record<string, any>;
  format?: 'json' | 'text' | 'table' | 'summary';
  limit?: number;
}

/**
 * Knowledge Graph Query API handler
 * 
 * This API endpoint uses the Knowledge Graph Gateway to standardize communication
 * with the Knowledge Graph MCP Server via AI Gateway, following AI Homelab Ecosystem architecture standards.
 * It provides a consistent interface for querying the Knowledge Graph.
 * 
 * Architecture Flow: Dashboard → API endpoint → KG Gateway → AI Gateway → Knowledge Graph MCP Server
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed', 
      code: 'METHOD_NOT_ALLOWED' 
    });
  }

  try {
    // Extract parameters from the request body
    const { query, format, limit } = req.body;
    const requestId = req.headers['x-request-id'] as string || uuidv4();
    
    // Validate query
    if (!query || typeof query !== 'string') {
      logger.warn('[KG-API] Invalid Knowledge Graph query', { requestId });
      return res.status(400).json({
        error: 'Invalid query parameter', 
        code: 'INVALID_PARAMETERS',
        requestId 
      });
    }
    
    logger.info(`[KG-API] Processing Knowledge Graph query: ${query.substring(0, 100)}...`, { 
      requestId,
      format: format || 'json',
      limit: limit || 10
    });
    
    // Execute the query through the Knowledge Graph Gateway
    const startTime = Date.now();
    const result = await kgGateway.executeQuery(query, {
      format: format || 'json',
      limit: limit || 10
    });
    const duration = Date.now() - startTime;
    
    // Log successful completion with metrics
    logger.info('[KG-API] Knowledge Graph query completed successfully', {
      requestId,
      duration,
      confidence: result.confidence,
      sourcesCount: result.sources?.length || 0
    });
    
    // Enrich response with request tracking information
    const enrichedResult = {
      ...result,
      requestId,
      processingTimeMs: duration
    };
    
    // Return the query result
    return res.status(200).json(enrichedResult);
  } catch (error: any) {
    const requestId = error.requestId || uuidv4();
    
    if (error instanceof KGError) {
      logger.error(`[KG-API] Knowledge Graph error: ${error.message}`, {
        code: error.code,
        status: error.status,
        requestId
      });
      
      return res.status(error.status || 500).json({
        error: error.message,
        code: error.code || 'KG_ERROR',
        requestId
      });
    } else {
      // For generic errors, create an error code based on message
      const errorCode = error.code || 
        (error.message ? 
          `KG_${error.message.toUpperCase().replace(/\s+/g, '_').substring(0, 20)}` : 
          'INTERNAL_SERVER_ERROR');
      
      logger.error(`[KG-API] Unexpected error in KG query: ${error.message || 'Unknown error'}`, {
        requestId,
        stack: error.stack,
        errorCode
      });
      
      return res.status(500).json({
        error: 'An error occurred while processing the query',
        code: errorCode,
        requestId
      });
    }
  }
}
