/**
 * Knowledge Graph Query Interface - Enhanced Visual Design
 * 
 * This component provides a modern, AI-powered interface for querying
 * the Knowledge Graph with rich visual outputs and intuitive layout.
 */

import React, { useState, useCallback } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  VStack,
  HStack,
  Text,
  Textarea,
  Button,
  Badge,
  Card,
  CardHeader,
  CardBody,
  Heading,
  Alert,
  AlertIcon,
  Spinner,
  SimpleGrid,
  Input,
  InputGroup,
  InputLeftElement,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useToast,
  Divider,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Flex,
  Icon,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Tag,
  TagLabel,
  TagLeftIcon,
  Wrap,
  WrapItem,
  Progress,
  IconButton,
  Tooltip,
  Collapse,
  useDisclosure
} from '@chakra-ui/react';
import {
  SearchIcon, 
  TimeIcon, 
  RepeatIcon,
  ChatIcon,
  StarIcon,
  ViewIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  InfoIcon
} from '@chakra-ui/icons';

interface QueryResult {
  id: string;
  query: string;
  type: 'natural' | 'cypher';
  results: any[];
  timestamp: Date;
  executionTime: number;
  error?: string;
}

interface QuerySuggestion {
  text: string;
  description: string;
  category: 'exploration' | 'analysis' | 'search';
  icon?: string;
}

interface ChakraKnowledgeQueryInterfaceProps {
  onQueryExecute?: (query: string, type: 'natural' | 'cypher') => Promise<any[]>;
  onVisualize?: (results: any[]) => void;
}

