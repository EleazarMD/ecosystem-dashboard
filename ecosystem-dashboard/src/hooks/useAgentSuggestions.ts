import { useState, useEffect, useCallback } from 'react';
import { 
  FiActivity, 
  FiAlertTriangle, 
  FiTrendingUp, 
  FiSettings, 
  FiDatabase,
  FiCpu,
  FiHardDrive,
  FiWifi
} from 'react-icons/fi';
import { useSystemStatus } from '@/context/SystemStatusContext';
import { useActivityFeed } from '@/context/ActivityFeedContext';
import { useMCP } from './useMCP';

type SuggestionCategory = 'monitoring' | 'optimization' | 'troubleshooting' | 'analysis';
type SuggestionPriority = 'high' | 'medium' | 'low';

interface CommandSuggestion {
  text: string;
  icon: React.ElementType;
  category: SuggestionCategory;
  priority: SuggestionPriority;
  reasoning: string;
  confidence: number;
}

interface AgentSuggestionsState {
  suggestions: CommandSuggestion[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

interface AgentSuggestionsActions {
  refreshSuggestions: () => Promise<void>;
  executeSuggestion: (suggestion: CommandSuggestion) => Promise<void>;
  dismissSuggestion: (index: number) => void;
}

export const useAgentSuggestions = (): AgentSuggestionsState & AgentSuggestionsActions => {
  const [suggestions, setSuggestions] = useState<CommandSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const { services } = useSystemStatus();
  const { activities } = useActivityFeed();
  const { kg_reason } = useMCP();

  // Generate contextual suggestions based on system state
  const generateSuggestions = useCallback(async (): Promise<CommandSuggestion[]> => {
    const suggestions: CommandSuggestion[] = [];

    // Analyze system health
    const unhealthyServices = services.filter(service => 
      service.status !== 'healthy' && service.status !== 'running'
    );
    
    const highResourceServices = services.filter(service => 
      service.cpuUsage && service.cpuUsage > 80
    );

    const recentErrors = activities
      .filter(activity => activity.type === 'error')
      .slice(0, 5);

    // High priority suggestions based on critical issues
    if (unhealthyServices.length > 0) {
      suggestions.push({
        text: `Investigate ${unhealthyServices.length} unhealthy service(s): ${unhealthyServices.map(s => s.name).join(', ')}`,
        icon: FiAlertTriangle,
        category: 'troubleshooting',
        priority: 'high',
        reasoning: 'Critical services are not running properly',
        confidence: 0.95
      });

      suggestions.push({
        text: 'Restart failed services automatically',
        icon: FiActivity,
        category: 'troubleshooting', 
        priority: 'high',
        reasoning: 'Quick recovery for failed services',
        confidence: 0.85
      });
    }

    // Resource optimization suggestions
    if (highResourceServices.length > 0) {
      suggestions.push({
        text: `Optimize resource usage for ${highResourceServices.length} high-usage service(s)`,
        icon: FiCpu,
        category: 'optimization',
        priority: 'medium',
        reasoning: 'Services consuming excessive CPU resources',
        confidence: 0.80
      });
    }

    // Monitoring suggestions based on recent activity
    if (recentErrors.length > 2) {
      suggestions.push({
        text: 'Analyze recent error patterns for root cause',
        icon: FiTrendingUp,
        category: 'analysis',
        priority: 'medium',
        reasoning: `${recentErrors.length} recent errors detected`,
        confidence: 0.75
      });
    }

    // Proactive monitoring suggestions
    const totalServices = services.length;
    const healthyServices = services.filter(s => s.status === 'healthy' || s.status === 'running').length;
    const healthPercentage = totalServices > 0 ? (healthyServices / totalServices) * 100 : 100;

    if (healthPercentage === 100 && suggestions.length === 0) {
      // System is healthy, suggest proactive actions
      suggestions.push(
        {
          text: 'Generate comprehensive health report',
          icon: FiActivity,
          category: 'monitoring',
          priority: 'low',
          reasoning: 'All services healthy - good time for reporting',
          confidence: 0.70
        },
        {
          text: 'Check for available system updates',
          icon: FiSettings,
          category: 'optimization',
          priority: 'low',
          reasoning: 'Proactive maintenance during stable period',
          confidence: 0.65
        },
        {
          text: 'Review Knowledge Graph for documentation gaps',
          icon: FiDatabase,
          category: 'analysis',
          priority: 'low',
          reasoning: 'Optimize knowledge management',
          confidence: 0.60
        }
      );
    }

    // Network connectivity suggestions
    const networkIssues = activities.filter(activity => 
      activity.message.toLowerCase().includes('network') ||
      activity.message.toLowerCase().includes('connection') ||
      activity.message.toLowerCase().includes('timeout')
    ).slice(0, 3);

    if (networkIssues.length > 1) {
      suggestions.push({
        text: 'Diagnose network connectivity issues',
        icon: FiWifi,
        category: 'troubleshooting',
        priority: 'high',
        reasoning: 'Multiple network-related issues detected',
        confidence: 0.85
      });
    }

    // Storage suggestions
    const storageWarnings = activities.filter(activity =>
      activity.message.toLowerCase().includes('disk') ||
      activity.message.toLowerCase().includes('storage') ||
      activity.message.toLowerCase().includes('space')
    ).slice(0, 2);

    if (storageWarnings.length > 0) {
      suggestions.push({
        text: 'Check disk space and cleanup if needed',
        icon: FiHardDrive,
        category: 'optimization',
        priority: 'medium',
        reasoning: 'Storage-related warnings detected',
        confidence: 0.75
      });
    }

    // Sort by priority and confidence
    return suggestions
      .sort((a, b) => {
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        const aPriority = priorityWeight[a.priority];
        const bPriority = priorityWeight[b.priority];
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority; // Higher priority first
        }
        return b.confidence - a.confidence; // Higher confidence first
      })
      .slice(0, 6); // Limit to top 6 suggestions
  }, [services, activities]);

  // Use AI reasoning to enhance suggestions (fallback to rule-based if unavailable)
  const enhanceSuggestionsWithAI = useCallback(async (
    baseSuggestions: CommandSuggestion[]
  ): Promise<CommandSuggestion[]> => {
    try {
      if (!kg_reason || baseSuggestions.length === 0) {
        return baseSuggestions;
      }

      const systemContext = {
        services: services.map(s => ({ name: s.name, status: s.status, cpu: s.cpuUsage })),
        recentActivities: activities.slice(0, 5).map(a => ({ type: a.type, message: a.message })),
        currentSuggestions: baseSuggestions.map(s => ({ text: s.text, category: s.category }))
      };

      const enhancementQuery = `
        Given the current system state and initial suggestions, provide enhanced insights.
        Return a JSON object with an array of "enhancements" where each has:
        - "index": suggestion index to enhance
        - "reasoning": improved reasoning text
        - "confidence": updated confidence score (0-1)
        
        System Context: ${JSON.stringify(systemContext)}
      `;

      const aiResponse = await kg_reason({ 
        question: enhancementQuery,
        context: JSON.stringify(systemContext)
      });

      if (aiResponse && typeof aiResponse === 'object') {
        const responseText = 'result' in aiResponse ? aiResponse.result : 
                           'answer' in aiResponse ? aiResponse.answer : '';

        if (typeof responseText === 'string') {
          try {
            const enhancements = JSON.parse(responseText);
            
            if (enhancements.enhancements && Array.isArray(enhancements.enhancements)) {
              return baseSuggestions.map((suggestion, index) => {
                const enhancement = enhancements.enhancements.find((e: any) => e.index === index);
                
                if (enhancement) {
                  return {
                    ...suggestion,
                    reasoning: enhancement.reasoning || suggestion.reasoning,
                    confidence: enhancement.confidence || suggestion.confidence
                  };
                }
                
                return suggestion;
              });
            }
          } catch (parseError) {
            console.warn('Failed to parse AI enhancement response:', parseError);
          }
        }
      }

      return baseSuggestions;
    } catch (error) {
      console.error('Failed to enhance suggestions with AI:', error);
      return baseSuggestions;
    }
  }, [kg_reason, services, activities]);

  const refreshSuggestions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const baseSuggestions = await generateSuggestions();
      const enhancedSuggestions = await enhanceSuggestionsWithAI(baseSuggestions);
      
      setSuggestions(enhancedSuggestions);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate suggestions');
      console.error('Error refreshing suggestions:', err);
    } finally {
      setLoading(false);
    }
  }, [generateSuggestions, enhanceSuggestionsWithAI]);

  const executeSuggestion = useCallback(async (suggestion: CommandSuggestion) => {
    // This would typically trigger the main command execution
    // For now, we'll just simulate the action
    console.log(`Executing suggestion: ${suggestion.text}`);
    
    // Remove the executed suggestion from the list
    setSuggestions(prev => prev.filter(s => s.text !== suggestion.text));
  }, []);

  const dismissSuggestion = useCallback((index: number) => {
    setSuggestions(prev => prev.filter((_, i) => i !== index));
  }, []);

  // PERFORMANCE FIX: Disable auto-refresh of suggestions to prevent slow navigation
  // Only generate suggestions when explicitly requested
  // useEffect(() => {
  //   refreshSuggestions();
  //
  //   const interval = setInterval(() => {
  //     refreshSuggestions();
  //   }, 5 * 60 * 1000); // 5 minutes
  //
  //   return () => clearInterval(interval);
  // }, [refreshSuggestions]);

  // PERFORMANCE FIX: Disable automatic suggestions on system changes
  // Only generate suggestions when explicitly requested
  // useEffect(() => {
  //   const unhealthyCount = services.filter(s => 
  //     s.status !== 'OPERATIONAL' && s.status !== 'HEALTHY'
  //   ).length;
  //   
  //   const errorCount = activities.filter(a => a.type === 'error').length;
  //
  //   // Only refresh if we have significant changes
  //   if (unhealthyCount > 0 || errorCount > 2) {
  //     refreshSuggestions();
  //   }
  // }, [services.length, activities.length, refreshSuggestions]);

  return {
    suggestions,
    loading,
    error,
    lastUpdated,
    refreshSuggestions,
    executeSuggestion,
    dismissSuggestion,
  };
};
