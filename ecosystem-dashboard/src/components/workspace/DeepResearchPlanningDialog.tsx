import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  VStack,
  HStack,
  Box,
  Text,
  Button,
  Badge,
  Icon,
  Divider,
  List,
  ListItem,
  ListIcon,
  Alert,
  AlertIcon,
  Collapse,
  IconButton,
  OrderedList,
  UnorderedList,
} from '@chakra-ui/react';
import { FiSearch, FiCalendar, FiGlobe, FiSettings, FiCheckCircle, FiEdit2, FiX, FiClock, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import { useSemanticToken } from '@/hooks/useSemanticToken';

export interface ResearchPlan {
  // Query information
  query: string;
  refinedQuery?: string;          // Goose-optimized version of the query
  queryRationale?: string;         // Why the query was refined

  // Search parameters (what we CAN control)
  searchMode: 'web' | 'academic';
  domains: string[];
  domainRationale: string;
  recencyFilter: string;
  recencyRationale: string;

  // Output parameters
  maxTokens: number;
  includeImages: boolean;
  relatedQuestions: boolean;
  temperature: number;
  topP?: number;
  responseFormat?: 'markdown' | 'json';

  // Overall strategy summary
  strategyOverview?: string;       // High-level approach (1-2 sentences)
  expectedOutcomes?: string[];     // What this research will reveal

  fullRationale?: string;
}

interface DeepResearchPlanningDialogProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  goosePlan?: ResearchPlan;
  onApprove: (plan: ResearchPlan) => void;
  onModify: (plan: ResearchPlan) => void;
  isLoading?: boolean;
}

