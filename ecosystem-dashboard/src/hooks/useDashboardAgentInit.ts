/**
 * React Hook: Initialize DashboardAIAgent on App Startup
 * Ensures agent is registered and available in ADK UI
 */

import { useEffect, useState } from 'react';
import { getDashboardAgentInstance } from '../lib/dashboard-agent-instance';
import { DashboardAIAgent } from '../agents/DashboardAIAgent';

export function useDashboardAgentInit() {
  const [agent, setAgent] = useState<DashboardAIAgent | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const initializeAgent = async () => {
      try {
        console.log('🔌 Initializing DashboardAIAgent...');
        
        // Get singleton instance (triggers auto-registration)
        const agentInstance = getDashboardAgentInstance();
        
        if (mounted) {
          setAgent(agentInstance);
          
          // Wait a moment for registration to complete
          setTimeout(() => {
            if (mounted) {
              const status = agentInstance.getRegistrationStatus();
              setIsRegistered(status.isRegistered);
              console.log('✅ DashboardAIAgent ready:', {
                registered: status.isRegistered,
                capabilities: status.capabilities.length,
                model: status.metadata.model,
                layers: status.metadata.layers,
                sub_agents: status.metadata.sub_agents,
                tools: status.metadata.tools
              });
              
              // Verify it will appear in Agentic Control Dashboard
              console.log('🎯 Agent should now be visible in Agentic Control Dashboard at: /agentic-control');
              console.log('🔍 Agent Details for ADK UI:');
              console.log('   - ID: dashboard_ai_coordinator');
              console.log('   - Name: Dashboard AI Coordinator');
              console.log('   - Type: dashboard-ai');
              console.log('   - Version: 2.1.0');
              console.log('   - Intelligence Layers: 3');
            }
          }, 1000);
        }
        
      } catch (err) {
        console.error('❌ Failed to initialize DashboardAIAgent:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      }
    };

    initializeAgent();

    return () => {
      mounted = false;
    };
  }, []);

  return {
    agent,
    isRegistered,
    error,
    isReady: agent !== null && isRegistered
  };
}
