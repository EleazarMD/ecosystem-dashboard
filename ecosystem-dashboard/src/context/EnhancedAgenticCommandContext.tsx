import React, { createContext, useContext, useState, ReactNode, useCallback, useRef, useEffect } from 'react';
import { useMCP } from '@/hooks/useMCP';
import { useSystemStatus } from './SystemStatusContext';
import { useActivityFeed } from './ActivityFeedContext';
import logger from '../lib/logger';

interface CommandResult {
  id: string;
  query: string;
  response: any;
  timestamp: Date;
  executionTime: number;
  confidence: number;
  context: string;
  actions?: string[];
}

interface AgentContext {
  services: any[];
  activities: any[];
  currentPage: string;
  userPreferences: any;
}

interface EnhancedAgenticCommandContextType {
  response: any;
  loading: boolean;
  error: string | null;
  confidence: number | null;
  executionTime: number | null;
  commandHistory: CommandResult[];
  agentContext: AgentContext;
  executeQuery: (query: string, context?: Partial<AgentContext>) => Promise<void>;
  executeAction: (action: string) => Promise<void>;
  clearHistory: () => void;
  getContextualSuggestions: () => Promise<string[]>;
}

export const EnhancedAgenticCommandContext = createContext<EnhancedAgenticCommandContextType>({
  response: null,
  loading: false,
  error: null,
  confidence: null,
  executionTime: null,
  commandHistory: [],
  agentContext: { services: [], activities: [], currentPage: '', userPreferences: {} },
  executeQuery: async () => console.warn('EnhancedAgenticCommandProvider not found'),
  executeAction: async () => console.warn('EnhancedAgenticCommandProvider not found'),
  clearHistory: () => console.warn('EnhancedAgenticCommandProvider not found'),
  getContextualSuggestions: async () => [],
});

export const useEnhancedAgenticCommand = () => useContext(EnhancedAgenticCommandContext);

interface EnhancedAgenticCommandProviderProps {
  children: ReactNode;
}