export const DeepResearchPlanningDialog: React.FC<DeepResearchPlanningDialogProps> = ({
  isOpen,
  onClose,
  query,
  goosePlan,
  onApprove,
  onModify,
  isLoading = false,
}) => {
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const accentColor = 'blue.500';
  const mutedColor = useSemanticToken('text.secondary');
  const textColor = useSemanticToken('text.primary');
  const queryBg = useSemanticToken('surface.base');
  const refinedQueryBg = useSemanticToken('surface.highlight');

  const [showFullDetails, setShowFullDetails] = useState(false);

  if (!goosePlan) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} size="xl" isCentered>
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent bg={bgColor}>
          <ModalHeader>
            <HStack>
              <Icon as={FiSearch} color={accentColor} />
              <Text>Planning Deep Research...</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4} align="stretch">
              <Alert status="info">
                <AlertIcon />
                Goose is analyzing your query and preparing an optimized research plan...
              </Alert>
              <Text fontSize="sm" color={mutedColor}>
                Query: <Text as="span" fontWeight="600" color={textColor}>{query}</Text>
              </Text>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    );
  }

  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set([0])); // First phase expanded by default

  const getModeIcon = (mode: string) => mode === 'academic' ? '🎓' : '🌐';
  const getModeLabel = (mode: string) => mode === 'academic' ? 'Academic' : 'Web';

  const getTemperatureDescription = (temp: number) => {
    if (temp <= 0.2) return 'Very Focused';
    if (temp <= 0.4) return 'Focused';
    if (temp <= 0.6) return 'Balanced';
    if (temp <= 0.8) return 'Exploratory';
    return 'Very Exploratory';
  };

  const togglePhase = (index: number) => {
    const newExpanded = new Set(expandedPhases);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedPhases(newExpanded);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" isCentered scrollBehavior="inside">
      <ModalOverlay backdropFilter="blur(4px)" />
      <ModalContent bg={bgColor} maxH="90vh">
        <ModalHeader borderBottom="1px solid" borderColor={borderColor}>
          <HStack>
            <Icon as={FiSearch} color={accentColor} boxSize={5} />
            <Text>Deep Research Plan</Text>
            <Badge colorScheme="blue" ml={2}>Goose Optimized</Badge>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody py={6}>
          <VStack spacing={6} align="stretch">
            {/* Original Query */}
            <Box>
              <Text fontSize="xs" fontWeight="600" color={mutedColor} mb={1} textTransform="uppercase" letterSpacing="wide">
                Original Query
              </Text>
              <Box
                p={3}
                bg={queryBg}
                borderRadius="md"
                borderLeft="3px solid"
                borderColor="gray.400"
              >
                <Text fontSize="sm">{goosePlan.query}</Text>
              </Box>
            </Box>

            {/* Strategic Research Directive */}
            {goosePlan.refinedQuery && (
              <Box>
                <Text fontSize="xs" fontWeight="600" color={mutedColor} mb={1} textTransform="uppercase" letterSpacing="wide">
                  Strategic Research Directive
                </Text>
                <Box
                  p={4}
                  bg={refinedQueryBg}
                  borderRadius="md"
                  borderLeft="4px solid"
                  borderColor="blue.500"
                >
                  <Text fontSize="sm" fontWeight="500" lineHeight="tall">
                    {goosePlan.refinedQuery}
                  </Text>
                  {goosePlan.queryRationale && (
                    <Text fontSize="xs" color={mutedColor} mt={2} fontStyle="italic">
                      <strong>Why this works:</strong> {goosePlan.queryRationale}
                    </Text>
                  )}
                </Box>
              </Box>
            )}

            {/* Strategy Overview */}
            {goosePlan.strategyOverview && (
              <Box>
                <Text fontSize="xs" fontWeight="600" color={mutedColor} mb={1} textTransform="uppercase" letterSpacing="wide">
                  Strategy Overview
                </Text>
                <Text fontSize="sm" color={textColor} lineHeight="tall">
                  {goosePlan.strategyOverview}
                </Text>
              </Box>
            )}

            <Divider />

            {/* Search Parameters */}
            <Box>
              <Text fontSize="sm" fontWeight="700" mb={3} textTransform="uppercase" letterSpacing="wider">
                Research Strategy
              </Text>

              {/* Source Selection */}
              <VStack spacing={4} align="stretch">
                <Box>
                  <HStack mb={2}>
                    <Icon as={FiGlobe} color="green.500" boxSize={4} />
                    <Text fontSize="sm" fontWeight="600">Source Selection</Text>
                  </HStack>
                  <Box pl={6}>
                    <HStack mb={2}>
                      <Text fontSize="sm" color={mutedColor}>Mode:</Text>
                      <Badge colorScheme={goosePlan.searchMode === 'academic' ? 'purple' : 'blue'}>
                        {getModeIcon(goosePlan.searchMode)} {getModeLabel(goosePlan.searchMode)}
                      </Badge>
                    </HStack>

                    {goosePlan.domains.length > 0 && (
                      <Box mb={2}>
                        <Text fontSize="sm" color={mutedColor} mb={1}>Domains:</Text>
                        <List spacing={1}>
                          {goosePlan.domains.map((domain) => (
                            <ListItem key={domain} fontSize="sm">
                              <HStack>
                                <ListIcon
                                  as={domain.startsWith('-') ? FiX : FiCheckCircle}
                                  color={domain.startsWith('-') ? 'red.500' : 'green.500'}
                                />
                                <Text fontFamily="mono" fontSize="xs">
                                  {domain.startsWith('-') ? domain.substring(1) : domain}
                                </Text>
                                {domain.startsWith('-') && (
                                  <Badge size="sm" colorScheme="red" fontSize="2xs">Excluded</Badge>
                                )}
                              </HStack>
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    )}

                    <Text fontSize="xs" color={mutedColor} fontStyle="italic">
                      {goosePlan.domainRationale}
                    </Text>
                  </Box>
                </Box>

                {/* Time Filter */}
                <Box>
                  <HStack mb={2}>
                    <Icon as={FiCalendar} color="orange.500" boxSize={4} />
                    <Text fontSize="sm" fontWeight="600">Time Filter</Text>
                  </HStack>
                  <Box pl={6}>
                    <HStack mb={1}>
                      <Text fontSize="sm" color={mutedColor}>Recency:</Text>
                      <Badge colorScheme="orange">{goosePlan.recencyFilter}</Badge>
                    </HStack>
                    <Text fontSize="xs" color={mutedColor} fontStyle="italic">
                      {goosePlan.recencyRationale}
                    </Text>
                  </Box>
                </Box>

                {/* Output Configuration */}
                <Box>
                  <HStack mb={2}>
                    <Icon as={FiSettings} color="purple.500" boxSize={4} />
                    <Text fontSize="sm" fontWeight="600">Output Configuration</Text>
                  </HStack>
                  <Box pl={6}>
                    <VStack spacing={1} align="stretch" fontSize="sm">
                      <HStack justify="space-between">
                        <Text color={mutedColor}>Max Response Length:</Text>
                        <Badge>{goosePlan.maxTokens.toLocaleString()} tokens</Badge>
                      </HStack>
                      <HStack justify="space-between">
                        <Text color={mutedColor}>Include Images:</Text>
                        <Badge colorScheme={goosePlan.includeImages ? 'green' : 'gray'}>
                          {goosePlan.includeImages ? 'Yes' : 'No'}
                        </Badge>
                      </HStack>
                      <HStack justify="space-between">
                        <Text color={mutedColor}>Related Questions:</Text>
                        <Badge colorScheme={goosePlan.relatedQuestions ? 'green' : 'gray'}>
                          {goosePlan.relatedQuestions ? 'Yes' : 'No'}
                        </Badge>
                      </HStack>
                      <HStack justify="space-between">
                        <Text color={mutedColor}>Temperature:</Text>
                        <Badge colorScheme="blue">
                          {goosePlan.temperature} ({getTemperatureDescription(goosePlan.temperature)})
                        </Badge>
                      </HStack>
                    </VStack>
                  </Box>
                </Box>
              </VStack>
            </Box>

            {/* Expected Outcomes */}
            {goosePlan.expectedOutcomes && goosePlan.expectedOutcomes.length > 0 && (
              <Box>
                <Text fontSize="xs" fontWeight="600" color={mutedColor} mb={2} textTransform="uppercase" letterSpacing="wide">
                  Expected Outcomes
                </Text>
                <Text fontSize="xs" color={mutedColor} mb={2}>This research will deliver:</Text>
                <UnorderedList spacing={2} ml={4}>
                  {goosePlan.expectedOutcomes.map((outcome, index) => (
                    <ListItem key={index} fontSize="sm" color={textColor}>
                      {outcome}
                    </ListItem>
                  ))}
                </UnorderedList>
              </Box>
            )}

            {/* How This Influences Perplexity */}
            <Box>
              <Alert status="info" borderRadius="md" fontSize="xs">
                <AlertIcon />
                <Box>
                  <Text fontWeight="600" mb={1}>🎯 How This Influences Perplexity</Text>
                  <Text>
                    The explicit investigation points structure Perplexity's sonar-reasoning model to perform
                    multi-dimensional analysis rather than generic summaries. Each numbered point becomes an
                    internal research task.
                  </Text>
                </Box>
              </Alert>
            </Box>

            <Divider />

            {/* Action Buttons */}
            <VStack spacing={2} align="stretch">
              <Button
                colorScheme="blue"
                size="lg"
                leftIcon={<FiCheckCircle />}
                onClick={() => onApprove(goosePlan)}
                isLoading={isLoading}
                loadingText="Executing Research..."
              >
                ✅ Proceed with this plan
              </Button>

              <Button
                variant="outline"
                size="md"
                leftIcon={<FiSettings />}
                onClick={() => onModify(goosePlan)}
              >
                ⚙️ Modify parameters
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
                ❌ Cancel Deep Research
              </Button>
            </VStack>

            {/* Info Box */}
            <Alert status="success" borderRadius="md" fontSize="xs" variant="left-accent">
              <AlertIcon />
              <Box>
                <Text fontWeight="600">🦢 Goose has crafted a strategic research plan</Text>
                <Text mt={1}>
                  This multi-dimensional directive will guide Perplexity's internal planning. You can proceed with
                  Goose's recommendations or customize the parameters further.
                </Text>
              </Box>
            </Alert>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
