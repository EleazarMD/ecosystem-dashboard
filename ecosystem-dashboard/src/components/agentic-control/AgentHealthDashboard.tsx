/**
 * Agent Health Dashboard
 * 
 * Proactive health monitoring and automated remediation dashboard
 * with health scores, trend analysis, and automated recovery workflows
 */

import React, { useState, useEffect } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  VStack,
  HStack,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  Badge,
  Progress,
  SimpleGrid,
  IconButton,
  Tooltip,
  useToast,
  Alert,
  AlertIcon,
  Switch,
  FormControl,
  FormLabel,
  Divider,
  Flex,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Button,
  ButtonGroup,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Code,
  useDisclosure,
  Collapse,
  CircularProgress,
  CircularProgressLabel,
  Textarea,
  Select,
  Input
} from '@chakra-ui/react';
import {
  FaHeartbeat,
  FaExclamationTriangle,
  FaCheckCircle,
  FaRobot,
  FaPlay,
  FaPause,
  FaCogs,
  FaShieldAlt,
  FaHistory,
  FaEye,
  FaChevronDown,
  FaSync,
  FaBolt,
  FaTools,
  FaClipboardCheck,
  FaArrowUp,
  FaArrowDown,
  FaMinus
} from 'react-icons/fa';

interface Agent {
  id: string;
  name: string;
  description: string;
  version: string;
  type: string;
  status: 'active' | 'inactive' | 'error' | 'configuring' | 'deploying' | 'stopping';
  platform: string;
  lastHeartbeat: string;
  capabilities: Record<string, boolean>;
  health: {
    overall: number;
    components: {
      connectivity: number;
      performance: number;
      resources: number;
      dependencies: number;
      security: number;
    };
    trend: 'improving' | 'stable' | 'degrading';
    lastCheck: string;
  };
  remediation: {
    enabled: boolean;
    mode: 'monitoring' | 'advisory' | 'automatic';
    lastAction: string;
    successRate: number;
    actionsToday: number;
  };
  incidents: HealthIncident[];
  dependencies: AgentDependency[];
}

interface HealthIncident {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: 'performance' | 'connectivity' | 'resource' | 'security' | 'dependency';
  title: string;
  description: string;
  timestamp: string;
  duration: number; // minutes
  status: 'active' | 'resolved' | 'investigating';
  autoResolved: boolean;
  remediationSteps: string[];
}

interface AgentDependency {
  id: string;
  name: string;
  type: 'service' | 'database' | 'api' | 'queue';
  status: 'healthy' | 'degraded' | 'failing';
  responseTime: number;
  uptime: number;
  lastCheck: string;
}

interface RemediationAction {
  id: string;
  agentId: string;
  type: 'restart' | 'scale' | 'config_fix' | 'dependency_check' | 'resource_cleanup';
  status: 'pending' | 'running' | 'completed' | 'failed';
  timestamp: string;
  duration: number;
  details: string;
  success: boolean;
}

interface AgentHealthDashboardProps {
  agents: Agent[];
  onRemediationToggle: (agentId: string, enabled: boolean) => Promise<void>;
  onRemediationModeChange: (agentId: string, mode: string) => Promise<void>;
  onManualRemediation: (agentId: string, action: string) => Promise<void>;
}

