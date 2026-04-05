'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Box, Flex, IconButton, Text, HStack, VStack, Button, Spinner } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronLeft, FiChevronRight, FiBook } from 'react-icons/fi';

const MotionBox = motion(Box);

interface StoryBookletProps {
  content: string;
  characterName?: string;
  characterEmoji?: string;
  characterColor?: string;
  onComplete?: () => void;
  autoPlay?: boolean;
  autoPlayDelay?: number;
  // Interactive story continuation
  onContinueStory?: () => Promise<string | null>;
  isLoadingContinuation?: boolean;
  messageId?: string;
}

// Split content into pages based on character count and natural breaks
function splitIntoPages(content: string, maxCharsPerPage: number = 280): string[] {
  if (!content) return [''];
  
  // Clean up the content
  const cleanContent = content.trim();
  
  // Split by paragraphs first (double newlines or single newlines)
  const paragraphs = cleanContent.split(/\n\n|\n/).filter(p => p.trim());
  
  const pages: string[] = [];
  let currentPage = '';
  
  for (const paragraph of paragraphs) {
    const trimmedPara = paragraph.trim();
    
    // If adding this paragraph would exceed the limit
    if (currentPage.length + trimmedPara.length + 2 > maxCharsPerPage) {
      // If current page has content, save it
      if (currentPage.trim()) {
        pages.push(currentPage.trim());
        currentPage = '';
      }
      
      // If the paragraph itself is too long, split it by sentences
      if (trimmedPara.length > maxCharsPerPage) {
        const sentences = trimmedPara.match(/[^.!?]+[.!?]+/g) || [trimmedPara];
        for (const sentence of sentences) {
          if (currentPage.length + sentence.length + 1 > maxCharsPerPage) {
            if (currentPage.trim()) {
              pages.push(currentPage.trim());
            }
            currentPage = sentence.trim();
          } else {
            currentPage += (currentPage ? ' ' : '') + sentence.trim();
          }
        }
      } else {
        currentPage = trimmedPara;
      }
    } else {
      currentPage += (currentPage ? '\n\n' : '') + trimmedPara;
    }
  }
  
  // Don't forget the last page
  if (currentPage.trim()) {
    pages.push(currentPage.trim());
  }
  
  return pages.length > 0 ? pages : [''];
}

// Page turn animation variants
const pageVariants = {
  enter: (direction: number) => ({
    rotateY: direction > 0 ? 90 : -90,
    opacity: 0,
    scale: 0.9,
  }),
  center: {
    rotateY: 0,
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  exit: (direction: number) => ({
    rotateY: direction < 0 ? 90 : -90,
    opacity: 0,
    scale: 0.9,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1],
    },
  }),
};

// Sparkle animation for decoration
const sparkle = keyframes`
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.2); }
`;

