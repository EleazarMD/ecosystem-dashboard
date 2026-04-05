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

async function investigateServiceDown(service: string): Promise<any> {
  const findings: any = {
    service,
    checks: {},
  };
  
  try {
    // Check container status
    const { stdout: status } = await execAsync(`docker inspect ${service} --format '{{.State.Status}}'`);
    findings.checks.status = status.trim();
    
    // Get exit code if stopped
    if (status.trim() !== 'running') {
      const { stdout: exitCode } = await execAsync(`docker inspect ${service} --format '{{.State.ExitCode}}'`);
      findings.checks.exitCode = parseInt(exitCode.trim());
    }
    
    // Get recent logs
    const { stdout: logs } = await execAsync(`docker logs ${service} --tail 50 2>&1`);
    findings.checks.recentLogs = logs.split('\n').slice(-10);
    
    // Check restart count
    const { stdout: restartCount } = await execAsync(`docker inspect ${service} --format '{{.RestartCount}}'`);
    findings.checks.restartCount = parseInt(restartCount.trim());
    
  } catch (error) {
    findings.error = (error as Error).message;
  }
  
  return findings;
}

async function investigatePerformance(service: string): Promise<any> {
  const findings: any = {
    service,
    checks: {},
  };
  
  try {
    // Get resource usage
    const { stdout: stats } = await execAsync(`docker stats ${service} --no-stream --format "{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"`);
    const [cpu, mem, net, block] = stats.trim().split('\t');
    
    findings.checks.cpu = cpu;
    findings.checks.memory = mem;
    findings.checks.network = net;
    findings.checks.diskIO = block;
    
    // Get process list
    const { stdout: processes } = await execAsync(`docker top ${service}`);
    findings.checks.topProcesses = processes.split('\n').slice(0, 6);
    
    // Check for errors in logs
    const { stdout: errorLogs } = await execAsync(`docker logs ${service} --tail 100 2>&1 | grep -i error | tail -5`);
    findings.checks.recentErrors = errorLogs.split('\n').filter(line => line);
    
  } catch (error) {
    findings.error = (error as Error).message;
  }
  
  return findings;
}

async function investigateResourceExhaustion(service?: string): Promise<any> {
  const findings: any = {
    checks: {},
  };
  
  try {
    if (service) {
      // Container-specific investigation
      const { stdout: stats } = await execAsync(`docker stats ${service} --no-stream --format "{{.MemPerc}}\t{{.MemUsage}}"`);
      findings.checks.containerMemory = stats.trim();
    }
    
    // System-wide checks
    const { stdout: memInfo } = await execAsync('free -h');
    findings.checks.systemMemory = memInfo;
    
    const { stdout: diskInfo } = await execAsync('df -h /');
    findings.checks.diskSpace = diskInfo;
    
    // Check for large files/directories
    const { stdout: largeFiles } = await execAsync('du -sh /var/lib/docker/* 2>/dev/null | sort -rh | head -5');
    findings.checks.largestDockerDirs = largeFiles.split('\n').filter(line => line);
    
  } catch (error) {
    findings.error = (error as Error).message;
  }
  
  return findings;
}

async function createTicketForIncident(incident: any): Promise<string | null> {
  try {
    const ticketData = {
      title: incident.title,
      description: `Incident ${incident.id}: ${incident.description}`,
      priority: incident.severity === 'critical' ? 'critical' : incident.severity === 'high' ? 'high' : 'medium',
      category: 'infrastructure',
      service_name: incident.service,
      tags: ['incident', incident.incident_type, incident.severity],
      created_by: 'incident-system',
      metadata: {
        incident_id: incident.id,
        incident_type: incident.incident_type,
        detected_at: incident.detected_at,
      },
    };
    
    const result = await pool.query(
      `INSERT INTO homelab_tickets 
       (title, description, priority, category, service_name, tags, created_by, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        ticketData.title,
        ticketData.description,
        ticketData.priority,
        ticketData.category,
        ticketData.service_name,
        ticketData.tags,
        ticketData.created_by,
        JSON.stringify(ticketData.metadata),
      ]
    );
    
    return result.rows[0].id;
  } catch (error) {
    console.error('[Incident Investigation] Failed to create ticket:', error);
    return null;
  }
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
    const { incidentId, createTicket = false } = req.body;
    
    if (!incidentId) {
      return res.status(400).json({ error: 'Incident ID is required' });
    }
    
    // Get incident details
    const incidentResult = await pool.query(
      'SELECT * FROM homelab_incidents WHERE id = $1',
      [incidentId]
    );
    
    if (incidentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Incident not found' });
    }
    
    const incident = incidentResult.rows[0];
    
    // Perform investigation based on incident type
    let findings: any = {};
    
    switch (incident.incident_type) {
      case 'service-down':
        findings = await investigateServiceDown(incident.service);
        break;
      case 'performance-degradation':
        findings = await investigatePerformance(incident.service);
        break;
      case 'resource-exhaustion':
        findings = await investigateResourceExhaustion(incident.service);
        break;
      default:
        findings = { message: 'No specific investigation available for this incident type' };
    }
    
    // Update incident with findings
    await pool.query(
      `UPDATE homelab_incidents 
       SET metadata = metadata || $1, status = 'investigating', updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify({ investigation: findings }), incidentId]
    );
    
    // Create ticket if requested
    let ticketId = null;
    if (createTicket) {
      ticketId = await createTicketForIncident(incident);
      if (ticketId) {
        await pool.query(
          'UPDATE homelab_incidents SET ticket_id = $1 WHERE id = $2',
          [ticketId, incidentId]
        );
      }
    }
    
    return res.status(200).json({
      incident: {
        ...incident,
        status: 'investigating',
      },
      findings,
      ticketId,
      investigatedAt: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('[Incident API] Investigation error:', error);
    return res.status(500).json({
      error: 'Investigation failed',
      message: (error as Error).message,
    });
  }
}
