/**
 * API endpoint for Redis performance metrics time-series data
 * Provides operations per second, response times, and cache hit rate over time
 */
import type { NextApiRequest, NextApiResponse } from 'next';

// Cache metrics for performance
const CACHE_DURATION = 10000; // 10 seconds
let metricsCache: any = null;
let lastCacheTime = 0;

// Interface for time-series data points
interface RedisTimeSeriesDataPoint {
  timestamp: string;
  operationsPerSecond: number;
  responseTimeMs: number;
  cacheHitRate: number;
  memoryUsage: number;
}

// Generate historical data for the demo (last 24 hours with hourly intervals)
function generateHistoricalData(): RedisTimeSeriesDataPoint[] {
  const data: RedisTimeSeriesDataPoint[] = [];
  const now = new Date();
  
  // Generate 24 data points (one for each hour)
  for (let i = 24; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 3600000); // i hours ago
    
    // Create realistic patterns
    // Operations: Higher during work hours (9am-5pm), lower at night
    // Response Time: Increases with operations but with some variance
    // Hit Rate: Generally high but with fluctuations
    // Memory Usage: Gradually increases, with periodic drops (GC)
    
    const hour = timestamp.getHours();
    const isDaytime = hour >= 9 && hour <= 17;
    
    // Operations per second (higher during day, occasional spikes)
    const opsBase = isDaytime ? 3500 : 1200;
    const opsVariation = Math.random() * 1500;
    const isSpike = Math.random() > 0.85; // Occasional spikes
    const operationsPerSecond = Math.round(opsBase + opsVariation + (isSpike ? 2000 : 0));
    
    // Response time (correlates somewhat with operations)
    const baseResponseTime = 15; // baseline 15ms
    const loadFactor = operationsPerSecond / 5000; // higher ops = higher response time
    const responseVariation = Math.random() * 10;
    const responseTimeMs = parseFloat((baseResponseTime + (loadFactor * 20) + responseVariation).toFixed(1));
    
    // Cache hit rate (generally high but with occasional dips)
    const baseHitRate = 0.86; // 86% baseline
    const hitRateVariation = Math.random() * 0.14;
    const isDip = Math.random() > 0.9; // Occasional cache miss spikes
    const cacheHitRate = parseFloat((baseHitRate - (isDip ? 0.3 : 0) - hitRateVariation).toFixed(2));
    
    // Memory usage (gradually increases with periodic drops)
    const baseMemory = 35;
    const memoryGrowth = (24 - i) * 0.6; // gradually increases over 24h
    const isGC = i % 4 === 0; // garbage collection every 4 hours
    const memoryUsage = parseFloat((baseMemory + memoryGrowth - (isGC ? memoryGrowth * 0.7 : 0) + (Math.random() * 5)).toFixed(1));
    
    data.push({
      timestamp: timestamp.toISOString(),
      operationsPerSecond,
      responseTimeMs,
      cacheHitRate,
      memoryUsage
    });
  }
  
  return data;
}

/**
 * Get current Redis metrics (simulated for demo)
 */
function getCurrentRedisMetrics(): {
  operationsPerSecond: number;
  responseTimeMs: number;
  cacheHitRate: number;
  memoryUsage: number;
} {
  // Simulate current metrics with realistic values
  const operationsPerSecond = Math.round(3000 + (Math.random() * 2000));
  const responseTimeMs = parseFloat((15 + (Math.random() * 15)).toFixed(1));
  const cacheHitRate = parseFloat((0.85 + (Math.random() * 0.1)).toFixed(2));
  const memoryUsage = parseFloat((55 + (Math.random() * 10)).toFixed(1));
  
  return {
    operationsPerSecond,
    responseTimeMs,
    cacheHitRate,
    memoryUsage
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const now = Date.now();
    
    // Use cached data if available and fresh
    if (metricsCache && now - lastCacheTime < CACHE_DURATION) {
      return res.status(200).json(metricsCache);
    }
    
    // Get current metrics
    const currentMetrics = getCurrentRedisMetrics();
    
    // Get historical data
    const historicalData = generateHistoricalData();
    
    // Add current metrics to the data
    const currentDataPoint: RedisTimeSeriesDataPoint = {
      timestamp: new Date().toISOString(),
      ...currentMetrics
    };
    
    const result = {
      current: currentMetrics,
      history: [...historicalData, currentDataPoint]
    };
    
    // Update cache
    metricsCache = result;
    lastCacheTime = now;
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching Redis metrics:', error);
    res.status(500).json({ error: 'Failed to fetch Redis metrics' });
  }
}
