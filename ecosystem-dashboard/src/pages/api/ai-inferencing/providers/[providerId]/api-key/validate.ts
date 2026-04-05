/**
 * API Key Validation Endpoint
 * POST /api/ai-inferencing/providers/[providerId]/api-key/validate
 * Validates API key format and tests connection to provider
 */

import { NextApiRequest, NextApiResponse } from 'next';

// Provider-specific validation configurations
const API_KEY_CONFIGURATIONS = {
  "openai": {
    keyType: "bearer_token",
    headerName: "Authorization",
    headerFormat: "Bearer ${API_KEY}",
    validation: {
      pattern: /^sk-[A-Za-z0-9]{48}$/,
      testEndpoint: "https://api.openai.com/v1/models",
      testMethod: "GET"
    },
    rateLimit: {
      requestsPerMinute: 3500,
      tokensPerMinute: 90000
    }
  },
  
  "anthropic": {
    keyType: "api_key",
    headerName: "x-api-key",
    headerFormat: "${API_KEY}",
    additionalHeaders: {
      "anthropic-version": "2023-06-01"
    },
    validation: {
      pattern: /^sk-ant-[A-Za-z0-9]{95}$/,
      testEndpoint: "https://api.anthropic.com/v1/messages",
      testMethod: "POST"
    },
    rateLimit: {
      requestsPerMinute: 4000,
      tokensPerMinute: 100000
    }
  },
  
  "google": {
    keyType: "api_key",
    headerName: "Authorization",
    headerFormat: "Bearer ${API_KEY}",
    validation: {
      pattern: /^AIza[0-9A-Za-z-_]{35}$/,
      testEndpoint: "https://generativelanguage.googleapis.com/v1/models",
      testMethod: "GET"
    },
    rateLimit: {
      requestsPerMinute: 1500,
      tokensPerMinute: 32000
    }
  },
  
  "cohere": {
    keyType: "bearer_token",
    headerName: "Authorization",
    headerFormat: "Bearer ${API_KEY}",
    validation: {
      pattern: /^[A-Za-z0-9]{40}$/,
      testEndpoint: "https://api.cohere.ai/v1/models",
      testMethod: "GET"
    },
    rateLimit: {
      requestsPerMinute: 1000,
      tokensPerMinute: 40000
    }
  },
  
  "unsplash": {
    keyType: "access_key",
    headerName: "Authorization",
    headerFormat: "Client-ID ${API_KEY}",
    additionalHeaders: {
      "Accept-Version": "v1"
    },
    validation: {
      pattern: /^[A-Za-z0-9_-]{43,45}$/,  // Unsplash Access Keys are typically 43 chars
      testEndpoint: "https://api.unsplash.com/photos/random?count=1",
      testMethod: "GET"
    },
    rateLimit: {
      requestsPerMinute: 50,  // Demo/Development: 50 req/hour (https://unsplash.com/developers)
      tokensPerMinute: 0
    }
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { providerId } = req.query;
  const { key } = req.body;

  if (!providerId || typeof providerId !== 'string') {
    return res.status(400).json({ error: 'Provider ID is required' });
  }

  if (!key || typeof key !== 'string') {
    return res.status(400).json({ error: 'API key is required' });
  }

  // Check API key authentication
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== 'ai-gateway-api-key-2024') {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  const config = API_KEY_CONFIGURATIONS[providerId as keyof typeof API_KEY_CONFIGURATIONS];
  if (!config) {
    return res.status(400).json({ 
      error: 'Unsupported provider',
      message: `Provider ${providerId} is not supported for API key validation`
    });
  }

  try {
    // Validate key format
    if (!config.validation.pattern.test(key)) {
      return res.status(400).json({
        valid: false,
        error: 'Invalid API key format',
        message: `API key does not match expected pattern for ${providerId}`
      });
    }

    // Test API key with provider (mock validation for now)
    // In production, this would make actual API calls to validate
    const isValidKey = await validateKeyWithProvider(providerId, key, config);

    if (isValidKey) {
      return res.status(200).json({
        valid: true,
        permissions: getProviderPermissions(providerId),
        rateLimit: config.rateLimit,
        message: `${providerId} API key validated successfully`
      });
    } else {
      return res.status(400).json({
        valid: false,
        error: 'API key validation failed',
        message: 'Key format is correct but authentication with provider failed'
      });
    }
  } catch (error) {
    console.error(`Error validating API key for ${providerId}:`, error);
    return res.status(500).json({ 
      valid: false,
      error: 'Validation error',
      message: 'Failed to validate API key due to server error'
    });
  }
}

async function validateKeyWithProvider(providerId: string, key: string, config: any): Promise<boolean> {
  // For Unsplash, make an actual API call to validate
  if (providerId === 'unsplash') {
    try {
      const headers: Record<string, string> = {
        'Authorization': config.headerFormat.replace('${API_KEY}', key),
      };
      
      if (config.additionalHeaders) {
        Object.assign(headers, config.additionalHeaders);
      }
      
      const response = await fetch(config.validation.testEndpoint, {
        method: config.validation.testMethod,
        headers,
      });
      
      return response.ok;
    } catch (error) {
      console.error(`Unsplash API validation failed:`, error);
      return false;
    }
  }
  
  // Mock validation for other providers - in production this would make actual API calls
  // For demo purposes, we'll simulate validation based on key format
  try {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock validation logic - accept keys that match the pattern
    return config.validation.pattern.test(key);
  } catch (error) {
    console.error(`Provider validation failed for ${providerId}:`, error);
    return false;
  }
}

function getProviderPermissions(providerId: string): string[] {
  const permissions = {
    "openai": ["chat", "embeddings", "completions", "models"],
    "anthropic": ["messages", "completions"],
    "google": ["generateContent", "models"],
    "cohere": ["generate", "embed", "classify"],
    "unsplash": ["photos", "search", "collections", "download"]
  };
  
  return permissions[providerId as keyof typeof permissions] || [];
}
