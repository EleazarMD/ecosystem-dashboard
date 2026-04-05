/**
 * Children's Book Explorer Page
 * 
 * Dedicated kid-friendly interface for exploring books with multiple learning facets:
 * - Text-based learning (reading, vocabulary, comprehension)
 * - Image-based learning (illustrations, visual storytelling)
 * - Graph-based learning (character relationships, story structure)
 * 
 * Uses GraphRAG for intelligent book exploration.
 * Themed to match child's selected theme (Pusheen, Minecraft, etc.)
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
  Card,
  CardBody,
  Avatar,
  Wrap,
  WrapItem,
  Input,
  InputGroup,
  InputLeftElement,
  IconButton,
  useColorModeValue,
  Tooltip,
  Progress,
  Divider,
  Flex,
  useBreakpointValue,
  useToast,
  Spinner,
} from '@chakra-ui/react';
import {
  FiBook,
  FiUsers,
  FiBookOpen,
  FiChevronLeft,
  FiSearch,
  FiArrowLeft,
  FiMaximize,
} from 'react-icons/fi';
import { useRouter } from 'next/router';
import ChildDashboardLayout from '@/components/layout/ChildDashboardLayout';
import { useChildTheme } from '@/components/child/ChildThemeProvider';
import { BackgroundContextMenu, getBackgroundStyles, BackgroundMode } from '@/components/child/BackgroundContextMenu';
import { useRightPanel } from '@/contexts/RightPanelContext';

interface Book {
  id: string;
  title: string;
  series_name: string | null;
  author: string | null;
  page_count: number;
  is_processed: boolean;
  graphrag_indexed: boolean;
  file_type?: string;
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

// Book Explorer tabs - matching workspace style
const EXPLORER_TABS = [
  { id: 'overview', emoji: '🏠', label: 'Overview', color: 'purple', iconKey: 'home' },
  { id: 'pages', emoji: '📄', label: 'Pages', color: 'cyan', iconKey: 'books' },
  { id: 'characters', emoji: '👥', label: 'Characters', color: 'blue', iconKey: 'contacts' },
  { id: 'themes', emoji: '💡', label: 'Themes', color: 'yellow', iconKey: 'notes' },
  { id: 'story', emoji: '📖', label: 'Story', color: 'green', iconKey: 'books' },
  { id: 'vocabulary', emoji: '📝', label: 'Words', color: 'orange', iconKey: 'writing' },
];

// Quick action buttons for book exploration
const BOOK_ACTIONS = [
  { emoji: '📋', text: 'Summarize', action: 'summary', color: 'purple' },
  { emoji: '👥', text: 'Characters', action: 'characters', color: 'blue' },
  { emoji: '📚', text: 'Vocabulary', action: 'vocabulary', color: 'green' },
  { emoji: '❓', text: 'Quiz Me', action: 'quiz', color: 'orange' },
];

function BookExplorerContent() {
  const router = useRouter();
  const toast = useToast();
  const { colors, childExtras } = useChildTheme();
  const { setContext, setIsOpen, setCustomData } = useRightPanel();
  
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [bookData, setBookData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingBook, setLoadingBook] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState('overview');
  const [usageMinutes, setUsageMinutes] = useState(0);
  const [limitMinutes, setLimitMinutes] = useState(120);
  
  // Page viewer state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pageLoading, setPageLoading] = useState(false);
  const [pageContext, setPageContext] = useState<string>('');
  const [showPageHelpers, setShowPageHelpers] = useState(false);

  const cardBg = useColorModeValue('white', 'gray.800');
  const isMobile = useBreakpointValue({ base: true, md: false });

  // Background handling
  const backgroundImages = childExtras?.decorations?.backgroundImages;
  const backgroundImage = backgroundImages?.default;
  const [bgMode, setBgMode] = useState<BackgroundMode>('cover');
  
  useEffect(() => {
    const saved = localStorage.getItem('childBgMode');
    if (saved) setBgMode(saved as BackgroundMode);
  }, []);
  
  const handleBgModeChange = (mode: BackgroundMode) => {
    setBgMode(mode);
    localStorage.setItem('childBgMode', mode);
  };
  
  const bgStyles = getBackgroundStyles(bgMode);

  // Set right panel context - keep closed by default
  // Only run on mount to avoid closing panel when user opens it
  useEffect(() => {
    setContext('child-book-explorer');
    setIsOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update right panel with selected book
  useEffect(() => {
    if (selectedBook) {
      setCustomData({
        selectedBook: {
          id: selectedBook.id,
          title: selectedBook.title,
          author: selectedBook.author,
        },
      });
    } else {
      setCustomData({});
    }
  }, [selectedBook, setCustomData]);

  useEffect(() => {
    fetchBooks();
    fetchUsage();
  }, []);

  // Update right panel context when page changes during page reading mode
  useEffect(() => {
    if (activeSection === 'pages' && selectedBook) {
      setCustomData({ 
        selectedBook, 
        currentPage, 
        totalPages,
        mode: 'page-reader',
        action: 'page-support'
      });
    }
  }, [currentPage, activeSection, selectedBook, totalPages]);

  const fetchUsage = async () => {
    try {
      const res = await fetch('/api/child/dashboard');
      const data = await res.json();
      if (res.ok) {
        setUsageMinutes(data.todayUsageMinutes);
        setLimitMinutes(data.dailyLimitMinutes);
      }
    } catch (error) {
      console.error('Failed to fetch usage:', error);
    }
  };

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
    setCurrentPage(1);

    try {
      const res = await fetch(`/api/child/books/${book.id}/explore?section=overview`);
      if (res.ok) {
        const data = await res.json();
        setBookData(data);
      }
      
      // Load page count for all books with pages (CBZ and PDF)
      if (book.file_type === 'cbz' || book.file_type === 'pdf' || book.title.includes('Comic')) {
        const pagesRes = await fetch(`/api/child/books/${book.id}/pages`);
        if (pagesRes.ok) {
          const pagesData = await pagesRes.json();
          console.log('[Book Explorer] Page count loaded:', pagesData.totalPages);
          setTotalPages(pagesData.totalPages || 0);
        }
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

    // Auto-open right panel with page context when Pages tab is selected
    if (section === 'pages') {
      setCustomData({ 
        selectedBook, 
        currentPage, 
        totalPages,
        mode: 'page-reader',
        action: 'page-support'
      });
      setIsOpen(true);
    }

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

  const filteredBooks = books.filter(book => 
    book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.series_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.author?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTraitEmoji = (trait: string) => {
    const emojiMap: Record<string, string> = {
      brave: '🦁', kind: '💝', curious: '🔍', helpful: '🤝',
      creative: '🎨', honest: '✨', patient: '🧘', responsible: '⭐',
      friendly: '😊', determined: '💪', caring: '🤗', funny: '😄',
    };
    return emojiMap[trait.toLowerCase()] || '✨';
  };

  const getEmotionEmoji = (emotion: string) => {
    const emojiMap: Record<string, string> = {
      happy: '😊', sad: '😢', excited: '🎉', scared: '😨',
      angry: '😠', surprised: '😲', proud: '🏆', worried: '😟',
      relieved: '😌', confused: '🤔',
    };
    return emojiMap[emotion.toLowerCase()] || '💭';
  };

  const getPlotTypeColor = (type: string) => {
    const colorMap: Record<string, string> = {
      beginning: 'green', problem: 'orange', rising_action: 'yellow',
      climax: 'red', resolution: 'blue', ending: 'purple',
    };
    return colorMap[type] || 'gray';
  };

  // Get themed icon path
  const getThemedIcon = (iconKey: string): string | undefined => {
    const iconMap: Record<string, string | undefined> = {
      home: childExtras?.serviceIcons?.home,
      books: childExtras?.serviceIcons?.books,
      writing: childExtras?.serviceIcons?.writing,
      contacts: '/themes/pusheen/Icons/Contacts.png', // Fallback
      notes: childExtras?.serviceIcons?.writing,
    };
    return iconMap[iconKey];
  };

  const usagePercent = Math.min((usageMinutes / limitMinutes) * 100, 100);

  if (loading) {
    return (
      <Container maxW="container.xl" py={8}>
        <VStack spacing={4}>
          <Box
            w="100px"
            h="100px"
            borderRadius="full"
            bg={`${colors?.primary || 'purple.500'}22`}
            display="flex"
            alignItems="center"
            justifyContent="center"
            animation="pulse 1.5s infinite"
          >
            {childExtras?.serviceIcons?.books ? (
              <img 
                src={childExtras.serviceIcons.books} 
                alt="Books" 
                style={{ width: '60px', height: '60px', objectFit: 'contain' }}
              />
            ) : (
              <Text fontSize="4xl">📚</Text>
            )}
          </Box>
          <Text fontWeight="bold" color={colors?.primary || 'purple.600'}>Loading your books...</Text>
          <Progress w="200px" isIndeterminate colorScheme="purple" borderRadius="full" />
        </VStack>
      </Container>
    );
  }

  return (
    <BackgroundContextMenu onModeChange={handleBgModeChange} currentMode={bgMode}>
      <Box
        minH="calc(100vh - 60px)"
        position="relative"
        {...(backgroundImage && {
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: bgStyles.backgroundSize,
          backgroundPosition: bgStyles.backgroundPosition,
          backgroundRepeat: bgStyles.backgroundRepeat,
          backgroundAttachment: bgStyles.backgroundAttachment,
        })}
      >
        {/* Semi-transparent overlay for readability */}
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="rgba(255, 255, 255, 0.85)"
          zIndex={0}
        />

        <Container maxW="container.xl" py={6} position="relative" zIndex={1}>
          <VStack spacing={4} align="stretch">
            {/* Header with themed icon and usage */}
            <HStack justify="space-between" align="center" flexWrap="wrap" gap={4}>
              <HStack spacing={4}>
                <IconButton
                  icon={<FiArrowLeft />}
                  aria-label="Back"
                  variant="ghost"
                  onClick={() => router.push('/child/home')}
                  borderRadius="full"
                />
                <Box
                  bg={`${colors?.primary || 'purple.500'}22`}
                  p={3}
                  borderRadius="xl"
                >
                  {childExtras?.serviceIcons?.books ? (
                    <img 
                      src={childExtras.serviceIcons.books} 
                      alt="Books" 
                      style={{ width: '40px', height: '40px', objectFit: 'contain' }}
                    />
                  ) : (
                    <Text fontSize="2xl">📚</Text>
                  )}
                </Box>
                <Box>
                  <Heading size="lg" color={colors?.primary || 'purple.600'}>
                    {selectedBook ? selectedBook.title : 'Book Explorer'}
                  </Heading>
                  <Text color="gray.600" fontSize="sm">
                    {selectedBook 
                      ? (selectedBook.author ? `by ${selectedBook.author}` : selectedBook.series_name || '')
                      : 'Discover amazing stories!'}
                  </Text>
                </Box>
              </HStack>

              {/* Usage indicator */}
              <HStack spacing={2} bg="white" px={4} py={2} borderRadius="full" boxShadow="sm">
                {childExtras?.serviceIcons?.clock ? (
                  <img 
                    src={childExtras.serviceIcons.clock} 
                    alt="Time" 
                    style={{ width: '20px', height: '20px', objectFit: 'contain' }}
                  />
                ) : (
                  <Text>⏰</Text>
                )}
                <Text fontSize="sm" fontWeight="medium">
                  {Math.max(0, limitMinutes - usageMinutes)}m left
                </Text>
                <Box w="60px">
                  <Progress
                    value={usagePercent}
                    size="sm"
                    colorScheme={usagePercent > 80 ? 'red' : usagePercent > 50 ? 'orange' : 'green'}
                    borderRadius="full"
                  />
                </Box>
              </HStack>
            </HStack>

            {!selectedBook ? (
              // Book Library View
              <>
                {/* Search bar */}
                <Box bg="white" p={4} borderRadius="xl" boxShadow="md">
                  <InputGroup>
                    <InputLeftElement>
                      <Icon as={FiSearch} color="gray.400" />
                    </InputLeftElement>
                    <Input
                      placeholder="Search for a book..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      borderRadius="full"
                      borderColor={`${colors?.primary || 'purple.500'}44`}
                      _focus={{ borderColor: colors?.primary || 'purple.500' }}
                    />
                  </InputGroup>
                </Box>

                {/* Books Grid */}
                {filteredBooks.length === 0 ? (
                  <Card bg={cardBg} p={8} textAlign="center" borderRadius="2xl" boxShadow="xl">
                    <CardBody>
                      <VStack spacing={4}>
                        {childExtras?.serviceIcons?.books ? (
                          <img 
                            src={childExtras.serviceIcons.books} 
                            alt="Books" 
                            style={{ width: '80px', height: '80px', objectFit: 'contain', opacity: 0.5 }}
                          />
                        ) : (
                          <Text fontSize="5xl">📚</Text>
                        )}
                        <Heading size="md" color="gray.500">
                          {searchQuery ? 'No books found!' : 'No Books Yet!'}
                        </Heading>
                        <Text color="gray.400">
                          {searchQuery 
                            ? 'Try a different search term.' 
                            : 'Ask a parent to add some books to your library.'}
                        </Text>
                      </VStack>
                    </CardBody>
                  </Card>
                ) : (
                  <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing={4}>
                    {filteredBooks.map((book) => (
                      <Card
                        key={book.id}
                        bg={cardBg}
                        cursor="pointer"
                        onClick={() => selectBook(book)}
                        _hover={{ transform: 'translateY(-4px)', shadow: 'lg' }}
                        transition="all 0.2s"
                        overflow="hidden"
                        borderRadius="xl"
                        boxShadow="md"
                      >
                        {/* Book Cover with themed gradient */}
                        <Box
                          h="100px"
                          bg={`linear-gradient(135deg, ${colors?.primary || '#9f7aea'}22, ${colors?.secondary || '#805ad5'}44)`}
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          position="relative"
                        >
                          {childExtras?.serviceIcons?.books ? (
                            <img 
                              src={childExtras.serviceIcons.books} 
                              alt="Book" 
                              style={{ width: '50px', height: '50px', objectFit: 'contain' }}
                            />
                          ) : (
                            <Text fontSize="3xl">📖</Text>
                          )}
                          {book.graphrag_indexed && (
                            <Badge 
                              position="absolute" 
                              top={2} 
                              right={2} 
                              colorScheme="purple" 
                              fontSize="2xs"
                            >
                              ✨ Interactive
                            </Badge>
                          )}
                        </Box>
                        
                        <CardBody p={4}>
                          <VStack align="start" spacing={2}>
                            <Heading size="sm" noOfLines={2}>{book.title}</Heading>
                            
                            {book.series_name && (
                              <Badge colorScheme="purple" fontSize="2xs">{book.series_name}</Badge>
                            )}
                            
                            {book.author && (
                              <Text fontSize="xs" color="gray.500">by {book.author}</Text>
                            )}
                            
                            <HStack fontSize="xs" color="gray.400">
                              <Icon as={FiBookOpen} />
                              <Text>{book.page_count} pages</Text>
                            </HStack>
                          </VStack>
                        </CardBody>
                      </Card>
                    ))}
                  </SimpleGrid>
                )}
              </>
            ) : (
              // Book Exploration View - PAGE-CENTRIC LAYOUT
              <Flex direction="column" h="calc(100vh - 200px)" gap={4}>
                {/* Top Bar - Back button and book info */}
                <HStack justify="space-between" align="center" bg="white" p={3} borderRadius="xl" boxShadow="md">
                  <HStack spacing={3}>
                    <Button
                      leftIcon={<FiChevronLeft />}
                      variant="ghost"
                      onClick={() => setSelectedBook(null)}
                      size="sm"
                    >
                      Library
                    </Button>
                    <Divider orientation="vertical" h="30px" />
                    <VStack align="start" spacing={0}>
                      <Text fontWeight="bold" fontSize="sm" noOfLines={1}>{selectedBook.title}</Text>
                      {selectedBook.author && <Text fontSize="xs" color="gray.500">by {selectedBook.author}</Text>}
                    </VStack>
                  </HStack>
                  
                  {/* Page Counter */}
                  <HStack spacing={3}>
                    <Badge colorScheme="purple" fontSize="md" px={3} py={1} borderRadius="full">
                      Page {currentPage} of {totalPages || selectedBook.page_count}
                    </Badge>
                    <Progress 
                      value={(currentPage / (totalPages || selectedBook.page_count || 1)) * 100} 
                      size="sm" 
                      colorScheme="purple" 
                      borderRadius="full"
                      w="100px"
                    />
                    <Tooltip label="Fullscreen Reader (iPad)" hasArrow>
                      <IconButton
                        aria-label="Open fullscreen reader"
                        icon={<FiMaximize />}
                        colorScheme="purple"
                        variant="solid"
                        size="sm"
                        borderRadius="full"
                        onClick={() => router.push(`/child/reader/${selectedBook.id}`)}
                      />
                    </Tooltip>
                  </HStack>
                </HStack>

                {/* Main Content - Page Viewer (PRIMARY) */}
                <Flex flex={1} gap={4} minH={0}>
                  {/* Comic Page - Takes most of the space */}
                  <Box 
                    flex={1} 
                    bg="gray.900" 
                    borderRadius="2xl" 
                    overflow="hidden"
                    position="relative"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    {/* Navigation Arrows - Large and accessible */}
                    <IconButton
                      aria-label="Previous page"
                      icon={<FiChevronLeft size={32} />}
                      position="absolute"
                      left={2}
                      top="50%"
                      transform="translateY(-50%)"
                      size="lg"
                      colorScheme="whiteAlpha"
                      variant="solid"
                      borderRadius="full"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      isDisabled={currentPage <= 1}
                      zIndex={10}
                      opacity={0.8}
                      _hover={{ opacity: 1 }}
                    />
                    
                    <IconButton
                      aria-label="Next page"
                      icon={<FiChevronLeft size={32} style={{ transform: 'rotate(180deg)' }} />}
                      position="absolute"
                      right={2}
                      top="50%"
                      transform="translateY(-50%)"
                      size="lg"
                      colorScheme="whiteAlpha"
                      variant="solid"
                      borderRadius="full"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages || selectedBook.page_count, prev + 1))}
                      isDisabled={currentPage >= (totalPages || selectedBook.page_count)}
                      zIndex={10}
                      opacity={0.8}
                      _hover={{ opacity: 1 }}
                    />

                    {/* Page Image */}
                    {pageLoading ? (
                      <VStack spacing={3}>
                        <Spinner size="xl" color="white" thickness="4px" />
                        <Text color="white">Loading page...</Text>
                      </VStack>
                    ) : (
                      <Box
                        as="img"
                        src={`/api/child/books/${selectedBook.id}/pages?page=${currentPage}`}
                        alt={`Page ${currentPage}`}
                        maxW="100%"
                        maxH="100%"
                        objectFit="contain"
                        onLoad={() => setPageLoading(false)}
                        onError={() => setPageLoading(false)}
                      />
                    )}
                  </Box>

                  {/* Side Panel - Activities (SECONDARY) */}
                  <Box 
                    w={{ base: '200px', lg: '240px', xl: '280px' }}
                    minW="180px"
                    bg="white" 
                    borderRadius="2xl" 
                    boxShadow="lg" 
                    p={{ base: 2, lg: 3, xl: 4 }}
                    display={{ base: 'none', md: 'flex' }}
                    flexDirection="column"
                    gap={2}
                    overflowY="auto"
                    flexShrink={0}
                  >
                    {/* AI Helper Section */}
                    <Box>
                      <HStack mb={1}>
                        <Text fontSize="sm">🤖</Text>
                        <Text fontWeight="bold" fontSize="xs" color="purple.700">Helper</Text>
                      </HStack>
                      <VStack spacing={1}>
                        <Button
                          size="xs"
                          w="full"
                          variant="outline"
                          colorScheme="blue"
                          leftIcon={<Text fontSize="xs">🔍</Text>}
                          fontSize="xs"
                          onClick={() => {
                            setCustomData({ selectedBook, currentPage, action: 'explain-page' });
                            setIsOpen(true);
                          }}
                        >
                          Explain Page
                        </Button>
                        <Button
                          size="xs"
                          w="full"
                          variant="outline"
                          colorScheme="green"
                          leftIcon={<Text fontSize="xs">📝</Text>}
                          fontSize="xs"
                          onClick={() => {
                            setCustomData({ selectedBook, currentPage, action: 'vocabulary-page' });
                            setIsOpen(true);
                          }}
                        >
                          Words
                        </Button>
                        <Button
                          size="xs"
                          w="full"
                          variant="outline"
                          colorScheme="orange"
                          leftIcon={<Text fontSize="xs">❓</Text>}
                          fontSize="xs"
                          onClick={() => {
                            setCustomData({ selectedBook, currentPage, action: 'quiz-page' });
                            setIsOpen(true);
                          }}
                        >
                          Quiz
                        </Button>
                      </VStack>
                    </Box>

                    <Divider />

                    {/* Book Activities Section */}
                    <Box>
                      <HStack mb={1}>
                        <Text fontSize="sm">📚</Text>
                        <Text fontWeight="bold" fontSize="xs" color="gray.700">Explore</Text>
                      </HStack>
                      <VStack spacing={1}>
                        <Button
                          size="xs"
                          w="full"
                          variant="ghost"
                          justifyContent="flex-start"
                          leftIcon={<Text fontSize="xs">👥</Text>}
                          fontSize="xs"
                          onClick={() => {
                            setActiveSection('characters');
                            loadSection('characters');
                          }}
                        >
                          Characters ({bookData?.data?.stats?.characters || 0})
                        </Button>
                        <Button
                          size="xs"
                          w="full"
                          variant="ghost"
                          justifyContent="flex-start"
                          leftIcon={<Text fontSize="xs">💡</Text>}
                          fontSize="xs"
                          onClick={() => {
                            setActiveSection('themes');
                            loadSection('themes');
                          }}
                        >
                          Themes ({bookData?.data?.stats?.themes || 0})
                        </Button>
                        <Button
                          size="xs"
                          w="full"
                          variant="ghost"
                          justifyContent="flex-start"
                          leftIcon={<Text fontSize="xs">📖</Text>}
                          fontSize="xs"
                          onClick={() => {
                            setActiveSection('story');
                            loadSection('story');
                          }}
                        >
                          Story ({bookData?.data?.stats?.storyParts || 0})
                        </Button>
                        <Button
                          size="xs"
                          w="full"
                          variant="ghost"
                          justifyContent="flex-start"
                          leftIcon={<Text fontSize="xs">📝</Text>}
                          fontSize="xs"
                          onClick={() => {
                            setActiveSection('vocabulary');
                            loadSection('vocabulary');
                          }}
                        >
                          Words ({bookData?.data?.stats?.vocabularyWords || 0})
                        </Button>
                      </VStack>
                    </Box>

                    {/* Book Summary - Hidden on smaller screens */}
                    {bookData?.data?.summary && (
                      <Box display={{ base: 'none', xl: 'block' }}>
                        <HStack mb={1}>
                          <Text fontSize="sm">📋</Text>
                          <Text fontWeight="bold" fontSize="xs" color="gray.700">Summary</Text>
                        </HStack>
                        <Text fontSize="2xs" color="gray.600" noOfLines={3}>
                          {bookData.data.summary}
                        </Text>
                      </Box>
                    )}
                  </Box>
                </Flex>

                {/* Bottom Navigation Bar - Page controls */}
                <HStack 
                  bg="white" 
                  p={3} 
                  borderRadius="xl" 
                  boxShadow="md" 
                  justify="center"
                  spacing={4}
                >
                  <Button
                    leftIcon={<FiChevronLeft />}
                    onClick={() => setCurrentPage(1)}
                    isDisabled={currentPage <= 1}
                    size="sm"
                    variant="ghost"
                  >
                    First
                  </Button>
                  <Button
                    leftIcon={<FiChevronLeft />}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    isDisabled={currentPage <= 1}
                    colorScheme="purple"
                    size="sm"
                  >
                    Previous
                  </Button>
                  
                  <HStack spacing={2} bg="gray.100" px={4} py={2} borderRadius="lg">
                    <Input
                      type="number"
                      value={currentPage}
                      onChange={(e) => {
                        const page = parseInt(e.target.value);
                        if (page >= 1 && page <= (totalPages || selectedBook.page_count)) {
                          setCurrentPage(page);
                        }
                      }}
                      min={1}
                      max={totalPages || selectedBook.page_count}
                      width="60px"
                      size="sm"
                      textAlign="center"
                      fontWeight="bold"
                    />
                    <Text fontSize="sm" color="gray.600">of {totalPages || selectedBook.page_count}</Text>
                  </HStack>
                  
                  <Button
                    rightIcon={<FiChevronLeft style={{ transform: 'rotate(180deg)' }} />}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages || selectedBook.page_count, prev + 1))}
                    isDisabled={currentPage >= (totalPages || selectedBook.page_count)}
                    colorScheme="purple"
                    size="sm"
                  >
                    Next
                  </Button>
                  <Button
                    rightIcon={<FiChevronLeft style={{ transform: 'rotate(180deg)' }} />}
                    onClick={() => setCurrentPage(totalPages || selectedBook.page_count)}
                    isDisabled={currentPage >= (totalPages || selectedBook.page_count)}
                    size="sm"
                    variant="ghost"
                  >
                    Last
                  </Button>
                </HStack>
              </Flex>
            )}
          </VStack>
        </Container>
      </Box>
    </BackgroundContextMenu>
  );
}

