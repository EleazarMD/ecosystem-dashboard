/**
 * Personal Knowledge Base (PKB) Tool Result Inline Views
 * 
 * Renders rich inline visualizations for PKB tool results in chat interfaces.
 * Supports entity lists, search results, graph queries, and mini graph views.
 * 
 * Used for pkb__* tools (personal knowledge), distinct from email__* tools.
 * 
 * @module components/knowledge-graph/PersonalKGToolResultView
 */

import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Button,
  SimpleGrid,
  Collapse,
  Icon,
  Progress,
  Divider,
  Tooltip,
  useColorModeValue,
} from '@chakra-ui/react';
import {
  CircleStackIcon,
  SparklesIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  UserIcon,
  CubeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { GlassPanel } from '@/components/ui/GlassPanel';

interface Entity {
  id: string;
  name: string;
  type: string;
  description?: string;
}

interface SearchResult {
  id: string;
  content: string;
  score: number;
  entity_type?: string;
  metadata?: Record<string, any>;
}

interface KGToolResultViewProps {
  toolName: string;
  result: any;
  onViewGraph?: () => void;
  onEntityClick?: (entityId: string) => void;
}

const ENTITY_TYPE_COLORS: Record<string, string> = {
  person: 'orange',
  project: 'purple',
  technology: 'green',
  concept: 'pink',
  organization: 'cyan',
  topic: 'teal',
  location: 'yellow',
  default: 'gray',
};

const getEntityIcon = (type: string) => {
  switch (type) {
    case 'person': return UserIcon;
    case 'project': return CubeIcon;
    case 'document': return DocumentTextIcon;
    default: return CircleStackIcon;
  }
};

export const PersonalKGToolResultView: React.FC<KGToolResultViewProps> = ({
  toolName,
  result,
  onViewGraph,
  onEntityClick,
}) => {
  const [expanded, setExpanded] = useState(true);
  const bgColor = useColorModeValue('whiteAlpha.100', 'whiteAlpha.50');
  const borderColor = useColorModeValue('purple.500', 'purple.400');

  if (!result || result.status === 'error') {
    return (
      <GlassPanel p={3} borderLeft="3px solid" borderLeftColor="red.400">
        <HStack>
          <Icon as={ExclamationCircleIcon} color="red.400" boxSize={5} />
          <Text color="red.300" fontSize="sm">
            {result?.message || 'Knowledge Graph operation failed'}
          </Text>
        </HStack>
      </GlassPanel>
    );
  }

  // Render based on tool type
  switch (toolName) {
    case 'kg__ingest':
      return <IngestResultView result={result} />;
    case 'kg__list_entities':
      return <EntityListView result={result} onEntityClick={onEntityClick} />;
    case 'kg__search':
      return <SearchResultView result={result} onEntityClick={onEntityClick} />;
    case 'kg__graphrag_query':
      return <GraphRAGQueryView result={result} onViewGraph={onViewGraph} />;
    case 'kg__get_entity':
      return <EntityDetailView result={result} />;
    case 'kg__get_relationships':
      return <RelationshipsView result={result} onEntityClick={onEntityClick} />;
    default:
      return <GenericResultView toolName={toolName} result={result} />;
  }
};

// Ingest Result View
const IngestResultView: React.FC<{ result: any }> = ({ result }) => {
  return (
    <GlassPanel p={3} borderLeft="3px solid" borderLeftColor="green.400">
      <VStack align="stretch" spacing={2}>
        <HStack>
          <Icon as={CheckCircleIcon} color="green.400" boxSize={5} />
          <Text fontWeight="bold" color="green.300" fontSize="sm">
            Content Ingested Successfully
          </Text>
        </HStack>
        
        <SimpleGrid columns={3} spacing={2}>
          <Box bg="whiteAlpha.100" p={2} borderRadius="md" textAlign="center">
            <Text fontSize="lg" fontWeight="bold" color="purple.300">
              {result.entities_extracted || 0}
            </Text>
            <Text fontSize="xs" color="gray.400">Entities</Text>
          </Box>
          <Box bg="whiteAlpha.100" p={2} borderRadius="md" textAlign="center">
            <Text fontSize="lg" fontWeight="bold" color="cyan.300">
              {result.relationships_extracted || 0}
            </Text>
            <Text fontSize="xs" color="gray.400">Relationships</Text>
          </Box>
          <Box bg="whiteAlpha.100" p={2} borderRadius="md" textAlign="center">
            <Text fontSize="lg" fontWeight="bold" color="blue.300">
              {result.chunks_created || 0}
            </Text>
            <Text fontSize="xs" color="gray.400">Chunks</Text>
          </Box>
        </SimpleGrid>
        
        {result.document_id && (
          <Text fontSize="xs" color="gray.500">
            Document ID: {result.document_id}
          </Text>
        )}
      </VStack>
    </GlassPanel>
  );
};

// Entity List View
const EntityListView: React.FC<{ result: any; onEntityClick?: (id: string) => void }> = ({ 
  result, 
  onEntityClick 
}) => {
  const [showAll, setShowAll] = useState(false);
  const entities = result.entities || [];
  const displayEntities = showAll ? entities : entities.slice(0, 5);

  return (
    <GlassPanel p={3} borderLeft="3px solid" borderLeftColor="purple.400">
      <VStack align="stretch" spacing={2}>
        <HStack justify="space-between">
          <HStack>
            <Icon as={CircleStackIcon} color="purple.400" boxSize={5} />
            <Text fontWeight="bold" color="purple.300" fontSize="sm">
              {result.count || entities.length} Entities
            </Text>
          </HStack>
        </HStack>
        
        <VStack align="stretch" spacing={1} maxH="200px" overflowY="auto">
          {displayEntities.map((entity: Entity) => (
            <HStack
              key={entity.id}
              p={2}
              bg="whiteAlpha.50"
              borderRadius="md"
              cursor={onEntityClick ? 'pointer' : 'default'}
              _hover={onEntityClick ? { bg: 'whiteAlpha.100' } : {}}
              onClick={() => onEntityClick?.(entity.id)}
            >
              <Icon 
                as={getEntityIcon(entity.type)} 
                color={`${ENTITY_TYPE_COLORS[entity.type] || 'gray'}.400`}
                boxSize={4}
              />
              <VStack align="start" spacing={0} flex={1}>
                <Text fontSize="sm" fontWeight="medium" color="white" noOfLines={1}>
                  {entity.name}
                </Text>
                {entity.description && (
                  <Text fontSize="xs" color="gray.400" noOfLines={1}>
                    {entity.description}
                  </Text>
                )}
              </VStack>
              <Badge 
                colorScheme={ENTITY_TYPE_COLORS[entity.type] || 'gray'} 
                size="sm"
                fontSize="10px"
              >
                {entity.type}
              </Badge>
            </HStack>
          ))}
        </VStack>
        
        {entities.length > 5 && (
          <Button
            size="xs"
            variant="ghost"
            onClick={() => setShowAll(!showAll)}
            rightIcon={showAll ? <ChevronUpIcon className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />}
          >
            {showAll ? 'Show Less' : `Show ${entities.length - 5} More`}
          </Button>
        )}
      </VStack>
    </GlassPanel>
  );
};

// Search Result View
const SearchResultView: React.FC<{ result: any; onEntityClick?: (id: string) => void }> = ({ 
  result,
  onEntityClick 
}) => {
  const entities = result.entities || [];
  const chunks = result.chunks || [];

  return (
    <GlassPanel p={3} borderLeft="3px solid" borderLeftColor="cyan.400">
      <VStack align="stretch" spacing={3}>
        <HStack>
          <Icon as={MagnifyingGlassIcon} color="cyan.400" boxSize={5} />
          <Text fontWeight="bold" color="cyan.300" fontSize="sm">
            Search: "{result.query}"
          </Text>
        </HStack>
        
        {entities.length > 0 && (
          <Box>
            <Text fontSize="xs" color="gray.400" mb={1}>
              Matching Entities ({result.entity_count || entities.length})
            </Text>
            <VStack align="stretch" spacing={1}>
              {entities.slice(0, 3).map((entity: SearchResult) => (
                <HStack
                  key={entity.id}
                  p={2}
                  bg="whiteAlpha.50"
                  borderRadius="md"
                  cursor={onEntityClick ? 'pointer' : 'default'}
                  onClick={() => onEntityClick?.(entity.id)}
                >
                  <VStack align="start" spacing={0} flex={1}>
                    <Text fontSize="sm" color="white" noOfLines={1}>
                      {entity.metadata?.name || entity.content?.split('\n')[0]}
                    </Text>
                  </VStack>
                  <Tooltip label={`Relevance: ${(entity.score * 100).toFixed(0)}%`}>
                    <Box w="60px">
                      <Progress 
                        value={Math.max(0, entity.score * 100)} 
                        size="xs" 
                        colorScheme="cyan"
                        borderRadius="full"
                      />
                    </Box>
                  </Tooltip>
                </HStack>
              ))}
            </VStack>
          </Box>
        )}
        
        {chunks.length > 0 && (
          <Box>
            <Text fontSize="xs" color="gray.400" mb={1}>
              Relevant Chunks ({result.chunk_count || chunks.length})
            </Text>
            <VStack align="stretch" spacing={1}>
              {chunks.slice(0, 2).map((chunk: SearchResult, i: number) => (
                <Box key={i} p={2} bg="whiteAlpha.50" borderRadius="md">
                  <Text fontSize="xs" color="gray.300" noOfLines={2}>
                    {chunk.content}
                  </Text>
                </Box>
              ))}
            </VStack>
          </Box>
        )}
        
        {entities.length === 0 && chunks.length === 0 && (
          <Text fontSize="sm" color="gray.400">No results found</Text>
        )}
      </VStack>
    </GlassPanel>
  );
};

// GraphRAG Query View
const GraphRAGQueryView: React.FC<{ result: any; onViewGraph?: () => void }> = ({ 
  result,
  onViewGraph 
}) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <GlassPanel p={3} borderLeft="3px solid" borderLeftColor="purple.400">
      <VStack align="stretch" spacing={2}>
        <HStack justify="space-between">
          <HStack>
            <Icon as={SparklesIcon} color="purple.400" boxSize={5} />
            <Text fontWeight="bold" color="purple.300" fontSize="sm">
              GraphRAG Query ({result.mode || 'hybrid'})
            </Text>
          </HStack>
          {result.confidence && (
            <Badge colorScheme={result.confidence > 0.7 ? 'green' : result.confidence > 0.4 ? 'yellow' : 'red'}>
              {(result.confidence * 100).toFixed(0)}% confidence
            </Badge>
          )}
        </HStack>
        
        <SimpleGrid columns={3} spacing={2}>
          <Box bg="whiteAlpha.100" p={2} borderRadius="md" textAlign="center">
            <Text fontSize="md" fontWeight="bold" color="purple.300">
              {result.entities_used || 0}
            </Text>
            <Text fontSize="xs" color="gray.400">Entities</Text>
          </Box>
          <Box bg="whiteAlpha.100" p={2} borderRadius="md" textAlign="center">
            <Text fontSize="md" fontWeight="bold" color="cyan.300">
              {result.relationships_used || 0}
            </Text>
            <Text fontSize="xs" color="gray.400">Relationships</Text>
          </Box>
          <Box bg="whiteAlpha.100" p={2} borderRadius="md" textAlign="center">
            <Text fontSize="md" fontWeight="bold" color="blue.300">
              {result.sources?.length || 0}
            </Text>
            <Text fontSize="xs" color="gray.400">Sources</Text>
          </Box>
        </SimpleGrid>
        
        <HStack spacing={2}>
          <Button
            size="xs"
            variant="ghost"
            onClick={() => setShowDetails(!showDetails)}
            rightIcon={showDetails ? <ChevronUpIcon className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />}
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </Button>
          {onViewGraph && (
            <Button
              size="xs"
              variant="outline"
              colorScheme="purple"
              onClick={onViewGraph}
              rightIcon={<ArrowTopRightOnSquareIcon className="w-3 h-3" />}
            >
              View Graph
            </Button>
          )}
        </HStack>
        
        <Collapse in={showDetails}>
          <VStack align="stretch" spacing={2} pt={2}>
            {result.sources && result.sources.length > 0 && (
              <Box>
                <Text fontSize="xs" color="gray.400" mb={1}>Sources</Text>
                <HStack flexWrap="wrap" spacing={1}>
                  {result.sources.map((source: string, i: number) => (
                    <Badge key={i} colorScheme="blue" size="sm" fontSize="10px">
                      {source}
                    </Badge>
                  ))}
                </HStack>
              </Box>
            )}
          </VStack>
        </Collapse>
      </VStack>
    </GlassPanel>
  );
};

