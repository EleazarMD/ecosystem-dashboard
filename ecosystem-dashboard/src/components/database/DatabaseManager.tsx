import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Textarea,
  Select,
  Alert,
  AlertIcon,
  Code,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Badge,
  useToast,
  Spinner,
  Card,
  CardHeader,
  CardBody,
  Heading,
} from '@chakra-ui/react';
import { PlayIcon } from '@chakra-ui/icons';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface QueryResult {
  success: boolean;
  data?: any[];
  error?: string;
  executionTime?: number;
  rowCount?: number;
}

interface DatabaseStats {
  totalNodes: number;
  memoryNodes: number;
  workspaceNodes: number;
  tagNodes: number;
}

const DatabaseManager: React.FC = () => {
  const [selectedDb, setSelectedDb] = useState<string>('neo4j');
  const [query, setQuery] = useState<string>('');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [stats, setStats] = useState<DatabaseStats>({
    totalNodes: 817008,
    memoryNodes: 817003,
    workspaceNodes: 2,
    tagNodes: 3
  });
  
  const toast = useToast();

  // Sample Neo4j queries for visualization
  const sampleQueries = {
    neo4j: [
      'MATCH (n) RETURN count(n) as total_nodes LIMIT 1;',
      'MATCH (m:Memory)-[r]-(n) RETURN m,r,n LIMIT 100;',
      'MATCH (w:Workspace)-[r]-(n) RETURN w,r,n LIMIT 50;',
      'MATCH (t:Tag)-[r]-(n) RETURN t,r,n LIMIT 50;',
      'MATCH (n)-[r]-(m) WHERE n.timestamp IS NOT NULL RETURN n,r,m ORDER BY n.timestamp DESC LIMIT 100;'
    ]
  };

  const executeQuery = async () => {
    if (!query.trim()) {
      toast({
        title: 'Empty Query',
        description: 'Please enter a query to execute',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsExecuting(true);
    setQueryResult(null);

    try {
      const startTime = Date.now();
      
      // For now, we'll simulate the query execution
      // In a real implementation, this would call the Neo4j API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const executionTime = Date.now() - startTime;
      
      // Simulated successful result
      const mockResult: QueryResult = {
        success: true,
        data: [
          { property: 'sample_data', value: 'This would be real Neo4j data' },
          { property: 'node_count', value: '817008' },
          { property: 'status', value: 'Query executed successfully' }
        ],
        executionTime,
        rowCount: 3
      };

      setQueryResult(mockResult);

      toast({
        title: 'Query Executed',
        description: `Completed in ${executionTime}ms`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setQueryResult({
        success: false,
        error: errorMessage
      });

      toast({
        title: 'Execution Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const loadSampleQuery = (sampleQuery: string) => {
    setQuery(sampleQuery);
  };

  const renderQueryResult = () => {
    if (!queryResult) return null;

    if (!queryResult.success) {
      return (
        <Alert status="error">
          <AlertIcon />
          <Box>
            <Text fontWeight="bold">Query Failed</Text>
            <Code>{queryResult.error}</Code>
          </Box>
        </Alert>
      );
    }

    if (!queryResult.data || queryResult.data.length === 0) {
      return (
        <Alert status="info">
          <AlertIcon />
          <Text>Query executed successfully but returned no results</Text>
        </Alert>
      );
    }

    return (
      <Box>
        <Text fontSize="sm" color={useSemanticToken('text.secondary')} mb={4}>
          {queryResult.rowCount} rows • {queryResult.executionTime}ms
        </Text>
        
        <Box p={4} border="1px" borderColor={useSemanticToken('border.default')} borderRadius="md" bg={useSemanticToken('surface.base')}>
          <Code display="block" whiteSpace="pre-wrap">
            {JSON.stringify(queryResult.data, null, 2)}
          </Code>
        </Box>
      </Box>
    );
  };

  return (
    <Box p={6}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <Box>
          <Heading size="lg" mb={2}>Neo4j Knowledge Graph Database</Heading>
          <Text color={useSemanticToken('text.secondary')}>
            Interactive exploration of your 817,000+ nodes and relationships
          </Text>
        </Box>

        <Tabs>
          <TabList>
            <Tab>Graph Visualization</Tab>
            <Tab>Query Interface</Tab>
            <Tab>Sample Queries</Tab>
          </TabList>

          <TabPanels>
            {/* Graph Visualization */}
            <TabPanel>
              <VStack spacing={4} align="stretch">
                <Alert status="info">
                  <AlertIcon />
                  <Box>
                    <Text fontWeight="bold">Neo4j Knowledge Graph Visualization</Text>
                    <Text>Interactive exploration of your AI Homelab ecosystem data</Text>
                  </Box>
                </Alert>

                <Card>
                  <CardHeader>
                    <Heading size="md">Database Statistics</Heading>
                  </CardHeader>
                  <CardBody>
                    <VStack spacing={3} align="stretch">
                      <HStack justify="space-between">
                        <Text>Total Nodes:</Text>
                        <Badge colorScheme="blue" fontSize="md">{stats.totalNodes.toLocaleString()}</Badge>
                      </HStack>
                      <HStack justify="space-between">
                        <Text>Memory Nodes:</Text>
                        <Badge colorScheme="green" fontSize="md">{stats.memoryNodes.toLocaleString()}</Badge>
                      </HStack>
                      <HStack justify="space-between">
                        <Text>Workspace Nodes:</Text>
                        <Badge colorScheme="purple" fontSize="md">{stats.workspaceNodes}</Badge>
                      </HStack>
                      <HStack justify="space-between">
                        <Text>Tag Nodes:</Text>
                        <Badge colorScheme="orange" fontSize="md">{stats.tagNodes}</Badge>
                      </HStack>
                    </VStack>
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader>
                    <Heading size="md">Quick Visualization Queries</Heading>
                  </CardHeader>
                  <CardBody>
                    <VStack spacing={3} align="stretch">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          setQuery('MATCH (m:Memory)-[r]-(n) RETURN m,r,n LIMIT 100');
                        }}
                      >
                        🧠 Explore Memory Networks
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          setQuery('MATCH (w:Workspace)-[r]-(n) RETURN w,r,n LIMIT 50');
                        }}
                      >
                        🏠 View Workspace Connections
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          setQuery('MATCH (t:Tag)-[r]-(n) RETURN t,r,n LIMIT 50');
                        }}
                      >
                        🏷️ Explore Tag Relationships
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          setQuery('MATCH (n)-[r]-(m) WHERE n.timestamp IS NOT NULL RETURN n,r,m ORDER BY n.timestamp DESC LIMIT 100');
                        }}
                      >
                        ⏰ Recent Activity
                      </Button>
                    </VStack>
                  </CardBody>
                </Card>

                <Alert status="success">
                  <AlertIcon />
                  <Box>
                    <Text fontWeight="bold">Enhanced Visualization Available</Text>
                    <Text>
                      Use the Query Interface tab to execute custom Cypher queries,
                      or access the Neo4j Browser directly at{' '}
                      <Button 
                        variant="link" 
                        colorScheme="blue" 
                        onClick={() => window.open('http://localhost:7474', '_blank')}
                      >
                        http://localhost:7474
                      </Button>
                    </Text>
                  </Box>
                </Alert>
              </VStack>
            </TabPanel>

            {/* Query Interface */}
            <TabPanel>
              <VStack spacing={4} align="stretch">
                {/* Database Selection */}
                <HStack>
                  <Text fontWeight="bold">Database:</Text>
                  <Select 
                    value={selectedDb} 
                    onChange={(e) => setSelectedDb(e.target.value)}
                    maxW="200px"
                  >
                    <option value="neo4j">Neo4j</option>
                  </Select>
                </HStack>

                {/* Query Input */}
                <Box>
                  <Text fontWeight="bold" mb={2}>Cypher Query:</Text>
                  <Textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Enter Neo4j Cypher query..."
                    rows={6}
                    fontFamily="mono"
                  />
                </Box>

                {/* Execute Button */}
                <Button
                  leftIcon={isExecuting ? <Spinner size="sm" /> : <PlayIcon />}
                  colorScheme="blue"
                  onClick={executeQuery}
                  isLoading={isExecuting}
                  loadingText="Executing..."
                  isDisabled={!query.trim()}
                >
                  Execute Query
                </Button>

                {/* Results */}
                {renderQueryResult()}
              </VStack>
            </TabPanel>

            {/* Sample Queries */}
            <TabPanel>
              <VStack spacing={4} align="stretch">
                <Text color={useSemanticToken('text.secondary')}>
                  Click on any sample query to load it into the query interface
                </Text>
                
                <Box>
                  <Heading size="sm" mb={3}>Neo4j Sample Queries</Heading>
                  <VStack spacing={2} align="stretch">
                    {sampleQueries.neo4j.map((sampleQuery, index) => (
                      <Box
                        key={index}
                        p={3}
                        border="1px"
                        borderColor={useSemanticToken('border.default')}
                        borderRadius="md"
                        cursor="pointer"
                        _hover={{ bg: 'gray.50' }}
                        onClick={() => loadSampleQuery(sampleQuery)}
                      >
                        <Code fontSize="sm" display="block">
                          {sampleQuery}
                        </Code>
                      </Box>
                    ))}
                  </VStack>
                </Box>
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
    </Box>
  );
};

export default DatabaseManager;
