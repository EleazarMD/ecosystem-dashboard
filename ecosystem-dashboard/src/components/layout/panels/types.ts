/**
 * Type definitions for the Dynamic Right Panel System
 */

export type PanelContext =
  | 'dashboard'
  | 'ai-inferencing'
  | 'ai-research'
  | 'podcast-studio'
  | 'voice-studio'
  | 'workspace-ai'
  | 'workspace-page'
  | 'workspace-home'
  | 'knowledge-graph'
  | 'agentic-control'
  | 'image-studio'
  | 'email-insights'
  | 'email-intelligence-dashboard'
  | 'calendar'
  | 'calendar-intelligence-dashboard'
  | 'approvals'
  | 'news-studio'
  | 'ml-training'
  | 'monitoring'
  | 'child-home'
  | 'child-chat'
  | 'child-art'
  | 'child-art-studio'
  | 'child-workspace'
  | 'child-email'
  | 'child-planner'
  | 'child-books'
  | 'child-dictionary'
  | 'child-journal'
  | 'admin-dashboard'
  | 'admin-tenants'
  | 'admin-users'
  | 'admin-quotas'
  | 'admin-security'
  | 'admin-family'
  | 'openclaw-chat'
  | 'default';

export interface PanelMetadata {
  id: string;
  displayName: string;
  description?: string;
  icon?: string;
  iconColor?: string;
  component: React.ComponentType<any>;
  defaultProps?: Record<string, any>;
}

export interface PanelRoute {
  // Matching criteria
  contexts: PanelContext[];
  tabId?: string;
  customDataType?: string;
  condition?: (data: CustomPanelData) => boolean;

  // Panel to show
  panelId: string;

  // Priority (higher = checked first)
  priority?: number;
}

export interface CustomPanelData {
  type?: string;
  [key: string]: any;
}

export interface PanelProps {
  systemData?: {
    health: string;
    services: any[];
    metrics: any;
    alerts: number;
  };
  customData?: CustomPanelData;
  width: number;
  onClose: () => void;
}

export interface ResolvedPanel {
  panelId: string;
  metadata: PanelMetadata;
  props: Record<string, any>;
  error?: string;
}
