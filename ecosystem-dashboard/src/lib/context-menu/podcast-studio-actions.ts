/**
 * Podcast Studio Context Menu Actions
 * 
 * Platform-specific actions for the Podcast Studio sidebar (sources, scripts, podcasts).
 * Follows the same pattern as research-actions.ts and email-actions.ts.
 */

import {
  TrashIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  PencilIcon,
  ClipboardDocumentIcon,
  BookmarkIcon,
} from '@heroicons/react/24/outline';
import type { ToolMenuAction } from './types';

// ─── Source Material Context ───────────────────────────────────────────────────

export interface PodcastSourceActionContext {
  material: {
    id: string;
    title: string;
    type?: string;
    url?: string;
    wordCount?: number;
    word_count?: number;
    pageCount?: number;
  };
  selectedIds: string[];
  totalCount: number;
  toast: (options: any) => void;
  onViewDetails?: (id: string) => void;
  onRename?: (id: string) => void;
  onDelete?: (id: string) => void;
  onBatchDelete?: (ids: string[]) => void;
  onCopyContent?: (id: string) => void;
  onBookmark?: (id: string) => void;
}

export const podcastSourceActions: ToolMenuAction<PodcastSourceActionContext>[] = [
  // View Details
  {
    id: 'view-source-details',
    label: 'View Details',
    icon: EyeIcon,
    group: 'view',
    platforms: ['podcast-studio'],
    execute: (ctx) => {
      ctx.onViewDetails?.(ctx.material.id);
    },
  },

  // Copy URL
  {
    id: 'copy-source-url',
    label: 'Copy URL',
    icon: ClipboardDocumentIcon,
    group: 'view',
    platforms: ['podcast-studio'],
    isVisible: (ctx) => !!ctx.material.url,
    execute: async (ctx) => {
      if (ctx.material.url) {
        await navigator.clipboard.writeText(ctx.material.url);
        ctx.toast({ title: 'URL copied', status: 'success', duration: 1500 });
      }
    },
  },

  // Rename
  {
    id: 'rename-source',
    label: 'Rename',
    icon: PencilIcon,
    group: 'actions',
    platforms: ['podcast-studio'],
    execute: (ctx) => {
      ctx.onRename?.(ctx.material.id);
    },
  },

  // Bookmark
  {
    id: 'bookmark-source',
    label: 'Bookmark',
    icon: BookmarkIcon,
    group: 'actions',
    platforms: ['podcast-studio'],
    execute: (ctx) => {
      ctx.onBookmark?.(ctx.material.id);
      ctx.toast({ title: 'Coming soon', description: 'Bookmark functionality will be available soon', status: 'info', duration: 2000 });
    },
  },

  // Duplicate
  {
    id: 'duplicate-source',
    label: 'Duplicate',
    icon: DocumentDuplicateIcon,
    group: 'actions',
    platforms: ['podcast-studio'],
    execute: (ctx) => {
      ctx.toast({ title: 'Coming soon', description: 'Duplicate functionality will be available soon', status: 'info', duration: 2000 });
    },
  },

  // Delete single (hidden when batch delete is available)
  {
    id: 'delete-source',
    label: 'Delete',
    icon: TrashIcon,
    variant: 'danger',
    group: 'danger',
    platforms: ['podcast-studio'],
    isVisible: (ctx) => ctx.selectedIds.length <= 1,
    execute: (ctx) => {
      ctx.onDelete?.(ctx.material.id);
      ctx.toast({ title: 'Source deleted', description: `"${ctx.material.title}" has been removed`, status: 'success', duration: 2000 });
    },
  },

  // Batch delete selected
  {
    id: 'batch-delete-sources',
    label: 'Delete Selected',
    sublabel: '',
    icon: TrashIcon,
    variant: 'danger',
    group: 'danger',
    platforms: ['podcast-studio'],
    isVisible: (ctx) => ctx.selectedIds.length > 1,
    execute: (ctx) => {
      const count = ctx.selectedIds.length;
      ctx.onBatchDelete?.(ctx.selectedIds);
      ctx.toast({ title: `${count} sources deleted`, status: 'success', duration: 2000 });
    },
  },
];

// Update sublabel dynamically — handled via context in buildConfig

export const podcastSourceActionGroups = [
  { id: 'view', order: 0 },
  { id: 'actions', order: 1 },
  { id: 'danger', order: 2 },
];
