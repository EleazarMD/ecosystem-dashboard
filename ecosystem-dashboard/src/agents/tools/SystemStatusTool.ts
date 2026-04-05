/**
 * System Status Tool - ADK/A2A Compliant
 * Provides real-time system health and metrics
 */

import { Tool, ToolContext } from '../ADKAgent';

export class SystemStatusTool implements Tool {
  name = 'system_status';
  description = 'Get current system health, status, metrics, service status, infrastructure health, system performance, alerts, and monitoring data. Use for questions about system status, health checks, service availability, performance metrics, and system monitoring.';
  
  input_schema = {
    type: 'object',
    properties: {
      component: {
        type: 'string',
        description: 'Specific component to check (optional)',
        enum: ['services', 'health', 'metrics', 'alerts']
      }
    }
  };

  output_schema = {
    type: 'object',
    properties: {
      status: { type: 'string' },
      services: { type: 'array' },
      health: { type: 'object' },
      metrics: { type: 'object' },
      alerts: { type: 'array' }
    }
  };

  private async fetchRealSystemData(): Promise<any> {
    try {
      // Use working dashboard monitoring APIs
      const [healthResponse, systemMetricsResponse, infrastructureResponse] = await Promise.all([
        fetch('/api/health').catch(() => null),
        fetch('/api/monitoring/system-metrics').catch(() => null),
        fetch('/api/infrastructure/services').catch(() => null)
      ]);

      let systemHealth = 'unknown';
      let metrics = { cpu: 0, memory: 0, disk: 0, network: 0 };
      let services = [];
      let uptime = 0;

      // Get health data
      if (healthResponse?.ok) {
        const healthData = await healthResponse.json();
        systemHealth = healthData.status || 'unknown';
        uptime = healthData.uptime || 0;
        
        // Extract metrics from health response
        if (healthData.components?.system) {
          metrics = {
            cpu: healthData.components.system.cpu || 0,
            memory: healthData.components.system.memory || 0,
            disk: healthData.components.system.disk || 0,
            network: healthData.components.system.network || 0
          };
        }
      }

      // Get detailed system metrics
      if (systemMetricsResponse?.ok) {
        const metricsData = await systemMetricsResponse.json();
        if (metricsData.current) {
          metrics = {
            cpu: metricsData.current.cpuUsage || metrics.cpu,
            memory: metricsData.current.memoryUsage || metrics.memory,
            disk: metricsData.current.diskUsage || metrics.disk,
            network: metricsData.current.networkUsage || metrics.network
          };
        }
      }

      // Get infrastructure services
      if (infrastructureResponse?.ok) {
        const servicesData = await infrastructureResponse.json();
        services = servicesData.services || [];
      }

      return {
        systemHealth,
        metrics,
        services,
        activeAlerts: [],
        uptime,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to fetch system data: ${error.message}`);
    }
  }

  async execute(context: ToolContext, parameters: { component?: string }): Promise<any> {
    // Always fetch real system data, never use dashboard context mock data
    try {
      const realSystemData = await this.fetchRealSystemData();
      
      const result = {
        status: 'success',
        timestamp: new Date().toISOString(),
        services: realSystemData.services,
        health: realSystemData.systemHealth,
        metrics: realSystemData.metrics,
        alerts: realSystemData.activeAlerts
      };

      // Filter by component if specified
      if (parameters.component) {
        switch (parameters.component) {
          case 'services':
            return { status: 'success', services: result.services };
          case 'health':
            return { status: 'success', health: result.health };
          case 'metrics':
            return { status: 'success', metrics: result.metrics };
          case 'alerts':
            return { status: 'success', alerts: result.alerts };
          default:
            return result;
        }
      }

      // Add to memory for future reference
      context.state.memoryEntities.push({
        id: `status-${Date.now()}`,
        type: 'system_status',
        content: result,
        timestamp: new Date(),
        importance: 0.8
      });

      return result;
    } catch (error) {
      return {
        status: 'error',
        message: `Failed to fetch real system data: ${error.message}`,
        timestamp: new Date().toISOString(),
        recommendation: 'Ensure monitoring APIs are accessible at /api/health, /api/metrics, and /api/services'
      };
    }
  }
}
