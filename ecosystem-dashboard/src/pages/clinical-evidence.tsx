import React, { useState, useEffect } from 'react';
import { withFeatureGuard } from '@/lib/auth/withFeatureGuard';
import {
  Box,
  Container,
  VStack,
  HStack,
  Text,
  Button,
  Input,
  Textarea,
  Select,
  Switch,
  useToast,
  IconButton,
  Flex,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  Spinner,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Badge,
  Progress,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
} from '@chakra-ui/react';
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface DashboardMetrics {
  cache: {
    session: {
      total_queries: number;
      l1_hits: number;
      l2_hits: number;
      l3_hits: number;
      misses: number;
      hit_rate: string;
    };
    l1_cache: { size: number; maxsize: number };
    persistent: {
      cached_queries: number;
      total_hits: number | null;
      active_entries: number;
      queries_24h: number;
      hit_rate_24h: number;
      avg_response_time_ms: number;
    };
  };
  errors: {
    total_errors: number;
    unresolved: number;
    errors_24h: number;
    critical_count: number;
    by_component: Array<{ component: string; count: number }>;
  };
  feedback: {
    total_feedback: number;
    unprocessed: number;
    positive: number;
    negative: number;
    corrections: number;
    avg_rating: number | null;
    by_specialty: Array<{ user_specialty: string; count: number }>;
    recent_negative: Array<{ query_text: string; comment: string; created_at: string }>;
  };
  timestamp: string;
}

interface ErrorLog {
  id: number;
  error_type: string;
  component: string;
  endpoint: string;
  error_message: string;
  severity: string;
  resolved: boolean;
  created_at: string;
}

interface FeedbackItem {
  id: number;
  query_text: string;
  response_text: string;
  feedback_type: string;
  rating: number | null;
  comment: string;
  user_specialty: string;
  is_processed: boolean;
  created_at: string;
}

interface PromptRecommendation {
  id: string;
  prompt: string;
  category: 'realtime' | 'seasonal' | 'admin' | 'evergreen';
  priority: number;
  context: string;
  active: boolean;
  createdAt: string;
  expiresAt?: string;
}

const MEDICAL_TOOLS_API = process.env.NEXT_PUBLIC_MEDICAL_TOOLS_API || 'http://localhost:8020';

