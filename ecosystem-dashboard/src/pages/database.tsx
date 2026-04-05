import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Heading, 
  Text, 
  VStack, 
  HStack,
  Badge, 
  Button, 
  Code, 
  Textarea,
  Select,
  Alert,
  AlertIcon,
  Spinner,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useToast,
  Card,
  CardHeader,
  CardBody,
  SimpleGrid
} from '@chakra-ui/react';
import Script from 'next/script';
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
  totalRelationships: number;
  nodeCounts: Array<{ label: string; count: number }>;
  relationshipTypes: Array<{ type: string; count: number }>;
}

export default function DatabasePage() {
  const [query, setQuery] = useState('MATCH (n) RETURN n LIMIT 25');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [neovisLoaded, setNeovisLoaded] = useState(false);
  const vizRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  // Sample queries
  const sampleQueries = [
    {
      name: "Memory Network Overview",
      query: "MATCH (m:Memory)-[r]-(n) RETURN m,r,n LIMIT 100"
    },
    {
      name: "Workspace Connections", 
      query: "MATCH (w:Workspace)-[r]-(n) RETURN w,r,n LIMIT 50"
    },
    {
      name: "Tag Relationships",
      query: "MATCH (t:Tag)-[r]-(n) RETURN t,r,n LIMIT 50"
    },
    {
      name: "Recent Activity",
      query: "MATCH (n)-[r]-(m) WHERE n.timestamp IS NOT NULL RETURN n,r,m ORDER BY n.timestamp DESC LIMIT 100"
    },
    {
      name: "Node Count by Type",
      query: "MATCH (n) RETURN labels(n)[0] as nodeType, count(n) as count ORDER BY count DESC"
    }
  ];

  // Load database statistics
  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetch('/api/neo4j/stats');
        const result = await response.json();
        if (result.success) {
          setStats(result.data);
        }
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setIsLoadingStats(false);
      }
    };

    loadStats();
  }, []);

  // Initialize Neovis when script loads
  const initializeNeovis = () => {
    if (typeof window !== 'undefined' && (window as any).NeoVis && vizRef.current) {
      const config = {
        containerId: vizRef.current.id,
        neo4j: {
          serverUrl: 'bolt://localhost:7687',
          serverUser: 'neo4j',
          serverPassword: 'ahe_knowledge_graph'
        },
        visConfig: {
          nodes: {
            borderWidth: 2,
            borderWidthSelected: 4,
            chosen: true,
            font: {
              size: 14,
              color: '#343434'
            }
          },
          edges: {
            arrows: {
              to: { enabled: true, scaleFactor: 0.5 }
            },
            color: '#848484',
            font: {
              size: 8,
              align: 'middle'
            }
          },
          physics: {
            enabled: true,
            stabilization: false,
            barnesHut: {
              gravitationalConstant: -2000,
              centralGravity: 0.3,
              springLength: 95,
              springConstant: 0.04,
              damping: 0.09
            }
          }
        },
        labels: {
          Memory: {
            label: 'title',
            value: 'pagerank',
            group: 'memory',
            [NeoVis.NEOVIS_ADVANCED_CONFIG]: {
              function: {
                title: (node: any) => node.properties.title || node.properties.id || 'Memory Node'
              }
            }
          },
          Workspace: {
            label: 'name',
            group: 'workspace'
          },
          Tag: {
            label: 'name', 
            group: 'tag'
          }
        },
        relationships: {
          RELATES_TO: {
            value: 'weight'
          },
          CONTAINS: {
            value: 'weight'
          },
          TAGGED_WITH: {
            value: 'weight'
          }
        },
        initialCypher: query
      };

      try {
        const viz = new (window as any).NeoVis.default(config);
        viz.render();
        setNeovisLoaded(true);
      } catch (error) {
        console.error('Failed to initialize Neovis:', error);
        toast({
          title: 'Visualization Error',
          description: 'Failed to initialize graph visualization',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    }
  };

  // Execute query
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
      const response = await fetch('/api/neo4j/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      const result = await response.json();
      setQueryResult(result);

      if (result.success) {
        toast({
          title: 'Query Executed',
          description: `Completed in ${result.executionTime}ms`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });

        // Update visualization if Neovis is loaded
        if (neovisLoaded && vizRef.current && (window as any).NeoVis) {
          try {
            const viz = new (window as any).NeoVis.default({
              containerId: vizRef.current.id,
              neo4j: {
                serverUrl: 'bolt://localhost:7687',
                serverUser: 'neo4j',
                serverPassword: 'ahe_knowledge_graph'
              },
              initialCypher: query
            });
            viz.render();
          } catch (error) {
            console.error('Failed to update visualization:', error);
          }
        }
      } else {
        toast({
          title: 'Query Failed',
          description: result.error,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: 'Network Error',
        description: 'Failed to execute query',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsExecuting(false);
    }
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
        
        <Box p={4} border="1px" borderColor={useSemanticToken('border.default')} borderRadius="md" bg={useSemanticToken('surface.base')} maxH="400px" overflowY="auto">
          <Code display="block" whiteSpace="pre-wrap" fontSize="sm">
            {JSON.stringify(queryResult.data, null, 2)}
          </Code>
        </Box>
      </Box>
    );
  };

  return (
    <>
      <Script 
        src="https://unpkg.com/neovis.js@2.0.2"
        onLoad={initializeNeovis}
        strategy="afterInteractive"
      />
      
      <Box p={8}>
        <VStack spacing={6} align="stretch">
          <Box>
            <Heading size="lg" mb={2}>Neo4j Knowledge Graph Database</Heading>
            <Text color={useSemanticToken('text.secondary')}>
              Interactive exploration of your 817,000+ nodes and relationships
            </Text>
          </Box>

          {/* Database Statistics */}
          <Card>
            <CardHeader>
              <Heading size="md">Database Statistics</Heading>
            </CardHeader>
            <CardBody>
              {isLoadingStats ? (
                <Spinner />
              ) : stats ? (
                <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
                  <VStack>
                    <Text fontSize="2xl" fontWeight="bold" color="blue.500">
                      {stats.totalNodes.toLocaleString()}
                    </Text>
                    <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Total Nodes</Text>
                  </VStack>
                  <VStack>
                    <Text fontSize="2xl" fontWeight="bold" color="green.500">
                      {stats.totalRelationships.toLocaleString()}
                    </Text>
                    <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Relationships</Text>
                  </VStack>
                  <VStack>
                    <Text fontSize="2xl" fontWeight="bold" color="purple.500">
                      {stats.nodeCounts.length}
                    </Text>
                    <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Node Types</Text>
                  </VStack>
                  <VStack>
                    <Text fontSize="2xl" fontWeight="bold" color="orange.500">
                      {stats.relationshipTypes.length}
                    </Text>
                    <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Relationship Types</Text>
                  </VStack>
                </SimpleGrid>
              ) : (
                <Alert status="warning">
                  <AlertIcon />
                  <Text>Unable to load database statistics</Text>
                </Alert>
              )}
            </CardBody>
          </Card>

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
                    <Text>Interactive Neo4j graph visualization powered by Neovis.js</Text>
                  </Alert>
                  
                  <Box 
                    id="neo4j-viz"
                    ref={vizRef}
                    height="600px" 
                    border="1px solid" 
                    borderColor={useSemanticToken('border.default')} 
                    borderRadius="md"
                    bg={useSemanticToken('surface.elevated')}
                    position="relative"
                  >
                    {!neovisLoaded && (
                      <Box 
                        position="absolute" 
                        top="50%" 
                        left="50%" 
                        transform="translate(-50%, -50%)"
                      >
                        <VStack>
                          <Spinner size="lg" />
                          <Text>Loading graph visualization...</Text>
                        </VStack>
                      </Box>
                    )}
                  </Box>

                  <HStack>
                    <Button 
                      colorScheme="blue" 
                      onClick={() => setQuery('MATCH (n) RETURN n LIMIT 25')}
                    >
                      Show All Nodes
                    </Button>
                    <Button 
                      colorScheme="green" 
                      onClick={() => setQuery('MATCH (m:Memory)-[r]-(n) RETURN m,r,n LIMIT 50')}
                    >
                      Memory Network
                    </Button>
                    <Button 
                      as="a" 
                      href="http://localhost:7474" 
                      target="_blank" 
                      colorScheme="orange" 
                      variant="outline"
                    >
                      🌐 Neo4j Browser
                    </Button>
                  </HStack>
                </VStack>
              </TabPanel>

              {/* Query Interface */}
              <TabPanel>
                <VStack spacing={4} align="stretch">
                  <Box>
                    <Text fontWeight="bold" mb={2}>Cypher Query:</Text>
                    <Textarea
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Enter Neo4j Cypher query..."
                      rows={4}
                      fontFamily="mono"
                    />
                  </Box>

                  <Button
                    colorScheme="blue"
                    onClick={executeQuery}
                    isLoading={isExecuting}
                    loadingText="Executing..."
                    isDisabled={!query.trim()}
                  >
                    Execute Query
                  </Button>

                  {renderQueryResult()}
                </VStack>
              </TabPanel>

              {/* Sample Queries */}
              <TabPanel>
                <VStack spacing={4} align="stretch">
                  <Text color={useSemanticToken('text.secondary')}>
                    Click on any sample query to load it into the query interface
                  </Text>
                  
                  {sampleQueries.map((sample, index) => (
                    <Box
                      key={index}
                      p={4}
                      border="1px"
                      borderColor={useSemanticToken('border.default')}
                      borderRadius="md"
                      cursor="pointer"
                      _hover={{ bg: 'gray.50' }}
                      onClick={() => setQuery(sample.query)}
                    >
                      <Text fontWeight="bold" mb={2}>{sample.name}</Text>
                      <Code fontSize="sm" display="block">
                        {sample.query}
                      </Code>
                    </Box>
                  ))}
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </VStack>
      </Box>
    </>
  );
}
