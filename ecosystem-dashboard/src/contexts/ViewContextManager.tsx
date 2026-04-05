/**
 * View Context Manager
 * Centralized system for managing left/right panel contexts across the entire dashboard
 * Provides consistent context detection and management for all modules
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/router';

// Standardized view types used across all modules
export type ViewType = 
  | 'home'           // Module home/overview
  | 'list'           // List of items (pages, episodes, queries, etc.)
  | 'detail'         // Viewing a specific item (page, episode, graph node, etc.)
  | 'edit'           // Editing a specific item
  | 'create'         // Creating a new item
  | 'settings'       // Module settings
  | 'analytics';     // Analytics/insights view

// Module identifiers
export type Module = 
  | 'dashboard'
  | 'workspace'
  | 'podcast-studio'
  | 'knowledge-graph'
  | 'ai-inferencing'
  | 'agentic-control'
  | 'research-lab';

// Detail type for specific content
export interface ViewDetail {
  type: 'page' | 'table' | 'calendar' | 'board' | 'episode' | 'query' | 'node' | 'custom';
  id?: string;
  title?: string;
  metadata?: Record<string, any>;
}

// Complete view context state
export interface ViewContextState {
  module: Module;
  viewType: ViewType;
  detail?: ViewDetail;
  customData?: any;
}

interface ViewContextManager {
  viewContext: ViewContextState;
  setViewContext: (context: Partial<ViewContextState>) => void;
  updateDetail: (detail: Partial<ViewDetail>) => void;
  getRightPanelContext: () => string; // Maps to RightPanelContext types
}

const ViewContext = createContext<ViewContextManager | undefined>(undefined);

export function ViewContextProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [viewContext, setViewContextState] = useState<ViewContextState>({
    module: 'dashboard',
    viewType: 'home',
  });

  // Auto-detect module from route
  useEffect(() => {
    const path = router.pathname;
    let module: Module = 'dashboard';

    if (path.startsWith('/workspace')) module = 'workspace';
    else if (path.startsWith('/podcast-studio')) module = 'podcast-studio';
    else if (path.startsWith('/knowledge-graph')) module = 'knowledge-graph';
    else if (path.startsWith('/ai-inferencing')) module = 'ai-inferencing';
    else if (path.startsWith('/agentic-control')) module = 'agentic-control';
    else if (path.startsWith('/research-lab') || path.startsWith('/ai-research')) module = 'research-lab';

    setViewContextState(prev => ({
      ...prev,
      module,
      // Reset view type when module changes
      viewType: 'home',
      detail: undefined,
    }));
  }, [router.pathname]);

  const setViewContext = useCallback((updates: Partial<ViewContextState>) => {
    setViewContextState(prev => ({
      ...prev,
      ...updates,
    }));
  }, []);

  const updateDetail = useCallback((detailUpdates: Partial<ViewDetail>) => {
    setViewContextState(prev => ({
      ...prev,
      detail: prev.detail ? { ...prev.detail, ...detailUpdates } : detailUpdates as ViewDetail,
    }));
  }, []);

  // Map view context to RightPanelContext type
  const getRightPanelContext = useCallback((): string => {
    const { module, viewType, detail } = viewContext;

    // Workspace mappings
    if (module === 'workspace') {
      if (viewType === 'settings') return 'workspace-ai';
      if (viewType === 'detail' && detail) return 'workspace-page';
      return 'workspace-ai'; // Default workspace context
    }

    // Podcast Studio mappings
    if (module === 'podcast-studio') {
      return 'podcast-studio';
    }

    // Knowledge Graph mappings
    if (module === 'knowledge-graph') {
      return 'knowledge-graph';
    }

    // AI Inferencing mappings
    if (module === 'ai-inferencing') {
      return 'ai-inferencing';
    }

    // Agentic Control mappings
    if (module === 'agentic-control') {
      return 'agentic-control';
    }

    // Research Lab mappings
    if (module === 'research-lab') {
      return 'ai-research';
    }

    // Dashboard or default
    return module === 'dashboard' ? 'dashboard' : 'default';
  }, [viewContext]);

  return (
    <ViewContext.Provider
      value={{
        viewContext,
        setViewContext,
        updateDetail,
        getRightPanelContext,
      }}
    >
      {children}
    </ViewContext.Provider>
  );
}

export function useViewContext() {
  const context = useContext(ViewContext);
  if (!context) {
    // Graceful fallback - return no-op functions instead of throwing
    // This allows code to work even if ViewContextProvider is disabled
    console.warn('[ViewContext] Provider not found - using fallback mode');
    return {
      viewContext: {
        module: 'dashboard' as Module,
        viewType: 'home' as ViewType,
      },
      setViewContext: () => {},
      updateDetail: () => {},
      getRightPanelContext: () => 'default',
    };
  }
  return context;
}

// Safe hook that checks if ViewContextProvider is enabled
export function useViewContextSafe(): ViewContextManager | null {
  try {
    const context = useContext(ViewContext);
    return context || null;
  } catch {
    return null;
  }
}
