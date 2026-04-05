/**
 * Research Topic Analyzer
 * Displays Qwen3's structured analysis of a research report:
 * - Topics with depth/coverage ratings
 * - Gaps & weak areas
 * - Overall assessment & next steps
 * - Follow-up research actions
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Button,
  Checkbox,
  Progress,
  Spinner,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  SimpleGrid,
  Textarea,
  Tooltip,
  Icon,
  Divider,
  Select,
  useToast,
  Collapse,
} from '@chakra-ui/react';
import {
  FiSearch,
  FiMessageCircle,
  FiAlertTriangle,
  FiCheckCircle,
  FiTarget,
  FiTrendingUp,
  FiChevronDown,
  FiChevronUp,
  FiZap,
  FiCpu,
  FiBookOpen,
  FiInbox,
} from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// --- Types ---

export interface GatheredResearch {
  session_id: string;
  query: string;
  report: string;
  model: string;
  cost?: number;
  sources?: Array<{ title?: string; url?: string }>;
  completed_at: string;
  target_topic_ids?: string[];
  target_gap_topics?: string[];
}

export interface AnalysisTopic {
  id: string;
  name: string;
  summary: string;
  headings: string[];
  depth: 'shallow' | 'moderate' | 'deep';
  coverage_pct: number;
  key_findings: string[];
  suggested_followup: string;
  gathered_research?: GatheredResearch[];
}

export interface AnalysisGap {
  topic: string;
  reason: string;
  suggested_query: string;
}

export interface AnalysisAssessment {
  strengths: string[];
  weaknesses: string[];
  recommended_next_steps: string[];
}

export interface ReportAnalysis {
  topics: AnalysisTopic[];
  gaps: AnalysisGap[];
  overall_assessment: AnalysisAssessment;
}

interface ResearchTopicAnalyzerProps {
  analysis: ReportAnalysis | null;
  isAnalyzing: boolean;
  onAnalyze: (forceGemini?: boolean) => void;
  onFollowUpDeepResearch: (query: string, includeContext: boolean, selectedTopicIds: string[], selectedGapTopics: string[], model?: string) => void;
  onFollowUpQwen3: (query: string, context: string) => void;
  reportExists: boolean;
  pendingResearch?: Record<string, string>;
  onPublishConsolidated?: () => void;
  onImportResearch?: () => void;
}

// --- Helpers ---

const depthColor = (depth: string) => {
  switch (depth) {
    case 'deep': return 'green';
    case 'moderate': return 'yellow';
    case 'shallow': return 'red';
    default: return 'gray';
  }
};

const depthIcon = (depth: string) => {
  switch (depth) {
    case 'deep': return '🟢';
    case 'moderate': return '🟡';
    case 'shallow': return '🔴';
    default: return '⚪';
  }
};

// --- Component ---

export default function ResearchTopicAnalyzer({
  analysis,
  isAnalyzing,
  onAnalyze,
  onFollowUpDeepResearch,
  onFollowUpQwen3,
  reportExists,
  pendingResearch = {},
  onPublishConsolidated,
  onImportResearch,
}: ResearchTopicAnalyzerProps) {
  // Debug logging
  console.log('[ResearchTopicAnalyzer] Props:', { 
    hasAnalysis: !!analysis, 
    isAnalyzing, 
    reportExists,
    topicsCount: analysis?.topics?.length,
    analysisType: typeof analysis,
  });
  
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
  const [selectedGaps, setSelectedGaps] = useState<Set<string>>(new Set());
  const [followUpModel, setFollowUpModel] = useState<string>('perplexity');
  const [editableQuery, setEditableQuery] = useState('');
  const [includeContext, setIncludeContext] = useState(true);
  const [showFollowUpBar, setShowFollowUpBar] = useState(false);
  const [expandedGathered, setExpandedGathered] = useState<Set<string>>(new Set());
  const toast = useToast();

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const cardBg = useSemanticToken('surface.base');

  const toggleTopic = useCallback((id: string) => {
    setSelectedTopics(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleGap = useCallback((topic: string) => {
    setSelectedGaps(prev => {
      const next = new Set(prev);
      if (next.has(topic)) next.delete(topic);
      else next.add(topic);
      return next;
    });
  }, []);

  const totalSelected = selectedTopics.size + selectedGaps.size;

  // Build combined follow-up query from selections
  const buildFollowUpQuery = useCallback(() => {
    if (!analysis) return '';
    const parts: string[] = [];

    for (const topicId of selectedTopics) {
      const topic = analysis.topics?.find(t => t.id === topicId);
      if (topic?.suggested_followup) parts.push(topic.suggested_followup);
    }
    const gaps = analysis.gaps || [];
    for (const gapTopic of selectedGaps) {
      const gap = gaps.find(g => g.topic === gapTopic);
      if (gap?.suggested_query) parts.push(gap.suggested_query);
    }

    return parts.join('\n\nAdditionally: ');
  }, [analysis, selectedTopics, selectedGaps]);

  // Build context from selected topics (summaries + key findings)
  const buildSelectedContext = useCallback(() => {
    if (!analysis) return '';
    const sections: string[] = [];

    for (const topicId of selectedTopics) {
      const topic = analysis.topics?.find(t => t.id === topicId);
      if (topic) {
        const findings = topic.key_findings || [];
        sections.push(`## ${topic.name}\n${topic.summary}\n\nKey findings:\n${findings.map(f => `- ${f}`).join('\n')}`);
      }
    }
    const gaps = analysis.gaps || [];
    for (const gapTopic of selectedGaps) {
      const gap = gaps.find(g => g.topic === gapTopic);
      if (gap) {
        sections.push(`## Gap: ${gap.topic}\n${gap.reason}`);
      }
    }

    return sections.join('\n\n');
  }, [analysis, selectedTopics, selectedGaps]);

  const handlePrepareFollowUp = useCallback(() => {
    const query = buildFollowUpQuery();
    setEditableQuery(query);
    setShowFollowUpBar(true);
  }, [buildFollowUpQuery]);

  // --- Empty state ---
  if (!reportExists) {
    return (
      <Box p={8} textAlign="center">
        <VStack spacing={4}>
          <Icon as={FiSearch} boxSize={12} color={mutedColor} />
          <Text fontSize="lg" fontWeight="600" color={textColor}>
            No Research Report Yet
          </Text>
          <Text fontSize="sm" color={mutedColor} maxW="400px">
            Run a deep research query in the Chat tab first, then switch here to analyze the report's topics, identify gaps, and plan follow-up research.
          </Text>
        </VStack>
      </Box>
    );
  }

  // --- Analyzing state ---
  const hasGatheredResearch = analysis?.topics?.some(t => (t.gathered_research?.length || 0) > 0) ?? false;
  if (isAnalyzing) {
    return (
      <Box p={8} textAlign="center">
        <VStack spacing={4}>
          <Spinner size="xl" color="purple.500" thickness="3px" />
          <Text fontSize="lg" fontWeight="600" color={textColor}>
            {hasGatheredResearch ? 'Re-analyzing with Gemini Flash...' : 'Analyzing Report with Qwen3...'}
          </Text>
          <Text fontSize="sm" color={mutedColor}>
            {hasGatheredResearch
              ? 'Using Gemini Flash (1M context) to incorporate gathered research'
              : 'Extracting topics, identifying gaps, assessing coverage depth'}
          </Text>
        </VStack>
      </Box>
    );
  }

  // --- Pre-analysis state ---
  // Check for valid analysis with topics array
  if (!analysis || !analysis.topics || !Array.isArray(analysis.topics)) {
    return (
      <Box p={8} textAlign="center">
        <VStack spacing={4}>
          <Icon as={FiCpu} boxSize={12} color="purple.400" />
          <Text fontSize="lg" fontWeight="600" color={textColor}>
            Research Analyzer
          </Text>
          <Text fontSize="sm" color={mutedColor} maxW="440px">
            Decompose your research report into topics, rate coverage depth, identify gaps, and generate targeted follow-up queries.
          </Text>
          <Button
            colorScheme="purple"
            size="lg"
            leftIcon={<FiZap />}
            onClick={onAnalyze}
            mt={2}
          >
            Analyze Report
          </Button>
        </VStack>
      </Box>
    );
  }

  // --- Analysis results ---
  const shallowTopics = analysis.topics.filter(t => t.depth === 'shallow');
  const gaps = analysis.gaps || [];
  const overallAssessment = analysis.overall_assessment || { strengths: [], weaknesses: [], recommended_next_steps: [] };
  const totalGathered = analysis.topics.reduce((sum, t) => sum + (t.gathered_research?.length || 0), 0);
  const pendingCount = Object.keys(pendingResearch).length;

  return (
    <VStack spacing={0} align="stretch" h="full">
      {/* Header stats */}
      <HStack px={4} py={3} borderBottom="1px solid" borderColor={borderColor} spacing={4} flexWrap="wrap">
        <HStack spacing={2}>
          <Icon as={FiTarget} color="purple.400" />
          <Text fontSize="sm" fontWeight="600" color={textColor}>
            {analysis.topics.length} topics
          </Text>
        </HStack>
        <HStack spacing={2}>
          <Icon as={FiAlertTriangle} color="orange.400" />
          <Text fontSize="sm" fontWeight="600" color={textColor}>
            {gaps.length} gaps
          </Text>
        </HStack>
        {shallowTopics.length > 0 && (
          <Badge colorScheme="red" fontSize="xs">
            {shallowTopics.length} shallow
          </Badge>
        )}
        {totalGathered > 0 && (
          <Badge colorScheme="blue" fontSize="xs">
            📥 {totalGathered} gathered
          </Badge>
        )}
        {pendingCount > 0 && (
          <HStack spacing={1}>
            <Spinner size="xs" color="purple.400" />
            <Text fontSize="xs" color="purple.400">{pendingCount} researching</Text>
          </HStack>
        )}
        <Tooltip label="Re-analyze with Gemini Flash (1M context) to incorporate all gathered research" placement="bottom">
          <Button
            size="xs"
            variant="ghost"
            colorScheme="purple"
            onClick={() => onAnalyze(true)}
            leftIcon={<FiZap />}
          >
            Re-analyze
          </Button>
        </Tooltip>
      </HStack>

      {/* Tabs */}
      <Tabs variant="soft-rounded" colorScheme="purple" size="sm" flex="1" display="flex" flexDirection="column">
        <TabList px={4} pt={3} pb={1} gap={2}>
          <Tab fontSize="xs">Topics</Tab>
          <Tab fontSize="xs">
            Gaps & Weak Areas
            {(gaps.length + shallowTopics.length) > 0 && (
              <Badge ml={1.5} colorScheme="orange" fontSize="2xs">{gaps.length + shallowTopics.length}</Badge>
            )}
          </Tab>
          <Tab fontSize="xs">Next Steps</Tab>
          <Tab fontSize="xs">
            <HStack spacing={1}>
              <Icon as={FiInbox} boxSize={3} />
              <Text>Gathered</Text>
            </HStack>
            {totalGathered > 0 && (
              <Badge ml={1.5} colorScheme="blue" fontSize="2xs">{totalGathered}</Badge>
            )}
          </Tab>
        </TabList>

        <TabPanels flex="1" overflow="auto">
          {/* === TOPICS TAB === */}
          <TabPanel px={4} py={3}>
            <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={3}>
              {analysis.topics.map((topic) => (
                <Box
                  key={topic.id}
                  p={3}
                  bg={cardBg}
                  border="1px solid"
                  borderColor={selectedTopics.has(topic.id) ? 'purple.400' : borderColor}
                  borderRadius="lg"
                  cursor="pointer"
                  onClick={() => toggleTopic(topic.id)}
                  _hover={{ borderColor: 'purple.300', shadow: 'sm' }}
                  transition="all 0.15s"
                >
                  <HStack spacing={2} mb={2}>
                    <Checkbox
                      isChecked={selectedTopics.has(topic.id)}
                      onChange={() => toggleTopic(topic.id)}
                      colorScheme="purple"
                      size="sm"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Text fontSize="sm" fontWeight="600" color={textColor} noOfLines={1} flex={1}>
                      {topic.name}
                    </Text>
                    <Tooltip label={`${topic.depth} coverage`}>
                      <Badge colorScheme={depthColor(topic.depth)} fontSize="2xs">
                        {depthIcon(topic.depth)} {topic.depth}
                      </Badge>
                    </Tooltip>
                  </HStack>

                  <Progress
                    value={topic.coverage_pct}
                    size="xs"
                    colorScheme={depthColor(topic.depth)}
                    borderRadius="full"
                    mb={2}
                  />
                  <Text fontSize="2xs" color={mutedColor} mb={2}>
                    {topic.coverage_pct}% coverage
                  </Text>

                  <Text fontSize="xs" color={mutedColor} noOfLines={2} mb={2}>
                    {topic.summary}
                  </Text>

                  {topic.key_findings.length > 0 && (
                    <HStack spacing={1} flexWrap="wrap">
                      {topic.key_findings.slice(0, 2).map((f, i) => (
                        <Badge key={i} fontSize="2xs" variant="subtle" colorScheme="gray" noOfLines={1}>
                          {f.length > 40 ? f.substring(0, 40) + '...' : f}
                        </Badge>
                      ))}
                    </HStack>
                  )}
                  <HStack spacing={1} mt={1}>
                    {(topic.gathered_research?.length || 0) > 0 && (
                      <Badge colorScheme="blue" fontSize="2xs" variant="subtle">
                        📥 {topic.gathered_research!.length} gathered
                      </Badge>
                    )}
                    {pendingResearch[topic.id] && (
                      <>
                        <Spinner size="xs" color="purple.400" />
                        <Text fontSize="2xs" color="purple.400">Researching...</Text>
                      </>
                    )}
                  </HStack>
                </Box>
              ))}
            </SimpleGrid>
          </TabPanel>

          {/* === GAPS & WEAK AREAS TAB === */}
          <TabPanel px={4} py={3}>
            <VStack spacing={3} align="stretch">
              {gaps.length > 0 && (
                <>
                  <Text fontSize="xs" fontWeight="700" color="orange.400" textTransform="uppercase" letterSpacing="wide">
                    Missing Topics
                  </Text>
                  {gaps.map((gap, idx) => (
                    <Box
                      key={idx}
                      p={3}
                      bg={cardBg}
                      border="1px solid"
                      borderColor={selectedGaps.has(gap.topic) ? 'orange.400' : borderColor}
                      borderRadius="lg"
                      cursor="pointer"
                      onClick={() => toggleGap(gap.topic)}
                      _hover={{ borderColor: 'orange.300', shadow: 'sm' }}
                      transition="all 0.15s"
                    >
                      <HStack spacing={2} mb={1}>
                        <Checkbox
                          isChecked={selectedGaps.has(gap.topic)}
                          onChange={() => toggleGap(gap.topic)}
                          colorScheme="orange"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Icon as={FiAlertTriangle} color="orange.400" boxSize={3.5} />
                        <Text fontSize="sm" fontWeight="600" color={textColor}>
                          {gap.topic}
                        </Text>
                      </HStack>
                      <Text fontSize="xs" color={mutedColor} ml={7}>
                        {gap.reason}
                      </Text>
                      {pendingResearch[`gap:${gap.topic}`] && (
                        <HStack spacing={1} ml={7} mt={1}>
                          <Spinner size="xs" color="purple.400" />
                          <Text fontSize="2xs" color="purple.400">Gathering research...</Text>
                        </HStack>
                      )}
                    </Box>
                  ))}
                </>
              )}

              {shallowTopics.length > 0 && (
                <>
                  <Divider my={1} />
                  <Text fontSize="xs" fontWeight="700" color="red.400" textTransform="uppercase" letterSpacing="wide">
                    Shallow Coverage
                  </Text>
                  {shallowTopics.map((topic) => (
                    <Box
                      key={topic.id}
                      p={3}
                      bg={cardBg}
                      border="1px solid"
                      borderColor={selectedTopics.has(topic.id) ? 'red.400' : borderColor}
                      borderRadius="lg"
                      cursor="pointer"
                      onClick={() => toggleTopic(topic.id)}
                      _hover={{ borderColor: 'red.300', shadow: 'sm' }}
                      transition="all 0.15s"
                    >
                      <HStack spacing={2} mb={1}>
                        <Checkbox
                          isChecked={selectedTopics.has(topic.id)}
                          onChange={() => toggleTopic(topic.id)}
                          colorScheme="red"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Badge colorScheme="red" fontSize="2xs">🔴 {topic.coverage_pct}%</Badge>
                        <Text fontSize="sm" fontWeight="600" color={textColor}>
                          {topic.name}
                        </Text>
                      </HStack>
                      <Text fontSize="xs" color={mutedColor} ml={7}>
                        {topic.summary}
                      </Text>
                    </Box>
                  ))}
                </>
              )}

              {gaps.length === 0 && shallowTopics.length === 0 && (
                <Box p={6} textAlign="center">
                  <Icon as={FiCheckCircle} boxSize={8} color="green.400" mb={2} />
                  <Text fontSize="sm" color={mutedColor}>
                    No significant gaps or weak areas detected.
                  </Text>
                </Box>
              )}
            </VStack>
          </TabPanel>

          {/* === NEXT STEPS TAB === */}
          <TabPanel px={4} py={3}>
            <VStack spacing={4} align="stretch">
              {/* Strengths */}
              <Box>
                <HStack mb={2}>
                  <Icon as={FiCheckCircle} color="green.400" />
                  <Text fontSize="sm" fontWeight="700" color="green.400">Strengths</Text>
                </HStack>
                <VStack align="stretch" spacing={1} pl={6}>
                  {overallAssessment.strengths.map((s, i) => (
                    <Text key={i} fontSize="xs" color={textColor}>• {s}</Text>
                  ))}
                </VStack>
              </Box>

              {/* Weaknesses */}
              <Box>
                <HStack mb={2}>
                  <Icon as={FiAlertTriangle} color="orange.400" />
                  <Text fontSize="sm" fontWeight="700" color="orange.400">Weaknesses</Text>
                </HStack>
                <VStack align="stretch" spacing={1} pl={6}>
                  {overallAssessment.weaknesses.map((w, i) => (
                    <Text key={i} fontSize="xs" color={textColor}>• {w}</Text>
                  ))}
                </VStack>
              </Box>

              <Divider />

              {/* Recommended next steps as clickable chips */}
              <Box>
                <HStack mb={2}>
                  <Icon as={FiTrendingUp} color="purple.400" />
                  <Text fontSize="sm" fontWeight="700" color="purple.400">Recommended Follow-ups</Text>
                </HStack>
                <HStack spacing={2} flexWrap="wrap" pl={6}>
                  {overallAssessment.recommended_next_steps.map((step, i) => (
                    <Button
                      key={i}
                      size="xs"
                      variant="outline"
                      colorScheme="purple"
                      borderRadius="full"
                      fontWeight="normal"
                      fontSize="xs"
                      onClick={() => {
                        setEditableQuery(step);
                        setShowFollowUpBar(true);
                      }}
                    >
                      {step.length > 60 ? step.substring(0, 60) + '...' : step}
                    </Button>
                  ))}
                </HStack>
              </Box>
            </VStack>
          </TabPanel>

          {/* === GATHERED RESEARCH TAB === */}
          <TabPanel px={4} py={3}>
            {totalGathered === 0 ? (
              <Box p={6} textAlign="center">
                <Icon as={FiInbox} boxSize={8} color={mutedColor} mb={2} />
                <Text fontSize="sm" color={mutedColor} mb={3}>
                  No gathered research yet. Select topics or gaps and click &ldquo;Gather Research&rdquo; to expand your knowledge.
                </Text>
                {onImportResearch && (
                  <Button size="sm" variant="outline" colorScheme="blue" leftIcon={<FiInbox />} onClick={onImportResearch}>
                    Import Existing Research
                  </Button>
                )}
              </Box>
            ) : (
              <VStack spacing={4} align="stretch">
                {onImportResearch && (
                  <HStack justify="flex-end">
                    <Button size="xs" variant="outline" colorScheme="blue" leftIcon={<FiInbox />} onClick={onImportResearch}>
                      Import Research
                    </Button>
                  </HStack>
                )}
                {analysis.topics.filter(t => (t.gathered_research?.length || 0) > 0).map((topic) => (
                  <Box key={topic.id}>
                    <HStack mb={2}>
                      <Text fontSize="sm" fontWeight="700" color={textColor}>{topic.name}</Text>
                      <Badge colorScheme={depthColor(topic.depth)} fontSize="2xs">{topic.depth}</Badge>
                      <Badge colorScheme="blue" fontSize="2xs">{topic.gathered_research!.length} outputs</Badge>
                    </HStack>
                    <VStack spacing={2} align="stretch" pl={3} borderLeft="2px solid" borderColor="blue.400">
                      {topic.gathered_research!.map((gr, idx) => {
                        const grKey = `${topic.id}-${idx}`;
                        const isExpanded = expandedGathered.has(grKey);
                        return (
                          <Box
                            key={idx}
                            p={3}
                            bg={cardBg}
                            border="1px solid"
                            borderColor={borderColor}
                            borderRadius="md"
                          >
                            <HStack justify="space-between" mb={1}>
                              <Text fontSize="xs" fontWeight="600" color={textColor} noOfLines={1} flex={1}>
                                {gr.query.substring(0, 100)}{gr.query.length > 100 ? '...' : ''}
                              </Text>
                              <HStack spacing={1}>
                                <Badge fontSize="2xs" colorScheme="purple">{gr.model}</Badge>
                                {gr.cost != null && <Badge fontSize="2xs" colorScheme="green">${gr.cost.toFixed(4)}</Badge>}
                              </HStack>
                            </HStack>
                            <Box
                              fontSize="xs"
                              color={mutedColor}
                              cursor="pointer"
                              onClick={() => {
                                setExpandedGathered(prev => {
                                  const next = new Set(prev);
                                  if (next.has(grKey)) next.delete(grKey);
                                  else next.add(grKey);
                                  return next;
                                });
                              }}
                              sx={{
                                '& h1, & h2, & h3, & h4': { fontSize: 'sm', fontWeight: 700, mt: 3, mb: 1, color: textColor },
                                '& p': { mb: 2 },
                                '& ul, & ol': { pl: 4, mb: 2 },
                                '& li': { mb: 1 },
                                ...(!isExpanded && { maxH: '80px', overflow: 'hidden', position: 'relative' }),
                              }}
                            >
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {isExpanded ? gr.report : gr.report.substring(0, 800)}
                              </ReactMarkdown>
                              {!isExpanded && gr.report.length > 800 && (
                                <Box
                                  position="absolute"
                                  bottom={0}
                                  left={0}
                                  right={0}
                                  h="30px"
                                  bgGradient="linear(to-t, var(--chakra-colors-chakra-body-bg), transparent)"
                                />
                              )}
                            </Box>
                            {!isExpanded && gr.report.length > 500 && (
                              <Text
                                fontSize="2xs"
                                color="purple.400"
                                cursor="pointer"
                                mt={1}
                                onClick={() => {
                                  setExpandedGathered(prev => {
                                    const next = new Set(prev);
                                    next.add(grKey);
                                    return next;
                                  });
                                }}
                              >
                                Show full report ({Math.round(gr.report.length / 1000)}k chars)
                              </Text>
                            )}
                            {isExpanded && (
                              <HStack justify="flex-end" mt={2}>
                                <Button
                                  size="xs"
                                  variant="ghost"
                                  colorScheme="purple"
                                  leftIcon={<FiChevronUp />}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedGathered(prev => {
                                      const next = new Set(prev);
                                      next.delete(grKey);
                                      return next;
                                    });
                                  }}
                                >
                                  Collapse
                                </Button>
                              </HStack>
                            )}
                          </Box>
                        );
                      })}
                    </VStack>
                  </Box>
                ))}
              </VStack>
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Follow-up action bar */}
      <Box
        borderTop="1px solid"
        borderColor={borderColor}
        px={4}
        py={3}
        bg={bgColor}
      >
        {!showFollowUpBar ? (
          <HStack justify="space-between">
            <HStack spacing={3}>
              {totalGathered > 0 && onPublishConsolidated && (
                <Button
                  size="sm"
                  colorScheme="blue"
                  variant="outline"
                  leftIcon={<FiBookOpen />}
                  onClick={onPublishConsolidated}
                >
                  Publish All ({totalGathered})
                </Button>
              )}
              <Text fontSize="xs" color={mutedColor}>
                {totalSelected > 0 ? `${totalSelected} selected` : 'Select topics or gaps to expand'}
              </Text>
            </HStack>
            <HStack spacing={2}>
              <Button
                type="button"
                size="sm"
                colorScheme="purple"
                leftIcon={<FiSearch />}
                isDisabled={totalSelected === 0}
                onClick={handlePrepareFollowUp}
              >
                Gather Research
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                colorScheme="purple"
                leftIcon={<FiMessageCircle />}
                isDisabled={totalSelected === 0}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  const query = buildFollowUpQuery();
                  const context = buildSelectedContext();
                  console.log('[ResearchTopicAnalyzer] Ask Qwen3 clicked:', { 
                    queryLength: query?.length, 
                    contextLength: context?.length,
                    selectedTopicsCount: selectedTopics.size,
                    selectedGapsCount: selectedGaps.size,
                  });
                  if (!query || query.trim().length === 0) {
                    toast({ title: 'Please select topics first', status: 'warning', duration: 2000, position: 'bottom-right' });
                    return;
                  }
                  onFollowUpQwen3(query, context);
                  toast({ title: 'Querying Qwen3...', status: 'info', duration: 2000, position: 'bottom-right' });
                }}
              >
                Ask Qwen3
              </Button>
            </HStack>
          </HStack>
        ) : (
          <VStack spacing={3} align="stretch">
            <HStack justify="space-between">
              <Text fontSize="xs" fontWeight="600" color={textColor}>
                Follow-up Research Query
              </Text>
              <Button size="xs" variant="ghost" onClick={() => setShowFollowUpBar(false)}>
                Cancel
              </Button>
            </HStack>
            <Textarea
              value={editableQuery}
              onChange={(e) => setEditableQuery(e.target.value)}
              size="sm"
              fontSize="xs"
              rows={3}
              placeholder="Edit the follow-up query..."
            />
            <HStack justify="space-between">
              <Checkbox
                isChecked={includeContext}
                onChange={(e) => setIncludeContext(e.target.checked)}
                size="sm"
              >
                <Text fontSize="xs" color={mutedColor}>Include original report as context</Text>
              </Checkbox>
            </HStack>
            <HStack justify="space-between" spacing={2}>
              <Select
                size="sm"
                fontSize="xs"
                value={followUpModel}
                onChange={(e) => setFollowUpModel(e.target.value)}
                w="200px"
                borderRadius="md"
              >
                <option value="perplexity">Perplexity Deep Research</option>
                <option value="gemini-deep-research">Gemini Deep Research</option>
              </Select>
              <Button
                size="sm"
                colorScheme="purple"
                leftIcon={<FiSearch />}
                onClick={() => {
                  onFollowUpDeepResearch(editableQuery, includeContext, Array.from(selectedTopics), Array.from(selectedGaps), followUpModel);
                  setShowFollowUpBar(false);
                }}
                isDisabled={!editableQuery.trim()}
              >
                Gather Research
              </Button>
            </HStack>
          </VStack>
        )}
      </Box>
    </VStack>
  );
}