// Helper Components
function LoadingState({ colors, childExtras }: { colors: any; childExtras: any }) {
  return (
    <VStack py={8}>
      <Box
        w="80px"
        h="80px"
        borderRadius="full"
        bg={`${colors?.primary || 'purple.500'}22`}
        display="flex"
        alignItems="center"
        justifyContent="center"
        animation="pulse 1.5s infinite"
      >
        {childExtras?.serviceIcons?.books ? (
          <img 
            src={childExtras.serviceIcons.books} 
            alt="Loading" 
            style={{ width: '40px', height: '40px', objectFit: 'contain' }}
          />
        ) : (
          <Text fontSize="2xl">📚</Text>
        )}
      </Box>
      <Progress w="150px" isIndeterminate colorScheme="purple" borderRadius="full" size="sm" />
    </VStack>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card bg="gray.50" p={8} textAlign="center">
      <VStack>
        <Text fontSize="3xl">📭</Text>
        <Text color="gray.500">{message}</Text>
      </VStack>
    </Card>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <Card 
      bg={`${color}.50`} 
      p={5} 
      textAlign="center"
      borderRadius="3xl"
      borderWidth="3px"
      borderColor={`${color}.200`}
      boxShadow="lg"
      transition="all 0.2s"
      _hover={{
        transform: 'translateY(-4px)',
        boxShadow: '2xl',
        borderColor: `${color}.300`,
      }}
    >
      <Text fontSize="4xl" mb={2}>{icon}</Text>
      <Heading size="2xl" color={`${color}.600`} fontWeight="black">{value}</Heading>
      <Text fontSize="sm" color={`${color}.600`} fontWeight="bold" mt={1}>{label}</Text>
    </Card>
  );
}

