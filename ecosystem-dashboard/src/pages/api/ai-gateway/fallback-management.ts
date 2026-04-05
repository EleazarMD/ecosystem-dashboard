/**
 * AI Gateway Fallback Management API
 * 
 * Provides endpoints for managing fallback configurations across applications
 * and environments in the AI Homelab ecosystem.
 */

import { NextApiRequest, NextApiResponse } from 'next';

// Types for fallback management
interface FallbackConfig {
  appId: string;
  appName: string;
  environment: 'development' | 'staging' | 'production' | 'testing';
  enabled: boolean;
  mode: 'static' | 'custom' | 'cache' | 'hybrid' | 'disabled';
  lastUsed?: string;
  statistics?: {
    totalFallbacks: number;
    cacheHits: number;
    staticResponses: number;
    customResponses: number;
  };
  configuration?: {
    cacheOptions?: {
      enabled: boolean;
      ttl: number;
      maxSize: number;
    };
    developmentBehavior?: {
      enabled: boolean;
      throwOnFallback?: boolean;
      logWarnings?: boolean;
      allowedMethods?: string[];
    };
  };
}

interface GlobalFallbackSettings {
  globallyEnabled: boolean;
  environment: string;
  environmentControls: {
    development: boolean;
    staging: boolean;
    production: boolean;
    testing: boolean;
  };
  statistics: {
    totalFallbacks: number;
    cacheHits: number;
    staticResponses: number;
    customResponses: number;
  };
}

// Mock data - In production, this would come from a database
const mockFallbackConfigs: FallbackConfig[] = [
  {
    appId: 'mexico-city-trip-planner',
    appName: 'Mexico City Trip Planner',
    environment: 'production',
    enabled: true,
    mode: 'hybrid',
    lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    statistics: {
      totalFallbacks: 15,
      cacheHits: 12,
      staticResponses: 3,
      customResponses: 0
    },
    configuration: {
      cacheOptions: {
        enabled: true,
        ttl: 300, // 5 minutes
        maxSize: 100
      }
    }
  },
  {
    appId: 'kids-learning-platform',
    appName: 'Kids Learning Platform',
    environment: 'development',
    enabled: false,
    mode: 'disabled',
    lastUsed: undefined,
    statistics: {
      totalFallbacks: 0,
      cacheHits: 0,
      staticResponses: 0,
      customResponses: 0
    },
    configuration: {
      developmentBehavior: {
        enabled: false,
        throwOnFallback: true,
        logWarnings: true,
        allowedMethods: []
      }
    }
  },
  {
    appId: 'healthcare-platform',
    appName: 'Healthcare Platform',
    environment: 'production',
    enabled: true,
    mode: 'cache',
    lastUsed: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
    statistics: {
      totalFallbacks: 8,
      cacheHits: 6,
      staticResponses: 0,
      customResponses: 2
    },
    configuration: {
      cacheOptions: {
        enabled: true,
        ttl: 180, // 3 minutes for healthcare
        maxSize: 50
      }
    }
  }
];

