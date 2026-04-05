/**
 * Email List Component - Shows list of emails
 */

import React from 'react';
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
} from '@chakra-ui/react';
import { InboxIcon, PaperClipIcon } from '@heroicons/react/24/outline';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { formatDistanceToNow } from 'date-fns';

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
  attachments?: Array<{ filename: string; content_type: string; size?: number; is_inline?: boolean }>;
}

interface EmailListProps {
  emails: EmailItem[];
  selectedId?: string;
  onSelect: (email: EmailItem) => void;
  loading?: boolean;
  emptyMessage?: string;
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

const EmailListItem: React.FC<{
  email: EmailItem;
  isSelected: boolean;
  onClick: () => void;
}> = ({ email, isSelected, onClick }) => {
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const textTertiary = useSemanticToken('text.tertiary');
  const activeBg = useSemanticToken('interactive.surfaceActive');
  const hoverBg = useSemanticToken('interactive.surfaceHover');
  const borderColor = useSemanticToken('border.subtle');

  const displayName = email.from_name || email.from_email.split('@')[0];
  const initials = displayName.slice(0, 2).toUpperCase();
  const timeAgo = email.date
    ? formatDistanceToNow(new Date(email.date), { addSuffix: true })
    : '';

  return (
    <Box
      p={3}
      borderRadius="lg"
      cursor="pointer"
      bg={isSelected ? activeBg : 'transparent'}
      _hover={{ bg: isSelected ? activeBg : hoverBg }}
      onClick={onClick}
      borderBottom="1px solid"
      borderColor={borderColor}
      transition="all 0.15s"
    >
      <HStack spacing={3} align="start">
        <Avatar
          size="sm"
          name={displayName}
          bg={isSelected ? 'blue.500' : 'gray.500'}
        />
        <VStack align="start" spacing={0} flex={1} minW={0}>
          <HStack w="full" justify="space-between">
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
            <Text fontSize="xs" color={textTertiary} flexShrink={0}>
              {timeAgo}
            </Text>
          </HStack>
          <Text
            fontSize="sm"
            fontWeight={email.is_read === false ? 'semibold' : 'normal'}
            color={textPrimary}
            noOfLines={1}
          >
            {email.subject || '(No Subject)'}
          </Text>
          <HStack spacing={2} mt={1}>
            {email.category && email.category !== 'general' && (
              <Badge
                colorScheme={getCategoryColor(email.category)}
                variant="subtle"
                fontSize="xs"
                textTransform="capitalize"
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

export const EmailList: React.FC<EmailListProps> = ({
  emails,
  selectedId,
  onSelect,
  loading,
  emptyMessage = 'No emails found',
}) => {
  const textSecondary = useSemanticToken('text.secondary');

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
    <GlassPanel p={2} h="full" overflowY="auto">
      <VStack spacing={0} align="stretch">
        {emails.map((email) => (
          <EmailListItem
            key={email.id}
            email={email}
            isSelected={selectedId === email.id}
            onClick={() => onSelect(email)}
          />
        ))}
      </VStack>
    </GlassPanel>
  );
};

export default EmailList;
