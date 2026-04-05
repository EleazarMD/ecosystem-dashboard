/**
 * Pipeline Designer
 * Visual ML pipeline design interface for creating training workflows
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  SimpleGrid,
  Button,
  Badge,
  Icon,
  IconButton,
  Divider,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  Input,
  Select,
  FormControl,
  FormLabel,
  Tooltip,
} from '@chakra-ui/react';
import {
  PlusIcon,
  ArrowRightIcon,
  TrashIcon,
  PlayIcon,
  DocumentDuplicateIcon,
  CubeTransparentIcon,
  CircleStackIcon,
  WrenchScrewdriverIcon,
  BeakerIcon,
  ArrowPathIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  DocumentChartBarIcon,
} from '@heroicons/react/24/outline';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { GlassPanel } from '@/components/ui/GlassPanel';

interface PipelineNode {
  id: string;
  type: 'data' | 'preprocess' | 'train' | 'evaluate' | 'deploy' | 'custom';
  name: string;
  config: Record<string, any>;
  status?: 'pending' | 'running' | 'completed' | 'error';
}

interface Pipeline {
  id: string;
  name: string;
  description: string;
  nodes: PipelineNode[];
  connections: { from: string; to: string }[];
  createdAt: string;
  lastRun?: string;
}

const nodeTypes = [
  {
    type: 'data',
    label: 'Data Source',
    icon: CircleStackIcon,
    color: 'blue',
    description: 'Load training data',
  },
  {
    type: 'preprocess',
    label: 'Preprocessing',
    icon: ArrowPathIcon,
    color: 'cyan',
    description: 'Data transformation',
  },
  {
    type: 'train',
    label: 'Training',
    icon: WrenchScrewdriverIcon,
    color: 'purple',
    description: 'Model training step',
  },
  {
    type: 'evaluate',
    label: 'Evaluation',
    icon: BeakerIcon,
    color: 'orange',
    description: 'Model evaluation',
  },
  {
    type: 'deploy',
    label: 'Deployment',
    icon: CloudArrowUpIcon,
    color: 'green',
    description: 'Deploy model',
  },
  {
    type: 'custom',
    label: 'Custom Step',
    icon: CubeTransparentIcon,
    color: 'gray',
    description: 'Custom pipeline step',
  },
];

export const PipelineDesigner: React.FC = () => {
  const [pipelines, setPipelines] = useState<Pipeline[]>([
    {
      id: '1',
      name: 'LLM Fine-tuning Pipeline',
      description: 'Standard pipeline for fine-tuning language models',
      nodes: [
        { id: 'n1', type: 'data', name: 'Load Dataset', config: { source: 'huggingface' } },
        { id: 'n2', type: 'preprocess', name: 'Tokenize', config: { maxLength: 2048 } },
        { id: 'n3', type: 'train', name: 'LoRA Training', config: { method: 'lora' }, status: 'completed' },
        { id: 'n4', type: 'evaluate', name: 'Validation', config: { metrics: ['loss', 'perplexity'] } },
      ],
      connections: [
        { from: 'n1', to: 'n2' },
        { from: 'n2', to: 'n3' },
        { from: 'n3', to: 'n4' },
      ],
      createdAt: '2024-01-15',
      lastRun: '2 hours ago',
    },
  ]);
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(pipelines[0]);
  const [selectedNode, setSelectedNode] = useState<PipelineNode | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const borderSubtle = useSemanticToken('border.subtle');
  const surfaceElevated = useSemanticToken('surface.elevated');
  const bgHover = useSemanticToken('surface.hover');

  const getNodeTypeConfig = (type: string) => {
    return nodeTypes.find((nt) => nt.type === type) || nodeTypes[5];
  };

  const addNodeToPipeline = (type: string) => {
    if (!selectedPipeline) return;

    const nodeConfig = getNodeTypeConfig(type);
    const newNode: PipelineNode = {
      id: `n${Date.now()}`,
      type: type as PipelineNode['type'],
      name: nodeConfig.label,
      config: {},
    };

    const updatedPipeline = {
      ...selectedPipeline,
      nodes: [...selectedPipeline.nodes, newNode],
    };

    // Auto-connect to last node
    if (selectedPipeline.nodes.length > 0) {
      const lastNode = selectedPipeline.nodes[selectedPipeline.nodes.length - 1];
      updatedPipeline.connections = [
        ...selectedPipeline.connections,
        { from: lastNode.id, to: newNode.id },
      ];
    }

    setSelectedPipeline(updatedPipeline);
    setPipelines((prev) =>
      prev.map((p) => (p.id === selectedPipeline.id ? updatedPipeline : p))
    );

    toast({
      title: 'Node Added',
      description: `Added ${nodeConfig.label} to pipeline`,
      status: 'success',
      duration: 2000,
    });
  };

  const removeNode = (nodeId: string) => {
    if (!selectedPipeline) return;

    const updatedPipeline = {
      ...selectedPipeline,
      nodes: selectedPipeline.nodes.filter((n) => n.id !== nodeId),
      connections: selectedPipeline.connections.filter(
        (c) => c.from !== nodeId && c.to !== nodeId
      ),
    };

    setSelectedPipeline(updatedPipeline);
    setPipelines((prev) =>
      prev.map((p) => (p.id === selectedPipeline.id ? updatedPipeline : p))
    );
  };

  const runPipeline = async () => {
    if (!selectedPipeline) return;

    toast({
      title: 'Pipeline Started',
      description: `Running ${selectedPipeline.name}`,
      status: 'info',
      duration: 3000,
    });

    // Simulate running nodes
    for (const node of selectedPipeline.nodes) {
      const updatedNodes = selectedPipeline.nodes.map((n) =>
        n.id === node.id ? { ...n, status: 'running' as const } : n
      );
      setSelectedPipeline({ ...selectedPipeline, nodes: updatedNodes });
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Mark all as completed
    const completedNodes = selectedPipeline.nodes.map((n) => ({
      ...n,
      status: 'completed' as const,
    }));
    setSelectedPipeline({ ...selectedPipeline, nodes: completedNodes });

    toast({
      title: 'Pipeline Complete',
      status: 'success',
      duration: 3000,
    });
  };

  const createNewPipeline = () => {
    const newPipeline: Pipeline = {
      id: `p${Date.now()}`,
      name: 'New Pipeline',
      description: 'Custom training pipeline',
      nodes: [],
      connections: [],
      createdAt: new Date().toISOString().split('T')[0],
    };
    setPipelines((prev) => [...prev, newPipeline]);
    setSelectedPipeline(newPipeline);
    onClose();
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* Header */}
      <HStack justify="space-between">
        <Box>
          <Text fontSize="xl" fontWeight="bold" color={textPrimary}>
            Pipeline Designer
          </Text>
          <Text fontSize="sm" color={textSecondary}>
            Build and manage ML training pipelines visually
          </Text>
        </Box>
        <HStack>
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Icon as={DocumentDuplicateIcon} boxSize={4} />}
          >
            Templates
          </Button>
          <Button
            size="sm"
            colorScheme="purple"
            leftIcon={<Icon as={PlusIcon} boxSize={4} />}
            onClick={onOpen}
          >
            New Pipeline
          </Button>
        </HStack>
      </HStack>

      <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={6}>
        {/* Pipeline List */}
        <GlassPanel p={4}>
          <Text fontSize="sm" fontWeight="bold" color={textPrimary} mb={3}>
            Pipelines
          </Text>
          <VStack align="stretch" spacing={2}>
            {pipelines.map((pipeline) => (
              <Box
                key={pipeline.id}
                p={3}
                borderRadius="md"
                cursor="pointer"
                bg={selectedPipeline?.id === pipeline.id ? bgHover : 'transparent'}
                border="1px solid"
                borderColor={
                  selectedPipeline?.id === pipeline.id ? 'purple.500' : borderSubtle
                }
                onClick={() => setSelectedPipeline(pipeline)}
                _hover={{ bg: bgHover }}
              >
                <HStack justify="space-between">
                  <VStack align="start" spacing={0}>
                    <Text fontSize="sm" fontWeight="medium" color={textPrimary}>
                      {pipeline.name}
                    </Text>
                    <Text fontSize="xs" color={textSecondary}>
                      {pipeline.nodes.length} steps
                    </Text>
                  </VStack>
                  {pipeline.lastRun && (
                    <Badge colorScheme="green" fontSize="2xs">
                      {pipeline.lastRun}
                    </Badge>
                  )}
                </HStack>
              </Box>
            ))}
          </VStack>
        </GlassPanel>

        {/* Pipeline Canvas */}
        <GlassPanel p={4} gridColumn={{ lg: 'span 2' }}>
          {selectedPipeline ? (
            <VStack align="stretch" spacing={4}>
              <HStack justify="space-between">
                <Box>
                  <Text fontSize="md" fontWeight="bold" color={textPrimary}>
                    {selectedPipeline.name}
                  </Text>
                  <Text fontSize="xs" color={textSecondary}>
                    {selectedPipeline.description}
                  </Text>
                </Box>
                <HStack>
                  <Button
                    size="sm"
                    colorScheme="green"
                    leftIcon={<Icon as={PlayIcon} boxSize={4} />}
                    onClick={runPipeline}
                  >
                    Run Pipeline
                  </Button>
                </HStack>
              </HStack>

              <Divider borderColor={borderSubtle} />

              {/* Node Palette */}
              <Box>
                <Text fontSize="xs" fontWeight="bold" color={textSecondary} mb={2}>
                  ADD STEP
                </Text>
                <HStack spacing={2} flexWrap="wrap">
                  {nodeTypes.map((nodeType) => (
                    <Tooltip key={nodeType.type} label={nodeType.description}>
                      <Button
                        size="xs"
                        variant="outline"
                        leftIcon={<Icon as={nodeType.icon} boxSize={3} />}
                        colorScheme={nodeType.color}
                        onClick={() => addNodeToPipeline(nodeType.type)}
                      >
                        {nodeType.label}
                      </Button>
                    </Tooltip>
                  ))}
                </HStack>
              </Box>

              {/* Pipeline Flow */}
              <Box
                minH="200px"
                p={4}
                border="1px dashed"
                borderColor={borderSubtle}
                borderRadius="md"
                bg={surfaceElevated}
              >
                {selectedPipeline.nodes.length === 0 ? (
                  <VStack h="full" justify="center" py={8}>
                    <Icon as={CubeTransparentIcon} boxSize={10} color={textSecondary} />
                    <Text color={textSecondary}>
                      Add steps to build your pipeline
                    </Text>
                  </VStack>
                ) : (
                  <HStack spacing={4} overflowX="auto" py={4}>
                    {selectedPipeline.nodes.map((node, index) => {
                      const nodeConfig = getNodeTypeConfig(node.type);
                      return (
                        <React.Fragment key={node.id}>
                          <VStack spacing={2}>
                            <Box
                              p={4}
                              borderRadius="lg"
                              border="2px solid"
                              borderColor={
                                node.status === 'completed'
                                  ? 'green.400'
                                  : node.status === 'running'
                                  ? 'purple.400'
                                  : borderSubtle
                              }
                              bg={surfaceElevated}
                              minW="140px"
                              position="relative"
                              cursor="pointer"
                              onClick={() => setSelectedNode(node)}
                              _hover={{ borderColor: 'purple.400' }}
                            >
                              <IconButton
                                aria-label="Remove"
                                icon={<Icon as={TrashIcon} boxSize={3} />}
                                size="xs"
                                variant="ghost"
                                colorScheme="red"
                                position="absolute"
                                top={1}
                                right={1}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeNode(node.id);
                                }}
                              />
                              <VStack spacing={1}>
                                <Icon
                                  as={nodeConfig.icon}
                                  boxSize={6}
                                  color={`${nodeConfig.color}.400`}
                                />
                                <Text
                                  fontSize="sm"
                                  fontWeight="medium"
                                  color={textPrimary}
                                  textAlign="center"
                                >
                                  {node.name}
                                </Text>
                                {node.status && (
                                  <Badge
                                    colorScheme={
                                      node.status === 'completed'
                                        ? 'green'
                                        : node.status === 'running'
                                        ? 'purple'
                                        : 'gray'
                                    }
                                    fontSize="2xs"
                                  >
                                    {node.status}
                                  </Badge>
                                )}
                              </VStack>
                            </Box>
                          </VStack>
                          {index < selectedPipeline.nodes.length - 1 && (
                            <Icon
                              as={ArrowRightIcon}
                              boxSize={5}
                              color={textSecondary}
                              flexShrink={0}
                            />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </HStack>
                )}
              </Box>

              {/* Node Config Panel */}
              {selectedNode && (
                <Box p={4} bg={surfaceElevated} borderRadius="md">
                  <HStack justify="space-between" mb={3}>
                    <Text fontSize="sm" fontWeight="bold" color={textPrimary}>
                      Configure: {selectedNode.name}
                    </Text>
                    <IconButton
                      aria-label="Close"
                      size="xs"
                      variant="ghost"
                      onClick={() => setSelectedNode(null)}
                    />
                  </HStack>
                  <SimpleGrid columns={2} spacing={3}>
                    <FormControl size="sm">
                      <FormLabel fontSize="xs" color={textSecondary}>
                        Step Name
                      </FormLabel>
                      <Input size="sm" defaultValue={selectedNode.name} />
                    </FormControl>
                    <FormControl size="sm">
                      <FormLabel fontSize="xs" color={textSecondary}>
                        Compute Resource
                      </FormLabel>
                      <Select size="sm" defaultValue="auto">
                        <option value="auto">Auto-select</option>
                        <option value="dgx-1">DGX Spark #1</option>
                        <option value="dgx-2">DGX Spark #2</option>
                      </Select>
                    </FormControl>
                  </SimpleGrid>
                </Box>
              )}
            </VStack>
          ) : (
            <VStack h="full" justify="center" py={12}>
              <Icon as={DocumentChartBarIcon} boxSize={12} color={textSecondary} />
              <Text color={textSecondary}>Select a pipeline to edit</Text>
            </VStack>
          )}
        </GlassPanel>
      </SimpleGrid>

      {/* New Pipeline Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent bg={surfaceElevated}>
          <ModalHeader color={textPrimary}>Create New Pipeline</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel color={textPrimary}>Pipeline Name</FormLabel>
                <Input placeholder="My Training Pipeline" />
              </FormControl>
              <FormControl>
                <FormLabel color={textPrimary}>Description</FormLabel>
                <Input placeholder="What does this pipeline do?" />
              </FormControl>
              <FormControl>
                <FormLabel color={textPrimary}>Template</FormLabel>
                <Select>
                  <option value="blank">Blank Pipeline</option>
                  <option value="llm-finetune">LLM Fine-tuning</option>
                  <option value="embedding">Embedding Training</option>
                  <option value="rl">Reinforcement Learning</option>
                </Select>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="purple" onClick={createNewPipeline}>
              Create
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
};

export default PipelineDesigner;
