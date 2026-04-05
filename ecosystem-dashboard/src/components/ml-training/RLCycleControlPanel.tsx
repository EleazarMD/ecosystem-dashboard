import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Button,
  VStack,
  HStack,
  Text,
  Badge,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Grid,
  GridItem,
  SimpleGrid,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  FormControl,
  FormLabel,
  Select,
  Switch,
  NumberInput,
  NumberInputField,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Divider,
  IconButton,
  Tooltip,
  Textarea,
  Progress,
} from '@chakra-ui/react';
import { 
  FiPlay, 
  FiSquare, 
  FiRefreshCw, 
  FiClock,
  FiActivity,
  FiCheckCircle,
  FiAlertCircle,
} from 'react-icons/fi';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface RLPhase {
  phase_id: string;
  score: number;
  improvement: number;
  before_version: number;
  after_version: number;
  promotion_blocked: boolean;
  promotion_gate?: {
    passed: boolean;
    actual?: {
      explicit_contract_coverage?: number;
      field_completeness?: number;
    };
  };
}

interface RLSummary {
  total_phases: number;
  avg_score: number;
  best_score: number;
  worst_score: number;
  latest_version: number;
  latest_score: number;
  latest_action: string;
  promoted_phases?: number;
}

interface RLCycleStatus {
  status: 'idle' | 'running' | 'stopped' | 'error';
  pid?: number;
  mode?: string;
  started_at?: string;
  cycles_completed?: number;
  current_score?: number;
  stopped_at?: string;
  stopped_by?: string;
  message?: string;
  error?: string;
}

interface RLCycleHistory {
  cycle_id: string;
  started_at: string;
  mode: string;
  initial_score: number;
  final_score: number;
  improvement: number;
  status: string;
}