function ClinicalEvidencePage() {
  const [recommendations, setRecommendations] = useState<PromptRecommendation[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedRec, setSelectedRec] = useState<PromptRecommendation | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const [formData, setFormData] = useState<{
    prompt: string;
    category: 'realtime' | 'seasonal' | 'admin' | 'evergreen';
    priority: number;
    context: string;
    active: boolean;
    expiresAt: string;
  }>({
    prompt: '',
    category: 'seasonal',
    priority: 50,
    context: '',
    active: true,
    expiresAt: '',
  });

  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.default');
  const cardBg = useSemanticToken('surface.elevated');
  const errorColor = useSemanticToken('status.error') || 'red.500';
  const successColor = useSemanticToken('status.success') || 'green.500';
  const warningColor = useSemanticToken('status.warning') || 'orange.500';

  useEffect(() => {
    fetchRecommendations();
    fetchMetrics();
    fetchErrors();
    fetchFeedback();
    
    // Refresh metrics every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
    try {
      const res = await fetch(`${MEDICAL_TOOLS_API}/api/dashboard/metrics`);
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    }
  };

  const fetchErrors = async () => {
    try {
      const res = await fetch(`${MEDICAL_TOOLS_API}/api/errors?limit=20`);
      if (res.ok) {
        const data = await res.json();
        setErrors(data.errors || []);
      }
    } catch (error) {
      console.error('Failed to fetch errors:', error);
    }
  };

  const fetchFeedback = async () => {
    try {
      const res = await fetch(`${MEDICAL_TOOLS_API}/api/feedback?limit=50`);
      if (res.ok) {
        const data = await res.json();
        setFeedback(data.feedback || []);
      }
    } catch (error) {
      console.error('Failed to fetch feedback:', error);
    }
  };

  const resolveError = async (errorId: number) => {
    try {
      await fetch(`${MEDICAL_TOOLS_API}/api/errors/${errorId}/resolve`, { method: 'POST' });
      fetchErrors();
      fetchMetrics();
      toast({ title: 'Error resolved', status: 'success', duration: 1500 });
    } catch (error) {
      toast({ title: 'Failed to resolve', status: 'error', duration: 2000 });
    }
  };

  const processFeedback = async (feedbackId: number) => {
    try {
      await fetch(`${MEDICAL_TOOLS_API}/api/feedback/${feedbackId}/process`, { method: 'POST' });
      fetchFeedback();
      fetchMetrics();
      toast({ title: 'Feedback processed', status: 'success', duration: 1500 });
    } catch (error) {
      toast({ title: 'Failed to process', status: 'error', duration: 2000 });
    }
  };

  const fetchRecommendations = async () => {
    try {
      const res = await fetch(MEDICAL_TOOLS_API + '/api/prompt-recommendations');
      if (res.ok) {
        const data = await res.json();
        setRecommendations(data.recommendations || []);
      }
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateTrendingPrompts = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch(MEDICAL_TOOLS_API + '/api/generate-trending-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ use_llm: true }),
      });
      if (res.ok) {
        const data = await res.json();
        toast({
          title: 'Generated',
          description: data.count + ' prompts from current news',
          status: 'success',
          duration: 2000,
        });
        fetchRecommendations();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Generation failed', status: 'error', duration: 2000 });
    } finally {
      setIsGenerating(false);
    }
  };

  const saveRecommendation = async () => {
    try {
      const method = selectedRec ? 'PUT' : 'POST';
      const url = selectedRec
        ? MEDICAL_TOOLS_API + '/api/prompt-recommendations/' + selectedRec.id
        : MEDICAL_TOOLS_API + '/api/prompt-recommendations';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast({ title: 'Saved', status: 'success', duration: 1500 });
        onClose();
        fetchRecommendations();
        resetForm();
      }
    } catch (error) {
      toast({ title: 'Error', status: 'error', duration: 2000 });
    }
  };

  const deleteRecommendation = async (id: string) => {
    try {
      await fetch(MEDICAL_TOOLS_API + '/api/prompt-recommendations/' + id, { method: 'DELETE' });
      fetchRecommendations();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const toggleActive = async (rec: PromptRecommendation) => {
    try {
      await fetch(MEDICAL_TOOLS_API + '/api/prompt-recommendations/' + rec.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...rec, active: !rec.active }),
      });
      fetchRecommendations();
    } catch (error) {
      console.error('Toggle failed:', error);
    }
  };

  const resetForm = () => {
    setFormData({ prompt: '', category: 'seasonal', priority: 50, context: '', active: true, expiresAt: '' });
    setSelectedRec(null);
  };

  const openEditModal = (rec: PromptRecommendation) => {
    setSelectedRec(rec);
    setFormData({
      prompt: rec.prompt,
      category: rec.category,
      priority: rec.priority,
      context: rec.context,
      active: rec.active,
      expiresAt: rec.expiresAt || '',
    });
    onOpen();
  };

  const activeCount = recommendations.filter(r => r.active).length;
  const unresolvedErrors = errors.filter(e => !e.resolved).length;
  const unprocessedFeedback = feedback.filter(f => !f.is_processed).length;

  return (
    <DashboardLayout>
      <Container maxW="container.xl" py={8}>
        <Box mb={8}>
          <Text fontSize="2xl" fontWeight="600" color={textColor} letterSpacing="-0.02em">
            Clinical Evidence Dashboard
          </Text>
          <Text fontSize="sm" color={mutedColor} mt={1}>
            Monitor cache performance, errors, and user feedback
          </Text>
        </Box>

        {/* Metrics Overview */}
        {metrics && (
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={8}>
            <Box p={4} bg={cardBg} borderRadius="lg" border="1px solid" borderColor={borderColor}>
              <Text fontSize="xs" color={mutedColor} textTransform="uppercase" letterSpacing="0.05em">Cache Hit Rate</Text>
              <Text fontSize="2xl" fontWeight="600" color={textColor}>{metrics.cache.persistent.hit_rate_24h.toFixed(1)}%</Text>
              <Text fontSize="xs" color={mutedColor}>{metrics.cache.persistent.queries_24h} queries (24h)</Text>
            </Box>
            <Box p={4} bg={cardBg} borderRadius="lg" border="1px solid" borderColor={borderColor}>
              <Text fontSize="xs" color={mutedColor} textTransform="uppercase" letterSpacing="0.05em">Avg Response</Text>
              <Text fontSize="2xl" fontWeight="600" color={textColor}>{metrics.cache.persistent.avg_response_time_ms.toFixed(0)}ms</Text>
              <Text fontSize="xs" color={mutedColor}>L1: {metrics.cache.l1_cache.size}/{metrics.cache.l1_cache.maxsize}</Text>
            </Box>
            <Box p={4} bg={cardBg} borderRadius="lg" border="1px solid" borderColor={borderColor}>
              <Text fontSize="xs" color={mutedColor} textTransform="uppercase" letterSpacing="0.05em">Errors (24h)</Text>
              <Text fontSize="2xl" fontWeight="600" color={metrics.errors.errors_24h > 0 ? errorColor : textColor}>
                {metrics.errors.errors_24h}
              </Text>
              <Text fontSize="xs" color={mutedColor}>{metrics.errors.unresolved} unresolved</Text>
            </Box>
            <Box p={4} bg={cardBg} borderRadius="lg" border="1px solid" borderColor={borderColor}>
              <Text fontSize="xs" color={mutedColor} textTransform="uppercase" letterSpacing="0.05em">Feedback</Text>
              <HStack spacing={2}>
                <Text fontSize="lg" fontWeight="600" color={successColor}>+{metrics.feedback.positive}</Text>
                <Text fontSize="lg" fontWeight="600" color={errorColor}>-{metrics.feedback.negative}</Text>
              </HStack>
              <Text fontSize="xs" color={mutedColor}>{metrics.feedback.unprocessed} to review</Text>
            </Box>
          </SimpleGrid>
        )}

        <Tabs index={activeTab} onChange={setActiveTab} variant="soft-rounded" colorScheme="green">
          <TabList mb={6}>
            <Tab fontSize="sm" color={mutedColor} _selected={{ color: textColor, bg: cardBg }}>
              <HStack spacing={2}>
                <SparklesIcon className="w-4 h-4" />
                <Text>Prompts</Text>
                <Badge colorScheme="green" fontSize="xs">{activeCount}</Badge>
              </HStack>
            </Tab>
            <Tab fontSize="sm" color={mutedColor} _selected={{ color: textColor, bg: cardBg }}>
              <HStack spacing={2}>
                <ExclamationTriangleIcon className="w-4 h-4" />
                <Text>Errors</Text>
                {unresolvedErrors > 0 && <Badge colorScheme="red" fontSize="xs">{unresolvedErrors}</Badge>}
              </HStack>
            </Tab>
            <Tab fontSize="sm" color={mutedColor} _selected={{ color: textColor, bg: cardBg }}>
              <HStack spacing={2}>
                <ChatBubbleLeftRightIcon className="w-4 h-4" />
                <Text>Feedback</Text>
                {unprocessedFeedback > 0 && <Badge colorScheme="orange" fontSize="xs">{unprocessedFeedback}</Badge>}
              </HStack>
            </Tab>
            <Tab fontSize="sm" color={mutedColor} _selected={{ color: textColor, bg: cardBg }}>
              <HStack spacing={2}>
                <ChartBarIcon className="w-4 h-4" />
                <Text>Cache</Text>
              </HStack>
            </Tab>
          </TabList>

          <TabPanels>
            {/* Prompts Tab */}
            <TabPanel p={0}>
              <Flex justify="space-between" align="center" mb={4}>
                <Text fontSize="sm" color={mutedColor}>{activeCount} active prompts</Text>
                <HStack spacing={2}>
                  <Button
                    size="sm"
                    variant="ghost"
                    leftIcon={<SparklesIcon className="w-4 h-4" />}
                    onClick={generateTrendingPrompts}
                    isLoading={isGenerating}
                    loadingText="Generating"
                    color={mutedColor}
                    _hover={{ color: textColor }}
                  >
                    Generate from News
                  </Button>
                  <Button
                    size="sm"
                    leftIcon={<PlusIcon className="w-4 h-4" />}
                    onClick={() => { resetForm(); onOpen(); }}
                    bg={textColor}
                    color={cardBg}
                    _hover={{ opacity: 0.9 }}
                  >
                    Add
                  </Button>
                </HStack>
              </Flex>

              {isLoading ? (
                <Flex justify="center" py={20}>
                  <Spinner size="sm" color={mutedColor} />
                </Flex>
              ) : (
          <VStack spacing={0} align="stretch">
            {recommendations
              .sort((a, b) => a.priority - b.priority)
              .map((rec) => (
              <Box
                key={rec.id}
                py={4}
                borderBottom="1px solid"
                borderColor={borderColor}
                _first={{ borderTop: '1px solid', borderTopColor: borderColor }}
              >
                <Flex justify="space-between" align="start">
                  <HStack spacing={4} align="start" flex={1}>
                    <Text
                      fontSize="xs"
                      fontWeight="500"
                      color={mutedColor}
                      w="24px"
                      textAlign="right"
                      pt={0.5}
                    >
                      {rec.priority}
                    </Text>
                    <Box flex={1}>
                      <Text
                        fontSize="sm"
                        color={rec.active ? textColor : mutedColor}
                        fontWeight="450"
                        textDecoration={rec.active ? 'none' : 'line-through'}
                        opacity={rec.active ? 1 : 0.6}
                      >
                        {rec.prompt}
                      </Text>
                      <HStack spacing={3} mt={1.5}>
                        <Text fontSize="xs" color={mutedColor} textTransform="uppercase" letterSpacing="0.05em">
                          {rec.category}
                        </Text>
                        {rec.context && (
                          <>
                            <Text fontSize="xs" color={mutedColor}>·</Text>
                            <Text fontSize="xs" color={mutedColor}>{rec.context}</Text>
                          </>
                        )}
                      </HStack>
                    </Box>
                  </HStack>
                  <HStack spacing={1}>
                    <Switch
                      size="sm"
                      isChecked={rec.active}
                      onChange={() => toggleActive(rec)}
                      colorScheme="green"
                    />
                    <IconButton
                      aria-label="Edit"
                      icon={<PencilIcon className="w-3.5 h-3.5" />}
                      size="sm"
                      variant="ghost"
                      color={mutedColor}
                      _hover={{ color: textColor }}
                      onClick={() => openEditModal(rec)}
                    />
                    <IconButton
                      aria-label="Delete"
                      icon={<TrashIcon className="w-3.5 h-3.5" />}
                      size="sm"
                      variant="ghost"
                      color={mutedColor}
                      _hover={{ color: 'red.500' }}
                      onClick={() => deleteRecommendation(rec.id)}
                    />
                  </HStack>
                </Flex>
              </Box>
            ))}
                </VStack>
              )}

              {!isLoading && recommendations.length === 0 && (
                <Flex justify="center" py={20}>
                  <VStack spacing={3}>
                    <Text color={mutedColor} fontSize="sm">No recommendations yet</Text>
                    <Button size="sm" variant="outline" onClick={() => { resetForm(); onOpen(); }}>
                      Add your first prompt
                    </Button>
                  </VStack>
                </Flex>
              )}
            </TabPanel>

            {/* Errors Tab */}
            <TabPanel p={0}>
              <VStack spacing={0} align="stretch">
                {errors.length === 0 ? (
                  <Flex justify="center" py={20}>
                    <VStack spacing={2}>
                      <CheckCircleIcon className="w-8 h-8 text-green-500" />
                      <Text color={mutedColor} fontSize="sm">No errors recorded</Text>
                    </VStack>
                  </Flex>
                ) : (
                  errors.map((err) => (
                    <Box
                      key={err.id}
                      py={3}
                      px={4}
                      borderBottom="1px solid"
                      borderColor={borderColor}
                      bg={err.resolved ? 'transparent' : cardBg}
                      opacity={err.resolved ? 0.6 : 1}
                    >
                      <Flex justify="space-between" align="start">
                        <Box flex={1}>
                          <HStack spacing={2} mb={1}>
                            <Badge
                              colorScheme={err.severity === 'critical' ? 'red' : err.severity === 'warning' ? 'orange' : 'gray'}
                              fontSize="xs"
                            >
                              {err.severity}
                            </Badge>
                            <Text fontSize="xs" color={mutedColor}>{err.component}</Text>
                            {err.endpoint && <Text fontSize="xs" color={mutedColor}>• {err.endpoint}</Text>}
                          </HStack>
                          <Text fontSize="sm" color={textColor} noOfLines={2}>{err.error_message}</Text>
                          <Text fontSize="xs" color={mutedColor} mt={1}>
                            {new Date(err.created_at).toLocaleString()}
                          </Text>
                        </Box>
                        {!err.resolved && (
                          <Button
                            size="xs"
                            variant="ghost"
                            colorScheme="green"
                            onClick={() => resolveError(err.id)}
                          >
                            Resolve
                          </Button>
                        )}
                      </Flex>
                    </Box>
                  ))
                )}
              </VStack>
            </TabPanel>

            {/* Feedback Tab */}
            <TabPanel p={0}>
              <VStack spacing={0} align="stretch">
                {feedback.length === 0 ? (
                  <Flex justify="center" py={20}>
                    <VStack spacing={2}>
                      <ChatBubbleLeftRightIcon className="w-8 h-8" />
                      <Text color={mutedColor} fontSize="sm">No feedback yet</Text>
                    </VStack>
                  </Flex>
                ) : (
                  feedback.map((fb) => (
                    <Box
                      key={fb.id}
                      py={3}
                      px={4}
                      borderBottom="1px solid"
                      borderColor={borderColor}
                      bg={fb.is_processed ? 'transparent' : cardBg}
                      opacity={fb.is_processed ? 0.6 : 1}
                    >
                      <Flex justify="space-between" align="start">
                        <Box flex={1}>
                          <HStack spacing={2} mb={1}>
                            <Badge
                              colorScheme={fb.feedback_type === 'positive' ? 'green' : fb.feedback_type === 'negative' ? 'red' : 'orange'}
                              fontSize="xs"
                            >
                              {fb.feedback_type}
                            </Badge>
                            {fb.user_specialty && <Text fontSize="xs" color={mutedColor}>{fb.user_specialty}</Text>}
                            {fb.rating && <Text fontSize="xs" color={mutedColor}>★ {fb.rating}/5</Text>}
                          </HStack>
                          <Text fontSize="sm" color={textColor} noOfLines={2}>{fb.query_text}</Text>
                          {fb.comment && (
                            <Text fontSize="xs" color={mutedColor} mt={1} fontStyle="italic">"{fb.comment}"</Text>
                          )}
                          <Text fontSize="xs" color={mutedColor} mt={1}>
                            {new Date(fb.created_at).toLocaleString()}
                          </Text>
                        </Box>
                        {!fb.is_processed && (
                          <Button
                            size="xs"
                            variant="ghost"
                            colorScheme="green"
                            onClick={() => processFeedback(fb.id)}
                          >
                            Process
                          </Button>
                        )}
                      </Flex>
                    </Box>
                  ))
                )}
              </VStack>
            </TabPanel>

            {/* Cache Tab */}
            <TabPanel p={0}>
              {metrics ? (
                <VStack spacing={6} align="stretch">
                  <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                    <Box p={4} bg={cardBg} borderRadius="lg" border="1px solid" borderColor={borderColor}>
                      <Text fontSize="xs" color={mutedColor} textTransform="uppercase" mb={2}>L1 In-Memory Cache</Text>
                      <Text fontSize="xl" fontWeight="600" color={textColor}>
                        {metrics.cache.l1_cache.size} / {metrics.cache.l1_cache.maxsize}
                      </Text>
                      <Progress
                        value={(metrics.cache.l1_cache.size / metrics.cache.l1_cache.maxsize) * 100}
                        size="sm"
                        colorScheme="green"
                        mt={2}
                        borderRadius="full"
                      />
                    </Box>
                    <Box p={4} bg={cardBg} borderRadius="lg" border="1px solid" borderColor={borderColor}>
                      <Text fontSize="xs" color={mutedColor} textTransform="uppercase" mb={2}>Session Stats</Text>
                      <HStack spacing={4}>
                        <VStack spacing={0} align="start">
                          <Text fontSize="xs" color={mutedColor}>L1 Hits</Text>
                          <Text fontSize="lg" fontWeight="600" color={successColor}>{metrics.cache.session.l1_hits}</Text>
                        </VStack>
                        <VStack spacing={0} align="start">
                          <Text fontSize="xs" color={mutedColor}>L2 Hits</Text>
                          <Text fontSize="lg" fontWeight="600" color={successColor}>{metrics.cache.session.l2_hits}</Text>
                        </VStack>
                        <VStack spacing={0} align="start">
                          <Text fontSize="xs" color={mutedColor}>Misses</Text>
                          <Text fontSize="lg" fontWeight="600" color={errorColor}>{metrics.cache.session.misses}</Text>
                        </VStack>
                      </HStack>
                    </Box>
                    <Box p={4} bg={cardBg} borderRadius="lg" border="1px solid" borderColor={borderColor}>
                      <Text fontSize="xs" color={mutedColor} textTransform="uppercase" mb={2}>Persistent Store</Text>
                      <Text fontSize="xl" fontWeight="600" color={textColor}>
                        {metrics.cache.persistent.cached_queries} queries
                      </Text>
                      <Text fontSize="xs" color={mutedColor}>
                        {metrics.cache.persistent.active_entries} active entries
                      </Text>
                    </Box>
                  </SimpleGrid>
                  <Box p={4} bg={cardBg} borderRadius="lg" border="1px solid" borderColor={borderColor}>
                    <Text fontSize="xs" color={mutedColor} textTransform="uppercase" mb={2}>Last Updated</Text>
                    <Text fontSize="sm" color={textColor}>{new Date(metrics.timestamp).toLocaleString()}</Text>
                  </Box>
                </VStack>
              ) : (
                <Flex justify="center" py={20}>
                  <Spinner size="sm" color={mutedColor} />
                </Flex>
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>

        <Modal isOpen={isOpen} onClose={onClose} size="lg">
          <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(4px)" />
          <ModalContent bg={cardBg} borderRadius="xl" mx={4}>
            <ModalHeader fontSize="md" fontWeight="500" color={textColor} pb={0}>
              {selectedRec ? 'Edit Prompt' : 'New Prompt'}
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody py={6}>
              <VStack spacing={5}>
                <Box w="full">
                  <Text fontSize="xs" color={mutedColor} mb={2} textTransform="uppercase" letterSpacing="0.05em">
                    Prompt
                  </Text>
                  <Textarea
                    value={formData.prompt}
                    onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                    placeholder="What clinical question should appear?"
                    fontSize="sm"
                    borderColor={borderColor}
                    _focus={{ borderColor: textColor, boxShadow: 'none' }}
                    rows={3}
                  />
                </Box>
                <HStack w="full" spacing={4}>
                  <Box flex={1}>
                    <Text fontSize="xs" color={mutedColor} mb={2} textTransform="uppercase" letterSpacing="0.05em">
                      Category
                    </Text>
                    <Select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                      fontSize="sm"
                      borderColor={borderColor}
                      _focus={{ borderColor: textColor, boxShadow: 'none' }}
                    >
                      <option value="realtime">Realtime</option>
                      <option value="seasonal">Seasonal</option>
                      <option value="admin">Admin</option>
                      <option value="evergreen">Evergreen</option>
                    </Select>
                  </Box>
                  <Box w="100px">
                    <Text fontSize="xs" color={mutedColor} mb={2} textTransform="uppercase" letterSpacing="0.05em">
                      Priority
                    </Text>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                      fontSize="sm"
                      borderColor={borderColor}
                      _focus={{ borderColor: textColor, boxShadow: 'none' }}
                    />
                  </Box>
                </HStack>
                <Box w="full">
                  <Text fontSize="xs" color={mutedColor} mb={2} textTransform="uppercase" letterSpacing="0.05em">
                    Context
                  </Text>
                  <Input
                    value={formData.context}
                    onChange={(e) => setFormData({ ...formData, context: e.target.value })}
                    placeholder="e.g., Flu season - Houston area"
                    fontSize="sm"
                    borderColor={borderColor}
                    _focus={{ borderColor: textColor, boxShadow: 'none' }}
                  />
                </Box>
                <Flex w="full" justify="space-between" align="center">
                  <HStack>
                    <Switch
                      isChecked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      colorScheme="green"
                      size="sm"
                    />
                    <Text fontSize="sm" color={mutedColor}>Active</Text>
                  </HStack>
                </Flex>
              </VStack>
            </ModalBody>
            <ModalFooter pt={0} pb={6}>
              <Button variant="ghost" size="sm" mr={2} onClick={onClose} color={mutedColor}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={saveRecommendation}
                bg={textColor}
                color={cardBg}
                _hover={{ opacity: 0.9 }}
              >
                {selectedRec ? 'Save' : 'Create'}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Container>
    </DashboardLayout>
  );
}

export default withFeatureGuard(ClinicalEvidencePage, 'clinical-evidence');
