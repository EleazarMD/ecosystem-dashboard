import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Flex,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Button,
  HStack,
  VStack,
  useToast,
  Icon,
  Spinner,
  Badge,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  StatGroup,
  SimpleGrid,
  Card,
  CardBody,
  CardHeader,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  List,
  ListItem,
  ListIcon,
  Divider,
} from '@chakra-ui/react';
import { FiAlertTriangle, FiCheckCircle, FiRefreshCw, FiTrendingUp, FiTrendingDown, FiCopy, FiTarget } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface DuplicateGroup {
  groupSize: number;
  documents: Array<{
    path: string;
    entities: number;
    similarity: number;
  }>;
  recommendation: {
    action: string;
    keep: string;
    remove: string[];
    reason: string;
  };
}

interface EntityInconsistency {
  type: string;
  normalizedName: string;
  variants: string[];
  occurrences: number;
}

interface PortConflict {
  type: string;
  port: string;
  conflictingAssignments: Array<{
    document: string;
    entity: string;
    context: any;
  }>;
  severity: string;
}

interface ConsistencyReport {
  analysisTimestamp: string;
  documentsAnalyzed: number;
  summary: {
    duplicateGroups: number;
    totalDuplicates: number;
    entityInconsistencies: number;
    portConflicts: number;
  };
  duplicates: DuplicateGroup[];
  inconsistencies: EntityInconsistency[];
  conflicts: PortConflict[];
  recommendations: Array<{
    type: string;
    priority: string;
    message: string;
    action: string;
  }>;
}

