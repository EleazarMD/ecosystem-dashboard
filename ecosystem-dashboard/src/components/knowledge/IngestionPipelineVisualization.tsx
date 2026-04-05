import React, { useState, useEffect } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  VStack,
  HStack,
  Progress,
  Badge,
  Button,
  Icon,
  Flex,
  SimpleGrid,
  Divider,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Tooltip,
  CircularProgress,
  CircularProgressLabel,
} from '@chakra-ui/react';
import {
  FiPlay,
  FiPause,
  FiSkipForward,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiLayers,
  FiActivity,
  FiAlertCircle,
} from 'react-icons/fi';

interface DocumentItem {
  path: string;
  name: string;
  size: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress?: number;
  entities?: number;
  processingTime?: number;
  error?: string;
}

interface BatchInfo {
  batchNumber: number;
  documents: DocumentItem[];
  status: 'pending' | 'processing' | 'completed';
  startTime?: string;
  endTime?: string;
  totalDocs: number;
  completedDocs: number;
}

interface IngestionPipelineVisualizationProps {
  onStartBatch?: () => void;
  onPauseBatch?: () => void;
  onSkipBatch?: () => void;
}

const IngestionPipelineVisualization: React.FC<IngestionPipelineVisualizationProps> = ({
  onStartBatch,
  onPauseBatch,
  onSkipBatch,
}) => {
  const [currentBatch, setCurrentBatch] = useState<BatchInfo | null>(null);
  const [upcomingBatches, setUpcomingBatches] = useState<BatchInfo[]>([]);
  const [completedBatches, setCompletedBatches] = useState<BatchInfo[]>([]);
  const [pipelineStats, setPipelineStats] = useState({
    totalDocuments: 2812,
    processedDocuments: 62,
    totalBatches: 141,
    completedBatches: 3,
    estimatedTimeRemaining: 0,
  });
  const [isLoading, setIsLoading] = useState(false);

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const hoverBg = useSemanticToken('surface.hover');

  useEffect(() => {
    loadPipelineData();
    const interval = setInterval(loadPipelineData, 3000); // Update every 3 seconds
    return () => clearInterval(interval);
  }, []);

  const loadPipelineData = async () => {
    try {
      // Fetch current pipeline status
      const statusResponse = await fetch('/api/knowledge/ingestion-status');
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        
        // Update pipeline stats
        setPipelineStats({
          totalDocuments: statusData.pipeline.progress.totalDocuments,
          processedDocuments: statusData.pipeline.progress.processedDocuments,
          totalBatches: Math.ceil(statusData.pipeline.progress.totalDocuments / 20),
          completedBatches: Math.floor(statusData.pipeline.progress.processedDocuments / 20),
          estimatedTimeRemaining: statusData.pipeline.progress.estimatedTimeRemaining,
        });
      }

      // Fetch document queue (this would come from a real API)
      const queueResponse = await fetch('/api/knowledge/document-queue');
      if (queueResponse.ok) {
        const queueData = await queueResponse.json();
        setCurrentBatch(queueData.currentBatch);
        setUpcomingBatches(queueData.upcomingBatches || []);
        setCompletedBatches(queueData.completedBatches || []);
      } else {
        // Generate mock data for visualization
        generateMockBatchData();
      }
    } catch (error) {
      console.error('Error loading pipeline data:', error);
      generateMockBatchData();
    }
  };

  const generateMockBatchData = () => {
    const batchNumber = Math.floor(pipelineStats.processedDocuments / 20) + 1;
    
    // Current batch
    const currentDocs: DocumentItem[] = Array.from({ length: 20 }, (_, i) => ({
      path: `/core/knowledge-graph/docs/doc-${batchNumber * 20 + i}.md`,
      name: `document-${batchNumber * 20 + i}.md`,
      size: Math.floor(Math.random() * 5000) + 1000,
      status: i < 5 ? 'completed' : i === 5 ? 'processing' : 'pending',
      progress: i === 5 ? 65 : undefined,
      entities: i < 5 ? Math.floor(Math.random() * 30) + 10 : undefined,
      processingTime: i < 5 ? Math.random() * 3 + 1 : undefined,
    }));

    setCurrentBatch({
      batchNumber,
      documents: currentDocs,
      status: 'processing',
      startTime: new Date(Date.now() - 30000).toISOString(),
      totalDocs: 20,
      completedDocs: 5,
    });

    // Upcoming batches (next 3)
    const upcoming: BatchInfo[] = Array.from({ length: 3 }, (_, batchIdx) => ({
      batchNumber: batchNumber + batchIdx + 1,
      documents: Array.from({ length: 20 }, (_, docIdx) => ({
        path: `/core/docs/batch-${batchNumber + batchIdx + 1}/doc-${docIdx}.md`,
        name: `doc-${(batchNumber + batchIdx + 1) * 20 + docIdx}.md`,
        size: Math.floor(Math.random() * 5000) + 1000,
        status: 'pending' as const,
      })),
      status: 'pending',
      totalDocs: 20,
      completedDocs: 0,
    }));

    setUpcomingBatches(upcoming);

    // Completed batches (last 2)
    if (batchNumber > 1) {
      const completed: BatchInfo[] = Array.from({ length: Math.min(2, batchNumber - 1) }, (_, idx) => ({
        batchNumber: batchNumber - idx - 1,
        documents: [],
        status: 'completed',
        startTime: new Date(Date.now() - (idx + 2) * 120000).toISOString(),
        endTime: new Date(Date.now() - (idx + 1) * 120000).toISOString(),
        totalDocs: 20,
        completedDocs: 20,
      }));
      setCompletedBatches(completed);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'green';
      case 'processing': return 'blue';
      case 'error': return 'red';
      case 'pending': return 'gray';
      default: return 'gray';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return FiCheckCircle;
      case 'processing': return FiActivity;
      case 'error': return FiAlertCircle;
      case 'pending': return FiClock;
      default: return FiFileText;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatTime = (seconds?: number) => {
    if (!seconds) return 'N/A';
    return `${seconds.toFixed(2)}s`;
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* Pipeline Overview Stats */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Total Progress</StatLabel>
              <StatNumber>
                {((pipelineStats.processedDocuments / pipelineStats.totalDocuments) * 100).toFixed(1)}%
              </StatNumber>
              <StatHelpText>
                {pipelineStats.processedDocuments} / {pipelineStats.totalDocuments} documents
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Batch Progress</StatLabel>
              <StatNumber>
                {pipelineStats.completedBatches} / {pipelineStats.totalBatches}
              </StatNumber>
              <StatHelpText>
                {pipelineStats.totalBatches - pipelineStats.completedBatches} batches remaining
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Current Batch</StatLabel>
              <StatNumber>
                {currentBatch ? `#${currentBatch.batchNumber}` : 'N/A'}
              </StatNumber>
              <StatHelpText>
                {currentBatch ? `${currentBatch.completedDocs}/${currentBatch.totalDocs} docs` : 'No active batch'}
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Est. Time Remaining</StatLabel>
              <StatNumber>
                {Math.floor((pipelineStats.totalBatches - pipelineStats.completedBatches) * 0.1)}m
              </StatNumber>
              <StatHelpText>
                ~6s per batch
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Current Batch Details */}
      {currentBatch && (
        <Card>
          <CardHeader>
            <Flex justify="space-between" align="center">
              <HStack>
                <Icon as={FiLayers} boxSize={5} color="blue.500" />
                <Heading size="md">Current Batch #{currentBatch.batchNumber}</Heading>
                <Badge colorScheme={getStatusColor(currentBatch.status)}>
                  {currentBatch.status.toUpperCase()}
                </Badge>
              </HStack>
              <HStack>
                <Button
                  size="sm"
                  leftIcon={<Icon as={FiPlay} />}
                  colorScheme="green"
                  onClick={onStartBatch}
                  isDisabled={currentBatch.status === 'processing'}
                >
                  Start
                </Button>
                <Button
                  size="sm"
                  leftIcon={<Icon as={FiPause} />}
                  colorScheme="orange"
                  onClick={onPauseBatch}
                  isDisabled={currentBatch.status !== 'processing'}
                >
                  Pause
                </Button>
                <Button
                  size="sm"
                  leftIcon={<Icon as={FiSkipForward} />}
                  variant="outline"
                  onClick={onSkipBatch}
                >
                  Skip
                </Button>
              </HStack>
            </Flex>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Progress
                value={(currentBatch.completedDocs / currentBatch.totalDocs) * 100}
                colorScheme="blue"
                size="lg"
                hasStripe
                isAnimated={currentBatch.status === 'processing'}
              />
              
              <Box maxH="400px" overflowY="auto">
                <Table size="sm" variant="simple">
                  <Thead position="sticky" top={0} bg={bgColor} zIndex={1}>
                    <Tr>
                      <Th>Status</Th>
                      <Th>Document</Th>
                      <Th>Size</Th>
                      <Th>Progress</Th>
                      <Th>Entities</Th>
                      <Th>Time</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {currentBatch.documents.map((doc, idx) => (
                      <Tr
                        key={idx}
                        bg={doc.status === 'processing' ? hoverBg : undefined}
                        _hover={{ bg: hoverBg }}
                      >
                        <Td>
                          <Tooltip label={doc.status}>
                            <Icon
                              as={getStatusIcon(doc.status)}
                              color={`${getStatusColor(doc.status)}.500`}
                              boxSize={4}
                            />
                          </Tooltip>
                        </Td>
                        <Td>
                          <Tooltip label={doc.path}>
                            <Text fontSize="sm" isTruncated maxW="300px">
                              {doc.name}
                            </Text>
                          </Tooltip>
                        </Td>
                        <Td>
                          <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                            {formatFileSize(doc.size)}
                          </Text>
                        </Td>
                        <Td>
                          {doc.status === 'processing' && doc.progress ? (
                            <HStack spacing={2}>
                              <Progress
                                value={doc.progress}
                                size="sm"
                                colorScheme="blue"
                                w="60px"
                              />
                              <Text fontSize="xs">{doc.progress}%</Text>
                            </HStack>
                          ) : (
                            <Text fontSize="sm" color={useSemanticToken('text.tertiary')}>-</Text>
                          )}
                        </Td>
                        <Td>
                          <Text fontSize="sm">
                            {doc.entities ? doc.entities : '-'}
                          </Text>
                        </Td>
                        <Td>
                          <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                            {formatTime(doc.processingTime)}
                          </Text>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            </VStack>
          </CardBody>
        </Card>
      )}

      {/* Upcoming Batches */}
      <Card>
        <CardHeader>
          <HStack>
            <Icon as={FiClock} boxSize={5} color="orange.500" />
            <Heading size="md">Upcoming Batches</Heading>
            <Badge colorScheme="orange">{upcomingBatches.length} queued</Badge>
          </HStack>
        </CardHeader>
        <CardBody>
          <Accordion allowMultiple>
            {upcomingBatches.map((batch, idx) => (
              <AccordionItem key={idx} border="none" mb={2}>
                <AccordionButton
                  bg={bgColor}
                  border="1px solid"
                  borderColor={borderColor}
                  borderRadius="md"
                  _hover={{ bg: hoverBg }}
                >
                  <Box flex="1" textAlign="left">
                    <HStack>
                      <Text fontWeight="bold">Batch #{batch.batchNumber}</Text>
                      <Badge colorScheme="gray">{batch.totalDocs} documents</Badge>
                      <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                        ~{(batch.totalDocs * 0.3).toFixed(0)}s estimated
                      </Text>
                    </HStack>
                  </Box>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel pb={4}>
                  <VStack align="stretch" spacing={1}>
                    {batch.documents.slice(0, 5).map((doc, docIdx) => (
                      <HStack key={docIdx} fontSize="sm" color={useSemanticToken('text.secondary')}>
                        <Icon as={FiFileText} boxSize={3} />
                        <Text isTruncated>{doc.name}</Text>
                        <Text color={useSemanticToken('text.tertiary')}>({formatFileSize(doc.size)})</Text>
                      </HStack>
                    ))}
                    {batch.documents.length > 5 && (
                      <Text fontSize="sm" color={useSemanticToken('text.secondary')} fontStyle="italic">
                        ... and {batch.documents.length - 5} more documents
                      </Text>
                    )}
                  </VStack>
                </AccordionPanel>
              </AccordionItem>
            ))}
          </Accordion>
        </CardBody>
      </Card>

      {/* Completed Batches */}
      {completedBatches.length > 0 && (
        <Card>
          <CardHeader>
            <HStack>
              <Icon as={FiCheckCircle} boxSize={5} color="green.500" />
              <Heading size="md">Recently Completed</Heading>
              <Badge colorScheme="green">{completedBatches.length} batches</Badge>
            </HStack>
          </CardHeader>
          <CardBody>
            <VStack align="stretch" spacing={3}>
              {completedBatches.map((batch, idx) => (
                <Flex
                  key={idx}
                  p={3}
                  border="1px solid"
                  borderColor={borderColor}
                  borderRadius="md"
                  justify="space-between"
                  align="center"
                >
                  <HStack>
                    <Icon as={FiCheckCircle} color="green.500" />
                    <Text fontWeight="bold">Batch #{batch.batchNumber}</Text>
                    <Badge colorScheme="green">Completed</Badge>
                  </HStack>
                  <HStack spacing={4}>
                    <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                      {batch.totalDocs} documents
                    </Text>
                    <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                      {batch.endTime && batch.startTime
                        ? `${((new Date(batch.endTime).getTime() - new Date(batch.startTime).getTime()) / 1000).toFixed(1)}s`
                        : 'N/A'}
                    </Text>
                  </HStack>
                </Flex>
              ))}
            </VStack>
          </CardBody>
        </Card>
      )}
    </VStack>
  );
};

export default IngestionPipelineVisualization;
