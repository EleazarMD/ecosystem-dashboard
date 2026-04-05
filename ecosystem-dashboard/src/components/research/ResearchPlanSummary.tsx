import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Collapse,
  Icon,
  Badge,
} from '@chakra-ui/react';
import { ChevronDownIcon, ChevronRightIcon } from '@chakra-ui/icons';
import ReactMarkdown from 'react-markdown';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface ResearchPlanSummaryProps {
  originalQuestion: string;
  selectedScenario?: {
    title: string;
    scope: string;
    timeframe: string;
    depth: string;
    comparisons: string;
  };
  enhancedQuestion: string;
  researchStrategy: {
    keyAreas?: string[];
    searchTerms?: string[];
    sources?: string[];
  };
}

export const ResearchPlanSummary: React.FC<ResearchPlanSummaryProps> = ({
  originalQuestion,
  selectedScenario,
  enhancedQuestion,
  researchStrategy,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const bgColor = useSemanticToken('glass.background');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const accentColor = 'blue.500';
  const badgeBg = useSemanticToken('surface.base');

  return (
    <Box
      bg={bgColor}
      backdropFilter="blur(10px)"
      p={3}
      borderRadius="lg"
      boxShadow="sm"
    >
      <VStack align="stretch" spacing={2}>
        {/* Collapsed Summary */}
        <HStack
          justify="space-between"
          cursor="pointer"
          onClick={() => setIsExpanded(!isExpanded)}
          _hover={{ opacity: 0.8 }}
          transition="all 0.2s"
        >
          <HStack spacing={2} flex="1">
            <Icon
              as={isExpanded ? ChevronDownIcon : ChevronRightIcon}
              color={accentColor}
              boxSize={5}
            />
            <VStack align="start" spacing={0} flex="1">
              <HStack spacing={2}>
                <Text fontSize="sm" fontWeight="bold" color={textColor}>
                  📋 Research Plan
                </Text>
                {selectedScenario && (
                  <Badge
                    size="sm"
                    variant="subtle"
                    colorScheme="gray"
                    fontSize="10px"
                    bg={badgeBg}
                  >
                    {selectedScenario.title}
                  </Badge>
                )}
              </HStack>
              <Text fontSize="xs" color={mutedColor} noOfLines={1}>
                {enhancedQuestion}
              </Text>
            </VStack>
          </HStack>
        </HStack>

        {/* Expanded Details */}
        <Collapse in={isExpanded} animateOpacity>
          <VStack align="stretch" spacing={3} pt={2} pl={7}>
            {/* Original Question */}
            <Box>
              <Text fontSize="xs" fontWeight="semibold" color={mutedColor} mb={1}>
                Your Original Question:
              </Text>
              <Text fontSize="xs" color={textColor} fontStyle="italic">
                "{originalQuestion}"
              </Text>
            </Box>

            {/* Selected Approach */}
            {selectedScenario && (
              <Box>
                <Text fontSize="xs" fontWeight="semibold" color={mutedColor} mb={1}>
                  Selected Approach:
                </Text>
                <VStack align="stretch" spacing={0.5} pl={2}>
                  <Text fontSize="xs" color={textColor}>• <strong>Scope:</strong> {selectedScenario.scope}</Text>
                  <Text fontSize="xs" color={textColor}>• <strong>Timeframe:</strong> {selectedScenario.timeframe}</Text>
                  <Text fontSize="xs" color={textColor}>• <strong>Depth:</strong> {selectedScenario.depth}</Text>
                  <Text fontSize="xs" color={textColor}>• <strong>Comparisons:</strong> {selectedScenario.comparisons}</Text>
                </VStack>
              </Box>
            )}

            {/* Enhanced Question */}
            <Box>
              <Text fontSize="xs" fontWeight="semibold" color={mutedColor} mb={1}>
                Enhanced Research Question:
              </Text>
              <Text fontSize="xs" color={textColor}>
                {enhancedQuestion}
              </Text>
            </Box>

            {/* Research Strategy */}
            <Box>
              <Text fontSize="xs" fontWeight="semibold" color={mutedColor} mb={1}>
                Research Strategy:
              </Text>
              <VStack align="stretch" spacing={1} pl={2}>
                {researchStrategy.keyAreas && researchStrategy.keyAreas.length > 0 && (
                  <Text fontSize="xs" color={textColor}>
                    <strong>Key Areas:</strong> {researchStrategy.keyAreas.join(', ')}
                  </Text>
                )}
                {researchStrategy.searchTerms && researchStrategy.searchTerms.length > 0 && (
                  <Text fontSize="xs" color={textColor}>
                    <strong>Search Terms:</strong> {researchStrategy.searchTerms.join(', ')}
                  </Text>
                )}
                {researchStrategy.sources && researchStrategy.sources.length > 0 && (
                  <Text fontSize="xs" color={textColor}>
                    <strong>Sources:</strong> {researchStrategy.sources.join(', ')}
                  </Text>
                )}
              </VStack>
            </Box>
          </VStack>
        </Collapse>

        {/* Always visible status */}
        {!isExpanded && (
          <Text fontSize="xs" color={mutedColor} pl={7}>
            Click to expand research plan details
          </Text>
        )}
      </VStack>
    </Box>
  );
};
