/**
 * GPU Stats API Endpoint
 * Fetches real-time GPU metrics from RTX Workstation via SSH
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface GPUProcess {
  pid: number;
  name: string;
  memoryMB: number;
}

interface GPUStats {
  id: number;
  name: string;
  temperature: number;
  utilization: number;
  memoryUsedMB: number;
  memoryTotalMB: number;
  memoryFreeMB: number;
  powerDraw: number;
  powerLimit: number;
  fanSpeed: number;
  processes: GPUProcess[];
}

interface CPUStats {
  temperature: number;
  loadAverage: number[];
  utilization: number;
  cores: number;
}

interface GPUStatsResponse {
  success: boolean;
  timestamp: string;
  hostname: string;
  driverVersion: string;
  cudaVersion: string;
  gpus: GPUStats[];
  cpu?: CPUStats;
  error?: string;
}

// Configuration - detect if running locally on RTX Workstation
const IS_LOCAL = process.env.HOSTNAME === 'RTX-Workstation' || 
                 require('os').hostname() === 'RTX-Workstation' ||
                 process.env.RUN_GPU_STATS_LOCAL === 'true';

// SSH configuration for remote access (fallback)
const SSH_HOST = 'RTX-Workstation';
const SSH_KEY = '~/.ssh/id_workstation';
const SSH_TIMEOUT = 10000; // 10 seconds

async function executeCommand(command: string): Promise<string> {
  try {
    if (IS_LOCAL) {
      // Run locally - no SSH needed
      const { stdout } = await execAsync(command, { timeout: SSH_TIMEOUT });
      return stdout.trim();
    } else {
      // Run via SSH
      const sshCommand = `ssh -i ${SSH_KEY} -o ConnectTimeout=5 -o StrictHostKeyChecking=no ${SSH_HOST} "${command}"`;
      const { stdout } = await execAsync(sshCommand, { timeout: SSH_TIMEOUT });
      return stdout.trim();
    }
  } catch (error: any) {
    throw new Error(`Command failed: ${error.message}`);
  }
}

async function getGPUStats(): Promise<GPUStatsResponse> {
  // Get comprehensive GPU stats using nvidia-smi
  const nvidiaSmiQuery = `nvidia-smi --query-gpu=index,name,temperature.gpu,utilization.gpu,memory.used,memory.total,memory.free,power.draw,power.limit,fan.speed --format=csv,noheader,nounits`;
  const nvidiaSmiOutput = await executeCommand(nvidiaSmiQuery);
  
  // Get driver and CUDA version
  const versionQuery = `nvidia-smi --query-gpu=driver_version --format=csv,noheader | head -1`;
  const driverVersion = await executeCommand(versionQuery);
  
  // Get hostname
  const hostname = await executeCommand('hostname');
  
  // Get process info
  const processQuery = `nvidia-smi --query-compute-apps=gpu_uuid,pid,process_name,used_memory --format=csv,noheader,nounits 2>/dev/null || echo ""`;
  const processOutput = await executeCommand(processQuery);
  
  // Parse GPU stats
  const gpuLines = nvidiaSmiOutput.split('\n').filter(line => line.trim());
  const gpus: GPUStats[] = gpuLines.map(line => {
    const parts = line.split(',').map(p => p.trim());
    return {
      id: parseInt(parts[0]) || 0,
      name: parts[1] || 'Unknown GPU',
      temperature: parseInt(parts[2]) || 0,
      utilization: parseInt(parts[3]) || 0,
      memoryUsedMB: parseInt(parts[4]) || 0,
      memoryTotalMB: parseInt(parts[5]) || 0,
      memoryFreeMB: parseInt(parts[6]) || 0,
      powerDraw: parseFloat(parts[7]) || 0,
      powerLimit: parseFloat(parts[8]) || 0,
      fanSpeed: parseInt(parts[9]) || 0,
      processes: []
    };
  });
  
  // Parse process info and assign to GPUs
  if (processOutput) {
    const processLines = processOutput.split('\n').filter(line => line.trim());
    processLines.forEach(line => {
      const parts = line.split(',').map(p => p.trim());
      if (parts.length >= 4) {
        const process: GPUProcess = {
          pid: parseInt(parts[1]) || 0,
          name: parts[2] || 'Unknown',
          memoryMB: parseInt(parts[3]) || 0
        };
        // Assign to first GPU for now (could be improved with UUID matching)
        // For simplicity, we'll fetch per-GPU process info separately
      }
    });
  }
  
  // Get per-GPU process info using pmon
  const pmonQuery = `nvidia-smi pmon -c 1 -s m 2>/dev/null | grep -v "^#" | awk '{print $1, $2, $4, $NF}'`;
  const pmonOutput = await executeCommand(pmonQuery);
  
  if (pmonOutput) {
    const pmonLines = pmonOutput.split('\n').filter(line => line.trim());
    pmonLines.forEach(line => {
      const parts = line.split(/\s+/);
      if (parts.length >= 4) {
        const gpuId = parseInt(parts[0]);
        const pid = parseInt(parts[1]);
        const memMB = parseInt(parts[2]) || 0;
        const name = parts[3] || 'Unknown';
        
        const gpu = gpus.find(g => g.id === gpuId);
        if (gpu && pid > 0) {
          gpu.processes.push({ pid, name, memoryMB: memMB });
        }
      }
    });
  }
  
  // Get CPU stats
  let cpu: CPUStats | undefined;
  try {
    const cpuTempQuery = `sensors 2>/dev/null | grep -iE 'tctl|tdie|package id 0' | head -1 | grep -oP '[+][0-9.]+' | tr -d '+' || cat /sys/class/thermal/thermal_zone*/temp 2>/dev/null | head -1 | awk '{print $1/1000}' || echo '0'`;
    const cpuTemp = await executeCommand(cpuTempQuery);
    
    const loadQuery = `cat /proc/loadavg | awk '{print $1, $2, $3}'`;
    const loadOutput = await executeCommand(loadQuery);
    const loadAverage = loadOutput.split(' ').map(v => parseFloat(v) || 0);
    
    const coresQuery = `nproc`;
    const cores = parseInt(await executeCommand(coresQuery)) || 1;
    
    // Calculate CPU utilization from load average
    const utilization = Math.min(100, (loadAverage[0] / cores) * 100);
    
    cpu = {
      temperature: parseFloat(cpuTemp) || 0,
      loadAverage,
      utilization: Math.round(utilization * 10) / 10,
      cores
    };
  } catch (e) {
    console.error('Failed to get CPU stats:', e);
  }
  
  return {
    success: true,
    timestamp: new Date().toISOString(),
    hostname,
    driverVersion: driverVersion.trim(),
    cudaVersion: '13.0',
    gpus,
    cpu
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GPUStatsResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      timestamp: new Date().toISOString(),
      hostname: '',
      driverVersion: '',
      cudaVersion: '',
      gpus: [],
      error: 'Method not allowed'
    });
  }

  try {
    const stats = await getGPUStats();
    res.status(200).json(stats);
  } catch (error: any) {
    console.error('GPU stats error:', error);
    res.status(500).json({
      success: false,
      timestamp: new Date().toISOString(),
      hostname: 'RTX-Workstation',
      driverVersion: '',
      cudaVersion: '',
      gpus: [],
      error: error.message || 'Failed to fetch GPU stats'
    });
  }
}