const mockGlobalSettings: GlobalFallbackSettings = {
  globallyEnabled: true,
  environment: 'production',
  environmentControls: {
    development: false,
    staging: true,
    production: true,
    testing: true
  },
  statistics: {
    totalFallbacks: 23,
    cacheHits: 18,
    staticResponses: 3,
    customResponses: 2
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method, query } = req;

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    switch (method) {
      case 'GET':
        await handleGet(req, res);
        break;
      case 'POST':
        await handlePost(req, res);
        break;
      case 'PUT':
        await handlePut(req, res);
        break;
      case 'DELETE':
        await handleDelete(req, res);
        break;
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        res.status(405).json({ error: `Method ${method} Not Allowed` });
    }
  } catch (error) {
    console.error('Fallback Management API Error:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const { action, appId } = req.query;

  switch (action) {
    case 'global-settings':
      res.status(200).json({
        success: true,
        data: mockGlobalSettings
      });
      break;

    case 'app-configs':
      res.status(200).json({
        success: true,
        data: mockFallbackConfigs
      });
      break;

    case 'app-config':
      if (!appId) {
        return res.status(400).json({ error: 'appId is required' });
      }
      const config = mockFallbackConfigs.find(c => c.appId === appId);
      if (!config) {
        return res.status(404).json({ error: 'App configuration not found' });
      }
      res.status(200).json({
        success: true,
        data: config
      });
      break;

    case 'templates':
      res.status(200).json({
        success: true,
        data: {
          development: {
            name: 'Development Template',
            description: 'Strict mode - no fallbacks, throw errors',
            config: {
              enabled: false,
              mode: 'disabled',
              developmentBehavior: {
                enabled: false,
                throwOnFallback: true,
                logWarnings: true,
                allowedMethods: []
              }
            }
          },
          production: {
            name: 'Production Template',
            description: 'Full fallback support with caching',
            config: {
              enabled: true,
              mode: 'hybrid',
              cacheOptions: {
                enabled: true,
                ttl: 300,
                maxSize: 100
              }
            }
          },
          critical: {
            name: 'Critical Systems',
            description: 'Healthcare/Finance - cache only fallbacks',
            config: {
              enabled: true,
              mode: 'cache',
              cacheOptions: {
                enabled: true,
                ttl: 180,
                maxSize: 50
              }
            }
          }
        }
      });
      break;

    default:
      res.status(400).json({ error: 'Invalid action parameter' });
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  const { action } = req.query;
  const data = req.body;

  switch (action) {
    case 'toggle-app':
      const { appId, enabled } = data;
      if (!appId || typeof enabled !== 'boolean') {
        return res.status(400).json({ error: 'appId and enabled are required' });
      }
      
      // In production, update database
      const configIndex = mockFallbackConfigs.findIndex(c => c.appId === appId);
      if (configIndex === -1) {
        return res.status(404).json({ error: 'App configuration not found' });
      }
      
      mockFallbackConfigs[configIndex].enabled = enabled;
      mockFallbackConfigs[configIndex].mode = enabled ? 'hybrid' : 'disabled';
      
      res.status(200).json({
        success: true,
        message: `Fallback ${enabled ? 'enabled' : 'disabled'} for ${appId}`,
        data: mockFallbackConfigs[configIndex]
      });
      break;

    case 'toggle-global':
      const { globalEnabled } = data;
      if (typeof globalEnabled !== 'boolean') {
        return res.status(400).json({ error: 'globalEnabled is required' });
      }
      
      mockGlobalSettings.globallyEnabled = globalEnabled;
      
      res.status(200).json({
        success: true,
        message: `Global fallbacks ${globalEnabled ? 'enabled' : 'disabled'}`,
        data: mockGlobalSettings
      });
      break;

    case 'toggle-environment':
      const { environment, environmentEnabled } = data;
      if (!environment || typeof environmentEnabled !== 'boolean') {
        return res.status(400).json({ error: 'environment and environmentEnabled are required' });
      }
      
      if (!(environment in mockGlobalSettings.environmentControls)) {
        return res.status(400).json({ error: 'Invalid environment' });
      }
      
      mockGlobalSettings.environmentControls[environment as keyof typeof mockGlobalSettings.environmentControls] = environmentEnabled;
      
      res.status(200).json({
        success: true,
        message: `Fallbacks ${environmentEnabled ? 'enabled' : 'disabled'} for ${environment}`,
        data: mockGlobalSettings
      });
      break;

    case 'apply-template':
      const { templateName, appIds } = data;
      if (!templateName || !Array.isArray(appIds)) {
        return res.status(400).json({ error: 'templateName and appIds array are required' });
      }
      
      // Apply template to specified apps
      const updatedApps = [];
      for (const appId of appIds) {
        const configIndex = mockFallbackConfigs.findIndex(c => c.appId === appId);
        if (configIndex !== -1) {
          // Apply template configuration based on templateName
          switch (templateName) {
            case 'development':
              mockFallbackConfigs[configIndex].enabled = false;
              mockFallbackConfigs[configIndex].mode = 'disabled';
              break;
            case 'production':
              mockFallbackConfigs[configIndex].enabled = true;
              mockFallbackConfigs[configIndex].mode = 'hybrid';
              break;
            case 'critical':
              mockFallbackConfigs[configIndex].enabled = true;
              mockFallbackConfigs[configIndex].mode = 'cache';
              break;
          }
          updatedApps.push(mockFallbackConfigs[configIndex]);
        }
      }
      
      res.status(200).json({
        success: true,
        message: `Applied ${templateName} template to ${updatedApps.length} apps`,
        data: updatedApps
      });
      break;

    case 'emergency-disable':
      // Disable all fallbacks
      (mockFallbackConfigs || []).forEach(config => {
        config.enabled = false;
        config.mode = 'disabled';
      });
      
      mockGlobalSettings.globallyEnabled = false;
      
      res.status(200).json({
        success: true,
        message: 'Emergency disable activated - all fallbacks disabled',
        data: {
          global: mockGlobalSettings,
          apps: mockFallbackConfigs
        }
      });
      break;

    default:
      res.status(400).json({ error: 'Invalid action parameter' });
  }
}

async function handlePut(req: NextApiRequest, res: NextApiResponse) {
  const { appId } = req.query;
  const configUpdate = req.body;

  if (!appId) {
    return res.status(400).json({ error: 'appId is required' });
  }

  const configIndex = mockFallbackConfigs.findIndex(c => c.appId === appId);
  if (configIndex === -1) {
    return res.status(404).json({ error: 'App configuration not found' });
  }

  // Update configuration
  mockFallbackConfigs[configIndex] = {
    ...mockFallbackConfigs[configIndex],
    ...configUpdate
  };

  res.status(200).json({
    success: true,
    message: `Configuration updated for ${appId}`,
    data: mockFallbackConfigs[configIndex]
  });
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse) {
  const { appId } = req.query;

  if (!appId) {
    return res.status(400).json({ error: 'appId is required' });
  }

  const configIndex = mockFallbackConfigs.findIndex(c => c.appId === appId);
  if (configIndex === -1) {
    return res.status(404).json({ error: 'App configuration not found' });
  }

  const removedConfig = mockFallbackConfigs.splice(configIndex, 1)[0];

  res.status(200).json({
    success: true,
    message: `Configuration removed for ${appId}`,
    data: removedConfig
  });
}
