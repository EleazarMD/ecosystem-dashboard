/**
 * Email Context Menu Component
 * 
 * Minimalist right-click context menu for email filtering actions.
 * Integrates with the noise filter system:
 * 
 * Filter Hierarchy (applied in order):
 * 1. PHI Filter (hard block) - HIPAA compliance, not user-configurable
 * 2. Noise Filter (soft block) - User-configurable:
 *    - Blocked senders (exact email match)
 *    - Blocked domains (all emails from domain)
 *    - Sender patterns (regex on sender)
 *    - Subject patterns (regex on subject)
 * 
 * Actions available:
 * - Add to noise filter (sender or domain)
 * - Remove from index (this email only)
 * - Add & cleanup (add to filter + remove matching emails)
 */

import React, { useEffect, useRef } from 'react';
import { Box, HStack, VStack, Text, useToast, Portal } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  NoSymbolIcon,
  TrashIcon,
  GlobeAltIcon,
  UserMinusIcon,
  ArchiveBoxIcon,
  CheckCircleIcon,
  FolderPlusIcon,
  SparklesIcon,
  DocumentTextIcon,
  PaperClipIcon,
} from '@heroicons/react/24/outline';

interface EmailContextMenuProps {
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  email: {
    id: string;
    from_email: string;
    from_name?: string;
    subject: string;
    is_sent?: boolean;
    has_attachments?: boolean;
    source_path?: string;
  } | null;
  graphragUrl: string;
  onActionComplete?: () => void;
  onSaveToWorkspace?: () => void;
  onAnalyzeAttachments?: () => void;
  onGenerateReply?: () => void;
}

interface MenuItemProps {
  icon: React.ElementType;
  label: string;
  sublabel?: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

const MenuItem: React.FC<MenuItemProps> = ({ icon: Icon, label, sublabel, onClick, variant = 'default' }) => {
  const hoverBg = useSemanticToken('interactive.surfaceHover');
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  
  return (
    <HStack
      px={2}
      py={1.5}
      cursor="pointer"
      _hover={{ bg: hoverBg }}
      onClick={onClick}
      spacing={2}
      borderRadius="sm"
      transition="all 0.15s"
    >
      <Icon
        style={{
          width: 14,
          height: 14,
          color: variant === 'danger' ? '#F56565' : 'currentColor',
          opacity: 0.7,
          flexShrink: 0,
        }}
      />
      <VStack align="start" spacing={0} flex={1} minW={0}>
        <Text
          fontSize="xs"
          color={variant === 'danger' ? 'red.400' : textPrimary}
          fontWeight="500"
        >
          {label}
        </Text>
        {sublabel && (
          <Text fontSize="2xs" color={textSecondary} noOfLines={1} opacity={0.8}>
            {sublabel}
          </Text>
        )}
      </VStack>
    </HStack>
  );
};

export const EmailContextMenu: React.FC<EmailContextMenuProps> = ({
  isOpen,
  onClose,
  position,
  email,
  graphragUrl,
  onActionComplete,
  onSaveToWorkspace,
  onAnalyzeAttachments,
  onGenerateReply,
}) => {
  const toast = useToast();
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Semantic tokens for consistent styling
  const glassBg = useSemanticToken('glass.background');
  const glassBorder = useSemanticToken('glass.border');
  const textSecondary = useSemanticToken('text.secondary');

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !email) return null;

  const senderEmail = email.from_email;
  const senderDomain = senderEmail.split('@')[1] || '';

  // API calls
  const addSenderToFilter = async () => {
    try {
      await fetch(`${graphragUrl}/filters/noise/sender?email=${encodeURIComponent(senderEmail)}`, {
        method: 'POST',
      });
      toast({
        title: 'Sender added to filter',
        description: `Future emails from ${senderEmail} will be blocked`,
        status: 'success',
        duration: 2500,
        position: 'bottom-right',
      });
      onClose();
      onActionComplete?.();
    } catch {
      toast({ title: 'Failed to add sender', status: 'error', duration: 2000 });
    }
  };

  const addDomainToFilter = async () => {
    try {
      await fetch(`${graphragUrl}/filters/noise/domain?domain=${encodeURIComponent(senderDomain)}`, {
        method: 'POST',
      });
      toast({
        title: 'Domain added to filter',
        description: `All emails from @${senderDomain} will be blocked`,
        status: 'success',
        duration: 2500,
        position: 'bottom-right',
      });
      onClose();
      onActionComplete?.();
    } catch {
      toast({ title: 'Failed to add domain', status: 'error', duration: 2000 });
    }
  };

  const removeFromIndex = async () => {
    try {
      await fetch(`${graphragUrl}/index/email/${encodeURIComponent(email.id)}?is_sent=${email.is_sent || false}`, {
        method: 'DELETE',
      });
      toast({
        title: 'Removed from index',
        status: 'success',
        duration: 2000,
        position: 'bottom-right',
      });
      onClose();
      onActionComplete?.();
    } catch {
      toast({ title: 'Failed to remove', status: 'error', duration: 2000 });
    }
  };

