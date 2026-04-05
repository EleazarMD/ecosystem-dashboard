/**
 * Clinical Feedback Panel
 * Review pilot tester feedback, curate training examples, and track fine-tuning data quality
 * Connects to the clinical_kb database feedback tables
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  Select,
  Spinner,
  Grid,
  GridItem,
  Progress,
  Tooltip,
  Icon,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  Textarea,
  FormControl,
  FormLabel,
  Input,
  useToast,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  IconButton,
  Collapse,
  Code,
} from '@chakra-ui/react';
import {
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MessageSquare,
  FileText,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Edit,
  Trash2,
  Plus,
  Filter,
  Star,
} from 'lucide-react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { SimpleGlassPanel } from '@/components/ui/SimpleGlassPanel';

const CLINICAL_FEEDBACK_API = '/api/clinical-feedback';

interface FeedbackStats {
  total_feedback: number;
  upvotes: number;
  downvotes: number;
  approval_rate: number;
  avg_component_ratings: {
    quick_answer: number;
    key_actions: number;
    drug_options: number;
    algorithm: number;
    safety: number;
    monitoring: number;
    sources: number;
  };
  would_use_clinically_rate: number;
  critical_issues_count: number;
}

interface FeedbackSession {
  session_id: string;
  query_text: string;
  query_type: string;
  response_text: string;
  sources_count: number;
  guideline_count: number;
  latency_ms: number;
  created_at: string;
  clinical_setting: string;
  setting_display: string;
  feedback_id: number | null;
  overall_vote: number | null;
  overall_helpful: boolean | null;
  would_use_clinically: boolean | null;
  quick_answer_rating: number | null;
  key_actions_rating: number | null;
  drug_options_rating: number | null;
  safety_rating: number | null;
  sources_rating: number | null;
  feedback_text: string | null;
  expected_answer: string | null;
  missing_information: string | null;
  incorrect_information: string | null;
  feedback_category: string | null;
  severity: string | null;
}

interface FinetuningExample {
  id: number;
  query: string;
  expected_output: string;
  clinical_setting: string;
  query_type: string;
  quality_score: number;
  status: string;
  created_at: string;
}

export default function ClinicalFeedbackPanel() {
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [sessions, setSessions] = useState<FeedbackSession[]>([]);
  const [examples, setExamples] = useState<FinetuningExample[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<FeedbackSession | null>(null);
  const [filter, setFilter] = useState({
    setting: 'all',
    vote: 'all',
    hasFeedback: 'all',
  });
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const borderSubtle = useSemanticToken('border.subtle');

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${CLINICAL_FEEDBACK_API}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter.setting !== 'all') params.set('setting', filter.setting);
      if (filter.vote === 'up') params.set('vote_type', 'up');
      if (filter.vote === 'down') params.set('vote_type', 'down');
      if (filter.hasFeedback !== 'all') params.set('has_feedback', filter.hasFeedback);

      const response = await fetch(`${CLINICAL_FEEDBACK_API}/sessions?${params}`);
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  }, [filter]);

  // Fetch fine-tuning examples
  const fetchExamples = useCallback(async () => {
    try {
      const response = await fetch(`${CLINICAL_FEEDBACK_API}/finetuning?setting=primary_care`);
      if (response.ok) {
        const data = await response.json();
        setExamples(data.examples || []);
      }
    } catch (error) {
      console.error('Failed to fetch examples:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchSessions(), fetchExamples()]);
      setLoading(false);
    };
    loadData();
  }, [fetchStats, fetchSessions, fetchExamples]);

  // Refresh on filter change
  useEffect(() => {
    fetchSessions();
  }, [filter, fetchSessions]);

  const toggleRowExpand = (sessionId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId);
    } else {
      newExpanded.add(sessionId);
    }
    setExpandedRows(newExpanded);
  };

  const handleCreateExample = async (session: FeedbackSession) => {
    setSelectedSession(session);
    onOpen();
  };

  const handleExportExamples = async () => {
    try {
      const response = await fetch(`${CLINICAL_FEEDBACK_API}/finetuning/export?setting=primary_care`);
      if (response.ok) {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `clinical-finetuning-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        toast({ title: 'Exported successfully', status: 'success' });
      }
    } catch (error) {
      toast({ title: 'Export failed', status: 'error' });
    }
  };

  if (loading) {
    return (
      <VStack h="300px" justify="center">
        <Spinner size="xl" color="purple.500" />
        <Text color={textSecondary}>Loading feedback data...</Text>
      </VStack>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      {/* Header */}
      <HStack justify="space-between">
        <Box>
          <Text fontSize="2xl" fontWeight="bold" color={textPrimary}>
            Clinical Feedback & Training Data
          </Text>
          <Text color={textSecondary}>
            Review pilot tester feedback and curate fine-tuning examples
          </Text>
        </Box>
        <HStack>
          <Button
            leftIcon={<RefreshCw size={16} />}
            variant="outline"
            size="sm"
            onClick={() => {
              fetchStats();
              fetchSessions();
              fetchExamples();
            }}
          >
            Refresh
          </Button>
          <Button
            leftIcon={<Download size={16} />}
            colorScheme="purple"
            size="sm"
            onClick={handleExportExamples}
          >
            Export Training Data
          </Button>
        </HStack>
      </HStack>

      {/* Stats Overview */}
      <Grid templateColumns="repeat(6, 1fr)" gap={4}>
        <GridItem>
          <SimpleGlassPanel p={4}>
            <Stat>
              <StatLabel>Total Feedback</StatLabel>
              <StatNumber>{stats?.total_feedback || 0}</StatNumber>
            </Stat>
          </SimpleGlassPanel>
        </GridItem>
        <GridItem>
          <SimpleGlassPanel p={4}>
            <Stat>
              <StatLabel>Approval Rate</StatLabel>
              <StatNumber color="green.400">
                {((stats?.approval_rate || 0) * 100).toFixed(0)}%
              </StatNumber>
              <StatHelpText>
                <HStack spacing={2}>
                  <HStack color="green.400">
                    <ThumbsUp size={12} />
                    <Text>{stats?.upvotes || 0}</Text>
                  </HStack>
                  <HStack color="red.400">
                    <ThumbsDown size={12} />
                    <Text>{stats?.downvotes || 0}</Text>
                  </HStack>
                </HStack>
              </StatHelpText>
            </Stat>
          </SimpleGlassPanel>
        </GridItem>
        <GridItem>
          <SimpleGlassPanel p={4}>
            <Stat>
              <StatLabel>Clinical Utility</StatLabel>
              <StatNumber color="blue.400">
                {((stats?.would_use_clinically_rate || 0) * 100).toFixed(0)}%
              </StatNumber>
              <StatHelpText>Would use clinically</StatHelpText>
            </Stat>
          </SimpleGlassPanel>
        </GridItem>
        <GridItem>
          <SimpleGlassPanel p={4}>
            <Stat>
              <StatLabel>Critical Issues</StatLabel>
              <StatNumber color={stats?.critical_issues_count ? 'red.400' : 'green.400'}>
                {stats?.critical_issues_count || 0}
              </StatNumber>
              <StatHelpText>Needs attention</StatHelpText>
            </Stat>
          </SimpleGlassPanel>
        </GridItem>
        <GridItem>
          <SimpleGlassPanel p={4}>
            <Stat>
              <StatLabel>Avg Safety Rating</StatLabel>
              <StatNumber>
                {(stats?.avg_component_ratings?.safety || 0).toFixed(1)}/5
              </StatNumber>
              <StatHelpText>
                <Progress
                  value={(stats?.avg_component_ratings?.safety || 0) * 20}
                  colorScheme="green"
                  size="sm"
                />
              </StatHelpText>
            </Stat>
          </SimpleGlassPanel>
        </GridItem>
        <GridItem>
          <SimpleGlassPanel p={4}>
            <Stat>
              <StatLabel>Training Examples</StatLabel>
              <StatNumber color="purple.400">{examples.length}</StatNumber>
              <StatHelpText>Curated for fine-tuning</StatHelpText>
            </Stat>
          </SimpleGlassPanel>
        </GridItem>
      </Grid>

      {/* Component Ratings */}
      <SimpleGlassPanel p={4}>
        <Text fontSize="lg" fontWeight="bold" mb={4}>Component Ratings</Text>
        <Grid templateColumns="repeat(7, 1fr)" gap={4}>
          {Object.entries(stats?.avg_component_ratings || {}).map(([key, value]) => (
            <Box key={key} textAlign="center">
              <Text fontSize="sm" color={textSecondary} mb={1}>
                {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Text>
              <Text fontSize="xl" fontWeight="bold">
                {(value || 0).toFixed(1)}
              </Text>
              <Progress
                value={(value || 0) * 20}
                colorScheme={value >= 4 ? 'green' : value >= 3 ? 'yellow' : 'red'}
                size="sm"
                mt={1}
              />
            </Box>
          ))}
        </Grid>
      </SimpleGlassPanel>

      {/* Tabs */}
      <Tabs colorScheme="purple">
        <TabList>
          <Tab>Feedback Review</Tab>
          <Tab>Training Examples</Tab>
          <Tab>Training Gaps</Tab>
          <Tab>Analysis & Triage</Tab>
        </TabList>

        <TabPanels>
          {/* Feedback Review Tab */}
          <TabPanel px={0}>
            <VStack spacing={4} align="stretch">
              {/* Filters */}
              <HStack spacing={4}>
                <Select
                  size="sm"
                  w="200px"
                  value={filter.setting}
                  onChange={(e) => setFilter({ ...filter, setting: e.target.value })}
                >
                  <option value="all">All Settings</option>
                  <option value="primary_care">Primary Care</option>
                  <option value="hospitalist">Hospitalist</option>
                  <option value="emergency">Emergency</option>
                  <option value="specialist">Specialist</option>
                </Select>
                <Select
                  size="sm"
                  w="150px"
                  value={filter.vote}
                  onChange={(e) => setFilter({ ...filter, vote: e.target.value })}
                >
                  <option value="all">All Votes</option>
                  <option value="up">👍 Upvotes</option>
                  <option value="down">👎 Downvotes</option>
                </Select>
                <Select
                  size="sm"
                  w="180px"
                  value={filter.hasFeedback}
                  onChange={(e) => setFilter({ ...filter, hasFeedback: e.target.value })}
                >
                  <option value="all">All Sessions</option>
                  <option value="true">With Feedback</option>
                  <option value="false">No Feedback</option>
                </Select>
              </HStack>

              {/* Sessions Table */}
              <SimpleGlassPanel p={4}>
                <Table size="sm">
                  <Thead>
                    <Tr>
                      <Th w="40px"></Th>
                      <Th>Query</Th>
                      <Th>Setting</Th>
                      <Th>Vote</Th>
                      <Th>Ratings</Th>
                      <Th>Issues</Th>
                      <Th>Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {sessions.map((session) => (
                      <React.Fragment key={session.session_id}>
                        <Tr
                          cursor="pointer"
                          _hover={{ bg: 'whiteAlpha.100' }}
                          onClick={() => toggleRowExpand(session.session_id)}
                        >
                          <Td>
                            <Icon
                              as={expandedRows.has(session.session_id) ? ChevronUp : ChevronDown}
                              boxSize={4}
                            />
                          </Td>
                          <Td maxW="300px" isTruncated>
                            {session.query_text}
                          </Td>
                          <Td>
                            <Badge colorScheme="purple" size="sm">
                              {session.clinical_setting || 'unknown'}
                            </Badge>
                          </Td>
                          <Td>
                            {session.overall_vote === 1 && (
                              <Icon as={ThumbsUp} color="green.400" boxSize={4} />
                            )}
                            {session.overall_vote === -1 && (
                              <Icon as={ThumbsDown} color="red.400" boxSize={4} />
                            )}
                            {session.overall_vote === null && (
                              <Text color={textSecondary}>-</Text>
                            )}
                          </Td>
                          <Td>
                            {session.safety_rating && (
                              <HStack spacing={1}>
                                <Text fontSize="xs">Safety:</Text>
                                <Badge
                                  colorScheme={
                                    session.safety_rating >= 4 ? 'green' :
                                    session.safety_rating >= 3 ? 'yellow' : 'red'
                                  }
                                >
                                  {session.safety_rating}/5
                                </Badge>
                              </HStack>
                            )}
                          </Td>
                          <Td>
                            {session.severity === 'critical' && (
                              <Badge colorScheme="red">Critical</Badge>
                            )}
                            {session.feedback_category === 'hallucination' && (
                              <Badge colorScheme="red">Hallucination</Badge>
                            )}
                          </Td>
                          <Td>
                            <HStack spacing={1}>
                              <Tooltip label="Create training example">
                                <IconButton
                                  aria-label="Create example"
                                  icon={<Plus size={14} />}
                                  size="xs"
                                  colorScheme="purple"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCreateExample(session);
                                  }}
                                />
                              </Tooltip>
                            </HStack>
                          </Td>
                        </Tr>
                        <Tr>
                          <Td colSpan={7} p={0}>
                            <Collapse in={expandedRows.has(session.session_id)}>
                              <Box p={4} bg="whiteAlpha.50">
                                <Grid templateColumns="1fr 1fr" gap={4}>
                                  <Box>
                                    <Text fontWeight="bold" mb={2} color={textPrimary}>Query</Text>
                                    <Text fontSize="sm" color={textPrimary} lineHeight="1.6">{session.query_text}</Text>
                                    
                                    {session.feedback_text && (
                                      <Box mt={4}>
                                        <Text fontWeight="bold" mb={2} color={textPrimary}>Feedback</Text>
                                        <Text fontSize="sm" color={textPrimary} lineHeight="1.6">{session.feedback_text}</Text>
                                      </Box>
                                    )}
                                    
                                    {session.expected_answer && (
                                      <Box mt={4}>
                                        <Text fontWeight="bold" mb={2} color={textPrimary}>Expected Answer</Text>
                                        <Text fontSize="sm" color={textPrimary} lineHeight="1.6">{session.expected_answer}</Text>
                                      </Box>
                                    )}
                                  </Box>
                                  <Box>
                                    <Text fontWeight="bold" mb={2} color={textPrimary}>Response Preview</Text>
                                    <Box
                                      bg="blackAlpha.300"
                                      borderRadius="md"
                                      p={3}
                                      maxH="200px"
                                      overflowY="auto"
                                    >
                                      <Text fontSize="sm" color={textPrimary} whiteSpace="pre-wrap" lineHeight="1.6">
                                        {session.response_text?.substring(0, 500) || 'No response'}...
                                      </Text>
                                    </Box>
                                    
                                    <HStack mt={4} spacing={4}>
                                      <Text fontSize="sm" color={textSecondary}>
                                        Sources: {session.sources_count}
                                      </Text>
                                      <Text fontSize="sm" color={textSecondary}>
                                        Guidelines: {session.guideline_count}
                                      </Text>
                                      <Text fontSize="sm" color={textSecondary}>
                                        Latency: {session.latency_ms}ms
                                      </Text>
                                    </HStack>
                                  </Box>
                                </Grid>
                              </Box>
                            </Collapse>
                          </Td>
                        </Tr>
                      </React.Fragment>
                    ))}
                  </Tbody>
                </Table>
                
                {sessions.length === 0 && (
                  <VStack py={8}>
                    <Icon as={MessageSquare} boxSize={12} color={textSecondary} />
                    <Text color={textSecondary}>No feedback sessions found</Text>
                  </VStack>
                )}
              </SimpleGlassPanel>
            </VStack>
          </TabPanel>

          {/* Training Examples Tab */}
          <TabPanel px={0}>
            <SimpleGlassPanel p={4}>
              <HStack justify="space-between" mb={4}>
                <Text fontSize="lg" fontWeight="bold">Curated Training Examples</Text>
                <Badge colorScheme="purple">{examples.length} examples</Badge>
              </HStack>
              
              <Table size="sm">
                <Thead>
                  <Tr>
                    <Th>Query</Th>
                    <Th>Setting</Th>
                    <Th>Type</Th>
                    <Th>Quality</Th>
                    <Th>Status</Th>
                    <Th>Created</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {examples.map((example) => (
                    <Tr key={example.id}>
                      <Td maxW="300px" isTruncated>{example.query}</Td>
                      <Td>
                        <Badge colorScheme="purple">{example.clinical_setting}</Badge>
                      </Td>
                      <Td>{example.query_type}</Td>
                      <Td>
                        <HStack>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Icon
                              key={star}
                              as={Star}
                              boxSize={3}
                              color={star <= (example.quality_score || 0) ? 'yellow.400' : 'gray.600'}
                              fill={star <= (example.quality_score || 0) ? 'yellow.400' : 'none'}
                            />
                          ))}
                        </HStack>
                      </Td>
                      <Td>
                        <Badge
                          colorScheme={
                            example.status === 'approved' ? 'green' :
                            example.status === 'rejected' ? 'red' : 'gray'
                          }
                        >
                          {example.status}
                        </Badge>
                      </Td>
                      <Td fontSize="xs">
                        {new Date(example.created_at).toLocaleDateString()}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
              
              {examples.length === 0 && (
                <VStack py={8}>
                  <Icon as={FileText} boxSize={12} color={textSecondary} />
                  <Text color={textSecondary}>No training examples yet</Text>
                  <Text fontSize="sm" color={textSecondary}>
                    Create examples from feedback sessions above
                  </Text>
                </VStack>
              )}
            </SimpleGlassPanel>
          </TabPanel>

          {/* Training Gaps Tab */}
          <TabPanel px={0}>
            <SimpleGlassPanel p={4}>
              <Text fontSize="lg" fontWeight="bold" mb={4}>Training Coverage Gaps</Text>
              <Text color={textSecondary} mb={4}>
                Primary care conditions with insufficient training examples
              </Text>
              
              <Table size="sm">
                <Thead>
                  <Tr>
                    <Th>Condition</Th>
                    <Th>Category</Th>
                    <Th>Priority</Th>
                    <Th>Examples</Th>
                    <Th>Feedback</Th>
                    <Th>Action</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {[
                    { condition: 'Type 2 Diabetes', category: 'chronic_disease', priority: 'high', examples: 2, feedback: 5 },
                    { condition: 'Hypertension', category: 'chronic_disease', priority: 'high', examples: 1, feedback: 3 },
                    { condition: 'Depression', category: 'mental_health', priority: 'high', examples: 0, feedback: 2 },
                    { condition: 'COPD', category: 'chronic_disease', priority: 'high', examples: 1, feedback: 1 },
                    { condition: 'Low back pain', category: 'acute', priority: 'high', examples: 0, feedback: 4 },
                  ].map((gap, idx) => (
                    <Tr key={idx}>
                      <Td fontWeight="medium">{gap.condition}</Td>
                      <Td>
                        <Badge>{gap.category}</Badge>
                      </Td>
                      <Td>
                        <Badge colorScheme={gap.priority === 'high' ? 'red' : 'yellow'}>
                          {gap.priority}
                        </Badge>
                      </Td>
                      <Td>
                        <Text color={gap.examples < 3 ? 'red.400' : 'green.400'}>
                          {gap.examples}
                        </Text>
                      </Td>
                      <Td>{gap.feedback}</Td>
                      <Td>
                        <Button size="xs" colorScheme="purple">
                          Add Examples
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </SimpleGlassPanel>
          </TabPanel>

          {/* Analysis & Triage Tab */}
          <TabPanel px={0}>
            <VStack spacing={6} align="stretch">
              {/* Issue Summary */}
              <SimpleGlassPanel p={4}>
                <HStack justify="space-between" mb={4}>
                  <Text fontSize="lg" fontWeight="bold">Weekly Issue Summary</Text>
                  <Badge colorScheme="purple">Last 7 days</Badge>
                </HStack>
                <Text fontSize="sm" color="gray.500" mb={4}>
                  Issues categorized by severity and recommended action
                </Text>
                <Table size="sm">
                  <Thead>
                    <Tr>
                      <Th>Component</Th>
                      <Th>Issue</Th>
                      <Th>Severity</Th>
                      <Th isNumeric>Count</Th>
                      <Th>Action</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    <Tr>
                      <Td colSpan={5} textAlign="center" py={8}>
                        <VStack>
                          <Icon as={AlertTriangle} boxSize={8} color="gray.400" />
                          <Text color="gray.500">No issues reported yet</Text>
                          <Text fontSize="sm" color="gray.400">
                            Issues will appear here as users provide feedback
                          </Text>
                        </VStack>
                      </Td>
                    </Tr>
                  </Tbody>
                </Table>
              </SimpleGlassPanel>

              {/* Decision Matrix */}
              <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                <GridItem>
                  <SimpleGlassPanel p={4} h="full">
                    <HStack mb={3}>
                      <Badge colorScheme="red" fontSize="sm">Fine-Tune Required</Badge>
                    </HStack>
                    <Text fontSize="sm" fontWeight="bold" mb={2}>Structural Issues</Text>
                    <VStack align="stretch" spacing={2} fontSize="sm">
                      <HStack justify="space-between">
                        <Text color="gray.600">Side effects in Quick Answer</Text>
                        <Badge>0</Badge>
                      </HStack>
                      <HStack justify="space-between">
                        <Text color="gray.600">Missing drug alternatives</Text>
                        <Badge>0</Badge>
                      </HStack>
                      <HStack justify="space-between">
                        <Text color="gray.600">Vague dosing</Text>
                        <Badge>0</Badge>
                      </HStack>
                      <HStack justify="space-between">
                        <Text color="gray.600">Hallucinations</Text>
                        <Badge colorScheme="red">0</Badge>
                      </HStack>
                    </VStack>
                  </SimpleGlassPanel>
                </GridItem>
                <GridItem>
                  <SimpleGlassPanel p={4} h="full">
                    <HStack mb={3}>
                      <Badge colorScheme="blue" fontSize="sm">Prompt Engineering</Badge>
                    </HStack>
                    <Text fontSize="sm" fontWeight="bold" mb={2}>Format Issues</Text>
                    <VStack align="stretch" spacing={2} fontSize="sm">
                      <HStack justify="space-between">
                        <Text color="gray.600">Too verbose</Text>
                        <Badge>0</Badge>
                      </HStack>
                      <HStack justify="space-between">
                        <Text color="gray.600">Wrong section order</Text>
                        <Badge>0</Badge>
                      </HStack>
                      <HStack justify="space-between">
                        <Text color="gray.600">Formatting issues</Text>
                        <Badge>0</Badge>
                      </HStack>
                      <HStack justify="space-between">
                        <Text color="gray.600">Unnecessary steps</Text>
                        <Badge>0</Badge>
                      </HStack>
                    </VStack>
                  </SimpleGlassPanel>
                </GridItem>
              </Grid>

              {/* Improvement Candidates */}
              <SimpleGlassPanel p={4}>
                <HStack justify="space-between" mb={4}>
                  <Text fontSize="lg" fontWeight="bold">Improvement Candidates</Text>
                  <HStack>
                    <Badge colorScheme="red">0 Priority</Badge>
                    <Badge colorScheme="yellow">0 Candidates</Badge>
                    <Badge colorScheme="blue">0 Prompt Fixes</Badge>
                  </HStack>
                </HStack>
                <Text fontSize="sm" color="gray.500" mb={4}>
                  Sessions where users provided expected answers or corrections
                </Text>
                <VStack py={8}>
                  <Icon as={CheckCircle} boxSize={12} color="green.400" />
                  <Text color="gray.500">No improvement candidates yet</Text>
                  <Text fontSize="sm" color="gray.400">
                    When users provide expected answers, they will appear here for curation
                  </Text>
                </VStack>
              </SimpleGlassPanel>

              {/* Action Buttons */}
              <HStack justify="flex-end" spacing={3}>
                <Button
                  leftIcon={<Download size={16} />}
                  variant="outline"
                  size="sm"
                >
                  Export Analysis Report
                </Button>
                <Button
                  leftIcon={<RefreshCw size={16} />}
                  colorScheme="purple"
                  size="sm"
                >
                  Run Weekly Analysis
                </Button>
              </HStack>
            </VStack>
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Create Example Modal */}
      <CreateExampleModal
        isOpen={isOpen}
        onClose={onClose}
        session={selectedSession}
        onCreated={() => {
          fetchExamples();
          onClose();
        }}
      />
    </VStack>
  );
}