const ConsistencyAnalysis: React.FC = () => {
  const [report, setReport] = useState<ConsistencyReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const cardBg = useSemanticToken('surface.base');

  const loadAnalysisReport = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Try to load the latest consistency analysis report
      const response = await fetch('/api/knowledge-graph/consistency-analysis');
      
      if (!response.ok) {
        throw new Error(`Failed to load analysis: ${response.statusText}`);
      }
      
      const data = await response.json();
      setReport(data);
    } catch (err: any) {
      console.error('Error loading consistency analysis:', err);
      setError(err.message);
      
      // Load sample data for demonstration
      setReport(getSampleReport());
    } finally {
      setIsLoading(false);
    }
  };

  const runNewAnalysis = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/knowledge-graph/run-consistency-analysis', {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to run analysis: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      toast({
        title: 'Analysis Complete',
        description: `Analyzed ${result.documentsAnalyzed} documents`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Reload the report
      await loadAnalysisReport();
    } catch (err: any) {
      console.error('Error running analysis:', err);
      toast({
        title: 'Analysis Failed',
        description: err.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  useEffect(() => {
    loadAnalysisReport();
  }, []);

  const getSampleReport = (): ConsistencyReport => ({
    analysisTimestamp: new Date().toISOString(),
    documentsAnalyzed: 14,
    summary: {
      duplicateGroups: 5,
      totalDuplicates: 6,
      entityInconsistencies: 1,
      portConflicts: 0
    },
    duplicates: [
      {
        groupSize: 2,
        documents: [
          { path: 'agents/agent-development-environment/README.md', entities: 2, similarity: 1.0 },
          { path: 'agents/agent-development-environment/README.md', entities: 2, similarity: 1.0 }
        ],
        recommendation: {
          action: 'consolidate',
          keep: 'agents/agent-development-environment/README.md',
          remove: ['agents/agent-development-environment/README.md'],
          reason: 'Keep document with most entities (2)'
        }
      }
    ],
    inconsistencies: [
      {
        type: 'entity_naming',
        normalizedName: '8888',
        variants: ['8888"', '8888'],
        occurrences: 2
      }
    ],
    conflicts: [],
    recommendations: [
      {
        type: 'duplicates',
        priority: 'high',
        message: 'Found 5 duplicate groups. Review and consolidate to improve knowledge graph quality.',
        action: 'Review duplicate recommendations and remove redundant documents'
      },
      {
        type: 'consistency',
        priority: 'medium', 
        message: 'Found 1 entity naming inconsistencies. Standardize naming conventions.',
        action: 'Establish entity naming standards and normalize existing entities'
      }
    ]
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'red';
      case 'medium': return 'orange';
      case 'low': return 'green';
      default: return 'gray';
    }
  };

  const getQualityScore = () => {
    if (!report) return 0;
    
    const totalIssues = report.summary.duplicateGroups + report.summary.entityInconsistencies + report.summary.portConflicts;
    const maxPossibleIssues = report.documentsAnalyzed; // Rough estimate
    
    return Math.max(0, Math.round((1 - totalIssues / maxPossibleIssues) * 100));
  };

  if (isLoading && !report) {
    return (
      <Box p={6} textAlign="center">
        <Spinner size="xl" />
        <Text mt={4}>Loading consistency analysis...</Text>
      </Box>
    );
  }

  return (
    <Box p={6}>
      <Flex justify="space-between" align="center" mb={6}>
        <Box>
          <Heading as="h2" size="lg">Document Consistency Analysis</Heading>
          <Text color={useSemanticToken('text.secondary')}>
            Detect duplicates, inconsistencies, and quality issues
          </Text>
        </Box>
        <HStack>
          <Button
            leftIcon={<Icon as={FiRefreshCw} />}
            onClick={runNewAnalysis}
            isLoading={isLoading}
            colorScheme="blue"
          >
            Run Analysis
          </Button>
        </HStack>
      </Flex>

      {error && (
        <Alert status="warning" mb={6}>
          <AlertIcon />
          <Box flex="1">
            <AlertTitle>Using sample data</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Box>
        </Alert>
      )}

      {report && (
        <VStack spacing={6} align="stretch">
          {/* Summary Statistics */}
          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
            <Card bg={cardBg}>
              <CardBody>
                <Stat>
                  <StatLabel>Documents Analyzed</StatLabel>
                  <StatNumber>{report.documentsAnalyzed}</StatNumber>
                  <StatHelpText>
                    <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                      {new Date(report.analysisTimestamp).toLocaleDateString()}
                    </Text>
                  </StatHelpText>
                </Stat>
              </CardBody>
            </Card>

            <Card bg={cardBg}>
              <CardBody>
                <Stat>
                  <StatLabel>Quality Score</StatLabel>
                  <StatNumber>{getQualityScore()}%</StatNumber>
                  <StatHelpText>
                    <StatArrow type={getQualityScore() > 80 ? 'increase' : 'decrease'} />
                    Knowledge graph quality
                  </StatHelpText>
                </Stat>
              </CardBody>
            </Card>

            <Card bg={cardBg}>
              <CardBody>
                <Stat>
                  <StatLabel>Duplicate Groups</StatLabel>
                  <StatNumber color={report.summary.duplicateGroups > 0 ? 'red.500' : 'green.500'}>
                    {report.summary.duplicateGroups}
                  </StatNumber>
                  <StatHelpText>{report.summary.totalDuplicates} total duplicates</StatHelpText>
                </Stat>
              </CardBody>
            </Card>

            <Card bg={cardBg}>
              <CardBody>
                <Stat>
                  <StatLabel>Issues Found</StatLabel>
                  <StatNumber color={report.summary.entityInconsistencies + report.summary.portConflicts > 0 ? 'orange.500' : 'green.500'}>
                    {report.summary.entityInconsistencies + report.summary.portConflicts}
                  </StatNumber>
                  <StatHelpText>Inconsistencies + Conflicts</StatHelpText>
                </Stat>
              </CardBody>
            </Card>
          </SimpleGrid>

          {/* Quality Progress */}
          <Card>
            <CardHeader>
              <Heading size="md">Knowledge Graph Health</Heading>
            </CardHeader>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Box>
                  <Flex justify="space-between" mb={2}>
                    <Text>Overall Quality</Text>
                    <Text fontWeight="bold">{getQualityScore()}%</Text>
                  </Flex>
                  <Progress 
                    value={getQualityScore()} 
                    colorScheme={getQualityScore() > 80 ? 'green' : getQualityScore() > 60 ? 'orange' : 'red'}
                    size="lg"
                  />
                </Box>
                
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                  <Box textAlign="center">
                    <Icon as={FiCopy} boxSize={6} color={report.summary.duplicateGroups === 0 ? 'green.500' : 'red.500'} />
                    <Text mt={1} fontWeight="bold">Duplicates</Text>
                    <Badge colorScheme={report.summary.duplicateGroups === 0 ? 'green' : 'red'}>
                      {report.summary.duplicateGroups === 0 ? 'Clean' : `${report.summary.duplicateGroups} Groups`}
                    </Badge>
                  </Box>
                  
                  <Box textAlign="center">
                    <Icon as={FiTarget} boxSize={6} color={report.summary.entityInconsistencies === 0 ? 'green.500' : 'orange.500'} />
                    <Text mt={1} fontWeight="bold">Consistency</Text>
                    <Badge colorScheme={report.summary.entityInconsistencies === 0 ? 'green' : 'orange'}>
                      {report.summary.entityInconsistencies === 0 ? 'Consistent' : `${report.summary.entityInconsistencies} Issues`}
                    </Badge>
                  </Box>
                  
                  <Box textAlign="center">
                    <Icon as={FiAlertTriangle} boxSize={6} color={report.summary.portConflicts === 0 ? 'green.500' : 'red.500'} />
                    <Text mt={1} fontWeight="bold">Conflicts</Text>
                    <Badge colorScheme={report.summary.portConflicts === 0 ? 'green' : 'red'}>
                      {report.summary.portConflicts === 0 ? 'None' : `${report.summary.portConflicts} Conflicts`}
                    </Badge>
                  </Box>
                </SimpleGrid>
              </VStack>
            </CardBody>
          </Card>

          {/* Recommendations */}
          {report.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <Heading size="md">Recommendations</Heading>
              </CardHeader>
              <CardBody>
                <VStack spacing={3} align="stretch">
                  {report.recommendations.map((rec, index) => (
                    <Alert
                      key={index}
                      status={rec.priority === 'high' ? 'error' : rec.priority === 'medium' ? 'warning' : 'info'}
                      variant="left-accent"
                    >
                      <AlertIcon />
                      <Box flex="1">
                        <AlertTitle textTransform="capitalize">
                          {rec.type} - {rec.priority} Priority
                        </AlertTitle>
                        <AlertDescription display="block">
                          <Text mb={1}>{rec.message}</Text>
                          <Text fontSize="sm" fontStyle="italic">Action: {rec.action}</Text>
                        </AlertDescription>
                      </Box>
                    </Alert>
                  ))}
                </VStack>
              </CardBody>
            </Card>
          )}

          {/* Detailed Issues */}
          <Accordion allowMultiple>
            {report.duplicates.length > 0 && (
              <AccordionItem>
                <AccordionButton>
                  <Box flex="1" textAlign="left">
                    <Flex align="center">
                      <Icon as={FiCopy} mr={2} />
                      <Text fontWeight="bold">Duplicate Groups ({report.duplicates.length})</Text>
                      <Badge ml={2} colorScheme="red">{report.summary.totalDuplicates} duplicates</Badge>
                    </Flex>
                  </Box>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel pb={4}>
                  <VStack spacing={4} align="stretch">
                    {report.duplicates.map((group, index) => (
                      <Box key={index} p={4} borderWidth={1} borderRadius="md" bg={cardBg}>
                        <Text fontWeight="bold" mb={2}>Group {index + 1} ({group.groupSize} documents)</Text>
                        
                        <VStack spacing={2} align="stretch" mb={3}>
                          {group.documents.map((doc, docIndex) => (
                            <Flex key={docIndex} justify="space-between" align="center" p={2} bg={bgColor} borderRadius="md">
                              <Text fontSize="sm" fontFamily="mono">{doc.path}</Text>
                              <HStack>
                                <Badge colorScheme="blue">{doc.entities} entities</Badge>
                                <Badge colorScheme="purple">{(doc.similarity * 100).toFixed(0)}% similar</Badge>
                              </HStack>
                            </Flex>
                          ))}
                        </VStack>
                        
                        <Box p={3} bg="green.50" borderRadius="md" borderLeftWidth={4} borderLeftColor="green.500">
                          <Text fontWeight="bold" color="green.800" mb={1}>Recommendation: {group.recommendation.action}</Text>
                          <Text fontSize="sm" color="green.700" mb={1}>
                            <strong>Keep:</strong> {group.recommendation.keep}
                          </Text>
                          <Text fontSize="sm" color="green.700" mb={1}>
                            <strong>Remove:</strong> {group.recommendation.remove.join(', ')}
                          </Text>
                          <Text fontSize="sm" color="green.700">
                            <strong>Reason:</strong> {group.recommendation.reason}
                          </Text>
                        </Box>
                      </Box>
                    ))}
                  </VStack>
                </AccordionPanel>
              </AccordionItem>
            )}

            {report.inconsistencies.length > 0 && (
              <AccordionItem>
                <AccordionButton>
                  <Box flex="1" textAlign="left">
                    <Flex align="center">
                      <Icon as={FiTarget} mr={2} />
                      <Text fontWeight="bold">Entity Inconsistencies ({report.inconsistencies.length})</Text>
                    </Flex>
                  </Box>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel pb={4}>
                  <List spacing={3}>
                    {report.inconsistencies.map((inc, index) => (
                      <ListItem key={index}>
                        <Flex align="center" justify="space-between">
                          <Box>
                            <Text fontWeight="bold">{inc.normalizedName}</Text>
                            <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                              Variants: {inc.variants.join(', ')}
                            </Text>
                          </Box>
                          <Badge colorScheme="orange">{inc.occurrences} occurrences</Badge>
                        </Flex>
                      </ListItem>
                    ))}
                  </List>
                </AccordionPanel>
              </AccordionItem>
            )}

            {report.conflicts.length > 0 && (
              <AccordionItem>
                <AccordionButton>
                  <Box flex="1" textAlign="left">
                    <Flex align="center">
                      <Icon as={FiAlertTriangle} mr={2} />
                      <Text fontWeight="bold">Port Conflicts ({report.conflicts.length})</Text>
                    </Flex>
                  </Box>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel pb={4}>
                  {/* Port conflicts content would go here */}
                  <Text>Port conflicts will be displayed here when detected.</Text>
                </AccordionPanel>
              </AccordionItem>
            )}
          </Accordion>
        </VStack>
      )}
    </Box>
  );
};

export default ConsistencyAnalysis;