  const addDomainAndCleanup = async () => {
    try {
      // Add domain to filter
      await fetch(`${graphragUrl}/filters/noise/domain?domain=${encodeURIComponent(senderDomain)}`, {
        method: 'POST',
      });
      // Run cleanup
      const res = await fetch(`${graphragUrl}/index/cleanup/execute?dry_run=false`, {
        method: 'POST',
      });
      const data = await res.json();
      toast({
        title: 'Domain blocked & cleaned',
        description: `Removed ${data.removed_count} emails from @${senderDomain}`,
        status: 'success',
        duration: 3000,
        position: 'bottom-right',
      });
      onClose();
      onActionComplete?.();
    } catch {
      toast({ title: 'Cleanup failed', status: 'error', duration: 2000 });
    }
  };

  const archiveEmail = async () => {
    try {
      await fetch(`${graphragUrl}/emails/${encodeURIComponent(email.id)}/archive`, {
        method: 'POST',
      });
      toast({
        title: 'Archived',
        description: 'Email kept but hidden from inbox',
        status: 'success',
        duration: 2000,
        position: 'bottom-right',
      });
      onClose();
      onActionComplete?.();
    } catch {
      toast({ title: 'Archive failed', status: 'error', duration: 2000 });
    }
  };

  const markAsRead = async () => {
    try {
      await fetch(`${graphragUrl}/emails/${encodeURIComponent(email.id)}/read`, {
        method: 'POST',
      });
      toast({
        title: 'Marked as read',
        status: 'success',
        duration: 2000,
        position: 'bottom-right',
      });
      onClose();
      onActionComplete?.();
    } catch {
      toast({ title: 'Failed', status: 'error', duration: 2000 });
    }
  };

  // Adjust position to stay within viewport
  const adjustedPosition = {
    x: Math.min(position.x, window.innerWidth - 220),
    y: Math.min(position.y, window.innerHeight - 200),
  };

  return (
    <Portal>
      <Box
        ref={menuRef}
        position="fixed"
        left={`${adjustedPosition.x}px`}
        top={`${adjustedPosition.y}px`}
        zIndex={9999}
        bg={glassBg}
        backdropFilter="blur(16px)"
        border="1px solid"
        borderColor={glassBorder}
        borderRadius="md"
        boxShadow="0 4px 20px rgba(0,0,0,0.3)"
        py={0.5}
        minW="180px"
        maxW="240px"
        overflow="hidden"
      >
        {/* Header - sender info */}
        <Box px={2} py={1.5} borderBottom="1px solid" borderColor={glassBorder}>
          <Text fontSize="2xs" color={textSecondary} fontWeight="500" noOfLines={1}>
            {senderEmail}
          </Text>
        </Box>

        {/* Workspace AI Actions */}
        <Box py={0.5}>
          <MenuItem
            icon={SparklesIcon}
            label="Generate AI Reply"
            sublabel="Draft based on your style"
            onClick={() => {
              onGenerateReply?.();
              onClose();
            }}
          />
          <MenuItem
            icon={FolderPlusIcon}
            label="Save to Workspace"
            sublabel="Create a page from email"
            onClick={() => {
              onSaveToWorkspace?.();
              onClose();
            }}
          />
          {email.has_attachments && (
            <MenuItem
              icon={PaperClipIcon}
              label="Analyze Attachments"
              sublabel="Extract insights with AI"
              onClick={() => {
                onAnalyzeAttachments?.();
                onClose();
              }}
            />
          )}
        </Box>

        {/* Separator */}
        <Box h="1px" bg={glassBorder} mx={1.5} my={0.5} />

        {/* Keep Actions - non-destructive */}
        <Box py={0.5}>
          <MenuItem
            icon={ArchiveBoxIcon}
            label="Archive"
            sublabel="Keep but hide from inbox"
            onClick={archiveEmail}
          />
          <MenuItem
            icon={CheckCircleIcon}
            label="Mark as read"
            sublabel="Dismiss without action"
            onClick={markAsRead}
          />
        </Box>

        {/* Separator */}
        <Box h="1px" bg={glassBorder} mx={1.5} my={0.5} />

        {/* Filter Actions */}
        <Box py={0.5}>
          <MenuItem
            icon={UserMinusIcon}
            label="Block sender"
            sublabel="Add to noise filter"
            onClick={addSenderToFilter}
          />
          <MenuItem
            icon={GlobeAltIcon}
            label="Block domain"
            sublabel={`@${senderDomain}`}
            onClick={addDomainToFilter}
          />
        </Box>

        {/* Separator */}
        <Box h="1px" bg={glassBorder} mx={1.5} my={0.5} />

        {/* Destructive Actions */}
        <Box py={0.5}>
          <MenuItem
            icon={TrashIcon}
            label="Remove this email"
            onClick={removeFromIndex}
          />
          <MenuItem
            icon={NoSymbolIcon}
            label="Block domain & cleanup"
            sublabel="Remove all from index"
            onClick={addDomainAndCleanup}
            variant="danger"
          />
        </Box>
      </Box>
    </Portal>
  );
};

export default EmailContextMenu;