function CharacterCard({ character, getTraitEmoji }: { character: Character; getTraitEmoji: (t: string) => string }) {
  return (
    <Card 
      bg="white" 
      p={5} 
      borderWidth="3px" 
      borderColor={character.type === 'protagonist' ? 'pink.200' : 'blue.200'}
      borderRadius="2xl"
      boxShadow="lg"
      transition="all 0.2s"
      _hover={{
        transform: 'scale(1.02)',
        boxShadow: '2xl',
        borderColor: character.type === 'protagonist' ? 'pink.300' : 'blue.300',
      }}
    >
      <HStack align="start" spacing={4}>
        <Avatar 
          name={character.name} 
          bg={character.type === 'protagonist' ? 'pink.400' : 'blue.400'}
          size="xl"
          borderWidth="3px"
          borderColor={character.type === 'protagonist' ? 'pink.300' : 'blue.300'}
        />
        <VStack align="start" spacing={2} flex={1}>
          <HStack>
            <Heading size="md" color={character.type === 'protagonist' ? 'pink.600' : 'blue.600'}>
              {character.name}
            </Heading>
            {character.type === 'protagonist' && (
              <Badge colorScheme="pink" fontSize="sm" px={2} py={1} borderRadius="full">⭐ Main</Badge>
            )}
          </HStack>
          
          {character.age && (
            <Text fontSize="sm" color="gray.600" fontWeight="medium">{character.age}</Text>
          )}
          
          <Text fontSize="sm">{character.description}</Text>
          
          {character.traits?.length > 0 && (
            <Wrap>
              {character.traits.slice(0, 4).map((trait) => (
                <WrapItem key={trait}>
                  <Badge colorScheme="purple" fontSize="xs">
                    {getTraitEmoji(trait)} {trait}
                  </Badge>
                </WrapItem>
              ))}
            </Wrap>
          )}
          
          {character.funFact && (
            <Card bg="yellow.50" p={2} size="sm">
              <Text fontSize="xs">💡 {character.funFact}</Text>
            </Card>
          )}
        </VStack>
      </HStack>
    </Card>
  );
}

