/**
 * Node Details Panel
 * Right panel component for displaying selected node details
 */

import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Divider,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Icon,
  Button,
} from '@chakra-ui/react';
import {
  UserIcon,
  TagIcon,
  FaceSmileIcon,
  FolderIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useRightPanel } from '@/contexts/RightPanelContext';

const NODE_TYPE_CONFIG = {
  person: { icon: UserIcon, color: 'indigo', label: 'Contact' },
  topic: { icon: TagIcon, color: 'orange', label: 'Topic' },
  sentiment: { icon: FaceSmileIcon, color: 'green', label: 'Sentiment' },
  category: { icon: FolderIcon, color: 'purple', label: 'Category' },
};

export default function NodeDetailsPanel() {
  const textColor = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.subtle');
  const bgSubtle = useSemanticToken('surface.subtle');
  const { customData } = useRightPanel();

  const { selectedNode } = customData || {};

  if (!selectedNode) {
    return (
      <Box p={4} h="full">
        <VStack justify="center" h="200px" spacing={3}>
          <Icon as={EnvelopeIcon} boxSize={8} color={textSecondary} />
          <Text color={textSecondary} textAlign="center">
            Click on a node in the graph to view its details
          </Text>
        </VStack>
      </Box>
    );
  }

  const typeConfig = NODE_TYPE_CONFIG[selectedNode.type as keyof typeof NODE_TYPE_CONFIG] || NODE_TYPE_CONFIG.person;

  return (
    <Box p={4} h="full" overflowY="auto">
      <VStack align="stretch" spacing={4}>
        {/* Node Header */}
        <Box bg={bgSubtle} p={3} borderRadius="md">
          <HStack spacing={3}>
            <Box
              p={2}
              borderRadius="md"
              bg={`${typeConfig.color}.100`}
              _dark={{ bg: `${typeConfig.color}.900` }}
            >
              <Icon as={typeConfig.icon} boxSize={5} color={`${typeConfig.color}.500`} />
            </Box>
            <Box flex={1}>
              <Text fontWeight="600" color={textColor} noOfLines={1}>
                {selectedNode.name}
              </Text>
              <Badge colorScheme={typeConfig.color} size="sm">
                {typeConfig.label}
              </Badge>
            </Box>
          </HStack>
        </Box>

        {/* Contact Details */}
        {selectedNode.type === 'person' && selectedNode.email && (
          <>
            <Box>
              <Text fontSize="sm" color={textSecondary} mb={1}>Email</Text>
              <Text fontSize="sm" color={textColor}>{selectedNode.email}</Text>
            </Box>
            <Divider borderColor={borderColor} />
          </>
        )}

        {/* Stats */}
        <Box>
          <Text fontWeight="600" color={textColor} mb={3}>Statistics</Text>
          <VStack align="stretch" spacing={3}>
            {selectedNode.type === 'person' && (
              <>
                <HStack justify="space-between">
                  <Stat size="sm">
                    <StatLabel color={textSecondary}>Sent</StatLabel>
                    <StatNumber fontSize="lg">{selectedNode.sent_count || 0}</StatNumber>
                  </Stat>
                  <Stat size="sm">
                    <StatLabel color={textSecondary}>Received</StatLabel>
                    <StatNumber fontSize="lg">{selectedNode.received_count || 0}</StatNumber>
                  </Stat>
                </HStack>
                <Stat size="sm">
                  <StatLabel color={textSecondary}>Total Emails</StatLabel>
                  <StatNumber>{selectedNode.email_count || 0}</StatNumber>
                </Stat>
              </>
            )}

            {(selectedNode.type === 'topic' || selectedNode.type === 'category') && (
              <Stat size="sm">
                <StatLabel color={textSecondary}>Occurrences</StatLabel>
                <StatNumber>{selectedNode.count || selectedNode.email_count || 0}</StatNumber>
                <StatHelpText>emails with this {selectedNode.type}</StatHelpText>
              </Stat>
            )}

            {selectedNode.type === 'sentiment' && (
              <Stat size="sm">
                <StatLabel color={textSecondary}>Emails</StatLabel>
                <StatNumber>{selectedNode.count || 0}</StatNumber>
                <StatHelpText>with {selectedNode.name} sentiment</StatHelpText>
              </Stat>
            )}
          </VStack>
        </Box>

        <Divider borderColor={borderColor} />

        {/* Actions */}
        <VStack align="stretch" spacing={2}>
          <Button size="sm" colorScheme="blue" variant="outline">
            View Related Emails
          </Button>
          {selectedNode.type === 'person' && (
            <Button size="sm" colorScheme="purple" variant="outline">
              View Conversation History
            </Button>
          )}
        </VStack>
      </VStack>
    </Box>
  );
}