export default function StoryBooklet({
  content,
  characterName = 'Storyteller',
  characterEmoji = '📖',
  characterColor = 'purple',
  onComplete,
  autoPlay = false,
  autoPlayDelay = 8000,
  onContinueStory,
  isLoadingContinuation = false,
  messageId,
}: StoryBookletProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [storyContent, setStoryContent] = useState(content);
  const [chapterCount, setChapterCount] = useState(1);

  // Update story content when prop changes (for external updates)
  useEffect(() => {
    setStoryContent(content);
  }, [content]);

  const pages = useMemo(() => splitIntoPages(storyContent), [storyContent]);
  const totalPages = pages.length;
  
  // Check if we're on the last page (show continue button)
  const isOnLastPage = currentPage === totalPages - 1;
  
  // Handle continue story click
  const handleContinueStory = async () => {
    if (!onContinueStory || isLoadingContinuation) return;
    
    const continuation = await onContinueStory();
    if (continuation) {
      // Append the new content with a chapter separator
      const separator = `\n\n📖 Chapter ${chapterCount + 1} 📖\n\n`;
      setStoryContent(prev => prev + separator + continuation);
      setChapterCount(prev => prev + 1);
      
      // Navigate to the new content (next page after current last)
      setTimeout(() => {
        setDirection(1);
        setCurrentPage(totalPages); // Go to first new page
      }, 100);
    }
  };

  // Auto-play functionality
  useEffect(() => {
    if (!autoPlay || isHovered) return;
    
    const timer = setInterval(() => {
      setCurrentPage((prev) => {
        if (prev < totalPages - 1) {
          setDirection(1);
          return prev + 1;
        }
        return prev;
      });
    }, autoPlayDelay);

    return () => clearInterval(timer);
  }, [autoPlay, autoPlayDelay, totalPages, isHovered]);

  // Notify when story is complete
  useEffect(() => {
    if (currentPage === totalPages - 1 && onComplete) {
      onComplete();
    }
  }, [currentPage, totalPages, onComplete]);

  const goToPage = (newPage: number) => {
    if (newPage >= 0 && newPage < totalPages) {
      setDirection(newPage > currentPage ? 1 : -1);
      setCurrentPage(newPage);
    }
  };

  const nextPage = () => goToPage(currentPage + 1);
  const prevPage = () => goToPage(currentPage - 1);

  // Swipe handlers
  const handleDragEnd = (event: any, info: any) => {
    const swipeThreshold = 50;
    if (info.offset.x < -swipeThreshold && currentPage < totalPages - 1) {
      nextPage();
    } else if (info.offset.x > swipeThreshold && currentPage > 0) {
      prevPage();
    }
  };

  return (
    <Box
      position="relative"
      w="100%"
      maxW="400px"
      mx="auto"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Book Container */}
      <Box
        bg={`${characterColor}.50`}
        borderRadius="xl"
        border="3px solid"
        borderColor={`${characterColor}.200`}
        overflow="hidden"
        boxShadow="lg"
        position="relative"
      >
        {/* Book Header */}
        <Flex
          bg={`${characterColor}.100`}
          px={4}
          py={2}
          alignItems="center"
          justifyContent="space-between"
          borderBottom="2px solid"
          borderColor={`${characterColor}.200`}
        >
          <HStack spacing={2}>
            <Text fontSize="xl">{characterEmoji}</Text>
            <Text fontWeight="bold" fontSize="sm" color={`${characterColor}.700`}>
              {characterName}'s Story
            </Text>
          </HStack>
          <HStack spacing={1}>
            <FiBook />
            <Text fontSize="xs" color={`${characterColor}.600`}>
              {currentPage + 1} / {totalPages}
            </Text>
          </HStack>
        </Flex>

        {/* Page Content Area */}
        <Box
          position="relative"
          minH="200px"
          maxH="280px"
          overflow="hidden"
          style={{ perspective: '1000px' }}
        >
          {/* Decorative corners */}
          <Box
            position="absolute"
            top={2}
            left={2}
            fontSize="lg"
            opacity={0.4}
            animation={`${sparkle} 2s ease-in-out infinite`}
          >
            ✨
          </Box>
          <Box
            position="absolute"
            top={2}
            right={2}
            fontSize="lg"
            opacity={0.4}
            animation={`${sparkle} 2s ease-in-out infinite 0.5s`}
          >
            ✨
          </Box>

          <AnimatePresence initial={false} custom={direction} mode="wait">
            <MotionBox
              key={currentPage}
              custom={direction}
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
              p={5}
              pt={6}
              minH="200px"
              display="flex"
              alignItems="center"
              justifyContent="center"
              cursor="grab"
              _active={{ cursor: 'grabbing' }}
              style={{
                transformStyle: 'preserve-3d',
              }}
            >
              <Text
                fontSize="md"
                lineHeight="1.7"
                color={`${characterColor}.800`}
                textAlign="center"
                fontFamily="'Comic Sans MS', 'Chalkboard SE', 'Comic Neue', cursive, sans-serif"
                whiteSpace="pre-wrap"
              >
                {pages[currentPage]}
              </Text>
            </MotionBox>
          </AnimatePresence>
        </Box>

        {/* Navigation Controls */}
        <Flex
          bg={`${characterColor}.100`}
          px={3}
          py={2}
          alignItems="center"
          justifyContent="space-between"
          borderTop="2px solid"
          borderColor={`${characterColor}.200`}
        >
          <IconButton
            aria-label="Previous page"
            icon={<FiChevronLeft />}
            size="sm"
            variant="ghost"
            colorScheme={characterColor}
            onClick={prevPage}
            isDisabled={currentPage === 0}
            _hover={{ bg: `${characterColor}.200` }}
          />

          {/* Page Dots - show max 7 dots with ellipsis for long stories */}
          <HStack spacing={1}>
            {totalPages <= 7 ? (
              pages.map((_, idx) => (
                <Box
                  key={idx}
                  w={idx === currentPage ? '16px' : '8px'}
                  h="8px"
                  borderRadius="full"
                  bg={idx === currentPage ? `${characterColor}.500` : `${characterColor}.300`}
                  cursor="pointer"
                  onClick={() => goToPage(idx)}
                  transition="all 0.3s"
                  _hover={{ bg: `${characterColor}.400` }}
                />
              ))
            ) : (
              <>
                {/* First dot */}
                <Box
                  w={currentPage === 0 ? '16px' : '8px'}
                  h="8px"
                  borderRadius="full"
                  bg={currentPage === 0 ? `${characterColor}.500` : `${characterColor}.300`}
                  cursor="pointer"
                  onClick={() => goToPage(0)}
                  transition="all 0.3s"
                />
                {currentPage > 2 && <Text fontSize="xs" color={`${characterColor}.400`}>...</Text>}
                {/* Current page area */}
                {[currentPage - 1, currentPage, currentPage + 1]
                  .filter(idx => idx > 0 && idx < totalPages - 1)
                  .map(idx => (
                    <Box
                      key={idx}
                      w={idx === currentPage ? '16px' : '8px'}
                      h="8px"
                      borderRadius="full"
                      bg={idx === currentPage ? `${characterColor}.500` : `${characterColor}.300`}
                      cursor="pointer"
                      onClick={() => goToPage(idx)}
                      transition="all 0.3s"
                    />
                  ))}
                {currentPage < totalPages - 3 && <Text fontSize="xs" color={`${characterColor}.400`}>...</Text>}
                {/* Last dot */}
                <Box
                  w={currentPage === totalPages - 1 ? '16px' : '8px'}
                  h="8px"
                  borderRadius="full"
                  bg={currentPage === totalPages - 1 ? `${characterColor}.500` : `${characterColor}.300`}
                  cursor="pointer"
                  onClick={() => goToPage(totalPages - 1)}
                  transition="all 0.3s"
                />
              </>
            )}
          </HStack>

          <IconButton
            aria-label="Next page"
            icon={<FiChevronRight />}
            size="sm"
            variant="ghost"
            colorScheme={characterColor}
            onClick={nextPage}
            isDisabled={currentPage === totalPages - 1}
            _hover={{ bg: `${characterColor}.200` }}
          />
        </Flex>
        
        {/* Continue Story Button - shown on last page when handler is provided */}
        {isOnLastPage && onContinueStory && (
          <Box
            bg={`${characterColor}.50`}
            px={4}
            py={3}
            borderTop="1px dashed"
            borderColor={`${characterColor}.200`}
          >
            <VStack spacing={2}>
              <Text fontSize="sm" color={`${characterColor}.600`} textAlign="center">
                🌟 Want to know what happens next?
              </Text>
              <HStack spacing={2}>
                <Button
                  size="sm"
                  colorScheme={characterColor}
                  onClick={handleContinueStory}
                  isLoading={isLoadingContinuation}
                  loadingText="Writing..."
                  leftIcon={isLoadingContinuation ? undefined : <span>✨</span>}
                  borderRadius="full"
                  _hover={{ transform: 'scale(1.05)' }}
                  transition="all 0.2s"
                >
                  Yes, continue!
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  colorScheme="gray"
                  onClick={() => goToPage(0)}
                  borderRadius="full"
                >
                  📖 Read again
                </Button>
              </HStack>
            </VStack>
          </Box>
        )}
      </Box>

      {/* Swipe hint for first-time users */}
      {currentPage === 0 && totalPages > 1 && (
        <Text
          textAlign="center"
          fontSize="xs"
          color="gray.500"
          mt={2}
          fontStyle="italic"
        >
          👆 Swipe or tap arrows to turn pages
        </Text>
      )}
    </Box>
  );
}