export const EnhancedAgenticCommandProvider: React.FC<EnhancedAgenticCommandProviderProps> = ({ 
  children 
}) => {
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [commandHistory, setCommandHistory] = useState<CommandResult[]>([]);
  
  const { kg_query, kg_reason } = useMCP();
  const { services } = useSystemStatus();
  const { activities } = useActivityFeed();
  
  const startTimeRef = useRef<number>(0);

  // Build agent context from current system state
  const agentContext: AgentContext = {
    services,
    activities: activities.slice(0, 10), // Recent activities only
    currentPage: typeof window !== 'undefined' ? window.location.pathname : '',
    userPreferences: {
      // Could be expanded to include user settings
      preferredResponseFormat: 'detailed',
      showConfidenceScores: true,
      enableProactiveAlerts: true
    }
  };

  const enhanceQueryWithContext = useCallback((
    query: string, 
    context?: Partial<AgentContext>
  ): string => {
    const fullContext = { ...agentContext, ...context };
    
    // Add system context to the query
    const contextInfo = [
      `Current page: ${fullContext.currentPage}`,
      `Active services: ${fullContext.services.length}`,
      `Recent activities: ${fullContext.activities.length}`,
      `System health: ${getSystemHealthSummary(fullContext.services)}`
    ].join(' | ');

    return `${query}

SYSTEM CONTEXT: ${contextInfo}

Please provide a response that:
1. Is contextually aware of the current system state
2. Includes actionable recommendations when appropriate
3. Considers the user's current page/workflow
4. Provides confidence estimates for predictions`;
  }, [agentContext]);

  const getSystemHealthSummary = (services: any[]): string => {
    const healthy = services.filter(s => s.status === 'healthy' || s.status === 'running').length;
    const total = services.length;
    return total > 0 ? `${Math.round((healthy / total) * 100)}%` : 'N/A';
  };

  const executeQuery = useCallback(async (
    query: string, 
    context?: Partial<AgentContext>
  ) => {
    setLoading(true);
    setError(null);
    setResponse(null);
    setConfidence(null);
    setExecutionTime(null);
    
    startTimeRef.current = performance.now();
    
    try {
      logger.info(`[EnhancedAgenticCommand] Executing query: ${query}`);
      
      const enhancedQuery = enhanceQueryWithContext(query, context);
      
      // Try KG reasoning first for complex queries, fallback to simple query
      let result;
      let queryConfidence = 0.7;
      
      if (query.toLowerCase().includes('why') || 
          query.toLowerCase().includes('how') ||
          query.toLowerCase().includes('recommend') ||
          query.toLowerCase().includes('suggest')) {
        
        // Use reasoning for analytical queries
        result = await kg_reason({ 
          question: enhancedQuery, 
          context: JSON.stringify(agentContext)
        });
        queryConfidence = 0.85;
        
      } else {
        // Use direct query for factual requests
        result = await kg_query({ 
          query: enhancedQuery, 
          output_format: 'inline'
        });
      }
      
      const endTime = performance.now();
      const execTime = Math.round(endTime - startTimeRef.current);
      
      logger.info('[EnhancedAgenticCommand] Received response:', result);
      
      // Process and enhance the response
      let processedResponse = result;
      let responseConfidence = queryConfidence;
      
      if (result && typeof result === 'object') {
        // Extract response data and confidence if available
        if ('result' in result) {
          processedResponse = result.result;
        } else if ('answer' in result) {
          processedResponse = result.answer;
        }
        
        // Try to extract confidence from AI response
        if ('confidence' in result && typeof result.confidence === 'number') {
          responseConfidence = result.confidence;
        }
      }
      
      // Extract potential actions from the response
      const actions = extractActionsFromResponse(processedResponse);
      
      // Store in command history
      const commandResult: CommandResult = {
        id: `cmd_${Date.now()}`,
        query,
        response: processedResponse,
        timestamp: new Date(),
        executionTime: execTime,
        confidence: responseConfidence,
        context: JSON.stringify(agentContext, null, 2),
        actions
      };
      
      setCommandHistory(prev => [commandResult, ...prev.slice(0, 19)]); // Keep last 20
      setResponse(processedResponse);
      setConfidence(responseConfidence);
      setExecutionTime(execTime);
      
    } catch (err: any) {
      const execTime = Math.round(performance.now() - startTimeRef.current);
      
      logger.error('[EnhancedAgenticCommand] Error executing query:', err);
      setError(err.message || 'An unknown error occurred.');
      setExecutionTime(execTime);
      
      // Store failed command in history
      const failedResult: CommandResult = {
        id: `cmd_${Date.now()}`,
        query,
        response: null,
        timestamp: new Date(),
        executionTime: execTime,
        confidence: 0,
        context: JSON.stringify(agentContext, null, 2)
      };
      
      setCommandHistory(prev => [failedResult, ...prev.slice(0, 19)]);
      
    } finally {
      setLoading(false);
    }
  }, [kg_query, kg_reason, agentContext, enhanceQueryWithContext]);

  const executeAction = useCallback(async (action: string) => {
    logger.info(`[EnhancedAgenticCommand] Executing action: ${action}`);
    
    // This would be expanded to handle specific actions like:
    // - Restarting services
    // - Scaling resources
    // - Running diagnostics
    // - Updating configurations
    
    try {
      setLoading(true);
      
      // For now, simulate action execution
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In real implementation, this would call appropriate APIs
      switch (action.toLowerCase()) {
        case 'restart_services':
          // Call service restart API
          console.log('Restarting failed services...');
          break;
        case 'optimize_resources':
          // Call resource optimization API
          console.log('Optimizing resource allocation...');
          break;
        case 'run_diagnostics':
          // Call diagnostic API
          console.log('Running system diagnostics...');
          break;
        default:
          console.log(`Unknown action: ${action}`);
      }
      
      // Execute a follow-up query to show results
      await executeQuery(`Show the results of ${action}`);
      
    } catch (err) {
      logger.error(`[EnhancedAgenticCommand] Error executing action ${action}:`, err);
      setError(`Failed to execute action: ${action}`);
    } finally {
      setLoading(false);
    }
  }, [executeQuery]);

  const extractActionsFromResponse = (response: any): string[] => {
    const actions: string[] = [];
    
    if (typeof response === 'string') {
      // Look for action suggestions in the response text
      const actionPatterns = [
        /restart.*service/gi,
        /optimize.*resource/gi,
        /check.*status/gi,
        /update.*config/gi,
        /run.*diagnostic/gi,
        /scale.*up|down/gi
      ];
      
      actionPatterns.forEach(pattern => {
        const matches = response.match(pattern);
        if (matches) {
          actions.push(...matches);
        }
      });
    }
    
    return actions.slice(0, 5); // Limit to 5 actions
  };

  const getContextualSuggestions = useCallback(async (): Promise<string[]> => {
    const suggestions: string[] = [];
    
    // Generate suggestions based on current context
    const unhealthyServices = services.filter(s => 
      s.status !== 'OPERATIONAL' && s.status !== 'DEGRADED'
    );
    
    const recentErrors = activities.filter(a => a.type === 'error').length;
    
    if (unhealthyServices.length > 0) {
      suggestions.push(
        `Check status of ${unhealthyServices[0].name}`,
        'Restart failed services',
        'Show service health report'
      );
    }
    
    if (recentErrors > 0) {
      suggestions.push(
        'Analyze recent error patterns',
        'Show error log summary',
        'Recommend troubleshooting steps'
      );
    }
    
    // Add general suggestions based on current page
    const currentPage = agentContext.currentPage;
    
    if (currentPage.includes('/kubernetes')) {
      suggestions.push(
        'Show Kubernetes cluster status',
        'List unhealthy pods',
        'Check resource utilization'
      );
    } else if (currentPage.includes('/documentation')) {
      suggestions.push(
        'Scan for new documentation',
        'Update knowledge graph',
        'Show document statistics'
      );
    } else {
      // Dashboard home page
      suggestions.push(
        'Generate system health report',
        'Show performance trends',
        'List optimization opportunities'
      );
    }
    
    return suggestions.slice(0, 6);
  }, [services, activities, agentContext]);

  const clearHistory = useCallback(() => {
    setCommandHistory([]);
    setResponse(null);
    setError(null);
    setConfidence(null);
    setExecutionTime(null);
  }, []);

  const value = {
    response,
    loading,
    error,
    confidence,
    executionTime,
    commandHistory,
    agentContext,
    executeQuery,
    executeAction,
    clearHistory,
    getContextualSuggestions,
  };

  return (
    <EnhancedAgenticCommandContext.Provider value={value}>
      {children}
    </EnhancedAgenticCommandContext.Provider>
  );
};
