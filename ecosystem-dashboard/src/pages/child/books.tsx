/**
 * Children's Book Library Page
 * 
 * Kid-friendly interface for exploring books with GraphRAG.
 * Features characters, themes, story structure, and vocabulary.
 */

import React, { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/[...nextauth]';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  SimpleGrid,
  Button,
  Icon,
  Badge,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Card,
  CardBody,
  Avatar,
  Wrap,
  WrapItem,
  Spinner,
  useColorModeValue,
  Tooltip,
  Progress,
  Divider,
} from '@chakra-ui/react';
import {
  FiBook,
  FiUsers,
  FiHeart,
  FiStar,
  FiBookOpen,
  FiMessageCircle,
  FiAward,
  FiChevronLeft,
} from 'react-icons/fi';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ChildThemeProvider } from '@/components/child/ChildThemeProvider';

interface Book {
  id: string;
  title: string;
  series_name: string | null;
  author: string | null;
  page_count: number;
  is_processed: boolean;
  graphrag_indexed: boolean;
}

interface Character {
  id: string;
  name: string;
  nickname?: string;
  type: string;
  description: string;
  traits: string[];
  age?: string;
  funFact?: string;
}

interface Theme {
  id: string;
  category: string;
  title: string;
  description: string;
  lesson: string;
  discussionQuestions: string[];
}

interface PlotPoint {
  id: string;
  type: string;
  title: string;
  description: string;
  emotions: string[];
}

interface VocabWord {
  id: string;
  word: string;
  definition: string;
  example: string;
  difficulty: string;
}