export const AgentHealthDashboard: React.FC<AgentHealthDashboardProps> = ({
  agents,
  onRemediationToggle,
  onRemediationModeChange,
  onManualRemediation
}) => {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [remediationHistory, setRemediationHistory] = useState<RemediationAction[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [globalRemediationEnabled, setGlobalRemediationEnabled] = useState(true);
  const [healthTrends, setHealthTrends] = useState<Record<string, number[]>>({});

  const { isOpen: isIncidentsOpen, onToggle: onIncidentsToggle } = useDisclosure();
  const { isOpen: isHistoryOpen, onToggle: onHistoryToggle } = useDisclosure();
  const { isOpen: isDependenciesOpen, onToggle: onDependenciesToggle } = useDisclosure();
  const toast = useToast();

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');

  // Mock remediation history
  useEffect(() => {
    const mockHistory: RemediationAction[] = [
      {
        id: 'rem-001',
        agentId: 'voice-agent-001',
        type: 'restart',
        status: 'completed',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        duration: 45,
        details: 'Automated restart due to high memory usage',
        success: true
      },
      {
        id: 'rem-002',
        agentId: 'kg-agent-001',
        type: 'config_fix',
        status: 'completed',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        duration: 12,
        details: 'Adjusted query timeout configuration',
        success: true
      },
      {
        id: 'rem-003',
        agentId: 'memory-agent-001',
        type: 'resource_cleanup',
        status: 'completed',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        duration: 8,
        details: 'Cleared temporary memory cache',
        success: true
      }
    ];
    setRemediationHistory(mockHistory);
  }, []);

  // Simulate health trends
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      const trends = { ...healthTrends };
      agents.forEach(agent => {
        if (!trends[agent.id]) trends[agent.id] = [];
        trends[agent.id] = [
          ...trends[agent.id].slice(-19),
          agent.health.overall + (Math.random() - 0.5) * 10
        ];
      });
      setHealthTrends(trends);
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, agents, healthTrends]);

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'green';
    if (score >= 75) return 'yellow';
    if (score >= 50) return 'orange';
    return 'red';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'red';
      case 'high': return 'orange';
      case 'medium': return 'yellow';
      case 'low': return 'blue';
      default: return 'gray';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <FaArrowUp color="green" />;
      case 'degrading': return <FaArrowDown color="red" />;
      case 'stable': return <FaMinus color="gray" />;
      default: return <FaMinus />;
    }
  };

  const getOverallSystemHealth = () => {
    const totalHealth = agents.reduce((sum, agent) => sum + agent.health.overall, 0);
    return Math.round(totalHealth / agents.length);
  };

  const getActiveIncidents = () => {
    return agents.reduce((total, agent) => 
      total + agent.incidents.filter(incident => incident.status === 'active').length, 0
    );
  };

  const getRemediationStats = () => {
    const enabledAgents = agents.filter(agent => agent.remediation.enabled).length;
    const totalActions = agents.reduce((sum, agent) => sum + agent.remediation.actionsToday, 0);
    const avgSuccessRate = agents.reduce((sum, agent) => sum + agent.remediation.successRate, 0) / agents.length;
    
    return { enabledAgents, totalActions, avgSuccessRate };
  };

  const handleRemediationAction = async (action: string) => {
    if (!selectedAgent) return;

    try {
      await onManualRemediation(selectedAgent.id, action);
      toast({
        title: 'Remediation Action Initiated',
        description: `${action} remediation started for ${selectedAgent.name}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      // Add to history
      const newAction: RemediationAction = {
        id: `rem-${Date.now()}`,
        agentId: selectedAgent.id,
        type: action as any,
        status: 'running',
        timestamp: new Date().toISOString(),
        duration: 0,
        details: `Manual ${action} initiated by user`,
        success: false
      };
      setRemediationHistory(prev => [newAction, ...prev]);

    } catch (error) {
      toast({
        title: 'Remediation Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const stats = getRemediationStats();

  return (
    <VStack spacing={6} align="stretch">
      {/* Header with Global Controls */}
      <Flex justify="space-between" align="center">
        <Heading as="h2" size="md">Agent Health Dashboard</Heading>
        <HStack spacing={4}>
          <FormControl display="flex" alignItems="center">
            <FormLabel fontSize="sm" mb="0" mr="2">Global Remediation</FormLabel>
            <Switch 
              isChecked={globalRemediationEnabled} 
              onChange={(e) => setGlobalRemediationEnabled(e.target.checked)}
              size="sm"
            />
          </FormControl>
          <FormControl display="flex" alignItems="center">
            <FormLabel fontSize="sm" mb="0" mr="2">Auto Refresh</FormLabel>
            <Switch 
              isChecked={autoRefresh} 
              onChange={(e) => setAutoRefresh(e.target.checked)}
              size="sm"
            />
          </FormControl>
          <IconButton
            size="sm"
            icon={<FaSync />}
            onClick={() => {/* Force refresh */}}
            aria-label="Refresh health data"
          />
        </HStack>
      </Flex>

      {/* System Overview */}
      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
        <Card variant="outline">
          <CardBody textAlign="center">
            <CircularProgress 
              value={getOverallSystemHealth()} 
              color={getHealthColor(getOverallSystemHealth())}
              size="80px"
            >
              <CircularProgressLabel fontSize="sm">
                {getOverallSystemHealth()}%
              </CircularProgressLabel>
            </CircularProgress>
            <Text fontSize="sm" mt={2} fontWeight="semibold">System Health</Text>
          </CardBody>
        </Card>

        <Stat>
          <StatLabel>Active Incidents</StatLabel>
          <StatNumber color={getActiveIncidents() > 0 ? 'red.500' : 'green.500'}>
            {getActiveIncidents()}
          </StatNumber>
          <StatHelpText>
            Across {agents.length} agents
          </StatHelpText>
        </Stat>

        <Stat>
          <StatLabel>Auto Remediation</StatLabel>
          <StatNumber color="blue.500">{stats.enabledAgents}/{agents.length}</StatNumber>
          <StatHelpText>
            Agents enabled
          </StatHelpText>
        </Stat>

        <Stat>
          <StatLabel>Success Rate</StatLabel>
          <StatNumber color={stats.avgSuccessRate > 90 ? 'green.500' : 'orange.500'}>
            {Math.round(stats.avgSuccessRate)}%
          </StatNumber>
          <StatHelpText>
            {stats.totalActions} actions today
          </StatHelpText>
        </Stat>
      </SimpleGrid>

      {/* Agent Health Cards */}
      <Card variant="outline">
        <CardHeader>
          <Text fontWeight="semibold">Agent Health Status</Text>
        </CardHeader>
        <CardBody>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
            {agents.map(agent => (
              <Card
                key={agent.id}
                variant={selectedAgent?.id === agent.id ? 'filled' : 'outline'}
                cursor="pointer"
                onClick={() => setSelectedAgent(agent)}
                _hover={{ shadow: 'md' }}
              >
                <CardBody>
                  <VStack align="stretch" spacing={3}>
                    <HStack justify="space-between">
                      <Text fontWeight="semibold" fontSize="sm">{agent.name}</Text>
                      <HStack spacing={1}>
                        {getTrendIcon(agent.health.trend)}
                        <Badge colorScheme={getHealthColor(agent.health.overall)}>
                          {agent.health.overall}%
                        </Badge>
                      </HStack>
                    </HStack>

                    {/* Health Components */}
                    <VStack spacing={2} align="stretch">
                      <Box>
                        <HStack justify="space-between" mb={1}>
                          <Text fontSize="xs">Connectivity</Text>
                          <Text fontSize="xs">{agent.health.components.connectivity}%</Text>
                        </HStack>
                        <Progress 
                          value={agent.health.components.connectivity} 
                          size="xs" 
                          colorScheme={getHealthColor(agent.health.components.connectivity)}
                        />
                      </Box>
                      <Box>
                        <HStack justify="space-between" mb={1}>
                          <Text fontSize="xs">Performance</Text>
                          <Text fontSize="xs">{agent.health.components.performance}%</Text>
                        </HStack>
                        <Progress 
                          value={agent.health.components.performance} 
                          size="xs" 
                          colorScheme={getHealthColor(agent.health.components.performance)}
                        />
                      </Box>
                      <Box>
                        <HStack justify="space-between" mb={1}>
                          <Text fontSize="xs">Resources</Text>
                          <Text fontSize="xs">{agent.health.components.resources}%</Text>
                        </HStack>
                        <Progress 
                          value={agent.health.components.resources} 
                          size="xs" 
                          colorScheme={getHealthColor(agent.health.components.resources)}
                        />
                      </Box>
                    </VStack>

                    <HStack justify="space-between">
                      <HStack spacing={1}>
                        {agent.remediation.enabled && (
                          <Badge colorScheme="blue" size="sm">Auto</Badge>
                        )}
                        {agent.incidents.filter(i => i.status === 'active').length > 0 && (
                          <Badge colorScheme="red" size="sm">
                            {agent.incidents.filter(i => i.status === 'active').length} incidents
                          </Badge>
                        )}
                      </HStack>
                      <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                        {new Date(agent.health.lastCheck).toLocaleTimeString()}
                      </Text>
                    </HStack>
                  </VStack>
                </CardBody>
              </Card>
            ))}
          </SimpleGrid>
        </CardBody>
      </Card>

      {/* Detailed Health View */}
      {selectedAgent && (
        <>
          {/* Agent Health Details */}
          <Card variant="outline">
            <CardHeader>
              <HStack justify="space-between">
                <VStack align="start" spacing={1}>
                  <Text fontWeight="semibold">{selectedAgent.name} Health Details</Text>
                  <HStack spacing={2}>
                    <Badge colorScheme={getHealthColor(selectedAgent.health.overall)}>
                      {selectedAgent.health.overall}% Health
                    </Badge>
                    <Badge variant="outline">{selectedAgent.health.trend}</Badge>
                  </HStack>
                </VStack>
                <ButtonGroup size="sm">
                  <Button
                    leftIcon={<FaRobot />}
                    colorScheme={selectedAgent.remediation.enabled ? 'red' : 'green'}
                    onClick={() => onRemediationToggle(selectedAgent.id, !selectedAgent.remediation.enabled)}
                  >
                    {selectedAgent.remediation.enabled ? 'Disable' : 'Enable'} Auto Remediation
                  </Button>
                  {selectedAgent.remediation.enabled && (
                    <Select
                      size="sm"
                      value={selectedAgent.remediation.mode}
                      onChange={(e) => onRemediationModeChange(selectedAgent.id, e.target.value)}
                      maxW="120px"
                    >
                      <option value="monitoring">Monitor</option>
                      <option value="advisory">Advisory</option>
                      <option value="automatic">Automatic</option>
                    </Select>
                  )}
                </ButtonGroup>
              </HStack>
            </CardHeader>
            <CardBody>
              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
                {/* Health Components Breakdown */}
                <Box>
                  <Text fontWeight="semibold" mb={3}>Health Components</Text>
                  <VStack spacing={3} align="stretch">
                    <Box>
                      <HStack justify="space-between" mb={1}>
                        <Text fontSize="sm">Connectivity</Text>
                        <Text fontSize="sm" fontWeight="semibold">
                          {selectedAgent.health.components.connectivity}%
                        </Text>
                      </HStack>
                      <Progress 
                        value={selectedAgent.health.components.connectivity} 
                        colorScheme={getHealthColor(selectedAgent.health.components.connectivity)}
                      />
                    </Box>
                    <Box>
                      <HStack justify="space-between" mb={1}>
                        <Text fontSize="sm">Performance</Text>
                        <Text fontSize="sm" fontWeight="semibold">
                          {selectedAgent.health.components.performance}%
                        </Text>
                      </HStack>
                      <Progress 
                        value={selectedAgent.health.components.performance} 
                        colorScheme={getHealthColor(selectedAgent.health.components.performance)}
                      />
                    </Box>
                    <Box>
                      <HStack justify="space-between" mb={1}>
                        <Text fontSize="sm">Resources</Text>
                        <Text fontSize="sm" fontWeight="semibold">
                          {selectedAgent.health.components.resources}%
                        </Text>
                      </HStack>
                      <Progress 
                        value={selectedAgent.health.components.resources} 
                        colorScheme={getHealthColor(selectedAgent.health.components.resources)}
                      />
                    </Box>
                    <Box>
                      <HStack justify="space-between" mb={1}>
                        <Text fontSize="sm">Dependencies</Text>
                        <Text fontSize="sm" fontWeight="semibold">
                          {selectedAgent.health.components.dependencies}%
                        </Text>
                      </HStack>
                      <Progress 
                        value={selectedAgent.health.components.dependencies} 
                        colorScheme={getHealthColor(selectedAgent.health.components.dependencies)}
                      />
                    </Box>
                    <Box>
                      <HStack justify="space-between" mb={1}>
                        <Text fontSize="sm">Security</Text>
                        <Text fontSize="sm" fontWeight="semibold">
                          {selectedAgent.health.components.security}%
                        </Text>
                      </HStack>
                      <Progress 
                        value={selectedAgent.health.components.security} 
                        colorScheme={getHealthColor(selectedAgent.health.components.security)}
                      />
                    </Box>
                  </VStack>
                </Box>

                {/* Remediation Stats */}
                <Box>
                  <Text fontWeight="semibold" mb={3}>Remediation Status</Text>
                  <VStack spacing={3} align="stretch">
                    <Stat size="sm">
                      <StatLabel>Mode</StatLabel>
                      <StatNumber fontSize="lg">
                        <Badge colorScheme="blue">{selectedAgent.remediation.mode}</Badge>
                      </StatNumber>
                    </Stat>
                    <Stat size="sm">
                      <StatLabel>Success Rate</StatLabel>
                      <StatNumber fontSize="lg" color={selectedAgent.remediation.successRate > 90 ? 'green.500' : 'orange.500'}>
                        {selectedAgent.remediation.successRate}%
                      </StatNumber>
                    </Stat>
                    <Stat size="sm">
                      <StatLabel>Actions Today</StatLabel>
                      <StatNumber fontSize="lg">{selectedAgent.remediation.actionsToday}</StatNumber>
                    </Stat>
                    <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                      Last action: {selectedAgent.remediation.lastAction || 'None'}
                    </Text>
                  </VStack>
                </Box>

                {/* Manual Actions */}
                <Box>
                  <Text fontWeight="semibold" mb={3}>Manual Remediation</Text>
                  <VStack spacing={2} align="stretch">
                    <Button size="sm" leftIcon={<FaSync />} onClick={() => handleRemediationAction('restart')}>
                      Restart Agent
                    </Button>
                    <Button size="sm" leftIcon={<FaTools />} onClick={() => handleRemediationAction('config_fix')}>
                      Fix Configuration
                    </Button>
                    <Button size="sm" leftIcon={<FaClipboardCheck />} onClick={() => handleRemediationAction('dependency_check')}>
                      Check Dependencies
                    </Button>
                    <Button size="sm" leftIcon={<FaBolt />} onClick={() => handleRemediationAction('resource_cleanup')}>
                      Clean Resources
                    </Button>
                  </VStack>
                </Box>
              </SimpleGrid>
            </CardBody>
          </Card>

          {/* Active Incidents */}
          <Card variant="outline">
            <CardHeader>
              <HStack justify="space-between">
                <HStack>
                  <FaExclamationTriangle />
                  <Text fontWeight="semibold">Active Incidents</Text>
                  <Badge colorScheme="red">
                    {selectedAgent.incidents.filter(i => i.status === 'active').length}
                  </Badge>
                </HStack>
                <Button size="sm" variant="ghost" onClick={onIncidentsToggle}>
                  <FaEye />
                </Button>
              </HStack>
            </CardHeader>
            <Collapse in={isIncidentsOpen}>
              <CardBody pt={0}>
                {selectedAgent.incidents.filter(i => i.status === 'active').length === 0 ? (
                  <Alert status="success">
                    <AlertIcon />
                    No active incidents for this agent
                  </Alert>
                ) : (
                  <VStack spacing={3} align="stretch">
                    {selectedAgent.incidents.filter(i => i.status === 'active').map(incident => (
                      <Alert key={incident.id} status={incident.severity === 'critical' ? 'error' : 'warning'}>
                        <AlertIcon />
                        <Box flex="1">
                          <HStack justify="space-between" mb={1}>
                            <Text fontWeight="semibold" fontSize="sm">{incident.title}</Text>
                            <Badge colorScheme={getSeverityColor(incident.severity)}>
                              {incident.severity}
                            </Badge>
                          </HStack>
                          <Text fontSize="xs" color={useSemanticToken('text.secondary')} mb={2}>
                            {incident.description}
                          </Text>
                          <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                            Duration: {incident.duration} minutes | Type: {incident.type}
                            {incident.autoResolved && ' | Auto-resolving'}
                          </Text>
                        </Box>
                      </Alert>
                    ))}
                  </VStack>
                )}
              </CardBody>
            </Collapse>
          </Card>

          {/* Dependencies */}
          <Card variant="outline">
            <CardHeader>
              <HStack justify="space-between">
                <HStack>
                  <FaShieldAlt />
                  <Text fontWeight="semibold">Dependencies</Text>
                  <Badge colorScheme="blue">{selectedAgent.dependencies.length}</Badge>
                </HStack>
                <Button size="sm" variant="ghost" onClick={onDependenciesToggle}>
                  <FaEye />
                </Button>
              </HStack>
            </CardHeader>
            <Collapse in={isDependenciesOpen}>
              <CardBody pt={0}>
                <Table size="sm">
                  <Thead>
                    <Tr>
                      <Th>Dependency</Th>
                      <Th>Type</Th>
                      <Th>Status</Th>
                      <Th>Response Time</Th>
                      <Th>Uptime</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {selectedAgent.dependencies.map(dep => (
                      <Tr key={dep.id}>
                        <Td>{dep.name}</Td>
                        <Td>
                          <Badge variant="outline">{dep.type}</Badge>
                        </Td>
                        <Td>
                          <Badge 
                            colorScheme={
                              dep.status === 'healthy' ? 'green' : 
                              dep.status === 'degraded' ? 'yellow' : 'red'
                            }
                          >
                            {dep.status}
                          </Badge>
                        </Td>
                        <Td>{dep.responseTime}ms</Td>
                        <Td>{dep.uptime}%</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </CardBody>
            </Collapse>
          </Card>
        </>
      )}

      {/* Remediation History */}
      <Card variant="outline">
        <CardHeader>
          <HStack justify="space-between">
            <HStack>
              <FaHistory />
              <Text fontWeight="semibold">Recent Remediation Actions</Text>
              <Badge colorScheme="blue">{remediationHistory.length}</Badge>
            </HStack>
            <Button size="sm" variant="ghost" onClick={onHistoryToggle}>
              <FaEye />
            </Button>
          </HStack>
        </CardHeader>
        <Collapse in={isHistoryOpen}>
          <CardBody pt={0}>
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Agent</Th>
                  <Th>Action</Th>
                  <Th>Status</Th>
                  <Th>Duration</Th>
                  <Th>Time</Th>
                  <Th>Details</Th>
                </Tr>
              </Thead>
              <Tbody>
                {remediationHistory.slice(0, 10).map(action => {
                  const agent = agents.find(a => a.id === action.agentId);
                  return (
                    <Tr key={action.id}>
                      <Td>{agent?.name || action.agentId}</Td>
                      <Td>
                        <Badge variant="outline">{action.type.replace('_', ' ')}</Badge>
                      </Td>
                      <Td>
                        <Badge 
                          colorScheme={
                            action.status === 'completed' ? 'green' :
                            action.status === 'failed' ? 'red' :
                            action.status === 'running' ? 'blue' : 'gray'
                          }
                        >
                          {action.status}
                        </Badge>
                      </Td>
                      <Td>{action.duration}s</Td>
                      <Td>{new Date(action.timestamp).toLocaleTimeString()}</Td>
                      <Td>
                        <Tooltip label={action.details}>
                          <Text fontSize="xs" isTruncated maxW="150px">
                            {action.details}
                          </Text>
                        </Tooltip>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </CardBody>
        </Collapse>
      </Card>

      {/* No Agent Selected */}
      {!selectedAgent && (
        <Alert status="info">
          <AlertIcon />
          Select an agent above to view detailed health information and remediation controls
        </Alert>
      )}
    </VStack>
  );
};
