/**
 * Deep Research Plan Card Component
 * Displays research plans in a visual, Gemini-style card format
 */

import React, { useState } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  VStack,
  HStack,
  Flex,
  Heading,
  Text,
  Button,
  Icon,
  Badge,
  Textarea,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  Divider,
} from '@chakra-ui/react';
import {
  ClipboardDocumentListIcon, 
  ChartBarIcon, 
  DocumentTextIcon,
  ClockIcon,
  ChevronRightIcon,
  PencilSquareIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';

interface DeepResearchPlanCardProps {
  content: string;
  onApprove: () => void;
  onRevise: (feedback: string) => void;
  isApproved?: boolean;
}

export default function DeepResearchPlanCard({
  content,
  onApprove,
  onRevise,
  isApproved = false,
}: DeepResearchPlanCardProps) {
  const [editedPlan, setEditedPlan] = useState(content);
  const [revisionFeedback, setRevisionFeedback] = useState('');
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  const { isOpen: isReviseOpen, onOpen: onReviseOpen, onClose: onReviseClose } = useDisclosure();
  
  // Safety check for hot reload issues
  if (!Flex || !Box || !VStack) {
    console.error('Chakra UI components not loaded properly');
    return <div>Loading...</div>;
  }
  
  const cardBg = useSemanticToken('surface.base');
  const cardBorder = useSemanticToken('border.default');
  const sectionBg = useSemanticToken('surface.elevated');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const borderLeftColor = useSemanticToken('border.subtle');
  const iconColor = useSemanticToken('text.secondary');
  
  // Approval badge colors
  const approvalBg = useSemanticToken('surface.base');
  const approvalBorder = 'green.500';
  const approvalIconColor = 'green.500';
  const approvalTitleColor = 'green.500';
  const approvalTextColor = 'green.500';
  
  // Parse content to extract title and sections
  const parseContent = (text: string) => {
    const lines = text.split('\n').filter(l => l.trim());
    
    // Extract title (first heading or first line)
    const titleMatch = text.match(/#+\s*(.+?)(?:\n|$)/);
    const title = titleMatch ? titleMatch[1].replace(/\*\*/g, '') : 'Research Plan';
    
    // Extract research steps (numbered items)
    const stepsMatch = text.match(/\(?\d+\)[^\n]+/g);
    const steps = stepsMatch || [];
    
    // Check for time estimate
    const timeMatch = text.match(/(?:Ready in|Estimated time|Duration):\s*([^.\n]+)/i);
    const timeEstimate = timeMatch ? timeMatch[1] : 'a few mins';
    
    return { title, steps, timeEstimate };
  };
  
  const { title, steps, timeEstimate } = parseContent(content);
  
  const handleApprove = () => {
    onApprove();
  };
  
  const handleRevise = () => {
    if (revisionFeedback.trim()) {
      onRevise(revisionFeedback);
      setRevisionFeedback('');
      onReviseClose();
    }
  };
  
  return (
    <>
      <Box
        bg={cardBg}
        borderRadius="2xl"
        p={6}
        borderWidth="1px"
        borderColor={cardBorder}
        shadow="sm"
        my={4}
        maxW="900px"
      >
        <VStack align="stretch" spacing={6}>
          {/* Header */}
          <Heading size="md" color={textColor} fontWeight="600">
            {title}
          </Heading>
          
          {/* Main Research Section */}
          <Box
            bg={sectionBg}
            borderRadius="lg"
            p={5}
            borderWidth="1px"
            borderColor={cardBorder}
          >
            <HStack align="flex-start" spacing={3} mb={4}>
              <Icon as={ClipboardDocumentListIcon} w={5} h={5} color={iconColor} mt={0.5} />
              <Text fontWeight="600" fontSize="md" color={textColor}>
                Research Websites
              </Text>
            </HStack>
            
            {/* Steps with left border */}
            <Box
              pl={4}
              borderLeftWidth="2px"
              borderLeftColor={borderLeftColor}
              ml={2}
            >
              {steps.length > 0 ? (
                <VStack align="stretch" spacing={4}>
                  {steps.map((step, idx) => (
                    <Text
                      key={idx}
                      fontSize="sm"
                      color={textColor}
                      lineHeight="1.7"
                    >
                      {step}
                    </Text>
                  ))}
                </VStack>
              ) : (
                <Text fontSize="sm" color={textColor} lineHeight="1.7" whiteSpace="pre-wrap">
                  {content}
                </Text>
              )}
            </Box>
          </Box>
          
          {/* Analyze Results Section */}
          <HStack spacing={3} pl={3}>
            <Icon as={ChartBarIcon} w={5} h={5} color={iconColor} />
            <Text fontWeight="600" fontSize="md" color={textColor}>
              Analyze Results
            </Text>
          </HStack>
          
          {/* Create Report Section */}
          <HStack spacing={3} pl={3}>
            <Icon as={DocumentTextIcon} w={5} h={5} color={iconColor} />
            <Text fontWeight="600" fontSize="md" color={textColor}>
              Create Report
            </Text>
          </HStack>
          
          {/* Time Estimate */}
          <HStack spacing={2} pl={3}>
            <Icon as={ClockIcon} w={4} h={4} color={mutedColor} />
            <Text fontSize="sm" color={mutedColor}>
              Ready in {timeEstimate}
            </Text>
          </HStack>
          
          <Divider />
          
          {/* Approval Badge or Action Buttons */}
          {isApproved ? (
            <Box
              bg={approvalBg}
              borderRadius="lg"
              px={4}
              py={3}
              borderWidth="1px"
              borderColor={approvalBorder}
            >
              <HStack spacing={3}>
                <Icon 
                  as={require('@heroicons/react/24/solid').CheckCircleIcon} 
                  w={6} 
                  h={6} 
                  color={approvalIconColor} 
                />
                <VStack align="start" spacing={0} flex={1}>
                  <Text fontSize="sm" fontWeight="600" color={approvalTitleColor}>
                    Plan Approved
                  </Text>
                  <Text fontSize="xs" color={approvalTextColor}>
                    Research initiated • Executing comprehensive search
                  </Text>
                </VStack>
              </HStack>
            </Box>
          ) : (
            <HStack justify="flex-end" spacing={3}>
              <Button
                variant="outline"
                size="md"
                colorScheme="gray"
                leftIcon={<Icon as={PencilSquareIcon} w={4} h={4} />}
                onClick={onReviseOpen}
                borderRadius="full"
              >
                Edit plan
              </Button>
              <Button
                colorScheme="blue"
                size="md"
                leftIcon={<Icon as={PlayIcon} w={4} h={4} />}
                onClick={handleApprove}
                borderRadius="full"
              >
                Start research
              </Button>
            </HStack>
          )}
        </VStack>
      </Box>
      
      {/* Revision Feedback Modal */}
      <Modal isOpen={isReviseOpen} onClose={onReviseClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Revise Research Plan</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Text fontSize="sm" color={mutedColor}>
                Describe what you'd like to change about the research plan:
              </Text>
              <Textarea
                value={revisionFeedback}
                onChange={(e) => setRevisionFeedback(e.target.value)}
                placeholder="E.g., Add more focus on labor market impacts, make it more narrative-driven..."
                rows={6}
                autoFocus
              />
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onReviseClose}>
              Cancel
            </Button>
            <Button 
              colorScheme="blue" 
              onClick={handleRevise}
              isDisabled={!revisionFeedback.trim()}
            >
              Submit Feedback
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
