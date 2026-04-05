/**
 * Minimal Panel Registry - Essential Panels Only
 * Temporary version to isolate broken imports
 */

import dynamic from 'next/dynamic';
import { PanelMetadata } from '../types';

export const PANEL_REGISTRY: Record<string, PanelMetadata> = {
  // ===== WORKSPACE PANELS =====
  'workspace-ai-settings': {
    id: 'workspace-ai-settings',
    displayName: 'AI Settings',
    description: 'Configure AI behavior for workspace',
    icon: 'FiSettings',
    iconColor: 'blue.500',
    component: dynamic(() => import('@/components/workspace/WorkspaceAISettingsPanel')),
  },

  'goose-agent': {
    id: 'goose-agent',
    displayName: 'Goose Agent',
    description: 'Interactive AI agent',
    icon: 'FiMessageSquare',
    iconColor: 'purple.500',
    component: dynamic(() => import('@/components/workspace/GooseSidebarPanel').then(mod => ({ default: mod.GooseSidebarPanel }))),
  },

  'page-preview': {
    id: 'page-preview',
    displayName: 'Page Preview',
    description: 'Preview and edit page content',
    icon: 'FiFileText',
    iconColor: 'green.500',
    component: dynamic(() => import('@/components/workspace/PagePreviewPanel')),
  },

  // ===== CHILD PORTAL PANELS =====
  'child-home': {
    id: 'child-home',
    displayName: 'My Dashboard',
    description: 'Daily guide, progress, and discoveries',
    icon: 'FiStar',
    iconColor: 'pink.500',
    component: dynamic(() => import('@/components/child/ChildHomePanel')),
  },

  'child-chat': {
    id: 'child-chat',
    displayName: 'Chat Settings',
    description: 'Character and chat preferences',
    icon: 'FiMessageCircle',
    iconColor: 'purple.500',
    component: dynamic(() => import('@/components/child/ChildChatPanel')),
  },

  'child-art': {
    id: 'child-art',
    displayName: 'Art Studio',
    description: 'Drawing tools and gallery',
    icon: 'FiImage',
    iconColor: 'pink.500',
    component: dynamic(() => import('@/components/child/ChildArtStudioPanel')),
  },

  'child-workspace': {
    id: 'child-workspace',
    displayName: 'Writing Guide',
    description: 'Writing tips and progress',
    icon: 'FiEdit',
    iconColor: 'blue.500',
    component: dynamic(() => import('@/components/child/ChildWorkspacePanel')),
  },

  'child-email': {
    id: 'child-email',
    displayName: 'Email Helper',
    description: 'Email writing assistance',
    icon: 'FiMail',
    iconColor: 'green.500',
    component: dynamic(() => import('@/components/child/ChildEmailPanel')),
  },

  'child-planner': {
    id: 'child-planner',
    displayName: 'My Planner',
    description: 'Schedule and goals',
    icon: 'FiCalendar',
    iconColor: 'orange.500',
    component: dynamic(() => import('@/components/child/ChildPlannerPanel')),
  },

  'child-books': {
    id: 'child-books',
    displayName: 'Book Explorer',
    description: 'Reading adventures',
    icon: 'FiBook',
    iconColor: 'purple.500',
    component: dynamic(() => import('@/components/child/ChildBookExplorerPanel')),
  },

  'child-dictionary': {
    id: 'child-dictionary',
    displayName: 'Dictionary Helper',
    description: 'Word helper, favorites, and quiz',
    icon: 'FiBook',
    iconColor: 'purple.500',
    component: dynamic(() => import('@/components/child/ChildDictionaryPanel')),
  },

  // ===== APPROVALS PANELS =====
  'approval-settings': {
    id: 'approval-settings',
    displayName: 'Approval Settings',
    description: 'Configure approval preferences',
    icon: 'FiSettings',
    iconColor: 'blue.500',
    component: dynamic(() => import('@/components/approvals/ApprovalSettingsPanel')),
  },

  // ===== EMAIL INSIGHTS PANELS =====
  'insights-actions': {
    id: 'insights-actions',
    displayName: 'Insights Actions',
    description: 'Quick actions for email insights',
    icon: 'FiZap',
    iconColor: 'purple.500',
    component: dynamic(() => import('@/components/email/InsightsActionsPanel')),
  },

  'insights-settings': {
    id: 'insights-settings',
    displayName: 'Insights Settings',
    description: 'Configure email insights',
    icon: 'FiSettings',
    iconColor: 'blue.500',
    component: dynamic(() => import('@/components/email/InsightsSettingsPanel')),
  },

  'audio-settings': {
    id: 'audio-settings',
    displayName: 'Audio Settings',
    description: 'Configure audio briefings',
    icon: 'FiMusic',
    iconColor: 'green.500',
    component: dynamic(() => import('@/components/email/AudioTTSControlsPanel')),
  },

  // ===== FALLBACK =====
  'default': {
    id: 'default',
    displayName: 'Settings',
    description: 'Default panel',
    icon: 'FiSettings',
    iconColor: 'gray.500',
    component: dynamic(() => import('@/components/shared/AISettingsPanel')),
  },
};

export const getPanel = (panelId: string): PanelMetadata => {
  return PANEL_REGISTRY[panelId] || PANEL_REGISTRY['default'];
};
