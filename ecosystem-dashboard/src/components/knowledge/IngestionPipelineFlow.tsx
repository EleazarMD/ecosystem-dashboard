import React, { useEffect, useState } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Heading,
  HStack,
  VStack,
  Text,
  Badge,
  Progress,
  Icon,
  Flex,
  Tooltip,
} from '@chakra-ui/react';
import {
  FiInbox, 
  FiCpu, 
  FiDatabase, 
  FiCheckCircle,
  FiArrowRight,
  FiFile
} from 'react-icons/fi';

interface PipelineDocument {
  path: string;
  stage: string;
  progress: number;
  status: 'processing' | 'complete' | 'error';
  startedAt: number;
  updatedAt: number;
}

interface PipelineData {
  stages: string[];
  currentDocuments: PipelineDocument[];
  stageMetrics: {
    queue: number;
    orchestrator: number;
    extraction: number;
    graph_update: number;
    complete: number;
  };
  isRunning: boolean;
  currentBatch: string;
}

const stageIcons: Record<string, any> = {
  Queue: FiInbox,
  Orchestrator: FiCpu,
  Extraction: FiDatabase,
  'Graph Update': FiDatabase,
  Complete: FiCheckCircle,
};

const stageColors: Record<string, string> = {
  Queue: 'blue',
  Orchestrator: 'purple',
  Extraction: 'orange',
  'Graph Update': 'teal',
  Complete: 'green',
};

