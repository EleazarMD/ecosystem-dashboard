/**
 * ChildApprovalQueue Component
 * 
 * Displays child approval requests in a queue format.
 * Integrates with the main approvals dashboard.
 */

import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Button,
  IconButton,
  Avatar,
  Spinner,
  Alert,
  AlertIcon,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  Textarea,
  Select,
  Divider,
  Icon,
} from '@chakra-ui/react';
import {
  FiCheck,
  FiX,
  FiClock,
  FiMessageSquare,
  FiUser,
  FiRefreshCw,
  FiChevronRight,
} from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useChildApprovals, ChildApprovalRequest } from '@/hooks/useChildApprovals';
import { formatDistanceToNow } from 'date-fns';

interface ChildApprovalQueueProps {
  childId?: string;
  showHeader?: boolean;
  maxItems?: number;
  onApprovalChange?: () => void;
}

const REQUEST_TYPE_ICONS: Record<string, typeof FiMessageSquare> = {
  conversation: FiMessageSquare,
  service_access: FiUser,
  extended_time: FiClock,
  content_unlock: FiUser,
  feature_request: FiUser,
};

const REQUEST_TYPE_COLORS: Record<string, string> = {
  conversation: 'blue',
  service_access: 'purple',
  extended_time: 'orange',
  content_unlock: 'yellow',
  feature_request: 'green',
};

