import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export type PanelContext =
  | 'dashboard'
  | 'podcast-studio'
  | 'voice-studio'
  | 'ai-research'
  | 'workspace-ai'
  | 'workspace-page'
  | 'workspace-home'
  | 'knowledge-graph'
  | 'agentic-control'
  | 'ai-inferencing'
  | 'image-studio'
  | 'email-insights'
  | 'email-intelligence-dashboard'
  | 'calendar'
  | 'approvals'
  | 'news-studio'
  | 'monitoring'
  | 'ml-training'
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

interface PanelConfig {
  width: number;
  tabs: Array<{
    id: string;
    label: string;
    icon?: string;
  }>;
  defaultTab: string;
}

const PANEL_CONFIGS: Record<PanelContext, PanelConfig> = {
  'dashboard': {
    width: 400, // Standardized to match Podcast Studio
    tabs: [
      { id: 'ai-settings', label: 'AI Settings', icon: 'FiCpu' },
      { id: 'notifications', label: 'Notifications', icon: 'FiZap' },
    ],
    defaultTab: 'ai-settings',
  },
  'podcast-studio': {
    width: 400,
    tabs: [
      { id: 'llm-config', label: 'LLM', icon: 'FiCpu' },
      { id: 'source-info', label: 'Sources', icon: 'FiDatabase' },
      { id: 'insights', label: 'Insights', icon: 'FiZap' },
      { id: 'notes', label: 'Notes', icon: 'FiFileText' },
      { id: 'export', label: 'Export', icon: 'FiShare2' },
      { id: 'workflow', label: 'Workflow', icon: 'FiPlay' },
      { id: 'voices', label: 'Voices', icon: 'FiMic' },
      { id: 'audio', label: 'Audio', icon: 'FiMusic' },
      { id: 'review', label: 'Review', icon: 'FiCheckCircle' },
    ],
    defaultTab: 'llm-config',
  },
  'voice-studio': {
    width: 380,
    tabs: [
      { id: 'voice-profiles', label: 'Profiles', icon: 'FiUser' },
      { id: 'voice-library', label: 'Library', icon: 'FiFolder' },
      { id: 'voice-settings', label: 'Settings', icon: 'FiSettings' },
      { id: 'export', label: 'Export', icon: 'FiShare2' },
    ],
    defaultTab: 'voice-profiles',
  },
  'ai-research': {
    width: 400,
    tabs: [
      { id: 'research-settings', label: 'Research', icon: 'FiCpu' },
      { id: 'research-analyzer', label: 'Analyzer', icon: 'FiTarget' },
      { id: 'research-memory', label: 'Memory', icon: 'FiDatabase' },
      { id: 'research-sources', label: 'Sources', icon: 'FiLink' },
      { id: 'research-costs', label: 'Costs', icon: 'FiDollarSign' },
    ],
    defaultTab: 'research-settings',
  },
  'workspace-ai': {
    width: 400,
    tabs: [
      { id: 'ai-settings', label: 'AI Settings', icon: 'FiCpu' },
      { id: 'files', label: 'Files', icon: 'FiFolder' },
      { id: 'goose-settings', label: 'Goose Settings', icon: 'FiZap' },
    ],
    defaultTab: 'ai-settings',
  },
  'workspace-page': {
    width: 600, // Wider for page preview
    tabs: [
      { id: 'page-preview', label: 'Preview', icon: 'FiFileText' },
      { id: 'goose-agent', label: 'Page Agent', icon: 'FiZap' },
      { id: 'files', label: 'Files', icon: 'FiFolder' },
      { id: 'ai-settings', label: 'AI Settings', icon: 'FiCpu' },
      { id: 'goose-settings', label: 'Goose Settings', icon: 'FiZap' },
    ],
    defaultTab: 'page-preview',
  },
  'workspace-home': {
    width: 400,
    tabs: [
      { id: 'home-settings', label: 'Home Settings', icon: 'FiSettings' },
    ],
    defaultTab: 'home-settings',
  },
  'knowledge-graph': {
    width: 400, // Standardized to match Podcast Studio
    tabs: [
      { id: 'rag-settings', label: 'RAG Settings', icon: 'FiCpu' },
      { id: 'graph-explorer', label: 'Graph Explorer', icon: 'FiShare2' },
      { id: 'system-tools', label: 'System Tools', icon: 'FiActivity' },
    ],
    defaultTab: 'rag-settings',
  },
  'agentic-control': {
    width: 450,
    tabs: [
      { id: 'timeline', label: 'Timeline', icon: 'FiActivity' },
      { id: 'graph', label: 'Graph', icon: 'FiShare2' },
      { id: 'events', label: 'Events', icon: 'FiZap' },
      { id: 'actions', label: 'Actions', icon: 'FiLayers' },
      { id: 'ai-settings', label: 'AI Settings', icon: 'FiCpu' },
    ],
    defaultTab: 'timeline',
  },
  'ai-inferencing': {
    width: 400,
    tabs: [
      { id: 'contextual-settings', label: 'Settings', icon: 'FiSettings' },
    ],
    defaultTab: 'contextual-settings',
  },
  'image-studio': {
    width: 350,
    tabs: [
      { id: 'generation-settings', label: 'Settings', icon: 'FiSettings' },
    ],
    defaultTab: 'generation-settings',
  },
  'email-insights': {
    width: 400,
    tabs: [
      { id: 'email-intelligence', label: 'Intelligence', icon: 'FiZap' },
      { id: 'insights-actions', label: 'Actions', icon: 'FiZap' },
      { id: 'insights-settings', label: 'Settings', icon: 'FiSettings' },
      { id: 'audio-settings', label: 'Audio', icon: 'FiMusic' },
    ],
    defaultTab: 'email-intelligence',
  },
  'email-intelligence-dashboard': {
    width: 400,
    tabs: [
      { id: 'dashboard-briefing', label: 'Briefing', icon: 'FiRadio' },
      { id: 'insights-settings', label: 'Settings', icon: 'FiSettings' },
      { id: 'audio-settings', label: 'Audio', icon: 'FiMusic' },
    ],
    defaultTab: 'dashboard-briefing',
  },
  'calendar': {
    width: 400,
    tabs: [
      { id: 'event-details', label: 'Event', icon: 'FiCalendar' },
      { id: 'calendar-briefing', label: 'Briefing', icon: 'FiRadio' },
      { id: 'ai-settings', label: 'Settings', icon: 'FiSettings' },
    ],
    defaultTab: 'calendar-briefing',
  },
  'calendar-intelligence-dashboard': {
    width: 400,
    tabs: [
      { id: 'calendar-briefing', label: 'Briefing', icon: 'FiRadio' },
      { id: 'ai-settings', label: 'Settings', icon: 'FiSettings' },
    ],
    defaultTab: 'calendar-briefing',
  },
  'approvals': {
    width: 380,
    tabs: [
      { id: 'approval-settings', label: 'Settings', icon: 'FiSettings' },
    ],
    defaultTab: 'approval-settings',
  },
  'news-studio': {
    width: 400,
    tabs: [
      { id: 'story-details', label: 'Story', icon: 'FiFileText' },
      { id: 'pipeline-settings', label: 'Pipeline', icon: 'FiSettings' },
      { id: 'llm-config', label: 'LLM', icon: 'FiCpu' },
      { id: 'sources', label: 'Sources', icon: 'FiLink' },
      { id: 'export', label: 'Export', icon: 'FiShare2' },
    ],
    defaultTab: 'story-details',
  },
  'ml-training': {
    width: 400,
    tabs: [
      { id: 'rl-settings', label: 'RL Settings', icon: 'FiSettings' },
      { id: 'agent-notifications', label: 'Notifications', icon: 'FiZap' },
    ],
    defaultTab: 'rl-settings',
  },
  'monitoring': {
    width: 380,
    tabs: [
      { id: 'alerts', label: 'Alerts', icon: 'FiAlertTriangle' },
      { id: 'gpu-settings', label: 'GPU', icon: 'FiCpu' },
      { id: 'display-settings', label: 'Display', icon: 'FiSettings' },
    ],
    defaultTab: 'alerts',
  },
  'default': {
    width: 400, // Standardized to match Podcast Studio
    tabs: [
      { id: 'ai-settings', label: 'AI Settings', icon: 'FiCpu' },
    ],
    defaultTab: 'ai-settings',
  },
  // Child Portal Contexts - tabs must match ChildRightPanelButtons and panel components
  // Width set to 280px (max 20% of typical iPad landscape width ~1024px = ~205px, but we use 280 as base)
  'child-home': {
    width: 280,
    tabs: [
      { id: 'daily-guide', label: 'Today', icon: 'FiStar' },
      { id: 'progress', label: 'Progress', icon: 'FiTrendingUp' },
      { id: 'discover', label: 'Discover', icon: 'FiCompass' },
    ],
    defaultTab: 'daily-guide',
  },
  'child-chat': {
    width: 280,
    tabs: [
      { id: 'characters', label: 'Characters', icon: 'FiUser' },
      { id: 'learning', label: 'Learning', icon: 'FiBook' },
      { id: 'topics', label: 'Topics', icon: 'FiMessageCircle' },
    ],
    defaultTab: 'characters',
  },
  'child-art': {
    width: 280,
    tabs: [
      { id: 'art-agent', label: 'Art Helper', icon: 'FiEdit' },
      { id: 'image-settings', label: 'Style', icon: 'FiImage' },
      { id: 'gallery', label: 'Gallery', icon: 'FiImage' },
    ],
    defaultTab: 'art-agent',
  },
  'child-art-studio': {
    width: 280,
    tabs: [
      { id: 'art-agent', label: 'Art Helper', icon: 'FiEdit' },
      { id: 'image-settings', label: 'Style', icon: 'FiImage' },
      { id: 'gallery', label: 'Gallery', icon: 'FiImage' },
    ],
    defaultTab: 'art-agent',
  },
  'child-workspace': {
    width: 280,
    tabs: [
      { id: 'builder', label: 'AI Builder', icon: 'FiCpu' },
      { id: 'writing', label: 'Writing', icon: 'FiEdit' },
      { id: 'actions', label: 'Actions', icon: 'FiZap' },
      { id: 'documents', label: 'Docs', icon: 'FiFolder' },
    ],
    defaultTab: 'builder',
  },
  'child-email': {
    width: 280,
    tabs: [
      { id: 'email-helper', label: 'Helper', icon: 'FiMail' },
      { id: 'templates', label: 'Templates', icon: 'FiFileText' },
      { id: 'tips', label: 'Tips', icon: 'FiZap' },
    ],
    defaultTab: 'email-helper',
  },
  'child-planner': {
    width: 280,
    tabs: [
      { id: 'study-buddy', label: 'Study Buddy', icon: 'FiBook' },
      { id: 'goals', label: 'Goals', icon: 'FiTarget' },
      { id: 'workspace', label: 'Workspace', icon: 'FiFileText' },
      { id: 'settings', label: 'Settings', icon: 'FiSettings' },
    ],
    defaultTab: 'study-buddy',
  },
  'child-books': {
    width: 280,
    tabs: [
      { id: 'reading-buddy', label: 'Reading Buddy', icon: 'FiBook' },
      { id: 'vocabulary', label: 'Words', icon: 'FiEdit' },
      { id: 'quiz', label: 'Quiz Me', icon: 'FiHelpCircle' },
      { id: 'explore', label: 'Explore', icon: 'FiSearch' },
    ],
    defaultTab: 'reading-buddy',
  },
  'child-dictionary': {
    width: 280,
    tabs: [
      { id: 'create-note', label: 'Create Note', icon: 'FiEdit' },
      { id: 'ask-character', label: 'Ask Character', icon: 'FiMessageCircle' },
      { id: 'my-collection', label: 'My Collection', icon: 'FiStar' },
      { id: 'word-games', label: 'Word Games', icon: 'FiZap' },
    ],
    defaultTab: 'create-note',
  },
  'child-journal': {
    width: 280,
    tabs: [
      { id: 'writing-tips', label: 'Tips', icon: 'FiEdit' },
      { id: 'prompts', label: 'Prompts', icon: 'FiZap' },
      { id: 'progress', label: 'Progress', icon: 'FiTrendingUp' },
    ],
    defaultTab: 'writing-tips',
  },
  // Admin Panel Contexts
  'admin-dashboard': {
    width: 380,
    tabs: [
      { id: 'quick-stats', label: 'Stats', icon: 'FiActivity' },
      { id: 'recent-activity', label: 'Activity', icon: 'FiClock' },
    ],
    defaultTab: 'quick-stats',
  },
  'admin-tenants': {
    width: 380,
    tabs: [
      { id: 'tenant-overview', label: 'Overview', icon: 'FiGrid' },
      { id: 'tenant-members', label: 'Members', icon: 'FiUsers' },
      { id: 'tenant-settings', label: 'Settings', icon: 'FiSettings' },
    ],
    defaultTab: 'tenant-overview',
  },
  'admin-users': {
    width: 380,
    tabs: [
      { id: 'user-profile', label: 'Profile', icon: 'FiUser' },
      { id: 'user-access', label: 'Access', icon: 'FiShield' },
      { id: 'user-activity', label: 'Activity', icon: 'FiActivity' },
    ],
    defaultTab: 'user-profile',
  },
  'admin-quotas': {
    width: 380,
    tabs: [
      { id: 'quota-overview', label: 'Overview', icon: 'FiPieChart' },
      { id: 'quota-limits', label: 'Limits', icon: 'FiSliders' },
      { id: 'quota-usage', label: 'Usage', icon: 'FiTrendingUp' },
    ],
    defaultTab: 'quota-overview',
  },
  'admin-security': {
    width: 400,
    tabs: [
      { id: 'security-overview', label: 'Overview', icon: 'FiShield' },
      { id: 'audit-logs', label: 'Audit', icon: 'FiFileText' },
      { id: 'alerts', label: 'Alerts', icon: 'FiAlertTriangle' },
    ],
    defaultTab: 'security-overview',
  },
  'admin-family': {
    width: 380,
    tabs: [
      { id: 'child-overview', label: 'Overview', icon: 'FiUser' },
      { id: 'child-controls', label: 'Controls', icon: 'FiShield' },
      { id: 'child-activity', label: 'Activity', icon: 'FiActivity' },
    ],
    defaultTab: 'child-overview',
  },
  'openclaw-chat': {
    width: 320,
    tabs: [
      { id: 'agents', label: 'Agents', icon: 'FiUser' },
      { id: 'sessions', label: 'Sessions', icon: 'FiMessageCircle' },
      { id: 'context', label: 'Context', icon: 'FiActivity' },
    ],
    defaultTab: 'agents',
  },
};

