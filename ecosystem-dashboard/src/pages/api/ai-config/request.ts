/**
 * AI Homelab Inferencing - LLM Request Processing API
 * Handles actual LLM requests with access control and usage tracking
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { llmProviderService, LLMRequest, LLMResponse } from '@/lib/services/LLMProviderService';

interface RequestBody extends LLMRequest {
  // Additional fields for API
}

interface ApiResponse {
  success: boolean;
  data?: LLMResponse;
  error?: string;
  accessControl?: {
    rateLimitRemaining?: number;
    quotaRemaining?: number;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const requestBody: RequestBody = req.body;

    // Validate required fields
    if (!requestBody.serviceId) {
      return res.status(400).json({
        success: false,
        error: 'serviceId is required'
      });
    }

    if (!requestBody.messages || !Array.isArray(requestBody.messages) || requestBody.messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'messages array is required and must not be empty'
      });
    }

    // Validate message format
    for (const message of requestBody.messages) {
      if (!message.role || !message.content) {
        return res.status(400).json({
          success: false,
          error: 'Each message must have role and content'
        });
      }
      if (!['system', 'user', 'assistant'].includes(message.role)) {
        return res.status(400).json({
          success: false,
          error: 'Message role must be system, user, or assistant'
        });
      }
    }

    // Process the request
    const response = await llmProviderService.processRequest(requestBody);

    // Get service config for access control info
    const serviceConfig = llmProviderService.getServiceConfig(requestBody.serviceId);
    
    return res.status(200).json({
      success: true,
      data: response,
      accessControl: serviceConfig ? {
        rateLimitRemaining: serviceConfig.accessControl.rateLimit, // This would be calculated in real implementation
        quotaRemaining: serviceConfig.accessControl.quotaLimit
      } : undefined
    });

  } catch (error) {
    console.error('LLM request processing error:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('Access denied')) {
        return res.status(403).json({
          success: false,
          error: error.message
        });
      }
      
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      
      if (error.message.includes('Rate limit') || error.message.includes('quota')) {
        return res.status(429).json({
          success: false,
          error: error.message
        });
      }
    }

    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
