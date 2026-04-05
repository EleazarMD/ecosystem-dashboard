/**
 * Book Insights Panel for Parents
 * 
 * Visual analysis of book content including:
 * - Linguistic metrics (readability, vocabulary complexity)
 * - Knowledge graph visualization
 * - Learning path recommendations
 * - Discussion guides
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Badge,
  Button,
  Icon,
  Spinner,
  SimpleGrid,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  List,
  ListItem,
  ListIcon,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Tooltip,
  Divider,
  useToast,
} from '@chakra-ui/react';
import {
  FiBook,
  FiUsers,
  FiTarget,
  FiMessageCircle,
  FiTrendingUp,
  FiCheckCircle,
  FiStar,
  FiHelpCircle,
  FiActivity,
  FiLayers,
  FiRefreshCw,
} from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface LinguisticMetrics {
  readabilityScore: number;
  readabilityGrade: string;
  averageSentenceLength: number;
  averageWordLength: number;
  vocabularyDiversity: number;
  uniqueWords: number;
  totalWords: number;
  complexWords: number;
  complexWordPercentage: number;
  estimatedReadingLevel: string;
}

interface GraphNode {
  id: string;
  label: string;
  type: 'book' | 'character' | 'theme' | 'plotpoint' | 'vocabulary' | 'location';
  properties: Record<string, any>;
}

interface GraphEdge {
  source: string;
  target: string;
  type: string;
  label: string;
}

interface LearningInsight {
  category: 'vocabulary' | 'comprehension' | 'critical_thinking' | 'social_emotional';
  title: string;
  description: string;
  suggestedActivities: string[];
  discussionQuestions: string[];
}

interface BookAnalysis {
  book: {
    id: string;
    title: string;
    author: string;
    pageCount: number;
    fileType: string;
  };
  linguisticMetrics: LinguisticMetrics;
  graphData: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  summary: {
    characters: number;
    themes: number;
    vocabularyWords: number;
    plotPoints: number;
  };
  characters: any[];
  themes: any[];
  vocabulary: any[];
  plotPoints: any[];
  learningInsights: LearningInsight[];
  pagesExtracted: number;
}

interface BookInsightsPanelProps {
  bookId: string;
  bookTitle?: string;
  onClose?: () => void;
}

const categoryColors: Record<string, string> = {
  vocabulary: 'purple',
  comprehension: 'blue',
  critical_thinking: 'orange',
  social_emotional: 'pink',
};

const categoryIcons: Record<string, any> = {
  vocabulary: FiBook,
  comprehension: FiLayers,
  critical_thinking: FiTarget,
  social_emotional: FiUsers,
};

export default function BookInsightsPanel({ bookId, bookTitle, onClose }: BookInsightsPanelProps) {
  const [analysis, setAnalysis] = useState<BookAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  
  const bg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const textSecondary = useSemanticToken('text.secondary');

  const fetchAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/family/books/${bookId}/analysis`);
      const data = await res.json();
      
      if (res.ok) {
        setAnalysis(data);
      } else {
        setError(data.error || 'Failed to load analysis');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  if (loading) {
    return (
      <VStack py={12} spacing={4}>
        <Spinner size="xl" color="purple.500" />
        <Text color={textSecondary}>Analyzing book content...</Text>
      </VStack>
    );
  }

  if (error || !analysis) {
    return (
      <VStack py={12} spacing={4}>
        <Icon as={FiHelpCircle} boxSize={12} color="gray.400" />
        <Text color={textSecondary}>{error || 'No analysis available'}</Text>
        <Button size="sm" onClick={fetchAnalysis} leftIcon={<FiRefreshCw />}>
          Retry
        </Button>
      </VStack>
    );
  }

  const { linguisticMetrics, summary, learningInsights, characters, themes, vocabulary } = analysis;

  return (
    <VStack spacing={6} align="stretch">
      {/* Header */}
      <HStack justify="space-between">
        <VStack align="start" spacing={0}>
          <Heading size="md">📊 Book Insights</Heading>
          <Text fontSize="sm" color={textSecondary}>
            {analysis.book.title} by {analysis.book.author}
          </Text>
        </VStack>
        <Badge colorScheme="green">{analysis.pagesExtracted} pages analyzed</Badge>
      </HStack>

      <Tabs colorScheme="purple" size="sm">
        <TabList>
          <Tab>📈 Metrics</Tab>
          <Tab>🧠 Learning</Tab>
          <Tab>🗺️ Content Map</Tab>
        </TabList>

        <TabPanels>
          {/* Metrics Tab */}
          <TabPanel px={0}>
            <VStack spacing={4} align="stretch">
              {/* Reading Level Card */}
              <Box bg={bg} borderRadius="lg" border="1px solid" borderColor={borderColor} p={4}>
                <HStack justify="space-between" mb={3}>
                  <Text fontWeight="semibold">Reading Level</Text>
                  <Badge colorScheme="blue" fontSize="sm">
                    {linguisticMetrics.estimatedReadingLevel}
                  </Badge>
                </HStack>
                
                <VStack spacing={3} align="stretch">
                  <Box>
                    <HStack justify="space-between" mb={1}>
                      <Text fontSize="sm">Readability Score</Text>
                      <Text fontSize="sm" fontWeight="medium">
                        {linguisticMetrics.readabilityScore}/100
                      </Text>
                    </HStack>
                    <Progress 
                      value={linguisticMetrics.readabilityScore} 
                      colorScheme={linguisticMetrics.readabilityScore > 60 ? 'green' : linguisticMetrics.readabilityScore > 40 ? 'yellow' : 'red'}
                      size="sm"
                      borderRadius="full"
                    />
                    <Text fontSize="xs" color={textSecondary} mt={1}>
                      {linguisticMetrics.readabilityGrade} - Higher = easier to read
                    </Text>
                  </Box>
                </VStack>
              </Box>

              {/* Stats Grid */}
              <SimpleGrid columns={2} spacing={3}>
                <Stat bg={bg} p={3} borderRadius="lg" border="1px solid" borderColor={borderColor}>
                  <StatLabel fontSize="xs">Total Words</StatLabel>
                  <StatNumber fontSize="lg">{linguisticMetrics.totalWords.toLocaleString()}</StatNumber>
                  <StatHelpText fontSize="xs">{linguisticMetrics.uniqueWords} unique</StatHelpText>
                </Stat>
                
                <Stat bg={bg} p={3} borderRadius="lg" border="1px solid" borderColor={borderColor}>
                  <StatLabel fontSize="xs">Vocabulary Diversity</StatLabel>
                  <StatNumber fontSize="lg">{Math.round(linguisticMetrics.vocabularyDiversity * 100)}%</StatNumber>
                  <StatHelpText fontSize="xs">Unique word ratio</StatHelpText>
                </Stat>
                
                <Stat bg={bg} p={3} borderRadius="lg" border="1px solid" borderColor={borderColor}>
                  <StatLabel fontSize="xs">Avg Sentence</StatLabel>
                  <StatNumber fontSize="lg">{linguisticMetrics.averageSentenceLength}</StatNumber>
                  <StatHelpText fontSize="xs">words per sentence</StatHelpText>
                </Stat>
                
                <Stat bg={bg} p={3} borderRadius="lg" border="1px solid" borderColor={borderColor}>
                  <StatLabel fontSize="xs">Complex Words</StatLabel>
                  <StatNumber fontSize="lg">{linguisticMetrics.complexWordPercentage}%</StatNumber>
                  <StatHelpText fontSize="xs">{linguisticMetrics.complexWords} words (3+ syllables)</StatHelpText>
                </Stat>
              </SimpleGrid>

              {/* Content Summary */}
              <Box bg={bg} borderRadius="lg" border="1px solid" borderColor={borderColor} p={4}>
                <Text fontWeight="semibold" mb={3}>Content Summary</Text>
                <SimpleGrid columns={4} spacing={2}>
                  <VStack>
                    <Icon as={FiUsers} boxSize={5} color="blue.500" />
                    <Text fontSize="lg" fontWeight="bold">{summary.characters}</Text>
                    <Text fontSize="xs" color={textSecondary}>Characters</Text>
                  </VStack>
                  <VStack>
                    <Icon as={FiTarget} boxSize={5} color="purple.500" />
                    <Text fontSize="lg" fontWeight="bold">{summary.themes}</Text>
                    <Text fontSize="xs" color={textSecondary}>Themes</Text>
                  </VStack>
                  <VStack>
                    <Icon as={FiBook} boxSize={5} color="green.500" />
                    <Text fontSize="lg" fontWeight="bold">{summary.vocabularyWords}</Text>
                    <Text fontSize="xs" color={textSecondary}>Vocab Words</Text>
                  </VStack>
                  <VStack>
                    <Icon as={FiActivity} boxSize={5} color="orange.500" />
                    <Text fontSize="lg" fontWeight="bold">{summary.plotPoints}</Text>
                    <Text fontSize="xs" color={textSecondary}>Plot Points</Text>
                  </VStack>
                </SimpleGrid>
              </Box>
            </VStack>
          </TabPanel>

          {/* Learning Tab */}
          <TabPanel px={0}>
            <VStack spacing={4} align="stretch">
              {learningInsights.length === 0 ? (
                <Box textAlign="center" py={8}>
                  <Icon as={FiHelpCircle} boxSize={10} color="gray.400" mb={2} />
                  <Text color={textSecondary}>
                    No learning insights available yet.
                    <br />
                    Process the book to generate insights.
                  </Text>
                </Box>
              ) : (
                <Accordion allowMultiple defaultIndex={[0]}>
                  {learningInsights.map((insight, idx) => (
                    <AccordionItem key={idx} border="none" mb={2}>
                      <AccordionButton
                        bg={bg}
                        borderRadius="lg"
                        border="1px solid"
                        borderColor={borderColor}
                        _expanded={{ borderBottomRadius: 0 }}
                      >
                        <HStack flex={1} spacing={3}>
                          <Icon 
                            as={categoryIcons[insight.category] || FiStar} 
                            color={`${categoryColors[insight.category]}.500`}
                          />
                          <VStack align="start" spacing={0}>
                            <Text fontWeight="medium" fontSize="sm">{insight.title}</Text>
                            <Badge size="xs" colorScheme={categoryColors[insight.category]}>
                              {insight.category.replace('_', ' ')}
                            </Badge>
                          </VStack>
                        </HStack>
                        <AccordionIcon />
                      </AccordionButton>
                      <AccordionPanel 
                        bg={bg} 
                        borderRadius="0 0 lg lg"
                        border="1px solid"
                        borderColor={borderColor}
                        borderTop="none"
                      >
                        <VStack align="stretch" spacing={4}>
                          <Text fontSize="sm" color={textSecondary}>
                            {insight.description}
                          </Text>
                          
                          {insight.suggestedActivities.length > 0 && (
                            <Box>
                              <Text fontSize="sm" fontWeight="medium" mb={2}>
                                📝 Suggested Activities
                              </Text>
                              <List spacing={1}>
                                {insight.suggestedActivities.map((activity, i) => (
                                  <ListItem key={i} fontSize="sm">
                                    <ListIcon as={FiCheckCircle} color="green.500" />
                                    {activity}
                                  </ListItem>
                                ))}
                              </List>
                            </Box>
                          )}
                          
                          {insight.discussionQuestions.length > 0 && (
                            <Box>
                              <Text fontSize="sm" fontWeight="medium" mb={2}>
                                💬 Discussion Questions
                              </Text>
                              <List spacing={1}>
                                {insight.discussionQuestions.map((question, i) => (
                                  <ListItem key={i} fontSize="sm">
                                    <ListIcon as={FiMessageCircle} color="blue.500" />
                                    {question}
                                  </ListItem>
                                ))}
                              </List>
                            </Box>
                          )}
                        </VStack>
                      </AccordionPanel>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </VStack>
          </TabPanel>

          {/* Content Map Tab */}
          <TabPanel px={0}>
            <VStack spacing={4} align="stretch">
              {/* Characters */}
              {characters.length > 0 && (
                <Box bg={bg} borderRadius="lg" border="1px solid" borderColor={borderColor} p={4}>
                  <HStack mb={3}>
                    <Icon as={FiUsers} color="blue.500" />
                    <Text fontWeight="semibold">Characters ({characters.length})</Text>
                  </HStack>
                  <SimpleGrid columns={2} spacing={2}>
                    {characters.slice(0, 6).map((char, idx) => (
                      <HStack key={idx} p={2} bg="blackAlpha.50" borderRadius="md">
                        <Badge colorScheme="blue" size="sm">
                          {char.character_type || 'character'}
                        </Badge>
                        <Text fontSize="sm" fontWeight="medium">{char.name}</Text>
                      </HStack>
                    ))}
                  </SimpleGrid>
                  {characters.length > 6 && (
                    <Text fontSize="xs" color={textSecondary} mt={2}>
                      +{characters.length - 6} more characters
                    </Text>
                  )}
                </Box>
              )}

              {/* Themes */}
              {themes.length > 0 && (
                <Box bg={bg} borderRadius="lg" border="1px solid" borderColor={borderColor} p={4}>
                  <HStack mb={3}>
                    <Icon as={FiTarget} color="purple.500" />
                    <Text fontWeight="semibold">Themes ({themes.length})</Text>
                  </HStack>
                  <VStack align="stretch" spacing={2}>
                    {themes.map((theme, idx) => (
                      <Box key={idx} p={2} bg="blackAlpha.50" borderRadius="md">
                        <HStack justify="space-between">
                          <Text fontSize="sm" fontWeight="medium">
                            {theme.title || theme.category}
                          </Text>
                          <Badge colorScheme="purple" size="sm">{theme.category}</Badge>
                        </HStack>
                        {theme.lesson && (
                          <Text fontSize="xs" color={textSecondary} mt={1}>
                            💡 {theme.lesson}
                          </Text>
                        )}
                      </Box>
                    ))}
                  </VStack>
                </Box>
              )}

              {/* Vocabulary */}
              {vocabulary.length > 0 && (
                <Box bg={bg} borderRadius="lg" border="1px solid" borderColor={borderColor} p={4}>
                  <HStack mb={3}>
                    <Icon as={FiBook} color="green.500" />
                    <Text fontWeight="semibold">Vocabulary Words ({vocabulary.length})</Text>
                  </HStack>
                  <SimpleGrid columns={2} spacing={2}>
                    {vocabulary.slice(0, 8).map((word, idx) => (
                      <Tooltip key={idx} label={word.definition} placement="top">
                        <HStack p={2} bg="blackAlpha.50" borderRadius="md" cursor="help">
                          <Badge colorScheme={word.difficulty === 'hard' ? 'red' : word.difficulty === 'easy' ? 'green' : 'yellow'} size="sm">
                            {word.difficulty || 'medium'}
                          </Badge>
                          <Text fontSize="sm" fontWeight="medium">{word.word}</Text>
                        </HStack>
                      </Tooltip>
                    ))}
                  </SimpleGrid>
                  {vocabulary.length > 8 && (
                    <Text fontSize="xs" color={textSecondary} mt={2}>
                      +{vocabulary.length - 8} more words
                    </Text>
                  )}
                </Box>
              )}

              {/* Graph Visualization Placeholder */}
              <Box 
                bg={bg} 
                borderRadius="lg" 
                border="1px solid" 
                borderColor={borderColor} 
                p={4}
                textAlign="center"
              >
                <Icon as={FiLayers} boxSize={8} color="gray.400" mb={2} />
                <Text fontSize="sm" color={textSecondary}>
                  Interactive knowledge graph visualization coming soon
                </Text>
                <Text fontSize="xs" color={textSecondary}>
                  {analysis.graphData.nodes.length} nodes • {analysis.graphData.edges.length} connections
                </Text>
              </Box>
            </VStack>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </VStack>
  );
}
