/**
 * Knowledge Insights - AI-Powered Research Recommendations
 * Surfaces intelligent knowledge connections and research opportunities
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Text,
  Badge,
  Button,
  VStack,
  HStack,
  Icon,
  Avatar,
  Wrap,
  WrapItem,
  Tag,
  TagLabel,
  Progress,
  Tooltip
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  NetworkIcon,
  BookOpenIcon,
  LightbulbIcon,
  TrendingUpIcon,
  ArrowRightIcon,
  BrainIcon,
  SearchIcon,
  LinkIcon
} from 'lucide-react';

interface KnowledgeConnection {
  id: string;
  title: string;
  type: 'research_gap' | 'trending_topic' | 'connection' | 'opportunity';
  confidence: number;
  description: string;
  relatedTopics: string[];
  sources: number;
  potential: 'high' | 'medium' | 'low';
  actionable: boolean;
}

interface ResearchSuggestion {
  id: string;
  title: string;
  reasoning: string;
  domains: string[];
  estimatedTime: string;
  impact: 'breakthrough' | 'incremental' | 'exploratory';
  resources: string[];
}

const MotionBox = motion(Box);

export const KnowledgeInsights: React.FC = () => {
  const [connections, setConnections] = useState<KnowledgeConnection[]>([]);
  const [suggestions, setSuggestions] = useState<ResearchSuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  const bg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const cardBg = useSemanticToken('surface.hover');

  useEffect(() => {
    const fetchKnowledgeData = async () => {
      setLoading(true);
      
      // Simulate knowledge graph analysis
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      const mockConnections: KnowledgeConnection[] = [
        {
          id: '1',
          title: 'Multimodal Reasoning Gap',
          type: 'research_gap',
          confidence: 87,
          description: 'Limited research on combining vision-language models with structured reasoning for scientific discovery.',
          relatedTopics: ['Computer Vision', 'NLP', 'Scientific AI', 'Reasoning'],
          sources: 156,
          potential: 'high',
          actionable: true
        },
        {
          id: '2',
          title: 'Quantum-Classical ML Hybrid',
          type: 'trending_topic',
          confidence: 92,
          description: 'Growing interest in quantum-enhanced machine learning for optimization problems.',
          relatedTopics: ['Quantum Computing', 'Optimization', 'Hybrid Systems'],
          sources: 203,
          potential: 'high',
          actionable: true
        },
        {
          id: '3',
          title: 'Emergent AI Collaboration',
          type: 'connection',
          confidence: 76,
          description: 'Unexpected connections between your voice assistant work and distributed AI reasoning.',
          relatedTopics: ['Multi-Agent Systems', 'Voice Interfaces', 'Distributed AI'],
          sources: 89,
          potential: 'medium',
          actionable: false
        }
      ];

      const mockSuggestions: ResearchSuggestion[] = [
        {
          id: '1',
          title: 'Voice-Controlled Scientific Discovery',
          reasoning: 'Your voice assistant expertise + trending scientific AI research',
          domains: ['Voice UI', 'Scientific Computing', 'Knowledge Graphs'],
          estimatedTime: '2-3 months',
          impact: 'breakthrough',
          resources: ['Voice Assistant', 'Knowledge Graph', 'Research Papers']
        },
        {
          id: '2',
          title: 'Multi-Agent Knowledge Synthesis',
          reasoning: 'Perfect fit for your agentic architecture and research focus',
          domains: ['Multi-Agent Systems', 'Knowledge Management', 'AI Orchestration'],
          estimatedTime: '4-6 weeks',
          impact: 'incremental',
          resources: ['Dashboard Agents', 'Memory System', 'A2A Protocol']
        }
      ];
      
      setConnections(mockConnections);
      setSuggestions(mockSuggestions);
      setLoading(false);
    };

    fetchKnowledgeData();
  }, []);

  const getConnectionIcon = (type: string) => {
    switch (type) {
      case 'research_gap': return SearchIcon;
      case 'trending_topic': return TrendingUpIcon;
      case 'connection': return LinkIcon;
      case 'opportunity': return LightbulbIcon;
      default: return NetworkIcon;
    }
  };

  const getConnectionColor = (type: string) => {
    switch (type) {
      case 'research_gap': return 'purple';
      case 'trending_topic': return 'green';
      case 'connection': return 'blue';
      case 'opportunity': return 'orange';
      default: return 'gray';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'breakthrough': return 'red';
      case 'incremental': return 'blue';
      case 'exploratory': return 'green';
      default: return 'gray';
    }
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* Header */}
      <HStack justify="space-between" align="center">
        <VStack align="start" spacing={0}>
          <Text fontSize="xl" fontWeight="bold">
            Knowledge Intelligence
          </Text>
          <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
            AI-discovered research opportunities and connections
          </Text>
        </VStack>
        <HStack spacing={2}>
          <Badge colorScheme="purple" variant="subtle">
            {connections.length} insights
          </Badge>
          <Badge colorScheme="green" variant="subtle">
            {suggestions.length} suggestions
          </Badge>
        </HStack>
      </HStack>

      {/* Knowledge Connections */}
      <Box
        bg={bg}
        borderRadius="xl"
        border="1px solid"
        borderColor={borderColor}
        p={6}
      >
        <HStack justify="space-between" align="center" mb={4}>
          <HStack spacing={2}>
            <Icon as={NetworkIcon} color="purple.400" boxSize={5} />
            <Text fontSize="lg" fontWeight="semibold">
              Knowledge Connections
            </Text>
          </HStack>
          <Button size="sm" variant="ghost" rightIcon={<Icon as={ArrowRightIcon} />}>
            Explore Graph
          </Button>
        </HStack>

        <VStack spacing={4} align="stretch">
          {connections.map((connection, index) => (
            <MotionBox
              key={connection.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              bg={cardBg}
              borderRadius="lg"
              border="1px solid"
              borderColor={`${getConnectionColor(connection.type)}.200`}
              p={4}
            >
              <HStack justify="space-between" align="start" mb={3}>
                <HStack spacing={3} flex={1}>
                  <Box
                    p={2}
                    bg={`${getConnectionColor(connection.type)}.100`}
                    color={`${getConnectionColor(connection.type)}.500`}
                    borderRadius="lg"
                  >
                    <Icon as={getConnectionIcon(connection.type)} boxSize={4} />
                  </Box>
                  
                  <VStack align="start" spacing={1} flex={1}>
                    <HStack>
                      <Text fontWeight="semibold" fontSize="sm">
                        {connection.title}
                      </Text>
                      <Badge size="xs" colorScheme={getConnectionColor(connection.type)}>
                        {connection.type.replace('_', ' ')}
                      </Badge>
                    </HStack>
                    
                    <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                      {connection.description}
                    </Text>
                  </VStack>
                </HStack>

                <VStack align="end" spacing={1}>
                  <Tooltip label={`${connection.confidence}% confidence`}>
                    <Badge size="sm" colorScheme="blue" variant="outline">
                      {connection.confidence}%
                    </Badge>
                  </Tooltip>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                    {connection.sources} sources
                  </Text>
                </VStack>
              </HStack>

              <Wrap spacing={2} mb={3}>
                {connection.relatedTopics.map((topic, idx) => (
                  <WrapItem key={idx}>
                    <Tag size="sm" variant="subtle" colorScheme={getConnectionColor(connection.type)}>
                      <TagLabel>{topic}</TagLabel>
                    </Tag>
                  </WrapItem>
                ))}
              </Wrap>

              <HStack justify="space-between">
                <HStack spacing={4}>
                  <HStack spacing={1}>
                    <Text fontSize="xs" color={useSemanticToken('text.secondary')}>Potential:</Text>
                    <Badge size="xs" colorScheme={connection.potential === 'high' ? 'green' : 'orange'}>
                      {connection.potential}
                    </Badge>
                  </HStack>
                </HStack>
                
                {connection.actionable && (
                  <Button size="xs" variant="ghost" colorScheme={getConnectionColor(connection.type)}>
                    Investigate
                  </Button>
                )}
              </HStack>
            </MotionBox>
          ))}
        </VStack>
      </Box>

      {/* Research Suggestions */}
      <Box
        bg={bg}
        borderRadius="xl"
        border="1px solid"
        borderColor={borderColor}
        p={6}
      >
        <HStack justify="space-between" align="center" mb={4}>
          <HStack spacing={2}>
            <Icon as={LightbulbIcon} color="orange.400" boxSize={5} />
            <Text fontSize="lg" fontWeight="semibold">
              Research Suggestions
            </Text>
          </HStack>
          <Button size="sm" variant="ghost" rightIcon={<Icon as={ArrowRightIcon} />}>
            View All
          </Button>
        </HStack>

        <VStack spacing={4} align="stretch">
          {suggestions.map((suggestion, index) => (
            <MotionBox
              key={suggestion.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              bg={cardBg}
              borderRadius="lg"
              border="1px solid"
              borderColor="orange.200"
              p={4}
            >
              <HStack justify="space-between" align="start" mb={3}>
                <VStack align="start" spacing={2} flex={1}>
                  <HStack>
                    <Text fontWeight="semibold" fontSize="md">
                      {suggestion.title}
                    </Text>
                    <Badge size="sm" colorScheme={getImpactColor(suggestion.impact)}>
                      {suggestion.impact}
                    </Badge>
                  </HStack>
                  
                  <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                    {suggestion.reasoning}
                  </Text>
                  
                  <Wrap spacing={2}>
                    {suggestion.domains.map((domain, idx) => (
                      <WrapItem key={idx}>
                        <Tag size="sm" variant="subtle" colorScheme="orange">
                          <TagLabel>{domain}</TagLabel>
                        </Tag>
                      </WrapItem>
                    ))}
                  </Wrap>
                </VStack>

                <VStack align="end" spacing={2}>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                    {suggestion.estimatedTime}
                  </Text>
                  <Button size="sm" colorScheme="orange" variant="outline">
                    Start Project
                  </Button>
                </VStack>
              </HStack>

              <HStack spacing={4} fontSize="xs" color={useSemanticToken('text.secondary')}>
                <Text>Resources: {suggestion.resources.join(', ')}</Text>
              </HStack>
            </MotionBox>
          ))}
        </VStack>
      </Box>
    </VStack>
  );
};

export default KnowledgeInsights;
