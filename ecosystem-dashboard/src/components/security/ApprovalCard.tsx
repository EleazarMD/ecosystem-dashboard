'use client';

import React from 'react';
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  Badge,
  Button,
  HStack,
  VStack,
  Code,
  Collapse,
  useDisclosure,
  Icon,
  Tooltip,
  useToast,
} from '@chakra-ui/react';
import {
  CheckCircleIcon,
  WarningIcon,
  TimeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@chakra-ui/icons';
import { formatDistanceToNow } from 'date-fns';

export interface ApprovalRequest {
  id: string;
  userId: string;
  agentId: string;
  sessionId?: string;
  toolName: string;
  arguments: Record<string, unknown>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  context?: string;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  createdAt: string;
  expiresAt: string;
  decidedAt?: string;
  decisionReason?: string;
}

interface ApprovalCardProps {
  approval: ApprovalRequest;
  onApprove: (id: string) => Promise<void>;
  onDeny: (id: string, reason?: string) => Promise<void>;
  isLoading?: boolean;
}

const riskColors: Record<string, string> = {
  low: 'green',
  medium: 'yellow',
  high: 'orange',
  critical: 'red',
};

const statusColors: Record<string, string> = {
  pending: 'blue',
  approved: 'green',
  denied: 'red',
  expired: 'gray',
};

export function ApprovalCard({ approval, onApprove, onDeny, isLoading }: ApprovalCardProps) {
  const { isOpen, onToggle } = useDisclosure();
  const toast = useToast();
  const [actionLoading, setActionLoading] = React.useState<'approve' | 'deny' | null>(null);

  const isPending = approval.status === 'pending';
  const isExpired = new Date(approval.expiresAt) < new Date();
  const timeRemaining = isPending && !isExpired
    ? formatDistanceToNow(new Date(approval.expiresAt), { addSuffix: true })
    : null;

  const handleApprove = async () => {
    setActionLoading('approve');
    try {
      await onApprove(approval.id);
      toast({
        title: 'Approved',
        description: `Tool execution approved for ${approval.toolName}`,
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to approve request',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeny = async () => {
    setActionLoading('deny');
    try {
      await onDeny(approval.id);
      toast({
        title: 'Denied',
        description: `Tool execution denied for ${approval.toolName}`,
        status: 'warning',
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to deny request',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <Card
      variant="outline"
      borderColor={isPending ? `${riskColors[approval.riskLevel]}.300` : 'gray.200'}
      borderWidth={isPending ? 2 : 1}
      bg={isPending ? `${riskColors[approval.riskLevel]}.50` : 'white'}
      _dark={{
        bg: isPending ? `${riskColors[approval.riskLevel]}.900` : 'gray.800',
        borderColor: isPending ? `${riskColors[approval.riskLevel]}.600` : 'gray.600',
      }}
    >
      <CardHeader pb={2}>
        <HStack justify="space-between" align="start">
          <VStack align="start" spacing={1}>
            <HStack>
              <Heading size="sm">{approval.toolName}</Heading>
              <Badge colorScheme={riskColors[approval.riskLevel]} fontSize="xs">
                {approval.riskLevel.toUpperCase()}
              </Badge>
              <Badge colorScheme={statusColors[approval.status]} fontSize="xs">
                {approval.status.toUpperCase()}
              </Badge>
            </HStack>
            <Text fontSize="xs" color="gray.500">
              Agent: {approval.agentId}
            </Text>
          </VStack>
          
          {isPending && !isExpired && timeRemaining && (
            <Tooltip label="Time until expiration">
              <HStack spacing={1} color="gray.500">
                <TimeIcon boxSize={3} />
                <Text fontSize="xs">{timeRemaining}</Text>
              </HStack>
            </Tooltip>
          )}
        </HStack>
      </CardHeader>

      <CardBody pt={0}>
        {approval.context && (
          <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.300' }} mb={3}>
            {approval.context}
          </Text>
        )}

        <Box mb={3}>
          <Button
            size="xs"
            variant="ghost"
            onClick={onToggle}
            rightIcon={isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
          >
            {isOpen ? 'Hide' : 'Show'} Arguments
          </Button>
          <Collapse in={isOpen}>
            <Box
              mt={2}
              p={2}
              bg="gray.100"
              _dark={{ bg: 'gray.700' }}
              borderRadius="md"
              maxH="200px"
              overflowY="auto"
            >
              <Code
                display="block"
                whiteSpace="pre-wrap"
                fontSize="xs"
                bg="transparent"
              >
                {JSON.stringify(approval.arguments, null, 2)}
              </Code>
            </Box>
          </Collapse>
        </Box>

        {isPending && !isExpired ? (
          <HStack spacing={3}>
            <Button
              colorScheme="green"
              size="sm"
              leftIcon={<CheckCircleIcon />}
              onClick={handleApprove}
              isLoading={actionLoading === 'approve'}
              isDisabled={isLoading || actionLoading !== null}
            >
              Approve
            </Button>
            <Button
              colorScheme="red"
              variant="outline"
              size="sm"
              leftIcon={<WarningIcon />}
              onClick={handleDeny}
              isLoading={actionLoading === 'deny'}
              isDisabled={isLoading || actionLoading !== null}
            >
              Deny
            </Button>
          </HStack>
        ) : (
          <HStack spacing={2}>
            <Badge colorScheme={statusColors[approval.status]}>
              {approval.status === 'expired' ? 'Expired' : 
               approval.status === 'approved' ? 'Approved' : 'Denied'}
            </Badge>
            {approval.decidedAt && (
              <Text fontSize="xs" color="gray.500">
                {formatDistanceToNow(new Date(approval.decidedAt), { addSuffix: true })}
              </Text>
            )}
          </HStack>
        )}
      </CardBody>
    </Card>
  );
}
