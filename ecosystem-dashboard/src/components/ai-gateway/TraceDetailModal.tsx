import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Box,
  Text,
  Badge,
  Code,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  VStack,
  Divider,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from '@chakra-ui/react';
import { Trace } from '../../types/ai-gateway';

interface TraceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  trace: Trace | null;
}

export const TraceDetailModal: React.FC<TraceDetailModalProps> = ({
  isOpen,
  onClose,
  trace,
}) => {
  if (!trace) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 6,
    }).format(amount);
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'green';
      case 'error': return 'red';
      case 'in_progress': return 'blue';
      default: return 'gray';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Trace Details</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack align="stretch" spacing={4}>
            <Box>
              <Text fontWeight="bold" mb={2}>Request Information</Text>
              <SimpleGrid columns={2} spacing={2}>
                <Text fontSize="sm"><strong>Trace ID:</strong></Text>
                <Code fontSize="xs">{trace.traceId}</Code>
                
                <Text fontSize="sm"><strong>Timestamp:</strong></Text>
                <Text fontSize="sm">{new Date(trace.timestamp).toLocaleString()}</Text>
                
                <Text fontSize="sm"><strong>Model:</strong></Text>
                <Text fontSize="sm">{trace.request.model}</Text>
                
                <Text fontSize="sm"><strong>Provider:</strong></Text>
                <Badge colorScheme="blue">{trace.routing.selectedProvider}</Badge>
                
                <Text fontSize="sm"><strong>Duration:</strong></Text>
                <Text fontSize="sm">{formatDuration(trace.duration)}</Text>
                
                <Text fontSize="sm"><strong>Status:</strong></Text>
                <Badge colorScheme={getStatusColor(trace.status)}>
                  {trace.status}
                </Badge>
              </SimpleGrid>
            </Box>

            <Divider />

            <Box>
              <Text fontWeight="bold" mb={2}>Metrics</Text>
              <SimpleGrid columns={3} spacing={2}>
                <Stat size="sm">
                  <StatLabel>Prompt Tokens</StatLabel>
                  <StatNumber fontSize="md">{trace.metrics.tokenCount.prompt}</StatNumber>
                </Stat>
                <Stat size="sm">
                  <StatLabel>Completion Tokens</StatLabel>
                  <StatNumber fontSize="md">{trace.metrics.tokenCount.completion}</StatNumber>
                </Stat>
                <Stat size="sm">
                  <StatLabel>Total Cost</StatLabel>
                  <StatNumber fontSize="md">{formatCurrency(trace.metrics.cost.total)}</StatNumber>
                </Stat>
              </SimpleGrid>
            </Box>

            {trace.error && (
              <>
                <Divider />
                <Box>
                  <Text fontWeight="bold" mb={2} color="red.500">Error Details</Text>
                  <Alert status="error">
                    <AlertIcon />
                    <Box>
                      <AlertTitle>{trace.error.code}</AlertTitle>
                      <AlertDescription fontSize="sm">
                        {trace.error.message}
                      </AlertDescription>
                    </Box>
                  </Alert>
                </Box>
              </>
            )}

            {trace.response && (
              <>
                <Divider />
                <Box>
                  <Text fontWeight="bold" mb={2}>Response Content</Text>
                  <Code display="block" whiteSpace="pre-wrap" p={2} fontSize="xs" maxH="200px" overflowY="auto">
                    {trace.response.content}
                  </Code>
                </Box>
              </>
            )}
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
