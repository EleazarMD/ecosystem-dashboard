import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Textarea,
  Button,
  FormControl,
  FormLabel,
  Badge,
  Icon,
  Collapse,
  Checkbox,
  Stack,
  Heading,
  Divider,
} from '@chakra-ui/react';
import { FiHelpCircle, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  ClipboardDocumentListIcon,
  ClockIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

interface Question {
  number: number;
  text: string;
  answer: string;
}

interface AnswerOption {
  value: string;
  label: string;
  description?: string;
}

// Smart answer suggestions based on question type
function getAnswerOptionsForQuestion(questionText: string): AnswerOption[] {
  const lower = questionText.toLowerCase();
  
  // Primary goal/focus
  if (lower.includes('primary') && (lower.includes('goal') || lower.includes('focus'))) {
    return [
      { value: 'academic', label: 'Academic research paper', description: 'Peer-reviewed, comprehensive' },
      { value: 'professional', label: 'Professional/clinical application', description: 'Practice-oriented, evidence-based' },
      { value: 'policy', label: 'Policy proposal or report', description: 'Decision-makers, actionable' },
      { value: 'investment', label: 'Investment analysis', description: 'ROI, market dynamics' },
      { value: 'custom', label: 'Custom (specify below)', description: '' },
    ];
  }
  
  // Recency/timeframe
  if (lower.includes('recent') || lower.includes('timeframe') || lower.includes('24 hours')) {
    return [
      { value: 'day', label: 'Past 24 hours', description: 'Breaking news' },
      { value: 'week', label: 'Past week', description: 'Very recent' },
      { value: 'month', label: 'Past month', description: 'Current' },
      { value: '3years', label: 'Past 3 years', description: 'Recent trends' },
      { value: 'any', label: 'Any timeframe', description: 'Comprehensive' },
    ];
  }
  
  // Target audience
  if (lower.includes('audience') || lower.includes('presenting')) {
    return [
      { value: 'physicians', label: 'Physicians and clinicians', description: 'Medical professionals' },
      { value: 'policymakers', label: 'Healthcare policymakers', description: 'Government, regulations' },
      { value: 'investors', label: 'Investors and analysts', description: 'Financial focus' },
      { value: 'academics', label: 'Academic researchers', description: 'Scholarly' },
      { value: 'general', label: 'General public', description: 'Accessible' },
      { value: 'custom', label: 'Custom (specify below)', description: '' },
    ];
  }
  
  // Depth vs breadth
  if (lower.includes('depth') || lower.includes('breadth')) {
    return [
      { value: 'deep_narrow', label: 'Deep dive (narrow focus)', description: '10-15 year forecast, US Medicare only' },
      { value: 'balanced', label: 'Balanced depth and breadth', description: '5-10 year outlook, multiple payers' },
      { value: 'broad_overview', label: 'Broad overview', description: 'Global perspective, high-level' },
    ];
  }
  
  // Comorbidities/health conditions
  if (lower.includes('comorbid') || lower.includes('disease') || lower.includes('condition')) {
    return [
      { value: 'economic_only', label: 'Economic impact only (no clinical details)', description: 'GDP, healthcare spending, ROI' },
      { value: 'cvd_t2d', label: 'Cardiovascular disease + Type 2 diabetes', description: 'Top cost drivers' },
      { value: 'ckd', label: 'Chronic kidney disease', description: 'Long-term complications' },
      { value: 'all_major', label: 'All major comorbidities', description: 'Comprehensive analysis' },
      { value: 'custom', label: 'Custom (specify below)', description: '' },
    ];
  }
  
  // Default: no suggestions, just text input
  return [];
}

interface DeepResearchClarificationPanelProps {
  questions: Question[];
  onSubmit: (answers: Record<number, string>) => void;
  onSkip: () => void;
  isLoading?: boolean;
}

/**
 * Parses clarifying questions from assistant's response text
 * Looks for numbered lists (1., 2., etc.) with question content
 */
export function parseClarificationQuestions(content: string): Question[] {
  const questions: Question[] = [];
  
  // Regex to match numbered questions (1., 2., 3., etc.)
  // Matches: "1. **Title**: Question text?" or "1. Question text?"
  const questionRegex = /(\d+)\.\s+(?:\*\*[^*]+\*\*:?\s*)?([^\n]+)/g;
  
  let match;
  while ((match = questionRegex.exec(content)) !== null) {
    const number = parseInt(match[1]);
    const text = match[2].trim();
    
    // Only include if it looks like a question or has meaningful content
    if (text.length > 10) {
      questions.push({
        number,
        text,
        answer: '',
      });
    }
  }
  
  console.log('[DeepResearchClarificationPanel] Parsed questions:', questions);
  return questions;
}

/**
 * Detects if a message contains clarifying questions
 * Returns true if it contains "clarifying question" or "clarification question" 
 * and has numbered items
 */
export function hasClarificationQuestions(content: string): boolean {
  const lowerContent = content.toLowerCase();
  const hasClarifyingKeywords = 
    lowerContent.includes('clarifying question') ||
    lowerContent.includes('clarification question') ||
    lowerContent.includes('to ensure') ||
    (lowerContent.includes('question') && lowerContent.includes('understand'));
  
  const hasNumberedList = /\d+\.\s+/.test(content);
  
  return hasClarifyingKeywords && hasNumberedList;
}

export const DeepResearchClarificationPanel: React.FC<DeepResearchClarificationPanelProps> = ({
  questions,
  onSubmit,
  onSkip,
  isLoading = false,
}) => {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [selectedOptions, setSelectedOptions] = useState<Record<number, string[]>>({});
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(
    new Set(questions.map(q => q.number))
  );
  
  // Get smart answer options for each question
  const questionOptions = questions.reduce((acc, q) => {
    acc[q.number] = getAnswerOptionsForQuestion(q.text);
    return acc;
  }, {} as Record<number, AnswerOption[]>);

  // Match Research Plan card colors (all at top level to avoid Hooks violations)
  const cardBg = useSemanticToken('surface.base');
  const cardBorder = useSemanticToken('border.default');
  const sectionBg = useSemanticToken('surface.elevated');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const inputBg = useSemanticToken('surface.elevated');
  const borderLeftColor = useSemanticToken('border.default');
  const iconColor = useSemanticToken('text.secondary');
  
  // Option badge colors (pre-computed to avoid conditional hooks)
  const optionSelectedBg = useSemanticToken('surface.highlight');
  const optionSelectedBorder = 'blue.400';
  const optionUnselectedBorder = useSemanticToken('border.default');
  const optionHoverBorder = 'blue.300';

  const handleAnswerChange = (questionNumber: number, value: string) => {
    setAnswers(prev => ({ ...prev, [questionNumber]: value }));
  };
  
  const handleOptionToggle = (questionNumber: number, value: string) => {
    setSelectedOptions(prev => {
      const current = prev[questionNumber] || [];
      const newSelection = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      
      // Update answer text based on selections
      if (newSelection.length > 0 && !newSelection.includes('custom')) {
        const options = questionOptions[questionNumber];
        const selectedLabels = newSelection
          .map(val => options?.find(opt => opt.value === val)?.label)
          .filter(Boolean);
        setAnswers(prev => ({ ...prev, [questionNumber]: selectedLabels.join(', ') }));
      }
      
      return { ...prev, [questionNumber]: newSelection };
    });
  };

  const toggleQuestion = (questionNumber: number) => {
    setExpandedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionNumber)) {
        newSet.delete(questionNumber);
      } else {
        newSet.add(questionNumber);
      }
      return newSet;
    });
  };

  const handleSubmitAnswers = () => {
    onSubmit(answers);
  };

  const answeredCount = Object.keys(answers).filter(k => answers[parseInt(k)]?.trim().length > 0).length;
  const allAnswered = answeredCount === questions.length;

  return (
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
        {/* Header matching Research Plan style */}
        <Heading size="md" color={textColor} fontWeight="600">
          Research Planning
        </Heading>
        
        {/* Main Questions Section */}
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
              Clarifying Questions
            </Text>
            <Badge colorScheme="blue" fontSize="xs" ml="auto">
              {answeredCount}/{questions.length} answered
            </Badge>
          </HStack>
          
          {/* Questions with left border styling */}
          <Box
            pl={4}
            borderLeftWidth="2px"
            borderLeftColor={borderLeftColor}
            ml={2}
          >
            <VStack align="stretch" spacing={6}>
              {questions.map((question) => (
                <Box key={question.number}>
                  {/* Question Text */}
                  <Text fontSize="sm" fontWeight="600" color={textColor} mb={3}>
                    {question.number}. {question.text}
                  </Text>
                  
                  {/* Answer Options if available */}
                  {questionOptions[question.number]?.length > 0 && (
                    <Stack spacing={2} mb={3}>
                      {questionOptions[question.number].map((option) => {
                        const isSelected = selectedOptions[question.number]?.includes(option.value) || false;
                        return (
                          <Box
                            key={option.value}
                            p={3}
                            borderRadius="md"
                            bg={isSelected ? optionSelectedBg : 'transparent'}
                            borderWidth="1px"
                            borderColor={isSelected ? optionSelectedBorder : optionUnselectedBorder}
                            transition="all 0.2s"
                            cursor="pointer"
                            onClick={() => handleOptionToggle(question.number, option.value)}
                            _hover={{ borderColor: optionHoverBorder }}
                          >
                            <HStack spacing={2}>
                              <Checkbox
                                isChecked={isSelected}
                                onChange={() => handleOptionToggle(question.number, option.value)}
                                size="md"
                              />
                              <VStack align="start" spacing={0} flex={1}>
                                <Text fontSize="sm" fontWeight="500">{option.label}</Text>
                                {option.description && (
                                  <Text fontSize="xs" color={mutedColor}>{option.description}</Text>
                                )}
                              </VStack>
                            </HStack>
                          </Box>
                        );
                      })}
                    </Stack>
                  )}
                  
                  {/* Text input for custom or free-form answers */}
                  {(selectedOptions[question.number]?.includes('custom') || questionOptions[question.number]?.length === 0) && (
                    <Textarea
                      value={answers[question.number] || ''}
                      onChange={(e) => handleAnswerChange(question.number, e.target.value)}
                      placeholder="Type your answer here..."
                      size="sm"
                      bg={inputBg}
                      borderRadius="md"
                      rows={2}
                      fontSize="sm"
                    />
                  )}
                </Box>
              ))}
            </VStack>
          </Box>
        </Box>
        
        {/* Time Estimate */}
        <HStack spacing={2} pl={3}>
          <Icon as={ClockIcon} w={4} h={4} color={mutedColor} />
          <Text fontSize="sm" color={mutedColor}>
            Takes ~1 minute to complete
          </Text>
        </HStack>
        
        <Divider />
        
        {/* Action Buttons matching Research Plan style */}
        <HStack justify="flex-end" spacing={3}>
          <Button
            variant="outline"
            size="md"
            colorScheme="gray"
            onClick={onSkip}
            isDisabled={isLoading}
            borderRadius="full"
          >
            Skip questions
          </Button>
          <Button
            colorScheme="blue"
            size="md"
            leftIcon={<Icon as={ChevronRightIcon} w={4} h={4} />}
            onClick={handleSubmitAnswers}
            isLoading={isLoading}
            loadingText="Processing..."
            borderRadius="full"
          >
            Continue to plan
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
};
