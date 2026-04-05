/**
 * Compute Resources Panel
 * Manages connections to RTX Training Hub and other training machines
 * Connected to real RTX Training Hub API for live GPU data
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  SimpleGrid,
  Button,
  Badge,
  Icon,
  Progress,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Input,
  FormControl,
  FormLabel,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  Switch,
  Divider,
  Code,
  Spinner,
  Alert,
  AlertIcon,
  Tooltip,
} from '@chakra-ui/react';
import {
  CpuChipIcon,
  ServerStackIcon,
  PlusIcon,
  ArrowPathIcon,
  SignalIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  CloudIcon,
  CommandLineIcon,
  FireIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useDGXSparkStream } from '@/hooks/useDGXSparkStream';
import { useDGXSparkConnection } from '@/hooks/useDGXSparkApi';
import type { GPUStatus } from '@/services/dgxSparkApi';

interface GPUInfo {
  index: number;
  name: string;
  memory: number;
  memoryUsed: number;
  utilization: number;
  temperature: number;
  powerDraw: number;
}

interface ComputeNode {
  id: string;
  name: string;
  host: string;
  port: number;
  type: 'dgx-spark' | 'gpu-server' | 'cloud-instance';
  status: 'connected' | 'disconnected' | 'error';
  gpus: GPUInfo[];
  totalMemory: number;
  usedMemory: number;
  activeJobs: number;
  lastPing: string;
  apiVersion?: string;
}

interface AddNodeFormData {
  name: string;
  host: string;
  port: number;
  type: 'dgx-spark' | 'gpu-server' | 'cloud-instance';
  apiKey?: string;
}

export const ComputeResourcesPanel: React.FC = () => {
  const [additionalNodes, setAdditionalNodes] = useState<ComputeNode[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [formData, setFormData] = useState<AddNodeFormData>({
    name: '',
    host: '',
    port: 8080,
    type: 'dgx-spark',
  });
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const borderSubtle = useSemanticToken('border.subtle');
  const surfaceElevated = useSemanticToken('surface.elevated');

  // Real RTX Training Hub API connection
  const { data: streamData, isConnected, isConnecting, reconnect } = useDGXSparkStream();
  const { checkConnection } = useDGXSparkConnection();

  // Convert real API data to ComputeNode format
  const dgxSparkNode: ComputeNode | null = useMemo(() => {
    if (!streamData?.gpus) return null;

    const gpus: GPUInfo[] = streamData.gpus.map((gpu: GPUStatus) => ({
      index: gpu.index,
      name: gpu.name,
      memory: Math.round(gpu.memory_total / 1024), // MB to GB
      memoryUsed: Math.round(gpu.memory_used / 1024),
      utilization: gpu.gpu_utilization,
      temperature: gpu.temperature,
      powerDraw: gpu.power_draw,
    }));

    const totalMemory = gpus.reduce((sum, gpu) => sum + gpu.memory, 0);
    const usedMemory = gpus.reduce((sum, gpu) => sum + gpu.memoryUsed, 0);

    return {
      id: 'dgx-spark-primary',
      name: 'RTX Training Hub (Tailscale)',
      host: '100.108.41.22',
      port: 8765,
      type: 'dgx-spark' as const,
      status: isConnected ? 'connected' as const : 'disconnected' as const,
      gpus,
      totalMemory,
      usedMemory,
      activeJobs: streamData?.active_jobs?.length ?? 0,
      lastPing: 'Live SSE',
      apiVersion: 'v1.0',
    };
  }, [streamData, isConnected]);

  // Combine real node with any additional configured nodes
  const nodes = useMemo(() => {
    const allNodes: ComputeNode[] = [];
    if (dgxSparkNode) {
      allNodes.push(dgxSparkNode);
    } else if (!isConnecting) {
      // Show disconnected RTX Training Hub placeholder
      allNodes.push({
        id: 'dgx-spark-primary',
        name: 'RTX Training Hub (Tailscale)',
        host: '100.108.41.22',
        port: 8765,
        type: 'dgx-spark',
        status: 'disconnected',
        gpus: [],
        totalMemory: 0,
        usedMemory: 0,
        activeJobs: 0,
        lastPing: 'Not connected',
      });
    }
    return [...allNodes, ...additionalNodes];
  }, [dgxSparkNode, additionalNodes, isConnecting]);

  const isLoading = isConnecting && !streamData;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Reconnect to RTX Training Hub SSE stream
    reconnect();
    await checkConnection();
    setIsRefreshing(false);
    toast({
      title: isConnected ? 'Resources refreshed' : 'Attempting to reconnect...',
      status: isConnected ? 'success' : 'info',
      duration: 2000,
    });
  };

  const handleAddNode = async () => {
    // Validate form
    if (!formData.name || !formData.host) {
      toast({
        title: 'Validation Error',
        description: 'Name and host are required',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    // TODO: Real API call to connect to node
    toast({
      title: 'Connecting to node...',
      description: `Testing connection to ${formData.host}:${formData.port}`,
      status: 'info',
      duration: 2000,
    });

    onClose();
    setFormData({ name: '', host: '', port: 8080, type: 'dgx-spark' });
  };

  const handleTestConnection = async (node: ComputeNode) => {
    toast({
      title: 'Testing connection...',
      description: `Pinging ${node.host}:${node.port}`,
      status: 'info',
      duration: 1500,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'green';
      case 'disconnected':
        return 'gray';
      case 'error':
        return 'red';
      default:
        return 'gray';
    }
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'dgx-spark':
        return CpuChipIcon;
      case 'cloud-instance':
        return CloudIcon;
      default:
        return ServerStackIcon;
    }
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* Header */}
      <HStack justify="space-between">
        <Box>
          <Text fontSize="xl" fontWeight="bold" color={textPrimary}>
            Compute Resources
          </Text>
          <Text fontSize="sm" color={textSecondary}>
            Manage RTX Training Hub and training infrastructure connections
          </Text>
        </Box>
        <HStack>
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Icon as={ArrowPathIcon} boxSize={4} />}
            onClick={handleRefresh}
            isLoading={isRefreshing}
          >
            Refresh
          </Button>
          <Button
            size="sm"
            colorScheme="purple"
            leftIcon={<Icon as={PlusIcon} boxSize={4} />}
            onClick={onOpen}
          >
            Add Resource
          </Button>
        </HStack>
      </HStack>

      {/* Summary Stats */}
      <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4}>
        <GlassPanel p={4}>
          <HStack>
            <Icon as={ServerStackIcon} boxSize={6} color="blue.400" />
            <Box>
              <Text fontSize="2xl" fontWeight="bold" color={textPrimary}>
                {nodes.length}
              </Text>
              <Text fontSize="xs" color={textSecondary}>
                Total Resources
              </Text>
            </Box>
          </HStack>
        </GlassPanel>

        <GlassPanel p={4}>
          <HStack>
            <Icon as={CheckCircleIcon} boxSize={6} color="green.400" />
            <Box>
              <Text fontSize="2xl" fontWeight="bold" color={textPrimary}>
                {nodes.filter((n) => n.status === 'connected').length}
              </Text>
              <Text fontSize="xs" color={textSecondary}>
                Connected
              </Text>
            </Box>
          </HStack>
        </GlassPanel>

        <GlassPanel p={4}>
          <HStack>
            <Icon as={CpuChipIcon} boxSize={6} color="purple.400" />
            <Box>
              <Text fontSize="2xl" fontWeight="bold" color={textPrimary}>
                {nodes.reduce((acc, n) => acc + n.gpus.length, 0)}
              </Text>
              <Text fontSize="xs" color={textSecondary}>
                Total GPUs
              </Text>
            </Box>
          </HStack>
        </GlassPanel>

        <GlassPanel p={4}>
          <HStack>
            <Icon as={SignalIcon} boxSize={6} color="orange.400" />
            <Box>
              <Text fontSize="2xl" fontWeight="bold" color={textPrimary}>
                {Math.round(
                  nodes
                    .filter((n) => n.status === 'connected')
                    .reduce((acc, n) => {
                      const avgUtil =
                        n.gpus.length > 0
                          ? n.gpus.reduce((a, g) => a + g.utilization, 0) / n.gpus.length
                          : 0;
                      return acc + avgUtil;
                    }, 0) /
                    Math.max(nodes.filter((n) => n.status === 'connected').length, 1)
                )}
                %
              </Text>
              <Text fontSize="xs" color={textSecondary}>
                Avg GPU Usage
              </Text>
            </Box>
          </HStack>
        </GlassPanel>
      </SimpleGrid>

      {/* Resource Cards */}
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
        {nodes.map((node) => (
          <GlassPanel key={node.id} p={5}>
            <VStack align="stretch" spacing={4}>
              {/* Node Header */}
              <HStack justify="space-between">
                <HStack>
                  <Icon
                    as={getNodeIcon(node.type)}
                    boxSize={6}
                    color={node.status === 'connected' ? 'green.400' : 'gray.400'}
                  />
                  <Box>
                    <Text fontWeight="bold" color={textPrimary}>
                      {node.name}
                    </Text>
                    <Text fontSize="xs" color={textSecondary}>
                      {node.host}:{node.port}
                    </Text>
                  </Box>
                </HStack>
                <VStack align="end" spacing={1}>
                  <Badge colorScheme={getStatusColor(node.status)}>
                    {node.status}
                  </Badge>
                  {node.apiVersion && (
                    <Text fontSize="xs" color={textSecondary}>
                      API {node.apiVersion}
                    </Text>
                  )}
                </VStack>
              </HStack>

              <Divider borderColor={borderSubtle} />

              {/* GPU Info */}
              {node.gpus.length > 0 ? (
                <VStack align="stretch" spacing={3}>
                  {node.gpus.map((gpu) => (
                    <Box key={gpu.index} p={3} bg={surfaceElevated} borderRadius="md">
                      <HStack justify="space-between" mb={2}>
                        <Text fontSize="sm" fontWeight="medium" color={textPrimary}>
                          GPU {gpu.index}: {gpu.name}
                        </Text>
                        <Badge colorScheme="purple" fontSize="xs">
                          {gpu.temperature}°C
                        </Badge>
                      </HStack>

                      <SimpleGrid columns={2} spacing={3}>
                        <Box>
                          <Text fontSize="xs" color={textSecondary}>
                            Utilization
                          </Text>
                          <Progress
                            value={gpu.utilization}
                            size="sm"
                            colorScheme={gpu.utilization > 80 ? 'red' : 'green'}
                            borderRadius="full"
                          />
                          <Text fontSize="xs" color={textPrimary}>
                            {gpu.utilization}%
                          </Text>
                        </Box>
                        <Box>
                          <Text fontSize="xs" color={textSecondary}>
                            Memory
                          </Text>
                          <Progress
                            value={(gpu.memoryUsed / gpu.memory) * 100}
                            size="sm"
                            colorScheme="blue"
                            borderRadius="full"
                          />
                          <Text fontSize="xs" color={textPrimary}>
                            {gpu.memoryUsed}GB / {gpu.memory}GB
                          </Text>
                        </Box>
                      </SimpleGrid>

                      <HStack justify="space-between" mt={2}>
                        <Text fontSize="xs" color={textSecondary}>
                          Power: {gpu.powerDraw}W
                        </Text>
                      </HStack>
                    </Box>
                  ))}
                </VStack>
              ) : (
                <Box
                  p={4}
                  textAlign="center"
                  border="1px dashed"
                  borderColor={borderSubtle}
                  borderRadius="md"
                >
                  <Icon as={XCircleIcon} boxSize={6} color="gray.400" mb={2} />
                  <Text fontSize="sm" color={textSecondary}>
                    No GPU data available
                  </Text>
                  <Text fontSize="xs" color={textSecondary}>
                    Connect to view GPU metrics
                  </Text>
                </Box>
              )}

              {/* Actions */}
              <HStack justify="space-between" pt={2}>
                <Text fontSize="xs" color={textSecondary}>
                  Last ping: {node.lastPing}
                </Text>
                <HStack>
                  <Button
                    size="xs"
                    variant="outline"
                    leftIcon={<Icon as={SignalIcon} boxSize={3} />}
                    onClick={() => handleTestConnection(node)}
                  >
                    Test
                  </Button>
                  <Button
                    size="xs"
                    variant="outline"
                    leftIcon={<Icon as={CommandLineIcon} boxSize={3} />}
                  >
                    Terminal
                  </Button>
                </HStack>
              </HStack>
            </VStack>
          </GlassPanel>
        ))}
      </SimpleGrid>

      {/* Add Node Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent bg={surfaceElevated}>
          <ModalHeader color={textPrimary}>Add Compute Resource</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel color={textPrimary}>Name</FormLabel>
                <Input
                  placeholder="RTX Training Hub #3"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel color={textPrimary}>Host</FormLabel>
                <Input
                  placeholder="192.168.1.102 or hostname"
                  value={formData.host}
                  onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                />
              </FormControl>

              <FormControl>
                <FormLabel color={textPrimary}>Port</FormLabel>
                <Input
                  type="number"
                  value={formData.port}
                  onChange={(e) =>
                    setFormData({ ...formData, port: parseInt(e.target.value) || 8080 })
                  }
                />
              </FormControl>

              <FormControl>
                <FormLabel color={textPrimary}>Resource Type</FormLabel>
                <HStack spacing={4}>
                  {['dgx-spark', 'gpu-server', 'cloud-instance'].map((type) => (
                    <Badge
                      key={type}
                      px={3}
                      py={1}
                      cursor="pointer"
                      colorScheme={formData.type === type ? 'purple' : 'gray'}
                      onClick={() =>
                        setFormData({ ...formData, type: type as AddNodeFormData['type'] })
                      }
                    >
                      {type}
                    </Badge>
                  ))}
                </HStack>
              </FormControl>

              <FormControl>
                <FormLabel color={textPrimary}>API Key (optional)</FormLabel>
                <Input
                  type="password"
                  placeholder="Enter API key if required"
                  value={formData.apiKey || ''}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="purple" onClick={handleAddNode}>
              Connect
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
};

export default ComputeResourcesPanel;
