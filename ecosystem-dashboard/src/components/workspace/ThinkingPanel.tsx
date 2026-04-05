/**
 * ThinkingPanel - Displays AI planning and thinking in real-time
 * Similar to Notion AI's thinking sidebar
 */

import React from 'react';
import {
  Box,
  VStack,
  Text,
  HStack,
  Badge,
  Progress,
  Icon,
  Collapse,
  useDisclosure,
} from '@chakra-ui/react';
import { CheckCircleIcon, SpinnerIcon } from '@chakra-ui/icons';
import { FaBrain, FaCheckCircle, FaCircle, FaSpinner } from 'react-icons/fa';
import { useSemanticToken } from '@/hooks/useSemanticToken';

export interface PlanStep {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  detail?: string;
  result?: string;
}

export interface Thought {
  content: string;
  step_id?: string;
  timestamp: number;
}

interface ThinkingPanelProps {
  plan: PlanStep[];
  thoughts: Thought[];
  currentStep?: PlanStep;
  progress?: number;
  isVisible: boolean;
}

export const ThinkingPanel: React.FC<ThinkingPanelProps> = ({
  plan,
  thoughts,
  currentStep,
  progress = 0,
  isVisible,
}) => {
  const { isOpen: showThoughts, onToggle } = useDisclosure({ defaultIsOpen: true });

  if (!isVisible) return null;

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <Icon as={FaCheckCircle} color="green.500" />;
      case 'in_progress':
        return <Icon as={FaSpinner} color="blue.500" className="animate-spin" />;
      default:
        return <Icon as={FaCircle} color={useSemanticToken('text.tertiary')} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'green';
      case 'in_progress':
        return 'blue';
      default:
        return 'gray';
    }
  };

  return (
    <Box
      position="fixed"
      right="400px"
      top="80px"
      width="320px"
      maxHeight="calc(100vh - 100px)"
      bg={useSemanticToken('surface.elevated')}
      borderRadius="lg"
      boxShadow="xl"
      border="1px solid"
      borderColor={useSemanticToken('border.default')}
      overflow="hidden"
      zIndex={100}
    >
      {/* Header */}
      <Box
        bg="purple.50"
        borderBottom="1px solid"
        borderColor="purple.200"
        p={4}
      >
        <HStack spacing={2}>
          <Icon as={FaBrain} color="purple.600" />
          <Text fontWeight="bold" color="purple.900">
            AI Planning
          </Text>
          {currentStep && (
            <Badge colorScheme="blue" ml="auto">
              Thinking...
            </Badge>
          )}
        </HStack>

        {/* Progress Bar */}
        {plan.length > 0 && (
          <Box mt={3}>
            <HStack justifyContent="space-between" mb={1}>
              <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                Progress
              </Text>
              <Text fontSize="sm" fontWeight="medium">
                {progress}%
              </Text>
            </HStack>
            <Progress
              value={progress}
              size="sm"
              colorScheme="purple"
              borderRadius="full"
            />
          </Box>
        )}
      </Box>

      {/* Scrollable Content */}
      <Box
        maxHeight="calc(100vh - 220px)"
        overflowY="auto"
        p={4}
      >
        <VStack spacing={4} align="stretch">
          {/* Plan Steps */}
          {plan.length > 0 && (
            <Box>
              <Text fontSize="sm" fontWeight="semibold" mb={3} color={useSemanticToken('text.primary')}>
                Execution Plan
              </Text>
              <VStack spacing={2} align="stretch">
                {plan.map((step, index) => (
                  <Box
                    key={step.id}
                    p={3}
                    bg={step.status === 'in_progress' ? 'blue.50' : 'gray.50'}
                    borderRadius="md"
                    border="1px solid"
                    borderColor={
                      step.status === 'in_progress' ? 'blue.200' : 'gray.200'
                    }
                  >
                    <HStack spacing={2} align="start">
                      {getStepIcon(step.status)}
                      <Box flex={1}>
                        <HStack>
                          <Text fontSize="sm" fontWeight="medium">
                            {step.title}
                          </Text>
                          <Badge
                            size="sm"
                            colorScheme={getStatusColor(step.status)}
                            fontSize="xs"
                          >
                            {step.status === 'in_progress' ? 'Active' :
                              step.status === 'completed' ? 'Done' : 'Pending'}
                          </Badge>
                        </HStack>
                        {step.description && (
                          <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
                            {step.description}
                          </Text>
                        )}
                        {step.detail && (
                          <Text fontSize="xs" color="blue.600" mt={1} fontStyle="italic">
                            {step.detail}
                          </Text>
                        )}
                      </Box>
                    </HStack>
                  </Box>
                ))}
              </VStack>
            </Box>
          )}

          {/* Thoughts Section */}
          {thoughts.length > 0 && (
            <Box>
              <Text
                fontSize="sm"
                fontWeight="semibold"
                mb={3}
                color={useSemanticToken('text.primary')}
                cursor="pointer"
                onClick={onToggle}
              >
                Thoughts ({thoughts.length})
              </Text>
              <Collapse in={showThoughts} animateOpacity>
                <VStack spacing={2} align="stretch">
                  {thoughts.slice(-5).map((thought, index) => (
                    <Box
                      key={index}
                      p={2}
                      bg="yellow.50"
                      borderRadius="md"
                      borderLeft="3px solid"
                      borderColor="yellow.400"
                    >
                      <Text fontSize="xs" color={useSemanticToken('text.primary')}>
                        💭 {thought.content}
                      </Text>
                    </Box>
                  ))}
                </VStack>
              </Collapse>
            </Box>
          )}
        </VStack>
      </Box>
    </Box>
  );
};

export default ThinkingPanel;
