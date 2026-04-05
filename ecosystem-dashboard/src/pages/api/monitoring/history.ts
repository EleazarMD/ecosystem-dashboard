/**
 * GPU/CPU Metrics History API
 * Stores and retrieves historical performance data for time-series charts
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

interface MetricPoint {
  timestamp: number;
  gpus: Array<{
    id: number;
    temperature: number;
    utilization: number;
    memoryUsedMB: number;
    powerDraw: number;
    fanSpeed: number;
  }>;
  cpu: {
    temperature: number;
    utilization: number;
    loadAverage: number[];
  };
}

interface HistoryResponse {
  success: boolean;
  data?: MetricPoint[];
  error?: string;
  range?: {
    start: number;
    end: number;
    points: number;
  };
}

const HISTORY_FILE = '/tmp/rtx-metrics-history.json';
const MAX_HISTORY_POINTS = 1440; // 24 hours at 1-minute intervals
const SAMPLE_INTERVAL_MS = 60000; // 1 minute

let metricsHistory: MetricPoint[] = [];
let lastSampleTime = 0;

// Load history from file on startup
function loadHistory(): void {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const data = fs.readFileSync(HISTORY_FILE, 'utf-8');
      metricsHistory = JSON.parse(data);
      console.log(`[History] Loaded ${metricsHistory.length} historical points`);
    }
  } catch (e) {
    console.error('[History] Failed to load history:', e);
    metricsHistory = [];
  }
}

// Save history to file
function saveHistory(): void {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(metricsHistory));
  } catch (e) {
    console.error('[History] Failed to save history:', e);
  }
}

// Add a new metric point
function addMetricPoint(point: MetricPoint): void {
  metricsHistory.push(point);
  
  // Trim to max size
  if (metricsHistory.length > MAX_HISTORY_POINTS) {
    metricsHistory = metricsHistory.slice(-MAX_HISTORY_POINTS);
  }
  
  // Save periodically (every 10 points)
  if (metricsHistory.length % 10 === 0) {
    saveHistory();
  }
}

// Fetch current stats and add to history
async function sampleCurrentStats(): Promise<void> {
  const now = Date.now();
  
  // Only sample at intervals
  if (now - lastSampleTime < SAMPLE_INTERVAL_MS) {
    return;
  }
  
  try {
    // Fetch from the gpu-stats endpoint internally
    const response = await fetch('http://localhost:8404/api/monitoring/gpu-stats');
    const data = await response.json();
    
    if (data.success && data.gpus) {
      const point: MetricPoint = {
        timestamp: now,
        gpus: data.gpus.map((gpu: any) => ({
          id: gpu.id,
          temperature: gpu.temperature,
          utilization: gpu.utilization,
          memoryUsedMB: gpu.memoryUsedMB,
          powerDraw: gpu.powerDraw,
          fanSpeed: gpu.fanSpeed,
        })),
        cpu: {
          temperature: data.cpu?.temperature || 0,
          utilization: data.cpu?.utilization || 0,
          loadAverage: data.cpu?.loadAverage || [0, 0, 0],
        },
      };
      
      addMetricPoint(point);
      lastSampleTime = now;
    }
  } catch (e) {
    console.error('[History] Failed to sample stats:', e);
  }
}

// Initialize on first load
loadHistory();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HistoryResponse>
) {
  if (req.method === 'GET') {
    // Sample current stats
    await sampleCurrentStats();
    
    // Parse query params
    const { range = '1h', gpu } = req.query;
    
    // Calculate time range
    const now = Date.now();
    let startTime = now;
    
    switch (range) {
      case '15m':
        startTime = now - 15 * 60 * 1000;
        break;
      case '1h':
        startTime = now - 60 * 60 * 1000;
        break;
      case '6h':
        startTime = now - 6 * 60 * 60 * 1000;
        break;
      case '24h':
        startTime = now - 24 * 60 * 60 * 1000;
        break;
      default:
        startTime = now - 60 * 60 * 1000;
    }
    
    // Filter by time range
    let filteredData = metricsHistory.filter(p => p.timestamp >= startTime);
    
    // Optionally filter by GPU
    if (gpu !== undefined) {
      const gpuId = parseInt(gpu as string);
      filteredData = filteredData.map(p => ({
        ...p,
        gpus: p.gpus.filter(g => g.id === gpuId),
      }));
    }
    
    return res.status(200).json({
      success: true,
      data: filteredData,
      range: {
        start: startTime,
        end: now,
        points: filteredData.length,
      },
    });
  }
  
  if (req.method === 'POST') {
    // Manual sample trigger
    await sampleCurrentStats();
    
    return res.status(200).json({
      success: true,
      range: {
        start: metricsHistory[0]?.timestamp || Date.now(),
        end: Date.now(),
        points: metricsHistory.length,
      },
    });
  }
  
  return res.status(405).json({
    success: false,
    error: 'Method not allowed',
  });
}
