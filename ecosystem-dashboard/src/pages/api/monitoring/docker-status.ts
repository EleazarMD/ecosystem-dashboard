/**
 * Docker Container Status API
 * Returns real-time status of all Docker containers
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ContainerInfo {
  name: string;
  status: string;
  health: 'healthy' | 'unhealthy' | 'starting' | 'none';
  uptime: string;
  image: string;
  isUp: boolean;
}

interface DockerStatusResponse {
  success: boolean;
  containers: ContainerInfo[];
  totalUp: number;
  totalDown: number;
  totalUnhealthy: number;
  timestamp: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DockerStatusResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false, containers: [], totalUp: 0, totalDown: 0,
      totalUnhealthy: 0, timestamp: new Date().toISOString(),
      error: 'Method not allowed',
    });
  }

  try {
    const { stdout } = await execAsync(
      `docker ps -a --format '{{.Names}}|||{{.Status}}|||{{.Image}}'`,
      { timeout: 10000 }
    );

    const containers: ContainerInfo[] = stdout.trim().split('\n').filter(Boolean).map(line => {
      const [name, status, image] = line.split('|||');
      const isUp = status.toLowerCase().startsWith('up');
      
      let health: ContainerInfo['health'] = 'none';
      if (status.includes('(healthy)')) health = 'healthy';
      else if (status.includes('(unhealthy)')) health = 'unhealthy';
      else if (status.includes('(health: starting)')) health = 'starting';

      // Extract uptime from status string
      const uptimeMatch = status.match(/^Up (.+?)(\s*\(|$)/);
      const uptime = uptimeMatch ? uptimeMatch[1].trim() : status;

      return { name, status, health, uptime, image, isUp };
    });

    const totalUp = containers.filter(c => c.isUp).length;
    const totalDown = containers.filter(c => !c.isUp).length;
    const totalUnhealthy = containers.filter(c => c.health === 'unhealthy').length;

    return res.status(200).json({
      success: true,
      containers,
      totalUp,
      totalDown,
      totalUnhealthy,
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    return res.status(500).json({
      success: false,
      containers: [],
      totalUp: 0,
      totalDown: 0,
      totalUnhealthy: 0,
      timestamp: new Date().toISOString(),
      error: e.message,
    });
  }
}
