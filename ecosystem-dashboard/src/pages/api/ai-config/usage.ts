/**
 * AI Homelab Inferencing - Usage Tracking API
 * Tracks LLM usage, costs, and performance metrics per service
 */

import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';

const CONFIG_DIR = path.join(process.cwd(), 'data', 'ai-config');
const USAGE_TRACKING_FILE = path.join(CONFIG_DIR, 'usage-tracking.json');
const DAILY_STATS_FILE = path.join(CONFIG_DIR, 'daily-stats.json');

interface UsageRecord {
  id: string;
  serviceId: string;
  provider: string;
  model: string;
  timestamp: string;
  tokensUsed: number;
  cost: number;
  responseTime: number;
  success: boolean;
  requestType: 'completion' | 'embedding' | 'search';
  metadata?: any;
}

interface DailyStats {
  date: string;
  serviceId: string;
  provider: string;
  totalRequests: number;
  successfulRequests: number;
  totalTokens: number;
  totalCost: number;
  avgResponseTime: number;
  errorRate: number;
}

// Provider cost rates (per 1K tokens)
const PROVIDER_COSTS = {
  'openai': {
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'gpt-3.5-turbo': { input: 0.0015, output: 0.002 }
  },
  'anthropic': {
    'claude-3-opus': { input: 0.015, output: 0.075 },
    'claude-3-sonnet': { input: 0.003, output: 0.015 },
    'claude-3-haiku': { input: 0.00025, output: 0.00125 }
  },
  'ollama': {
    'llama3.1:8b': { input: 0, output: 0 },
    'llama3.1:70b': { input: 0, output: 0 },
    'mistral:7b': { input: 0, output: 0 }
  },
  'ai-homelab': {
    'homelab-llm-v1': { input: 0, output: 0 },
    'homelab-specialized': { input: 0, output: 0 }
  }
};

// Ensure config directory exists
async function ensureConfigDirectory() {
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create config directory:', error);
  }
}

