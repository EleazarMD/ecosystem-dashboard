/**
 * AI Context Manager
 * Centralized context tracking for all AI assistants in the dashboard
 * Provides contextual information based on user's current view
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/router';

// Context types for different dashboard sections
export type ContextType =
  | 'workspace-home'
  | 'workspace-page'
  | 'dashboard-monitoring'
  | 'knowledge-graph'
  | 'ai-inferencing'
  | 'podcast-studio'
  | 'research'
  | 'agentic-control';

export interface BaseContext {
  type: ContextType;
  route: string;
  timestamp: number;
}

export interface WorkspacePageContext extends BaseContext {
  type: 'workspace-page';
  workspace: {
    id: string;
    name: string;
  };
  page: {
    id: string;
    title: string;
    blockCount: number;
  };
  visibleBlocks?: any[];
  selectedBlock?: string;
  editorState?: {
    cursorPosition?: number;
    selection?: { start: number; end: number };
  };
}

export interface MonitoringContext extends BaseContext {
  type: 'dashboard-monitoring';
  services: string[];
  activeMetrics: string[];
  timeRange: string;
}

export interface KnowledgeGraphContext extends BaseContext {
  type: 'knowledge-graph';
  entities: any[];
  selectedNode?: {
    id: string;
    type: string;
    properties: any;
  };
}

export type AIContext = 
  | WorkspacePageContext 
  | MonitoringContext 
  | KnowledgeGraphContext 
  | BaseContext;

interface AIContextState {
  // Current context
  context: AIContext | null;
  
  // Context update methods
  setContext: (context: AIContext) => void;
  updateContext: (partial: Partial<AIContext>) => void;
  clearContext: () => void;
  
  // Assistant modes
  globalAssistantEnabled: boolean;
  pageAssistantEnabled: boolean;
  setGlobalAssistantEnabled: (enabled: boolean) => void;
  setPageAssistantEnabled: (enabled: boolean) => void;
  
  // Context queries
  getContextForAssistant: (assistant: 'global' | 'page') => AIContext | null;
  getContextSummary: () => string;
}

const AIContextContext = createContext<AIContextState | undefined>(undefined);

export const AIContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [context, setContextState] = useState<AIContext | null>(null);
  const [globalAssistantEnabled, setGlobalAssistantEnabled] = useState(true);
  const [pageAssistantEnabled, setPageAssistantEnabled] = useState(false);

  // Update context when route changes
  useEffect(() => {
    const baseContext: BaseContext = {
      type: inferContextType(router.pathname),
      route: router.pathname,
      timestamp: Date.now(),
    };
    
    setContextState(baseContext);
  }, [router.pathname]);

  const setContext = useCallback((newContext: AIContext) => {
    setContextState({
      ...newContext,
      timestamp: Date.now(),
    });
  }, []);

  const updateContext = useCallback((partial: Partial<AIContext>) => {
    setContextState((prev) => 
      prev ? { ...prev, ...partial, timestamp: Date.now() } : null
    );
  }, []);

  const clearContext = useCallback(() => {
    setContextState(null);
  }, []);

  const getContextForAssistant = useCallback((assistant: 'global' | 'page'): AIContext | null => {
    if (!context) return null;
    
    if (assistant === 'global') {
      // Global assistant gets full context
      return context;
    } else {
      // Page assistant only gets page-specific context
      if (context.type === 'workspace-page') {
        return context;
      }
      return null; // Page assistant not applicable for non-workspace pages
    }
  }, [context]);

  const getContextSummary = useCallback((): string => {
    if (!context) return 'No context available';
    
    switch (context.type) {
      case 'workspace-page':
        const wpCtx = context as WorkspacePageContext;
        return `Workspace: ${wpCtx.workspace?.name || 'Unknown'}, Page: ${wpCtx.page?.title || 'Untitled'} (${wpCtx.page?.blockCount || 0} blocks)`;
      
      case 'dashboard-monitoring':
        const dmCtx = context as MonitoringContext;
        return `Monitoring ${dmCtx.services?.length || 0} services`;
      
      case 'knowledge-graph':
        const kgCtx = context as KnowledgeGraphContext;
        return `Knowledge Graph: ${kgCtx.entities?.length || 0} entities`;
      
      default:
        return `Dashboard: ${context.route}`;
    }
  }, [context]);

  const value: AIContextState = {
    context,
    setContext,
    updateContext,
    clearContext,
    globalAssistantEnabled,
    pageAssistantEnabled,
    setGlobalAssistantEnabled,
    setPageAssistantEnabled,
    getContextForAssistant,
    getContextSummary,
  };

  return (
    <AIContextContext.Provider value={value}>
      {children}
    </AIContextContext.Provider>
  );
};

export const useAIContext = () => {
  const context = useContext(AIContextContext);
  if (!context) {
    throw new Error('useAIContext must be used within AIContextProvider');
  }
  return context;
};

// Helper to infer context type from route
function inferContextType(pathname: string): ContextType {
  if (pathname.includes('/workspace')) return 'workspace-page';
  if (pathname.includes('/monitoring')) return 'dashboard-monitoring';
  if (pathname.includes('/knowledge-graph')) return 'knowledge-graph';
  if (pathname.includes('/ai-inferencing')) return 'ai-inferencing';
  if (pathname.includes('/podcast')) return 'podcast-studio';
  if (pathname.includes('/research')) return 'research';
  if (pathname.includes('/agentic')) return 'agentic-control';
  return 'workspace-home';
}
