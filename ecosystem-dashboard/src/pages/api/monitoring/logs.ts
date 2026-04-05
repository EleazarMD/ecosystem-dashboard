/**
 * Monitoring Logs API
 * Stores and retrieves system events, alerts, and thermal incidents
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';

interface LogEntry {
  id: string;
  timestamp: number;
  level: 'info' | 'warning' | 'error' | 'critical';
  category: 'thermal' | 'power' | 'vram' | 'process' | 'system';
  component: string;
  message: string;
  value?: number;
  threshold?: number;
}

interface LogsResponse {
  success: boolean;
  logs?: LogEntry[];
  error?: string;
  total?: number;
}

const LOGS_FILE = '/tmp/rtx-monitoring-logs.json';
const MAX_LOGS = 500;

let logs: LogEntry[] = [];

// Load logs from file
function loadLogs(): void {
  try {
    if (fs.existsSync(LOGS_FILE)) {
      const data = fs.readFileSync(LOGS_FILE, 'utf-8');
      logs = JSON.parse(data);
    }
  } catch (e) {
    logs = [];
  }
}

// Save logs to file
function saveLogs(): void {
  try {
    fs.writeFileSync(LOGS_FILE, JSON.stringify(logs));
  } catch (e) {
    console.error('[Logs] Failed to save:', e);
  }
}

// Add a log entry
function addLog(entry: Omit<LogEntry, 'id' | 'timestamp'>): LogEntry {
  const newEntry: LogEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
  };
  
  logs.unshift(newEntry);
  
  if (logs.length > MAX_LOGS) {
    logs = logs.slice(0, MAX_LOGS);
  }
  
  if (logs.length % 5 === 0) {
    saveLogs();
  }
  
  return newEntry;
}

// Check current stats and generate alerts
async function checkAndLogAlerts(): Promise<void> {
  try {
    const response = await fetch('http://localhost:8404/api/monitoring/gpu-stats');
    const data = await response.json();
    
    if (!data.success) return;
    
    const now = Date.now();
    const recentLogs = logs.filter(l => now - l.timestamp < 60000); // Last minute
    
    // Check GPU temps
    for (const gpu of data.gpus || []) {
      const hasRecentTempAlert = recentLogs.some(
        l => l.component === `GPU ${gpu.id}` && l.category === 'thermal'
      );
      
      if (!hasRecentTempAlert) {
        if (gpu.temperature >= 90) {
          addLog({
            level: 'critical',
            category: 'thermal',
            component: `GPU ${gpu.id}`,
            message: `Critical temperature: ${gpu.temperature}°C`,
            value: gpu.temperature,
            threshold: 90,
          });
        } else if (gpu.temperature >= 85) {
          addLog({
            level: 'error',
            category: 'thermal',
            component: `GPU ${gpu.id}`,
            message: `High temperature: ${gpu.temperature}°C`,
            value: gpu.temperature,
            threshold: 85,
          });
        } else if (gpu.temperature >= 80) {
          addLog({
            level: 'warning',
            category: 'thermal',
            component: `GPU ${gpu.id}`,
            message: `Elevated temperature: ${gpu.temperature}°C`,
            value: gpu.temperature,
            threshold: 80,
          });
        }
      }
      
      // Check VRAM
      const vramPercent = (gpu.memoryUsedMB / gpu.memoryTotalMB) * 100;
      const hasRecentVramAlert = recentLogs.some(
        l => l.component === `GPU ${gpu.id}` && l.category === 'vram'
      );
      
      if (!hasRecentVramAlert && vramPercent >= 95) {
        addLog({
          level: 'warning',
          category: 'vram',
          component: `GPU ${gpu.id}`,
          message: `VRAM nearly full: ${vramPercent.toFixed(1)}%`,
          value: vramPercent,
          threshold: 95,
        });
      }
      
      // Check power
      const powerPercent = (gpu.powerDraw / gpu.powerLimit) * 100;
      const hasRecentPowerAlert = recentLogs.some(
        l => l.component === `GPU ${gpu.id}` && l.category === 'power'
      );
      
      if (!hasRecentPowerAlert && powerPercent >= 100) {
        addLog({
          level: 'warning',
          category: 'power',
          component: `GPU ${gpu.id}`,
          message: `At power limit: ${gpu.powerDraw.toFixed(0)}W`,
          value: gpu.powerDraw,
          threshold: gpu.powerLimit,
        });
      }
    }
    
    // Check CPU temp
    if (data.cpu?.temperature >= 85) {
      const hasRecentCpuAlert = recentLogs.some(
        l => l.component === 'CPU' && l.category === 'thermal'
      );
      
      if (!hasRecentCpuAlert) {
        addLog({
          level: data.cpu.temperature >= 90 ? 'critical' : 'warning',
          category: 'thermal',
          component: 'CPU',
          message: `High temperature: ${data.cpu.temperature}°C`,
          value: data.cpu.temperature,
          threshold: 85,
        });
      }
    }
  } catch (e) {
    // Silently fail
  }
}

// Initialize
loadLogs();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LogsResponse>
) {
  if (req.method === 'GET') {
    // Check for new alerts
    await checkAndLogAlerts();
    
    const { level, category, limit = '100' } = req.query;
    
    let filteredLogs = [...logs];
    
    if (level) {
      filteredLogs = filteredLogs.filter(l => l.level === level);
    }
    
    if (category) {
      filteredLogs = filteredLogs.filter(l => l.category === category);
    }
    
    const limitNum = Math.min(parseInt(limit as string) || 100, 500);
    
    return res.status(200).json({
      success: true,
      logs: filteredLogs.slice(0, limitNum),
      total: logs.length,
    });
  }
  
  if (req.method === 'POST') {
    // Add manual log entry
    const { level, category, component, message, value, threshold } = req.body;
    
    if (!level || !category || !component || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }
    
    const entry = addLog({ level, category, component, message, value, threshold });
    saveLogs();
    
    return res.status(200).json({
      success: true,
      logs: [entry],
    });
  }
  
  if (req.method === 'DELETE') {
    // Clear logs
    logs = [];
    saveLogs();
    
    return res.status(200).json({
      success: true,
      total: 0,
    });
  }
  
  return res.status(405).json({
    success: false,
    error: 'Method not allowed',
  });
}