export default function RLCycleControlPanel() {
  const [status, setStatus] = useState<RLCycleStatus>({ status: 'idle' });
  const [history, setHistory] = useState<RLCycleHistory[]>([]);
  const [phases, setPhases] = useState<RLPhase[]>([]);
  const [summary, setSummary] = useState<RLSummary | null>(null);
  const [promotionGate, setPromotionGate] = useState<any>(null);
  const [promoteReason, setPromoteReason] = useState('');
  const [showPromoteForm, setShowPromoteForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // Start cycle modal
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [startParams, setStartParams] = useState({
    mode: 'development',
    continuous: false,
    target: 8.5,
    maxCycles: 10,
  });
  
  const toast = useToast();

  // Fetch status
  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/clinical-kb/rl-control?action=status');
      const data = await res.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to fetch RL status:', error);
    }
  };

  // Fetch history
  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/clinical-kb/rl-control?action=history');
      const data = await res.json();
      setHistory(data.history || []);
    } catch (error) {
      console.error('Failed to fetch RL history:', error);
    }
  };

  // Fetch phases, summary, and promotion gate for charts
  const fetchChartData = async () => {
    try {
      const [phasesRes, summaryRes, gateRes] = await Promise.all([
        fetch('/api/clinical-kb/rl-monitoring?endpoint=phases'),
        fetch('/api/clinical-kb/rl-monitoring?endpoint=summary'),
        fetch('/api/clinical-kb/rl-monitoring?endpoint=promotion-gate'),
      ]);
      if (phasesRes.ok) {
        const pd = await phasesRes.json();
        setPhases(pd.phases || []);
      }
      if (summaryRes.ok) {
        const sd = await summaryRes.json();
        if (!sd.error) setSummary(sd);
      }
      if (gateRes.ok) {
        const gd = await gateRes.json();
        setPromotionGate(gd);
      }
    } catch (error) {
      console.error('Failed to fetch chart data:', error);
    }
  };

  // Approve or reject promotion
  const handlePromotionAction = async (action: 'approve' | 'reject') => {
    setLoading(true);
    try {
      const res = await fetch('/api/clinical-kb/rl-monitoring?endpoint=promotion-gate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason: promoteReason }),
      });
      if (res.ok) {
        toast({
          title: action === 'approve' ? 'Promoted to Production' : 'Changes Rejected',
          status: action === 'approve' ? 'success' : 'info',
          duration: 5000,
        });
        setShowPromoteForm(false);
        setPromoteReason('');
        fetchChartData();
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, status: 'error', duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  // Compute chart data from phases
  const chartData = useMemo(() => {
    return phases.map((p, i) => {
      const coverage = p.promotion_gate?.actual?.explicit_contract_coverage ?? 0;
      const completeness = p.promotion_gate?.actual?.field_completeness ?? 0;
      return {
        cycle: i + 1,
        name: `C${i + 1}`,
        score: parseFloat(p.score.toFixed(3)),
        improvement: parseFloat(p.improvement.toFixed(3)),
        // Loss = inverse of score (lower is better)
        loss: parseFloat((10 - p.score).toFixed(3)),
        // Entropy proxy = variance in coverage vs completeness
        entropy: parseFloat(Math.abs(coverage - completeness).toFixed(4)),
        // Reward = score delta (positive = good)
        reward: parseFloat(p.improvement.toFixed(3)),
        coverage: parseFloat((coverage * 100).toFixed(1)),
        completeness: parseFloat((completeness * 100).toFixed(1)),
        promoted: !p.promotion_blocked,
      };
    });
  }, [phases]);

  // Start cycle
  const handleStart = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/clinical-kb/rl-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          params: startParams,
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast({
          title: 'RL Cycle Started',
          description: `Started in ${startParams.mode} mode (PID: ${data.pid})`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        onClose();
        fetchStatus();
      } else {
        toast({
          title: 'Failed to Start',
          description: data.error || 'Unknown error',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // Stop cycle
  const handleStop = async (force = false) => {
    setLoading(true);
    try {
      const res = await fetch('/api/clinical-kb/rl-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'stop',
          params: { force },
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast({
          title: 'RL Cycle Stopped',
          description: force ? 'Force stopped' : 'Gracefully stopped',
          status: 'info',
          duration: 3000,
          isClosable: true,
        });
        fetchStatus();
      } else {
        toast({
          title: 'Failed to Stop',
          description: data.error || 'Unknown error',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh
  useEffect(() => {
    fetchStatus();
    fetchHistory();
    fetchChartData();
    
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchStatus();
        fetchHistory();
        fetchChartData();
      }, 10000); // Refresh every 10 seconds
      
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'green';
      case 'stopped': return 'orange';
      case 'error': return 'red';
      default: return 'gray';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <FiActivity />;
      case 'stopped': return <FiSquare />;
      case 'error': return <FiAlertCircle />;
      default: return <FiClock />;
    }
  };

  return (
    <Box>
      {/* Header */}
      <HStack justify="space-between" mb={6}>
        <Text fontSize="2xl" fontWeight="bold">
          RL Cycle Control
        </Text>
        <HStack>
          <FormControl display="flex" alignItems="center">
            <FormLabel htmlFor="auto-refresh" mb="0" fontSize="sm">
              Auto-refresh
            </FormLabel>
            <Switch 
              id="auto-refresh" 
              isChecked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
          </FormControl>
          <Tooltip label="Refresh now">
            <IconButton
              aria-label="Refresh"
              icon={<FiRefreshCw />}
              size="sm"
              onClick={() => {
                fetchStatus();
                fetchHistory();
              }}
            />
          </Tooltip>
        </HStack>
      </HStack>

      {/* Current Status */}
      <Box bg="gray.50" p={6} borderRadius="lg" mb={6}>
        <HStack justify="space-between" mb={4}>
          <HStack>
            <Badge 
              colorScheme={getStatusColor(status.status)} 
              fontSize="lg"
              px={3}
              py={1}
              borderRadius="md"
            >
              {getStatusIcon(status.status)}
              <Text as="span" ml={2}>
                {status.status.toUpperCase()}
              </Text>
            </Badge>
            {status.mode && (
              <Badge colorScheme="blue" fontSize="md">
                {status.mode}
              </Badge>
            )}
          </HStack>
          
          <HStack>
            {status.status === 'running' ? (
              <>
                <Button
                  leftIcon={<FiSquare />}
                  colorScheme="orange"
                  size="sm"
                  onClick={() => handleStop(false)}
                  isLoading={loading}
                >
                  Stop
                </Button>
                <Button
                  colorScheme="red"
                  size="sm"
                  variant="outline"
                  onClick={() => handleStop(true)}
                  isLoading={loading}
                >
                  Force Stop
                </Button>
              </>
            ) : (
              <Button
                leftIcon={<FiPlay />}
                colorScheme="green"
                onClick={onOpen}
                isLoading={loading}
              >
                Start Cycle
              </Button>
            )}
          </HStack>
        </HStack>

        {status.status === 'running' && (
          <VStack align="stretch" spacing={3}>
            <HStack spacing={6}>
              <Stat>
                <StatLabel>PID</StatLabel>
                <StatNumber fontSize="lg">{status.pid}</StatNumber>
              </Stat>
              <Stat>
                <StatLabel>Cycles Completed</StatLabel>
                <StatNumber fontSize="lg">{status.cycles_completed || 0}</StatNumber>
              </Stat>
              <Stat>
                <StatLabel>Current Score</StatLabel>
                <StatNumber fontSize="lg">
                  {status.current_score?.toFixed(2) || 'N/A'}
                </StatNumber>
              </Stat>
              <Stat>
                <StatLabel>Started</StatLabel>
                <StatNumber fontSize="sm">
                  {status.started_at ? new Date(status.started_at).toLocaleString() : 'N/A'}
                </StatNumber>
              </Stat>
            </HStack>
          </VStack>
        )}

        {status.status === 'idle' && (
          <Alert status="info" borderRadius="md">
            <AlertIcon />
            <AlertDescription>
              No RL cycles currently running. Click "Start Cycle" to begin.
            </AlertDescription>
          </Alert>
        )}

        {status.status === 'error' && status.error && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{status.error}</AlertDescription>
          </Alert>
        )}
      </Box>

      {/* Summary Stats Badges */}
      {summary && (
        <SimpleGrid columns={{ base: 3, md: 6 }} spacing={4} mb={6}>
          <Box bg="green.50" p={4} borderRadius="lg" textAlign="center">
            <Text fontSize="2xl" fontWeight="bold" color="green.600">
              {summary.total_phases}
            </Text>
            <Text fontSize="xs" color="gray.600">Total Cycles</Text>
          </Box>
          <Box bg="blue.50" p={4} borderRadius="lg" textAlign="center">
            <Text fontSize="2xl" fontWeight="bold" color="blue.600">
              {summary.avg_score > 0 ? (summary.latest_score - summary.avg_score > 0 ? '+' : '') : ''}
              {(summary.latest_score - summary.avg_score).toFixed(3)}
            </Text>
            <Text fontSize="xs" color="gray.600">Avg Δ</Text>
          </Box>
          <Box bg="purple.50" p={4} borderRadius="lg" textAlign="center">
            <Text fontSize="2xl" fontWeight="bold" color="purple.600">
              {summary.best_score.toFixed(2)}
            </Text>
            <Text fontSize="xs" color="gray.600">Best Score</Text>
          </Box>
          <Box bg="green.50" p={4} borderRadius="lg" textAlign="center">
            <Text fontSize="2xl" fontWeight="bold" color="green.600">
              {summary.total_phases > 0
                ? ((summary.promoted_phases || 0) / summary.total_phases * 100).toFixed(0)
                : 0}%
            </Text>
            <Text fontSize="xs" color="gray.600">Success %</Text>
          </Box>
          <Box bg="orange.50" p={4} borderRadius="lg" textAlign="center">
            <Text fontSize="2xl" fontWeight="bold" color="orange.600">
              128,412
            </Text>
            <Text fontSize="xs" color="gray.600">Parameters</Text>
          </Box>
          <Box bg="teal.50" p={4} borderRadius="lg" textAlign="center">
            <Text fontSize="2xl" fontWeight="bold" color="teal.600">
              127D
            </Text>
            <Text fontSize="xs" color="gray.600">State Space</Text>
          </Box>
        </SimpleGrid>
      )}

      {/* Charts Grid */}
      {chartData.length > 0 && (
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} mb={6}>
          {/* Score Improvement Chart */}
          <Box bg="white" p={4} borderRadius="lg" border="1px" borderColor="gray.200">
            <Text fontSize="sm" fontWeight="bold" mb={2}>Score Improvement</Text>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="name" fontSize={10} />
                <YAxis domain={['auto', 'auto']} fontSize={10} />
                <RechartsTooltip />
                <ReferenceLine y={7.0} stroke="#38A169" strokeDasharray="3 3" label="Target" />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#3182CE"
                  fill="#3182CE"
                  fillOpacity={0.15}
                  strokeWidth={2}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Box>

          {/* Loss Over Time Chart */}
          <Box bg="white" p={4} borderRadius="lg" border="1px" borderColor="gray.200">
            <Text fontSize="sm" fontWeight="bold" mb={2}>Loss Over Time</Text>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="name" fontSize={10} />
                <YAxis domain={['auto', 'auto']} fontSize={10} />
                <RechartsTooltip />
                <Line
                  type="monotone"
                  dataKey="loss"
                  stroke="#E53E3E"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>

          {/* Entropy Over Time Chart */}
          <Box bg="white" p={4} borderRadius="lg" border="1px" borderColor="gray.200">
            <Text fontSize="sm" fontWeight="bold" mb={2}>Entropy Over Time</Text>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="name" fontSize={10} />
                <YAxis domain={['auto', 'auto']} fontSize={10} />
                <RechartsTooltip />
                <Area
                  type="monotone"
                  dataKey="entropy"
                  stroke="#805AD5"
                  fill="#805AD5"
                  fillOpacity={0.15}
                  strokeWidth={2}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Box>

          {/* Reward Over Time Chart */}
          <Box bg="white" p={4} borderRadius="lg" border="1px" borderColor="gray.200">
            <Text fontSize="sm" fontWeight="bold" mb={2}>Reward Over Time</Text>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="name" fontSize={10} />
                <YAxis domain={['auto', 'auto']} fontSize={10} />
                <RechartsTooltip />
                <ReferenceLine y={0} stroke="#666" strokeDasharray="2 2" />
                <Area
                  type="monotone"
                  dataKey="reward"
                  stroke="#DD6B20"
                  fill="#DD6B20"
                  fillOpacity={0.15}
                  strokeWidth={2}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        </SimpleGrid>
      )}

      {/* Policy Architecture */}
      {summary && (
        <Box bg="gray.50" p={4} borderRadius="lg" mb={6}>
          <Text fontSize="sm" fontWeight="bold" mb={3}>Policy Architecture</Text>
          <SimpleGrid columns={{ base: 3, md: 6 }} spacing={4} textAlign="center">
            <Box>
              <Text fontSize="xs" color="gray.500">Algorithm</Text>
              <Text fontWeight="bold" color="purple.600">PPO</Text>
            </Box>
            <Box>
              <Text fontSize="xs" color="gray.500">State Dim</Text>
              <Text fontWeight="bold">127</Text>
            </Box>
            <Box>
              <Text fontSize="xs" color="gray.500">Actions</Text>
              <Text fontWeight="bold">2,058</Text>
            </Box>
            <Box>
              <Text fontSize="xs" color="gray.500">Parameters</Text>
              <Text fontWeight="bold">128,412</Text>
            </Box>
            <Box>
              <Text fontSize="xs" color="gray.500">Learning Rate</Text>
              <Text fontWeight="bold">0.0001</Text>
            </Box>
            <Box>
              <Text fontSize="xs" color="gray.500">Clip Range</Text>
              <Text fontWeight="bold">0.2</Text>
            </Box>
          </SimpleGrid>
        </Box>
      )}

      {/* Staging → Production Promotion Gate */}
      {promotionGate && (
        <Box
          border="2px"
          borderColor={promotionGate.ready ? 'green.300' : 'orange.300'}
          borderRadius="lg"
          p={5}
          mb={6}
          bg={promotionGate.ready ? 'green.50' : 'orange.50'}
        >
          <HStack justify="space-between" mb={4}>
            <VStack align="start" spacing={0}>
              <Text fontSize="lg" fontWeight="bold">
                Staging → Production
              </Text>
              <Text fontSize="sm" color="gray.600">
                {promotionGate.reason}
              </Text>
            </VStack>
            <Badge
              colorScheme={promotionGate.ready ? 'green' : 'orange'}
              fontSize="md"
              px={3}
              py={1}
            >
              {promotionGate.ready ? 'READY' : 'NOT READY'}
            </Badge>
          </HStack>

          {/* Staging vs Production Comparison */}
          <SimpleGrid columns={2} spacing={4} mb={4}>
            <Box bg="white" p={3} borderRadius="md" border="1px" borderColor="gray.200">
              <Text fontSize="xs" color="gray.500" mb={1}>STAGING (Development)</Text>
              <Text fontSize="xl" fontWeight="bold">
                v{promotionGate.staging?.version || 0}
              </Text>
              <HStack spacing={4} mt={1}>
                <Text fontSize="sm">
                  Score: <b>{(promotionGate.staging?.score || 0).toFixed(2)}</b>
                </Text>
                <Text fontSize="sm">
                  Avg: <b>{(promotionGate.staging?.avg_score || 0).toFixed(2)}</b>
                </Text>
                <Text fontSize="sm">
                  Best: <b>{(promotionGate.staging?.best_score || 0).toFixed(2)}</b>
                </Text>
              </HStack>
            </Box>
            <Box bg="white" p={3} borderRadius="md" border="1px" borderColor="gray.200">
              <Text fontSize="xs" color="gray.500" mb={1}>PRODUCTION</Text>
              <Text fontSize="xl" fontWeight="bold">
                v{promotionGate.production?.version || 0}
              </Text>
              <Text fontSize="sm" mt={1}>
                Score: <b>{(promotionGate.production?.score || 0).toFixed(2)}</b>
              </Text>
            </Box>
          </SimpleGrid>

          {/* Criteria Checklist */}
          <Box mb={4}>
            <Text fontSize="sm" fontWeight="bold" mb={2}>Promotion Criteria</Text>
            <VStack align="stretch" spacing={2}>
              {(promotionGate.criteria || []).map((c: any, i: number) => (
                <HStack key={i} spacing={3}>
                  <Badge
                    colorScheme={c.passed ? 'green' : 'red'}
                    fontSize="xs"
                    w="50px"
                    textAlign="center"
                  >
                    {c.passed ? 'PASS' : 'FAIL'}
                  </Badge>
                  <Text fontSize="sm" flex={1}>{c.description}</Text>
                  <Text fontSize="xs" color="gray.500" fontFamily="mono">
                    {typeof c.actual === 'number' && c.actual < 1 && c.name === 'Success Rate'
                      ? `${(c.actual * 100).toFixed(0)}%`
                      : typeof c.actual === 'number'
                      ? c.actual.toFixed(2)
                      : c.actual}
                  </Text>
                </HStack>
              ))}
            </VStack>
          </Box>

          {/* Approve / Reject Actions */}
          {!showPromoteForm ? (
            <HStack spacing={3}>
              <Button
                colorScheme="green"
                size="sm"
                isDisabled={!promotionGate.ready || loading}
                onClick={() => setShowPromoteForm(true)}
              >
                Approve & Promote
              </Button>
              <Button
                colorScheme="red"
                size="sm"
                variant="outline"
                isDisabled={loading}
                onClick={() => handlePromotionAction('reject')}
              >
                Reject
              </Button>
            </HStack>
          ) : (
            <Box bg="white" p={3} borderRadius="md">
              <Text fontSize="sm" fontWeight="bold" mb={2}>Promotion Reason</Text>
              <Textarea
                size="sm"
                placeholder="Describe why you are promoting..."
                value={promoteReason}
                onChange={(e) => setPromoteReason(e.target.value)}
                mb={2}
              />
              <HStack>
                <Button
                  colorScheme="green"
                  size="sm"
                  onClick={() => handlePromotionAction('approve')}
                  isLoading={loading}
                >
                  Confirm Promote
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowPromoteForm(false)}
                >
                  Cancel
                </Button>
              </HStack>
            </Box>
          )}

          {/* Promotion History */}
          {promotionGate.history && promotionGate.history.length > 0 && (
            <Box mt={4}>
              <Text fontSize="xs" fontWeight="bold" mb={1} color="gray.600">Recent Promotion Actions</Text>
              <VStack align="stretch" spacing={1}>
                {promotionGate.history.slice(0, 5).map((h: any, i: number) => (
                  <HStack key={i} fontSize="xs" spacing={2}>
                    <Badge
                      colorScheme={h.action === 'approve' ? 'green' : 'red'}
                      fontSize="xs"
                    >
                      {h.action}
                    </Badge>
                    <Text color="gray.500">v{h.staging_version}</Text>
                    <Text color="gray.500">score {(h.staging_score || 0).toFixed(2)}</Text>
                    {h.reason && <Text color="gray.600">{h.reason}</Text>}
                    <Text color="gray.400" ml="auto">
                      {new Date(h.timestamp).toLocaleString()}
                    </Text>
                  </HStack>
                ))}
              </VStack>
            </Box>
          )}
        </Box>
      )}

      {/* Recent Cycles with Action Telemetry */}
      <Box>
        <HStack justify="space-between" mb={4}>
          <Text fontSize="xl" fontWeight="bold">
            Recent Cycles
          </Text>
          <Text fontSize="xs" color="gray.500">{phases.length} TOTAL</Text>
        </HStack>
        
        {phases.length === 0 ? (
          <Alert status="info">
            <AlertIcon />
            <AlertDescription>No cycle history available</AlertDescription>
          </Alert>
        ) : (
          <Box overflowX="auto">
          <Table variant="simple" size="sm">
            <Thead>
              <Tr>
                <Th>Cycle</Th>
                <Th>Action</Th>
                <Th>Domain</Th>
                <Th isNumeric>Score</Th>
                <Th isNumeric>Δ</Th>
                <Th>Gate</Th>
              </Tr>
            </Thead>
            <Tbody>
              {phases.slice(-15).reverse().map((phase: any, idx: number) => (
                <Tr key={idx} opacity={phase.promotion_blocked ? 0.7 : 1}>
                  <Td fontFamily="mono" fontSize="xs" whiteSpace="nowrap">
                    {phase.phase_id}
                  </Td>
                  <Td fontSize="xs" maxW="200px">
                    <VStack align="start" spacing={0}>
                      <HStack spacing={1}>
                        {phase.action_category && (
                          <Badge
                            fontSize="2xs"
                            colorScheme={
                              phase.action_category === 'content' ? 'blue' :
                              phase.action_category === 'layout' ? 'purple' :
                              phase.action_category === 'card_priority' ? 'orange' :
                              phase.action_category === 'graph' ? 'teal' : 'gray'
                            }
                          >
                            {phase.action_category}
                          </Badge>
                        )}
                        {phase.action_success === false && (
                          <Badge fontSize="2xs" colorScheme="red">FAIL</Badge>
                        )}
                      </HStack>
                      <Text fontSize="xs" fontFamily="mono" noOfLines={1}>
                        {phase.action !== 'RL_TRAINING_CYCLE' ? phase.action.replace(/^(ADD_|BOOST_|CONSOLIDATE_|REORDER_|HIGHLIGHT_|PRIORITIZE_|REDUCE_)/, '') : '—'}
                      </Text>
                    </VStack>
                  </Td>
                  <Td fontSize="xs">
                    {phase.domain ? (
                      <Badge fontSize="2xs" variant="outline" colorScheme="gray">
                        {phase.domain}
                      </Badge>
                    ) : '—'}
                  </Td>
                  <Td isNumeric fontSize="xs" fontWeight="bold">
                    {phase.score.toFixed(2)}
                  </Td>
                  <Td isNumeric fontSize="xs">
                    <Text color={phase.improvement > 0 ? 'green.500' : phase.improvement < 0 ? 'red.500' : 'gray.400'}>
                      {phase.improvement > 0 ? '▲+' : phase.improvement < 0 ? '▼' : ''}{phase.improvement.toFixed(2)}
                    </Text>
                  </Td>
                  <Td>
                    <Badge
                      fontSize="2xs"
                      colorScheme={!phase.promotion_blocked ? 'green' : 'red'}
                    >
                      {!phase.promotion_blocked ? 'PASS' : 'FAIL'}
                    </Badge>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
          </Box>
        )}
      </Box>

      {/* Start Cycle Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Start RL Cycle</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel>Deployment Mode</FormLabel>
                <Select
                  value={startParams.mode}
                  onChange={(e) => setStartParams({ ...startParams, mode: e.target.value })}
                >
                  <option value="development">Development (Fast, Safe)</option>
                  <option value="production">Production (Full Rebuild)</option>
                </Select>
              </FormControl>

              <FormControl display="flex" alignItems="center">
                <FormLabel mb="0">Continuous Mode</FormLabel>
                <Switch
                  isChecked={startParams.continuous}
                  onChange={(e) => setStartParams({ ...startParams, continuous: e.target.checked })}
                />
              </FormControl>

              {startParams.continuous && (
                <>
                  <FormControl>
                    <FormLabel>Target Score</FormLabel>
                    <NumberInput
                      value={startParams.target}
                      onChange={(_, val) => setStartParams({ ...startParams, target: val })}
                      min={0}
                      max={10}
                      step={0.1}
                    >
                      <NumberInputField />
                    </NumberInput>
                  </FormControl>

                  <FormControl>
                    <FormLabel>Max Cycles</FormLabel>
                    <NumberInput
                      value={startParams.maxCycles}
                      onChange={(_, val) => setStartParams({ ...startParams, maxCycles: val })}
                      min={1}
                      max={100}
                    >
                      <NumberInputField />
                    </NumberInput>
                  </FormControl>
                </>
              )}

              <Alert status="info" fontSize="sm">
                <AlertIcon />
                <Box>
                  <AlertTitle>Mode: {startParams.mode}</AlertTitle>
                  <AlertDescription>
                    {startParams.mode === 'development' 
                      ? 'Changes auto-reload via dev server. Fast iteration, no container rebuild.'
                      : 'Full container rebuild with health checks and rollback. Production deployment.'}
                  </AlertDescription>
                </Box>
              </Alert>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button 
              colorScheme="green" 
              onClick={handleStart}
              isLoading={loading}
            >
              Start Cycle
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