const ChakraKnowledgeQueryInterface: React.FC<ChakraKnowledgeQueryInterfaceProps> = ({
  onQueryExecute,
  onVisualize
}) => {
  const toast = useToast();
  const { isOpen: isHistoryOpen, onToggle: toggleHistory } = useDisclosure();
  
  // Theme colors
  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const hoverBg = useSemanticToken('surface.hover');
  const suggestionBg = useSemanticToken('surface.highlight');
  const errorBg = useSemanticToken('surface.highlight');
  const tableBg = useSemanticToken('surface.base');
  
  // State
  const [query, setQuery] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [results, setResults] = useState<QueryResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<QueryResult | null>(null);
  
  // Enhanced query suggestions with better categorization
  const querySuggestions: QuerySuggestion[] = [
    {
      text: "Show me all microservices",
      description: "View all microservice components in the ecosystem",
      category: 'exploration',
      icon: '🔧'
    },
    {
      text: "Show me Platform components", 
      description: "Explore platform-level services and infrastructure",
      category: 'exploration',
      icon: '🏗️'
    },
    {
      text: "Show me Development category services",
      description: "Find all development-focused services",
      category: 'search',
      icon: '💻'
    },
    {
      text: "Show me AI category services",
      description: "Discover AI and machine learning services",
      category: 'analysis',
      icon: '🤖'
    },
    {
      text: "Show me Data category services",
      description: "Find data management and processing services",
      category: 'search',
      icon: '📊'
    },
    {
      text: "Show me Security services",
      description: "Explore authentication and security components",
      category: 'analysis',
      icon: '🔐'
    }
  ];

  // Visual result rendering component
  const ResultsVisualization: React.FC<{ result: QueryResult }> = ({ result }) => {
    if (result.error) {
      return (
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <Box>
            <Text fontWeight="bold">Query Error</Text>
            <Text fontSize="sm">{result.error}</Text>
          </Box>
        </Alert>
      );
    }

    if (!result.results || result.results.length === 0) {
      return (
        <Card variant="outline">
          <CardBody textAlign="center" py={12}>
            <InfoIcon boxSize={12} color={useSemanticToken('text.tertiary')} mb={4} />
            <Heading size="md" color={useSemanticToken('text.secondary')} mb={2}>
              No Results Found
            </Heading>
            <Text color={useSemanticToken('text.secondary')}>
              Try refining your query or exploring suggested queries
            </Text>
          </CardBody>
        </Card>
      );
    }

    // Statistics overview
    const stats = {
      total: result.results.length,
      microservices: result.results.filter(r => r.type === 'Microservice').length,
      platforms: result.results.filter(r => r.type === 'Platform').length,
      infrastructure: result.results.filter(r => r.type === 'Infrastructure').length,
      categories: Array.from(new Set(result.results.map(r => r.category))).length
    };

    return (
      <VStack spacing={6} align="stretch">
        {/* Query Statistics */}
        <SimpleGrid columns={{ base: 2, md: 5 }} spacing={4}>
          <Stat>
            <StatLabel>Total Results</StatLabel>
            <StatNumber color="blue.500">{stats.total}</StatNumber>
          </Stat>
          <Stat>
            <StatLabel>Microservices</StatLabel>
            <StatNumber color="green.500">{stats.microservices}</StatNumber>
          </Stat>
          <Stat>
            <StatLabel>Platforms</StatLabel>
            <StatNumber color="purple.500">{stats.platforms}</StatNumber>
          </Stat>
          <Stat>
            <StatLabel>Infrastructure</StatLabel>
            <StatNumber color="orange.500">{stats.infrastructure}</StatNumber>
          </Stat>
          <Stat>
            <StatLabel>Categories</StatLabel>
            <StatNumber color="teal.500">{stats.categories}</StatNumber>
          </Stat>
        </SimpleGrid>

        <Divider />

        {/* Results Table View */}
        <Card>
          <CardHeader>
            <HStack justify="space-between">
              <Heading size="md">Query Results</Heading>
              <Badge colorScheme="blue" variant="subtle">
                {result.results.length} items
              </Badge>
            </HStack>
          </CardHeader>
          <CardBody>
            <TableContainer>
              <Table variant="simple" size="sm">
                <Thead bg={tableBg}>
                  <Tr>
                    <Th>Service Name</Th>
                    <Th>Type</Th>
                    <Th>Category</Th>
                    <Th>Port</Th>
                    <Th>Status</Th>
                    <Th>Technologies</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {result.results.map((item, index) => (
                    <Tr key={item.id || index} _hover={{ bg: hoverBg }}>
                      <Td>
                        <VStack align="start" spacing={1}>
                          <Text fontWeight="medium" fontSize="sm">
                            {item.name || item.id}
                          </Text>
                          {item.description && (
                            <Text fontSize="xs" color={useSemanticToken('text.secondary')} noOfLines={2}>
                              {item.description}
                            </Text>
                          )}
                        </VStack>
                      </Td>
                      <Td>
                        <Badge 
                          colorScheme={
                            item.type === 'Microservice' ? 'green' :
                            item.type === 'Platform' ? 'purple' :
                            item.type === 'Infrastructure' ? 'orange' : 'gray'
                          }
                          variant="subtle"
                        >
                          {item.type}
                        </Badge>
                      </Td>
                      <Td>
                        <Badge 
                          colorScheme={getCategoryColor(item.category)}
                          variant="outline"
                        >
                          {item.category}
                        </Badge>
                      </Td>
                      <Td>
                        <Text fontFamily="mono" fontSize="sm">
                          {item.properties?.port || '-'}
                        </Text>
                      </Td>
                      <Td>
                        <Badge 
                          colorScheme={
                            item.properties?.status === 'running' ? 'green' : 'red'
                          }
                          variant="solid"
                          size="sm"
                        >
                          {item.properties?.status || 'unknown'}
                        </Badge>
                      </Td>
                      <Td>
                        <Wrap spacing={1}>
                          {item.properties?.technologies?.slice(0, 3).map((tech: string, i: number) => (
                            <WrapItem key={i}>
                              <Tag size="sm" variant="subtle" colorScheme="blue">
                                {tech}
                              </Tag>
                            </WrapItem>
                          )) || '-'}
                        </Wrap>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          </CardBody>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <Heading size="md">Category Distribution</Heading>
          </CardHeader>
          <CardBody>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
              {Object.entries(
                result.results.reduce((acc: any, item) => {
                  const category = item.category || 'Unknown';
                  acc[category] = (acc[category] || 0) + 1;
                  return acc;
                }, {})
              ).map(([category, count]) => (
                <Card key={category} variant="outline" size="sm">
                  <CardBody>
                    <Stat>
                      <StatLabel>{category}</StatLabel>
                      <StatNumber color={getCategoryColor(category) + '.500'}>
                        {count as number}
                      </StatNumber>
                      <StatHelpText>
                        {((count as number / result.results.length) * 100).toFixed(1)}%
                      </StatHelpText>
                    </Stat>
                    <Progress
                      value={(count as number / result.results.length) * 100}
                      colorScheme={getCategoryColor(category)}
                      size="sm"
                      mt={2}
                    />
                  </CardBody>
                </Card>
              ))}
            </SimpleGrid>
          </CardBody>
        </Card>
      </VStack>
    );
  };

  // Execute query
  const handleExecuteQuery = useCallback(async () => {
    if (!query.trim()) {
      toast({
        title: "Query Required",
        description: "Please enter a query to execute",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    console.log('Executing query:', query);
    setIsExecuting(true);
    const startTime = Date.now();
    
    try {
      console.log('Sending request to /api/knowledge-graph/query');
      
      const response = await fetch('/api/knowledge-graph/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query,
          output_format: 'inline'
        }),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Response data:', data);
      
      const executionTime = Date.now() - startTime;
      const queryResult: QueryResult = {
        id: `query_${Date.now()}`,
        query,
        type: 'natural',
        results: data.results || [],
        timestamp: new Date(),
        executionTime,
        error: data.success === false ? data.error : undefined
      };

      setResults(prev => [queryResult, ...prev]);
      setSelectedResult(queryResult);
      
      toast({
        title: "Query Executed Successfully",
        description: `Found ${data.results?.length || 0} results in ${executionTime}ms`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });

    } catch (error) {
      console.error('Query execution failed:', error);
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      const queryResult: QueryResult = {
        id: `query_${Date.now()}`,
        query,
        type: 'natural',
        results: [],
        timestamp: new Date(),
        executionTime,
        error: errorMessage
      };

      setResults(prev => [queryResult, ...prev]);
      setSelectedResult(queryResult);
      
      toast({
        title: "Query Failed",
        description: errorMessage,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsExecuting(false);
    }
  }, [query, toast]);

  const handleSuggestionClick = (suggestion: QuerySuggestion) => {
    setQuery(suggestion.text);
  };

  const formatExecutionTime = (ms: number): string => {
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;
  };

  const getCategoryColor = (category: string) => {
    const colorMap: Record<string, string> = {
      'Development': 'blue',
      'Registry': 'green', 
      'Data': 'purple',
      'Integration': 'orange',
      'AI': 'red',
      'Security': 'pink',
      'Infrastructure': 'teal',
      'Orchestration': 'cyan',
      'Management': 'yellow'
    };
    return colorMap[category] || 'gray';
  };

  return (
    <VStack spacing={6} align="stretch" maxW="100%">
      {/* Query Input Section - Top Priority */}
      <Card>
        <CardHeader>
          <HStack>
            <SearchIcon color="blue.500" />
            <Heading size="md">Knowledge Graph Query</Heading>
          </HStack>
        </CardHeader>
        <CardBody>
          <VStack spacing={4} align="stretch">
            <Textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything about your AI Homelab Ecosystem... 
Example: 'Show me all microservices' or 'What AI services are running?'"
              size="lg"
              minHeight="100px"
              resize="vertical"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleExecuteQuery();
                }
              }}
            />
            
            <HStack>
              <Button
                leftIcon={<SearchIcon />}
                colorScheme="blue"
                onClick={handleExecuteQuery}
                isLoading={isExecuting}
                loadingText="Querying..."
                size="lg"
                flex={1}
              >
                Execute Query
              </Button>
              
              {results.length > 0 && (
                <Tooltip label="View query history">
                  <IconButton
                    aria-label="Toggle history"
                    icon={isHistoryOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
                    onClick={toggleHistory}
                    variant="outline"
                    size="lg"
                  />
                </Tooltip>
              )}
            </HStack>
          </VStack>
        </CardBody>
      </Card>

      {/* Quick Suggestions - Compact Design */}
      <Card>
        <CardHeader>
          <HStack>
            <StarIcon color="yellow.500" />
            <Heading size="sm">Quick Queries</Heading>
          </HStack>
        </CardHeader>
        <CardBody>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={3}>
            {querySuggestions.map((suggestion, index) => (
              <Card
                key={index}
                variant="outline"
                cursor="pointer"
                onClick={() => handleSuggestionClick(suggestion)}
                _hover={{ borderColor: 'blue.300', transform: 'translateY(-2px)' }}
                transition="all 0.2s"
                size="sm"
              >
                <CardBody p={3}>
                  <HStack>
                    <Text fontSize="lg">{suggestion.icon}</Text>
                    <VStack align="start" spacing={1} flex={1}>
                      <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                        {suggestion.text}
                      </Text>
                      <Text fontSize="xs" color={useSemanticToken('text.secondary')} noOfLines={2}>
                        {suggestion.description}
                      </Text>
                    </VStack>
                    <Badge size="xs" colorScheme={getCategoryColor(suggestion.category)}>
                      {suggestion.category}
                    </Badge>
                  </HStack>
                </CardBody>
              </Card>
            ))}
          </SimpleGrid>
        </CardBody>
      </Card>

      {/* Query Results - Enhanced Visual Display */}
      {selectedResult && (
        <Card>
          <CardHeader>
            <HStack justify="space-between">
              <VStack align="start" spacing={1}>
                <Heading size="md">Query Results</Heading>
                <HStack spacing={2}>
                  <Badge colorScheme="blue" variant="outline">
                    {selectedResult.query}
                  </Badge>
                  <Badge colorScheme="green" variant="outline">
                    {formatExecutionTime(selectedResult.executionTime)}
                  </Badge>
                  <Badge colorScheme="purple" variant="outline">
                    {selectedResult.timestamp.toLocaleTimeString()}
                  </Badge>
                </HStack>
              </VStack>
              
              {selectedResult.results.length > 0 && onVisualize && (
                <Button
                  leftIcon={<ViewIcon />}
                  colorScheme="purple"
                  variant="outline"
                  onClick={() => onVisualize(selectedResult.results)}
                  size="sm"
                >
                  Visualize
                </Button>
              )}
            </HStack>
          </CardHeader>
          <CardBody>
            <ResultsVisualization result={selectedResult} />
          </CardBody>
        </Card>
      )}

      {/* Query History - Collapsible */}
      <Collapse in={isHistoryOpen}>
        {results.length > 1 && (
          <Card>
            <CardHeader>
              <HStack>
                <TimeIcon color={useSemanticToken('text.secondary')} />
                <Heading size="md">Query History</Heading>
                <Badge variant="subtle">{results.length - 1} previous</Badge>
              </HStack>
            </CardHeader>
            <CardBody>
              <VStack spacing={2} align="stretch" maxH="300px" overflowY="auto">
                {results.slice(1).map((result) => (
                  <Card
                    key={result.id}
                    variant="outline"
                    cursor="pointer"
                    onClick={() => setSelectedResult(result)}
                    _hover={{ borderColor: 'blue.300' }}
                    bg={selectedResult?.id === result.id ? suggestionBg : 'transparent'}
                    size="sm"
                  >
                    <CardBody p={3}>
                      <HStack justify="space-between">
                        <VStack align="start" spacing={1} flex={1}>
                          <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                            {result.query}
                          </Text>
                          <HStack spacing={2}>
                            <Badge size="xs" colorScheme={result.error ? 'red' : 'green'}>
                              {result.error ? 'Error' : `${result.results.length} results`}
                            </Badge>
                            <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                              {formatExecutionTime(result.executionTime)}
                            </Text>
                          </HStack>
                        </VStack>
                        <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                          {result.timestamp.toLocaleTimeString()}
                        </Text>
                      </HStack>
                    </CardBody>
                  </Card>
                ))}
              </VStack>
            </CardBody>
          </Card>
        )}
      </Collapse>

      {/* Empty State */}
      {!selectedResult && results.length === 0 && (
        <Card>
          <CardBody textAlign="center" py={12}>
            <SearchIcon boxSize={16} color={useSemanticToken('text.tertiary')} mb={4} />
            <Heading size="md" color={useSemanticToken('text.secondary')} mb={2}>
              Ready to Explore Your Knowledge Graph
            </Heading>
            <Text color={useSemanticToken('text.secondary')} mb={4}>
              Use natural language queries to discover insights about your AI Homelab Ecosystem
            </Text>
            <Button
              colorScheme="blue"
              variant="outline"
              onClick={() => setQuery("Show me all microservices")}
            >
              Try a Sample Query
            </Button>
          </CardBody>
        </Card>
      )}
    </VStack>
  );
};

export default ChakraKnowledgeQueryInterface;