// Entity Detail View
const EntityDetailView: React.FC<{ result: any }> = ({ result }) => {
  const entity = result.entity || result;

  return (
    <GlassPanel p={3} borderLeft="3px solid" borderLeftColor="purple.400">
      <VStack align="stretch" spacing={2}>
        <HStack>
          <Icon 
            as={getEntityIcon(entity.type)} 
            color={`${ENTITY_TYPE_COLORS[entity.type] || 'gray'}.400`}
            boxSize={5}
          />
          <Text fontWeight="bold" color="white" fontSize="sm">
            {entity.name}
          </Text>
          <Badge colorScheme={ENTITY_TYPE_COLORS[entity.type] || 'gray'}>
            {entity.type}
          </Badge>
        </HStack>
        
        {entity.description && (
          <Text fontSize="sm" color="gray.300">
            {entity.description}
          </Text>
        )}
        
        {entity.properties && Object.keys(entity.properties).length > 0 && (
          <Box>
            <Text fontSize="xs" color="gray.400" mb={1}>Properties</Text>
            <SimpleGrid columns={2} spacing={1}>
              {Object.entries(entity.properties).slice(0, 4).map(([key, value]) => (
                <HStack key={key} fontSize="xs">
                  <Text color="gray.500">{key}:</Text>
                  <Text color="gray.300">{String(value)}</Text>
                </HStack>
              ))}
            </SimpleGrid>
          </Box>
        )}
      </VStack>
    </GlassPanel>
  );
};