const IngestionPipelineFlow: React.FC = () => {
  const [pipeline, setPipeline] = useState<PipelineData>({
    stages: ['Queue', 'Orchestrator', 'Extraction', 'Graph Update', 'Complete'],
    currentDocuments: [],
    stageMetrics: {
      queue: 0,
      orchestrator: 0,
      extraction: 0,
      graph_update: 0,
      complete: 0,
    },
    isRunning: false,
    currentBatch: 'none',
  });

  useEffect(() => {
    const fetchPipeline = async () => {
      try {
        const res = await fetch('http://localhost:8765/api/ingestion/pipeline');
        if (res.ok) {
          const data = await res.json();
          setPipeline(data);
        }
      } catch (error) {
        console.error('Failed to fetch pipeline:', error);
      }
    };

    fetchPipeline();
    const interval = setInterval(fetchPipeline, 500); // Update every 0.5 seconds for faster response
    return () => clearInterval(interval);
  }, []);

  const getStageDocuments = (stage: string) => {
    return pipeline.currentDocuments.filter(doc => doc.stage === stage);
  };

  const getStageMetric = (stage: string): number => {
    const key = stage.toLowerCase().replace(' ', '_') as keyof typeof pipeline.stageMetrics;
    return pipeline.stageMetrics[key] || 0;
  };

  return (
    <Card bg={useSemanticToken('surface.elevated')} _dark={{ bg: 'gray.800' }} shadow="sm">
      <CardHeader pb={2}>
        <HStack justify="space-between">
          <Heading size="md">Document Ingestion Pipeline</Heading>
          <HStack spacing={2}>
            <Badge colorScheme={pipeline.isRunning ? 'green' : 'gray'}>
              {pipeline.isRunning ? 'Active' : 'Idle'}
            </Badge>
            {pipeline.currentBatch !== 'none' && (
              <Badge colorScheme="purple">{pipeline.currentBatch}</Badge>
            )}
          </HStack>
        </HStack>
      </CardHeader>
      <CardBody>
        {/* Pipeline Flow Diagram */}
        <HStack spacing={4} align="stretch" mb={6} overflowX="auto" pb={2}>
          {pipeline.stages.map((stage, index) => (
            <React.Fragment key={stage}>
              {/* Stage Card */}
              <VStack 
                flex="1" 
                minW="180px"
                bg={`${stageColors[stage]}.50`}
                _dark={{ bg: `${stageColors[stage]}.900` }}
                borderRadius="lg"
                p={4}
                borderWidth="2px"
                borderColor={`${stageColors[stage]}.200`}
                _dark={{ borderColor: `${stageColors[stage]}.700` }}
                position="relative"
              >
                {/* Stage Icon & Name */}
                <HStack w="full" justify="center" mb={2}>
                  <Icon 
                    as={stageIcons[stage]} 
                    boxSize={6} 
                    color={`${stageColors[stage]}.600`}
                  />
                  <Text 
                    fontWeight="bold" 
                    fontSize="sm"
                    color={`${stageColors[stage]}.700`}
                  >
                    {stage}
                  </Text>
                </HStack>

                {/* Document Count */}
                <Flex
                  w="60px"
                  h="60px"
                  borderRadius="full"
                  bg={`${stageColors[stage]}.100`}
                  _dark={{ bg: `${stageColors[stage]}.800` }}
                  align="center"
                  justify="center"
                  mb={2}
                >
                  <Text 
                    fontSize="2xl" 
                    fontWeight="bold"
                    color={`${stageColors[stage]}.600`}
                    _dark={{ color: `${stageColors[stage]}.300` }}
                  >
                    {getStageMetric(stage)}
                  </Text>
                </Flex>

                {/* Documents in Stage */}
                <VStack spacing={1} w="full" maxH="100px" overflowY="auto">
                  {getStageDocuments(stage).slice(0, 3).map((doc) => (
                    <Tooltip 
                      key={doc.path} 
                      label={doc.path}
                      placement="top"
                    >
                      <HStack 
                        w="full" 
                        bg={useSemanticToken('surface.elevated')}
                        _dark={{ bg: 'gray.700' }}
                        px={2}
                        py={1}
                        borderRadius="md"
                        fontSize="xs"
                      >
                        <Icon as={FiFile} boxSize={3} />
                        <Text 
                          flex="1" 
                          isTruncated
                          maxW="120px"
                        >
                          {doc.path.split('/').pop()}
                        </Text>
                      </HStack>
                    </Tooltip>
                  ))}
                  {getStageDocuments(stage).length > 3 && (
                    <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                      +{getStageDocuments(stage).length - 3} more
                    </Text>
                  )}
                </VStack>
              </VStack>

              {/* Arrow between stages */}
              {index < pipeline.stages.length - 1 && (
                <Flex align="center" justify="center" minW="40px">
                  <Icon 
                    as={FiArrowRight} 
                    boxSize={8} 
                    color={useSemanticToken('text.tertiary')}
                    _dark={{ color: 'gray.600' }}
                  />
                </Flex>
              )}
            </React.Fragment>
          ))}
        </HStack>

        {/* Live Document Feed */}
        {pipeline.currentDocuments.length > 0 && (
          <Box>
            <Heading size="sm" mb={3}>Active Documents</Heading>
            <VStack spacing={2} align="stretch" maxH="200px" overflowY="auto">
              {pipeline.currentDocuments.slice(0, 10).map((doc) => (
                <HStack
                  key={doc.path}
                  bg={useSemanticToken('surface.base')}
                  _dark={{ bg: 'gray.700' }}
                  p={3}
                  borderRadius="md"
                  justify="space-between"
                >
                  <HStack flex="1" minW="0">
                    <Icon as={FiFile} boxSize={4} color={`${stageColors[doc.stage]}.500`} />
                    <Text fontSize="sm" isTruncated>
                      {doc.path}
                    </Text>
                  </HStack>
                  <Badge colorScheme={stageColors[doc.stage]} fontSize="xs">
                    {doc.stage}
                  </Badge>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')} minW="60px" textAlign="right">
                    {Math.round((Date.now() - doc.startedAt) / 1000)}s
                  </Text>
                </HStack>
              ))}
            </VStack>
          </Box>
        )}

        {/* Empty State */}
        {pipeline.currentDocuments.length === 0 && !pipeline.isRunning && (
          <Flex 
            direction="column" 
            align="center" 
            justify="center" 
            py={8}
            color={useSemanticToken('text.tertiary')}
          >
            <Icon as={FiInbox} boxSize={12} mb={2} />
            <Text fontSize="sm">No active ingestion</Text>
            <Text fontSize="xs">Start ingestion to see documents flow through the pipeline</Text>
          </Flex>
        )}
      </CardBody>
    </Card>
  );
};

export default IngestionPipelineFlow;
