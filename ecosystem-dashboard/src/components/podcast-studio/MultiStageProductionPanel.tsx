import React, { useState, useEffect } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Icon,
  Progress,
  Badge,
  Divider,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Spinner,
  Tooltip,
  Code,
  Alert,
  AlertIcon,
  Switch,
  FormControl,
  FormLabel,
  Select,
} from '@chakra-ui/react';
import {
  FiCheckCircle,
  FiCircle,
  FiAlertCircle,
  FiClock,
  FiPlay,
  FiRefreshCw,
  FiEye,
} from 'react-icons/fi';

interface StageResult {
  stage: string;
  success: boolean;
  output: any;
  metadata?: any;
  timestamp: string;
}

interface MultiStageProductionPanelProps {
  onGenerate: (config: ProductionConfig) => Promise<void>;
  isGenerating: boolean;
  stageResults: StageResult[];
  currentStage: string | null;
  onStageSelect?: (stage: string) => void;
}

interface ProductionConfig {
  mode: 'single-pass' | 'multi-stage';
  targetDuration?: number;
  productionQuality?: 'draft' | 'standard' | 'premium';
  enableDirectorNotes?: boolean;
  enableVoiceDirection?: boolean;
}

const STAGES = [
  {
    id: 'producer',
    name: 'Producer',
    description: 'Strategic content planning',
    icon: '🎬',
    color: 'purple',
  },
  {
    id: 'writer',
    name: 'Writer',
    description: 'Script creation',
    icon: '✍️',
    color: 'blue',
  },
  {
    id: 'director',
    name: 'Director',
    description: 'Creative refinement',
    icon: '🎭',
    color: 'green',
  },
  {
    id: 'voice-director',
    name: 'Voice Director',
    description: 'Performance notes',
    icon: '🎤',
    color: 'orange',
  },
  {
    id: 'editor',
    name: 'Editor',
    description: 'Quality assurance',
    icon: '📝',
    color: 'red',
  },
];

