/**
 * AI Truth Engine - Approval Decision Modal Component
 * 
 * Modal interface for reviewing individual AI-generated memory corrections.
 * Provides side-by-side content comparison and decision controls.
 * 
 * @module components/ide-memory/ApprovalDecisionModal
 * @version 1.0.0
 * @updated 2025-08-15
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  Textarea,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Divider,
  Alert,
  AlertIcon,
  Code,
  Tag,
  TagLabel,
  TagLeftIcon,
  Progress,
  Flex,
  Icon,
  useToast
} from '@chakra-ui/react';
import {
  FiCheck,
  FiX,
  FiEdit3,
  FiFileText,
  FiTarget,
  FiGitBranch,
  FiCheckCircle,
  FiTrendingUp,
  FiClock,
  FiAlertTriangle,
  FiExternalLink
} from 'react-icons/fi';
import { useApprovalDecision } from '../../hooks/useApprovalWorkflow';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface PendingCorrection {
  id: string;
  memory_id: string;
  memory_title: string;
  correction_type: 'factual' | 'consistency' | 'compliance' | 'optimization';
  original_content: string;
  proposed_content: string;
  ai_reasoning: string;
  evidence_sources: string[];
  confidence_score: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  workspace: string;
  affected_files: string[];
  impact_assessment: {
    scope: 'local' | 'workspace' | 'ecosystem';
    risk_level: 'low' | 'medium' | 'high';
    dependencies: string[];
  };
}

interface ApprovalDecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  correction: PendingCorrection | null;
  onDecisionMade?: () => void;
}

const ApprovalDecisionModal: React.FC<ApprovalDecisionModalProps> = ({
  isOpen,
  onClose,
  correction,
  onDecisionMade
}) => {
  const [decision, setDecision] = useState<'approve' | 'reject' | 'modify' | null>(null);
  const [comments, setComments] = useState('');
  const [modifiedContent, setModifiedContent] = useState('');
  const [activeTab, setActiveTab] = useState(0);

  const { processDecision, processing, error } = useApprovalDecision();
  const toast = useToast();

  // Color mode values
  const modalBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const textColor = useSemanticToken('text.secondary');
  const codeBg = useSemanticToken('surface.base');

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen && correction) {
      setDecision(null);
      setComments('');
      setModifiedContent(correction.proposed_content);
      setActiveTab(0);
    }
  }, [isOpen, correction]);

  // Priority colors
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'red';
      case 'high': return 'orange';
      case 'medium': return 'yellow';
      case 'low': return 'green';
      default: return 'gray';
    }
  };

  // Type icons
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'factual': return FiTarget;
      case 'consistency': return FiGitBranch;
      case 'compliance': return FiCheckCircle;
      case 'optimization': return FiTrendingUp;
      default: return FiFileText;
    }
  };

  // Handle decision submission
  const handleSubmitDecision = async () => {
    if (!correction || !decision) return;

    try {
      const decisionData = {
        correction_id: correction.id,
        decision,
        human_comments: comments || undefined,
        modified_content: decision === 'modify' ? modifiedContent : undefined,
        reviewer_id: 'dashboard-user',
        reviewer_name: 'Dashboard User'
      };

      await processDecision(decisionData);

      toast({
        title: 'Decision Processed',
        description: `Correction ${decision}d successfully`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      onDecisionMade?.();
      onClose();
    } catch (error) {
      toast({
        title: 'Decision Failed',
        description: 'Failed to process decision',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  if (!correction) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent bg={modalBg} maxH="90vh">
        <ModalHeader>
          <VStack align="start" spacing={2}>
            <HStack>
              <Icon as={getTypeIcon(correction.correction_type)} />
              <Text fontSize="lg" fontWeight="semibold">
                Review AI Correction
              </Text>
              <Badge colorScheme={getPriorityColor(correction.priority)}>
                {correction.priority.toUpperCase()}
              </Badge>
            </HStack>
            <Text fontSize="md" color={textColor}>
              {correction.memory_title}
            </Text>
          </VStack>
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          <VStack spacing={6} align="stretch">
            {/* Correction Overview */}
            <Box>
              <HStack spacing={6} wrap="wrap" mb={4}>
                <VStack align="start" spacing={1}>
                  <Text fontSize="sm" color={textColor}>Confidence Score</Text>
                  <HStack>
                    <Text fontSize="lg" fontWeight="semibold" color="blue.500">
                      {correction?.confidence_score ? Math.round(correction.confidence_score * 100) : 0}%
                    </Text>
                    <Progress
                      value={correction?.confidence_score ? correction.confidence_score * 100 : 0}
                      size="sm"
                      colorScheme="blue"
                      width="100px"
                    />
                  </HStack>
                </VStack>

                <VStack align="start" spacing={1}>
                  <Text fontSize="sm" color={textColor}>Created</Text>
                  <HStack>
                    <Icon as={FiClock} />
                    <Text fontSize="sm">
                      {correction?.created_at ? new Date(correction.created_at).toLocaleString() : 'Unknown'}
                    </Text>
                  </HStack>
                </VStack>

                <VStack align="start" spacing={1}>
                  <Text fontSize="sm" color={textColor}>Workspace</Text>
                  <Text fontSize="sm" fontWeight="medium">
                    {correction?.workspace || 'Unknown'}
                  </Text>
                </VStack>
              </HStack>

              {/* Impact Assessment */}
              <HStack spacing={3} wrap="wrap">
                <Tag size="sm" colorScheme="blue">
                  <TagLabel>Scope: {correction?.impact_assessment?.scope || 'unknown'}</TagLabel>
                </Tag>
                <Tag size="sm" colorScheme={correction?.impact_assessment?.risk_level === 'high' ? 'red' : 
                                            correction?.impact_assessment?.risk_level === 'medium' ? 'yellow' : 'green'}>
                  <TagLeftIcon as={FiAlertTriangle} />
                  <TagLabel>Risk: {correction?.impact_assessment?.risk_level || 'unknown'}</TagLabel>
                </Tag>
                <Tag size="sm" colorScheme="purple">
                  <TagLabel>{correction?.affected_files?.length || 0} files affected</TagLabel>
                </Tag>
              </HStack>
            </Box>

            <Divider />

            {/* Content Tabs */}
            <Tabs index={activeTab} onChange={setActiveTab}>
              <TabList>
                <Tab>Content Comparison</Tab>
                <Tab>AI Reasoning</Tab>
                <Tab>Evidence Sources</Tab>
                <Tab>Impact Details</Tab>
              </TabList>

              <TabPanels>
                {/* Content Comparison */}
                <TabPanel px={0}>
                  <VStack spacing={4} align="stretch">
                    <HStack spacing={4} align="start">
                      {/* Original Content */}
                      <Box flex="1">
                        <Text fontSize="sm" fontWeight="semibold" mb={2} color="red.500">
                          Original Content
                        </Text>
                        <Box
                          bg={codeBg}
                          p={4}
                          borderRadius="md"
                          border="1px solid"
                          borderColor="red.200"
                          maxH="300px"
                          overflowY="auto"
                        >
                          <Text fontSize="sm" fontFamily="mono" whiteSpace="pre-wrap">
                            {correction?.original_content || ''}
                          </Text>
                        </Box>
                      </Box>

                      {/* Proposed Content */}
                      <Box flex="1">
                        <Text fontSize="sm" fontWeight="semibold" mb={2} color="green.500">
                          Proposed Content
                        </Text>
                        <Box
                          bg={codeBg}
                          p={4}
                          borderRadius="md"
                          border="1px solid"
                          borderColor="green.200"
                          maxH="300px"
                          overflowY="auto"
                        >
                          <Text fontSize="sm" fontFamily="mono" whiteSpace="pre-wrap">
                            {correction?.proposed_content || ''}
                          </Text>
                        </Box>
                      </Box>
                    </HStack>

                    {/* Modified Content (if modifying) */}
                    {decision === 'modify' && (
                      <Box>
                        <Text fontSize="sm" fontWeight="semibold" mb={2} color="blue.500">
                          Your Modified Content
                        </Text>
                        <Textarea
                          value={modifiedContent}
                          onChange={(e) => setModifiedContent(e.target.value)}
                          placeholder="Enter your modified content..."
                          rows={8}
                          fontFamily="mono"
                          fontSize="sm"
                        />
                      </Box>
                    )}
                  </VStack>
                </TabPanel>

                {/* AI Reasoning */}
                <TabPanel px={0}>
                  <Box bg={codeBg} p={4} borderRadius="md">
                    <Text fontSize="sm" whiteSpace="pre-wrap">
                      {correction?.ai_reasoning || 'No AI reasoning provided'}
                    </Text>
                  </Box>
                </TabPanel>

                {/* Evidence Sources */}
                <TabPanel px={0}>
                  <VStack spacing={3} align="stretch">
                    {correction?.evidence_sources?.length ? (
                      correction.evidence_sources.map((source, index) => (
                        <HStack key={index} p={3} bg={codeBg} borderRadius="md">
                          <Icon as={FiFileText} />
                          <Text fontSize="sm" flex="1" fontFamily="mono">
                            {source}
                          </Text>
                          <Icon as={FiExternalLink} color={textColor} />
                        </HStack>
                      ))
                    ) : (
                      <Text fontSize="sm" color={textColor}>No evidence sources available</Text>
                    )}
                  </VStack>
                </TabPanel>

                {/* Impact Details */}
                <TabPanel px={0}>
                  <VStack spacing={4} align="stretch">
                    <Box>
                      <Text fontSize="sm" fontWeight="semibold" mb={2}>
                        Affected Files
                      </Text>
                      <VStack spacing={2} align="stretch">
                        {correction?.affected_files?.length ? (
                          correction.affected_files.map((file, index) => (
                            <HStack key={index} p={2} bg={codeBg} borderRadius="md">
                              <Icon as={FiFileText} />
                              <Text fontSize="sm" fontFamily="mono">
                                {file}
                              </Text>
                            </HStack>
                          ))
                        ) : (
                          <Text fontSize="sm" color={textColor}>No affected files</Text>
                        )}
                      </VStack>
                    </Box>

                    <Box>
                      <Text fontSize="sm" fontWeight="semibold" mb={2}>
                        Dependencies
                      </Text>
                      <VStack spacing={4} align="stretch">
                        {correction?.impact_assessment?.dependencies?.map((dep, index) => (
                          <Tag key={index} size="sm" colorScheme="gray">
                            <TagLabel>{dep}</TagLabel>
                          </Tag>
                        )) || <Text fontSize="sm" color={useSemanticToken('text.secondary')}>No dependencies found</Text>}
                      </VStack>
                    </Box>
                  </VStack>
                </TabPanel>
              </TabPanels>
            </Tabs>

            <Divider />

            {/* Decision Section */}
            <VStack spacing={4} align="stretch">
              <Text fontSize="md" fontWeight="semibold">
                Your Decision
              </Text>

              {/* Decision Buttons */}
              <HStack spacing={4} justify="center">
                <Button
                  colorScheme={decision === 'approve' ? 'green' : 'gray'}
                  variant={decision === 'approve' ? 'solid' : 'outline'}
                  leftIcon={<FiCheck />}
                  onClick={() => setDecision('approve')}
                >
                  Approve
                </Button>
                <Button
                  colorScheme={decision === 'modify' ? 'blue' : 'gray'}
                  variant={decision === 'modify' ? 'solid' : 'outline'}
                  leftIcon={<FiEdit3 />}
                  onClick={() => setDecision('modify')}
                >
                  Modify
                </Button>
                <Button
                  colorScheme={decision === 'reject' ? 'red' : 'gray'}
                  variant={decision === 'reject' ? 'solid' : 'outline'}
                  leftIcon={<FiX />}
                  onClick={() => setDecision('reject')}
                >
                  Reject
                </Button>
              </HStack>

              {/* Comments */}
              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={2}>
                  Comments (Optional)
                </Text>
                <Textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Add any comments about your decision..."
                  rows={3}
                />
              </Box>

              {/* Error Display */}
              {error && (
                <Alert status="error">
                  <AlertIcon />
                  {error}
                </Alert>
              )}
            </VStack>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3}>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleSubmitDecision}
              isDisabled={!decision}
              isLoading={processing}
              loadingText="Processing..."
            >
              Submit Decision
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ApprovalDecisionModal;
