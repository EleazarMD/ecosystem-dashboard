/**
 * Agent Deployment Manager
 * 
 * Comprehensive deployment management interface for agent lifecycle operations
 * including start, stop, restart, scale, and deployment pipeline controls
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
  Button,
  ButtonGroup,
  Badge,
  Progress,
  SimpleGrid,
  IconButton,
  Tooltip,
  useToast,
  Alert,
  AlertIcon,
  Select,
  Input,
  FormControl,
  FormLabel,
  Divider,
  Collapse,
  useDisclosure,
  Spinner,
  Code,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Flex,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText
} from '@chakra-ui/react';
import {
  FaPlay,
  FaPause,
  FaStop,
  FaRedo,
  FaPlus,
  FaMinus,
  FaChartLine,
  FaDownload,
  FaUpload,
  FaCogs,
  FaRocket,
  FaExclamationTriangle,
  FaCheckCircle,
  FaClock,
  FaEye,
  FaChevronDown,
  FaSync
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
  deployment: {
    strategy: 'rolling' | 'blue-green' | 'canary';
    replicas: {
      desired: number;
      current: number;
      ready: number;
    };
    resources: {
      requests: { cpu: string; memory: string; };
      limits: { cpu: string; memory: string; };
    };
    healthCheck: {
      enabled: boolean;
      path: string;
      interval: number;
      timeout: number;
      retries: number;
    };
    environment: string;
    lastDeployment: string;
    rolloutStatus: 'complete' | 'progressing' | 'failed' | 'paused';
    rolloutProgress: number;
  };
}

interface DeploymentHistory {
  id: string;
  version: string;
  timestamp: string;
  status: 'success' | 'failed' | 'rolled-back';
  duration: number;
  changes: string[];
  deployedBy: string;
}

interface AgentDeploymentManagerProps {
  agents: Agent[];
  onAgentAction: (agentId: string, action: string, params?: any) => Promise<void>;
}

export const AgentDeploymentManager: React.FC<AgentDeploymentManagerProps> = ({
  agents,
  onAgentAction
}) => {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [deploymentHistory, setDeploymentHistory] = useState<DeploymentHistory[]>([]);
  const [isDeploying, setIsDeploying] = useState<string | null>(null);
  const [deploymentProgress, setDeploymentProgress] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { isOpen: isHistoryOpen, onToggle: onHistoryToggle } = useDisclosure();
  const toast = useToast();

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');

  // Mock deployment history
  useEffect(() => {
    const mockHistory: DeploymentHistory[] = [
      {
        id: 'deploy-001',
        version: '2.1.0',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        status: 'success',
        duration: 45,
        changes: ['Updated model to mistral:latest', 'Enhanced multi-agent collaboration', 'Fixed memory leak'],
        deployedBy: 'system'
      },
      {
        id: 'deploy-002',
        version: '2.0.5',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        status: 'success',
        duration: 32,
        changes: ['Security patch', 'Performance optimizations'],
        deployedBy: 'auto-deploy'
      },
      {
        id: 'deploy-003',
        version: '2.0.4',
        timestamp: new Date(Date.now() - 172800000).toISOString(),
        status: 'rolled-back',
        duration: 28,
        changes: ['Failed configuration update'],
        deployedBy: 'system'
      }
    ];
    setDeploymentHistory(mockHistory);
  }, []);

  const handleAgentAction = async (action: string, params?: any) => {
    if (!selectedAgent) return;

    try {
      setIsDeploying(selectedAgent.id);
      setDeploymentProgress(0);

      // Simulate deployment progress
      const progressInterval = setInterval(() => {
        setDeploymentProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            setIsDeploying(null);
            return 100;
          }
          return prev + Math.random() * 15;
        });
      }, 300);

      await onAgentAction(selectedAgent.id, action, params);

      toast({
        title: `Agent ${action} initiated`,
        description: `${selectedAgent.name} ${action} operation started successfully`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

    } catch (error) {
      setIsDeploying(null);
      setDeploymentProgress(0);
      toast({
        title: `${action} failed`,
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const getStatusColor = (status: Agent['status']) => {
    switch (status) {
      case 'active': return 'green';
      case 'inactive': return 'gray';
      case 'error': return 'red';
      case 'configuring': return 'yellow';
      case 'deploying': return 'blue';
      case 'stopping': return 'orange';
      default: return 'gray';
    }
  };

  const getRolloutStatusColor = (status: string) => {
    switch (status) {
      case 'complete': return 'green';
      case 'progressing': return 'blue';
      case 'failed': return 'red';
      case 'paused': return 'yellow';
      default: return 'gray';
    }
  };

  return (
    <VStack spacing={6} align="stretch">
      <Heading as="h2" size="md">Agent Deployment Management</Heading>

      {/* Agent Selection */}
      <Card variant="outline">
        <CardHeader>
          <HStack justify="space-between">
            <Text fontWeight="semibold">Select Agent</Text>
            <Badge colorScheme="blue">{agents.length} agents available</Badge>
          </HStack>
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
                  <VStack align="stretch" spacing={2}>
                    <HStack justify="space-between">
                      <Text fontWeight="semibold" fontSize="sm">{agent.name}</Text>
                      <Badge colorScheme={getStatusColor(agent.status)} size="sm">
                        {agent.status}
                      </Badge>
                    </HStack>
                    <Text fontSize="xs" color={useSemanticToken('text.secondary')}>{agent.type}</Text>
                    {agent.deployment && (
                      <HStack spacing={1}>
                        <Text fontSize="xs">Replicas:</Text>
                        <Badge variant="outline" size="sm">
                          {agent.deployment.replicas.ready}/{agent.deployment.replicas.desired}
                        </Badge>
                      </HStack>
                    )}
                  </VStack>
                </CardBody>
              </Card>
            ))}
          </SimpleGrid>
        </CardBody>
      </Card>

      {/* Deployment Controls */}
      {selectedAgent && (
        <>
          <Card variant="outline">
            <CardHeader>
              <HStack justify="space-between">
                <VStack align="start" spacing={1}>
                  <Text fontWeight="semibold">{selectedAgent.name} Deployment Controls</Text>
                  <HStack spacing={2}>
                    <Badge colorScheme={getStatusColor(selectedAgent.status)}>
                      {selectedAgent.status}
                    </Badge>
                    {selectedAgent.deployment && (
                      <Badge colorScheme={getRolloutStatusColor(selectedAgent.deployment.rolloutStatus)}>
                        {selectedAgent.deployment.rolloutStatus}
                      </Badge>
                    )}
                  </HStack>
                </VStack>
                <Button size="sm" variant="ghost" onClick={() => setShowAdvanced(!showAdvanced)}>
                  <FaCogs />
                </Button>
              </HStack>
            </CardHeader>
            <CardBody>
              <VStack spacing={4} align="stretch">
                {/* Deployment Progress */}
                {isDeploying === selectedAgent.id && (
                  <Box>
                    <HStack justify="space-between" mb={2}>
                      <Text fontSize="sm">Deployment in progress...</Text>
                      <Text fontSize="sm">{Math.round(deploymentProgress)}%</Text>
                    </HStack>
                    <Progress value={deploymentProgress} colorScheme="blue" />
                  </Box>
                )}

                {/* Action Buttons */}
                <ButtonGroup size="sm" spacing={3}>
                  <Button
                    leftIcon={<FaPlay />}
                    colorScheme="green"
                    isDisabled={selectedAgent.status === 'active' || isDeploying === selectedAgent.id}
                    onClick={() => handleAgentAction('start')}
                  >
                    Start
                  </Button>
                  <Button
                    leftIcon={<FaPause />}
                    colorScheme="yellow"
                    isDisabled={selectedAgent.status === 'inactive' || isDeploying === selectedAgent.id}
                    onClick={() => handleAgentAction('pause')}
                  >
                    Pause
                  </Button>
                  <Button
                    leftIcon={<FaStop />}
                    colorScheme="red"
                    isDisabled={selectedAgent.status === 'inactive' || isDeploying === selectedAgent.id}
                    onClick={() => handleAgentAction('stop')}
                  >
                    Stop
                  </Button>
                  <Button
                    leftIcon={<FaRedo />}
                    colorScheme="blue"
                    isDisabled={isDeploying === selectedAgent.id}
                    onClick={() => handleAgentAction('restart')}
                  >
                    Restart
                  </Button>
                  <Button
                    leftIcon={<FaRocket />}
                    colorScheme="purple"
                    isDisabled={isDeploying === selectedAgent.id}
                    onClick={() => handleAgentAction('deploy')}
                  >
                    Deploy
                  </Button>
                </ButtonGroup>

                {/* Scaling Controls */}
                <HStack spacing={4}>
                  <FormControl maxW="200px">
                    <FormLabel fontSize="sm">Replicas</FormLabel>
                    <HStack>
                      <IconButton
                        size="xs"
                        icon={<FaMinus />}
                        onClick={() => handleAgentAction('scale', { replicas: Math.max(1, (selectedAgent.deployment?.replicas.desired || 1) - 1) })}
                        isDisabled={isDeploying === selectedAgent.id}
                        aria-label="Decrease replicas"
                      />
                      <Text fontSize="sm" minW="30px" textAlign="center">
                        {selectedAgent.deployment?.replicas.desired || 1}
                      </Text>
                      <IconButton
                        size="xs"
                        icon={<FaPlus />}
                        onClick={() => handleAgentAction('scale', { replicas: (selectedAgent.deployment?.replicas.desired || 1) + 1 })}
                        isDisabled={isDeploying === selectedAgent.id}
                        aria-label="Increase replicas"
                      />
                    </HStack>
                  </FormControl>

                  <FormControl maxW="200px">
                    <FormLabel fontSize="sm">Strategy</FormLabel>
                    <Select size="sm" value={selectedAgent.deployment?.strategy || 'rolling'}>
                      <option value="rolling">Rolling Update</option>
                      <option value="blue-green">Blue-Green</option>
                      <option value="canary">Canary</option>
                    </Select>
                  </FormControl>
                </HStack>

                {/* Advanced Configuration */}
                <Collapse in={showAdvanced}>
                  <VStack spacing={4} align="stretch" pt={4}>
                    <Divider />
                    <Text fontWeight="semibold" fontSize="sm">Advanced Deployment Configuration</Text>
                    
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <FormControl>
                        <FormLabel fontSize="sm">Health Check Path</FormLabel>
                        <Input 
                          size="sm" 
                          value={selectedAgent.deployment?.healthCheck.path || '/health'} 
                          placeholder="/health"
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel fontSize="sm">Check Interval (s)</FormLabel>
                        <Input 
                          size="sm" 
                          type="number" 
                          value={selectedAgent.deployment?.healthCheck.interval || 30} 
                        />
                      </FormControl>
                    </SimpleGrid>

                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <Box>
                        <Text fontSize="sm" fontWeight="semibold" mb={2}>Resource Requests</Text>
                        <VStack spacing={2}>
                          <HStack>
                            <Text fontSize="xs" w="50px">CPU:</Text>
                            <Code fontSize="xs">{selectedAgent.deployment?.resources.requests.cpu || '100m'}</Code>
                          </HStack>
                          <HStack>
                            <Text fontSize="xs" w="50px">Memory:</Text>
                            <Code fontSize="xs">{selectedAgent.deployment?.resources.requests.memory || '256Mi'}</Code>
                          </HStack>
                        </VStack>
                      </Box>
                      <Box>
                        <Text fontSize="sm" fontWeight="semibold" mb={2}>Resource Limits</Text>
                        <VStack spacing={2}>
                          <HStack>
                            <Text fontSize="xs" w="50px">CPU:</Text>
                            <Code fontSize="xs">{selectedAgent.deployment?.resources.limits.cpu || '500m'}</Code>
                          </HStack>
                          <HStack>
                            <Text fontSize="xs" w="50px">Memory:</Text>
                            <Code fontSize="xs">{selectedAgent.deployment?.resources.limits.memory || '1Gi'}</Code>
                          </HStack>
                        </VStack>
                      </Box>
                    </SimpleGrid>
                  </VStack>
                </Collapse>
              </VStack>
            </CardBody>
          </Card>

          {/* Deployment Status */}
          {selectedAgent.deployment && (
            <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={4}>
              <Stat>
                <StatLabel>Current Replicas</StatLabel>
                <StatNumber>{selectedAgent.deployment.replicas.ready}/{selectedAgent.deployment.replicas.desired}</StatNumber>
                <StatHelpText>Ready / Desired</StatHelpText>
              </Stat>
              <Stat>
                <StatLabel>Rollout Progress</StatLabel>
                <StatNumber>{selectedAgent.deployment.rolloutProgress}%</StatNumber>
                <StatHelpText>
                  <Badge colorScheme={getRolloutStatusColor(selectedAgent.deployment.rolloutStatus)}>
                    {selectedAgent.deployment.rolloutStatus}
                  </Badge>
                </StatHelpText>
              </Stat>
              <Stat>
                <StatLabel>Last Deployment</StatLabel>
                <StatNumber fontSize="md">
                  {new Date(selectedAgent.deployment.lastDeployment).toLocaleDateString()}
                </StatNumber>
                <StatHelpText>
                  {new Date(selectedAgent.deployment.lastDeployment).toLocaleTimeString()}
                </StatHelpText>
              </Stat>
            </SimpleGrid>
          )}

          {/* Deployment History */}
          <Card variant="outline">
            <CardHeader>
              <HStack justify="space-between">
                <Text fontWeight="semibold">Deployment History</Text>
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
                      <Th>Version</Th>
                      <Th>Status</Th>
                      <Th>Duration</Th>
                      <Th>Timestamp</Th>
                      <Th>Changes</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {deploymentHistory.map(deployment => (
                      <Tr key={deployment.id}>
                        <Td>{deployment.version}</Td>
                        <Td>
                          <Badge 
                            colorScheme={
                              deployment.status === 'success' ? 'green' : 
                              deployment.status === 'failed' ? 'red' : 'orange'
                            }
                          >
                            {deployment.status}
                          </Badge>
                        </Td>
                        <Td>{deployment.duration}s</Td>
                        <Td>{new Date(deployment.timestamp).toLocaleDateString()}</Td>
                        <Td>
                          <Tooltip label={deployment.changes.join(', ')}>
                            <Text fontSize="xs" isTruncated maxW="150px">
                              {deployment.changes[0]}
                              {deployment.changes.length > 1 && ` (+${deployment.changes.length - 1})`}
                            </Text>
                          </Tooltip>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </CardBody>
            </Collapse>
          </Card>
        </>
      )}

      {/* No Agent Selected */}
      {!selectedAgent && (
        <Alert status="info">
          <AlertIcon />
          Select an agent above to manage its deployment lifecycle
        </Alert>
      )}
    </VStack>
  );
};
