/**
 * Email Agent Sidebar - Folder Navigation
 */

import React from 'react';
import {
  VStack,
  HStack,
  Text,
  Icon,
  Badge,
  Box,
} from '@chakra-ui/react';
import {
  InboxIcon,
  PaperAirplaneIcon,
  DocumentTextIcon,
  SparklesIcon,
  Cog6ToothIcon,
  UserGroupIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';

export type EmailFolder = 'inbox' | 'sent' | 'drafts' | 'ai-drafts' | 'search' | 'contacts' | 'settings';

interface FolderItemProps {
  icon: React.ElementType;
  label: string;
  count?: number;
  badge?: string;
  badgeColor?: string;
  isActive?: boolean;
  onClick: () => void;
}

const FolderItem: React.FC<FolderItemProps> = ({
  icon,
  label,
  count,
  badge,
  badgeColor,
  isActive,
  onClick,
}) => {
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const activeBg = useSemanticToken('interactive.surfaceActive');
  const hoverBg = useSemanticToken('interactive.surfaceHover');
  const primaryColor = useSemanticToken('interactive.primary');

  return (
    <HStack
      w="full"
      px={3}
      py={2}
      borderRadius="lg"
      cursor="pointer"
      bg={isActive ? activeBg : 'transparent'}
      _hover={{ bg: isActive ? activeBg : hoverBg }}
      onClick={onClick}
      transition="all 0.2s"
    >
      <Icon
        as={icon}
        boxSize={5}
        color={isActive ? primaryColor : textSecondary}
      />
      <Text
        flex={1}
        fontSize="sm"
        fontWeight={isActive ? 'semibold' : 'medium'}
        color={isActive ? textPrimary : textSecondary}
      >
        {label}
      </Text>
      {count !== undefined && count > 0 && (
        <Badge
          colorScheme="gray"
          variant="subtle"
          fontSize="xs"
          borderRadius="full"
        >
          {count}
        </Badge>
      )}
      {badge && (
        <Badge
          colorScheme={badgeColor || 'purple'}
          variant="subtle"
          fontSize="xs"
          borderRadius="full"
        >
          {badge}
        </Badge>
      )}
    </HStack>
  );
};

interface EmailSidebarProps {
  activeFolder: EmailFolder;
  onFolderChange: (folder: EmailFolder) => void;
  counts?: {
    inbox?: number;
    sent?: number;
    drafts?: number;
    aiDrafts?: number;
    contacts?: number;
  };
}

export const EmailSidebar: React.FC<EmailSidebarProps> = ({
  activeFolder,
  onFolderChange,
  counts = {},
}) => {
  const borderColor = useSemanticToken('border.subtle');
  const textTertiary = useSemanticToken('text.tertiary');

  return (
    <GlassPanel p={4} h="full" minW="220px">
      <VStack spacing={1} align="stretch">
        {/* Main Folders */}
        <Text
          fontSize="xs"
          fontWeight="semibold"
          color={textTertiary}
          textTransform="uppercase"
          letterSpacing="wider"
          px={3}
          mb={2}
        >
          Mailbox
        </Text>
        
        <FolderItem
          icon={InboxIcon}
          label="Inbox"
          count={counts.inbox}
          isActive={activeFolder === 'inbox'}
          onClick={() => onFolderChange('inbox')}
        />
        <FolderItem
          icon={PaperAirplaneIcon}
          label="Sent"
          count={counts.sent}
          isActive={activeFolder === 'sent'}
          onClick={() => onFolderChange('sent')}
        />
        <FolderItem
          icon={DocumentTextIcon}
          label="Drafts"
          count={counts.drafts}
          isActive={activeFolder === 'drafts'}
          onClick={() => onFolderChange('drafts')}
        />

        <Box h={4} />

        {/* AI Features */}
        <Text
          fontSize="xs"
          fontWeight="semibold"
          color={textTertiary}
          textTransform="uppercase"
          letterSpacing="wider"
          px={3}
          mb={2}
        >
          AI Assistant
        </Text>

        <FolderItem
          icon={SparklesIcon}
          label="AI Drafts"
          count={counts.aiDrafts}
          badge={counts.aiDrafts && counts.aiDrafts > 0 ? 'Review' : undefined}
          badgeColor="orange"
          isActive={activeFolder === 'ai-drafts'}
          onClick={() => onFolderChange('ai-drafts')}
        />
        <FolderItem
          icon={MagnifyingGlassIcon}
          label="Search"
          isActive={activeFolder === 'search'}
          onClick={() => onFolderChange('search')}
        />
        <FolderItem
          icon={UserGroupIcon}
          label="Contacts"
          count={counts.contacts}
          isActive={activeFolder === 'contacts'}
          onClick={() => onFolderChange('contacts')}
        />

        <Box h={4} />

        {/* Settings */}
        <FolderItem
          icon={Cog6ToothIcon}
          label="Settings"
          isActive={activeFolder === 'settings'}
          onClick={() => onFolderChange('settings')}
        />
      </VStack>
    </GlassPanel>
  );
};

export default EmailSidebar;
