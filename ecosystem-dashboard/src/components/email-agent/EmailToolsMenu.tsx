/**
 * Email Tools Menu Component
 * 
 * Right-click context menu for email actions using the modular ContextMenuEngine.
 * Provides AI-powered actions, organization tools, and filtering options.
 */

import React, { useMemo } from 'react';
import { useToast } from '@chakra-ui/react';
import { 
  ContextMenuEngine, 
  useContextMenu,
  createToolMenuRegistry,
} from '@/lib/context-menu';
import { 
  emailActions, 
  emailActionGroups,
  type EmailActionContext,
} from '@/lib/context-menu/email-actions';

const HERMES_URL = process.env.NEXT_PUBLIC_HERMES_URL || 'http://localhost:8780';

// Create email-specific registry
const emailRegistry = createToolMenuRegistry<EmailActionContext>();

// Register groups and actions
emailActionGroups.forEach(g => emailRegistry.registerGroup(g.id, (g as any).label, g.order));
emailRegistry.registerActions(emailActions);

export interface EmailToolsMenuProps {
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
  } | null;
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onRefresh?: () => void;
  onDelete?: (emailId: string) => void;
  onBlockSender?: (sender: string) => void;
  onBlockDomain?: (domain: string) => void;
  onSaveToWorkspace?: () => void;
  onAnalyzeAttachments?: () => void;
  onGenerateReply?: () => void;
  onOpenInAssistant?: () => void;
}

export const EmailToolsMenu: React.FC<EmailToolsMenuProps> = ({
  email,
  isOpen,
  position,
  onClose,
  onRefresh,
  onDelete,
  onBlockSender,
  onBlockDomain,
  onSaveToWorkspace,
  onAnalyzeAttachments,
  onGenerateReply,
  onOpenInAssistant,
}) => {
  const toast = useToast();

  // Build menu config from registry
  const menuConfig = useMemo(() => {
    if (!email) return null;

    const context: EmailActionContext = {
      email,
      hermesUrl: HERMES_URL,
      toast: (options) => toast({ position: 'bottom-right', ...options }),
      onRefresh,
      onDelete,
      onBlockSender,
      onBlockDomain,
      onSaveToWorkspace,
      onAnalyzeAttachments,
      onGenerateReply,
      onOpenInAssistant,
    };

    return emailRegistry.buildConfig('email', context, {
      title: email.from_email,
      subtitle: email.subject.substring(0, 40) + (email.subject.length > 40 ? '...' : ''),
    });
  }, [email, toast, onRefresh, onDelete, onBlockSender, onBlockDomain, onSaveToWorkspace, onAnalyzeAttachments, onGenerateReply, onOpenInAssistant]);

  if (!email || !menuConfig) return null;

  return (
    <ContextMenuEngine
      isOpen={isOpen}
      onClose={onClose}
      position={position}
      config={menuConfig}
    />
  );
};

// Hook for easy integration with email list items
export function useEmailToolsMenu() {
  const { state, open, close, handleContextMenu } = useContextMenu();
  const toast = useToast();

  const openForEmail = (
    e: React.MouseEvent,
    email: EmailToolsMenuProps['email'],
    callbacks?: {
      onRefresh?: () => void;
      onDelete?: (emailId: string) => void;
      onBlockSender?: (sender: string) => void;
      onBlockDomain?: (domain: string) => void;
      onSaveToWorkspace?: () => void;
      onAnalyzeAttachments?: () => void;
      onGenerateReply?: () => void;
      onOpenInAssistant?: () => void;
    }
  ) => {
    if (!email) return;

    e.preventDefault();
    e.stopPropagation();

    const context: EmailActionContext = {
      email,
      hermesUrl: HERMES_URL,
      toast: (options) => toast({ position: 'bottom-right', ...options }),
      ...callbacks,
    };

    const config = emailRegistry.buildConfig('email', context, {
      title: email.from_email,
      subtitle: email.subject.substring(0, 40) + (email.subject.length > 40 ? '...' : ''),
    });

    open({ x: e.clientX, y: e.clientY }, config);
  };

  return {
    isOpen: state.isOpen,
    position: state.position,
    config: state.config,
    close,
    openForEmail,
  };
}

export default EmailToolsMenu;
