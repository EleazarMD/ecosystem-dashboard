/**
 * Singleton DashboardAIAgent Instance
 * Ensures single agent registration and global access
 */

import { DashboardAIAgent } from '../agents/DashboardAIAgent';

let dashboardAgentInstance: DashboardAIAgent | null = null;

/**
 * Get or create the singleton DashboardAIAgent instance
 */
export function getDashboardAgentInstance(): DashboardAIAgent {
  if (!dashboardAgentInstance) {
    console.log('🚀 Creating singleton DashboardAIAgent instance...');
    dashboardAgentInstance = new DashboardAIAgent();
  }
  
  return dashboardAgentInstance;
}

/**
 * Initialize the DashboardAIAgent for the application
 * Call this in _app.tsx or dashboard root to ensure registration
 */
export function initializeDashboardAgent(): void {
  // Simply getting the instance will trigger registration
  getDashboardAgentInstance();
  console.log('✅ DashboardAIAgent initialized and registered');
}

/**
 * Reset the singleton instance (mainly for testing)
 */
export function resetDashboardAgentInstance(): void {
  dashboardAgentInstance = null;
}
