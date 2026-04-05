/**
 * usePageContext Hook
 * Provides page-level context to the Context MCP Server
 * Enables real-time context streaming to DashAI Agent
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export type PageType = 'dashboard' | 'database' | 'workspace' | 'monitoring' | 'research' | 'studio';
export type ActionType = 'viewing' | 'editing' | 'creating' | 'deleting' | 'searching' | 'filtering';
export type EntityType = 'agent' | 'service' | 'database' | 'page' | 'workspace' | 'metric' | 'pod' | 'deployment';

export interface Entity {
  id: string;
  type: EntityType;
  name: string;
  status?: string;
  metadata: Record<string, any>;
}

export interface Metric {
  key: string;
  label: string;
  value: number | string;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  threshold?: {
    warning: number;
    critical: number;
  };
}

export interface Filter {
  field: string;
  operator: 'equals' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'not_in';
  value: any;
}

export interface Selection {
  type: string;
  id: string;
  metadata?: Record<string, any>;
}

export interface UserActivity {
  element: string;
  elementType: string;
  action: ActionType;
  startTime: number;
  duration: number;
  interactionCount: number;
}

export interface PageContext {
  pageId: string;
  pageTitle: string;
  pageType: PageType;
  url: string;
  entities: Entity[];
  metrics: Metric[];
  filters: Filter[];
  selections: Selection[];
  userActivity?: UserActivity;
  suggestions: string[];
  timestamp: string;
  version: number;
}

export interface PageContextConfig {
  pageId: string;
  pageTitle: string;
  pageType: PageType;
  contextProviders: {
    entities: () => Entity[];
    metrics: () => Metric[];
    filters?: () => Filter[];
    selections?: () => Selection[];
    userActivity?: () => UserActivity;
  };
  updateInterval?: number;
  enableVisual?: boolean;
}

export interface UsePageContextReturn {
  context: PageContext | null;
  isConnected: boolean;
  updateContext: (partial: Partial<PageContext>) => void;
  captureVisual: () => Promise<any>;
}

/**
 * Hook to provide page context to Context MCP Server
 */
export function usePageContext(config: PageContextConfig): UsePageContextReturn {
  const [context, setContext] = useState<PageContext | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Connect to Context MCP Server
    const contextServerUrl = process.env.NEXT_PUBLIC_CONTEXT_MCP_URL || 'http://localhost:8405';
    
    const socket = io(contextServerUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log(`✅ Context MCP: Connected for page ${config.pageId}`);
      setIsConnected(true);

      // Register page
      socket.emit('page:register', {
        pageId: config.pageId,
        pageTitle: config.pageTitle,
        pageType: config.pageType,
        enableVisual: config.enableVisual || false,
      });
    });

    socket.on('page:registered', (data: any) => {
      console.log(`📝 Context MCP: Page registered successfully`, data);
    });

    socket.on('disconnect', () => {
      console.log(`❌ Context MCP: Disconnected for page ${config.pageId}`);
      setIsConnected(false);
    });

    socket.on('context:snapshot', (snapshot: { pageId: string; context: PageContext }) => {
      setContext(snapshot.context);
      console.log(`📊 Context MCP: Received context snapshot`, snapshot.context);
    });

    socket.on('visual:request', () => {
      console.log(`📸 Context MCP: Visual capture requested`);
      // Trigger client-side screenshot capture
      captureScreenshot().then(data => {
        if (data) {
          socket.emit('visual:data', data);
        }
      });
    });

    socket.on('error', (error: any) => {
      console.error(`❌ Context MCP Error:`, error);
    });

    // Auto-update context at intervals
    if (config.updateInterval) {
      updateTimerRef.current = setInterval(() => {
        updateContext({});
      }, config.updateInterval);
    }

    return () => {
      if (updateTimerRef.current) {
        clearInterval(updateTimerRef.current);
      }
      socket.emit('page:disconnect', { pageId: config.pageId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [config.pageId, config.updateInterval]);

  const generateContext = useCallback((): Partial<PageContext> => {
    return {
      pageId: config.pageId,
      pageTitle: config.pageTitle,
      pageType: config.pageType,
      url: typeof window !== 'undefined' ? window.location.href : '',
      entities: config.contextProviders.entities(),
      metrics: config.contextProviders.metrics(),
      filters: config.contextProviders.filters?.() || [],
      selections: config.contextProviders.selections?.() || [],
      userActivity: config.contextProviders.userActivity?.(),
      timestamp: new Date().toISOString(),
    };
  }, [config]);

  const updateContext = useCallback((partial: Partial<PageContext>) => {
    if (!isConnected || !socketRef.current) {
      console.warn('⚠️ Context MCP: Not connected, skipping update');
      return;
    }

    const fullContext = {
      ...generateContext(),
      ...partial,
    };

    setContext(fullContext as PageContext);
    socketRef.current.emit('page:update', fullContext);
    console.log(`📤 Context MCP: Updated context for ${config.pageId}`);
  }, [isConnected, generateContext, config.pageId]);

  const captureVisual = useCallback(async (): Promise<any> => {
    if (!isConnected || !socketRef.current) {
      console.warn('⚠️ Context MCP: Not connected, cannot capture visual');
      return null;
    }

    return new Promise((resolve) => {
      socketRef.current!.emit('visual:capture', { pageId: config.pageId });
      
      socketRef.current!.once('visual:ready', (data) => {
        console.log(`✅ Context MCP: Visual capture ready`);
        resolve(data);
      });

      socketRef.current!.once('visual:error', (error) => {
        console.error(`❌ Context MCP: Visual capture failed`, error);
        resolve(null);
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        console.warn('⚠️ Context MCP: Visual capture timeout');
        resolve(null);
      }, 5000);
    });
  }, [isConnected, config.pageId]);

  /**
   * Capture screenshot on client side
   */
  const captureScreenshot = async (): Promise<any> => {
    if (typeof window === 'undefined') return null;

    try {
      // Use html2canvas for client-side screenshot
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(document.body, {
        allowTaint: true,
        useCORS: true,
        logging: false,
      });

      const screenshot = canvas.toDataURL('image/png').split(',')[1]; // Get base64 without prefix

      // Get viewport info
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
        deviceScaleFactor: window.devicePixelRatio || 1,
      };

      // Get visible elements (simplified - would be enhanced with actual DOM analysis)
      const visibleElements: any[] = [];

      return {
        pageId: config.pageId,
        screenshot,
        viewport,
        visibleElements,
      };
    } catch (error) {
      console.error('❌ Screenshot capture failed:', error);
      return null;
    }
  };

  return {
    context,
    isConnected,
    updateContext,
    captureVisual,
  };
}
