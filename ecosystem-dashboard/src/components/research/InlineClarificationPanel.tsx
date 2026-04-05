import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Radio,
  RadioGroup,
  Divider,
  Badge,
  IconButton,
  Tooltip,
  useToast,
} from '@chakra-ui/react';
import { FiCopy, FiRotateCw, FiVolume2 } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface ResearchScenario {
  id: string;
  title: string;
  description: string;
  scope: string;
  timeframe: string;
  depth: string;
  comparisons: string;
}

interface InlineClarificationPanelProps {
  initialQuestion: string;
  sessionId?: string; // Session ID for telemetry tracking
  audienceLevel?: 'clinical_researcher' | 'data_scientist' | 'software_engineer' | 'entrepreneur' | 'content_creator' | 'investor' | 'mba_executive' | 'general';
  researchDepth?: number; // 1-5 (constrains scenario generation to selected depth)
  onSubmit: (responses: Record<string, any>) => void;
  onSkip: () => void;
}

// Thinking dots component with CSS animation
const ThinkingDots: React.FC = () => {
  const dotColor = useSemanticToken('text.secondary');
  
  return (
    <HStack spacing={1}>
      <Box
        as="span"
        w="8px"
        h="8px"
        borderRadius="full"
        bg={dotColor}
        sx={{
          '@keyframes bounce': {
            '0%, 80%, 100%': { 
              transform: 'translateY(0)',
              opacity: 0.7,
            },
            '40%': { 
              transform: 'translateY(-8px)',
              opacity: 1,
            },
          },
          animation: 'bounce 1.4s infinite ease-in-out',
          animationDelay: '0s',
        }}
      />
      <Box
        as="span"
        w="8px"
        h="8px"
        borderRadius="full"
        bg={dotColor}
        sx={{
          '@keyframes bounce': {
            '0%, 80%, 100%': { 
              transform: 'translateY(0)',
              opacity: 0.7,
            },
            '40%': { 
              transform: 'translateY(-8px)',
              opacity: 1,
            },
          },
          animation: 'bounce 1.4s infinite ease-in-out',
          animationDelay: '0.2s',
        }}
      />
      <Box
        as="span"
        w="8px"
        h="8px"
        borderRadius="full"
        bg={dotColor}
        sx={{
          '@keyframes bounce': {
            '0%, 80%, 100%': { 
              transform: 'translateY(0)',
              opacity: 0.7,
            },
            '40%': { 
              transform: 'translateY(-8px)',
              opacity: 1,
            },
          },
          animation: 'bounce 1.4s infinite ease-in-out',
          animationDelay: '0.4s',
        }}
      />
    </HStack>
  );
};

