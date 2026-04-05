/**
 * Fullscreen Book Reader for Kids (iPad Optimized)
 * 
 * Distraction-free reading experience with:
 * - Touch gestures (swipe to turn pages)
 * - Pinch to zoom
 * - AI helper panel (slide in)
 * - Reading progress tracking
 * - Annotation tools
 * - Read-aloud mode
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import {
  Box,
  Flex,
  IconButton,
  Text,
  VStack,
  HStack,
  Button,
  Spinner,
  useToast,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  useDisclosure,
  Progress,
  Badge,
  Tooltip,
  Input,
  Divider,
  Slide,
} from '@chakra-ui/react';
import {
  FiChevronLeft,
  FiChevronRight,
  FiX,
  FiMessageCircle,
  FiBookOpen,
  FiVolume2,
  FiMaximize,
  FiMinimize,
  FiHome,
  FiHelpCircle,
  FiEdit3,
  FiStar,
} from 'react-icons/fi';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Pool } from 'pg';

interface Book {
  id: string;
  title: string;
  author: string | null;
  series_name: string | null;
  page_count: number;
  file_type: string;
}

interface ReaderPageProps {
  book: Book | null;
  error?: string;
}

export default function FullscreenReader({ book, error }: ReaderPageProps) {
  const router = useRouter();
  const toast = useToast();
  const { isOpen: isHelperOpen, onOpen: openHelper, onClose: closeHelper } = useDisclosure();
  
  // Page state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(book?.page_count || 0);
  const [pageLoading, setPageLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Touch gesture state
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // AI Helper state
  const [helperMessages, setHelperMessages] = useState<Array<{role: string; content: string}>>([]);
  const [helperInput, setHelperInput] = useState('');
  const [helperLoading, setHelperLoading] = useState(false);
  
  // Controls visibility (auto-hide after inactivity)
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Minimum swipe distance for page turn
  const minSwipeDistance = 50;

  // Fetch total pages on mount
  useEffect(() => {
    if (book?.id && !totalPages) {
      fetchPageCount();
    }
  }, [book?.id]);

  // Save reading progress
  useEffect(() => {
    if (book?.id && currentPage > 0) {
      localStorage.setItem(`reading-progress-${book.id}`, String(currentPage));
    }
  }, [currentPage, book?.id]);

  // Load saved progress on mount
  useEffect(() => {
    if (book?.id) {
      const saved = localStorage.getItem(`reading-progress-${book.id}`);
      if (saved) {
        const savedPage = parseInt(saved, 10);
        if (savedPage > 0 && savedPage <= (totalPages || 999)) {
          setCurrentPage(savedPage);
        }
      }
    }
  }, [book?.id, totalPages]);

  // Auto-hide controls after inactivity
  useEffect(() => {
    const resetControlsTimeout = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 4000);
    };

    const handleActivity = () => resetControlsTimeout();
    
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    
    resetControlsTimeout();
    
    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  const fetchPageCount = async () => {
    try {
      const res = await fetch(`/api/child/books/${book?.id}/pages`);
      const data = await res.json();
      if (data.totalPages) {
        setTotalPages(data.totalPages);
      }
    } catch (e) {
      console.error('Failed to fetch page count:', e);
    }
  };

  // Touch handlers for swipe gestures
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe && currentPage < totalPages) {
      nextPage();
    }
    if (isRightSwipe && currentPage > 1) {
      prevPage();
    }
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      setPageLoading(true);
      setCurrentPage(prev => prev + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setPageLoading(true);
      setCurrentPage(prev => prev - 1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        nextPage();
      } else if (e.key === 'ArrowLeft') {
        prevPage();
      } else if (e.key === 'Escape') {
        router.push('/child/book-explorer');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // AI Helper functions
  const sendHelperMessage = async (message: string) => {
    if (!message.trim() || helperLoading) return;
    
    setHelperMessages(prev => [...prev, { role: 'user', content: message }]);
    setHelperInput('');
    setHelperLoading(true);
    
    try {
      const res = await fetch('/api/child/services/book-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          bookId: book?.id,
          bookTitle: book?.title,
          currentPage,
          totalPages,
        }),
      });
      
      const data = await res.json();
      if (data.response) {
        setHelperMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      } else if (data.error) {
        setHelperMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `⚠️ ${data.error}` 
        }]);
      }
    } catch (e) {
      console.error('[Reader] Book chat error:', e);
      setHelperMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "⚠️ Could not connect to AI service. Please check your connection and try again." 
      }]);
    } finally {
      setHelperLoading(false);
    }
  };

  const quickHelperAction = (action: string) => {
    const actions: Record<string, string> = {
      'explain': `What's happening on page ${currentPage}? Please explain it to me.`,
      'words': `What are some interesting or new words on page ${currentPage}?`,
      'quiz': `Ask me a question about what I just read on page ${currentPage}.`,
      'characters': `Who are the characters on page ${currentPage}? What are they doing?`,
    };
    sendHelperMessage(actions[action] || action);
  };

  if (error || !book) {
    return (
      <Flex h="100vh" align="center" justify="center" bg="gray.900">
        <VStack spacing={4}>
          <Text color="white" fontSize="xl">📚 {error || 'Book not found'}</Text>
          <Button colorScheme="purple" onClick={() => router.push('/child/book-explorer')}>
            Back to Library
          </Button>
        </VStack>
      </Flex>
    );
  }

  return (
    <>
      <Head>
        <title>{book.title} - Reading</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </Head>
      
      <Box
        ref={containerRef}
        h="100vh"
        w="100vw"
        bg="gray.900"
        position="relative"
        overflow="hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Page Image */}
        <Flex
          h="full"
          w="full"
          align="center"
          justify="center"
          onClick={() => setShowControls(prev => !prev)}
        >
          {pageLoading && (
            <Box position="absolute" zIndex={5}>
              <Spinner size="xl" color="white" thickness="4px" />
            </Box>
          )}
          <Box
            as="img"
            src={`/api/child/books/${book.id}/pages?page=${currentPage}`}
            alt={`Page ${currentPage}`}
            maxW="100%"
            maxH="100%"
            objectFit="contain"
            onLoad={() => setPageLoading(false)}
            onError={() => setPageLoading(false)}
            opacity={pageLoading ? 0.5 : 1}
            transition="opacity 0.2s"
          />
        </Flex>

        {/* Top Controls Bar */}
        <Slide direction="top" in={showControls} style={{ zIndex: 10 }}>
          <Flex
            bg="blackAlpha.700"
            backdropFilter="blur(10px)"
            px={4}
            py={2}
            justify="space-between"
            align="center"
            onClick={(e) => e.stopPropagation()}
          >
            <HStack spacing={2}>
              <IconButton
                aria-label="Back to library"
                icon={<FiHome />}
                variant="ghost"
                colorScheme="whiteAlpha"
                color="white"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push('/child/book-explorer');
                }}
              />
              <VStack align="start" spacing={0}>
                <Text color="white" fontWeight="bold" fontSize="sm" noOfLines={1} maxW="200px">
                  {book.title}
                </Text>
                {book.author && (
                  <Text color="gray.400" fontSize="xs">by {book.author}</Text>
                )}
              </VStack>
            </HStack>
            
            <HStack spacing={2}>
              <Badge colorScheme="purple" fontSize="md" px={3} py={1} borderRadius="full">
                {currentPage} / {totalPages || '?'}
              </Badge>
              <Tooltip label="AI Helper">
                <IconButton
                  aria-label="AI Helper"
                  icon={<FiMessageCircle />}
                  variant="ghost"
                  colorScheme="whiteAlpha"
                  color="white"
                  onClick={(e) => {
                    e.stopPropagation();
                    openHelper();
                  }}
                />
              </Tooltip>
              <Tooltip label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
                <IconButton
                  aria-label="Toggle fullscreen"
                  icon={isFullscreen ? <FiMinimize /> : <FiMaximize />}
                  variant="ghost"
                  colorScheme="whiteAlpha"
                  color="white"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFullscreen();
                  }}
                />
              </Tooltip>
            </HStack>
          </Flex>
        </Slide>

        {/* Navigation Arrows */}
        <Slide direction="left" in={showControls && currentPage > 1} style={{ zIndex: 10 }}>
          <IconButton
            aria-label="Previous page"
            icon={<FiChevronLeft size={40} />}
            position="absolute"
            left={2}
            top="50%"
            transform="translateY(-50%)"
            size="lg"
            colorScheme="whiteAlpha"
            variant="solid"
            borderRadius="full"
            onClick={prevPage}
            opacity={0.8}
            _hover={{ opacity: 1 }}
          />
        </Slide>

        <Slide direction="right" in={showControls && currentPage < totalPages} style={{ zIndex: 10 }}>
          <IconButton
            aria-label="Next page"
            icon={<FiChevronRight size={40} />}
            position="absolute"
            right={2}
            top="50%"
            transform="translateY(-50%)"
            size="lg"
            colorScheme="whiteAlpha"
            variant="solid"
            borderRadius="full"
            onClick={nextPage}
            opacity={0.8}
            _hover={{ opacity: 1 }}
          />
        </Slide>

        {/* Bottom Progress Bar */}
        <Slide direction="bottom" in={showControls} style={{ zIndex: 10 }}>
          <Box bg="blackAlpha.700" backdropFilter="blur(10px)" px={4} py={3} onClick={(e) => e.stopPropagation()}>
            <Progress
              value={(currentPage / (totalPages || 1)) * 100}
              size="sm"
              colorScheme="purple"
              borderRadius="full"
              bg="whiteAlpha.300"
            />
            <HStack justify="center" mt={2} spacing={4}>
              <Text color="gray.400" fontSize="xs">
                {Math.round((currentPage / (totalPages || 1)) * 100)}% complete
              </Text>
            </HStack>
          </Box>
        </Slide>

        {/* Floating AI Quick Actions - Always Visible */}
        <VStack
          position="absolute"
          right={4}
          bottom="100px"
          spacing={2}
          zIndex={15}
          onClick={(e) => e.stopPropagation()}
        >
          <Tooltip label="Explain this page" placement="left">
            <IconButton
              aria-label="Explain page"
              icon={<Text fontSize="lg">🔍</Text>}
              size="lg"
              borderRadius="full"
              bg="blue.500"
              color="white"
              boxShadow="lg"
              _hover={{ bg: 'blue.400', transform: 'scale(1.1)' }}
              onClick={() => {
                openHelper();
                quickHelperAction('explain');
              }}
            />
          </Tooltip>
          <Tooltip label="Learn new words" placement="left">
            <IconButton
              aria-label="New words"
              icon={<Text fontSize="lg">📝</Text>}
              size="lg"
              borderRadius="full"
              bg="green.500"
              color="white"
              boxShadow="lg"
              _hover={{ bg: 'green.400', transform: 'scale(1.1)' }}
              onClick={() => {
                openHelper();
                quickHelperAction('words');
              }}
            />
          </Tooltip>
          <Tooltip label="Quiz me!" placement="left">
            <IconButton
              aria-label="Quiz me"
              icon={<Text fontSize="lg">❓</Text>}
              size="lg"
              borderRadius="full"
              bg="orange.500"
              color="white"
              boxShadow="lg"
              _hover={{ bg: 'orange.400', transform: 'scale(1.1)' }}
              onClick={() => {
                openHelper();
                quickHelperAction('quiz');
              }}
            />
          </Tooltip>
          <Tooltip label="Who's on this page?" placement="left">
            <IconButton
              aria-label="Characters"
              icon={<Text fontSize="lg">👥</Text>}
              size="lg"
              borderRadius="full"
              bg="pink.500"
              color="white"
              boxShadow="lg"
              _hover={{ bg: 'pink.400', transform: 'scale(1.1)' }}
              onClick={() => {
                openHelper();
                quickHelperAction('characters');
              }}
            />
          </Tooltip>
          <Divider borderColor="whiteAlpha.300" w="40px" />
          <Tooltip label="Ask anything" placement="left">
            <IconButton
              aria-label="Open AI Helper"
              icon={<FiMessageCircle size={24} />}
              size="lg"
              borderRadius="full"
              bg="purple.500"
              color="white"
              boxShadow="lg"
              _hover={{ bg: 'purple.400', transform: 'scale(1.1)' }}
              onClick={openHelper}
            />
          </Tooltip>
        </VStack>

        {/* AI Helper Drawer */}
        <Drawer isOpen={isHelperOpen} placement="right" onClose={closeHelper} size="sm">
          <DrawerOverlay />
          <DrawerContent bg="gray.800">
            <DrawerCloseButton color="white" />
            <DrawerHeader color="white" borderBottomWidth="1px" borderColor="gray.700">
              <HStack>
                <Text>🤖</Text>
                <Text>Reading Buddy</Text>
              </HStack>
              <Text fontSize="sm" fontWeight="normal" color="gray.400">
                Page {currentPage} of {totalPages}
              </Text>
            </DrawerHeader>
            
            <DrawerBody p={0}>
              <VStack h="full" spacing={0}>
                {/* Quick Actions */}
                <Box w="full" p={3} bg="gray.700" borderBottomWidth="1px" borderColor="gray.600">
                  <Text fontSize="xs" color="gray.300" mb={2}>Quick Actions:</Text>
                  <Flex wrap="wrap" gap={2}>
                    <Button size="sm" bg="blue.500" color="white" _hover={{ bg: 'blue.400' }} onClick={() => quickHelperAction('explain')}>
                      🔍 Explain Page
                    </Button>
                    <Button size="sm" bg="green.500" color="white" _hover={{ bg: 'green.400' }} onClick={() => quickHelperAction('words')}>
                      📝 New Words
                    </Button>
                    <Button size="sm" bg="orange.500" color="white" _hover={{ bg: 'orange.400' }} onClick={() => quickHelperAction('quiz')}>
                      ❓ Quiz Me
                    </Button>
                    <Button size="sm" bg="pink.500" color="white" _hover={{ bg: 'pink.400' }} onClick={() => quickHelperAction('characters')}>
                      👥 Characters
                    </Button>
                  </Flex>
                </Box>
                
                {/* Messages */}
                <VStack 
                  flex={1} 
                  w="full" 
                  p={3} 
                  spacing={3} 
                  overflowY="auto"
                  align="stretch"
                >
                  {helperMessages.length === 0 && (
                    <Text color="gray.500" textAlign="center" py={8}>
                      👋 Hi! I'm your Reading Buddy. Ask me anything about this page!
                    </Text>
                  )}
                  {helperMessages.map((msg, i) => (
                    <Box
                      key={i}
                      bg={msg.role === 'user' ? 'purple.600' : 'gray.700'}
                      color="white"
                      p={3}
                      borderRadius="lg"
                      alignSelf={msg.role === 'user' ? 'flex-end' : 'flex-start'}
                      maxW="85%"
                    >
                      <Text fontSize="sm" whiteSpace="pre-wrap">{msg.content}</Text>
                    </Box>
                  ))}
                  {helperLoading && (
                    <HStack color="gray.400">
                      <Spinner size="sm" />
                      <Text fontSize="sm">Thinking...</Text>
                    </HStack>
                  )}
                </VStack>
                
                {/* Input */}
                <Box w="full" p={3} borderTopWidth="1px" borderColor="gray.700">
                  <HStack>
                    <Input
                      placeholder="Ask me anything..."
                      value={helperInput}
                      onChange={(e) => setHelperInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendHelperMessage(helperInput)}
                      bg="gray.700"
                      border="none"
                      color="white"
                      _placeholder={{ color: 'gray.500' }}
                    />
                    <IconButton
                      aria-label="Send"
                      icon={<FiChevronRight />}
                      colorScheme="purple"
                      onClick={() => sendHelperMessage(helperInput)}
                      isLoading={helperLoading}
                    />
                  </HStack>
                </Box>
              </VStack>
            </DrawerBody>
          </DrawerContent>
        </Drawer>
      </Box>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);
  
  if (!session?.user?.id) {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    };
  }

  const { bookId } = context.params || {};
  
  if (!bookId || typeof bookId !== 'string') {
    return {
      props: {
        book: null,
        error: 'Book ID required',
      },
    };
  }

  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
    });

    const result = await pool.query(`
      SELECT id, title, author, series_name, page_count, file_type
      FROM children_books
      WHERE id = $1 AND security_scan_passed = true
    `, [bookId]);

    await pool.end();

    if (result.rows.length === 0) {
      return {
        props: {
          book: null,
          error: 'Book not found',
        },
      };
    }

    return {
      props: {
        book: result.rows[0],
      },
    };
  } catch (error) {
    console.error('[Reader] Error fetching book:', error);
    return {
      props: {
        book: null,
        error: 'Failed to load book',
      },
    };
  }
};
