/**
 * Thinking Accordion Component
 * Displays agent's planning and thinking process in a collapsible accordion
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  Collapse,
  Spinner,
  Badge,
} from '@chakra-ui/react';
import { FiChevronDown, FiChevronRight, FiCheckCircle, FiCircle, FiTool } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface PlanStep {
  id: string;
  title: string;
  description?: string;
  detail?: string;
  status: 'pending' | 'in_progress' | 'completed';
}

interface ThinkingData {
  plan?: PlanStep[];
  currentStep?: string;
  toolsUsed?: Array<{ name: string; args?: any }>;
  reasoning?: string;
  thoughts?: string[];
}

interface ThinkingAccordionProps {
  thinking?: ThinkingData;
  isThinking?: boolean;
  isLast?: boolean;
}

export const ThinkingAccordion: React.FC<ThinkingAccordionProps> = ({
  thinking,
  isThinking = false,
  isLast = true,
}) => {
  const [isOpen, setIsOpen] = useState(true);

  // Auto-collapse when no longer the last message
  useEffect(() => {
    if (!isLast) {
      setIsOpen(false);
    }
  }, [isLast]);

  // Glassmorphic styling matching workspace-ai
  const bgColor = useSemanticToken('glass.background');
  const borderColor = useSemanticToken('border.subtle');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const badgeBg = useSemanticToken('surface.base');

  if (!thinking && !isThinking) return null;

  const hasPlan = thinking?.plan && thinking.plan.length > 0;
  const hasTools = thinking?.toolsUsed && thinking.toolsUsed.length > 0;
  const hasThoughts = thinking?.thoughts && thinking.thoughts.length > 0;
  const hasContent = hasPlan || hasTools || thinking?.reasoning || hasThoughts;

  if (!hasContent && !isThinking) return null;

  return (
    <Box
      bg={bgColor}
      backdropFilter="blur(10px)"
      border="1px solid"
      borderColor={borderColor}
      borderRadius="lg"
      p={3}
      mb={3}
      boxShadow="sm"
    >
      <HStack
        spacing={2}
        cursor="pointer"
        onClick={() => setIsOpen(!isOpen)}
        userSelect="none"
      >
        <Icon
          as={isOpen ? FiChevronDown : FiChevronRight}
          color={mutedColor}
          transition="transform 0.2s"
        />
        <HStack flex="1" spacing={2}>
          {isThinking && <Spinner size="xs" color="blue.500" />}
          <Text
            fontSize="sm"
            fontWeight="semibold"
            color={textColor}
          >
            {isThinking ? 'Thinking...' : 'Agent Process'}
          </Text>
          {hasPlan && (
            <Badge
              bg={badgeBg}
              color={textColor}
              fontSize="xs"
              px={2}
              py={0.5}
              borderRadius="full"
            >
              {thinking?.plan?.filter(s => s.status === 'completed').length}/{thinking?.plan?.length} steps
            </Badge>
          )}
        </HStack>
      </HStack>

      <Collapse in={isOpen} animateOpacity>
        <VStack align="stretch" spacing={3} mt={3} pl={6}>

          {/* Reasoning */}
          {thinking?.reasoning && (
            <Box>
              <Text fontSize="xs" fontWeight="medium" color={mutedColor} mb={1}>
                Reasoning:
              </Text>
              <Text fontSize="xs" color={textColor} lineHeight="1.6">
                {thinking.reasoning}
              </Text>
            </Box>
          )}

          {/* Plan Steps */}
          {hasPlan && (
            <VStack align="stretch" spacing={2}>
              <Text fontSize="xs" fontWeight="medium" color={mutedColor}>
                Execution Plan:
              </Text>
              {thinking!.plan!.map((step) => (
                <HStack key={step.id} spacing={2} align="flex-start">
                  <Icon
                    as={
                      step.status === 'completed'
                        ? FiCheckCircle
                        : step.status === 'in_progress'
                          ? Spinner
                          : FiCircle
                    }
                    color={
                      step.status === 'completed'
                        ? 'green.500'
                        : step.status === 'in_progress'
                          ? 'blue.500'
                          : 'gray.400'
                    }
                    mt={0.5}
                    boxSize={3}
                  />
                  <VStack align="stretch" spacing={0} flex="1">
                    <Text
                      fontSize="xs"
                      fontWeight={step.status === 'in_progress' ? 'semibold' : 'normal'}
                      color={textColor}
                    >
                      {step.title}
                    </Text>
                    {step.description && (
                      <Text fontSize="xs" color={mutedColor} lineHeight="1.4">
                        {step.description}
                      </Text>
                    )}
                    {step.detail && (
                      <Text fontSize="xs" color="blue.500" lineHeight="1.4" fontStyle="italic">
                        {step.detail}
                      </Text>
                    )}
                  </VStack>
                </HStack>
              ))}
            </VStack>
          )}

          {/* Thoughts / Log */}
          {hasThoughts && (
            <VStack align="stretch" spacing={1}>
              <Text fontSize="xs" fontWeight="medium" color={mutedColor}>
                Activity Log:
              </Text>
              {thinking!.thoughts!.map((thought, idx) => (
                <Text key={idx} fontSize="xs" color={mutedColor} fontFamily="mono" pl={2} borderLeft="2px solid" borderColor={borderColor}>
                  {thought}
                </Text>
              ))}
            </VStack>
          )}

          {/* Tools Used */}
          {hasTools && (
            <VStack align="stretch" spacing={2}>
              <Text fontSize="xs" fontWeight="medium" color={mutedColor}>
                Tools Used:
              </Text>
              {thinking!.toolsUsed!.map((tool, idx) => (
                <HStack key={idx} spacing={2}>
                  <Icon as={FiTool} color={mutedColor} boxSize={3} />
                  <Text fontSize="xs" color={textColor} fontFamily="mono">
                    {tool.name}
                  </Text>
                </HStack>
              ))}
            </VStack>
          )}

          {/* Thinking Indicator */}
          {isThinking && !hasContent && (
            <HStack spacing={2} color={mutedColor}>
              <Spinner size="xs" />
              <Text fontSize="xs">Analyzing your request...</Text>
            </HStack>
          )}
        </VStack>
      </Collapse>
    </Box>
  );
};