interface RightPanelContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  context: PanelContext;
  setContext: (context: PanelContext) => void;
  config: PanelConfig;
  width: number;
  setWidth: (width: number) => void;
  customData: any;
  setCustomData: (data: any) => void;
}

const RightPanelContext = createContext<RightPanelContextType | undefined>(undefined);

export function RightPanelProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [_isOpen, _setIsOpen] = useState(false);
  const [context, setContext] = useState<PanelContext>('default');
  const [activeTab, setActiveTab] = useState('ai-settings');
  const [customWidth, setCustomWidth] = useState<number | null>(null);
  const [customData, _setCustomData] = useState<any>(null);
  
  // Wrapper for setCustomData
  const setCustomData = React.useCallback((data: any) => {
    _setCustomData(data);
  }, []);

  // Logged wrapper for setIsOpen to track all calls
  const setIsOpen = React.useCallback((value: boolean | ((prev: boolean) => boolean)) => {
    const newValue = typeof value === 'function' ? value(_isOpen) : value;
    console.log(`📍 [RightPanel] setIsOpen called: ${_isOpen} → ${newValue}`);
    console.trace('Call stack:');
    _setIsOpen(value);
  }, [_isOpen]);

  const isOpen = _isOpen;

  // Detect context from route (only on route change, not context change)
  // Pages can override context manually after initial route detection
  useEffect(() => {
    const path = router.pathname;
    let newContext: PanelContext = 'default';

    if (path === '/dashboard') {
      newContext = 'dashboard';
    } else if (path === '/podcast-studio') {
      newContext = 'podcast-studio';
    } else if (path === '/ai-research') {
      newContext = 'ai-research';
    } else if (path === '/workspace-ai' || path === '/workspace' || path === '/workspace-test') {
      newContext = 'workspace-ai';
    } else if (path === '/knowledge-graph' || path === '/knowledge-graph-redesign') {
      newContext = 'knowledge-graph';
    } else if (path === '/agentic-control') {
      newContext = 'agentic-control';
    } else if (path === '/ai-inferencing' || path === '/ai_inferencing_keys') {
      newContext = 'ai-inferencing';
    } else if (path === '/image-studio') {
      newContext = 'image-studio';
    } else if (path === '/voice-studio') {
      newContext = 'voice-studio';
    } else if (path === '/email') {
      newContext = 'email-insights';
    } else if (path === '/email-intelligence') {
      newContext = 'email-intelligence-dashboard';
    } else if (path === '/approvals') {
      newContext = 'approvals';
    } else if (path === '/news-studio') {
      newContext = 'news-studio';
    } else if (path === '/ml-training') {
      newContext = 'ml-training';
    } else if (path === '/monitoring') {
      newContext = 'monitoring';
    } else if (path === '/child/home') {
      newContext = 'child-home';
    } else if (path === '/child/chat') {
      newContext = 'child-chat';
    } else if (path === '/child/art-studio') {
      newContext = 'child-art';
    } else if (path === '/child/workspace') {
      newContext = 'child-workspace';
    } else if (path === '/child/email') {
      newContext = 'child-email';
    } else if (path === '/child/planner') {
      newContext = 'child-planner';
    } else if (path === '/child/book-explorer') {
      newContext = 'child-books';
    } else if (path === '/child/dictionary') {
      newContext = 'child-dictionary';
    } else if (path === '/admin' || path === '/admin/index') {
      newContext = 'admin-dashboard';
    } else if (path.startsWith('/admin/tenants')) {
      newContext = 'admin-tenants';
    } else if (path.startsWith('/admin/users') || path === '/admin/user-features') {
      newContext = 'admin-users';
    } else if (path === '/admin/quotas') {
      newContext = 'admin-quotas';
    } else if (path.startsWith('/security')) {
      newContext = 'admin-security';
    } else if (path === '/admin/family') {
      newContext = 'admin-family';
    } else if (path === '/openclaw-chat') {
      newContext = 'openclaw-chat';
    }

    // Only update if context actually changed
    if (newContext !== context) {
      console.log('[RightPanelContext] Route-based context change:', context, '→', newContext);
      setContext(newContext);

      // Reset to default tab when route changes
      const config = PANEL_CONFIGS[newContext];
      setActiveTab(config.defaultTab);

      // Reset custom width
      setCustomWidth(null);

      // DON'T reset customData - let pages manage their own data
      // This prevents the panel from closing when navigating between tabs on the same page
    }
  }, [router.pathname]); // Only depend on pathname, not context

  const config = PANEL_CONFIGS[context] || PANEL_CONFIGS['default'];
  const width = customWidth || config.width;

  // Create context value directly (no memoization to ensure updates propagate)
  const contextValue = {
    isOpen,
    setIsOpen,
    activeTab,
    setActiveTab,
    context,
    setContext,
    config,
    width,
    setWidth: setCustomWidth,
    customData,
    setCustomData,
  };

  return (
    <RightPanelContext.Provider value={contextValue}>
      {children}
    </RightPanelContext.Provider>
  );
}

export function useRightPanel() {
  const context = useContext(RightPanelContext);
  if (!context) {
    throw new Error('useRightPanel must be used within RightPanelProvider');
  }
  return context;
}
