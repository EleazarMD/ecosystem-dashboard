import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  Spinner,
  useColorModeValue,
  Collapse,
  Badge,
} from '@chakra-ui/react';
import {
  CheckCircleIcon,
  SparklesIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  UserIcon,
  PencilSquareIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';

export interface ThinkingStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  detail?: string;
  icon?: 'search' | 'analyze' | 'profile' | 'write' | 'thinking' | 'sparkles';
}

interface GenerationProgressProps {
  steps: ThinkingStep[];
  isVisible: boolean;
  currentThought?: string;
}

const stepIcons = {
  search: MagnifyingGlassIcon,
  analyze: DocumentTextIcon,
  profile: UserIcon,
  write: PencilSquareIcon,
  thinking: LightBulbIcon,
  sparkles: SparklesIcon,
};

export const GenerationProgress: React.FC<GenerationProgressProps> = ({
  steps,
  isVisible,
  currentThought,
}) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const activeColor = useColorModeValue('blue.500', 'blue.300');
  const completedColor = useColorModeValue('green.500', 'green.300');
  const pendingColor = useColorModeValue('gray.400', 'gray.500');
  const thoughtBg = useColorModeValue('blue.50', 'blue.900');

  return (
    <Collapse in={isVisible} animateOpacity>
      <Box
        bg={bgColor}
        borderRadius="lg"
        border="1px solid"
        borderColor={borderColor}
        p={4}
        mb={4}
        shadow="sm"
      >
        <HStack mb={3} spacing={2}>
          <Icon as={SparklesIcon} boxSize={5} color={activeColor} />
          <Text fontWeight="semibold" fontSize="sm">
            AI is generating your reply...
          </Text>
        </HStack>

        <VStack align="stretch" spacing={2}>
          {steps.map((step, index) => {
            const StepIcon = step.icon ? stepIcons[step.icon] : LightBulbIcon;
            const isActive = step.status === 'active';
            const isCompleted = step.status === 'completed';
            const isPending = step.status === 'pending';

            return (
              <HStack
                key={step.id}
                spacing={3}
                opacity={isPending ? 0.5 : 1}
                transition="opacity 0.2s"
              >
                <Box position="relative" w={5} h={5}>
                  {isActive ? (
                    <Spinner size="sm" color={activeColor} />
                  ) : isCompleted ? (
                    <Icon
                      as={CheckCircleSolidIcon}
                      boxSize={5}
                      color={completedColor}
                    />
                  ) : (
                    <Icon
                      as={StepIcon}
                      boxSize={5}
                      color={pendingColor}
                    />
                  )}
                </Box>

                <VStack align="start" spacing={0} flex={1}>
                  <Text
                    fontSize="sm"
                    fontWeight={isActive ? 'medium' : 'normal'}
                    color={isActive ? activeColor : isCompleted ? completedColor : pendingColor}
                  >
                    {step.label}
                  </Text>
                  {step.detail && (isActive || isCompleted) && (
                    <Text fontSize="xs" color="gray.500">
                      {step.detail}
                    </Text>
                  )}
                </VStack>

                {isCompleted && (
                  <Badge colorScheme="green" size="sm" fontSize="xs">
                    Done
                  </Badge>
                )}
              </HStack>
            );
          })}
        </VStack>

        {currentThought && (
          <Box
            mt={3}
            p={3}
            bg={thoughtBg}
            borderRadius="md"
            borderLeft="3px solid"
            borderLeftColor={activeColor}
          >
            <Text fontSize="xs" color="gray.500" mb={1}>
              Current thinking:
            </Text>
            <Text fontSize="sm" fontStyle="italic">
              {currentThought}
            </Text>
          </Box>
        )}
      </Box>
    </Collapse>
  );
};

// Default steps for email generation
export const getDefaultGenerationSteps = (): ThinkingStep[] => [
  {
    id: 'fetch',
    label: 'Fetching email context',
    status: 'pending',
    icon: 'search',
  },
  {
    id: 'analyze',
    label: 'Analyzing email content',
    status: 'pending',
    icon: 'analyze',
  },
  {
    id: 'similar',
    label: 'Finding similar sent emails',
    status: 'pending',
    icon: 'search',
  },
  {
    id: 'profile',
    label: 'Loading user profile & style',
    status: 'pending',
    icon: 'profile',
  },
  {
    id: 'generate',
    label: 'Generating reply draft',
    status: 'pending',
    icon: 'write',
  },
  {
    id: 'save',
    label: 'Saving draft',
    status: 'pending',
    icon: 'sparkles',
  },
];

export default GenerationProgress;