function ThemeCard({ theme }: { theme: Theme }) {
  return (
    <Card 
      bg="white" 
      p={5} 
      borderWidth="3px" 
      borderColor="purple.200"
      borderRadius="2xl"
      boxShadow="lg"
      transition="all 0.2s"
      _hover={{
        transform: 'translateY(-4px)',
        boxShadow: '2xl',
        borderColor: 'purple.300',
      }}
    >
      <VStack align="start" spacing={3}>
        <Badge colorScheme="purple" fontSize="md" p={3} borderRadius="full" fontWeight="bold">
          💡 {theme.title}
        </Badge>
        
        <Text fontSize="md">{theme.description}</Text>
        
        <Card bg="green.50" p={4} w="100%" borderRadius="xl" borderWidth="2px" borderColor="green.200">
          <Text fontWeight="bold" color="green.700" fontSize="sm">🎓 What we can learn:</Text>
          <Text color="green.600" fontSize="sm" mt={1}>{theme.lesson}</Text>
        </Card>
        
        {theme.discussionQuestions?.length > 0 && (
          <Box>
            <Text fontWeight="bold" mb={2} fontSize="sm">🤔 Think about:</Text>
            <VStack align="start" spacing={1}>
              {theme.discussionQuestions.slice(0, 3).map((q, i) => (
                <Text key={i} fontSize="xs" color="gray.600">• {q}</Text>
              ))}
            </VStack>
          </Box>
        )}
      </VStack>
    </Card>
  );
}

