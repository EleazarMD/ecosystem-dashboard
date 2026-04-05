import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  database: process.env.DATABASE_NAME || 'ecosystem_unified',
  user: process.env.DATABASE_USER || 'eleazar',
  password: process.env.DATABASE_PASSWORD || '',
});

const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || '';

interface IncidentDetection {
  id: string;
  type: string;
  service: string;
  severity: string;
  title: string;
  description: string;
  metadata: any;
}

async function detectServiceDownIncidents(): Promise<IncidentDetection[]> {
  const incidents: IncidentDetection[] = [];
  
  try {
    const { stdout } = await execAsync('docker ps --format "{{.Names}}\t{{.Status}}" --filter "status=exited"');
    const lines = stdout.trim().split('\n').filter(line => line);
    
    for (const line of lines) {
      const [name, status] = line.split('\t');
      if (name) {
        incidents.push({
          id: `INC-${Date.now()}-${name}`,
          type: 'service-down',
          service: name,
          severity: 'high',
          title: `Service ${name} is down`,
          description: `Container ${name} has exited. Status: ${status}`,
          metadata: { status, containerName: name },
        });
      }
    }
  } catch (error) {
    // No exited containers
  }
  
  return incidents;
}

async function detectPerformanceDegradation(): Promise<IncidentDetection[]> {
  const incidents: IncidentDetection[] = [];
  
  try {
    const { stdout } = await execAsync('docker stats --no-stream --format "{{.Name}}\t{{.CPUPerc}}\t{{.MemPerc}}"');
    const lines = stdout.trim().split('\n').filter(line => line);
    
    for (const line of lines) {
      const [name, cpu, mem] = line.split('\t');
      const cpuPercent = parseFloat(cpu.replace('%', ''));
      const memPercent = parseFloat(mem.replace('%', ''));
      
      if (cpuPercent > 90) {
        incidents.push({
          id: `INC-${Date.now()}-${name}-cpu`,
          type: 'performance-degradation',
          service: name,
          severity: 'medium',
          title: `High CPU usage on ${name}`,
          description: `Container ${name} is using ${cpuPercent}% CPU`,
          metadata: { cpu: cpuPercent, mem: memPercent },
        });
      }
      
      if (memPercent > 90) {
        incidents.push({
          id: `INC-${Date.now()}-${name}-mem`,
          type: 'resource-exhaustion',
          service: name,
          severity: 'high',
          title: `High memory usage on ${name}`,
          description: `Container ${name} is using ${memPercent}% memory`,
          metadata: { cpu: cpuPercent, mem: memPercent },
        });
      }
    }
  } catch (error) {
    console.error('[Incident Detection] Performance check failed:', error);
  }
  
  return incidents;
}

async function detectDiskExhaustion(): Promise<IncidentDetection[]> {
  const incidents: IncidentDetection[] = [];
  
  try {
    const { stdout } = await execAsync('df -h / | tail -1');
    const parts = stdout.trim().split(/\s+/);
    const usagePercent = parseInt(parts[4].replace('%', ''));
    
    if (usagePercent > 85) {
      incidents.push({
        id: `INC-${Date.now()}-disk`,
        type: 'resource-exhaustion',
        service: 'system',
        severity: usagePercent > 95 ? 'critical' : 'high',
        title: `Disk space critically low`,
        description: `Root filesystem is ${usagePercent}% full`,
        metadata: { usage: usagePercent, filesystem: '/' },
      });
    }
  } catch (error) {
    console.error('[Incident Detection] Disk check failed:', error);
  }
  
  return incidents;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const serviceKey = req.headers['x-internal-service-key'] as string;
  if (!serviceKey || serviceKey !== INTERNAL_SERVICE_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { service, incidentTypes } = req.body;
    
    let allIncidents: IncidentDetection[] = [];
    
    // Run detection based on requested types
    const types = incidentTypes || ['service-down', 'performance-degradation', 'resource-exhaustion'];
    
    if (types.includes('service-down')) {
      const serviceDownIncidents = await detectServiceDownIncidents();
      allIncidents = allIncidents.concat(serviceDownIncidents);
    }
    
    if (types.includes('performance-degradation') || types.includes('resource-exhaustion')) {
      const perfIncidents = await detectPerformanceDegradation();
      allIncidents = allIncidents.concat(perfIncidents);
    }
    
    if (types.includes('resource-exhaustion')) {
      const diskIncidents = await detectDiskExhaustion();
      allIncidents = allIncidents.concat(diskIncidents);
    }
    
    // Filter by service if specified
    if (service) {
      allIncidents = allIncidents.filter(inc => inc.service === service);
    }
    
    // Store new incidents in database
    for (const incident of allIncidents) {
      await pool.query(
        `INSERT INTO homelab_incidents (id, incident_type, service, severity, status, title, description, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [
          incident.id,
          incident.type,
          incident.service,
          incident.severity,
          'open',
          incident.title,
          incident.description,
          JSON.stringify(incident.metadata),
        ]
      );
    }
    
    return res.status(200).json({
      incidents: allIncidents,
      count: allIncidents.length,
      detectedAt: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('[Incident API] Detection error:', error);
    return res.status(500).json({
      error: 'Incident detection failed',
      message: (error as Error).message,
    });
  }
}
