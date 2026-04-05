'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, Flex, IconButton, Text, HStack, VStack, Button, Spinner, Image, Skeleton } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronLeft, FiChevronRight, FiBook, FiMaximize2, FiMinimize2 } from 'react-icons/fi';

const MotionBox = motion(Box);
const MotionFlex = motion(Flex);

interface StoryPage {
  text: string;
  imagePrompt?: string;
  imageUrl?: string;
  isImagePage?: boolean;
}

interface StoryBookletV2Props {
  content: string;
  characterName?: string;
  characterEmoji?: string;
  characterColor?: string;
  onComplete?: () => void;
  autoPlay?: boolean;
  autoPlayDelay?: number;
  onContinueStory?: () => Promise<string | null>;
  isLoadingContinuation?: boolean;
  messageId?: string;
  enableImages?: boolean;
}

// Extract scene descriptions from story text for image generation
function extractScenePrompts(text: string): string[] {
  if (!text) return [];
  
  const scenes: string[] = [];
  
  // Split into sentences
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  
  // Look for descriptive sentences (more lenient patterns)
  const descriptiveKeywords = [
    'saw', 'found', 'discovered', 'noticed', 'spotted', 'looked', 'watched',
    'there was', 'there stood', 'appeared', 'emerged', 'came',
    'beautiful', 'magical', 'sparkly', 'colorful', 'giant', 'tiny', 'bright', 'dark',
    'castle', 'forest', 'garden', 'meadow', 'mountain', 'river', 'ocean', 'sky', 'rainbow',
    'dragon', 'unicorn', 'fairy', 'wizard', 'princess', 'knight', 'cat', 'dog', 'bird'
  ];
  
  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase();
    // Check if sentence contains any descriptive keywords
    if (descriptiveKeywords.some(keyword => lowerSentence.includes(keyword))) {
      if (sentence.trim().length > 20 && sentence.trim().length < 200) {
        scenes.push(sentence.trim());
      }
    }
  }
  
  // If still no scenes, just use every 3rd sentence
  if (scenes.length === 0 && sentences.length > 0) {
    for (let i = 0; i < Math.min(3, sentences.length); i += 2) {
      if (sentences[i]) {
        scenes.push(sentences[i].trim());
      }
    }
  }
  
  // Fallback: use first sentence
  if (scenes.length === 0 && sentences.length > 0) {
    scenes.push(sentences[0].trim());
  }
  
  console.log('[StoryBooklet] Extracted scene prompts:', scenes.slice(0, 3));
  return scenes.slice(0, 3); // Max 3 images per story segment
}

