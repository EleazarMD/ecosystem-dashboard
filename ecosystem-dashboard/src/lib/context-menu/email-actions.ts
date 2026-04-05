/**
 * Email Context Menu Actions
 * 
 * Platform-specific actions for the email agent.
 * These actions are registered with the ToolMenuRegistry.
 */

import {
  TrashIcon,
  GlobeAltIcon,
  UserMinusIcon,
  ArchiveBoxIcon,
  SparklesIcon,
  DocumentDuplicateIcon,
  LinkIcon,
  EyeIcon,
  EyeSlashIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import type { ToolMenuAction } from './types';

export interface EmailActionContext {
  email: {
    id: string;
    from_email: string;
    from_name?: string;
    subject: string;
    is_sent?: boolean;
    is_read?: boolean;
    is_starred?: boolean;
    has_attachments?: boolean;
    source_path?: string;
  };
  hermesUrl: string;
  toast: (options: any) => void;
  onRefresh?: () => void;
  onDelete?: (emailId: string) => void;
  onBlockDomain?: (domain: string) => void;
  onBlockSender?: (sender: string) => void;
  onSaveToWorkspace?: () => void;
  onAnalyzeAttachments?: () => void;
  onGenerateReply?: () => void;
  onOpenInAssistant?: () => void;
}

// Define all email actions - compact Notion-style
export const emailActions: ToolMenuAction<EmailActionContext>[] = [
  // AI Actions
  {
    id: 'generate-reply',
    label: 'AI Reply',
    icon: SparklesIcon,
    group: 'ai',
    platforms: ['email'],
    execute: (ctx) => ctx.onGenerateReply?.(),
  },
  {
    id: 'summarize',
    label: 'Summarize',
    icon: DocumentDuplicateIcon,
    group: 'ai',
    platforms: ['email'],
    execute: async (ctx) => {
      ctx.toast({ title: 'Summarizing...', status: 'info', duration: 2000 });
    },
  },

  // Actions
  {
    id: 'archive',
    label: 'Archive',
    icon: ArchiveBoxIcon,
    group: 'actions',
    platforms: ['email'],
    execute: async (ctx) => {
      try {
        await fetch(`${ctx.hermesUrl}/v1/emails/${encodeURIComponent(ctx.email.id)}/archive`, { method: 'POST' });
        ctx.toast({ title: 'Archived', status: 'success', duration: 1500 });
        ctx.onRefresh?.();
      } catch {
        ctx.toast({ title: 'Failed', status: 'error', duration: 2000 });
      }
    },
  },
  {
    id: 'mark-read',
    label: 'Mark Read',
    icon: EyeIcon,
    group: 'actions',
    platforms: ['email'],
    isVisible: (ctx) => !ctx.email.is_read,
    execute: async (ctx) => {
      try {
        await fetch(`${ctx.hermesUrl}/v1/emails/${encodeURIComponent(ctx.email.id)}/read?is_read=true`, { method: 'POST' });
        ctx.toast({ title: 'Done', status: 'success', duration: 1000 });
        ctx.onRefresh?.();
      } catch {
        ctx.toast({ title: 'Failed', status: 'error', duration: 2000 });
      }
    },
  },
  {
    id: 'mark-unread',
    label: 'Mark Unread',
    icon: EyeSlashIcon,
    group: 'actions',
    platforms: ['email'],
    isVisible: (ctx) => ctx.email.is_read === true,
    execute: async (ctx) => {
      try {
        await fetch(`${ctx.hermesUrl}/v1/emails/${encodeURIComponent(ctx.email.id)}/read?is_read=false`, { method: 'POST' });
        ctx.toast({ title: 'Done', status: 'success', duration: 1000 });
        ctx.onRefresh?.();
      } catch {
        ctx.toast({ title: 'Failed', status: 'error', duration: 2000 });
      }
    },
  },
  {
    id: 'star',
    label: 'Star',
    icon: StarIcon,
    group: 'actions',
    platforms: ['email'],
    isVisible: (ctx) => !ctx.email.is_starred,
    execute: async (ctx) => {
      try {
        await fetch(`${ctx.hermesUrl}/v1/emails/${encodeURIComponent(ctx.email.id)}/star?is_starred=true`, { method: 'POST' });
        ctx.toast({ title: 'Starred', status: 'success', duration: 1000 });
        ctx.onRefresh?.();
      } catch {
        ctx.toast({ title: 'Failed', status: 'error', duration: 2000 });
      }
    },
  },
  {
    id: 'copy-link',
    label: 'Copy Link',
    icon: LinkIcon,
    group: 'actions',
    platforms: ['email'],
    execute: async (ctx) => {
      await navigator.clipboard.writeText(`${window.location.origin}/email?id=${ctx.email.id}`);
      ctx.toast({ title: 'Copied', status: 'success', duration: 1000 });
    },
  },

  // Filter/Block
  {
    id: 'block-sender',
    label: 'Block Sender',
    icon: UserMinusIcon,
    group: 'block',
    platforms: ['email'],
    execute: async (ctx) => {
      const sender = ctx.email.from_email?.toLowerCase() || '';
      if (!sender) {
        ctx.toast({ title: 'Invalid sender email', status: 'error', duration: 2000 });
        return;
      }
      // Use callback to update local state (filters emails immediately)
      ctx.onBlockSender?.(sender);
      ctx.toast({ title: `Blocked ${ctx.email.from_email}`, status: 'success', duration: 2000 });
      
      // Also try to notify Hermes Core (fire and forget)
      fetch(`/api/hermes-proxy?path=v1/filters/block-sender&email=${encodeURIComponent(sender)}`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }).catch(() => {});
    },
  },
  {
    id: 'block-domain',
    label: 'Block Domain',
    icon: GlobeAltIcon,
    group: 'block',
    platforms: ['email'],
    execute: async (ctx) => {
      const domain = ctx.email.from_email?.split('@')[1]?.toLowerCase() || '';
      if (!domain) {
        ctx.toast({ title: 'Invalid email domain', status: 'error', duration: 2000 });
        return;
      }
      // Use callback to update local state (filters emails immediately)
      ctx.onBlockDomain?.(domain);
      ctx.toast({ title: `Blocked domain: ${domain}`, status: 'success', duration: 2000 });
      
      // Also try to notify Hermes Core (fire and forget)
      fetch(`/api/hermes-proxy?path=v1/filters/block-domain&domain=${encodeURIComponent(domain)}`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }).catch(() => {});
    },
  },

  // Delete - uses onDelete callback which handles soft-delete and proxy
  {
    id: 'delete',
    label: 'Delete',
    icon: TrashIcon,
    variant: 'danger',
    group: 'danger',
    platforms: ['email'],
    execute: async (ctx) => {
      if (ctx.onDelete) {
        ctx.onDelete(ctx.email.id);
        ctx.toast({ title: 'Moved to Trash', status: 'success', duration: 1500 });
      } else {
        ctx.toast({ title: 'Delete not available', status: 'error', duration: 2000 });
      }
    },
  },
];

// Group definitions - compact, no labels
export const emailActionGroups = [
  { id: 'ai', order: 0 },
  { id: 'actions', order: 1 },
  { id: 'block', order: 2 },
  { id: 'danger', order: 3 },
];