export default function MultiStageProductionPanel({
  onGenerate,
  isGenerating,
  stageResults,
  currentStage,
  onStageSelect,
}: MultiStageProductionPanelProps) {
  const [config, setConfig] = useState<ProductionConfig>({
    mode: 'single-pass',
    targetDuration: 15,
    productionQuality: 'standard',
    enableDirectorNotes: true,
    enableVoiceDirection: true,
  });

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');

  const getStageStatus = (stageId: string) => {
    const result = stageResults.find(r => r.stage === stageId);
    if (result) return 'completed';
    if (currentStage === stageId) return 'in-progress';
    const stageIndex = STAGES.findIndex(s => s.id === stageId);
    const currentIndex = STAGES.findIndex(s => s.id === currentStage);
    if (currentIndex > stageIndex) return 'completed';
    return 'pending';
  };

  const handleGenerate = () => {
    onGenerate(config);
  };

  return (
    <VStack spacing={4} align="stretch">
      {/* Production Mode Toggle */}
      <Box
        p={4}
        bg={bgColor}
        borderRadius="lg"
        border="1px solid"
        borderColor={borderColor}
      >
        <VStack spacing={4} align="stretch">
          <HStack justify="space-between">
            <Text fontWeight="600" fontSize="sm">
              Production Mode
            </Text>
            <Switch
              isChecked={config.mode === 'multi-stage'}
              onChange={(e) =>
                setConfig({
                  ...config,
                  mode: e.target.checked ? 'multi-stage' : 'single-pass',
                })
              }
              colorScheme="purple"
              size="md"
            />
          </HStack>

          <VStack spacing={2} align="stretch">
            <HStack>
              <Badge
                colorScheme={config.mode === 'single-pass' ? 'green' : 'gray'}
                fontSize="10px"
              >
                {config.mode === 'single-pass' ? 'ACTIVE' : 'AVAILABLE'}
              </Badge>
              <Text fontSize="xs" fontWeight="600">
                Fast Mode (Single-Pass)
              </Text>
            </HStack>
            <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
              30-60 seconds • $0.02 • Best for drafts
            </Text>
          </VStack>

          <VStack spacing={2} align="stretch">
            <HStack>
              <Badge
                colorScheme={config.mode === 'multi-stage' ? 'purple' : 'gray'}
                fontSize="10px"
              >
                {config.mode === 'multi-stage' ? 'ACTIVE' : 'AVAILABLE'}
              </Badge>
              <Text fontSize="xs" fontWeight="600">
                Professional Mode (Multi-Stage)
              </Text>
            </HStack>
            <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
              3-5 minutes • $0.08 • Producer → Writer → Director → Voice → Editor
            </Text>
          </VStack>

          {config.mode === 'multi-stage' && (
            <>
              <Divider />
              <VStack spacing={3} align="stretch">
                <FormControl>
                  <FormLabel fontSize="xs" mb={1}>
                    Production Quality
                  </FormLabel>
                  <Select
                    size="sm"
                    value={config.productionQuality}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        productionQuality: e.target.value as any,
                      })
                    }
                  >
                    <option value="draft">Draft (3 stages)</option>
                    <option value="standard">Standard (4 stages)</option>
                    <option value="premium">Premium (5 stages)</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="xs" mb={1}>
                    Target Duration (minutes)
                  </FormLabel>
                  <Select
                    size="sm"
                    value={config.targetDuration}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        targetDuration: parseInt(e.target.value),
                      })
                    }
                  >
                    <option value="5">5 minutes</option>
                    <option value="10">10 minutes</option>
                    <option value="15">15 minutes</option>
                    <option value="20">20 minutes</option>
                    <option value="30">30 minutes</option>
                  </Select>
                </FormControl>
              </VStack>
            </>
          )}

          <Button
            onClick={handleGenerate}
            isLoading={isGenerating}
            loadingText={
              config.mode === 'single-pass'
                ? 'Generating...'
                : `Stage: ${currentStage || 'Starting'}...`
            }
            colorScheme={config.mode === 'multi-stage' ? 'purple' : 'blue'}
            size="sm"
            leftIcon={<Icon as={FiPlay} />}
          >
            {config.mode === 'single-pass'
              ? 'Generate Script (Fast)'
              : 'Start Production Pipeline'}
          </Button>
        </VStack>
      </Box>

      {/* Multi-Stage Progress (only show if multi-stage mode) */}
      {config.mode === 'multi-stage' && (
        <Box
          p={4}
          bg={bgColor}
          borderRadius="lg"
          border="1px solid"
          borderColor={borderColor}
        >
          <VStack spacing={3} align="stretch">
            <HStack justify="space-between">
              <Text fontWeight="600" fontSize="sm">
                Production Pipeline
              </Text>
              {isGenerating && (
                <HStack spacing={2}>
                  <Spinner size="xs" />
                  <Text fontSize="xs" color="purple.500">
                    In Progress
                  </Text>
                </HStack>
              )}
            </HStack>

            {/* Overall Progress Bar */}
            {stageResults.length > 0 && (
              <Progress
                value={(stageResults.length / STAGES.length) * 100}
                colorScheme="purple"
                size="sm"
                borderRadius="full"
              />
            )}

            {/* Stage List */}
            <VStack spacing={2} align="stretch">
              {STAGES.map((stage, index) => {
                const status = getStageStatus(stage.id);
                const result = stageResults.find(r => r.stage === stage.id);

                return (
                  <StageItem
                    key={stage.id}
                    stage={stage}
                    status={status}
                    result={result}
                    isClickable={!!result}
                    onClick={() => result && onStageSelect?.(stage.id)}
                  />
                );
              })}
            </VStack>
          </VStack>
        </Box>
      )}

      {/* Stage Details (when a stage is selected) */}
      {stageResults.length > 0 && (
        <Box
          p={4}
          bg={bgColor}
          borderRadius="lg"
          border="1px solid"
          borderColor={borderColor}
        >
          <Accordion allowToggle>
            {stageResults.map((result, index) => (
              <StageDetails key={result.stage} result={result} />
            ))}
          </Accordion>
        </Box>
      )}
    </VStack>
  );
}

// ============================================================================
// Stage Item Component
// ============================================================================

interface StageItemProps {
  stage: typeof STAGES[0];
  status: 'pending' | 'in-progress' | 'completed';
  result?: StageResult;
  isClickable: boolean;
  onClick: () => void;
}

