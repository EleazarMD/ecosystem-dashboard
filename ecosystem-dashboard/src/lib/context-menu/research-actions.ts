/**
 * Research Context Menu Actions
 * 
 * Platform-specific actions for the Deep Research Studio sidebar.
 * Follows the same pattern as email-actions.ts.
 */

import {
  TrashIcon,
  ArchiveBoxIcon,
  DocumentDuplicateIcon,
  ArrowPathIcon,
  LinkIcon,
  EyeIcon,
  ClipboardDocumentIcon,
  ArrowsRightLeftIcon,
  ClockIcon,
  FolderPlusIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline';
import type { ToolMenuAction } from './types';

export interface ResearchActionContext {
  session: {
    session_id: string;
    question: string;
    model: string;
    status: string;
    report?: string;
    error_message?: string;
    project_id?: string;
  };
  projects?: Array<{ project_id: string; name: string }>;
  toast: (options: any) => void;
  onDelete?: (sessionId: string) => void;
  onRetry?: (sessionId: string, question: string) => void;
  onLoadSession?: (sessionId: string) => void;
  onCompare?: (sessionId: string) => void;
  onSchedule?: (sessionId: string, question: string, model: string) => void;
  onAssignToProject?: (sessionId: string) => void;
  onPublishToWorkspace?: (sessionId: string) => void;
  onRefresh?: () => void;
}

export const researchActions: ToolMenuAction<ResearchActionContext>[] = [
  // View / Load
  {
    id: 'open-research',
    label: 'Open Research',
    icon: EyeIcon,
    group: 'view',
    platforms: ['research-lab'],
    isVisible: (ctx) => ctx.session.status === 'completed',
    execute: (ctx) => {
      ctx.onLoadSession?.(ctx.session.session_id);
    },
  },

  // Copy actions
  {
    id: 'copy-report',
    label: 'Copy Report',
    icon: ClipboardDocumentIcon,
    group: 'copy',
    platforms: ['research-lab'],
    isVisible: (ctx) => ctx.session.status === 'completed',
    execute: async (ctx) => {
      if (ctx.session.report) {
        await navigator.clipboard.writeText(ctx.session.report);
        ctx.toast({ title: 'Report copied', status: 'success', duration: 1500 });
      } else {
        ctx.toast({ title: 'No report available', status: 'warning', duration: 2000 });
      }
    },
  },
  {
    id: 'copy-question',
    label: 'Copy Question',
    icon: DocumentDuplicateIcon,
    group: 'copy',
    platforms: ['research-lab'],
    execute: async (ctx) => {
      await navigator.clipboard.writeText(ctx.session.question);
      ctx.toast({ title: 'Question copied', status: 'success', duration: 1500 });
    },
  },
  {
    id: 'copy-link',
    label: 'Copy Link',
    icon: LinkIcon,
    group: 'copy',
    platforms: ['research-lab'],
    execute: async (ctx) => {
      await navigator.clipboard.writeText(
        `${window.location.origin}/ai-research?session=${ctx.session.session_id}`
      );
      ctx.toast({ title: 'Link copied', status: 'success', duration: 1500 });
    },
  },

  // Schedule
  {
    id: 'schedule-research',
    label: 'Schedule Recurring',
    icon: ClockIcon,
    group: 'actions',
    platforms: ['research-lab'],
    isVisible: (ctx) => ctx.session.status === 'completed',
    execute: (ctx) => {
      ctx.onSchedule?.(ctx.session.session_id, ctx.session.question, ctx.session.model);
    },
  },

  // Compare
  {
    id: 'compare-research',
    label: 'Compare With…',
    icon: ArrowsRightLeftIcon,
    group: 'actions',
    platforms: ['research-lab'],
    isVisible: (ctx) => ctx.session.status === 'completed',
    execute: (ctx) => {
      ctx.onCompare?.(ctx.session.session_id);
    },
  },

  // Retry
  {
    id: 'retry-research',
    label: 'Retry Research',
    icon: ArrowPathIcon,
    group: 'actions',
    platforms: ['research-lab'],
    isVisible: (ctx) => ctx.session.status === 'failed',
    execute: (ctx) => {
      ctx.onRetry?.(ctx.session.session_id, ctx.session.question);
    },
  },

  // Publish to Workspace
  {
    id: 'publish-to-workspace',
    label: 'Publish to Workspace',
    icon: BookOpenIcon,
    group: 'actions',
    platforms: ['research-lab'],
    isVisible: (ctx) => ctx.session.status === 'completed',
    execute: (ctx) => {
      ctx.onPublishToWorkspace?.(ctx.session.session_id);
    },
  },

  // Add to Project
  {
    id: 'add-to-project',
    label: 'Add to Project…',
    icon: FolderPlusIcon,
    group: 'actions',
    platforms: ['research-lab'],
    execute: (ctx) => {
      ctx.onAssignToProject?.(ctx.session.session_id);
    },
  },

  // Delete
  {
    id: 'delete-research',
    label: 'Delete',
    icon: TrashIcon,
    variant: 'danger',
    group: 'danger',
    platforms: ['research-lab'],
    execute: async (ctx) => {
      if (ctx.onDelete) {
        ctx.onDelete(ctx.session.session_id);
        ctx.toast({ title: 'Research deleted', status: 'success', duration: 1500 });
      }
    },
  },
];

export const researchActionGroups = [
  { id: 'view', order: 0 },
  { id: 'copy', order: 1 },
  { id: 'actions', order: 2 },
  { id: 'danger', order: 3 },
];
