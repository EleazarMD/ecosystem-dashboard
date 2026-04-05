/**
 * GPU Process Details API
 * Provides detailed process information with AI Gateway and OpenClaw correlation
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ProcessDetail {
  pid: number;
  name: string;
  command: string;
  gpuId: number;
  memoryMB: number;
  memoryPercent: number;
  gpuUtilization: number;
  cpuPercent: number;
  user: string;
  startTime: string;
  runtime: string;
  service?: string;
  model?: string;
  endpoint?: string;
}

interface AIGatewayMetrics {
  activeRequests: number;
  requestsPerSecond: number;
  avgLatency: number;
  models: Array<{
    name: string;
    requests: number;
    avgLatency: number;
  }>;
}

interface OpenClawMetrics {
  running: boolean;
  activeSessions: number;
  currentAgent?: string;
  lastActivity?: string;
}

interface ProcessDetailsResponse {
  success: boolean;
  processes?: ProcessDetail[];
  aiGateway?: AIGatewayMetrics;
  openClaw?: OpenClawMetrics;
  correlations?: Array<{
    processName: string;
    service: string;
    impact: string;
  }>;
  error?: string;
}

// Known process to service mappings
const PROCESS_SERVICE_MAP: Record<string, { service: string; model?: string; endpoint?: string }> = {
  'VLLM::EngineCor': { service: 'vLLM Inference', model: 'DeepSeek-R1', endpoint: '/v1/completions' },
  'vllm': { service: 'vLLM Inference', endpoint: '/v1/completions' },
  'tritonserver': { service: 'Triton Inference Server', endpoint: '/v2/models' },
  'python3': { service: 'Python Worker' },
  'python': { service: 'Python Worker' },
  'ollama': { service: 'Ollama', endpoint: '/api/generate' },
  'llamacpp': { service: 'llama.cpp Server' },
  'text-generation': { service: 'TGI Server' },
  'comfyui': { service: 'ComfyUI', endpoint: '/prompt' },
  'stable-diffusion': { service: 'Stable Diffusion' },
  'whisper': { service: 'Whisper ASR' },
  'openclaw': { service: 'OpenClaw Agent' },
};

async function getDetailedProcessInfo(gpuId?: number): Promise<ProcessDetail[]> {
  try {
    // Get detailed GPU process info using nvidia-smi
    const { stdout: gpuProcesses } = await execAsync(
      `nvidia-smi --query-compute-apps=pid,name,used_memory,gpu_uuid --format=csv,noheader,nounits 2>/dev/null || echo ""`
    );
    
    // Get GPU UUIDs to map to IDs
    const { stdout: gpuUuids } = await execAsync(
      `nvidia-smi --query-gpu=index,uuid --format=csv,noheader 2>/dev/null || echo ""`
    );
    
    const uuidToId: Record<string, number> = {};
    gpuUuids.trim().split('\n').filter(Boolean).forEach(line => {
      const [id, uuid] = line.split(',').map(s => s.trim());
      uuidToId[uuid] = parseInt(id);
    });
    
    const processes: ProcessDetail[] = [];
    
    for (const line of gpuProcesses.trim().split('\n').filter(Boolean)) {
      const parts = line.split(',').map(s => s.trim());
      if (parts.length < 4) continue;
      
      const [pidStr, name, memStr, uuid] = parts;
      const pid = parseInt(pidStr);
      const memoryMB = parseInt(memStr);
      const gpuIdFromUuid = uuidToId[uuid] ?? 0;
      
      // Skip if filtering by GPU and doesn't match
      if (gpuId !== undefined && gpuIdFromUuid !== gpuId) continue;
      
      // Get detailed process info from /proc
      let command = name;
      let user = 'unknown';
      let startTime = '';
      let cpuPercent = 0;
      
      try {
        const { stdout: psInfo } = await execAsync(
          `ps -p ${pid} -o user=,lstart=,%cpu=,args= 2>/dev/null || echo ""`
        );
        if (psInfo.trim()) {
          const match = psInfo.match(/^(\S+)\s+(.+?\d{4})\s+([\d.]+)\s+(.+)$/);
          if (match) {
            user = match[1];
            startTime = match[2];
            cpuPercent = parseFloat(match[3]);
            command = match[4].substring(0, 100);
          }
        }
      } catch (e) {
        // Process may have ended
      }
      
      // Calculate runtime
      let runtime = 'unknown';
      try {
        const { stdout: etimeStr } = await execAsync(
          `ps -p ${pid} -o etime= 2>/dev/null || echo ""`
        );
        runtime = etimeStr.trim() || 'unknown';
      } catch (e) {}
      
      // Get GPU utilization for this process (if available)
      let gpuUtilization = 0;
      try {
        const { stdout: pmonOutput } = await execAsync(
          `nvidia-smi pmon -c 1 -s u 2>/dev/null | grep "^\\s*${gpuIdFromUuid}\\s*${pid}" || echo ""`
        );
        if (pmonOutput.trim()) {
          const parts = pmonOutput.trim().split(/\s+/);
          if (parts.length >= 4) {
            gpuUtilization = parseInt(parts[3]) || 0;
          }
        }
      } catch (e) {}
      
      // Map to known service
      const serviceInfo = Object.entries(PROCESS_SERVICE_MAP).find(
        ([key]) => name.toLowerCase().includes(key.toLowerCase()) || 
                   command.toLowerCase().includes(key.toLowerCase())
      );
      
      // Get total GPU memory for percentage calculation
      let memoryPercent = 0;
      try {
        const { stdout: memTotal } = await execAsync(
          `nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits -i ${gpuIdFromUuid} 2>/dev/null || echo "0"`
        );
        const totalMB = parseInt(memTotal.trim()) || 1;
        memoryPercent = (memoryMB / totalMB) * 100;
      } catch (e) {}
      
      processes.push({
        pid,
        name,
        command,
        gpuId: gpuIdFromUuid,
        memoryMB,
        memoryPercent,
        gpuUtilization,
        cpuPercent,
        user,
        startTime,
        runtime,
        service: serviceInfo?.[1].service,
        model: serviceInfo?.[1].model,
        endpoint: serviceInfo?.[1].endpoint,
      });
    }
    
    // Sort by memory usage descending
    return processes.sort((a, b) => b.memoryMB - a.memoryMB);
  } catch (e) {
    console.error('Failed to get process details:', e);
    return [];
  }
}

async function getAIGatewayMetrics(): Promise<AIGatewayMetrics | undefined> {
  try {
    const response = await fetch('http://localhost:8777/admin/metrics/live', {
      headers: {
        'X-API-Key': process.env.AI_GATEWAY_ADMIN_KEY || 'ai-gateway-api-key-2024',
      },
      signal: AbortSignal.timeout(3000),
    });
    
    if (!response.ok) return undefined;
    
    const data = await response.json();
    return {
      activeRequests: data.active_connections || 0,
      requestsPerSecond: data.requests_per_second || 0,
      avgLatency: data.avg_latency || 0,
      models: Object.entries(data.request_breakdown || {}).map(([name, count]) => ({
        name,
        requests: count as number,
        avgLatency: data.avg_latency || 0,
      })),
    };
  } catch (e) {
    return undefined;
  }
}

async function getOpenClawMetrics(): Promise<OpenClawMetrics | undefined> {
  try {
    const response = await fetch('http://127.0.0.1:18789/api/status', {
      signal: AbortSignal.timeout(2000),
    });
    
    if (!response.ok) {
      return { running: false, activeSessions: 0 };
    }
    
    const data = await response.json();
    return {
      running: true,
      activeSessions: data.active_sessions || 0,
      currentAgent: data.current_agent,
      lastActivity: data.last_activity,
    };
  } catch (e) {
    return { running: false, activeSessions: 0 };
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ProcessDetailsResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  
  const gpuId = req.query.gpu !== undefined ? parseInt(req.query.gpu as string) : undefined;
  
  try {
    const [processes, aiGateway, openClaw] = await Promise.all([
      getDetailedProcessInfo(gpuId),
      getAIGatewayMetrics(),
      getOpenClawMetrics(),
    ]);
    
    // Build correlations
    const correlations: Array<{ processName: string; service: string; impact: string }> = [];
    
    for (const proc of processes) {
      if (proc.service) {
        let impact = 'Low';
        if (proc.memoryPercent > 50) impact = 'High';
        else if (proc.memoryPercent > 20) impact = 'Medium';
        
        correlations.push({
          processName: proc.name,
          service: proc.service,
          impact,
        });
      }
    }
    
    return res.status(200).json({
      success: true,
      processes,
      aiGateway,
      openClaw,
      correlations,
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      error: e instanceof Error ? e.message : 'Unknown error',
    });
  }
}
