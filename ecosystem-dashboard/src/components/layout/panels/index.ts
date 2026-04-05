/**
 * Right Panel System - Public API
 * Export all public interfaces and utilities
 */

// Core types
export type {
  PanelContext,
  PanelMetadata,
  PanelRoute,
  CustomPanelData,
  PanelProps,
  ResolvedPanel,
} from './types';

// Configuration
export { PANEL_REGISTRY, getPanel } from './config/panelRegistry.minimal';
export { PANEL_ROUTES } from './config/panelRoutes';

// Hooks and utilities
export { usePanelResolver } from './resolver/usePanelResolver';
export { PanelRenderer } from './renderer/PanelRenderer';

// Formalization layer
export { PanelEngine } from './core/PanelEngine';
export { PanelDevTools } from './utils/PanelDevTools';

// Services (re-export for convenience)
export { useActivityBridge, ActivityEvents } from '@/services/ActivityBridge';
export { PanelStateManager } from '@/services/PanelStateManager';

// Context
export { useRightPanel, RightPanelProvider } from '@/contexts/RightPanelContext';
