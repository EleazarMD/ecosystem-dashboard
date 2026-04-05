/**
 * Enhanced Email List Component
 * 
 * Features:
 * - Multi-select with checkboxes
 * - Right-click context menu
 * - Batch operations toolbar
 * - Block sender/domain actions
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  VStack,
  HStack,
  Text,
  Badge,
  Box,
  Avatar,
  Spinner,
  Center,
  Icon,
  Checkbox,
  Collapse,
  IconButton,
} from '@chakra-ui/react';
import { InboxIcon, ChevronDownIcon, ChevronRightIcon, PaperClipIcon } from '@heroicons/react/24/outline';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { formatDistanceToNow } from 'date-fns';
import { EmailContextMenu } from './EmailContextMenu';
import { EmailBatchToolbar } from './EmailBatchToolbar';

export interface EmailItem {
  id: string;
  subject: string;
  from_email: string;
  from_name?: string;
  date?: string;
  snippet?: string;
  category?: string;
  is_sent?: boolean;
  is_read?: boolean;
  thread_id?: string;  // For grouping emails into threads
  attachments?: Array<{ filename: string; content_type: string; size?: number; is_inline?: boolean }>;
}

interface EmailListEnhancedProps {
  emails: EmailItem[];
  selectedId?: string;
  onSelect: (email: EmailItem) => void;
  loading?: boolean;
  emptyMessage?: string;
  graphragUrl: string;
  onEmailsChanged?: () => void;
  showBatchToolbar?: boolean;
}

const getCategoryColor = (category?: string): string => {
  switch (category) {
    case 'urgent': return 'red';
    case 'action_required': return 'orange';
    case 'meeting': return 'blue';
    case 'newsletter': return 'gray';
    case 'notification': return 'cyan';
    case 'personal': return 'purple';
    default: return 'gray';
  }
};

interface EmailThread {
  thread_id: string;
  emails: EmailItem[];
  latestDate: string;
}

const groupEmailsByThread = (emails: EmailItem[]): (EmailItem | EmailThread)[] => {
  const threads = new Map<string, EmailItem[]>();
  const standalone: EmailItem[] = [];
  
  // Group emails by thread_id
  emails.forEach(email => {
    if (email.thread_id) {
      const existing = threads.get(email.thread_id) || [];
      existing.push(email);
      threads.set(email.thread_id, existing);
    } else {
      standalone.push(email);
    }
  });
  
  // Convert to array, keeping threads with 2+ emails grouped
  const result: (EmailItem | EmailThread)[] = [];
  
  threads.forEach((threadEmails, thread_id) => {
    if (threadEmails.length > 1) {
      // Sort by date descending within thread
      threadEmails.sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
      });
      result.push({
        thread_id,
        emails: threadEmails,
        latestDate: threadEmails[0].date || '',
      });
    } else {
      // Single email in "thread" - treat as standalone
      standalone.push(...threadEmails);
    }
  });
  
  // Add standalone emails
  result.push(...standalone);
  
  // Sort by latest date
  result.sort((a, b) => {
    const dateA = 'latestDate' in a ? a.latestDate : (a.date || '');
    const dateB = 'latestDate' in b ? b.latestDate : (b.date || '');
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });
  
  return result;
};

const isThread = (item: EmailItem | EmailThread): item is EmailThread => {
  return 'emails' in item && Array.isArray(item.emails);
};

const EmailListItemEnhanced: React.FC<{
  email: EmailItem;
  isSelected: boolean;
  isChecked: boolean;
  onClick: () => void;
  onCheck: (checked: boolean) => void;
  onContextMenu: (e: React.MouseEvent) => void;
}> = ({ email, isSelected, isChecked, onClick, onCheck, onContextMenu }) => {
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const textTertiary = useSemanticToken('text.tertiary');
  const activeBg = useSemanticToken('interactive.surfaceActive');
  const hoverBg = useSemanticToken('interactive.surfaceHover');
  const borderColor = useSemanticToken('border.subtle');

  const fromEmail = email.from_email || '';
  const displayName = email.from_name || (fromEmail ? fromEmail.split('@')[0] : 'Unknown');
  const initials = displayName.slice(0, 2).toUpperCase();
  const timeAgo = email.date
    ? formatDistanceToNow(new Date(email.date), { addSuffix: true })
    : '';

  return (
    <Box
      p={{ base: 3, md: 3 }}
      borderRadius="lg"
      cursor="pointer"
      bg={isSelected || isChecked ? activeBg : 'transparent'}
      _hover={{ bg: isSelected ? activeBg : hoverBg }}
      _active={{ bg: activeBg }}
      onClick={onClick}
      onContextMenu={onContextMenu}
      borderBottom="1px solid"
      borderColor={borderColor}
      transition="all 0.15s"
      minH={{ base: '64px', md: 'auto' }}
      sx={{ touchAction: 'manipulation' }}
      w="full"
      minW={0}
      overflow="hidden"
    >
      <HStack spacing={{ base: 2, md: 3 }} align="start" w="full" minW={0}>
        {/* Checkbox - hidden on mobile for cleaner look */}
        <Box display={{ base: 'none', md: 'block' }}>
          <Checkbox
            isChecked={isChecked}
            onChange={(e) => {
              e.stopPropagation();
              onCheck(e.target.checked);
            }}
            onClick={(e) => e.stopPropagation()}
            colorScheme="purple"
            mt={1}
          />
        </Box>

        <Avatar
          size={{ base: 'md', md: 'sm' }}
          name={displayName}
          bg={isSelected ? 'blue.500' : isChecked ? 'purple.500' : 'gray.500'}
        />
        <VStack align="start" spacing={0} flex={1} minW={0} overflow="hidden">
          <HStack w="full" justify="space-between" spacing={2}>
            <HStack spacing={1} flex={1} minW={0}>
              <Text
                fontSize="sm"
                fontWeight={email.is_read === false ? 'bold' : 'medium'}
                color={textPrimary}
                noOfLines={1}
              >
                {displayName}
              </Text>
              {email.attachments && email.attachments.filter(a => !a.is_inline).length > 0 && (
                <Icon as={PaperClipIcon} boxSize="14px" color={textTertiary} flexShrink={0} />
              )}
            </HStack>
            <Text fontSize="xs" color={textTertiary} flexShrink={0} whiteSpace="nowrap">
              {timeAgo}
            </Text>
          </HStack>
          <Text
            fontSize="sm"
            fontWeight={email.is_read === false ? 'semibold' : 'normal'}
            color={textPrimary}
            noOfLines={1}
            w="full"
          >
            {email.subject || '(No Subject)'}
          </Text>
          <HStack spacing={2} mt={1} w="full" overflow="hidden">
            {email.category && email.category !== 'general' && (
              <Badge
                colorScheme={getCategoryColor(email.category)}
                variant="subtle"
                fontSize="xs"
                textTransform="capitalize"
                flexShrink={0}
              >
                {email.category.replace('_', ' ')}
              </Badge>
            )}
            {email.snippet && (
              <Text
                fontSize="xs"
                color={textTertiary}
                noOfLines={1}
                flex={1}
                minW={0}
              >
                {email.snippet}
              </Text>
            )}
          </HStack>
        </VStack>
      </HStack>
    </Box>
  );
};

