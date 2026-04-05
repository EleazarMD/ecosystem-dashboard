/**
 * AI Homelab Inferencing - Service Configuration API
 * Manages LLM provider assignments and service configurations
 */

import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';

// Configuration storage path
const CONFIG_DIR = path.join(process.cwd(), 'data', 'ai-config');
const SERVICES_CONFIG_FILE = path.join(CONFIG_DIR, 'services.json');
const USAGE_TRACKING_FILE = path.join(CONFIG_DIR, 'usage-tracking.json');

// Service configuration interface
interface ServiceConfig {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'maintenance';
  features: string[];
  currentProvider: string;
  preferredModel: string;
  autoOptimize: boolean;
  budgetLimit: number;
  currentSpend: number;
  requestsToday: number;
  lastUpdated: string;
  accessControl: {
    allowedProviders: string[];
    rateLimit: number;
    quotaLimit: number;
  };
}

export interface UsageRecord {
  serviceId: string;
  provider: string;
  model: string;
  timestamp: string;
  tokensUsed: number;
  cost: number;
  responseTime: number;
  success: boolean;
}

interface UsageMetrics {
  serviceId: string;
  provider: string;
  model: string;
  timestamp: string;
  tokensUsed: number;
  cost: number;
  responseTime: number;
  success: boolean;
}

// Default service configurations
const DEFAULT_SERVICES: ServiceConfig[] = [
  {
    id: 'openclaw',
    name: 'OpenClaw Gateway',
    status: 'active',
    features: ['orchestration', 'security-gating', 'telemetry', 'multi-agent'],
    currentProvider: 'openai',
    preferredModel: 'gpt-4',
    autoOptimize: true,
    budgetLimit: 150,
    currentSpend: 0,
    requestsToday: 0,
    lastUpdated: new Date().toISOString(),
    accessControl: {
      allowedProviders: ['openai', 'anthropic', 'perplexity', 'ollama'],
      rateLimit: 100, // requests per hour
      quotaLimit: 20000 // tokens per day
    }
  },
  {
    id: 'ai-inferencing',
    name: 'AI Inferencing Service',
    status: 'active',
    features: ['llm-routing', 'provider-fallback', 'cost-optimization'],
    currentProvider: 'ollama',
    preferredModel: 'llama3.1:8b',
    autoOptimize: true,
    budgetLimit: 50,
    currentSpend: 0,
    requestsToday: 0,
    lastUpdated: new Date().toISOString(),
    accessControl: {
      allowedProviders: ['ollama', 'openai', 'anthropic', 'perplexity'],
      rateLimit: 200,
      quotaLimit: 50000
    }
  },
  {
    id: 'hermes-core',
    name: 'Hermes Core',
    status: 'active',
    features: ['email-intelligence', 'calendar-integration', 'briefings'],
    currentProvider: 'anthropic',
    preferredModel: 'claude-3-sonnet',
    autoOptimize: false,
    budgetLimit: 100,
    currentSpend: 0,
    requestsToday: 0,
    lastUpdated: new Date().toISOString(),
    accessControl: {
      allowedProviders: ['anthropic', 'openai'],
      rateLimit: 50,
      quotaLimit: 15000
    }
  }
];

// Ensure config directory exists
async function ensureConfigDirectory() {
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create config directory:', error);
  }
}

// Load service configurations
async function loadServiceConfigs(): Promise<ServiceConfig[]> {
  try {
    await ensureConfigDirectory();
    const data = await fs.readFile(SERVICES_CONFIG_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // Return default configs if file doesn't exist
    console.log('Loading default service configurations');
    await saveServiceConfigs(DEFAULT_SERVICES);
    return DEFAULT_SERVICES;
  }
}

// Save service configurations
async function saveServiceConfigs(services: ServiceConfig[]) {
  try {
    await ensureConfigDirectory();
    await fs.writeFile(SERVICES_CONFIG_FILE, JSON.stringify(services, null, 2));
  } catch (error) {
    console.error('Failed to save service configurations:', error);
    throw error;
  }
}

// Load usage metrics
async function loadUsageMetrics(): Promise<UsageMetrics[]> {
  try {
    const data = await fs.readFile(USAGE_TRACKING_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// Save usage metrics
async function saveUsageMetrics(metrics: UsageMetrics[]) {
  try {
    await ensureConfigDirectory();
    await fs.writeFile(USAGE_TRACKING_FILE, JSON.stringify(metrics, null, 2));
  } catch (error) {
    console.error('Failed to save usage metrics:', error);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        // Get all service configurations
        const services = await loadServiceConfigs();
        res.status(200).json({
          success: true,
          services,
          timestamp: new Date().toISOString()
        });
        break;

      case 'POST':
        // Create or update service configuration
        const { service } = req.body;
        
        if (!service || !service.id) {
          return res.status(400).json({
            success: false,
            error: 'Service configuration with ID is required'
          });
        }

        const currentServices = await loadServiceConfigs();
        const existingIndex = currentServices.findIndex(s => s.id === service.id);
        
        const updatedService = {
          ...service,
          lastUpdated: new Date().toISOString()
        };

        if (existingIndex >= 0) {
          currentServices[existingIndex] = updatedService;
        } else {
          currentServices.push(updatedService);
        }

        await saveServiceConfigs(currentServices);

        res.status(200).json({
          success: true,
          service: updatedService,
          message: existingIndex >= 0 ? 'Service updated' : 'Service created'
        });
        break;

      case 'PUT':
        // Bulk update service configurations
        const { services: bulkServices } = req.body;
        
        if (!Array.isArray(bulkServices)) {
          return res.status(400).json({
            success: false,
            error: 'Services array is required'
          });
        }

        const updatedServices = bulkServices.map(service => ({
          ...service,
          lastUpdated: new Date().toISOString()
        }));

        await saveServiceConfigs(updatedServices);

        res.status(200).json({
          success: true,
          services: updatedServices,
          message: 'Services updated successfully'
        });
        break;

      case 'DELETE':
        // Delete service configuration
        const { serviceId } = req.query;
        
        if (!serviceId) {
          return res.status(400).json({
            success: false,
            error: 'Service ID is required'
          });
        }

        const servicesForDeletion = await loadServiceConfigs();
        const filteredServices = servicesForDeletion.filter(s => s.id !== serviceId);

        if (filteredServices.length === servicesForDeletion.length) {
          return res.status(404).json({
            success: false,
            error: 'Service not found'
          });
        }

        await saveServiceConfigs(filteredServices);

        res.status(200).json({
          success: true,
          message: 'Service deleted successfully'
        });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        res.status(405).json({
          success: false,
          error: `Method ${req.method} not allowed`
        });
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}

export type { ServiceConfig, UsageMetrics };