function ApprovalItemCard({
  approval,
  onApprove,
  onReject,
}: {
  approval: ChildApprovalRequest;
  onApprove: (id: string, notes?: string, hours?: number) => Promise<boolean>;
  onReject: (id: string, notes?: string) => Promise<boolean>;
}) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isProcessing, setIsProcessing] = useState(false);
  const [notes, setNotes] = useState('');
  const [expiryHours, setExpiryHours] = useState('24');
  const [action, setAction] = useState<'approve' | 'reject'>('approve');
  const toast = useToast();

  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const borderSubtle = useSemanticToken('border.subtle');

  const handleAction = async (actionType: 'approve' | 'reject') => {
    setAction(actionType);
    onOpen();
  };

  const confirmAction = async () => {
    setIsProcessing(true);
    try {
      let success: boolean;
      if (action === 'approve') {
        success = await onApprove(approval.id, notes, parseInt(expiryHours));
      } else {
        success = await onReject(approval.id, notes);
      }

      if (success) {
        toast({
          title: `Request ${action}d`,
          description: `${approval.childName}'s request has been ${action}d.`,
          status: action === 'approve' ? 'success' : 'info',
          duration: 3000,
        });
        onClose();
      } else {
        toast({
          title: 'Action failed',
          description: 'Please try again.',
          status: 'error',
          duration: 3000,
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const timeAgo = formatDistanceToNow(new Date(approval.created_at), { addSuffix: true });
  const RequestIcon = REQUEST_TYPE_ICONS[approval.requestType] || FiUser;
  const colorScheme = REQUEST_TYPE_COLORS[approval.requestType] || 'gray';

  return (
    <>
      <GlassPanel variant="light" p={3}>
        <HStack spacing={3} align="start">
          <Avatar size="sm" name={approval.childName} />
          <VStack align="start" spacing={1} flex={1}>
            <HStack justify="space-between" w="100%">
              <HStack spacing={2}>
                <Text fontWeight="600" fontSize="sm" color={textPrimary}>
                  {approval.childName}
                </Text>
                <Badge colorScheme={colorScheme} fontSize="10px">
                  <Icon as={RequestIcon} mr={1} />
                  {approval.requestType.replace('_', ' ')}
                </Badge>
              </HStack>
              <Text fontSize="xs" color={textSecondary}>
                {timeAgo}
              </Text>
            </HStack>
            <Text fontSize="sm" color={textPrimary}>
              {approval.title}
            </Text>
            {approval.summary && (
              <Text fontSize="xs" color={textSecondary} noOfLines={2}>
                {approval.summary}
              </Text>
            )}
            {approval.status === 'pending' && (
              <HStack spacing={2} pt={2}>
                <Button
                  size="xs"
                  colorScheme="green"
                  leftIcon={<FiCheck />}
                  onClick={() => handleAction('approve')}
                  isDisabled={isProcessing}
                >
                  Approve
                </Button>
                <Button
                  size="xs"
                  colorScheme="red"
                  variant="outline"
                  leftIcon={<FiX />}
                  onClick={() => handleAction('reject')}
                  isDisabled={isProcessing}
                >
                  Reject
                </Button>
              </HStack>
            )}
            {approval.status !== 'pending' && (
              <Badge
                colorScheme={
                  approval.status === 'approved'
                    ? 'green'
                    : approval.status === 'rejected'
                    ? 'red'
                    : 'gray'
                }
                fontSize="10px"
              >
                {approval.status}
              </Badge>
            )}
          </VStack>
        </HStack>
      </GlassPanel>

      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {action === 'approve' ? '✅ Approve Request' : '❌ Reject Request'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Box>
                <Text fontWeight="600">{approval.title}</Text>
                <Text fontSize="sm" color="gray.500">
                  From {approval.childName}
                </Text>
              </Box>

              {action === 'approve' && (
                <Box>
                  <Text fontSize="sm" fontWeight="500" mb={1}>
                    Approval Duration
                  </Text>
                  <Select
                    value={expiryHours}
                    onChange={(e) => setExpiryHours(e.target.value)}
                    size="sm"
                  >
                    <option value="1">1 hour</option>
                    <option value="4">4 hours</option>
                    <option value="8">8 hours</option>
                    <option value="24">24 hours</option>
                    <option value="48">2 days</option>
                    <option value="168">1 week</option>
                  </Select>
                </Box>
              )}

              <Box>
                <Text fontSize="sm" fontWeight="500" mb={1}>
                  Notes (optional)
                </Text>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={
                    action === 'approve'
                      ? 'Any instructions for your child...'
                      : 'Reason for rejection...'
                  }
                  size="sm"
                  rows={3}
                />
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose} isDisabled={isProcessing}>
              Cancel
            </Button>
            <Button
              colorScheme={action === 'approve' ? 'green' : 'red'}
              onClick={confirmAction}
              isLoading={isProcessing}
            >
              {action === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

export function ChildApprovalQueue({
  childId,
  showHeader = true,
  maxItems,
  onApprovalChange,
}: ChildApprovalQueueProps) {
  const {
    approvals,
    counts,
    isLoading,
    error,
    refresh,
    approve,
    reject,
  } = useChildApprovals({
    childId,
    autoRefresh: true,
    refreshInterval: 30000,
  });

  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');

  const handleApprove = async (id: string, notes?: string, hours?: number) => {
    const success = await approve(id, notes, hours);
    if (success && onApprovalChange) {
      onApprovalChange();
    }
    return success;
  };

  const handleReject = async (id: string, notes?: string) => {
    const success = await reject(id, notes);
    if (success && onApprovalChange) {
      onApprovalChange();
    }
    return success;
  };

  const displayApprovals = maxItems ? approvals.slice(0, maxItems) : approvals;
  const pendingApprovals = displayApprovals.filter((a) => a.status === 'pending');

  if (isLoading) {
    return (
      <Box textAlign="center" py={8}>
        <Spinner size="lg" />
        <Text mt={2} color={textSecondary}>
          Loading child requests...
        </Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert status="error" borderRadius="md">
        <AlertIcon />
        {error}
      </Alert>
    );
  }

  return (
    <VStack spacing={4} align="stretch">
      {showHeader && (
        <HStack justify="space-between">
          <HStack spacing={2}>
            <Text fontWeight="600" color={textPrimary}>
              Child Requests
            </Text>
            {counts.pending > 0 && (
              <Badge colorScheme="orange" variant="solid" borderRadius="full">
                {counts.pending} pending
              </Badge>
            )}
          </HStack>
          <IconButton
            aria-label="Refresh"
            icon={<FiRefreshCw />}
            size="sm"
            variant="ghost"
            onClick={refresh}
          />
        </HStack>
      )}

      {pendingApprovals.length === 0 ? (
        <GlassPanel variant="light" p={6} textAlign="center">
          <Text color={textSecondary}>No pending requests from your children</Text>
        </GlassPanel>
      ) : (
        <VStack spacing={3} align="stretch">
          {pendingApprovals.map((approval) => (
            <ApprovalItemCard
              key={approval.id}
              approval={approval}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </VStack>
      )}

      {maxItems && approvals.length > maxItems && (
        <Button
          variant="ghost"
          size="sm"
          rightIcon={<FiChevronRight />}
          as="a"
          href="/approvals?tab=children"
        >
          View all {counts.total} requests
        </Button>
      )}
    </VStack>
  );
}

export default ChildApprovalQueue;