// Create Example Modal Component
function CreateExampleModal({
  isOpen,
  onClose,
  session,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  session: FeedbackSession | null;
  onCreated: () => void;
}) {
  const [expectedOutput, setExpectedOutput] = useState('');
  const [qualityScore, setQualityScore] = useState(4);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (session?.expected_answer) {
      setExpectedOutput(session.expected_answer);
    } else if (session?.response_text) {
      setExpectedOutput(session.response_text);
    }
  }, [session]);

  const handleSubmit = async () => {
    if (!session || !expectedOutput) return;

    setLoading(true);
    try {
      const response = await fetch('/api/clinical-feedback/finetuning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_feedback_id: session.feedback_id,
          curator_user_id: 'dashboard_admin',
          query: session.query_text,
          query_type: session.query_type,
          clinical_setting: session.clinical_setting || 'primary_care',
          expected_output: expectedOutput,
          quality_score: qualityScore,
        }),
      });

      if (response.ok) {
        toast({ title: 'Training example created', status: 'success' });
        onCreated();
      } else {
        throw new Error('Failed to create example');
      }
    } catch (error) {
      toast({ title: 'Failed to create example', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Create Training Example</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <FormControl>
              <FormLabel>Query</FormLabel>
              <Textarea value={session?.query_text || ''} isReadOnly rows={2} />
            </FormControl>

            <FormControl>
              <FormLabel>Expected Output (Edit as needed)</FormLabel>
              <Textarea
                value={expectedOutput}
                onChange={(e) => setExpectedOutput(e.target.value)}
                rows={10}
                placeholder="Enter the ideal response for this query..."
              />
            </FormControl>

            <FormControl>
              <FormLabel>Quality Score</FormLabel>
              <HStack>
                {[1, 2, 3, 4, 5].map((score) => (
                  <IconButton
                    key={score}
                    aria-label={`Score ${score}`}
                    icon={<Star size={20} fill={score <= qualityScore ? 'gold' : 'none'} />}
                    variant="ghost"
                    color={score <= qualityScore ? 'yellow.400' : 'gray.400'}
                    onClick={() => setQualityScore(score)}
                  />
                ))}
              </HStack>
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button
            colorScheme="purple"
            onClick={handleSubmit}
            isLoading={loading}
            isDisabled={!expectedOutput}
          >
            Create Example
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
