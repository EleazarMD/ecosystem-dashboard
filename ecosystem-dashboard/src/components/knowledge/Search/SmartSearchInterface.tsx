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
  Card,
  CardBody,
  CardHeader,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Textarea,
  Select,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Code,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  List,
  ListItem,
  ListIcon,
  Table,
  Tbody,
  Tr,
  Td,
  Th,
  Thead,
  TableContainer,
} from '@chakra-ui/react';
import { FiSearch, FiDownload, FiPlay, FiCode, FiDatabase, FiFilter } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface SearchResult {
  id: string;
  name: string;
  type: string;
  category?: string;
  relevanceScore: number;
  snippet: string;
  filePath?: string;
  relationships: Array<{
    target: string;
    type: string;
    confidence: number;
  }>;
}

interface QueryTemplate {
  id: string;
  name: string;
  description: string;
  category: 'entity' | 'relationship' | 'path' | 'analytics';
  cypher: string;
  params?: string[];
}

const SmartSearchInterface: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [cypherQuery, setCypherQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [queryResults, setQueryResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchType, setSearchType] = useState<'natural' | 'cypher'>('natural');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const toast = useToast();
  
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const cardBg = useSemanticToken('surface.base');

  const queryTemplates: QueryTemplate[] = [
    {
      id: 'all-entities',
      name: 'All Entities by Type',
      description: 'List all entities grouped by type with counts',
      category: 'entity',
      cypher: `MATCH (n)
WHERE n.type IS NOT NULL
RETURN n.type as entityType, count(n) as count, collect(n.name)[0..5] as samples
ORDER BY count DESC`
    },
    {
      id: 'port-services',
      name: 'Port to Service Mapping',
      description: 'Find all services and their associated ports',
      category: 'relationship',
      cypher: `MATCH (d:Document)-[:CONTAINS]->(p)
WHERE p.type = 'Port'
MATCH (d)-[:CONTAINS]->(s)
WHERE s.type = 'Service'
RETURN p.name as port, s.name as service, d.name as document
ORDER BY p.name`
    },
    {
      id: 'document-entities',
      name: 'Documents with Most Entities',
      description: 'Find documents with the highest entity counts',
      category: 'analytics',
      cypher: `MATCH (d:Document)
WHERE d.entityCount IS NOT NULL
RETURN d.name as document, d.entityCount as entities, d.category as category, d.filePath as path
ORDER BY d.entityCount DESC
LIMIT 10`
    },
    {
      id: 'entity-connections',
      name: 'Most Connected Entities',
      description: 'Find entities with the most relationships',
      category: 'analytics',
      cypher: `MATCH (n)-[r]-()
WHERE n.type IS NOT NULL AND n.type <> 'Document'
RETURN n.name as entity, n.type as type, count(r) as connections
ORDER BY connections DESC
LIMIT 15`
    },
    {
      id: 'cross-category',
      name: 'Cross-Category Relationships',
      description: 'Find entities shared between different document categories',
      category: 'relationship',
      cypher: `MATCH (d1:Document)-[:CONTAINS]->(e)<-[:CONTAINS]-(d2:Document)
WHERE d1.category <> d2.category AND e.type <> 'Document'
RETURN e.name as entity, e.type as type, 
       collect(DISTINCT d1.category) + collect(DISTINCT d2.category) as categories,
       count(DISTINCT d1) + count(DISTINCT d2) as documentCount
ORDER BY documentCount DESC`
    },
    {
      id: 'find-paths',
      name: 'Find Paths Between Entities',
      description: 'Find shortest paths between two specific entities',
      category: 'path',
      cypher: `MATCH path = shortestPath((start)-[*..4]-(end))
WHERE start.name CONTAINS $startEntity AND end.name CONTAINS $endEntity
RETURN path, length(path) as pathLength
ORDER BY pathLength
LIMIT 5`,
      params: ['startEntity', 'endEntity']
    }
  ];

  const performNaturalSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setError(null);
    
    try {
      const response = await fetch('/api/knowledge-graph/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, type: 'natural' })
      });
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.success && result.data) {
        setSearchResults(result.data.results);
      } else {
        throw new Error(result.message || 'Invalid search results');
      }
    } catch (err: any) {
      console.error('Error performing search:', err);
      setError(err.message);
      
      // Generate sample search results
      generateSampleSearchResults();
    } finally {
      setIsSearching(false);
    }
  };

  const executeCypherQuery = async () => {
    if (!cypherQuery.trim()) return;
    
    setIsExecuting(true);
    setError(null);
    
    try {
      const response = await fetch('/api/knowledge-graph/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cypher: cypherQuery })
      });
      
      if (!response.ok) {
        throw new Error(`Query failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.success && result.data) {
        setQueryResults(result.data.records);
      } else {
        throw new Error(result.message || 'Invalid query results');
      }
    } catch (err: any) {
      console.error('Error executing query:', err);
      setError(err.message);
      
      // Generate sample query results
      generateSampleQueryResults();
    } finally {
      setIsExecuting(false);
    }
  };

  const generateSampleSearchResults = () => {
    const sampleResults: SearchResult[] = [
      {
        id: 'service_kg',
        name: 'Knowledge Graph Service',
        type: 'Service',
        category: 'core',
        relevanceScore: 0.95,
        snippet: 'Core knowledge graph service for AI Homelab ecosystem...',
        filePath: 'core/knowledge-graph/README.md',
        relationships: [
          { target: 'Port 8765', type: 'USES', confidence: 0.9 },
          { target: 'Neo4j', type: 'DEPENDS_ON', confidence: 0.8 }
        ]
      },
      {
        id: 'port_8765',
        name: 'Port 8765',
        type: 'Port',
        relevanceScore: 0.87,
        snippet: 'Knowledge Graph API port assignment...',
        relationships: [
          { target: 'Knowledge Graph Service', type: 'ASSIGNED_TO', confidence: 1.0 }
        ]
      },
      {
        id: 'neo4j_tech',
        name: 'Neo4j Database',
        type: 'Technology',
        category: 'databases',
        relevanceScore: 0.82,
        snippet: 'Graph database technology for knowledge storage...',
        relationships: [
          { target: 'Knowledge Graph Service', type: 'SUPPORTS', confidence: 0.9 }
        ]
      }
    ];
    
    setSearchResults(sampleResults);
  };

  const generateSampleQueryResults = () => {
    const sampleResults = [
      { entityType: 'Service', count: 10, samples: ['Knowledge Graph', 'AI Gateway', 'Dashboard'] },
      { entityType: 'Port', count: 14, samples: ['8765', '8080', '8404'] },
      { entityType: 'Technology', count: 3, samples: ['Neo4j', 'PostgreSQL', 'Redis'] },
      { entityType: 'Document', count: 14, samples: ['README.md', 'architecture.md'] }
    ];
    
    setQueryResults(sampleResults);
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = queryTemplates.find(t => t.id === templateId);
    if (template) {
      setCypherQuery(template.cypher);
      setSelectedTemplate(templateId);
    }
  };

  const exportResults = () => {
    const data = searchType === 'natural' ? searchResults : queryResults;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kg-search-results-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Results Exported',
      description: 'Search results exported successfully',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  return (
    <Box p={6}>
      <Flex justify="space-between" align="center" mb={6}>
        <Box>
          <Heading as="h2" size="lg">Knowledge Graph Search</Heading>
          <Text color={useSemanticToken('text.secondary')}>
            Natural language search and Cypher query interface
          </Text>
        </Box>
        <HStack>
          <Select value={searchType} onChange={(e) => setSearchType(e.target.value as any)} size="sm" width="150px">
            <option value="natural">Natural Search</option>
            <option value="cypher">Cypher Query</option>
          </Select>
          {((searchType === 'natural' && searchResults.length > 0) || 
            (searchType === 'cypher' && queryResults.length > 0)) && (
            <Button
              leftIcon={<Icon as={FiDownload} />}
              onClick={exportResults}
              variant="outline"
              size="sm"
            >
              Export
            </Button>
          )}
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

      <VStack spacing={6} align="stretch">
        {searchType === 'natural' ? (
          /* Natural Language Search */
          <Card>
            <CardHeader>
              <Heading size="md">Natural Language Search</Heading>
            </CardHeader>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <InputGroup>
                  <InputLeftElement pointerEvents="none">
                    <Icon as={FiSearch} color={useSemanticToken('text.tertiary')} />
                  </InputLeftElement>
                  <Input
                    placeholder="Search for entities, services, ports, or relationships..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && performNaturalSearch()}
                  />
                  <InputRightElement width="70px">
                    <Button
                      h="30px"
                      size="sm"
                      colorScheme="blue"
                      onClick={performNaturalSearch}
                      isLoading={isSearching}
                      disabled={!searchQuery.trim()}
                    >
                      Search
                    </Button>
                  </InputRightElement>
                </InputGroup>
                
                <HStack wrap="wrap" spacing={2}>
                  <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Examples:</Text>
                  <Badge 
                    cursor="pointer" 
                    onClick={() => setSearchQuery('knowledge graph service')}
                    colorScheme="blue"
                  >
                    knowledge graph service
                  </Badge>
                  <Badge 
                    cursor="pointer" 
                    onClick={() => setSearchQuery('port 8080')}
                    colorScheme="green"
                  >
                    port 8080
                  </Badge>
                  <Badge 
                    cursor="pointer" 
                    onClick={() => setSearchQuery('services using Neo4j')}
                    colorScheme="purple"
                  >
                    services using Neo4j
                  </Badge>
                </HStack>
              </VStack>
            </CardBody>
          </Card>
        ) : (
          /* Cypher Query Interface */
          <Card>
            <CardHeader>
              <Flex justify="space-between" align="center">
                <Heading size="md">Cypher Query Interface</Heading>
                <Select 
                  value={selectedTemplate} 
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                  placeholder="Select query template..."
                  size="sm"
                  width="250px"
                >
                  {queryTemplates.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </Select>
              </Flex>
            </CardHeader>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Textarea
                  placeholder="Enter Cypher query..."
                  value={cypherQuery}
                  onChange={(e) => setCypherQuery(e.target.value)}
                  rows={6}
                  fontFamily="mono"
                  fontSize="sm"
                />
                
                <HStack>
                  <Button
                    leftIcon={<Icon as={FiPlay} />}
                    colorScheme="green"
                    onClick={executeCypherQuery}
                    isLoading={isExecuting}
                    disabled={!cypherQuery.trim()}
                  >
                    Execute Query
                  </Button>
                  <Button
                    leftIcon={<Icon as={FiCode} />}
                    variant="outline"
                    onClick={() => setCypherQuery('')}
                  >
                    Clear
                  </Button>
                </HStack>
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* Query Templates */}
        {searchType === 'cypher' && (
          <Card>
            <CardHeader>
              <Heading size="md">Query Templates</Heading>
            </CardHeader>
            <CardBody>
              <Accordion allowMultiple>
                {queryTemplates.map(template => (
                  <AccordionItem key={template.id}>
                    <AccordionButton>
                      <Box flex="1" textAlign="left">
                        <Flex align="center" gap={3}>
                          <Badge colorScheme="blue">{template.category}</Badge>
                          <Text fontWeight="bold">{template.name}</Text>
                        </Flex>
                        <Text fontSize="sm" color={useSemanticToken('text.secondary')}>{template.description}</Text>
                      </Box>
                      <AccordionIcon />
                    </AccordionButton>
                    <AccordionPanel pb={4}>
                      <VStack align="stretch" spacing={3}>
                        <Code p={3} borderRadius="md" fontSize="sm" whiteSpace="pre-wrap">
                          {template.cypher}
                        </Code>
                        {template.params && (
                          <Box>
                            <Text fontSize="sm" fontWeight="bold" mb={1}>Parameters:</Text>
                            <HStack wrap="wrap" spacing={2}>
                              {template.params.map(param => (
                                <Badge key={param} colorScheme="orange">${param}</Badge>
                              ))}
                            </HStack>
                          </Box>
                        )}
                        <Button
                          size="sm"
                          colorScheme="blue"
                          onClick={() => handleTemplateSelect(template.id)}
                        >
                          Use This Query
                        </Button>
                      </VStack>
                    </AccordionPanel>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardBody>
          </Card>
        )}

        {/* Results Display */}
        {searchType === 'natural' && searchResults.length > 0 && (
          <Card>
            <CardHeader>
              <Heading size="md">Search Results ({searchResults.length})</Heading>
            </CardHeader>
            <CardBody>
              <VStack spacing={4} align="stretch">
                {searchResults.map(result => (
                  <Box key={result.id} p={4} borderWidth={1} borderRadius="md" bg={cardBg}>
                    <Flex justify="space-between" align="start" mb={2}>
                      <VStack align="start" spacing={1}>
                        <Flex align="center" gap={2}>
                          <Text fontWeight="bold">{result.name}</Text>
                          <Badge colorScheme="blue">{result.type}</Badge>
                          {result.category && <Badge colorScheme="green">{result.category}</Badge>}
                        </Flex>
                        <Text fontSize="sm" color={useSemanticToken('text.secondary')}>{result.snippet}</Text>
                        {result.filePath && (
                          <Text fontSize="xs" color={useSemanticToken('text.secondary')} fontFamily="mono">{result.filePath}</Text>
                        )}
                      </VStack>
                      <Badge colorScheme="purple">
                        {(result.relevanceScore * 100).toFixed(0)}% match
                      </Badge>
                    </Flex>
                    
                    {result.relationships.length > 0 && (
                      <Box mt={3}>
                        <Text fontSize="sm" fontWeight="bold" mb={1}>Related:</Text>
                        <HStack wrap="wrap" spacing={2}>
                          {result.relationships.slice(0, 3).map((rel, index) => (
                            <Badge key={index} colorScheme="gray" fontSize="xs">
                              {rel.type} → {rel.target}
                            </Badge>
                          ))}
                        </HStack>
                      </Box>
                    )}
                  </Box>
                ))}
              </VStack>
            </CardBody>
          </Card>
        )}

        {searchType === 'cypher' && queryResults.length > 0 && (
          <Card>
            <CardHeader>
              <Heading size="md">Query Results ({queryResults.length} records)</Heading>
            </CardHeader>
            <CardBody>
              <TableContainer>
                <Table size="sm">
                  <Thead>
                    <Tr>
                      {queryResults.length > 0 && Object.keys(queryResults[0]).map(key => (
                        <Th key={key}>{key}</Th>
                      ))}
                    </Tr>
                  </Thead>
                  <Tbody>
                    {queryResults.map((record, index) => (
                      <Tr key={index}>
                        {Object.values(record).map((value: any, valueIndex) => (
                          <Td key={valueIndex}>
                            {Array.isArray(value) ? (
                              <HStack wrap="wrap" spacing={1}>
                                {value.slice(0, 3).map((item, itemIndex) => (
                                  <Badge key={itemIndex} size="sm" colorScheme="gray">
                                    {String(item)}
                                  </Badge>
                                ))}
                                {value.length > 3 && <Text fontSize="xs">+{value.length - 3} more</Text>}
                              </HStack>
                            ) : (
                              <Text fontSize="sm">{String(value)}</Text>
                            )}
                          </Td>
                        ))}
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            </CardBody>
          </Card>
        )}
      </VStack>
    </Box>
  );
};

export default SmartSearchInterface;
