/**
 * Email Preview Component - Shows email content
 */

import React from 'react';
import {
  VStack,
  HStack,
  Text,
  Badge,
  Box,
  Avatar,
  Divider,
  Button,
  Icon,
  IconButton,
  Tooltip,
  Center,
} from '@chakra-ui/react';
import {
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  TrashIcon,
  SparklesIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { format } from 'date-fns';
import type { EmailItem } from './EmailList';

interface EmailPreviewProps {
  email: EmailItem | null;
  onReply?: () => void;
  onForward?: () => void;
  onDelete?: () => void;
  onGenerateAIReply?: () => void;
  loading?: boolean;
}

export const EmailPreview: React.FC<EmailPreviewProps> = ({
  email,
  onReply,
  onForward,
  onDelete,
  onGenerateAIReply,
  loading,
}) => {
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const textTertiary = useSemanticToken('text.tertiary');
  const borderColor = useSemanticToken('border.subtle');
  const primaryColor = useSemanticToken('interactive.primary');

  if (!email) {
    return (
      <GlassPanel p={4} h="full">
        <Center h="full" flexDirection="column">
          <Icon as={EnvelopeIcon} boxSize={16} color={textTertiary} mb={4} />
          <Text color={textSecondary} fontSize="lg">
            Select an email to preview
          </Text>
          <Text color={textTertiary} fontSize="sm" mt={2}>
            Choose an email from the list to view its contents
          </Text>
        </Center>
      </GlassPanel>
    );
  }

  const displayName = email.from_name || email.from_email.split('@')[0];
  const formattedDate = email.date
    ? format(new Date(email.date), 'PPpp')
    : 'Unknown date';

  return (
    <GlassPanel p={0} h="full" overflow="hidden">
      <VStack align="stretch" h="full" spacing={0}>
        {/* Header */}
        <Box p={4} borderBottom="1px solid" borderColor={borderColor}>
          <HStack justify="space-between" mb={4}>
            <Text fontSize="xl" fontWeight="bold" color={textPrimary}>
              {email.subject || '(No Subject)'}
            </Text>
            <HStack spacing={1}>
              <Tooltip label="Reply">
                <IconButton
                  aria-label="Reply"
                  icon={<Icon as={ArrowUturnLeftIcon} />}
                  variant="ghost"
                  size="sm"
                  onClick={onReply}
                />
              </Tooltip>
              <Tooltip label="Forward">
                <IconButton
                  aria-label="Forward"
                  icon={<Icon as={ArrowUturnRightIcon} />}
                  variant="ghost"
                  size="sm"
                  onClick={onForward}
                />
              </Tooltip>
              <Tooltip label="Delete">
                <IconButton
                  aria-label="Delete"
                  icon={<Icon as={TrashIcon} />}
                  variant="ghost"
                  size="sm"
                  colorScheme="red"
                  onClick={onDelete}
                />
              </Tooltip>
            </HStack>
          </HStack>

          <HStack spacing={3}>
            <Avatar size="md" name={displayName} />
            <VStack align="start" spacing={0} flex={1}>
              <HStack>
                <Text fontWeight="semibold" color={textPrimary}>
                  {displayName}
                </Text>
                {email.category && email.category !== 'general' && (
                  <Badge
                    colorScheme={
                      email.category === 'urgent' ? 'red' :
                      email.category === 'action_required' ? 'orange' :
                      email.category === 'meeting' ? 'blue' : 'gray'
                    }
                    variant="subtle"
                    fontSize="xs"
                    textTransform="capitalize"
                  >
                    {email.category.replace('_', ' ')}
                  </Badge>
                )}
              </HStack>
              <Text fontSize="sm" color={textSecondary}>
                {email.from_email}
              </Text>
              <Text fontSize="xs" color={textTertiary}>
                {formattedDate}
              </Text>
            </VStack>
          </HStack>
        </Box>

        {/* Body */}
        <Box flex={1} p={4} overflowY="auto">
          <Text
            color={textPrimary}
            whiteSpace="pre-wrap"
            fontSize="sm"
            lineHeight="tall"
          >
            {email.snippet || 'No content available. Full email content will be shown when fetched from the server.'}
          </Text>
        </Box>

        {/* AI Actions Footer */}
        <Box p={4} borderTop="1px solid" borderColor={borderColor}>
          <Button
            leftIcon={<Icon as={SparklesIcon} />}
            colorScheme="purple"
            variant="solid"
            size="md"
            w="full"
            onClick={onGenerateAIReply}
            isLoading={loading}
          >
            Generate AI Reply
          </Button>
          <Text fontSize="xs" color={textTertiary} mt={2} textAlign="center">
            AI will draft a reply based on your writing style
          </Text>
        </Box>
      </VStack>
    </GlassPanel>
  );
};

export default EmailPreview;