// Relationships View
const RelationshipsView: React.FC<{ result: any; onEntityClick?: (id: string) => void }> = ({ 
  result,
  onEntityClick 
}) => {
  const relationships = result.relationships || [];

  return (
    <GlassPanel p={3} borderLeft="3px solid" borderLeftColor="cyan.400">
      <VStack align="stretch" spacing={2}>
        <HStack>
          <Icon as={SparklesIcon} color="cyan.400" boxSize={5} />
          <Text fontWeight="bold" color="cyan.300" fontSize="sm">
            {relationships.length} Relationships
          </Text>
        </HStack>
        
        <VStack align="stretch" spacing={1} maxH="150px" overflowY="auto">
          {relationships.slice(0, 5).map((rel: any, i: number) => (
            <HStack key={i} p={2} bg="whiteAlpha.50" borderRadius="md" fontSize="xs">
              <Text 
                color="purple.300" 
                cursor={onEntityClick ? 'pointer' : 'default'}
                onClick={() => onEntityClick?.(rel.source_entity)}
                _hover={onEntityClick ? { textDecoration: 'underline' } : {}}
              >
                {rel.source_entity}
              </Text>
              <Badge colorScheme="gray" size="sm">
                {rel.type?.replace(/_/g, ' ')}
              </Badge>
              <Text 
                color="cyan.300"
                cursor={onEntityClick ? 'pointer' : 'default'}
                onClick={() => onEntityClick?.(rel.target_entity)}
                _hover={onEntityClick ? { textDecoration: 'underline' } : {}}
              >
                {rel.target_entity}
              </Text>
            </HStack>
          ))}
        </VStack>
      </VStack>
    </GlassPanel>
  );
};

// Generic Result View
const GenericResultView: React.FC<{ toolName: string; result: any }> = ({ toolName, result }) => {
  return (
    <GlassPanel p={3} borderLeft="3px solid" borderLeftColor="gray.400">
      <VStack align="stretch" spacing={2}>
        <HStack>
          <Icon as={CircleStackIcon} color="gray.400" boxSize={5} />
          <Text fontWeight="bold" color="gray.300" fontSize="sm">
            {toolName.replace('kg__', '').replace(/_/g, ' ')}
          </Text>
          {result.status === 'success' && (
            <Badge colorScheme="green" size="sm">Success</Badge>
          )}
        </HStack>
        
        {result.message && (
          <Text fontSize="sm" color="gray.400">{result.message}</Text>
        )}
        
        {result.count !== undefined && (
          <Text fontSize="sm" color="gray.300">
            {result.count} items
          </Text>
        )}
      </VStack>
    </GlassPanel>
  );
};

export default PersonalKGToolResultView;