// Load usage records
async function loadUsageRecords(): Promise<UsageRecord[]> {
  try {
    const data = await fs.readFile(USAGE_TRACKING_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// Save usage records
async function saveUsageRecords(records: UsageRecord[]) {
  try {
    await ensureConfigDirectory();
    await fs.writeFile(USAGE_TRACKING_FILE, JSON.stringify(records, null, 2));
  } catch (error) {
    console.error('Failed to save usage records:', error);
    throw error;
  }
}

// Load daily stats
async function loadDailyStats(): Promise<DailyStats[]> {
  try {
    const data = await fs.readFile(DAILY_STATS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// Save daily stats
async function saveDailyStats(stats: DailyStats[]) {
  try {
    await ensureConfigDirectory();
    await fs.writeFile(DAILY_STATS_FILE, JSON.stringify(stats, null, 2));
  } catch (error) {
    console.error('Failed to save daily stats:', error);
  }
}

// Calculate cost based on provider and model
function calculateCost(provider: string, model: string, inputTokens: number, outputTokens: number): number {
  const providerCosts = PROVIDER_COSTS[provider];
  if (!providerCosts || !providerCosts[model]) {
    return 0; // Free for unknown providers/models
  }

  const modelCosts = providerCosts[model];
  const inputCost = (inputTokens / 1000) * modelCosts.input;
  const outputCost = (outputTokens / 1000) * modelCosts.output;
  
  return parseFloat((inputCost + outputCost).toFixed(6));
}

// Generate daily statistics
async function generateDailyStats(date: string): Promise<DailyStats[]> {
  const records = await loadUsageRecords();
  const dayStart = new Date(date);
  const dayEnd = new Date(date);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const dayRecords = records.filter(record => {
    const recordDate = new Date(record.timestamp);
    return recordDate >= dayStart && recordDate < dayEnd;
  });

  // Group by service and provider
  const groupedStats = new Map<string, DailyStats>();

  dayRecords.forEach(record => {
    const key = `${record.serviceId}-${record.provider}`;
    
    if (!groupedStats.has(key)) {
      groupedStats.set(key, {
        date,
        serviceId: record.serviceId,
        provider: record.provider,
        totalRequests: 0,
        successfulRequests: 0,
        totalTokens: 0,
        totalCost: 0,
        avgResponseTime: 0,
        errorRate: 0
      });
    }

    const stats = groupedStats.get(key)!;
    stats.totalRequests++;
    if (record.success) {
      stats.successfulRequests++;
    }
    stats.totalTokens += record.tokensUsed;
    stats.totalCost += record.cost;
    stats.avgResponseTime += record.responseTime;
  });

  // Calculate averages and error rates
  const finalStats = Array.from(groupedStats.values()).map(stats => ({
    ...stats,
    avgResponseTime: stats.totalRequests > 0 ? stats.avgResponseTime / stats.totalRequests : 0,
    errorRate: stats.totalRequests > 0 ? (stats.totalRequests - stats.successfulRequests) / stats.totalRequests : 0
  }));

  return finalStats;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        const { serviceId, provider, startDate, endDate, stats } = req.query;

        if (stats === 'daily') {
          // Get daily statistics
          const date = (startDate as string) || new Date().toISOString().split('T')[0];
          const dailyStats = await generateDailyStats(date);
          
          return res.status(200).json({
            success: true,
            stats: dailyStats,
            date
          });
        }

        // Get usage records with optional filtering
        let records = await loadUsageRecords();

        if (serviceId) {
          records = records.filter(r => r.serviceId === serviceId);
        }

        if (provider) {
          records = records.filter(r => r.provider === provider);
        }

        if (startDate) {
          const start = new Date(startDate as string);
          records = records.filter(r => new Date(r.timestamp) >= start);
        }

        if (endDate) {
          const end = new Date(endDate as string);
          records = records.filter(r => new Date(r.timestamp) <= end);
        }

        // Sort by timestamp (newest first)
        records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        res.status(200).json({
          success: true,
          records: records.slice(0, 1000), // Limit to 1000 records
          total: records.length
        });
        break;

      case 'POST':
        // Record new usage
        const {
          serviceId: postServiceId,
          provider: postProvider,
          model,
          inputTokens = 0,
          outputTokens = 0,
          responseTime,
          success = true,
          requestType = 'completion',
          metadata = {}
        } = req.body;

        if (!postServiceId || !postProvider || !model) {
          return res.status(400).json({
            success: false,
            error: 'serviceId, provider, and model are required'
          });
        }

        const totalTokens = inputTokens + outputTokens;
        const cost = calculateCost(postProvider, model, inputTokens, outputTokens);

        const newRecord: UsageRecord = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          serviceId: postServiceId,
          provider: postProvider,
          model,
          timestamp: new Date().toISOString(),
          tokensUsed: totalTokens,
          cost,
          responseTime: responseTime || 0,
          success,
          requestType,
          metadata
        };

        const currentRecords = await loadUsageRecords();
        currentRecords.push(newRecord);

        // Keep only last 10,000 records to prevent file from growing too large
        if (currentRecords.length > 10000) {
          currentRecords.splice(0, currentRecords.length - 10000);
        }

        await saveUsageRecords(currentRecords);

        res.status(201).json({
          success: true,
          record: newRecord,
          message: 'Usage recorded successfully'
        });
        break;

      case 'DELETE':
        // Clear usage records (with optional filtering)
        const { serviceId: deleteServiceId, before } = req.query;

        let recordsToKeep = await loadUsageRecords();

        if (deleteServiceId) {
          recordsToKeep = recordsToKeep.filter(r => r.serviceId !== deleteServiceId);
        }

        if (before) {
          const beforeDate = new Date(before as string);
          recordsToKeep = recordsToKeep.filter(r => new Date(r.timestamp) >= beforeDate);
        }

        if (!deleteServiceId && !before) {
          // Clear all records if no filters
          recordsToKeep = [];
        }

        await saveUsageRecords(recordsToKeep);

        res.status(200).json({
          success: true,
          message: 'Usage records cleared successfully'
        });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
        res.status(405).json({
          success: false,
          error: `Method ${req.method} not allowed`
        });
    }
  } catch (error) {
    console.error('Usage API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}

export type { UsageRecord, DailyStats };
