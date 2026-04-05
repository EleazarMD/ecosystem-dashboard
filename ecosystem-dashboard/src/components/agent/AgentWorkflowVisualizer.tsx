/**
 * Agent Workflow Visualizer Component
 * 
 * Advanced visualization for agent workflow results including
 * dependency graphs, impact analysis, and workflow execution flows.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Button,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Progress,
  Flex,
  Icon,
  Tooltip,
  Grid,
  GridItem,
} from '@chakra-ui/react';
import {
  FaProjectDiagram,
  FaNetworkWired,
  FaChartLine,
  FaExclamationTriangle,
  FaCheckCircle,
  FaClock,
  FaPlay,
  FaPause,
  FaStop
} from 'react-icons/fa';

interface WorkflowNode {
  id: string;
  name: string;
  type: 'service' | 'component' | 'process' | 'decision';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'blocked';
  dependencies: string[];
  metadata?: Record<string, any>;
  position?: { x: number; y: number };
}

interface WorkflowEdge {
  source: string;
  target: string;
  type: 'dependency' | 'data_flow' | 'control_flow';
  weight?: number;
  metadata?: Record<string, any>;
}

interface WorkflowVisualizationData {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  metrics: {
    totalNodes: number;
    completedNodes: number;
    failedNodes: number;
    executionTime: number;
    criticalPath: string[];
  };
}

interface AgentWorkflowVisualizerProps {
  workflowData: WorkflowVisualizationData;
  workflowType: 'rca' | 'port_compliance' | 'impact_analysis' | 'memory_governance' | 'deployment';
  isInteractive?: boolean;
  onNodeClick?: (node: WorkflowNode) => void;
  onEdgeClick?: (edge: WorkflowEdge) => void;
}

const getNodeColor = (status: WorkflowNode['status']) => {
  switch (status) {
    case 'completed': return 'green';
    case 'failed': return 'red';
    case 'running': return 'blue';
    case 'blocked': return 'orange';
    default: return 'gray';
  }
};

const getNodeIcon = (type: WorkflowNode['type']) => {
  switch (type) {
    case 'service': return FaNetworkWired;
    case 'component': return FaProjectDiagram;
    case 'process': return FaPlay;
    case 'decision': return FaExclamationTriangle;
    default: return FaProjectDiagram;
  }
};

export const AgentWorkflowVisualizer: React.FC<AgentWorkflowVisualizerProps> = ({
  workflowData,
  workflowType,
  isInteractive = true,
  onNodeClick,
  onEdgeClick
}) => {
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [viewMode, setViewMode] = useState<'graph' | 'timeline' | 'metrics'>('graph');
  
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');

  const completionPercentage = useMemo(() => {
    if (workflowData.metrics.totalNodes === 0) return 0;
    return Math.round((workflowData.metrics.completedNodes / workflowData.metrics.totalNodes) * 100);
  }, [workflowData.metrics]);

  const criticalPathNodes = useMemo(() => {
    return workflowData.nodes.filter(node => 
      workflowData.metrics.criticalPath.includes(node.id)
    );
  }, [workflowData.nodes, workflowData.metrics.criticalPath]);

  const renderGraphView = () => (
    <Box position="relative" minH="400px" bg={bgColor} border="1px" borderColor={borderColor} borderRadius="md" p={4}>
      <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={6}>
        {workflowData.nodes.map((node, index) => {
          const IconComponent = getNodeIcon(node.type);
          const color = getNodeColor(node.status);
          const isCritical = workflowData.metrics.criticalPath.includes(node.id);
          
          return (
            <GridItem key={node.id}>
              <Box
                p={4}
                bg={selectedNode?.id === node.id ? `${color}.50` : 'transparent'}
                border="2px"
                borderColor={isCritical ? 'purple.500' : `${color}.300`}
                borderRadius="md"
                cursor={isInteractive ? 'pointer' : 'default'}
                onClick={() => {
                  if (isInteractive) {
                    setSelectedNode(node);
                    onNodeClick?.(node);
                  }
                }}
                _hover={isInteractive ? { bg: `${color}.50` } : {}}
                position="relative"
              >
                {isCritical && (
                  <Badge
                    position="absolute"
                    top={-2}
                    right={-2}
                    colorScheme="purple"
                    fontSize="xs"
                  >
                    Critical
                  </Badge>
                )}
                
                <VStack spacing={2}>
                  <Icon as={IconComponent} size="lg" color={`${color}.500`} />
                  <Text fontWeight="bold" fontSize="sm" textAlign="center">
                    {node.name}
                  </Text>
                  <Badge colorScheme={color} size="sm">
                    {node.status}
                  </Badge>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')} textAlign="center">
                    {node.type}
                  </Text>
                </VStack>
                
                {/* Dependencies indicator */}
                {node.dependencies.length > 0 && (
                  <Text fontSize="xs" color={useSemanticToken('text.tertiary')} mt={2} textAlign="center">
                    Deps: {node.dependencies.length}
                  </Text>
                )}
              </Box>
            </GridItem>
          );
        })}
      </Grid>
      
      {/* Connection lines would be rendered here with SVG in a real implementation */}
      <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={4} textAlign="center">
        Workflow connections: {workflowData.edges.length} edges
      </Text>
    </Box>
  );

  const renderTimelineView = () => (
    <VStack spacing={4} align="stretch">
      {workflowData.nodes
        .sort((a, b) => {
          const statusOrder = { completed: 0, running: 1, pending: 2, failed: 3, blocked: 4 };
          return statusOrder[a.status] - statusOrder[b.status];
        })
        .map(node => {
          const IconComponent = getNodeIcon(node.type);
          const color = getNodeColor(node.status);
          
          return (
            <HStack key={node.id} spacing={4} p={3} bg={bgColor} borderRadius="md" border="1px" borderColor={borderColor}>
              <Icon as={IconComponent} color={`${color}.500`} />
              <VStack align="start" spacing={1} flex={1}>
                <HStack>
                  <Text fontWeight="medium">{node.name}</Text>
                  <Badge colorScheme={color} size="sm">{node.status}</Badge>
                </HStack>
                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>{node.type}</Text>
                {node.metadata?.duration && (
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                    Duration: {node.metadata.duration}ms
                  </Text>
                )}
              </VStack>
              {node.status === 'running' && (
                <Progress size="sm" isIndeterminate colorScheme="blue" w="100px" />
              )}
            </HStack>
          );
        })}
    </VStack>
  );

  const renderMetricsView = () => (
    <Grid templateColumns="repeat(auto-fit, minmax(250px, 1fr))" gap={6}>
      <GridItem>
        <Box p={4} bg={bgColor} borderRadius="md" border="1px" borderColor={borderColor}>
          <VStack spacing={3}>
            <Icon as={FaChartLine} size="lg" color="blue.500" />
            <Text fontWeight="bold">Execution Progress</Text>
            <Progress value={completionPercentage} colorScheme="blue" w="full" />
            <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
              {workflowData.metrics.completedNodes} of {workflowData.metrics.totalNodes} completed
            </Text>
          </VStack>
        </Box>
      </GridItem>
      
      <GridItem>
        <Box p={4} bg={bgColor} borderRadius="md" border="1px" borderColor={borderColor}>
          <VStack spacing={3}>
            <Icon as={FaClock} size="lg" color="orange.500" />
            <Text fontWeight="bold">Execution Time</Text>
            <Text fontSize="2xl" fontWeight="bold" color="orange.500">
              {Math.round(workflowData.metrics.executionTime / 1000)}s
            </Text>
            <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
              Total runtime
            </Text>
          </VStack>
        </Box>
      </GridItem>
      
      <GridItem>
        <Box p={4} bg={bgColor} borderRadius="md" border="1px" borderColor={borderColor}>
          <VStack spacing={3}>
            <Icon as={FaExclamationTriangle} size="lg" color="red.500" />
            <Text fontWeight="bold">Failed Nodes</Text>
            <Text fontSize="2xl" fontWeight="bold" color="red.500">
              {workflowData.metrics.failedNodes}
            </Text>
            <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
              Requires attention
            </Text>
          </VStack>
        </Box>
      </GridItem>
      
      <GridItem>
        <Box p={4} bg={bgColor} borderRadius="md" border="1px" borderColor={borderColor}>
          <VStack spacing={3}>
            <Icon as={FaProjectDiagram} size="lg" color="purple.500" />
            <Text fontWeight="bold">Critical Path</Text>
            <Text fontSize="lg" fontWeight="bold" color="purple.500">
              {criticalPathNodes.length} nodes
            </Text>
            <VStack spacing={1}>
              {criticalPathNodes.slice(0, 3).map(node => (
                <Text key={node.id} fontSize="xs" color={useSemanticToken('text.secondary')}>
                  {node.name}
                </Text>
              ))}
              {criticalPathNodes.length > 3 && (
                <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                  +{criticalPathNodes.length - 3} more
                </Text>
              )}
            </VStack>
          </VStack>
        </Box>
      </GridItem>
    </Grid>
  );

  return (
    <Box>
      <VStack spacing={4} align="stretch">
        {/* Header */}
        <HStack justify="space-between">
          <VStack align="start" spacing={1}>
            <Text fontSize="lg" fontWeight="bold">
              {workflowType.replace('_', ' ').toUpperCase()} Workflow
            </Text>
            <HStack>
              <Badge colorScheme="blue">{workflowData.nodes.length} nodes</Badge>
              <Badge colorScheme="green">{completionPercentage}% complete</Badge>
              {workflowData.metrics.failedNodes > 0 && (
                <Badge colorScheme="red">{workflowData.metrics.failedNodes} failed</Badge>
              )}
            </HStack>
          </VStack>
          
          <HStack>
            <Button size="sm" variant="outline" leftIcon={<FaPlay />}>
              Execute
            </Button>
            <Button size="sm" variant="outline" leftIcon={<FaPause />}>
              Pause
            </Button>
            <Button size="sm" variant="outline" leftIcon={<FaStop />}>
              Stop
            </Button>
          </HStack>
        </HStack>

        {/* View Tabs */}
        <Tabs value={viewMode} onChange={(index) => {
          const modes = ['graph', 'timeline', 'metrics'];
          setViewMode(modes[index] as any);
        }}>
          <TabList>
            <Tab>Graph View</Tab>
            <Tab>Timeline View</Tab>
            <Tab>Metrics View</Tab>
          </TabList>

          <TabPanels>
            <TabPanel px={0}>
              {renderGraphView()}
            </TabPanel>
            <TabPanel px={0}>
              {renderTimelineView()}
            </TabPanel>
            <TabPanel px={0}>
              {renderMetricsView()}
            </TabPanel>
          </TabPanels>
        </Tabs>

        {/* Selected Node Details */}
        {selectedNode && (
          <Box p={4} bg="blue.50" borderRadius="md" border="1px" borderColor="blue.200">
            <VStack align="start" spacing={2}>
              <Text fontWeight="bold">Selected Node: {selectedNode.name}</Text>
              <HStack>
                <Badge colorScheme={getNodeColor(selectedNode.status)}>
                  {selectedNode.status}
                </Badge>
                <Badge variant="outline">{selectedNode.type}</Badge>
              </HStack>
              {selectedNode.dependencies.length > 0 && (
                <Text fontSize="sm">
                  Dependencies: {selectedNode.dependencies.join(', ')}
                </Text>
              )}
              {selectedNode.metadata && (
                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                  Metadata: {JSON.stringify(selectedNode.metadata, null, 2)}
                </Text>
              )}
            </VStack>
          </Box>
        )}
      </VStack>
    </Box>
  );
};