export const InlineClarificationPanel: React.FC<InlineClarificationPanelProps> = ({
  initialQuestion,
  sessionId,
  audienceLevel = 'general',
  researchDepth = 3,
  onSubmit,
  onSkip,
}) => {
  console.log('🎨 [InlineClarificationPanel] Component rendering with props:', {
    initialQuestion,
    sessionId,
    audienceLevel,
    researchDepth
  });
  
  const [scenarios, setScenarios] = useState<ResearchScenario[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const toast = useToast();
  const bgColor = useSemanticToken('glass.background');
  const borderColor = useSemanticToken('border.default');
  const textColor = useSemanticToken('text.primary');
  const cardBg = useSemanticToken('surface.base');
  const cardBgHover = useSemanticToken('surface.hover');
  const cardBgSelected = useSemanticToken('surface.highlight');
  const badgeBg = useSemanticToken('surface.base');
  const buttonBg = useSemanticToken('interactive.surface');
  const buttonHoverBg = useSemanticToken('surface.hover');

  // Fetch clarification questions on mount
  useEffect(() => {
    console.log('🎬 [InlineClarificationPanel] useEffect triggered - calling fetchClarificationQuestions');
    fetchClarificationQuestions();
  }, []);

  // Cleanup speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isSpeaking]);

  const fetchClarificationQuestions = async () => {
    console.log('🔍 [InlineClarificationPanel] fetchClarificationQuestions called');
    console.log('   - initialQuestion:', initialQuestion);
    console.log('   - sessionId:', sessionId);
    console.log('   - audienceLevel:', audienceLevel);
    console.log('   - researchDepth:', researchDepth);
    
    setIsLoading(true);
    try {
      console.log('📡 [InlineClarificationPanel] Making POST request to /api/research-lab/clarify-research');
      
      const response = await fetch('/api/research-lab/clarify-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: initialQuestion,
          step: 'initial',
          sessionId: sessionId, // Pass session ID for telemetry tracking
          audienceLevel: audienceLevel,
          researchDepth: researchDepth, // Pass depth constraint to limit scenario options
        }),
      });

      console.log('📥 [InlineClarificationPanel] Response status:', response.status, response.statusText);
      
      const data = await response.json();
      console.log('📦 [InlineClarificationPanel] Response data:', data);
      
      if (response.ok) {
        console.log('✅ [InlineClarificationPanel] Success! Setting scenarios:', data.scenarios?.length || 0);
        setScenarios(data.scenarios || []);
        // Pre-select the first scenario (usually "Standard")
        if (data.scenarios && data.scenarios.length > 0) {
          setSelectedScenarioId(data.scenarios[1]?.id || data.scenarios[0].id);
        }
      } else {
        console.error('❌ [InlineClarificationPanel] Response not OK:', response.status, data);
      }
    } catch (error) {
      console.error('❌ [InlineClarificationPanel] Error fetching research scenarios:', error);
      console.error('   Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    } finally {
      console.log('🏁 [InlineClarificationPanel] fetchClarificationQuestions complete, setting isLoading to false');
      setIsLoading(false);
    }
  };

  const handleSubmit = () => {
    const selectedScenario = scenarios.find(s => s.id === selectedScenarioId);
    if (selectedScenario) {
      onSubmit({ selectedScenario });
    }
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      await fetchClarificationQuestions();
      toast({
        title: 'New options generated',
        description: 'Fresh research scenarios have been created',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Regeneration failed',
        description: 'Could not generate new options. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleCopyToClipboard = () => {
    const textToCopy = scenarios.map((s, idx) => 
      `${idx + 1}. ${s.title}\n   ${s.description}\n   Timeframe: ${s.timeframe} | Depth: ${s.depth}`
    ).join('\n\n');
    
    navigator.clipboard.writeText(textToCopy).then(() => {
      toast({
        title: 'Copied to clipboard',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    });
  };

  const handleReadAloud = () => {
    if (isSpeaking) {
      // Stop speaking
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    // Read scenarios aloud
    const textToRead = `Let's clarify your research question. ${initialQuestion}. Choose a research approach: ` +
      scenarios.map((s, idx) => 
        `Option ${idx + 1}: ${s.title}. ${s.description}. ${s.timeframe}. ${s.depth}.`
      ).join(' ');

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  if (isLoading) {
    return (
      <Box
        p={4}
        bg={bgColor}
        backdropFilter="blur(10px)"
        borderRadius="md"
        boxShadow="sm"
      >
        <HStack spacing={3}>
          <ThinkingDots />
          <Text fontSize="sm" color={textColor}>
            Generating clarification questions...
          </Text>
        </HStack>
      </Box>
    );
  }

  return (
    <Box
      p={4}
      bg={bgColor}
      backdropFilter="blur(10px)"
      borderRadius="md"
      boxShadow="sm"
    >
      <VStack align="stretch" spacing={4}>
        {/* Header */}
        <Box>
          <Text fontSize="sm" fontWeight="bold" color={textColor} mb={1}>
            Let's clarify your research question:
          </Text>
          <Text fontSize="xs" color={useSemanticToken('text.secondary')} fontStyle="italic">
            "{initialQuestion}"
          </Text>
        </Box>

        <Divider />

        {/* Research Scenarios */}
        <Text fontSize="sm" color={textColor} mb={2}>
          Choose a research approach:
        </Text>
        
        <RadioGroup value={selectedScenarioId} onChange={setSelectedScenarioId}>
          <VStack spacing={2} align="stretch">
            {scenarios.map((scenario) => (
              <Box
                key={scenario.id}
                as="label"
                p={3}
                bg={selectedScenarioId === scenario.id ? cardBgSelected : cardBg}
                backdropFilter="blur(10px)"
                borderRadius="xl"
                cursor="pointer"
                transition="all 0.2s"
                _hover={{ 
                  bg: selectedScenarioId === scenario.id ? cardBgSelected : cardBgHover,
                  transform: 'translateY(-1px)',
                  boxShadow: 'md'
                }}
                boxShadow={selectedScenarioId === scenario.id ? 'lg' : 'sm'}
                borderWidth="1px"
                borderColor={selectedScenarioId === scenario.id 
                  ? borderColor
                  : borderColor}
              >
                <HStack align="start" spacing={3}>
                  <Radio value={scenario.id} mt={1} />
                  <VStack align="start" spacing={1} flex="1">
                    <Text fontSize="sm" fontWeight="bold" color={textColor}>
                      {scenario.title}
                    </Text>
                    <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                      {scenario.description}
                    </Text>
                    <HStack spacing={2} mt={1} flexWrap="wrap">
                      <Badge 
                        size="sm" 
                        variant="subtle" 
                        colorScheme="gray" 
                        fontSize="10px"
                        bg={badgeBg}
                      >
                        {scenario.timeframe}
                      </Badge>
                      <Badge 
                        size="sm" 
                        variant="subtle" 
                        colorScheme="gray" 
                        fontSize="10px"
                        bg={badgeBg}
                      >
                        {scenario.depth}
                      </Badge>
                    </HStack>
                  </VStack>
                </HStack>
              </Box>
            ))}
          </VStack>
        </RadioGroup>

        <Divider />

        {/* Action Buttons */}
        <HStack spacing={3} justify="space-between">
          {/* Left side - Utility buttons */}
          <HStack spacing={2}>
            <Tooltip label="Copy to clipboard" placement="top">
              <IconButton
                aria-label="Copy to clipboard"
                icon={<FiCopy />}
                size="sm"
                variant="ghost"
                onClick={handleCopyToClipboard}
              />
            </Tooltip>
            <Tooltip label={isSpeaking ? "Stop reading" : "Read aloud"} placement="top">
              <IconButton
                aria-label={isSpeaking ? "Stop reading" : "Read aloud"}
                icon={<FiVolume2 />}
                size="sm"
                variant="ghost"
                colorScheme={isSpeaking ? "blue" : "gray"}
                onClick={handleReadAloud}
              />
            </Tooltip>
            <Tooltip label="Regenerate options" placement="top">
              <IconButton
                aria-label="Regenerate options"
                icon={<FiRotateCw />}
                size="sm"
                variant="ghost"
                onClick={handleRegenerate}
                isLoading={isRegenerating}
              />
            </Tooltip>
          </HStack>

          {/* Right side - Primary actions */}
          <HStack spacing={3}>
            <Button
              size="sm"
              variant="ghost"
              onClick={onSkip}
            >
              Skip & Use Original
            </Button>
            <Button
              size="sm"
              bg={buttonBg}
              color={textColor}
              _hover={{
                bg: buttonHoverBg,
              }}
              onClick={handleSubmit}
              isDisabled={!selectedScenarioId}
            >
              Continue with Selected Approach
            </Button>
          </HStack>
        </HStack>
      </VStack>
    </Box>
  );
};
