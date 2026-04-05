import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  VStack,
  Text,
  FormControl,
  FormLabel,
  Input,
  Box,
  Divider,
  Badge,
  HStack,
  Icon,
  List,
  ListItem,
  ListIcon,
  Textarea,
} from '@chakra-ui/react';
import { CheckCircleIcon, EditIcon, SearchIcon } from '@chakra-ui/icons';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface ClarificationQuestion {
  id: string;
  question: string;
  type: 'text' | 'select' | 'multiselect';
  options?: string[];
}

interface ResearchPlan {
  clarifiedQuestion: string;
  subTopics: string[];
  keywords: string[];
  suggestedSources: string[];
  estimatedDepth: string;
}

interface ResearchClarificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuestion: string;
  onSubmitResearch: (refinedPrompt: string, plan: ResearchPlan) => void;
}

export const ResearchClarificationModal: React.FC<ResearchClarificationModalProps> = ({
  isOpen,
  onClose,
  initialQuestion,
  onSubmitResearch,
}) => {
  const [step, setStep] = useState<'clarify' | 'plan' | 'ready'>('clarify');
  const [isLoading, setIsLoading] = useState(false);
  const [questions, setQuestions] = useState<ClarificationQuestion[]>([]);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [researchPlan, setResearchPlan] = useState<ResearchPlan | null>(null);
  const [refinedPrompt, setRefinedPrompt] = useState('');
  const [editingPlan, setEditingPlan] = useState(false);

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');

  // Fetch clarification questions
  const fetchClarificationQuestions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/research-lab/clarify-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: initialQuestion,
          step: 'initial',
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setQuestions(data.questions || []);
        setStep('clarify');
      } else {
        console.error('Failed to fetch clarification questions:', data);
      }
    } catch (error) {
      console.error('Error fetching clarification questions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate research plan
  const generateResearchPlan = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/research-lab/clarify-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: initialQuestion,
          step: 'clarify',
          userResponses: responses,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setResearchPlan(data.researchPlan);
        setRefinedPrompt(data.refinedPrompt);
        setStep('plan');
      } else {
        console.error('Failed to generate research plan:', data);
      }
    } catch (error) {
      console.error('Error generating research plan:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle starting the clarification flow
  const handleStart = () => {
    fetchClarificationQuestions();
  };

  // Handle response changes
  const handleResponseChange = (questionId: string, value: any) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value,
    }));
  };

  // Handle option click for select type (single selection)
  const handleOptionClick = (questionId: string, option: string) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: option,
    }));
  };

  // Handle option toggle for multiselect type
  const handleOptionToggle = (questionId: string, option: string) => {
    const currentValues = responses[questionId] || [];
    const newValues = currentValues.includes(option)
      ? currentValues.filter((v: string) => v !== option)
      : [...currentValues, option];
    
    setResponses(prev => ({
      ...prev,
      [questionId]: newValues,
    }));
  };

  // Handle submitting clarifications
  const handleSubmitClarifications = () => {
    generateResearchPlan();
  };

  // Handle final submission
  const handleFinalSubmit = () => {
    if (researchPlan) {
      onSubmitResearch(refinedPrompt, researchPlan);
      onClose();
    }
  };

  // Initialize when modal opens
  React.useEffect(() => {
    if (isOpen && step === 'clarify' && questions.length === 0) {
      handleStart();
    }
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent bg={bgColor}>
        <ModalHeader>
          <HStack spacing={3}>
            <Icon as={SearchIcon} color="blue.500" />
            <Text>Research Clarification & Planning</Text>
          </HStack>
          <Text fontSize="sm" fontWeight="normal" color={useSemanticToken('text.secondary')} mt={2}>
            Let's refine your research question for better results
          </Text>
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          <VStack spacing={6} align="stretch">
            {/* Original Question */}
            <Box p={4} bg={useSemanticToken('surface.highlight')} borderRadius="md">
              <Text fontSize="sm" fontWeight="bold" mb={2}>
                Your Question:
              </Text>
              <Text fontSize="sm">{initialQuestion}</Text>
            </Box>

            {/* Step 1: Clarification Questions */}
            {step === 'clarify' && (
              <VStack spacing={4} align="stretch">
                <HStack>
                  <Badge colorScheme="blue">Step 1 of 2</Badge>
                  <Text fontSize="sm" fontWeight="bold">
                    Answer a few questions to refine your research
                  </Text>
                </HStack>

                {isLoading ? (
                  <Text>Generating clarification questions...</Text>
                ) : (
                  questions.map((q) => (
                    <FormControl key={q.id}>
                      <FormLabel fontSize="sm" fontWeight="semibold" mb={3}>
                        {q.question}
                      </FormLabel>
                      
                      {/* Text Input Type */}
                      {q.type === 'text' && (
                        <Input
                          value={responses[q.id] || ''}
                          onChange={(e) => handleResponseChange(q.id, e.target.value)}
                          placeholder="Type your answer..."
                          size="md"
                        />
                      )}
                      
                      {/* Select Type - Clickable Chips + Custom Input */}
                      {q.type === 'select' && (
                        <VStack align="stretch" spacing={3}>
                          {/* Predefined Options as Chips */}
                          <Box>
                            <HStack spacing={2} flexWrap="wrap">
                              {q.options?.map((option) => {
                                const isSelected = responses[q.id] === option;
                                return (
                                  <Button
                                    key={option}
                                    size="sm"
                                    variant={isSelected ? 'solid' : 'outline'}
                                    colorScheme={isSelected ? 'blue' : 'gray'}
                                    onClick={() => handleOptionClick(q.id, option)}
                                    borderRadius="full"
                                    fontWeight={isSelected ? 'semibold' : 'normal'}
                                    _hover={{
                                      transform: 'scale(1.05)',
                                      boxShadow: 'md',
                                    }}
                                    transition="all 0.2s"
                                  >
                                    {option}
                                  </Button>
                                );
                              })}
                            </HStack>
                          </Box>
                          
                          {/* Custom Text Input */}
                          <Box>
                            <Text fontSize="xs" color={useSemanticToken('text.secondary')} mb={2}>
                              Or type your own:
                            </Text>
                            <Input
                              value={
                                q.options?.includes(responses[q.id])
                                  ? ''
                                  : responses[q.id] || ''
                              }
                              onChange={(e) => handleResponseChange(q.id, e.target.value)}
                              placeholder="Enter custom answer..."
                              size="sm"
                            />
                          </Box>
                        </VStack>
                      )}
                      
                      {/* Multiselect Type - Toggleable Chips + Custom Input */}
                      {q.type === 'multiselect' && (
                        <VStack align="stretch" spacing={3}>
                          {/* Predefined Options as Toggleable Chips */}
                          <Box>
                            <HStack spacing={2} flexWrap="wrap">
                              {q.options?.map((option) => {
                                const isSelected = (responses[q.id] || []).includes(option);
                                return (
                                  <Button
                                    key={option}
                                    size="sm"
                                    variant={isSelected ? 'solid' : 'outline'}
                                    colorScheme={isSelected ? 'green' : 'gray'}
                                    onClick={() => handleOptionToggle(q.id, option)}
                                    borderRadius="full"
                                    fontWeight={isSelected ? 'semibold' : 'normal'}
                                    leftIcon={
                                      isSelected ? (
                                        <CheckCircleIcon />
                                      ) : undefined
                                    }
                                    _hover={{
                                      transform: 'scale(1.05)',
                                      boxShadow: 'md',
                                    }}
                                    transition="all 0.2s"
                                  >
                                    {option}
                                  </Button>
                                );
                              })}
                            </HStack>
                          </Box>
                          
                          {/* Custom Text Input for Additional Options */}
                          <Box>
                            <Text fontSize="xs" color={useSemanticToken('text.secondary')} mb={2}>
                              Add custom options (separate with commas):
                            </Text>
                            <Input
                              placeholder="e.g., Market trends, Competitor analysis..."
                              size="sm"
                              onBlur={(e) => {
                                if (e.target.value.trim()) {
                                  const customOptions = e.target.value
                                    .split(',')
                                    .map((opt) => opt.trim())
                                    .filter((opt) => opt.length > 0);
                                  
                                  const currentValues = responses[q.id] || [];
                                  const newValues = [
                                    ...currentValues.filter((v: string) => q.options?.includes(v)),
                                    ...customOptions,
                                  ];
                                  
                                  handleResponseChange(q.id, newValues);
                                  e.target.value = '';
                                }
                              }}
                            />
                          </Box>
                        </VStack>
                      )}
                    </FormControl>
                  ))
                )}
              </VStack>
            )}

            {/* Step 2: Research Plan */}
            {step === 'plan' && researchPlan && (
              <VStack spacing={4} align="stretch">
                <HStack justify="space-between">
                  <HStack>
                    <Badge colorScheme="green">Step 2 of 2</Badge>
                    <Text fontSize="sm" fontWeight="bold">
                      Review & Approve Research Plan
                    </Text>
                  </HStack>
                  <Button
                    size="xs"
                    leftIcon={<EditIcon />}
                    onClick={() => setEditingPlan(!editingPlan)}
                  >
                    {editingPlan ? 'Save' : 'Edit'}
                  </Button>
                </HStack>

                <Divider />

                {/* Clarified Question */}
                <Box>
                  <Text fontSize="sm" fontWeight="bold" mb={2}>
                    📋 Refined Research Question:
                  </Text>
                  {editingPlan ? (
                    <Textarea
                      value={researchPlan.clarifiedQuestion}
                      onChange={(e) =>
                        setResearchPlan({
                          ...researchPlan,
                          clarifiedQuestion: e.target.value,
                        })
                      }
                      size="sm"
                    />
                  ) : (
                    <Text
                      fontSize="sm"
                      p={3}
                      bg={useSemanticToken('surface.highlight')}
                      borderRadius="md"
                    >
                      {researchPlan.clarifiedQuestion}
                    </Text>
                  )}
                </Box>

                {/* Sub-topics */}
                <Box>
                  <Text fontSize="sm" fontWeight="bold" mb={2}>
                    🔍 Research Sub-topics:
                  </Text>
                  <List spacing={1}>
                    {researchPlan.subTopics.map((topic, idx) => (
                      <ListItem key={idx} fontSize="sm">
                        <ListIcon as={CheckCircleIcon} color="green.500" />
                        {topic}
                      </ListItem>
                    ))}
                  </List>
                </Box>

                {/* Keywords */}
                <Box>
                  <Text fontSize="sm" fontWeight="bold" mb={2}>
                    🏷️ Key Search Terms:
                  </Text>
                  <HStack spacing={2} flexWrap="wrap">
                    {researchPlan.keywords.map((keyword, idx) => (
                      <Badge key={idx} colorScheme="purple" fontSize="xs">
                        {keyword}
                      </Badge>
                    ))}
                  </HStack>
                </Box>

                {/* Source Types */}
                <Box>
                  <Text fontSize="sm" fontWeight="bold" mb={2}>
                    📚 Suggested Sources:
                  </Text>
                  <HStack spacing={2} flexWrap="wrap">
                    {researchPlan.suggestedSources.map((source, idx) => (
                      <Badge key={idx} colorScheme="blue" fontSize="xs">
                        {source}
                      </Badge>
                    ))}
                  </HStack>
                </Box>

                {/* Estimated Depth */}
                <Box>
                  <Text fontSize="sm" fontWeight="bold" mb={2}>
                    📊 Research Depth:
                  </Text>
                  <Badge
                    colorScheme={
                      researchPlan.estimatedDepth === 'comprehensive'
                        ? 'red'
                        : researchPlan.estimatedDepth === 'moderate'
                        ? 'orange'
                        : 'green'
                    }
                  >
                    {researchPlan.estimatedDepth}
                  </Badge>
                </Box>
              </VStack>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3}>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>

            {step === 'clarify' && (
              <>
                <Button
                  variant="ghost"
                  onClick={() => {
                    // Skip clarification and use original question
                    onSubmitResearch(initialQuestion, {
                      clarifiedQuestion: initialQuestion,
                      subTopics: [],
                      keywords: [],
                      suggestedSources: [],
                      estimatedDepth: 'moderate',
                    });
                    onClose();
                  }}
                >
                  Skip & Use Original
                </Button>
                <Button
                  colorScheme="blue"
                  onClick={handleSubmitClarifications}
                  isLoading={isLoading}
                  isDisabled={Object.keys(responses).length === 0}
                >
                  Generate Plan
                </Button>
              </>
            )}

            {step === 'plan' && (
              <>
                <Button variant="ghost" onClick={() => setStep('clarify')}>
                  Back to Clarifications
                </Button>
                <Button
                  colorScheme="green"
                  onClick={handleFinalSubmit}
                  leftIcon={<SearchIcon />}
                >
                  Start Deep Research
                </Button>
              </>
            )}
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
