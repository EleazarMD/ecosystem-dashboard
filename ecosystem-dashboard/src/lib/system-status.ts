/**
 * System Status Data Provider for AI Homelab Ecosystem Dashboard
 * 
 * Implements standardized status monitoring following AI Homelab Ecosystem
 * Communication Standards v2.5 and Platform Control Group specifications.
 */

import { SystemStatusData, SystemComponent } from '../components/dashboard/SystemStatusPanel';

/**
 * Transform raw monitoring data from the ecosystem into standardized SystemStatusData
 */
export function transformMonitoringData(rawData: any): SystemStatusData {
  // Extract components from raw data or use defaults
  const components = rawData?.components || getDefaultComponents();
  
  // Determine overall status based on component statuses
  const overallStatus = determineOverallStatus(components);
  
  return {
    overallStatus,
    components,
    lastUpdated: rawData?.timestamp || new Date().toISOString()
  };
}

/**
 * Get real component data from AHIS monitoring service
 * Throws error if monitoring data is unavailable
 */
export function getDefaultComponents(): SystemComponent[] {
  throw new Error('System status: Default/mock components deprecated - use real AHIS monitoring data');
}

/**
 * Determine the overall system status based on component statuses
 */
function determineOverallStatus(
  components: SystemComponent[]
): 'operational' | 'degraded' | 'critical' | 'unknown' {
  if (!components || components.length === 0) return 'unknown';
  
  const statuses = components.map(c => c.status);
  
  if (statuses.includes('critical')) return 'critical';
  if (statuses.includes('degraded')) return 'degraded';
  if (statuses.every(s => s === 'operational')) return 'operational';
  
  return 'degraded';
}

/**
 * Fetch real-time system status data from the monitoring API
 */
export async function fetchSystemStatus(): Promise<SystemStatusData> {
  try {
    // In a production environment, this would make an actual API call
    // For now, we'll use sample data to demonstrate the UI
    const response = await fetch('/api/system-status');
    const data = await response.json();
    return transformMonitoringData(data);
  } catch (error) {
    console.error('Error fetching system status:', error);
    // Return default data on error
    return {
      overallStatus: 'degraded',
      components: getDefaultComponents(),
      lastUpdated: new Date().toISOString()
    };
  }
}

/**
 * Initialize WebSocket connection for real-time system status updates
 */
export function initializeStatusWebSocket(
  onUpdate: (data: SystemStatusData) => void
): () => void {
  // This is a placeholder for WebSocket implementation
  // In a real implementation, this would connect to your WebSocket server
  
  // For demonstration, we'll simulate updates with an interval
  const intervalId = setInterval(() => {
    // Simulate random changes in system metrics
    const components = getDefaultComponents().map(component => {
      if (component.metrics) {
        if (component.metrics.cpuUsage !== undefined) {
          component.metrics.cpuUsage = Math.min(100, component.metrics.cpuUsage + (Math.random() * 10 - 5));
        }
        if (component.metrics.memoryUsage !== undefined) {
          component.metrics.memoryUsage = Math.min(100, component.metrics.memoryUsage + (Math.random() * 8 - 4));
        }
        if (component.metrics.responseTime !== undefined) {
          component.metrics.responseTime = Math.max(1, component.metrics.responseTime + (Math.random() * 20 - 10));
        }
      }
      
      // Randomly change status occasionally
      if (Math.random() < 0.05) {
        const statuses: ('operational' | 'degraded' | 'critical' | 'unknown')[] = 
          ['operational', 'degraded', 'critical', 'unknown'];
        component.status = statuses[Math.floor(Math.random() * statuses.length)];
      }
      
      return component;
    });
    
    onUpdate({
      overallStatus: determineOverallStatus(components),
      components,
      lastUpdated: new Date().toISOString()
    });
  }, 5000);
  
  // Return cleanup function
  return () => clearInterval(intervalId);
}
