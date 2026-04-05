/**
 * API endpoint for system health metrics time-series data
 * Provides CPU, memory, and disk usage metrics over time
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Cache metrics for performance
const CACHE_DURATION = 10000; // 10 seconds
let metricsCache: any = null;
let lastCacheTime = 0;

// Interface for time-series data points
interface TimeSeriesDataPoint {
  timestamp: string;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
}

interface MemoryInfo {
  totalMB: number;
  usedMB: number;
  freeMB: number;
  availableMB: number;
  swapTotalMB: number;
  swapUsedMB: number;
  swapFreeMB: number;
  usagePercent: number;
  swapUsagePercent: number;
}

// Generate historical data for the demo (last 24 hours with 1-hour intervals)
function generateHistoricalData(): TimeSeriesDataPoint[] {
  const data: TimeSeriesDataPoint[] = [];
  const now = new Date();
  
  // Generate 24 data points (one for each hour)
  for (let i = 24; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 3600000); // i hours ago
    
    // Create semi-realistic patterns
    // CPU: Higher during work hours (9am-5pm), lower at night
    // Memory: Gradually increases during the day, drops after maintenance/restarts
    // Disk: Slowly increases over time
    
    const hour = timestamp.getHours();
    const isDaytime = hour >= 9 && hour <= 17;
    
    const cpuBase = isDaytime ? 40 : 20;
    const cpuVariation = Math.random() * 15;
    const cpuUsage = Math.min(Math.max(cpuBase + cpuVariation - (i % 4) * 3, 5), 95);
    
    const memoryBase = 45;
    const memoryGrowth = (24 - i) * 0.3; // Gradually increases
    const memoryDrop = i % 8 === 0 ? 10 : 0; // Drop every 8 hours (simulated restarts)
    const memoryUsage = Math.min(Math.max(memoryBase + memoryGrowth - memoryDrop + (Math.random() * 8), 15), 90);
    
    const diskBase = 62;
    const diskGrowth = (24 - i) * 0.1; // Slowly increases
    const diskUsage = Math.min(diskBase + diskGrowth + (Math.random() * 2), 95);
    
    data.push({
      timestamp: timestamp.toISOString(),
      cpuUsage: parseFloat(cpuUsage.toFixed(1)),
      memoryUsage: parseFloat(memoryUsage.toFixed(1)),
      diskUsage: parseFloat(diskUsage.toFixed(1))
    });
  }
  
  return data;
}

/**
 * Get real memory info from /proc/meminfo
 */
async function getMemoryInfo(): Promise<MemoryInfo> {
  try {
    const { stdout } = await execAsync("cat /proc/meminfo");
    const lines = stdout.split('\n');
    const getValue = (key: string): number => {
      const line = lines.find(l => l.startsWith(key));
      return line ? Math.round(parseInt(line.split(/\s+/)[1]) / 1024) : 0; // kB -> MB
    };
    const totalMB = getValue('MemTotal:');
    const freeMB = getValue('MemFree:');
    const availableMB = getValue('MemAvailable:');
    const buffersMB = getValue('Buffers:');
    const cachedMB = getValue('Cached:');
    const swapTotalMB = getValue('SwapTotal:');
    const swapFreeMB = getValue('SwapFree:');
    const usedMB = totalMB - availableMB;
    const swapUsedMB = swapTotalMB - swapFreeMB;
    return {
      totalMB,
      usedMB,
      freeMB,
      availableMB,
      swapTotalMB,
      swapUsedMB,
      swapFreeMB,
      usagePercent: parseFloat(((usedMB / totalMB) * 100).toFixed(1)),
      swapUsagePercent: swapTotalMB > 0 ? parseFloat(((swapUsedMB / swapTotalMB) * 100).toFixed(1)) : 0,
    };
  } catch {
    const totalMB = Math.round(os.totalmem() / 1024 / 1024);
    const freeMB = Math.round(os.freemem() / 1024 / 1024);
    const usedMB = totalMB - freeMB;
    return {
      totalMB, usedMB, freeMB, availableMB: freeMB,
      swapTotalMB: 0, swapUsedMB: 0, swapFreeMB: 0,
      usagePercent: parseFloat(((usedMB / totalMB) * 100).toFixed(1)),
      swapUsagePercent: 0,
    };
  }
}

/**
 * Get current system metrics from OS
 */
async function getCurrentSystemMetrics(): Promise<{
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  memory: MemoryInfo;
}> {
  // Get real memory from /proc/meminfo
  const memory = await getMemoryInfo();

  // Get CPU load average and normalize to percentage
  const cpuInfo = os.cpus();
  const numCores = cpuInfo.length;
  const loadAvg = os.loadavg()[0];
  const cpuUsage = parseFloat(Math.min((loadAvg / numCores) * 100, 100).toFixed(1));

  // Get disk usage
  let diskUsage = 36.0;
  try {
    if (process.platform === 'darwin' || process.platform === 'linux') {
      const { stdout } = await execAsync("df / | awk 'NR==2 {print $5}'");
      diskUsage = parseFloat(stdout.trim().replace('%', ''));
    }
  } catch (error) {
    console.error('Error getting disk usage:', error);
  }

  return {
    cpuUsage,
    memoryUsage: memory.usagePercent,
    diskUsage,
    memory,
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
    const currentMetrics = await getCurrentSystemMetrics();
    
    // Get historical data
    const historicalData = generateHistoricalData();
    
    // Add current metrics to the data
    const currentDataPoint: TimeSeriesDataPoint = {
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
    console.error('Error fetching system metrics:', error);
    res.status(500).json({ error: 'Failed to fetch system metrics' });
  }
}
