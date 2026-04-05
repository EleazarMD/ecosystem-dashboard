import React from 'react';
import {
  Box,
  Heading,
  Text,
  Flex,
  Spinner,
  SimpleGrid,
  Badge,
  Button,
  Icon,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
  Tag,
  TagLeftIcon,
  TagLabel,
  HStack,
  Divider
} from '@chakra-ui/react';
import { FiFile, FiSearch, FiHash, FiLink, FiTag, FiClock, FiBarChart2, FiLayers } from 'react-icons/fi';
import { Document } from './DocumentList';
import { useSemanticToken } from '@/hooks/useSemanticToken';

// Document analysis interface
export interface DocumentAnalysis {
  id: string;
  documentId: string;
  entityCount: number;
  relationshipCount: number;
  keyTopics: string[];
  sentiment: string;
  lastUpdated: string;
}

interface DocumentAnalysisProps {
  document: Document | null;
  analysis: DocumentAnalysis | null;
  isLoading: boolean;
}

const DocumentAnalysis: React.FC<DocumentAnalysisProps> = ({ 
  document, 
  analysis,
  isLoading 
}) => {
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  
  // Render document status badge
  const renderStatusBadge = (status: string) => {
    let color = 'green';
    if (status === 'analyzing') color = 'blue';
    if (status === 'error') color = 'red';
    
    return (
      <Badge colorScheme={color} variant="subtle" px={2} py={0.5} borderRadius="md">
        {status}
      </Badge>
    );
  };
  
  // Format file size to human readable
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Render sentiment badge
  const renderSentimentBadge = (sentiment: string) => {
    let color = 'gray';
    
    switch(sentiment.toLowerCase()) {
      case 'positive':
        color = 'green';
        break;
      case 'negative':
        color = 'red';
        break;
      case 'mixed':
        color = 'orange';
        break;
      case 'neutral':
      default:
        color = 'blue';
    }
    
    return (
      <Badge colorScheme={color} variant="subtle" px={2} py={0.5}>
        {sentiment}
      </Badge>
    );
  };

  if (!document) {
    return (
      <Box p={4} textAlign="center">
        <Text color={useSemanticToken('text.secondary')}>Select a document to view its details and analysis</Text>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Flex direction="column" align="center" justify="center" h="300px">
        <Spinner size="lg" mb={4} />
        <Text>Loading document analysis...</Text>
      </Flex>
    );
  }

  return (
    <Box p={4}>
      <Heading as="h3" size="md" mb={4} display="flex" alignItems="center">
        <Icon as={FiFile} mr={2} color="blue.500" />
        {document.title}
      </Heading>
      
      <Tabs colorScheme="blue" isFitted variant="enclosed">
        <TabList mb={4}>
          <Tab fontWeight="medium">Overview</Tab>
          <Tab fontWeight="medium">Analysis</Tab>
          <Tab fontWeight="medium">Relations</Tab>
        </TabList>
        
        <TabPanels>
          {/* Overview Tab */}
          <TabPanel p={0}>
            <Box p={4} borderWidth="1px" borderRadius="md" bg={bgColor} mb={4}>
              <Heading as="h4" size="sm" mb={4} color={useSemanticToken('text.secondary')}>Document Information</Heading>
              
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <Box>
                  <Text fontWeight="medium">Path</Text>
                  <Text color={useSemanticToken('text.secondary')} fontSize="sm" mb={2}>{document.path}</Text>
                  
                  <Text fontWeight="medium">Type</Text>
                  <Text color={useSemanticToken('text.secondary')} fontSize="sm" mb={2}>{document.type}</Text>
                  
                  <Text fontWeight="medium">Size</Text>
                  <Text color={useSemanticToken('text.secondary')} fontSize="sm" mb={2}>{formatFileSize(document.size)}</Text>
                </Box>
                
                <Box>
                  <Text fontWeight="medium">Date Added</Text>
                  <Text color={useSemanticToken('text.secondary')} fontSize="sm" mb={2}>
                    {new Date(document.dateAdded).toLocaleDateString()} 
                    {' '}
                    {new Date(document.dateAdded).toLocaleTimeString()}
                  </Text>
                  
                  <Text fontWeight="medium">Status</Text>
                  <Box mb={2}>{renderStatusBadge(document.status)}</Box>
                  
                  <Text fontWeight="medium">ID</Text>
                  <Text color={useSemanticToken('text.secondary')} fontSize="sm" mb={2}>{document.id}</Text>
                </Box>
              </SimpleGrid>
            </Box>

            {document.status === 'indexed' && (
              <Box p={4} borderWidth="1px" borderRadius="md" bg={bgColor} mb={4}>
                <Heading as="h4" size="sm" mb={4} color={useSemanticToken('text.secondary')}>Knowledge Graph Status</Heading>
                
                <StatGroup mb={2}>
                  <Stat>
                    <StatLabel>Entities</StatLabel>
                    <StatNumber>{document.entities || 0}</StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel>Relationships</StatLabel>
                    <StatNumber>{document.relationships || 0}</StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel>Embeddings</StatLabel>
                    <StatNumber>{document.embeddings || 0}</StatNumber>
                  </Stat>
                </StatGroup>
              </Box>
            )}
            
            <Flex justify="flex-end" mt={4}>
              <Button 
                leftIcon={<Icon as={FiSearch} />} 
                colorScheme="blue"
                variant="outline"
              >
                Explore in Knowledge Graph
              </Button>
            </Flex>
          </TabPanel>
          
          {/* Analysis Tab */}
          <TabPanel p={0}>
            {document.status !== 'indexed' ? (
              <Flex direction="column" align="center" justify="center" h="200px" borderWidth="1px" borderRadius="md" bg={bgColor}>
                {document.status === 'analyzing' ? (
                  <>
                    <Spinner size="md" mb={2} />
                    <Text>Analysis in progress...</Text>
                  </>
                ) : (
                  <Text color="red.500">Document analysis failed</Text>
                )}
              </Flex>
            ) : analysis ? (
              <>
                <Box p={4} borderWidth="1px" borderRadius="md" bg={bgColor} mb={4}>
                  <Heading as="h4" size="sm" mb={4} color={useSemanticToken('text.secondary')}>Content Analysis</Heading>
                  
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={2}>
                    <Box>
                      <Flex align="center" mb={1}>
                        <Icon as={FiHash} mr={2} color="blue.500" />
                        <Text fontWeight="medium">Entity Count</Text>
                      </Flex>
                      <Text color={useSemanticToken('text.secondary')} fontSize="sm" mb={3}>{analysis.entityCount}</Text>
                      
                      <Flex align="center" mb={1}>
                        <Icon as={FiLink} mr={2} color="blue.500" />
                        <Text fontWeight="medium">Relationship Count</Text>
                      </Flex>
                      <Text color={useSemanticToken('text.secondary')} fontSize="sm" mb={3}>{analysis.relationshipCount}</Text>
                    </Box>
                    
                    <Box>
                      <Flex align="center" mb={1}>
                        <Icon as={FiBarChart2} mr={2} color="blue.500" />
                        <Text fontWeight="medium">Sentiment</Text>
                      </Flex>
                      <Box mb={3}>{renderSentimentBadge(analysis.sentiment)}</Box>
                      
                      <Flex align="center" mb={1}>
                        <Icon as={FiClock} mr={2} color="blue.500" />
                        <Text fontWeight="medium">Last Updated</Text>
                      </Flex>
                      <Text color={useSemanticToken('text.secondary')} fontSize="sm">
                        {new Date(analysis.lastUpdated).toLocaleDateString()} 
                        {' '}
                        {new Date(analysis.lastUpdated).toLocaleTimeString()}
                      </Text>
                    </Box>
                  </SimpleGrid>
                </Box>
                
                <Box p={4} borderWidth="1px" borderRadius="md" bg={bgColor}>
                  <Flex align="center" mb={3}>
                    <Icon as={FiTag} mr={2} color="blue.500" />
                    <Heading as="h4" size="sm" color={useSemanticToken('text.secondary')}>Key Topics</Heading>
                  </Flex>
                  
                  <HStack spacing={2} flexWrap="wrap">
                    {analysis.keyTopics.map((topic, index) => (
                      <Tag 
                        key={index} 
                        size="md" 
                        variant="subtle" 
                        colorScheme="blue"
                        borderRadius="full"
                        mb={2}
                      >
                        <TagLabel>{topic}</TagLabel>
                      </Tag>
                    ))}
                  </HStack>
                </Box>
              </>
            ) : (
              <Box p={4} textAlign="center" borderWidth="1px" borderRadius="md" bg={bgColor}>
                <Text color={useSemanticToken('text.secondary')}>No analysis data available</Text>
              </Box>
            )}
          </TabPanel>
          
          {/* Relations Tab */}
          <TabPanel p={0}>
            <Box p={4} borderWidth="1px" borderRadius="md" bg={bgColor}>
              <Flex align="center" mb={4}>
                <Icon as={FiLayers} mr={2} color="blue.500" />
                <Heading as="h4" size="sm" color={useSemanticToken('text.secondary')}>Knowledge Graph Relationships</Heading>
              </Flex>
              
              {document.status !== 'indexed' ? (
                <Text color={useSemanticToken('text.secondary')} textAlign="center">
                  {document.status === 'analyzing' 
                    ? 'Analysis in progress. Relationships will be available when indexing completes.'
                    : 'Document not indexed. No relationship data available.'}
                </Text>
              ) : document.relationships && document.relationships > 0 ? (
                <Text color={useSemanticToken('text.secondary')} textAlign="center">
                  Knowledge Graph visualization component will be integrated here to display the
                  {' '}{document.relationships}{' '}
                  relationships for this document.
                </Text>
              ) : (
                <Text color={useSemanticToken('text.secondary')} textAlign="center">
                  No relationships found for this document.
                </Text>
              )}
            </Box>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default DocumentAnalysis;
