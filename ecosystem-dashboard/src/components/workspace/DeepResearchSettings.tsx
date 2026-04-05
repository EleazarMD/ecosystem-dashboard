import React from 'react';
import {
  VStack,
  HStack,
  Text,
  FormControl,
  FormLabel,
  Select,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Switch,
  Box,
  Badge,
  Icon,
  Tooltip,
} from '@chakra-ui/react';
import { FiZap, FiInfo } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface DeepResearchSettingsProps {
  // Research depth
  maxTokens?: number;
  onMaxTokensChange?: (tokens: number) => void;
  
  // Research model
  researchModel?: 'sonar-pro' | 'sonar-reasoning';
  onResearchModelChange?: (model: 'sonar-pro' | 'sonar-reasoning') => void;
  
  // Clarification questions
  clarificationQuestions?: number;
  onClarificationQuestionsChange?: (count: number) => void;
  
  // Source recency
  sourceRecency?: 'day' | 'week' | 'month' | 'year' | 'any';
  onSourceRecencyChange?: (recency: 'day' | 'week' | 'month' | 'year' | 'any') => void;
  
  // Auto-planning
  autoPlanning?: boolean;
  onAutoPlanningChange?: (enabled: boolean) => void;
}

export function DeepResearchSettings({
  maxTokens = 8000,
  onMaxTokensChange,
  researchModel = 'sonar-pro',
  onResearchModelChange,
  clarificationQuestions = 3,
  onClarificationQuestionsChange,
  sourceRecency = 'any',
  onSourceRecencyChange,
  autoPlanning = true,
  onAutoPlanningChange,
}: DeepResearchSettingsProps) {
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.tertiary');
  const borderColor = useSemanticToken('border.default');
  const infoBg = useSemanticToken('surface.base');
  
  const tokenOptions = [
    { value: 4000, label: '4K tokens - Quick' },
    { value: 8000, label: '8K tokens - Standard' },
    { value: 12000, label: '12K tokens - Comprehensive' },
    { value: 16000, label: '16K tokens - Maximum' },
  ];
  
  return (
    <VStack spacing={4} align="stretch">
      {/* Research Model */}
      <FormControl>
        <HStack justify="space-between" mb={2}>
          <FormLabel fontSize="sm" fontWeight="500" color={textColor} mb={0}>
            Research Model
          </FormLabel>
          <Tooltip label="sonar-pro: Fast comprehensive research. sonar-reasoning: Deep analysis with reasoning">
            <Box>
              <Icon as={FiInfo} boxSize={3} color={mutedColor} />
            </Box>
          </Tooltip>
        </HStack>
        <Select
          value={researchModel}
          onChange={(e) => onResearchModelChange?.(e.target.value as 'sonar-pro' | 'sonar-reasoning')}
          size="sm"
          fontSize="sm"
        >
          <option value="sonar-pro">sonar-pro (Recommended)</option>
          <option value="sonar-reasoning">sonar-reasoning (Advanced)</option>
        </Select>
        {researchModel === 'sonar-pro' && (
          <Text fontSize="xs" color={mutedColor} mt={1}>
            ⚡ Fast, comprehensive research with citations
          </Text>
        )}
        {researchModel === 'sonar-reasoning' && (
          <Text fontSize="xs" color={mutedColor} mt={1}>
            🧠 Deep analysis with step-by-step reasoning
          </Text>
        )}
      </FormControl>
      
      {/* Research Depth (Max Tokens) */}
      <FormControl>
        <HStack justify="space-between" mb={2}>
          <FormLabel fontSize="sm" fontWeight="500" color={textColor} mb={0}>
            Research Depth
          </FormLabel>
          <Badge colorScheme="blue" fontSize="xs">
            {maxTokens.toLocaleString()} tokens
          </Badge>
        </HStack>
        <Select
          value={maxTokens}
          onChange={(e) => onMaxTokensChange?.(parseInt(e.target.value))}
          size="sm"
          fontSize="sm"
        >
          {tokenOptions.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
        <Text fontSize="xs" color={mutedColor} mt={1}>
          Higher = more detailed research (slower)
        </Text>
      </FormControl>
      
      {/* Clarification Questions */}
      <FormControl>
        <HStack justify="space-between" mb={2}>
          <FormLabel fontSize="sm" fontWeight="500" color={textColor} mb={0}>
            Clarification Questions
          </FormLabel>
          <Badge colorScheme="purple" fontSize="xs">
            {clarificationQuestions}
          </Badge>
        </HStack>
        <Slider
          value={clarificationQuestions}
          min={0}
          max={5}
          step={1}
          onChange={(val) => onClarificationQuestionsChange?.(val)}
        >
          <SliderTrack>
            <SliderFilledTrack bg="purple.400" />
          </SliderTrack>
          <SliderThumb />
        </Slider>
        <HStack justify="space-between" fontSize="xs" color={mutedColor} mt={1}>
          <Text>None</Text>
          <Text>2-3 (Recommended)</Text>
          <Text>Maximum</Text>
        </HStack>
      </FormControl>
      
      {/* Source Recency Filter */}
      <FormControl>
        <HStack justify="space-between" mb={2}>
          <FormLabel fontSize="sm" fontWeight="500" color={textColor} mb={0}>
            Source Recency
          </FormLabel>
          <Tooltip label="Filter research sources by how recent they are">
            <Box>
              <Icon as={FiInfo} boxSize={3} color={mutedColor} />
            </Box>
          </Tooltip>
        </HStack>
        <Select
          value={sourceRecency}
          onChange={(e) => onSourceRecencyChange?.(e.target.value as any)}
          size="sm"
          fontSize="sm"
        >
          <option value="any">Any time</option>
          <option value="year">Past year</option>
          <option value="month">Past month</option>
          <option value="week">Past week</option>
          <option value="day">Past day</option>
        </Select>
        <Text fontSize="xs" color={mutedColor} mt={1}>
          More recent = current events focus
        </Text>
      </FormControl>
      
      {/* Auto-Planning */}
      <FormControl>
        <HStack justify="space-between">
          <VStack align="start" spacing={0} flex={1}>
            <FormLabel fontSize="sm" fontWeight="500" color={textColor} mb={0}>
              Auto-Planning Phase
            </FormLabel>
            <Text fontSize="xs" color={mutedColor}>
              Automatically generate research plan after clarification
            </Text>
          </VStack>
          <Switch
            isChecked={autoPlanning}
            onChange={(e) => onAutoPlanningChange?.(e.target.checked)}
            colorScheme="blue"
          />
        </HStack>
      </FormControl>
      
      {/* Info Box */}
      <Box
        p={3}
        borderRadius="md"
        bg={infoBg}
        borderWidth="1px"
        borderColor={borderColor}
      >
        <HStack spacing={2} align="start">
          <Icon as={FiZap} color="blue.500" mt={0.5} />
          <VStack align="start" spacing={1} flex={1}>
            <Text fontSize="xs" fontWeight="600" color={textColor}>
              3-Phase Deep Research Workflow
            </Text>
            <Text fontSize="xs" color={mutedColor}>
              1. Clarification questions (customize above)
              <br />
              2. Strategic research planning
              <br />
              3. Execution with {researchModel}
            </Text>
          </VStack>
        </HStack>
      </Box>
    </VStack>
  );
}