// Split content into pages, marking some as image pages
function splitIntoStoryPages(content: string, maxCharsPerPage: number = 220): StoryPage[] {
  if (!content) return [{ text: '' }];
  
  const cleanContent = content.trim();
  const paragraphs = cleanContent.split(/\n\n|\n/).filter(p => p.trim());
  
  const pages: StoryPage[] = [];
  let currentPage = '';
  let pageIndex = 0;
  
  // Extract potential image prompts from the full content
  const scenePrompts = extractScenePrompts(cleanContent);
  let sceneIndex = 0;
  
  for (const paragraph of paragraphs) {
    const trimmedPara = paragraph.trim();
    
    // Skip chapter markers
    if (/^📖.*📖$/.test(trimmedPara)) {
      if (currentPage.trim()) {
        pages.push({ text: currentPage.trim() });
        currentPage = '';
        pageIndex++;
      }
      continue;
    }
    
    if (currentPage.length + trimmedPara.length + 2 > maxCharsPerPage) {
      if (currentPage.trim()) {
        const page: StoryPage = { text: currentPage.trim() };
        
        // Add image to every 3rd page (pages 2, 5, 8, etc.)
        if ((pageIndex + 1) % 3 === 2 && sceneIndex < scenePrompts.length) {
          page.imagePrompt = scenePrompts[sceneIndex];
          page.isImagePage = true;
          sceneIndex++;
        }
        
        pages.push(page);
        currentPage = '';
        pageIndex++;
      }
      
      if (trimmedPara.length > maxCharsPerPage) {
        const sentences = trimmedPara.match(/[^.!?]+[.!?]+/g) || [trimmedPara];
        for (const sentence of sentences) {
          if (currentPage.length + sentence.length + 1 > maxCharsPerPage) {
            if (currentPage.trim()) {
              pages.push({ text: currentPage.trim() });
              pageIndex++;
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
  
  if (currentPage.trim()) {
    pages.push({ text: currentPage.trim() });
  }
  
  return pages.length > 0 ? pages : [{ text: '' }];
}

// Page turn animation variants for two-page spread
const spreadVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  exit: (direction: number) => ({
    x: direction < 0 ? '100%' : '-100%',
    opacity: 0,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1],
    },
  }),
};

// Sparkle animation
const sparkle = keyframes`
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.2); }
`;

// Shimmer animation for loading images
const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

export default function StoryBookletV2({
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
  enableImages = true,
}: StoryBookletV2Props) {
  const [currentSpread, setCurrentSpread] = useState(0); // Current two-page spread index
  const [direction, setDirection] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [storyContent, setStoryContent] = useState(content);
  const [chapterCount, setChapterCount] = useState(1);
  const [generatedImages, setGeneratedImages] = useState<Record<number, string>>({});
  const [loadingImages, setLoadingImages] = useState<Set<number>>(new Set());

  useEffect(() => {
    setStoryContent(content);
  }, [content]);

  const pages = useMemo(() => splitIntoStoryPages(storyContent), [storyContent]);
  
  // Calculate spreads (pairs of pages)
  const spreads = useMemo(() => {
    const result: [StoryPage | null, StoryPage | null][] = [];
    for (let i = 0; i < pages.length; i += 2) {
      result.push([pages[i] || null, pages[i + 1] || null]);
    }
    return result;
  }, [pages]);
  
  const totalSpreads = spreads.length;
  const isOnLastSpread = currentSpread === totalSpreads - 1;

  // Generate image for a page
  const generateImageForPage = useCallback(async (pageIndex: number, prompt: string) => {
    if (loadingImages.has(pageIndex) || generatedImages[pageIndex]) return;
    
    setLoadingImages(prev => new Set(prev).add(pageIndex));
    
    try {
      const response = await fetch('/api/child/services/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Children's storybook illustration: ${prompt}`,
          style: 'watercolor',
          styleLabel: 'Watercolor',
          styleDescription: 'Soft, dreamy watercolor painting style for children\'s book',
          size: '512x512',
          fast: true, // Request fast generation for stories
        }),
      });

      const data = await response.json();
      console.log('[StoryBooklet] Image API response:', data);
      
      if (data.blocked) {
        console.warn('[StoryBooklet] Image blocked:', data.message);
        return;
      }
      
      if (data.imageUrl) {
        console.log('[StoryBooklet] Setting image for page', pageIndex, ':', data.imageUrl);
        setGeneratedImages(prev => ({ ...prev, [pageIndex]: data.imageUrl }));
      } else {
        console.warn('[StoryBooklet] No imageUrl in response:', data);
      }
    } catch (error) {
      console.error('[StoryBooklet] Image generation failed:', error);
    } finally {
      setLoadingImages(prev => {
        const next = new Set(prev);
        next.delete(pageIndex);
        return next;
      });
    }
  }, [loadingImages, generatedImages]);

  // Pre-generate images for upcoming pages
  useEffect(() => {
    if (!enableImages) {
      console.log('[StoryBooklet] Images disabled');
      return;
    }
    
    // Look ahead 2 spreads (4 pages) and generate images
    const startPage = currentSpread * 2;
    const lookAhead = 4;
    
    console.log('[StoryBooklet] Checking pages for images:', { startPage, lookAhead, totalPages: pages.length });
    
    for (let i = startPage; i < Math.min(startPage + lookAhead, pages.length); i++) {
      const page = pages[i];
      console.log(`[StoryBooklet] Page ${i}:`, { 
        hasImagePrompt: !!page?.imagePrompt, 
        imagePrompt: page?.imagePrompt,
        isImagePage: page?.isImagePage,
        alreadyGenerated: !!generatedImages[i],
        isLoading: loadingImages.has(i)
      });
      
      if (page?.imagePrompt && !generatedImages[i] && !loadingImages.has(i)) {
        console.log(`[StoryBooklet] Generating image for page ${i}:`, page.imagePrompt);
        generateImageForPage(i, page.imagePrompt);
      }
    }
  }, [currentSpread, pages, enableImages, generatedImages, loadingImages, generateImageForPage]);

  const goToSpread = (newSpread: number) => {
    if (newSpread >= 0 && newSpread < totalSpreads) {
      setDirection(newSpread > currentSpread ? 1 : -1);
      setCurrentSpread(newSpread);
    }
  };

  const nextSpread = () => goToSpread(currentSpread + 1);
  const prevSpread = () => goToSpread(currentSpread - 1);

  const handleContinueStory = async () => {
    if (!onContinueStory || isLoadingContinuation) return;
    
    const continuation = await onContinueStory();
    if (continuation) {
      const separator = `\n\n📖 Chapter ${chapterCount + 1} 📖\n\n`;
      setStoryContent(prev => prev + separator + continuation);
      setChapterCount(prev => prev + 1);
      
      setTimeout(() => {
        setDirection(1);
        setCurrentSpread(totalSpreads);
      }, 100);
    }
  };

  // Swipe handlers
  const handleDragEnd = (event: any, info: any) => {
    const swipeThreshold = 50;
    if (info.offset.x < -swipeThreshold && currentSpread < totalSpreads - 1) {
      nextSpread();
    } else if (info.offset.x > swipeThreshold && currentSpread > 0) {
      prevSpread();
    }
  };

  const currentLeftPage = spreads[currentSpread]?.[0];
  const currentRightPage = spreads[currentSpread]?.[1];
  const leftPageIndex = currentSpread * 2;
  const rightPageIndex = currentSpread * 2 + 1;

  // Expanded state for filling chat area
  const [isExpanded, setIsExpanded] = useState(false);

  // Get theme colors based on character
  const getThemeColors = useCallback(() => {
    const name = characterName?.toLowerCase() || '';
    if (name.includes('pusheen') || name.includes('stormy') || name.includes('pip')) {
      return {
        primary: '#F8BBD9', // Soft pink
        secondary: '#FCE4EC',
        accent: '#E91E63',
        pageBg: 'linear-gradient(180deg, #FFFBFC 0%, #FFF0F5 100%)',
        text: '#6D4C5E',
        border: '#F48FB1',
        sparkle: '💖',
      };
    } else if (name.includes('steve') || name.includes('alex') || name.includes('minecraft')) {
      return {
        primary: '#A5D6A7', // Soft green
        secondary: '#E8F5E9',
        accent: '#4CAF50',
        pageBg: 'linear-gradient(180deg, #FAFFF5 0%, #F1F8E9 100%)',
        text: '#2E5A2E',
        border: '#81C784',
        sparkle: '⭐',
      };
    }
    // Default magical purple theme
    return {
      primary: '#CE93D8', // Soft purple
      secondary: '#F3E5F5',
      accent: '#9C27B0',
      pageBg: 'linear-gradient(180deg, #FEFAFF 0%, #F8F0FF 100%)',
      text: '#4A235A',
      border: '#BA68C8',
      sparkle: '✨',
    };
  }, [characterName]);

  const theme = getThemeColors();

  // Render a single page (left or right)
  const renderPage = (page: StoryPage | null, pageIndex: number, side: 'left' | 'right') => {
    if (!page) {
      return (
        <Box
          flex="1"
          p={4}
          display="flex"
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          minH={isExpanded ? "300px" : "250px"}
          maxH={isExpanded ? "calc(80vh - 200px)" : "calc(65vh - 200px)"}
          overflow="auto"
          position="relative"
        >
          <Text color={theme.text} fontSize="md" fontStyle="italic" fontFamily="'Quicksand', 'Nunito', sans-serif" opacity={0.6} fontWeight="600">
            {theme.sparkle} The adventure continues... {theme.sparkle}
          </Text>
        </Box>
      );
    }

    const hasImage = page.isImagePage && enableImages;
    const imageUrl = generatedImages[pageIndex];
    const isLoadingImage = loadingImages.has(pageIndex);

    return (
      <Box
        flex="1"
        bg={theme.pageBg}
        p={isExpanded ? 8 : 5}
        display="flex"
        flexDirection="column"
        minH="300px"
        position="relative"
        overflow="hidden"
      >
        {/* Decorative corner stars */}
        <Text position="absolute" top={2} left={3} fontSize="sm" opacity={0.4}>
          {theme.sparkle}
        </Text>
        <Text position="absolute" top={2} right={3} fontSize="sm" opacity={0.4}>
          {theme.sparkle}
        </Text>
        
        {/* Page number */}
        <Text
          position="absolute"
          bottom={2}
          {...(side === 'left' ? { left: 4 } : { right: 4 })}
          fontSize="xs"
          color={theme.text}
          fontFamily="'Comic Sans MS', cursive"
          opacity={0.5}
        >
          {pageIndex + 1}
        </Text>

        {/* Image section (if this is an image page) */}
        {hasImage && (
          <Box
            mb={3}
            borderRadius="xl"
            overflow="hidden"
            bg={theme.secondary}
            minH="120px"
            maxH="140px"
            display="flex"
            alignItems="center"
            justifyContent="center"
            border="3px solid"
            borderColor={theme.border}
          >
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt="Story illustration"
                objectFit="cover"
                w="100%"
                h="100%"
              />
            ) : isLoadingImage ? (
              <VStack spacing={2}>
                <Spinner size="md" color={theme.accent} />
                <Text fontSize="xs" color={theme.text}>
                  🎨 Drawing...
                </Text>
              </VStack>
            ) : (
              <Box
                w="100%"
                h="100%"
                bg={theme.secondary}
                animation={`${shimmer} 1.5s infinite`}
              />
            )}
          </Box>
        )}

        {/* Text content */}
        <Box flex="1" display="flex" alignItems="center" justifyContent="center" px={2}>
          <Text
            fontSize={isExpanded ? (hasImage ? 'md' : 'lg') : (hasImage ? 'sm' : 'md')}
            lineHeight="1.6"
            color={theme.text}
            textAlign="center"
            fontFamily="'Quicksand', 'Nunito', 'Fredoka', 'Poppins', sans-serif"
            whiteSpace="pre-wrap"
            fontWeight="600"
          >
            {page.text}
          </Text>
        </Box>
      </Box>
    );
  };

  return (
    <Box
      position="relative"
      w="100%"
      maxW={isExpanded ? "100%" : "900px"}
      mx="auto"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Magical Storybook Container */}
      <Box
        bg={theme.secondary}
        borderRadius="2xl"
        border="4px solid"
        borderColor={theme.primary}
        overflow="hidden"
        boxShadow={`0 8px 32px ${theme.primary}50, 0 4px 12px rgba(0,0,0,0.1)`}
        position="relative"
        transition="all 0.3s ease"
        maxH={isExpanded ? "80vh" : "65vh"}
        display="flex"
        flexDirection="column"
      >
        {/* Whimsical Header */}
        <Flex
          bg={theme.primary}
          px={4}
          py={3}
          alignItems="center"
          justifyContent="space-between"
          borderBottom="3px solid"
          borderColor={theme.border}
        >
          <HStack spacing={3}>
            <Text fontSize="2xl">{characterEmoji}</Text>
            <Text 
              fontWeight="bold" 
              fontSize={isExpanded ? 'xl' : 'lg'} 
              color="white" 
              textShadow="1px 1px 2px rgba(0,0,0,0.2)" 
              fontFamily="'Quicksand', 'Nunito', 'Fredoka', sans-serif"
            >
              {characterName}'s Story
            </Text>
          </HStack>
          <HStack spacing={3}>
            <HStack spacing={1}>
              <FiBook color="white" />
              <Text fontSize="sm" color="white" fontFamily="'Quicksand', 'Nunito', sans-serif" fontWeight="600">
                {Math.min(leftPageIndex + 1, pages.length)}-{Math.min(rightPageIndex + 1, pages.length)} / {pages.length}
              </Text>
            </HStack>
            {/* Expand/Collapse Button */}
            <IconButton
              aria-label={isExpanded ? "Collapse" : "Expand"}
              icon={isExpanded ? <FiMinimize2 /> : <FiMaximize2 />}
              size="sm"
              variant="ghost"
              color="white"
              onClick={() => setIsExpanded(!isExpanded)}
              _hover={{ bg: 'whiteAlpha.300' }}
              title={isExpanded ? "Make smaller" : "Make bigger"}
            />
          </HStack>
        </Flex>

        {/* Two-Page Spread Content */}
        <Box position="relative" overflow="hidden" style={{ perspective: '1200px' }} py={2} flex="1" display="flex" flexDirection="column">
          {/* Book spine - soft center divider */}
          <Box
            position="absolute"
            left="50%"
            top={0}
            bottom={0}
            w="8px"
            bg={`linear-gradient(90deg, ${theme.border}80 0%, ${theme.primary} 50%, ${theme.border}80 100%)`}
            transform="translateX(-50%)"
            zIndex={10}
            boxShadow={`inset 1px 0 3px rgba(0,0,0,0.1), inset -1px 0 3px rgba(0,0,0,0.1)`}
          />

          <AnimatePresence initial={false} custom={direction} mode="wait">
            <MotionFlex
              key={currentSpread}
              custom={direction}
              variants={spreadVariants}
              initial="enter"
              animate="center"
              exit="exit"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.1}
              onDragEnd={handleDragEnd}
              cursor="grab"
              _active={{ cursor: 'grabbing' }}
              minH={isExpanded ? "350px" : "280px"}
              maxH={isExpanded ? "calc(80vh - 200px)" : "calc(65vh - 200px)"}
              overflow="auto"
            >
              {/* Left Page */}
              {renderPage(currentLeftPage, leftPageIndex, 'left')}
              
              {/* Right Page */}
              {renderPage(currentRightPage, rightPageIndex, 'right')}
            </MotionFlex>
          </AnimatePresence>
        </Box>

        {/* Navigation Controls - Playful Footer */}
        <Flex
          bg={theme.primary}
          px={4}
          py={3}
          alignItems="center"
          justifyContent="space-between"
          borderTop="3px solid"
          borderColor={theme.border}
        >
          <IconButton
            aria-label="Previous pages"
            icon={<FiChevronLeft />}
            size="md"
            variant="solid"
            bg="white"
            color={theme.accent}
            onClick={prevSpread}
            isDisabled={currentSpread === 0}
            _hover={{ bg: theme.secondary, transform: 'scale(1.1)' }}
            _disabled={{ opacity: 0.4, cursor: 'not-allowed' }}
            borderRadius="full"
            boxShadow="md"
            transition="all 0.2s"
          />

          {/* Page dots */}
          <HStack spacing={2}>
            {spreads.slice(0, 8).map((_, idx) => (
              <Box
                key={idx}
                w={idx === currentSpread ? '20px' : '10px'}
                h="10px"
                borderRadius="full"
                bg={idx === currentSpread ? 'white' : 'whiteAlpha.600'}
                cursor="pointer"
                onClick={() => goToSpread(idx)}
                transition="all 0.3s"
                _hover={{ bg: 'white', transform: 'scale(1.2)' }}
                boxShadow={idx === currentSpread ? '0 0 8px white' : 'none'}
              />
            ))}
            {spreads.length > 8 && (
              <Text fontSize="xs" color="white" fontFamily="'Quicksand', 'Nunito', sans-serif" fontWeight="600">+{spreads.length - 8}</Text>
            )}
          </HStack>

          <IconButton
            aria-label="Next pages"
            icon={<FiChevronRight />}
            size="md"
            variant="solid"
            bg="white"
            color={theme.accent}
            onClick={nextSpread}
            isDisabled={currentSpread === totalSpreads - 1}
            _hover={{ bg: theme.secondary, transform: 'scale(1.1)' }}
            _disabled={{ opacity: 0.4, cursor: 'not-allowed' }}
            borderRadius="full"
            boxShadow="md"
            transition="all 0.2s"
          />
        </Flex>

        {/* Continue Story Button - Playful Style */}
        {isOnLastSpread && onContinueStory && (
          <Box
            bg={theme.secondary}
            px={6}
            py={4}
            borderTop="3px solid"
            borderColor={theme.border}
          >
            <VStack spacing={3}>
              <Text fontSize="md" color={theme.text} textAlign="center" fontFamily="'Quicksand', 'Nunito', sans-serif" fontWeight="600">
                {theme.sparkle} What happens next? {theme.sparkle}
              </Text>
              <HStack spacing={3}>
                <Button
                  size="md"
                  bg={theme.accent}
                  color="white"
                  onClick={handleContinueStory}
                  isLoading={isLoadingContinuation}
                  loadingText="Writing..."
                  leftIcon={isLoadingContinuation ? undefined : <span>📖</span>}
                  borderRadius="full"
                  _hover={{ transform: 'scale(1.05)', boxShadow: 'lg' }}
                  transition="all 0.2s"
                  px={6}
                  fontFamily="'Quicksand', 'Nunito', sans-serif"
                  fontWeight="700"
                  boxShadow="md"
                  fontSize="sm"
                >
                  Keep reading!
                </Button>
                <Button
                  size="md"
                  variant="outline"
                  borderColor={theme.accent}
                  color={theme.accent}
                  onClick={() => goToSpread(0)}
                  borderRadius="full"
                  _hover={{ bg: theme.primary + '30' }}
                  fontFamily="'Quicksand', 'Nunito', sans-serif"
                  fontWeight="700"
                  fontSize="sm"
                  px={6}
                >
                  🔄 Start over
                </Button>
              </HStack>
            </VStack>
          </Box>
        )}
      </Box>

      {/* Swipe hint */}
      {currentSpread === 0 && totalSpreads > 1 && (
        <Text textAlign="center" fontSize="sm" color={theme.text} mb={2} fontFamily="'Quicksand', 'Nunito', sans-serif" fontWeight="600" opacity={0.7}>
          👆 Swipe or tap arrows to turn pages!
        </Text>
      )}
    </Box>
  );
}
