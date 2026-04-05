/**
 * Panel Routing Rules
 * Declarative configuration that maps contexts, tabs, and conditions to panels
 * Priority: Higher numbers are checked first
 */

import { PanelRoute } from '../types';

export const PANEL_ROUTES: PanelRoute[] = [
  // ===== PRIORITY 100: CustomData.type Routes (Most Specific) =====
  // These take precedence over everything else

  // Calendar Event Details
  {
    contexts: ['calendar'],
    customDataType: 'calendar-event',
    panelId: 'event-details',
    priority: 100,
  },

  // AI Inferencing Detail Views
  {
    contexts: ['ai-inferencing'],
    customDataType: 'key-details',
    panelId: 'key-details',
    priority: 100,
  },
  {
    contexts: ['ai-inferencing'],
    customDataType: 'model-details',
    panelId: 'model-details',
    priority: 100,
  },
  {
    contexts: ['ai-inferencing'],
    customDataType: 'provider-details',
    panelId: 'provider-details',
    priority: 100,
  },
  {
    contexts: ['ai-inferencing'],
    customDataType: 'provider-performance-controls',
    panelId: 'provider-performance',
    priority: 100,
  },
  {
    contexts: ['ai-inferencing'],
    customDataType: 'model-filters',
    panelId: 'model-filters',
    priority: 100,
  },
  {
    contexts: ['ai-inferencing'],
    customDataType: 'activity-logs-filters',
    panelId: 'activity-logs',
    priority: 100,
  },
  {
    contexts: ['ai-inferencing'],
    customDataType: 'savings-calculator',
    panelId: 'savings-calculator',
    priority: 100,
  },

  {
    contexts: ['workspace-page'],
    customDataType: 'page-preview',
    panelId: 'page-preview',
    priority: 100,
  },

  // Podcast Studio Detail Views
  {
    contexts: ['podcast-studio'],
    customDataType: 'voice-configuration',
    panelId: 'voice-configuration',
    priority: 100,
  },
  {
    contexts: ['podcast-studio'],
    customDataType: 'multi-stage-production',
    panelId: 'multi-stage-production',
    priority: 100,
  },
  {
    contexts: ['podcast-studio'],
    customDataType: 'podcast-controls',
    panelId: 'podcast-controls',
    priority: 100,
  },
  {
    contexts: ['podcast-studio'],
    customDataType: 'audio-player',
    condition: (data) => !!data.episode,
    panelId: 'podcast-playback',
    priority: 100,
  },
  // source-metadata panel for viewing source token/char/word counts
  {
    contexts: ['podcast-studio'],
    customDataType: 'source-metadata',
    panelId: 'source-metadata',
    priority: 100,
  },
  // llm-config with source-info tab should show source metadata
  {
    contexts: ['podcast-studio'],
    customDataType: 'llm-config',
    tabId: 'source-info',
    panelId: 'source-metadata',
    priority: 110,
  },
  // podcast-workflow with voices tab should show voice configuration
  {
    contexts: ['podcast-studio'],
    customDataType: 'podcast-workflow',
    tabId: 'voices',
    panelId: 'voice-configuration',
    priority: 110,
  },
  // podcast-workflow with audio tab should show voice configuration
  {
    contexts: ['podcast-studio'],
    customDataType: 'podcast-workflow',
    tabId: 'audio',
    panelId: 'voice-configuration',
    priority: 110,
  },
  {
    contexts: ['podcast-studio'],
    customDataType: 'playback-review',
    panelId: 'playback-review',
    priority: 100,
  },
  {
    contexts: ['podcast-studio'],
    customDataType: 'podcast-workflow',
    panelId: 'podcast-workflow',
    priority: 100,
  },

  // ===== PRIORITY 50: Tab-Based Routes (Context + Tab) =====

  // AI Research Tabs
  {
    contexts: ['ai-research'],
    tabId: 'research-settings',
    panelId: 'research-settings',
    priority: 50,
  },
  {
    contexts: ['ai-research'],
    tabId: 'research-memory',
    panelId: 'research-memory',
    priority: 50,
  },
  {
    contexts: ['ai-research'],
    tabId: 'research-sources',
    panelId: 'research-sources',
    priority: 50,
  },
  {
    contexts: ['ai-research'],
    tabId: 'research-costs',
    panelId: 'research-costs',
    priority: 50,
  },
  {
    contexts: ['ai-research'],
    tabId: 'research-analyzer',
    panelId: 'research-analyzer',
    priority: 50,
  },

  // Workspace AI Tabs
  {
    contexts: ['workspace-ai'],
    tabId: 'ai-settings',
    panelId: 'workspace-ai-settings',
    priority: 50,
  },
  {
    contexts: ['workspace-ai'],
    tabId: 'files',
    panelId: 'workspace-files',
    priority: 50,
  },
  {
    contexts: ['workspace-ai'],
    tabId: 'goose-settings',
    panelId: 'goose-settings',
    priority: 50,
  },

  // Workspace Page Tabs
  {
    contexts: ['workspace-page'],
    tabId: 'ai-settings',
    panelId: 'workspace-ai-settings',
    priority: 50,
  },
  {
    contexts: ['workspace-page'],
    tabId: 'goose-agent',
    panelId: 'goose-agent',
    priority: 50,
  },
  {
    contexts: ['workspace-page'],
    tabId: 'files',
    panelId: 'workspace-files',
    priority: 50,
  },
  {
    contexts: ['workspace-page'],
    tabId: 'goose-settings',
    panelId: 'goose-settings',
    priority: 50,
  },
  {
    contexts: ['workspace-page'],
    tabId: 'page-preview',
    panelId: 'page-preview',
    priority: 50,
  },

  // Workspace Home Tabs
  {
    contexts: ['workspace-home'],
    tabId: 'home-settings',
    panelId: 'home-settings',
    priority: 50,
  },
  // Podcast Studio Tabs
  {
    contexts: ['podcast-studio'],
    tabId: 'voices',
    panelId: 'voice-configuration',
    priority: 50,
  },
  {
    contexts: ['podcast-studio'],
    tabId: 'llm-config',
    panelId: 'podcast-llm-config',
    priority: 50,
  },
  {
    contexts: ['podcast-studio'],
    tabId: 'source-info',
    panelId: 'source-metadata',
    priority: 50,
  },
  {
    contexts: ['podcast-studio'],
    tabId: 'insights',
    panelId: 'podcast-insights',
    priority: 50,
  },
  {
    contexts: ['podcast-studio'],
    tabId: 'notes',
    panelId: 'podcast-notes',
    priority: 50,
  },
  {
    contexts: ['podcast-studio'],
    tabId: 'export',
    panelId: 'podcast-export',
    priority: 50,
  },
  {
    contexts: ['podcast-studio'],
    tabId: 'workflow',
    panelId: 'podcast-workflow',
    priority: 50,
  },
  {
    contexts: ['podcast-studio'],
    tabId: 'audio',
    panelId: 'podcast-audio-controls',
    priority: 50,
  },
  // Agentic Control Tabs
  {
    contexts: ['agentic-control'],
    tabId: 'timeline',
    panelId: 'agent-timeline',
    priority: 50,
  },
  {
    contexts: ['agentic-control'],
    tabId: 'graph',
    panelId: 'agent-graph',
    priority: 50,
  },
  {
    contexts: ['agentic-control'],
    tabId: 'events',
    panelId: 'agent-events',
    priority: 50,
  },
  {
    contexts: ['agentic-control'],
    tabId: 'actions',
    panelId: 'agent-actions',
    priority: 50,
  },

  // Dashboard Tabs
  {
    contexts: ['dashboard'],
    tabId: 'notifications',
    panelId: 'agent-notifications',
    priority: 50,
  },
  // Email Insights Tabs
  {
    contexts: ['email-insights'],
    tabId: 'email-intelligence',
    customDataType: 'email',
    panelId: 'email-intelligence',
    priority: 100,
  },
  {
    contexts: ['email-insights'],
    tabId: 'insights-actions',
    panelId: 'insights-actions',
    priority: 50,
  },
  {
    contexts: ['email-insights'],
    tabId: 'insights-settings',
    panelId: 'insights-settings',
    priority: 50,
  },
  {
    contexts: ['email-insights'],
    tabId: 'audio-settings',
    panelId: 'audio-settings',
    priority: 50,
  },

  // Email Intelligence Dashboard Tabs
  {
    contexts: ['email-intelligence-dashboard'],
    tabId: 'dashboard-briefing',
    panelId: 'dashboard-briefing',
    priority: 100,
  },
  {
    contexts: ['email-intelligence-dashboard'],
    tabId: 'insights-settings',
    panelId: 'insights-settings',
    priority: 50,
  },
  {
    contexts: ['email-intelligence-dashboard'],
    tabId: 'audio-settings',
    panelId: 'audio-settings',
    priority: 50,
  },

  // Calendar Tabs
  {
    contexts: ['calendar'],
    tabId: 'event-details',
    panelId: 'event-details',
    priority: 50,
  },
  {
    contexts: ['calendar'],
    tabId: 'calendar-briefing',
    panelId: 'calendar-briefing',
    priority: 50,
  },
  {
    contexts: ['calendar'],
    tabId: 'ai-settings',
    panelId: 'calendar-intelligence',
    priority: 50,
  },
  {
    contexts: ['calendar'],
    tabId: 'calendars',
    panelId: 'calendar-intelligence',
    priority: 50,
  },
  // Calendar briefing from customData
  {
    contexts: ['calendar'],
    customDataType: 'calendar-briefing',
    panelId: 'calendar-briefing',
    priority: 100,
  },
  // Voice Studio Tabs
  {
    contexts: ['voice-studio'],
    tabId: 'voice-profiles',
    panelId: 'voice-profiles',
    priority: 50,
  },
  {
    contexts: ['voice-studio'],
    tabId: 'voice-library',
    panelId: 'voice-library',
    priority: 50,
  },
  {
    contexts: ['voice-studio'],
    tabId: 'voice-settings',
    panelId: 'voice-settings',
    priority: 50,
  },
  {
    contexts: ['voice-studio'],
    tabId: 'export',
    panelId: 'voice-profiles',
    priority: 50,
  },
  // Image Studio - Dynamic based on sidebar view (generate vs edit)
  {
    contexts: ['image-studio'],
    tabId: 'generation-settings',
    condition: (data) => data?.activeTab === 'generate',
    panelId: 'image-generation-settings',
    priority: 60,
  },
  {
    contexts: ['image-studio'],
    tabId: 'generation-settings',
    condition: (data) => data?.activeTab === 'edit',
    panelId: 'image-editing-settings',
    priority: 60,
  },
  // Default fallback for image studio
  {
    contexts: ['image-studio'],
    tabId: 'generation-settings',
    condition: (data) => !data?.activeTab || (data?.activeTab !== 'generate' && data?.activeTab !== 'edit'),
    panelId: 'image-generation-settings',
    priority: 50,
  },

  // ===== NEWS STUDIO ROUTES =====
  // Tab-based routing for News Studio
  {
    contexts: ['news-studio'],
    tabId: 'story-details',
    panelId: 'story-details',
    priority: 50,
  },
  {
    contexts: ['news-studio'],
    tabId: 'pipeline-settings',
    panelId: 'pipeline-settings',
    priority: 50,
  },
  {
    contexts: ['news-studio'],
    tabId: 'llm-config',
    panelId: 'news-llm-config',
    priority: 50,
  },
  {
    contexts: ['news-studio'],
    tabId: 'sources',
    panelId: 'news-sources',
    priority: 50,
  },
  {
    contexts: ['news-studio'],
    tabId: 'export',
    panelId: 'news-export',
    priority: 50,
  },
  // Default fallback for news-studio
  {
    contexts: ['news-studio'],
    panelId: 'story-details',
    priority: 10,
  },

  // ===== PRIORITY 10: Child Portal Context Defaults =====
  // Child-specific panels with themed content
  {
    contexts: ['child-home'],
    panelId: 'child-home',
    priority: 10,
  },
  {
    contexts: ['child-chat'],
    panelId: 'child-chat',
    priority: 10,
  },
  {
    contexts: ['child-art'],
    panelId: 'child-art',
    priority: 10,
  },
  {
    contexts: ['child-workspace'],
    panelId: 'child-workspace',
    priority: 10,
  },
  {
    contexts: ['child-email'],
    panelId: 'child-email',
    priority: 10,
  },
  {
    contexts: ['child-planner'],
    panelId: 'child-planner',
    priority: 10,
  },
  {
    contexts: ['child-books'],
    panelId: 'child-books',
    priority: 10,
  },
  {
    contexts: ['child-dictionary'],
    panelId: 'child-dictionary',
    priority: 10,
  },
  {
    contexts: ['child-journal'],
    panelId: 'child-journal',
    priority: 10,
  },

  // Approvals Tabs
  {
    contexts: ['approvals'],
    tabId: 'approval-settings',
    panelId: 'approval-settings',
    priority: 50,
  },
  // ===== PRIORITY 10: Context Defaults (Fallbacks) =====
  // When no tab or custom data matches, show these

  {
    contexts: ['approvals'],
    panelId: 'approval-settings',
    priority: 10,
  },
  {
    contexts: ['ai-inferencing'],
    panelId: 'contextual-settings',
    priority: 10,
  },
  {
    contexts: ['ai-research'],
    panelId: 'research-settings',
    priority: 10,
  },
  {
    contexts: ['workspace-ai'],
    panelId: 'workspace-ai-settings',
    priority: 10,
  },
  {
    contexts: ['workspace-page'],
    panelId: 'page-preview',
    priority: 10,
  },
  {
    contexts: ['podcast-studio'],
    panelId: 'podcast-llm-config',
    priority: 10,
  },
  {
    contexts: ['agentic-control'],
    panelId: 'agent-timeline',
    priority: 10,
  },
  {
    contexts: ['dashboard'],
    panelId: 'agent-notifications',
    priority: 10,
  },
  {
    contexts: ['workspace-home'],
    panelId: 'home-settings',
    priority: 10,
  },
  {
    contexts: ['knowledge-graph'],
    panelId: 'rag-settings',
    priority: 10,
  },
  {
    contexts: ['email-insights'],
    panelId: 'insights-actions',
    priority: 10,
  },
  {
    contexts: ['image-studio'],
    panelId: 'image-generation-settings',
    priority: 10,
  },
  {
    contexts: ['voice-studio'],
    panelId: 'voice-profiles',
    priority: 10,
  },
  {
    contexts: ['calendar'],
    panelId: 'calendar-briefing',
    priority: 10,
  },
  {
    contexts: ['calendar-intelligence-dashboard'],
    tabId: 'calendar-briefing',
    panelId: 'calendar-briefing',
    priority: 50,
  },
  {
    contexts: ['calendar-intelligence-dashboard'],
    panelId: 'calendar-briefing',
    priority: 10,
  },
  {
    contexts: ['monitoring'],
    tabId: 'alerts',
    panelId: 'monitoring-alerts',
    priority: 50,
  },
  {
    contexts: ['monitoring'],
    tabId: 'gpu-settings',
    panelId: 'monitoring-gpu-settings',
    priority: 50,
  },
  {
    contexts: ['monitoring'],
    tabId: 'display-settings',
    panelId: 'monitoring-display-settings',
    priority: 50,
  },
  {
    contexts: ['monitoring'],
    panelId: 'monitoring-alerts',
    priority: 10,
  },

  // ===== ADMIN PANEL ROUTES =====
  // Admin Tenants
  {
    contexts: ['admin-tenants'],
    tabId: 'tenant-overview',
    panelId: 'admin-tenant',
    priority: 50,
  },
  {
    contexts: ['admin-tenants'],
    tabId: 'tenant-members',
    panelId: 'admin-tenant',
    priority: 50,
  },
  {
    contexts: ['admin-tenants'],
    tabId: 'tenant-settings',
    panelId: 'admin-tenant',
    priority: 50,
  },
  {
    contexts: ['admin-tenants'],
    panelId: 'admin-tenant',
    priority: 10,
  },
  // Admin Users
  {
    contexts: ['admin-users'],
    tabId: 'user-profile',
    panelId: 'admin-user-profile',
    priority: 50,
  },
  {
    contexts: ['admin-users'],
    tabId: 'user-access',
    panelId: 'admin-user-profile',
    priority: 50,
  },
  {
    contexts: ['admin-users'],
    tabId: 'user-activity',
    panelId: 'admin-user-profile',
    priority: 50,
  },
  {
    contexts: ['admin-users'],
    panelId: 'admin-user-profile',
    priority: 10,
  },
  // Admin Quotas
  {
    contexts: ['admin-quotas'],
    tabId: 'quota-overview',
    panelId: 'admin-quota',
    priority: 50,
  },
  {
    contexts: ['admin-quotas'],
    tabId: 'quota-limits',
    panelId: 'admin-quota',
    priority: 50,
  },
  {
    contexts: ['admin-quotas'],
    tabId: 'quota-usage',
    panelId: 'admin-quota',
    priority: 50,
  },
  {
    contexts: ['admin-quotas'],
    panelId: 'admin-quota',
    priority: 10,
  },
  // Admin Security
  {
    contexts: ['admin-security'],
    tabId: 'security-overview',
    panelId: 'admin-security',
    priority: 50,
  },
  {
    contexts: ['admin-security'],
    tabId: 'audit-logs',
    panelId: 'admin-security',
    priority: 50,
  },
  {
    contexts: ['admin-security'],
    tabId: 'alerts',
    panelId: 'admin-security',
    priority: 50,
  },
  {
    contexts: ['admin-security'],
    panelId: 'admin-security',
    priority: 10,
  },
  // Admin Family
  {
    contexts: ['admin-family'],
    panelId: 'admin-family',
    priority: 10,
  },
  // Admin Dashboard
  {
    contexts: ['admin-dashboard'],
    panelId: 'admin-dashboard',
    priority: 10,
  },

  // OpenClaw Chat
  {
    contexts: ['openclaw-chat'],
    panelId: 'openclaw-chat',
    priority: 10,
  },

  // ===== PRIORITY 50: Default Context Tab Routes =====
  // When RightPanelButtons opens ai-settings tab without a specific context
  {
    contexts: ['default'],
    tabId: 'ai-settings',
    panelId: 'openclaw-chat',
    priority: 50,
  },

  // ===== PRIORITY 1: Universal Fallback =====
  {
    contexts: ['default'],
    panelId: 'agent-notifications',
    priority: 1,
  },

  // ===== ML Training Routes =====
  {
    contexts: ['ml-training'],
    tabId: 'rl-settings',
    panelId: 'rl-settings',
    priority: 50,
  },
  {
    contexts: ['ml-training'],
    tabId: 'agent-notifications',
    panelId: 'agent-notifications',
    priority: 50,
  },
];
