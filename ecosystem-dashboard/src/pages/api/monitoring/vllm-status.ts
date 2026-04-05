/**
 * vLLM Status API Endpoint
 * Fetches real-time vLLM service metrics from RTX Workstation
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface VLLMService {
  name: string;
  containerName: string;
  model: string;
  servedModelName: string;
  port: number;
  gpuId: number;
  status: 'running' | 'stopped' | 'error';
  uptime: string;
  health: 'healthy' | 'unhealthy' | 'unknown';
  metrics: {
    promptThroughput: number;
    generationThroughput: number;
    runningRequests: number;
    waitingRequests: number;
    kvCacheUsage: number;
    prefixCacheHitRate: number;
  } | null;
  lastActivity: string | null;
}

interface VLLMStatusResponse {
  success: boolean;
  timestamp: string;
  services: VLLMService[];
  error?: string;
}

const SSH_HOST = 'RTX-Workstation';
const SSH_KEY = '~/.ssh/id_workstation';
const SSH_TIMEOUT = 15000;

async function executeSSHCommand(command: string): Promise<string> {
  const sshCommand = `ssh -i ${SSH_KEY} -o ConnectTimeout=5 -o StrictHostKeyChecking=no ${SSH_HOST} "${command}"`;
  
  try {
    const { stdout } = await execAsync(sshCommand, { timeout: SSH_TIMEOUT });
    return stdout.trim();
  } catch (error: any) {
    throw new Error(`SSH command failed: ${error.message}`);
  }
}

async function getVLLMStatus(): Promise<VLLMStatusResponse> {
  const services: VLLMService[] = [];
  
  // Get docker container info for vLLM services
  const dockerQuery = `docker ps --filter "name=vllm" --format "{{.Names}}|{{.Status}}|{{.Ports}}"`;
  const dockerOutput = await executeSSHCommand(dockerQuery);
  
  const containers = dockerOutput.split('\n').filter(line => line.trim());
  
  for (const container of containers) {
    const [name, status, ports] = container.split('|');
    
    // Extract port from ports string (e.g., "0.0.0.0:8007->8000/tcp")
    const portMatch = ports?.match(/0\.0\.0\.0:(\d+)/);
    const port = portMatch ? parseInt(portMatch[1]) : 0;
    
    // Get container details
    const inspectQuery = `docker inspect ${name} --format '{{range .Config.Cmd}}{{.}} {{end}}'`;
    const cmdOutput = await executeSSHCommand(inspectQuery);
    
    // Parse model name from command
    const modelMatch = cmdOutput.match(/--model\s+(\S+)/);
    const model = modelMatch ? modelMatch[1] : 'Unknown';
    
    const servedNameMatch = cmdOutput.match(/--served-model-name\s+(\S+)/);
    const servedModelName = servedNameMatch ? servedNameMatch[1] : model.split('/').pop() || 'unknown';
    
    // Determine GPU ID based on container name or port
    let gpuId = 0;
    if (name.includes('qwen')) gpuId = 0;
    if (name.includes('ministral')) gpuId = 1;
    
    // Get latest metrics from logs
    const logsQuery = `docker logs --since 30s ${name} 2>&1 | grep -E "throughput|Running" | tail -1`;
    let metricsOutput = '';
    try {
      metricsOutput = await executeSSHCommand(logsQuery);
    } catch {
      metricsOutput = '';
    }
    
    // Parse metrics from log line
    let metrics: VLLMService['metrics'] = null;
    if (metricsOutput) {
      const promptMatch = metricsOutput.match(/prompt throughput:\s*([\d.]+)/i);
      const genMatch = metricsOutput.match(/generation throughput:\s*([\d.]+)/i);
      const runningMatch = metricsOutput.match(/Running:\s*(\d+)/i);
      const waitingMatch = metricsOutput.match(/Waiting:\s*(\d+)/i);
      const kvMatch = metricsOutput.match(/KV cache usage:\s*([\d.]+)%/i);
      const prefixMatch = metricsOutput.match(/Prefix cache hit rate:\s*([\d.]+)%/i);
      
      metrics = {
        promptThroughput: promptMatch ? parseFloat(promptMatch[1]) : 0,
        generationThroughput: genMatch ? parseFloat(genMatch[1]) : 0,
        runningRequests: runningMatch ? parseInt(runningMatch[1]) : 0,
        waitingRequests: waitingMatch ? parseInt(waitingMatch[1]) : 0,
        kvCacheUsage: kvMatch ? parseFloat(kvMatch[1]) : 0,
        prefixCacheHitRate: prefixMatch ? parseFloat(prefixMatch[1]) : 0
      };
    }
    
    // Check health endpoint
    let health: VLLMService['health'] = 'unknown';
    if (port > 0) {
      try {
        const healthQuery = `curl -s --max-time 2 -o /dev/null -w '%{http_code}' http://localhost:${port}/health`;
        const healthCode = await executeSSHCommand(healthQuery);
        health = healthCode === '200' ? 'healthy' : 'unhealthy';
      } catch {
        health = 'unhealthy';
      }
    }
    
    // Parse uptime from status
    const uptimeMatch = status?.match(/Up\s+(.+?)(?:\s+\(|$)/);
    const uptime = uptimeMatch ? uptimeMatch[1] : 'Unknown';
    
    // Get last activity timestamp
    const lastActivityQuery = `docker logs --since 5m ${name} 2>&1 | grep -E "POST|GET" | tail -1 | grep -oE "\\d{2}:\\d{2}:\\d{2}" | tail -1`;
    let lastActivity: string | null = null;
    try {
      const activityOutput = await executeSSHCommand(lastActivityQuery);
      if (activityOutput) {
        lastActivity = activityOutput;
      }
    } catch {
      // Ignore errors
    }
    
    services.push({
      name: servedModelName,
      containerName: name,
      model,
      servedModelName,
      port,
      gpuId,
      status: status?.includes('Up') ? 'running' : 'stopped',
      uptime,
      health,
      metrics,
      lastActivity
    });
  }
  
  return {
    success: true,
    timestamp: new Date().toISOString(),
    services
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<VLLMStatusResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      timestamp: new Date().toISOString(),
      services: [],
      error: 'Method not allowed'
    });
  }

  try {
    const status = await getVLLMStatus();
    res.status(200).json(status);
  } catch (error: any) {
    console.error('vLLM status error:', error);
    res.status(500).json({
      success: false,
      timestamp: new Date().toISOString(),
      services: [],
      error: error.message || 'Failed to fetch vLLM status'
    });
  }
}
