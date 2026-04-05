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

interface RunbookStep {
  name: string;
  action: string;
  params?: any;
  status?: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

async function executeServiceRestart(service: string): Promise<any> {
  try {
    await execAsync(`docker restart ${service}`);
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for restart
    
    const { stdout } = await execAsync(`docker inspect ${service} --format '{{.State.Status}}'`);
    const status = stdout.trim();
    
    return {
      success: status === 'running',
      status,
      message: status === 'running' ? `Service ${service} restarted successfully` : `Service ${service} failed to start`,
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

async function executeDatabaseRecovery(service: string): Promise<any> {
  // Placeholder for database recovery logic
  return {
    success: false,
    message: 'Database recovery not yet implemented',
    steps: [
      'Stop database service',
      'Check for corruption',
      'Restore from backup if needed',
      'Restart database',
      'Verify integrity',
    ],
  };
}

async function executeDiskCleanup(): Promise<any> {
  try {
    const results: any = {};
    
    // Clean Docker system
    const { stdout: dockerClean } = await execAsync('docker system prune -f');
    results.dockerCleanup = dockerClean;
    
    // Clean apt cache
    try {
      const { stdout: aptClean } = await execAsync('sudo apt-get clean');
      results.aptCleanup = aptClean;
    } catch (e) {
      results.aptCleanup = 'Skipped (requires sudo)';
    }
    
    // Get disk usage after cleanup
    const { stdout: diskUsage } = await execAsync('df -h / | tail -1');
    results.diskUsageAfter = diskUsage.trim();
    
    return {
      success: true,
      results,
      message: 'Disk cleanup completed',
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

async function executeMemoryPressure(service?: string): Promise<any> {
  try {
    const results: any = {};
    
    if (service) {
      // Get container memory stats
      const { stdout } = await execAsync(`docker stats ${service} --no-stream --format "{{.MemUsage}}"`);
      results.memoryUsage = stdout.trim();
      
      // Restart service to clear memory
      const restartResult = await executeServiceRestart(service);
      results.restart = restartResult;
    } else {
      // System-wide memory check
      const { stdout: memInfo } = await execAsync('free -h');
      results.memoryInfo = memInfo;
    }
    
    return {
      success: true,
      results,
      message: service ? `Memory pressure investigation for ${service}` : 'System memory check completed',
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

async function executeNetworkTroubleshoot(service: string): Promise<any> {
  try {
    const results: any = {};
    
    // Get container IP
    const { stdout: ip } = await execAsync(`docker inspect ${service} --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'`);
    results.containerIP = ip.trim();
    
    // Check if container is running
    const { stdout: status } = await execAsync(`docker inspect ${service} --format '{{.State.Status}}'`);
    results.status = status.trim();
    
    // Get network info
    const { stdout: networks } = await execAsync(`docker inspect ${service} --format '{{json .NetworkSettings.Networks}}'`);
    results.networks = JSON.parse(networks);
    
    return {
      success: true,
      results,
      message: `Network diagnostics for ${service} completed`,
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

async function executeSecurityLockdown(): Promise<any> {
  // Placeholder for security lockdown
  return {
    success: false,
    message: 'Security lockdown not yet implemented',
    steps: [
      'Disable external access',
      'Review recent authentication attempts',
      'Check for suspicious processes',
      'Enable additional logging',
      'Alert security team',
    ],
  };
}

const RUNBOOKS: Record<string, (params: any) => Promise<any>> = {
  'service-restart': (params) => executeServiceRestart(params.service),
  'database-recovery': (params) => executeDatabaseRecovery(params.service),
  'disk-cleanup': () => executeDiskCleanup(),
  'memory-pressure': (params) => executeMemoryPressure(params.service),
  'network-troubleshoot': (params) => executeNetworkTroubleshoot(params.service),
  'security-lockdown': () => executeSecurityLockdown(),
};

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
    const { runbook, service, incidentId, autoRemediate = false } = req.body;
    
    if (!runbook) {
      return res.status(400).json({ error: 'Runbook name is required' });
    }
    
    const runbookFn = RUNBOOKS[runbook];
    if (!runbookFn) {
      return res.status(404).json({ 
        error: 'Runbook not found',
        availableRunbooks: Object.keys(RUNBOOKS),
      });
    }
    
    // Execute runbook
    const startTime = Date.now();
    const result = await runbookFn({ service, autoRemediate });
    const executionTime = Date.now() - startTime;
    
    // Update incident if provided
    if (incidentId) {
      await pool.query(
        `UPDATE homelab_incidents 
         SET runbook_executed = $1, metadata = metadata || $2, updated_at = NOW()
         WHERE id = $3`,
        [
          runbook,
          JSON.stringify({ runbookResult: result, executionTime }),
          incidentId,
        ]
      );
    }
    
    return res.status(200).json({
      runbook,
      service,
      result,
      executionTime,
      executedAt: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('[Incident API] Runbook execution error:', error);
    return res.status(500).json({
      error: 'Runbook execution failed',
      message: (error as Error).message,
    });
  }
}
