import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useMCP } from '@/hooks/useMCP';
import { useActivityFeed } from './ActivityFeedContext';
import logger from '../lib/logger';

interface PredictiveAction {
  id: string;
  title: string;
  description: string;
  actionLabel: string;
  action: () => void;
}

interface PredictiveActionsContextType {
  actions: PredictiveAction[];
  loading: boolean;
  error: string | null;
  refreshActions: () => void;
}

export const PredictiveActionsContext = createContext<PredictiveActionsContextType>({
  actions: [],
  loading: false,
  error: null,
  refreshActions: () => console.warn('PredictiveActionsProvider not found'),
});

export const usePredictiveActions = () => useContext(PredictiveActionsContext);

interface PredictiveActionsProviderProps {
  children: ReactNode;
}

export const PredictiveActionsProvider: React.FC<PredictiveActionsProviderProps> = ({ children }) => {
  const [actions, setActions] = useState<PredictiveAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { kg_reason } = useMCP();
  const { activities } = useActivityFeed();

  const generateActions = async () => {
    if (activities.length === 0) {
      setActions([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const activityContext = JSON.stringify(activities.slice(0, 5).map(a => a.message));
      const question = `Given the recent activities, what are the top 3 most relevant next actions for a developer to take? Provide a title, a short description, and a label for an action button.`;
      
      logger.info('[PredictiveActionsContext] Generating predictive actions with context:', activityContext);
      const result = await kg_reason({ question, context: activityContext });
      logger.info('[PredictiveActionsContext] Received reasoning response:', result);

      let parsedActions: PredictiveAction[] = [];
      if (result && typeof result === 'string') {
        try {
          // Assuming the LLM returns a JSON string array of actions
          const rawActions = JSON.parse(result);
          if (Array.isArray(rawActions)) {
            parsedActions = rawActions.map((item: any, index: number) => ({
              id: item.id || `${Date.now()}-${index}`,
              title: item.title || 'Untitled Action',
              description: item.description || 'No description available.',
              actionLabel: item.actionLabel || 'Execute',
              // The actual action is a placeholder, demonstrating the data is flowing.
              action: () => alert(`Executing: ${item.title}`),
            }));
          }
        } catch (parseError) {
          logger.error('[PredictiveActionsContext] Failed to parse AI response:', parseError);
          // If parsing fails, we can still show the raw response as a fallback action
          parsedActions = [{
            id: 'fallback-1',
            title: 'Raw AI Suggestion',
            description: result,
            actionLabel: 'Copy to Clipboard',
            action: () => navigator.clipboard.writeText(result),
          }];
        }
      } else {
        logger.warn('[PredictiveActionsContext] AI response was empty or not a string.');
      }

      setActions(parsedActions);

    } catch (err: any) {
      logger.error('[PredictiveActionsContext] Error generating actions:', err);
      setError(err.message || 'Failed to generate predictive actions.');
    } finally {
      setLoading(false);
    }
  };

  // PERFORMANCE FIX: Disable automatic action generation to prevent slow navigation
  // Only generate actions when explicitly requested
  // useEffect(() => {
  //   generateActions();
  // }, [activities, kg_reason]);

  const value = {
    actions,
    loading,
    error,
    refreshActions: generateActions,
  };

  return (
    <PredictiveActionsContext.Provider value={value}>
      {children}
    </PredictiveActionsContext.Provider>
  );
};
