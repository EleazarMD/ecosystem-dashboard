/**
 * Graph Tutor Panel
 * AI-powered educational panel that explains graph nodes with Qwen3-generated content
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Badge,
  Divider,
  Icon,
  Flex,
  List,
  ListItem,
  ListIcon,
  Spinner,
  Button,
  Collapse,
  useDisclosure,
} from '@chakra-ui/react';
import {
  FiBookOpen,
  FiLink,
  FiLayers,
  FiChevronRight,
  FiZap,
  FiTarget,
  FiInfo,
  FiArrowRight,
  FiRefreshCw,
  FiCheckCircle,
  FiHelpCircle,
  FiList,
} from 'react-icons/fi';
import { useRightPanel } from '@/contexts/RightPanelContext';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface TutorContent {
  explanation: string;
  keyPoints: string[];
  examples: string[];
  studyQuestions: string[];
  relatedTopics: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedReadTime: string;
}

// Educational content for each node type
const NODE_TYPE_INFO: Record<string, { 
  icon: string; 
  color: string; 
  title: string;
  explanation: string;
  learnMore: string;
}> = {
  document: {
    icon: '📄',
    color: 'blue.400',
    title: 'Document',
    explanation: 'This is the main document you\'re exploring. It serves as the root of the knowledge graph, containing all the topics, concepts, and techniques discussed within.',
    learnMore: 'Documents are the foundation of your knowledge base. Each document is analyzed to extract key themes, concepts, and their relationships.',
  },
  topic: {
    icon: '🏷️',
    color: 'pink.400',
    title: 'Topic / Theme',
    explanation: 'A major theme or subject area covered in the document. Topics group related concepts together and represent key areas of knowledge you should understand.',
    learnMore: 'Topics help organize information hierarchically. Understanding the main topics gives you a roadmap of what the document covers.',
  },
  concept: {
    icon: '💡',
    color: 'green.400',
    title: 'Concept',
    explanation: 'A fundamental idea or principle discussed in the document. Concepts are the building blocks of understanding - master these to grasp the subject matter.',
    learnMore: 'Concepts often connect to multiple topics and other concepts. The more connections a concept has, the more central it is to the material.',
  },
  technique: {
    icon: '🔧',
    color: 'teal.400',
    title: 'Technique / Method',
    explanation: 'A specific method, approach, or tool used in practice. Techniques are actionable knowledge you can apply to solve real problems.',
    learnMore: 'Techniques often build on concepts. Understanding the underlying concepts helps you know when and how to apply each technique.',
  },
  insight: {
    icon: '💫',
    color: 'yellow.400',
    title: 'Key Insight',
    explanation: 'An important observation or conclusion drawn from the material. Insights represent the "aha moments" that deepen understanding.',
    learnMore: 'Insights often connect disparate ideas and reveal patterns. They\'re valuable for building intuition about the subject.',
  },
  chapter: {
    icon: '📑',
    color: 'purple.400',
    title: 'Chapter / Section',
    explanation: 'A structural division of the document that groups related content together. Chapters provide a logical flow through the material.',
    learnMore: 'Following the chapter structure helps you understand how ideas build upon each other throughout the document.',
  },
};

// Relationship explanations
const RELATIONSHIP_INFO: Record<string, string> = {
  'explores': 'The document deeply examines this topic',
  'involves': 'This topic includes or requires understanding of this concept',
  'connects to': 'These topics are related and share common themes',
  'uses': 'This concept or technique builds upon another',
  'enables': 'Understanding this enables comprehension of related ideas',
  'foundation for': 'This serves as a prerequisite for understanding other concepts',
  'related': 'These ideas are discussed together and complement each other',
  'discusses': 'This section explains or elaborates on this concept',
};

export default function GraphTutorPanel() {
  const { customData } = useRightPanel();
  const selectedNode = customData?.selectedNode;
  const connectedNodes = customData?.connectedNodes || [];
  const relationships = customData?.relationships || [];

  // AI-generated content state
  const [tutorContent, setTutorContent] = useState<TutorContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isOpen: showExamples, onToggle: toggleExamples } = useDisclosure();
  const { isOpen: showQuestions, onToggle: toggleQuestions } = useDisclosure();

  // Colors
  const bgColor = useSemanticToken('surface.base');
  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.subtle');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const accentColor = useSemanticToken('interactive.primary');

  // Get node type info
  const nodeInfo = selectedNode ? NODE_TYPE_INFO[selectedNode.type] || NODE_TYPE_INFO.concept : null;

  // Fetch AI-generated content when node changes
  const fetchTutorContent = useCallback(async () => {
    if (!selectedNode) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/workspace-ai/pdf/graph-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          node: selectedNode,
          connectedNodes: connectedNodes.slice(0, 10),
          workspaceId: customData?.workspaceId,
          documentId: customData?.documentId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate content');
      }

      const data = await response.json();
      setTutorContent(data.content);
    } catch (err: any) {
      console.error('Graph Tutor error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedNode, connectedNodes]);

  // Auto-fetch when node changes
  useEffect(() => {
    if (selectedNode) {
      fetchTutorContent();
    } else {
      setTutorContent(null);
    }
  }, [selectedNode?.id]); // Only re-fetch when node ID changes

  if (!selectedNode) {
    return (
      <Box p={5}>
        <VStack spacing={6} align="stretch">
          {/* Welcome State */}
          <VStack spacing={3} textAlign="center" py={8}>
            <Icon as={FiBookOpen} boxSize={12} color="purple.400" />
            <Heading size="md" color={textColor}>Graph Tutor</Heading>
            <Text color={mutedColor} fontSize="sm" maxW="280px">
              Click on any node in the graph to learn about it. I'll explain what it means and how it connects to other concepts.
            </Text>
          </VStack>

          <Divider borderColor={borderColor} />

          {/* Quick Guide */}
          <VStack align="stretch" spacing={3}>
            <Text fontWeight="600" color={textColor} fontSize="sm">
              Node Types Guide
            </Text>
            {Object.entries(NODE_TYPE_INFO).slice(0, 5).map(([type, info]) => (
              <HStack key={type} spacing={3} p={2} borderRadius="md" bg={cardBg}>
                <Text fontSize="lg">{info.icon}</Text>
                <VStack align="start" spacing={0}>
                  <Text fontSize="sm" fontWeight="500" color={textColor}>{info.title}</Text>
                  <Text fontSize="xs" color={mutedColor} noOfLines={1}>{info.explanation.slice(0, 50)}...</Text>
                </VStack>
              </HStack>
            ))}
          </VStack>

          <Divider borderColor={borderColor} />

          {/* Tips */}
          <VStack align="stretch" spacing={2}>
            <Text fontWeight="600" color={textColor} fontSize="sm">
              Tips
            </Text>
            <HStack spacing={2} align="start">
              <Icon as={FiZap} color="yellow.400" mt={0.5} />
              <Text fontSize="xs" color={mutedColor}>
                Larger nodes have more connections and are more central to the material
              </Text>
            </HStack>
            <HStack spacing={2} align="start">
              <Icon as={FiLink} color="blue.400" mt={0.5} />
              <Text fontSize="xs" color={mutedColor}>
                Lines between nodes show how concepts relate to each other
              </Text>
            </HStack>
            <HStack spacing={2} align="start">
              <Icon as={FiTarget} color="green.400" mt={0.5} />
              <Text fontSize="xs" color={mutedColor}>
                Use the filter dropdown to focus on specific node types
              </Text>
            </HStack>
          </VStack>
        </VStack>
      </Box>
    );
  }

  return (
    <Box p={5} h="100%" overflowY="auto">
      <VStack spacing={5} align="stretch">
        {/* Node Header */}
        <HStack justify="space-between" align="start">
          <VStack align="start" spacing={2}>
            <HStack spacing={2}>
              <Text fontSize="2xl">{nodeInfo?.icon || '📌'}</Text>
              <Badge colorScheme={nodeInfo?.color?.split('.')[0] || 'gray'} fontSize="xs">
                {nodeInfo?.title || selectedNode.type}
              </Badge>
              {tutorContent?.difficulty && (
                <Badge 
                  colorScheme={
                    tutorContent.difficulty === 'beginner' ? 'green' : 
                    tutorContent.difficulty === 'intermediate' ? 'yellow' : 'red'
                  } 
                  fontSize="xs"
                >
                  {tutorContent.difficulty}
                </Badge>
              )}
            </HStack>
            <Heading size="md" color={textColor}>
              {selectedNode.name}
            </Heading>
            {tutorContent?.estimatedReadTime && (
              <Text fontSize="xs" color={mutedColor}>📖 {tutorContent.estimatedReadTime} read</Text>
            )}
          </VStack>
          <Button
            size="xs"
            variant="ghost"
            leftIcon={<FiRefreshCw />}
            onClick={fetchTutorContent}
            isLoading={loading}
            color={mutedColor}
          >
            Refresh
          </Button>
        </HStack>

        <Divider borderColor={borderColor} />

        {/* Loading State */}
        {loading && (
          <VStack py={8} spacing={3}>
            <Spinner size="lg" color="purple.400" />
            <Text fontSize="sm" color={mutedColor}>Generating learning content with AI...</Text>
          </VStack>
        )}

        {/* AI-Generated Explanation */}
        {!loading && tutorContent && (
          <>
            <VStack align="stretch" spacing={2}>
              <HStack spacing={2}>
                <Icon as={FiBookOpen} color="purple.400" />
                <Text fontWeight="600" color={textColor} fontSize="sm">AI Explanation</Text>
                <Badge colorScheme="purple" fontSize="xs">Qwen3</Badge>
              </HStack>
              <Box p={3} bg={cardBg} borderRadius="md" borderLeft="3px solid" borderLeftColor="purple.400">
                <Text fontSize="sm" color={textColor} lineHeight="tall" whiteSpace="pre-wrap">
                  {tutorContent.explanation}
                </Text>
              </Box>
            </VStack>

            {/* Key Points */}
            {tutorContent.keyPoints?.length > 0 && (
              <VStack align="stretch" spacing={2}>
                <HStack spacing={2}>
                  <Icon as={FiCheckCircle} color="green.400" />
                  <Text fontWeight="600" color={textColor} fontSize="sm">Key Points</Text>
                </HStack>
                <VStack align="stretch" spacing={1}>
                  {tutorContent.keyPoints.map((point, idx) => (
                    <HStack key={idx} spacing={2} p={2} bg={cardBg} borderRadius="md" align="start">
                      <Text color="green.400" fontWeight="bold">•</Text>
                      <Text fontSize="sm" color={textColor}>{point}</Text>
                    </HStack>
                  ))}
                </VStack>
              </VStack>
            )}

            {/* Examples (Collapsible) */}
            {tutorContent.examples?.length > 0 && (
              <VStack align="stretch" spacing={2}>
                <Button
                  variant="ghost"
                  size="sm"
                  justifyContent="space-between"
                  onClick={toggleExamples}
                  rightIcon={<Icon as={showExamples ? FiChevronRight : FiChevronRight} transform={showExamples ? 'rotate(90deg)' : undefined} />}
                >
                  <HStack spacing={2}>
                    <Icon as={FiZap} color="yellow.400" />
                    <Text fontWeight="600" fontSize="sm">Examples ({tutorContent.examples.length})</Text>
                  </HStack>
                </Button>
                <Collapse in={showExamples}>
                  <VStack align="stretch" spacing={2} pl={2}>
                    {tutorContent.examples.map((example, idx) => (
                      <Box key={idx} p={3} bg={cardBg} borderRadius="md" borderLeft="2px solid" borderLeftColor="yellow.400">
                        <Text fontSize="sm" color={textColor} whiteSpace="pre-wrap">{example}</Text>
                      </Box>
                    ))}
                  </VStack>
                </Collapse>
              </VStack>
            )}

            {/* Study Questions (Collapsible) */}
            {tutorContent.studyQuestions?.length > 0 && (
              <VStack align="stretch" spacing={2}>
                <Button
                  variant="ghost"
                  size="sm"
                  justifyContent="space-between"
                  onClick={toggleQuestions}
                  rightIcon={<Icon as={showQuestions ? FiChevronRight : FiChevronRight} transform={showQuestions ? 'rotate(90deg)' : undefined} />}
                >
                  <HStack spacing={2}>
                    <Icon as={FiHelpCircle} color="blue.400" />
                    <Text fontWeight="600" fontSize="sm">Study Questions ({tutorContent.studyQuestions.length})</Text>
                  </HStack>
                </Button>
                <Collapse in={showQuestions}>
                  <VStack align="stretch" spacing={2} pl={2}>
                    {tutorContent.studyQuestions.map((question, idx) => (
                      <HStack key={idx} spacing={2} p={2} bg={cardBg} borderRadius="md" align="start">
                        <Text color="blue.400" fontWeight="bold">{idx + 1}.</Text>
                        <Text fontSize="sm" color={textColor}>{question}</Text>
                      </HStack>
                    ))}
                  </VStack>
                </Collapse>
              </VStack>
            )}

            {/* Related Topics */}
            {tutorContent.relatedTopics?.length > 0 && (
              <VStack align="stretch" spacing={2}>
                <HStack spacing={2}>
                  <Icon as={FiLayers} color="teal.400" />
                  <Text fontWeight="600" color={textColor} fontSize="sm">Learn Next</Text>
                </HStack>
                <Flex wrap="wrap" gap={2}>
                  {tutorContent.relatedTopics.map((topic, idx) => (
                    <Badge key={idx} colorScheme="teal" variant="subtle" px={2} py={1}>
                      {topic}
                    </Badge>
                  ))}
                </Flex>
              </VStack>
            )}
          </>
        )}

        {/* Fallback: Show basic info if no AI content yet */}
        {!loading && !tutorContent && (
          <>
            <VStack align="stretch" spacing={2}>
              <HStack spacing={2}>
                <Icon as={FiInfo} color={accentColor} />
                <Text fontWeight="600" color={textColor} fontSize="sm">What is this?</Text>
              </HStack>
              <Box p={3} bg={cardBg} borderRadius="md" borderLeft="3px solid" borderLeftColor={nodeInfo?.color || 'gray.400'}>
                <Text fontSize="sm" color={textColor} lineHeight="tall">
                  {nodeInfo?.explanation}
                </Text>
              </Box>
            </VStack>

            {selectedNode.description && (
              <VStack align="stretch" spacing={2}>
                <HStack spacing={2}>
                  <Icon as={FiBookOpen} color="purple.400" />
                  <Text fontWeight="600" color={textColor} fontSize="sm">About this {nodeInfo?.title?.toLowerCase()}</Text>
                </HStack>
                <Box p={3} bg={cardBg} borderRadius="md">
                  <Text fontSize="sm" color={mutedColor} lineHeight="tall">
                    {selectedNode.description}
                  </Text>
                </Box>
              </VStack>
            )}
          </>
        )}

        <Divider borderColor={borderColor} />

        {/* Connections List */}
        {connectedNodes.length > 0 && (
          <VStack align="stretch" spacing={2}>
            <HStack spacing={2}>
              <Icon as={FiLink} color="blue.400" />
              <Text fontWeight="600" color={textColor} fontSize="sm">
                Connected Concepts ({connectedNodes.length})
              </Text>
            </HStack>
            <Text fontSize="xs" color={mutedColor}>
              💡 Right-click nodes in the 3D graph to drill down
            </Text>
            <List spacing={1}>
              {connectedNodes.slice(0, 6).map((conn: any, idx: number) => (
                <ListItem key={idx}>
                  <HStack spacing={2} p={1.5} bg={cardBg} borderRadius="md">
                    <Text fontSize="sm">{NODE_TYPE_INFO[conn.type]?.icon || '📌'}</Text>
                    <Text fontSize="xs" fontWeight="500" color={textColor} flex={1} noOfLines={1}>{conn.name}</Text>
                    <Badge size="xs" colorScheme="gray" fontSize="9px">{conn.type}</Badge>
                  </HStack>
                </ListItem>
              ))}
            </List>
            {connectedNodes.length > 6 && (
              <Text fontSize="xs" color={mutedColor} textAlign="center">
                +{connectedNodes.length - 6} more connections
              </Text>
            )}
          </VStack>
        )}
      </VStack>
    </Box>
  );
}
