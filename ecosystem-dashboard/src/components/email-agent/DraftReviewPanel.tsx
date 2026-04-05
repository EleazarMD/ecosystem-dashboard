/**
 * AI Draft Review Panel - Review, edit, and approve AI-generated drafts
 */

import React, { useState } from 'react';
import {
  VStack,
  HStack,
  Text,
  Box,
  Button,
  Textarea,
  Badge,
  Avatar,
  Divider,
  Icon,
  IconButton,
  Tooltip,
  Alert,
  AlertIcon,
  Progress,
  useToast,
} from '@chakra-ui/react';
import {
  CheckIcon,
  XMarkIcon,
  PencilIcon,
  SparklesIcon,
  ArrowPathIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';

export interface DraftItem {
  id: string;
  email_id: string;
  to: string;
  to_name?: string;
  subject: string;
  body: string;
  original_subject?: string;
  original_from?: string;
  confidence: number;
  similar_emails_used: number;
  created_at?: string;
  status: 'pending' | 'approved' | 'rejected' | 'edited';
}

interface DraftReviewPanelProps {
  draft: DraftItem | null;
  onApprove: (draft: DraftItem, editedBody?: string) => Promise<void>;
  onReject: (draft: DraftItem) => Promise<void>;
  onRegenerate: (draft: DraftItem) => Promise<void>;
  loading?: boolean;
}

export const DraftReviewPanel: React.FC<DraftReviewPanelProps> = ({
  draft,
  onApprove,
  onReject,
  onRegenerate,
  loading,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedBody, setEditedBody] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const toast = useToast();

  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const textTertiary = useSemanticToken('text.tertiary');
  const borderColor = useSemanticToken('border.subtle');
  const successColor = useSemanticToken('status.success');
  const warningColor = useSemanticToken('status.warning');

  const handleStartEdit = () => {
    if (draft) {
      setEditedBody(draft.body);
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedBody('');
  };

  const handleApprove = async () => {
    if (!draft) return;
    setActionLoading('approve');
    try {
      await onApprove(draft, isEditing ? editedBody : undefined);
      setIsEditing(false);
      toast({
        title: 'Draft approved',
        description: 'Email will be sent via Apple Mail',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to approve draft',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!draft) return;
    setActionLoading('reject');
    try {
      await onReject(draft);
      toast({
        title: 'Draft rejected',
        status: 'info',
        duration: 2000,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reject draft',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRegenerate = async () => {
    if (!draft) return;
    setActionLoading('regenerate');
    try {
      await onRegenerate(draft);
      toast({
        title: 'Regenerating draft',
        description: 'AI is creating a new reply',
        status: 'info',
        duration: 2000,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to regenerate draft',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setActionLoading(null);
    }
  };

  if (!draft) {
    return (
      <GlassPanel p={6} h="full">
        <VStack h="full" justify="center" spacing={4}>
          <Icon as={SparklesIcon} boxSize={16} color={textTertiary} />
          <Text color={textSecondary} fontSize="lg" textAlign="center">
            Select a draft to review
          </Text>
          <Text color={textTertiary} fontSize="sm" textAlign="center">
            AI-generated drafts will appear here for your approval
          </Text>
        </VStack>
      </GlassPanel>
    );
  }

  const confidenceColor = draft.confidence >= 0.7 ? 'green' : draft.confidence >= 0.5 ? 'yellow' : 'red';

  return (
    <GlassPanel p={0} h="full" overflow="hidden">
      <VStack align="stretch" h="full" spacing={0}>
        {/* Header */}
        <Box p={4} borderBottom="1px solid" borderColor={borderColor}>
          <HStack justify="space-between" mb={3}>
            <HStack>
              <Icon as={SparklesIcon} color="purple.400" />
              <Text fontWeight="semibold" color={textPrimary}>
                AI Draft Review
              </Text>
            </HStack>
            <Badge colorScheme={confidenceColor} variant="subtle">
              {Math.round(draft.confidence * 100)}% confidence
            </Badge>
          </HStack>

          {/* Original email context */}
          {draft.original_from && (
            <Alert status="info" variant="subtle" borderRadius="md" mb={3}>
              <AlertIcon />
              <VStack align="start" spacing={0}>
                <Text fontSize="sm">
                  Replying to: <strong>{draft.original_from}</strong>
                </Text>
                <Text fontSize="xs" color={textTertiary}>
                  {draft.original_subject}
                </Text>
              </VStack>
            </Alert>
          )}

          {/* To/Subject */}
          <VStack align="stretch" spacing={2}>
            <HStack>
              <Text fontSize="sm" color={textTertiary} w="60px">To:</Text>
              <Text fontSize="sm" color={textPrimary}>{draft.to}</Text>
            </HStack>
            <HStack>
              <Text fontSize="sm" color={textTertiary} w="60px">Subject:</Text>
              <Text fontSize="sm" color={textPrimary}>{draft.subject}</Text>
            </HStack>
          </VStack>

          {/* Confidence bar */}
          <Box mt={3}>
            <HStack justify="space-between" mb={1}>
              <Text fontSize="xs" color={textTertiary}>
                Based on {draft.similar_emails_used} similar emails
              </Text>
            </HStack>
            <Progress
              value={draft.confidence * 100}
              size="xs"
              colorScheme={confidenceColor}
              borderRadius="full"
            />
          </Box>
        </Box>

        {/* Body */}
        <Box flex={1} p={4} overflowY="auto">
          {isEditing ? (
            <Textarea
              value={editedBody}
              onChange={(e) => setEditedBody(e.target.value)}
              h="full"
              minH="300px"
              resize="none"
              fontSize="sm"
              fontFamily="inherit"
              placeholder="Edit your reply..."
            />
          ) : (
            <Text
              color={textPrimary}
              whiteSpace="pre-wrap"
              fontSize="sm"
              lineHeight="tall"
            >
              {draft.body}
            </Text>
          )}
        </Box>

        {/* Actions */}
        <Box p={4} borderTop="1px solid" borderColor={borderColor}>
          <HStack spacing={2} mb={3}>
            {isEditing ? (
              <>
                <Button
                  flex={1}
                  leftIcon={<Icon as={CheckIcon} />}
                  colorScheme="green"
                  onClick={handleApprove}
                  isLoading={actionLoading === 'approve'}
                >
                  Save & Send
                </Button>
                <Button
                  flex={1}
                  leftIcon={<Icon as={XMarkIcon} />}
                  variant="outline"
                  onClick={handleCancelEdit}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  flex={1}
                  leftIcon={<Icon as={PaperAirplaneIcon} />}
                  colorScheme="green"
                  onClick={handleApprove}
                  isLoading={actionLoading === 'approve'}
                >
                  Approve & Send
                </Button>
                <Tooltip label="Edit before sending">
                  <IconButton
                    aria-label="Edit"
                    icon={<Icon as={PencilIcon} />}
                    variant="outline"
                    onClick={handleStartEdit}
                  />
                </Tooltip>
                <Tooltip label="Regenerate draft">
                  <IconButton
                    aria-label="Regenerate"
                    icon={<Icon as={ArrowPathIcon} />}
                    variant="outline"
                    onClick={handleRegenerate}
                    isLoading={actionLoading === 'regenerate'}
                  />
                </Tooltip>
                <Tooltip label="Reject draft">
                  <IconButton
                    aria-label="Reject"
                    icon={<Icon as={XMarkIcon} />}
                    variant="outline"
                    colorScheme="red"
                    onClick={handleReject}
                    isLoading={actionLoading === 'reject'}
                  />
                </Tooltip>
              </>
            )}
          </HStack>
          <Text fontSize="xs" color={textTertiary} textAlign="center">
            Approved emails will be created as drafts in Apple Mail
          </Text>
        </Box>
      </VStack>
    </GlassPanel>
  );
};

export default DraftReviewPanel;