function StageItem({ stage, status, result, isClickable, onClick }: StageItemProps) {
  const getStatusIcon = () => {
    if (status === 'completed') return <Icon as={FiCheckCircle} color="green.500" />;
    if (status === 'in-progress') return <Spinner size="xs" color="purple.500" />;
    return <Icon as={FiCircle} color={useSemanticToken('text.tertiary')} />;
  };

  const getStatusColor = () => {
    if (status === 'completed') return 'green.50';
    if (status === 'in-progress') return 'purple.50';
    return 'gray.50';
  };

  return (
    <HStack
      p={2}
      bg={getStatusColor()}
      borderRadius="md"
      spacing={3}
      cursor={isClickable ? 'pointer' : 'default'}
      onClick={isClickable ? onClick : undefined}
      _hover={isClickable ? { bg: 'gray.200' } : {}}
      transition="all 0.2s"
    >
      {getStatusIcon()}
      
      <VStack align="start" spacing={0} flex={1}>
        <HStack spacing={2}>
          <Text fontSize="xs">{stage.icon}</Text>
          <Text fontSize="sm" fontWeight="600">
            {stage.name}
          </Text>
        </HStack>
        <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
          {stage.description}
        </Text>
      </VStack>

      {result && (
        <VStack align="end" spacing={0}>
          <Badge colorScheme="green" fontSize="9px">
            {Math.floor((new Date(result.timestamp).getTime() - new Date().getTime()) / 1000)}s
          </Badge>
          {isClickable && (
            <Icon as={FiEye} boxSize={3} color={useSemanticToken('text.secondary')} />
          )}
        </VStack>
      )}
    </HStack>
  );
}

// ============================================================================
// Stage Details Component
// ============================================================================

interface StageDetailsProps {
  result: StageResult;
}

function StageDetails({ result }: StageDetailsProps) {
  const stage = STAGES.find(s => s.id === result.stage);
  if (!stage) return null;

  return (
    <AccordionItem border="none">
      <AccordionButton px={0}>
        <HStack flex={1} spacing={2}>
          <Text fontSize="xs">{stage.icon}</Text>
          <Text fontSize="sm" fontWeight="600">
            {stage.name} Output
          </Text>
          <Badge colorScheme="green" fontSize="9px">
            COMPLETED
          </Badge>
        </HStack>
        <AccordionIcon />
      </AccordionButton>
      
      <AccordionPanel px={0} py={3}>
        <VStack align="stretch" spacing={3}>
          {/* Metadata */}
          {result.metadata && (
            <HStack spacing={4} fontSize="xs" color={useSemanticToken('text.secondary')}>
              {result.metadata.model && (
                <Text>Model: {result.metadata.model}</Text>
              )}
              {result.metadata.tokensUsed && (
                <Text>Tokens: {result.metadata.tokensUsed}</Text>
              )}
              {result.metadata.exchangeCount && (
                <Text>Exchanges: {result.metadata.exchangeCount}</Text>
              )}
              {result.metadata.wordCount && (
                <Text>Words: {result.metadata.wordCount}</Text>
              )}
            </HStack>
          )}

          {/* Output Preview */}
          <Box
            p={3}
            bg={useSemanticToken('surface.base')}
            borderRadius="md"
            fontSize="xs"
            maxH="200px"
            overflowY="auto"
          >
            <Code fontSize="xs" whiteSpace="pre-wrap">
              {JSON.stringify(result.output, null, 2).substring(0, 500)}
              {JSON.stringify(result.output).length > 500 && '...'}
            </Code>
          </Box>

          {/* Stage-Specific Info */}
          {result.stage === 'director' && result.output.overallAssessment && (
            <Alert status="info" fontSize="xs">
              <AlertIcon boxSize={3} />
              <VStack align="start" spacing={1}>
                <Text fontWeight="600">
                  Director Rating: {result.output.overallAssessment.rating}/10
                </Text>
                {result.output.revisions && (
                  <Text>Revisions: {result.output.revisions.length}</Text>
                )}
              </VStack>
            </Alert>
          )}

          {result.stage === 'editor' && result.output.approved !== undefined && (
            <Alert
              status={result.output.approved ? 'success' : 'warning'}
              fontSize="xs"
            >
              <AlertIcon boxSize={3} />
              <Text fontWeight="600">
                {result.output.approved
                  ? '✅ Approved for Production'
                  : '⚠️ Issues Found - Review Required'}
              </Text>
            </Alert>
          )}
        </VStack>
      </AccordionPanel>
    </AccordionItem>
  );
}