export const EmailListEnhanced: React.FC<EmailListEnhancedProps> = ({
  emails,
  selectedId,
  onSelect,
  loading,
  emptyMessage = 'No emails found',
  graphragUrl,
  onEmailsChanged,
  showBatchToolbar = true,
}) => {
  const textSecondary = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.subtle');
  
  // Selection state
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  
  // Thread expansion state
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  
  // Group emails by thread
  const groupedItems = useMemo(() => groupEmailsByThread(emails), [emails]);
  
  const toggleThread = useCallback((threadId: string) => {
    setExpandedThreads(prev => {
      const next = new Set(prev);
      if (next.has(threadId)) {
        next.delete(threadId);
      } else {
        next.add(threadId);
      }
      return next;
    });
  }, []);
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    email: EmailItem | null;
  }>({
    isOpen: false,
    position: { x: 0, y: 0 },
    email: null,
  });

  const handleCheck = useCallback((emailId: string, checked: boolean) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(emailId);
      } else {
        next.delete(emailId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setCheckedIds(new Set(emails.map((e) => e.id)));
  }, [emails]);

  const handleSelectNone = useCallback(() => {
    setCheckedIds(new Set());
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent, email: EmailItem) => {
    e.preventDefault();
    setContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
      email,
    });
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const handleBatchDeleted = useCallback((ids: string[]) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
    onEmailsChanged?.();
  }, [onEmailsChanged]);

  if (loading) {
    return (
      <GlassPanel p={4} h="full">
        <Center h="200px">
          <Spinner size="lg" />
        </Center>
      </GlassPanel>
    );
  }

  if (emails.length === 0) {
    return (
      <GlassPanel p={4} h="full">
        <Center h="200px" flexDirection="column">
          <Icon as={InboxIcon} boxSize={12} color={textSecondary} mb={4} />
          <Text color={textSecondary}>{emptyMessage}</Text>
        </Center>
      </GlassPanel>
    );
  }

  return (
    <>
      <VStack spacing={0} h="full" align="stretch" w="full" minW={0} overflow="hidden">
        {/* Batch Toolbar */}
        {showBatchToolbar && (
          <EmailBatchToolbar
            selectedIds={checkedIds}
            totalEmails={emails.length}
            emails={emails}
            onSelectAll={handleSelectAll}
            onSelectNone={handleSelectNone}
            onEmailsDeleted={handleBatchDeleted}
            graphragUrl={graphragUrl}
          />
        )}

        {/* Email List with Thread Grouping */}
        <GlassPanel p={{ base: 1, md: 2 }} flex={1} overflowY="auto" overflowX="hidden" w="full" minW={0}>
          <VStack spacing={0} align="stretch" w="full" minW={0}>
            {groupedItems.map((item) => {
              if (isThread(item)) {
                // Render thread group
                const isExpanded = expandedThreads.has(item.thread_id);
                const latestEmail = item.emails[0];
                const participantNames = Array.from(new Set(item.emails.map(e => e.from_name || e.from_email.split('@')[0])));
                
                return (
                  <Box key={item.thread_id} w="full">
                    {/* Thread Header */}
                    <HStack
                      p={{ base: 2, md: 3 }}
                      cursor="pointer"
                      onClick={() => toggleThread(item.thread_id)}
                      _hover={{ bg: 'whiteAlpha.100' }}
                      borderBottom="1px solid"
                      borderColor={borderColor}
                      spacing={2}
                    >
                      <Icon
                        as={isExpanded ? ChevronDownIcon : ChevronRightIcon}
                        boxSize={4}
                        color={textSecondary}
                      />
                      <Badge colorScheme="blue" fontSize="xs">
                        {item.emails.length}
                      </Badge>
                      <Text fontWeight="medium" flex={1} noOfLines={1}>
                        {latestEmail.subject}
                      </Text>
                      <Text fontSize="xs" color={textSecondary} whiteSpace="nowrap">
                        {participantNames.slice(0, 2).join(', ')}
                        {participantNames.length > 2 && ` +${participantNames.length - 2}`}
                      </Text>
                    </HStack>
                    
                    {/* Thread Emails */}
                    <Collapse in={isExpanded}>
                      <Box pl={4} borderLeft="2px solid" borderColor="blue.500" ml={2}>
                        {item.emails.map((email) => (
                          <EmailListItemEnhanced
                            key={email.id}
                            email={email}
                            isSelected={selectedId === email.id}
                            isChecked={checkedIds.has(email.id)}
                            onClick={() => onSelect(email)}
                            onCheck={(checked) => handleCheck(email.id, checked)}
                            onContextMenu={(e) => handleContextMenu(e, email)}
                          />
                        ))}
                      </Box>
                    </Collapse>
                  </Box>
                );
              } else {
                // Render standalone email
                return (
                  <EmailListItemEnhanced
                    key={item.id}
                    email={item}
                    isSelected={selectedId === item.id}
                    isChecked={checkedIds.has(item.id)}
                    onClick={() => onSelect(item)}
                    onCheck={(checked) => handleCheck(item.id, checked)}
                    onContextMenu={(e) => handleContextMenu(e, item)}
                  />
                );
              }
            })}
          </VStack>
        </GlassPanel>
      </VStack>

      {/* Context Menu */}
      <EmailContextMenu
        isOpen={contextMenu.isOpen}
        onClose={handleCloseContextMenu}
        position={contextMenu.position}
        email={contextMenu.email}
        graphragUrl={graphragUrl}
        onActionComplete={onEmailsChanged}
      />
    </>
  );
};

export default EmailListEnhanced;
