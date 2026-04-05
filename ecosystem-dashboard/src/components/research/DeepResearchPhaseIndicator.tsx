import React from 'react';
import {
  Box,
  HStack,
  VStack,
  Text,
  Icon,
  Progress,
} from '@chakra-ui/react';
import { FiHelpCircle, FiMapPin, FiZap, FiCheck } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

export type DeepResearchPhase = 'idle' | 'clarification' | 'planning' | 'approval' | 'executing' | 'complete' | 'completed';

interface PhaseStep {
  phase: DeepResearchPhase;
  label: string;
  icon: React.ElementType;
  description: string;
}

const PHASES: PhaseStep[] = [
  {
    phase: 'clarification',
    label: 'Clarification',
    icon: FiHelpCircle,
    description: 'Understanding your research needs',
  },
  {
    phase: 'planning',
    label: 'Planning',
    icon: FiMapPin,
    description: 'Creating strategic research plan',
  },
  {
    phase: 'executing',
    label: 'Executing',
    icon: FiZap,
    description: 'Conducting deep research',
  },
];

interface DeepResearchPhaseIndicatorProps {
  currentPhase: DeepResearchPhase;
  compact?: boolean;
}

export const DeepResearchPhaseIndicator: React.FC<DeepResearchPhaseIndicatorProps> = ({
  currentPhase,
  compact = false,
}) => {
  const activeColor = 'blue.500';
  const completedColor = 'green.500';
  const inactiveColor = useSemanticToken('text.tertiary');
  const bgActive = useSemanticToken('surface.highlight');
  const bgCompleted = useSemanticToken('surface.highlight');
  const bgInactive = useSemanticToken('surface.base');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.default');
  const surfaceBg = useSemanticToken('surface.elevated');

  // Map phases to display phases
  const displayPhase = currentPhase === 'complete' ? 'completed' : 
                      currentPhase === 'approval' ? 'planning' :
                      currentPhase === 'idle' ? 'clarification' : currentPhase;
  
  const currentPhaseIndex = PHASES.findIndex(p => p.phase === displayPhase);
  const progressValue = displayPhase === 'completed' 
    ? 100 
    : currentPhaseIndex >= 0
      ? ((currentPhaseIndex + 1) / PHASES.length) * 100
      : 0;

  const getPhaseStatus = (phaseIndex: number): 'completed' | 'active' | 'pending' => {
    if (currentPhase === 'completed' || phaseIndex < currentPhaseIndex) return 'completed';
    if (phaseIndex === currentPhaseIndex) return 'active';
    return 'pending';
  };

  if (compact) {
    return (
      <VStack spacing={2} align="stretch" w="full">
        {/* Phase labels */}
        <HStack spacing={4} justify="space-between" w="full">
          {PHASES.map((phase, index) => {
            const status = getPhaseStatus(index);
            const isActive = status === 'active';
            const isCompleted = status === 'completed';
            
            return (
              <HStack key={phase.phase} spacing={2} flex={1} justify="center">
                <Icon
                  as={isCompleted ? FiCheck : phase.icon}
                  boxSize={4}
                  color={
                    isCompleted 
                      ? completedColor 
                      : isActive 
                        ? activeColor 
                        : inactiveColor
                  }
                />
                <Text
                  fontSize="xs"
                  fontWeight={isActive ? 'bold' : 'medium'}
                  color={isActive ? activeColor : isCompleted ? completedColor : mutedColor}
                >
                  {phase.label}
                </Text>
              </HStack>
            );
          })}
        </HStack>
        
        {/* Progress bar */}
        <Progress 
          value={progressValue} 
          size="sm" 
          colorScheme={currentPhase === 'completed' ? 'green' : 'blue'}
          borderRadius="full"
          w="full"
        />
      </VStack>
    );
  }

  return (
    <Box
      p={4}
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="lg"
      bg={surfaceBg}
    >
      <VStack align="stretch" spacing={4}>
        {/* Progress bar */}
        <Box>
          <HStack justify="space-between" mb={2}>
            <Text fontSize="sm" fontWeight="bold" color={textColor}>
              Deep Research Progress
            </Text>
            <Text fontSize="xs" color={mutedColor}>
              {currentPhase === 'completed' 
                ? 'Complete' 
                : `Phase ${currentPhaseIndex + 1}/${PHASES.length}`}
            </Text>
          </HStack>
          <Progress 
            value={progressValue} 
            size="sm" 
            colorScheme={currentPhase === 'completed' ? 'green' : 'blue'}
            borderRadius="full"
          />
        </Box>

        {/* Phase steps */}
        <HStack spacing={4} justify="space-between">
          {PHASES.map((phase, index) => {
            const status = getPhaseStatus(index);
            const isActive = status === 'active';
            const isCompleted = status === 'completed';
            
            return (
              <VStack
                key={phase.phase}
                flex={1}
                p={3}
                borderRadius="md"
                bg={isCompleted ? bgCompleted : isActive ? bgActive : bgInactive}
                borderWidth="2px"
                borderColor={
                  isCompleted 
                    ? completedColor 
                    : isActive 
                      ? activeColor 
                      : inactiveColor
                }
                spacing={2}
                transition="all 0.3s"
              >
                <Icon
                  as={isCompleted ? FiCheck : phase.icon}
                  boxSize={6}
                  color={
                    isCompleted 
                      ? completedColor 
                      : isActive 
                        ? activeColor 
                        : inactiveColor
                  }
                />
                <Text
                  fontSize="sm"
                  fontWeight={isActive ? 'bold' : 'medium'}
                  color={isActive ? activeColor : isCompleted ? completedColor : mutedColor}
                  textAlign="center"
                >
                  {phase.label}
                </Text>
                {isActive && (
                  <Text fontSize="xs" color={mutedColor} textAlign="center">
                    {phase.description}
                  </Text>
                )}
              </VStack>
            );
          })}
        </HStack>
      </VStack>
    </Box>
  );
};