export default function ChildBooksPage() {
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [bookData, setBookData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingBook, setLoadingBook] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');

  const cardBg = useColorModeValue('white', 'gray.800');
  const accentColor = useColorModeValue('pink.500', 'pink.300');

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      const res = await fetch('/api/child/books');
      if (res.ok) {
        const data = await res.json();
        setBooks(data.books || []);
      }
    } catch (error) {
      console.error('Failed to fetch books:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectBook = async (book: Book) => {
    setSelectedBook(book);
    setLoadingBook(true);
    setActiveSection('overview');

    try {
      const res = await fetch(`/api/child/books/${book.id}/explore?section=overview`);
      if (res.ok) {
        const data = await res.json();
        setBookData(data);
      }
    } catch (error) {
      console.error('Failed to load book:', error);
    } finally {
      setLoadingBook(false);
    }
  };

  const loadSection = async (section: string) => {
    if (!selectedBook) return;
    setActiveSection(section);
    setLoadingBook(true);

    try {
      const res = await fetch(`/api/child/books/${selectedBook.id}/explore?section=${section}`);
      if (res.ok) {
        const data = await res.json();
        setBookData(data);
      }
    } catch (error) {
      console.error('Failed to load section:', error);
    } finally {
      setLoadingBook(false);
    }
  };

  const getTraitEmoji = (trait: string) => {
    const emojiMap: Record<string, string> = {
      brave: '🦁',
      kind: '💝',
      curious: '🔍',
      helpful: '🤝',
      creative: '🎨',
      honest: '✨',
      patient: '🧘',
      responsible: '⭐',
      friendly: '😊',
      determined: '💪',
      caring: '🤗',
      funny: '😄',
    };
    return emojiMap[trait] || '✨';
  };

  const getEmotionEmoji = (emotion: string) => {
    const emojiMap: Record<string, string> = {
      happy: '😊',
      sad: '😢',
      excited: '🎉',
      scared: '😨',
      angry: '😠',
      surprised: '😲',
      proud: '🏆',
      worried: '😟',
      relieved: '😌',
      confused: '🤔',
    };
    return emojiMap[emotion] || '💭';
  };

  const getPlotTypeColor = (type: string) => {
    const colorMap: Record<string, string> = {
      beginning: 'green',
      problem: 'orange',
      rising_action: 'yellow',
      climax: 'red',
      resolution: 'blue',
      ending: 'purple',
    };
    return colorMap[type] || 'gray';
  };

  if (loading) {
    return (
      <ChildThemeProvider>
        <DashboardLayout>
          <Container maxW="container.xl" py={8}>
            <VStack spacing={4}>
              <Spinner size="xl" color="pink.500" />
              <Text>Loading your books...</Text>
            </VStack>
          </Container>
        </DashboardLayout>
      </ChildThemeProvider>
    );
  }

  return (
    <ChildThemeProvider>
      <DashboardLayout>
        <Container maxW="container.xl" py={6}>
          {!selectedBook ? (
            // Book Library View
            <VStack spacing={6} align="stretch">
              <HStack spacing={4}>
                <Icon as={FiBook} boxSize={10} color="pink.500" />
                <Box>
                  <Heading size="lg" color="pink.600">📚 My Book Library</Heading>
                  <Text color="gray.600">Choose a book to explore!</Text>
                </Box>
              </HStack>

              {books.length === 0 ? (
                <Card bg={cardBg} p={8} textAlign="center">
                  <CardBody>
                    <Icon as={FiBook} boxSize={16} color="gray.300" mb={4} />
                    <Heading size="md" color="gray.500" mb={2}>No Books Yet!</Heading>
                    <Text color="gray.400">Ask a parent to add some books to your library.</Text>
                  </CardBody>
                </Card>
              ) : (
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                  {books.map((book) => (
                    <Card
                      key={book.id}
                      bg={cardBg}
                      cursor="pointer"
                      onClick={() => selectBook(book)}
                      _hover={{ transform: 'scale(1.02)', shadow: 'lg' }}
                      transition="all 0.2s"
                      borderWidth={2}
                      borderColor="transparent"
                      _active={{ borderColor: 'pink.400' }}
                    >
                      <CardBody>
                        <VStack align="start" spacing={3}>
                          <HStack>
                            <Box
                              bg="pink.100"
                              p={3}
                              borderRadius="lg"
                            >
                              <Icon as={FiBookOpen} boxSize={8} color="pink.500" />
                            </Box>
                            {book.graphrag_indexed && (
                              <Badge colorScheme="purple" fontSize="xs">
                                ✨ Interactive
                              </Badge>
                            )}
                          </HStack>
                          
                          <Heading size="md" noOfLines={2}>{book.title}</Heading>
                          
                          {book.series_name && (
                            <Badge colorScheme="pink">{book.series_name}</Badge>
                          )}
                          
                          {book.author && (
                            <Text fontSize="sm" color="gray.500">by {book.author}</Text>
                          )}
                          
                          <Text fontSize="sm" color="gray.400">
                            {book.page_count} pages
                          </Text>
                        </VStack>
                      </CardBody>
                    </Card>
                  ))}
                </SimpleGrid>
              )}
            </VStack>
          ) : (
            // Book Exploration View
            <VStack spacing={6} align="stretch">
              {/* Back button and title */}
              <HStack spacing={4}>
                <Button
                  leftIcon={<FiChevronLeft />}
                  variant="ghost"
                  onClick={() => setSelectedBook(null)}
                >
                  Back to Library
                </Button>
              </HStack>

              <Card bg={cardBg} p={6}>
                <HStack spacing={4} mb={4}>
                  <Box bg="pink.100" p={4} borderRadius="xl">
                    <Icon as={FiBookOpen} boxSize={10} color="pink.500" />
                  </Box>
                  <Box>
                    <Heading size="lg">{selectedBook.title}</Heading>
                    {selectedBook.series_name && (
                      <Badge colorScheme="pink" mt={1}>{selectedBook.series_name}</Badge>
                    )}
                    {selectedBook.author && (
                      <Text color="gray.500" mt={1}>by {selectedBook.author}</Text>
                    )}
                  </Box>
                </HStack>

                {/* Navigation Tabs */}
                <Tabs 
                  variant="soft-rounded" 
                  colorScheme="pink"
                  index={['overview', 'characters', 'themes', 'story', 'vocabulary'].indexOf(activeSection)}
                  onChange={(i) => loadSection(['overview', 'characters', 'themes', 'story', 'vocabulary'][i])}
                >
                  <TabList flexWrap="wrap" gap={2}>
                    <Tab>🏠 Overview</Tab>
                    <Tab>👥 Characters</Tab>
                    <Tab>💡 Themes</Tab>
                    <Tab>📖 Story</Tab>
                    <Tab>📝 Words</Tab>
                  </TabList>

                  <TabPanels mt={6}>
                    {/* Overview Tab */}
                    <TabPanel p={0}>
                      {loadingBook ? (
                        <VStack py={8}><Spinner size="lg" color="pink.500" /></VStack>
                      ) : bookData?.data ? (
                        <VStack align="stretch" spacing={6}>
                          {bookData.data.summary && (
                            <Card bg="pink.50" p={4}>
                              <Text fontSize="lg">{bookData.data.summary}</Text>
                            </Card>
                          )}
                          
                          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
                            <StatCard 
                              icon="👥" 
                              label="Characters" 
                              value={bookData.data.stats?.characters || 0}
                              color="blue"
                            />
                            <StatCard 
                              icon="💡" 
                              label="Themes" 
                              value={bookData.data.stats?.themes || 0}
                              color="purple"
                            />
                            <StatCard 
                              icon="📖" 
                              label="Story Parts" 
                              value={bookData.data.stats?.storyParts || 0}
                              color="orange"
                            />
                            <StatCard 
                              icon="📝" 
                              label="New Words" 
                              value={bookData.data.stats?.vocabularyWords || 0}
                              color="green"
                            />
                          </SimpleGrid>
                        </VStack>
                      ) : (
                        <Text color="gray.500" textAlign="center" py={8}>
                          This book hasn't been analyzed yet. Ask a parent to process it!
                        </Text>
                      )}
                    </TabPanel>

                    {/* Characters Tab */}
                    <TabPanel p={0}>
                      {loadingBook ? (
                        <VStack py={8}><Spinner size="lg" color="pink.500" /></VStack>
                      ) : bookData?.data?.length > 0 ? (
                        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                          {bookData.data.map((char: Character) => (
                            <Card key={char.id} bg={cardBg} p={4}>
                              <HStack align="start" spacing={4}>
                                <Avatar 
                                  name={char.name} 
                                  bg={char.type === 'protagonist' ? 'pink.400' : 'blue.400'}
                                  size="lg"
                                />
                                <VStack align="start" spacing={2} flex={1}>
                                  <HStack>
                                    <Heading size="md">{char.name}</Heading>
                                    {char.type === 'protagonist' && (
                                      <Badge colorScheme="pink">⭐ Main Character</Badge>
                                    )}
                                  </HStack>
                                  
                                  {char.age && (
                                    <Text fontSize="sm" color="gray.500">{char.age}</Text>
                                  )}
                                  
                                  <Text>{char.description}</Text>
                                  
                                  {char.traits?.length > 0 && (
                                    <Wrap>
                                      {char.traits.map((trait) => (
                                        <WrapItem key={trait}>
                                          <Badge colorScheme="purple" fontSize="sm">
                                            {getTraitEmoji(trait)} {trait}
                                          </Badge>
                                        </WrapItem>
                                      ))}
                                    </Wrap>
                                  )}
                                  
                                  {char.funFact && (
                                    <Card bg="yellow.50" p={2} size="sm">
                                      <Text fontSize="sm">💡 Fun fact: {char.funFact}</Text>
                                    </Card>
                                  )}
                                </VStack>
                              </HStack>
                            </Card>
                          ))}
                        </SimpleGrid>
                      ) : (
                        <Text color="gray.500" textAlign="center" py={8}>
                          No characters found yet.
                        </Text>
                      )}
                    </TabPanel>

                    {/* Themes Tab */}
                    <TabPanel p={0}>
                      {loadingBook ? (
                        <VStack py={8}><Spinner size="lg" color="pink.500" /></VStack>
                      ) : bookData?.data?.length > 0 ? (
                        <VStack spacing={4} align="stretch">
                          {bookData.data.map((theme: Theme) => (
                            <Card key={theme.id} bg={cardBg} p={4}>
                              <VStack align="start" spacing={3}>
                                <HStack>
                                  <Badge colorScheme="purple" fontSize="md" p={2}>
                                    💡 {theme.title}
                                  </Badge>
                                </HStack>
                                
                                <Text>{theme.description}</Text>
                                
                                <Card bg="green.50" p={3} w="100%">
                                  <Text fontWeight="bold" color="green.700">
                                    🎓 What we can learn:
                                  </Text>
                                  <Text color="green.600">{theme.lesson}</Text>
                                </Card>
                                
                                {theme.discussionQuestions?.length > 0 && (
                                  <Box>
                                    <Text fontWeight="bold" mb={2}>🤔 Think about:</Text>
                                    <VStack align="start" spacing={1}>
                                      {theme.discussionQuestions.map((q, i) => (
                                        <Text key={i} fontSize="sm" color="gray.600">
                                          • {q}
                                        </Text>
                                      ))}
                                    </VStack>
                                  </Box>
                                )}
                              </VStack>
                            </Card>
                          ))}
                        </VStack>
                      ) : (
                        <Text color="gray.500" textAlign="center" py={8}>
                          No themes found yet.
                        </Text>
                      )}
                    </TabPanel>

                    {/* Story Tab */}
                    <TabPanel p={0}>
                      {loadingBook ? (
                        <VStack py={8}><Spinner size="lg" color="pink.500" /></VStack>
                      ) : bookData?.data?.length > 0 ? (
                        <VStack spacing={4} align="stretch">
                          {bookData.data.map((plot: PlotPoint, index: number) => (
                            <Card key={plot.id} bg={cardBg} p={4}>
                              <HStack align="start" spacing={4}>
                                <Box
                                  bg={`${getPlotTypeColor(plot.type)}.100`}
                                  color={`${getPlotTypeColor(plot.type)}.700`}
                                  p={3}
                                  borderRadius="full"
                                  fontWeight="bold"
                                  minW="40px"
                                  textAlign="center"
                                >
                                  {index + 1}
                                </Box>
                                <VStack align="start" spacing={2} flex={1}>
                                  <HStack>
                                    <Heading size="sm">{plot.title}</Heading>
                                    <Badge colorScheme={getPlotTypeColor(plot.type)}>
                                      {plot.type.replace('_', ' ')}
                                    </Badge>
                                  </HStack>
                                  
                                  <Text>{plot.description}</Text>
                                  
                                  {plot.emotions?.length > 0 && (
                                    <HStack>
                                      <Text fontSize="sm" color="gray.500">Feelings:</Text>
                                      {plot.emotions.map((emotion) => (
                                        <Tooltip key={emotion} label={emotion}>
                                          <Text fontSize="lg">{getEmotionEmoji(emotion)}</Text>
                                        </Tooltip>
                                      ))}
                                    </HStack>
                                  )}
                                </VStack>
                              </HStack>
                            </Card>
                          ))}
                        </VStack>
                      ) : (
                        <Text color="gray.500" textAlign="center" py={8}>
                          No story parts found yet.
                        </Text>
                      )}
                    </TabPanel>

                    {/* Vocabulary Tab */}
                    <TabPanel p={0}>
                      {loadingBook ? (
                        <VStack py={8}><Spinner size="lg" color="pink.500" /></VStack>
                      ) : bookData?.data?.length > 0 ? (
                        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                          {bookData.data.map((word: VocabWord) => (
                            <Card key={word.id} bg={cardBg} p={4}>
                              <VStack align="start" spacing={2}>
                                <HStack>
                                  <Heading size="md" color="purple.600">{word.word}</Heading>
                                  <Badge 
                                    colorScheme={
                                      word.difficulty === 'easy' ? 'green' : 
                                      word.difficulty === 'hard' ? 'red' : 'yellow'
                                    }
                                  >
                                    {word.difficulty}
                                  </Badge>
                                </HStack>
                                
                                <Text fontWeight="medium">{word.definition}</Text>
                                
                                {word.example && (
                                  <Card bg="blue.50" p={2} w="100%">
                                    <Text fontSize="sm" fontStyle="italic" color="blue.700">
                                      "{word.example}"
                                    </Text>
                                  </Card>
                                )}
                              </VStack>
                            </Card>
                          ))}
                        </SimpleGrid>
                      ) : (
                        <Text color="gray.500" textAlign="center" py={8}>
                          No vocabulary words found yet.
                        </Text>
                      )}
                    </TabPanel>
                  </TabPanels>
                </Tabs>
              </Card>
            </VStack>
          )}
        </Container>
      </DashboardLayout>
    </ChildThemeProvider>
  );
}

// Stat Card Component
function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <Card bg={`${color}.50`} p={4} textAlign="center">
      <Text fontSize="2xl">{icon}</Text>
      <Heading size="lg" color={`${color}.600`}>{value}</Heading>
      <Text fontSize="sm" color={`${color}.500`}>{label}</Text>
    </Card>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session) {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    };
  }

  const user = session.user as any;
  if (user.accountType !== 'child') {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
};
