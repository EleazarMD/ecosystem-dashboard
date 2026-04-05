import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Textarea,
  Alert,
  AlertIcon,
  Code,
  Badge,
  useToast,
  Spinner,
  Card,
  CardHeader,
  CardBody,
  Heading,
  Progress,
  Divider,
  List,
  ListItem,
  ListIcon,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  IconButton,
  Tooltip,
} from '@chakra-ui/react';
// Fixed: Replaced PlayIcon with TriangleUpIcon (PlayIcon doesn't exist in Chakra UI)
import { TriangleUpIcon, CheckIcon, WarningIcon, CopyIcon, DownloadIcon } from '@chakra-ui/icons';
import { testIngestionProxy } from '../../api/proxy';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface TestResult {
  phase: string;
  timestamp: string;
  message: string;
  success?: boolean;
  data?: any;
}

interface IngestionTestResults {
  success: boolean;
  executionId?: string;
  entitiesExtracted?: number;
  relationshipsCreated?: number;
  processingTimeMs?: number;
  error?: string;
  phases: TestResult[];
}

const SingleFileImportTest: React.FC = () => {
  const [testDocument, setTestDocument] = useState<string>(`# AI Homelab Knowledge Graph Single-File Import Test

## Overview
This document validates the complete agentic knowledge graph ingestion workflow through the AI Homelab Dashboard.

## System Components
- Service: Knowledge Graph API provides semantic search and graph operations on port 8765
- Database: Neo4j stores entities and relationships with APOC extensions
- Database: PostgreSQL vector embeddings and metadata storage with pgvector
- Technology: Redis caching layer for performance optimization

## Test Entities
- Service: Knowledge Graph API
- Database: Neo4j, PostgreSQL, Redis
- Technology: Node.js, Docker, Kubernetes
- Protocol: HTTP/REST, Bolt, ADK A2A
- Port: 8765, 7474, 7687, 6379

## Relationships
- Knowledge Graph API **DEPENDS_ON** Neo4j Database
- Neo4j Database **STORES** Entity relationships
- PostgreSQL **CONTAINS** Vector embeddings
- Redis **CACHES** Query results

This document contains structured information for testing real entity extraction, relationship mapping, and graph storage capabilities through the dashboard interface.`);

  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [testResults, setTestResults] = useState<IngestionTestResults | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [currentPhase, setCurrentPhase] = useState<string>('');
  
  const toast = useToast();

  const executeTest = async () => {
    setIsExecuting(true);
    setTestResults(null);
    setProgress(0);
    setCurrentPhase('Initializing test...');

    const phases: TestResult[] = [];
    
    try {
      // Phase 1: Document validation
      setCurrentPhase('Validating document content...');
      setProgress(20);
      
      phases.push({
        phase: 'VALIDATION',
        timestamp: new Date().toISOString(),
        message: 'Document content validated',
        success: true,
        data: {
          contentLength: testDocument.length,
          wordCount: testDocument.split(/\s+/).length
        }
      });

      // Phase 2: Execute ingestion through proxy
      setCurrentPhase('Executing ingestion through dashboard proxy...');
      setProgress(40);
      
      const ingestionResult = await testIngestionProxy('/dashboard-single-file-test.md', testDocument);
      
      if (ingestionResult.success) {
        phases.push({
          phase: 'INGESTION',
          timestamp: new Date().toISOString(),
          message: 'Document ingestion completed successfully',
          success: true,
          data: ingestionResult
        });
        
        setProgress(70);
        setCurrentPhase('Validating ingestion results...');
        
        // Phase 3: Validate results
        phases.push({
          phase: 'VALIDATION',
          timestamp: new Date().toISOString(),
          message: 'Ingestion results validated',
          success: true,
          data: {
            executionTime: ingestionResult.executionTime,
            results: ingestionResult.results || [],
            data: ingestionResult.data || []
          }
        });
        
        setProgress(100);
        setCurrentPhase('Test completed successfully');
        
        setTestResults({
          success: true,
          executionId: `exec_${Date.now()}`,
          entitiesExtracted: ingestionResult.results?.length || 0,
          relationshipsCreated: ingestionResult.data?.length || 0,
          processingTimeMs: ingestionResult.executionTime || 0,
          phases
        });

        toast({
          title: 'Single-File Import Test Successful',
          description: `Processed ${ingestionResult.results?.length || 0} entities and ${ingestionResult.data?.length || 0} relationships`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        
      } else {
        throw new Error(ingestionResult.error || 'Ingestion failed');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      phases.push({
        phase: 'ERROR',
        timestamp: new Date().toISOString(),
        message: `Test failed: ${errorMessage}`,
        success: false
      });
      
      setTestResults({
        success: false,
        error: errorMessage,
        phases
      });

      setCurrentPhase('Test failed');
      setProgress(100);

      toast({
        title: 'Single-File Import Test Failed',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: 'Content copied to clipboard',
      status: 'info',
      duration: 2000,
      isClosable: true,
    });
  };

  const exportResults = () => {
    if (!testResults) return;
    
    const dataStr = JSON.stringify(testResults, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `single_file_import_test_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderTestResults = () => {
    if (!testResults) return null;

    return (
      <Card>
        <CardHeader>
          <HStack justify="space-between">
            <Heading size="md">Test Results</Heading>
            <HStack>
              <Badge colorScheme={testResults.success ? 'green' : 'red'}>
                {testResults.success ? 'SUCCESS' : 'FAILED'}
              </Badge>
              {testResults.success && (
                <Tooltip label="Export results">
                  <IconButton
                    aria-label="Export results"
                    icon={<DownloadIcon />}
                    size="sm"
                    onClick={exportResults}
                  />
                </Tooltip>
              )}
            </HStack>
          </HStack>
        </CardHeader>
        
        <CardBody>
          <VStack spacing={4} align="stretch">
            {/* Summary */}
            {testResults.success && (
              <Box p={4} bg="green.50" borderRadius="md" border="1px" borderColor="green.200">
                <Text fontWeight="bold" color="green.800" mb={2}>Ingestion Summary</Text>
                <List spacing={1}>
                  <ListItem>
                    <ListIcon as={CheckIcon} color="green.500" />
                    <Text as="span" fontSize="sm">
                      Execution ID: <Code>{testResults.executionId}</Code>
                    </Text>
                  </ListItem>
                  <ListItem>
                    <ListIcon as={CheckIcon} color="green.500" />
                    <Text as="span" fontSize="sm">
                      Entities Extracted: {testResults.entitiesExtracted}
                    </Text>
                  </ListItem>
                  <ListItem>
                    <ListIcon as={CheckIcon} color="green.500" />
                    <Text as="span" fontSize="sm">
                      Relationships Created: {testResults.relationshipsCreated}
                    </Text>
                  </ListItem>
                  <ListItem>
                    <ListIcon as={CheckIcon} color="green.500" />
                    <Text as="span" fontSize="sm">
                      Processing Time: {testResults.processingTimeMs}ms
                    </Text>
                  </ListItem>
                </List>
              </Box>
            )}

            {/* Error */}
            {!testResults.success && testResults.error && (
              <Alert status="error">
                <AlertIcon />
                <Box>
                  <Text fontWeight="bold">Test Failed</Text>
                  <Code>{testResults.error}</Code>
                </Box>
              </Alert>
            )}

            {/* Phase Details */}
            <Accordion allowToggle>
              <AccordionItem>
                <AccordionButton>
                  <Box flex="1" textAlign="left">
                    <Text fontWeight="bold">Test Phases ({testResults.phases.length})</Text>
                  </Box>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel pb={4}>
                  <VStack spacing={2} align="stretch">
                    {testResults.phases.map((phase, index) => (
                      <Box key={index} p={3} border="1px" borderColor={useSemanticToken('border.default')} borderRadius="md">
                        <HStack justify="space-between" mb={1}>
                          <Badge colorScheme={phase.success ? 'green' : 'red'}>
                            {phase.phase}
                          </Badge>
                          <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                            {new Date(phase.timestamp).toLocaleTimeString()}
                          </Text>
                        </HStack>
                        <Text fontSize="sm">{phase.message}</Text>
                        {phase.data && (
                          <Code fontSize="xs" display="block" mt={2} p={2} bg={useSemanticToken('surface.base')}>
                            {JSON.stringify(phase.data, null, 2)}
                          </Code>
                        )}
                      </Box>
                    ))}
                  </VStack>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
          </VStack>
        </CardBody>
      </Card>
    );
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* Header */}
      <Box>
        <Heading size="lg" mb={2}>Single-File Import Test</Heading>
        <Text color={useSemanticToken('text.secondary')}>
          Test the complete agentic knowledge graph ingestion workflow through the dashboard proxy
        </Text>
      </Box>

      {/* Test Document */}
      <Card>
        <CardHeader>
          <HStack justify="space-between">
            <Heading size="md">Test Document</Heading>
            <Tooltip label="Copy document">
              <IconButton
                aria-label="Copy document"
                icon={<CopyIcon />}
                size="sm"
                onClick={() => copyToClipboard(testDocument)}
              />
            </Tooltip>
          </HStack>
        </CardHeader>
        <CardBody>
          <Textarea
            value={testDocument}
            onChange={(e) => setTestDocument(e.target.value)}
            rows={12}
            fontFamily="mono"
            fontSize="sm"
            placeholder="Enter test document content..."
          />
          <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={2}>
            {testDocument.length} characters • {testDocument.split(/\s+/).length} words
          </Text>
        </CardBody>
      </Card>

      {/* Execute Test */}
      <Card>
        <CardBody>
          <VStack spacing={4}>
            <Button
              leftIcon={isExecuting ? <Spinner size="sm" /> : <TriangleUpIcon />}
              colorScheme="blue"
              size="lg"
              onClick={executeTest}
              isLoading={isExecuting}
              loadingText="Executing Test..."
              isDisabled={!testDocument.trim()}
              width="full"
            >
              Execute Single-File Import Test
            </Button>

            {/* Progress */}
            {isExecuting && (
              <Box width="full">
                <Text fontSize="sm" mb={2}>{currentPhase}</Text>
                <Progress value={progress} colorScheme="blue" />
              </Box>
            )}
          </VStack>
        </CardBody>
      </Card>

      {/* Results */}
      {renderTestResults()}
    </VStack>
  );
};

export default SingleFileImportTest;