function PlotCard({ 
  plot, 
  index, 
  getPlotTypeColor, 
  getEmotionEmoji 
}: { 
  plot: PlotPoint; 
  index: number;
  getPlotTypeColor: (t: string) => string;
  getEmotionEmoji: (e: string) => string;
}) {
  return (
    <Card 
      bg="white" 
      p={5} 
      borderWidth="3px" 
      borderColor={`${getPlotTypeColor(plot.type || 'gray')}.200`}
      borderRadius="2xl"
      boxShadow="lg"
      transition="all 0.2s"
      _hover={{
        transform: 'translateX(8px)',
        boxShadow: '2xl',
        borderColor: `${getPlotTypeColor(plot.type || 'gray')}.300`,
      }}
    >
      <HStack align="start" spacing={4}>
        <Box
          bg={`${getPlotTypeColor(plot.type || 'gray')}.100`}
          color={`${getPlotTypeColor(plot.type || 'gray')}.700`}
          p={4}
          borderRadius="full"
          fontWeight="black"
          minW="50px"
          minH="50px"
          display="flex"
          alignItems="center"
          justifyContent="center"
          fontSize="xl"
          borderWidth="3px"
          borderColor={`${getPlotTypeColor(plot.type || 'gray')}.300`}
        >
          {index + 1}
        </Box>
        <VStack align="start" spacing={2} flex={1}>
          <HStack>
            <Heading size="sm">{plot.title}</Heading>
            {plot.type && (
              <Badge colorScheme={getPlotTypeColor(plot.type)} fontSize="xs">
                {plot.type.replace('_', ' ')}
              </Badge>
            )}
          </HStack>
          
          <Text fontSize="sm">{plot.description}</Text>
          
          {plot.emotions?.length > 0 && (
            <HStack>
              <Text fontSize="xs" color="gray.500">Feelings:</Text>
              {plot.emotions.slice(0, 4).map((emotion) => (
                <Tooltip key={emotion} label={emotion}>
                  <Text fontSize="lg">{getEmotionEmoji(emotion)}</Text>
                </Tooltip>
              ))}
            </HStack>
          )}
        </VStack>
      </HStack>
    </Card>
  );
}

function VocabCard({ word }: { word: VocabWord }) {
  return (
    <Card 
      bg="white" 
      p={5} 
      borderWidth="3px" 
      borderColor="green.200"
      borderRadius="2xl"
      boxShadow="lg"
      transition="all 0.2s"
      _hover={{
        transform: 'scale(1.05)',
        boxShadow: '2xl',
        borderColor: 'green.300',
      }}
    >
      <VStack align="start" spacing={2}>
        <HStack>
          <Heading size="md" color="purple.600" fontWeight="black">{word.word}</Heading>
          <Badge 
            fontSize="xs"
            px={2}
            py={1}
            borderRadius="full"
            colorScheme={
              word.difficulty === 'easy' ? 'green' : 
              word.difficulty === 'hard' ? 'red' : 'yellow'
            }
          >
            {word.difficulty}
          </Badge>
        </HStack>
        
        <Text fontSize="sm">{word.definition}</Text>
        
        {word.example && (
          <Card bg="blue.50" p={2} w="100%">
            <Text fontSize="xs" fontStyle="italic" color="blue.700">
              "{word.example}"
            </Text>
          </Card>
        )}
      </VStack>
    </Card>
  );
}

export default function BookExplorerPage() {
  return (
    <ChildDashboardLayout pageType="books">
        <BookExplorerContent />
      </ChildDashboardLayout>
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
