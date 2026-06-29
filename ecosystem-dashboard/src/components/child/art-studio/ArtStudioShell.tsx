/**
 * ArtStudioShell — Professional kid-friendly art studio layout.
 *
 * Provides the visual wrapper for the Art Studio: themed header, stage,
 * prompt drawer, and right-companion aware context. The business logic is
 * kept in the parent page; this component is purely presentation + shell.
 */

import React from 'react';
import {
  Box, Flex, HStack, VStack, Text, Button, IconButton, Badge,
  Progress, Spinner, Tooltip, useBreakpointValue, Container, Wrap, WrapItem,
  Tabs, TabList, Tab,
} from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import {
  FiArrowLeft, FiClock, FiImage, FiGrid, FiDownload, FiHeart,
  FiTrash2, FiSend, FiZap, FiPrinter, FiShare2, FiEdit3, FiStar,
} from 'react-icons/fi';
import { useRouter } from 'next/router';
import { useChildTheme } from '@/components/child/ChildThemeProvider';
import { StudioReturnBanner } from '@/components/child/learning-kit';
import type { ArtImage, ArtStyle, ArtSize, PromptSuggestion } from './art-studio-types';

const shimmer = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
`;

const pulseSoft = keyframes`
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.02); opacity: 0.85; }
`;

interface ArtStudioShellProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  onGenerate: () => void;
  loading: boolean;
  currentImage: ArtImage | null;
  images: ArtImage[];
  selectedStyle: string;
  onStyleChange: (style: string) => void;
  selectedSize: string;
  onSizeChange: (size: string) => void;
  viewMode: 'canvas' | 'gallery';
  onViewModeChange: (mode: 'canvas' | 'gallery') => void;
  onSuggestionClick: (suggestion: string) => void;
  onRandomIdea: () => void;
  onToggleFavorite: (imageId: string) => void;
  onOpenImage: (image: ArtImage) => void;
  onDeleteImage: (image: ArtImage) => void;
  onPrintImage?: (image: ArtImage) => void;
  onShareImage?: (image: ArtImage) => void;
  onCustomizeImage?: (image: ArtImage) => void;
  usageMinutes: number;
  limitMinutes: number;
  usagePercent: number;
  remainingMinutes: number;
  styles: ArtStyle[];
  sizes: ArtSize[];
  suggestions: PromptSuggestion[];
  children?: React.ReactNode;
}

export function ArtStudioShell(props: ArtStudioShellProps) {
  const {
    prompt, onPromptChange, onGenerate, loading, currentImage,
    images, selectedStyle, onStyleChange, selectedSize, onSizeChange,
    viewMode, onViewModeChange, onSuggestionClick, onRandomIdea,
    onToggleFavorite, onOpenImage, onDeleteImage, onPrintImage,
    onShareImage, onCustomizeImage,
    usageMinutes, limitMinutes, usagePercent, remainingMinutes,
    styles, sizes, suggestions,
    children,
  } = props;

  const router = useRouter();
  const { colors } = useChildTheme();
  const isMobile = useBreakpointValue({ base: true, md: false });
  const headerPadding = useBreakpointValue({ base: 2, md: 4 });
  const inputSize = useBreakpointValue({ base: 'md', md: 'lg' });
  const buttonSize = useBreakpointValue({ base: 'md', md: 'lg' });
  const galleryColumns = useBreakpointValue({ base: 2, sm: 3, md: 3, lg: 4 });
  const currentStyle = styles.find((s) => s.id === selectedStyle);
  const currentSize = sizes.find((s) => s.id === selectedSize);

  const renderStage = () => {
    if (viewMode === 'gallery') {
      return children;
    }

    if (loading && !currentImage) {
      return (
        <VStack spacing={6} p={8} flex={1} justify="center">
          <Box
            w="140px"
            h="140px"
            borderRadius="full"
            bg={colors?.primary ? `${colors.primary}22` : 'purple.100'}
            display="flex"
            alignItems="center"
            justifyContent="center"
            animation={`${pulseSoft} 2s infinite`}
            boxShadow="xl"
          >
            <Text fontSize="5xl">🎨</Text>
          </Box>
          <VStack spacing={2}>
            <Text fontSize="xl" fontWeight="bold" color={colors?.primary || 'purple.600'}>
              Creating your masterpiece...
            </Text>
            <Text color="gray.500">Gemini is painting your idea!</Text>
            <Spinner size="lg" color={colors?.primary || 'purple.500'} thickness="3px" mt={2} />
          </VStack>
        </VStack>
      );
    }

    if (currentImage) {
      return (
        <VStack spacing={4} w="full" h="full" minH={0} overflow="hidden" py={2}>
          <Box
            position="relative"
            borderRadius="2xl"
            overflow="hidden"
            boxShadow="2xl"
            bg="white"
            w="full"
            maxW={{ base: '95vw', md: '520px' }}
            flex={1}
            minH={0}
            display="flex"
            alignItems="center"
            justifyContent="center"
            border="4px solid"
            borderColor={colors?.primary ? `${colors.primary}33` : 'purple.100'}
          >
            {currentImage.status === 'pending' || currentImage.status === 'processing' ? (
              <VStack spacing={4} p={8} w="full" maxW="400px">
                <Box
                  w="120px"
                  h="120px"
                  borderRadius="full"
                  bg={colors?.primary ? `${colors.primary}22` : 'purple.100'}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  animation={`${pulseSoft} 2s infinite`}
                >
                  <Text fontSize="4xl">🎨</Text>
                </Box>
                <Text
                  fontSize="xl"
                  fontWeight="bold"
                  color={colors?.primary || 'purple.600'}
                  textAlign="center"
                >
                  {currentImage.progress?.message || 'Creating your masterpiece...'}
                </Text>
                <Box w="full" bg="gray.100" borderRadius="full" p={1}>
                  <Box
                    w={`${currentImage.progress?.percent || 0}%`}
                    h="24px"
                    bg={`linear-gradient(90deg, ${colors?.primary || '#805AD5'}, ${colors?.secondary || '#9F7AEA'})`}
                    borderRadius="full"
                    transition="width 0.5s ease-in-out"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    position="relative"
                    overflow="hidden"
                  >
                    <Box
                      position="absolute"
                      top={0}
                      left={0}
                      right={0}
                      bottom={0}
                      bgGradient="linear(to-r, transparent, whiteAlpha.400, transparent)"
                      animation={`${shimmer} 2s infinite`}
                    />
                    <Text fontSize="xs" fontWeight="bold" color="white" zIndex={1}>
                      {currentImage.progress?.percent || 0}%
                    </Text>
                  </Box>
                </Box>
              </VStack>
            ) : currentImage.imageUrl ? (
              <Box
                as="img"
                src={currentImage.imageUrl}
                alt={currentImage.prompt}
                maxW="100%"
                maxH="100%"
                objectFit="contain"
                bg="gray.50"
                borderRadius="xl"
              />
            ) : (
              <VStack spacing={4} p={8}>
                <Text fontSize="4xl">😕</Text>
                <Text fontSize="lg" fontWeight="bold">Oops! Something went wrong</Text>
                <Text color="gray.500">Try creating a new artwork!</Text>
              </VStack>
            )}

            {/* Floating action toolbar */}
            {currentImage.imageUrl && currentImage.status !== 'pending' && currentImage.status !== 'processing' && (
              <HStack
                position="absolute"
                top={3}
                right={3}
                spacing={1}
                bg="whiteAlpha.900"
                backdropFilter="blur(10px)"
                p={1.5}
                borderRadius="full"
                boxShadow="md"
                border="1px solid"
                borderColor="whiteAlpha.500"
              >
                <Tooltip label="Favorite">
                  <IconButton
                    icon={<FiHeart />}
                    aria-label="Favorite"
                    size="xs"
                    colorScheme={currentImage.favorite ? 'red' : 'gray'}
                    variant={currentImage.favorite ? 'solid' : 'ghost'}
                    onClick={() => onToggleFavorite(currentImage.id)}
                    borderRadius="full"
                    _hover={{ transform: 'scale(1.1)' }}
                  />
                </Tooltip>
                <Tooltip label="Customize">
                  <IconButton
                    icon={<FiEdit3 />}
                    aria-label="Customize"
                    size="xs"
                    variant="ghost"
                    onClick={() => onCustomizeImage?.(currentImage)}
                    borderRadius="full"
                    _hover={{ transform: 'scale(1.1)' }}
                  />
                </Tooltip>
                <Tooltip label="Share">
                  <IconButton
                    icon={<FiShare2 />}
                    aria-label="Share"
                    size="xs"
                    variant="ghost"
                    onClick={() => onShareImage?.(currentImage)}
                    borderRadius="full"
                    _hover={{ transform: 'scale(1.1)' }}
                  />
                </Tooltip>
                <Tooltip label="Print">
                  <IconButton
                    icon={<FiPrinter />}
                    aria-label="Print"
                    size="xs"
                    variant="ghost"
                    onClick={() => onPrintImage?.(currentImage)}
                    borderRadius="full"
                    _hover={{ transform: 'scale(1.1)' }}
                  />
                </Tooltip>
                <Tooltip label="Download">
                  <IconButton
                    icon={<FiDownload />}
                    aria-label="Download"
                    size="xs"
                    variant="ghost"
                    as="a"
                    href={currentImage.imageUrl}
                    download={`art-${currentImage.id}.png`}
                    borderRadius="full"
                    _hover={{ transform: 'scale(1.1)' }}
                  />
                </Tooltip>
                <Tooltip label="Delete">
                  <IconButton
                    icon={<FiTrash2 />}
                    aria-label="Delete"
                    size="xs"
                    variant="ghost"
                    colorScheme="red"
                    onClick={() => onDeleteImage(currentImage)}
                    borderRadius="full"
                    _hover={{ transform: 'scale(1.1)' }}
                  />
                </Tooltip>
              </HStack>
            )}
          </Box>

          <Box textAlign="center" flexShrink={0} maxW="600px">
            <Text fontWeight="medium" fontSize={{ base: 'sm', md: 'md' }} noOfLines={1} px={2}>
              “{currentImage.prompt}”
            </Text>
            <HStack justify="center" mt={1} spacing={2} wrap="wrap">
              <Badge colorScheme="purple" fontSize="xs" borderRadius="full" px={2}>
                {currentStyle?.emoji} {currentStyle?.label}
              </Badge>
              <Badge colorScheme="gray" fontSize="xs" borderRadius="full" px={2}>
                {currentSize?.ratio}
              </Badge>
              <Badge colorScheme="green" fontSize="xs" borderRadius="full" px={2}>
                ✨ Gemini
              </Badge>
              <Badge colorScheme="gray" fontSize="xs" borderRadius="full" px={2}>
                {currentImage.createdAt.toLocaleTimeString()}
              </Badge>
            </HStack>
          </Box>
        </VStack>
      );
    }

    // Empty state
    return (
      <VStack spacing={6} p={8} textAlign="center" flex={1} justify="center">
        <Box
          w="160px"
          h="160px"
          borderRadius="3xl"
          bg={colors?.primary ? `${colors.primary}11` : 'purple.50'}
          border="3px dashed"
          borderColor={colors?.primary ? `${colors.primary}44` : 'purple.200'}
          display="flex"
          alignItems="center"
          justifyContent="center"
          animation={`${pulseSoft} 3s infinite`}
        >
          <Text fontSize="6xl">🎨</Text>
        </Box>
        <VStack spacing={2}>
          <Text fontSize="xl" fontWeight="bold" color={colors?.primary || 'purple.600'}>
            Ready to create something amazing?
          </Text>
          <Text color="gray.500" maxW="400px">
            Type an idea below, or tap a magic spark to get one. Your art buddy is on the right!
          </Text>
        </VStack>
        <HStack spacing={3}>
          <Button
            size="sm"
            colorScheme="purple"
            variant="outline"
            borderRadius="full"
            leftIcon={<FiStar />}
            onClick={onRandomIdea}
          >
            Surprise me
          </Button>
          <Button
            size="sm"
            colorScheme="purple"
            variant="ghost"
            borderRadius="full"
            leftIcon={<FiGrid />}
            onClick={() => onViewModeChange('gallery')}
          >
            See my gallery
          </Button>
        </HStack>
      </VStack>
    );
  };

  return (
    <Flex direction="column" h="calc(100vh - 60px)" bg={colors?.background || 'gray.50'} position="relative">
      {/* Header */}
      <HStack
        px={headerPadding}
        py={{ base: 2, md: 3 }}
        bg="white"
        borderBottom="1px solid"
        borderColor="gray.100"
        justify="space-between"
        flexShrink={0}
        boxShadow="sm"
        zIndex={2}
      >
        <HStack spacing={{ base: 2, md: 3 }}>
          <IconButton
            icon={<FiArrowLeft />}
            aria-label="Back"
            variant="ghost"
            size="sm"
            onClick={() => router.push('/child/home')}
            borderRadius="full"
          />
          <Box
            w="36px"
            h="36px"
            borderRadius="xl"
            bgGradient="linear(135deg, #9F7AEA, #B794F4)"
            display="flex"
            alignItems="center"
            justifyContent="center"
            boxShadow="md"
          >
            <Text fontSize="xl">🎨</Text>
          </Box>
          <VStack spacing={0} align="start">
            <Text fontWeight="bold" fontSize={{ base: 'md', md: 'lg' }}>Art Studio</Text>
            {!isMobile && (
              <Text fontSize="2xs" color="gray.500">
                Create • Customize • Share
              </Text>
            )}
          </VStack>
        </HStack>

        <HStack spacing={{ base: 2, md: 4 }}>
          <Tabs
            size="sm"
            variant="soft-rounded"
            colorScheme="purple"
            index={viewMode === 'canvas' ? 0 : 1}
            onChange={(i) => onViewModeChange(i === 0 ? 'canvas' : 'gallery')}
          >
            <TabList bg="gray.100" p={1} borderRadius="full">
              <Tab borderRadius="full" px={3}>
                <HStack spacing={1}>
                  <FiImage size={12} />
                  {!isMobile && <Text fontSize="xs">Studio</Text>}
                </HStack>
              </Tab>
              <Tab borderRadius="full" px={3}>
                <HStack spacing={1}>
                  <FiGrid size={12} />
                  {!isMobile && <Text fontSize="xs">Gallery</Text>}
                </HStack>
              </Tab>
            </TabList>
          </Tabs>

          <HStack spacing={{ base: 1, md: 2 }}>
            <FiClock size={isMobile ? 12 : 14} />
            <Text fontSize={{ base: 'xs', md: 'sm' }} fontWeight="medium">{remainingMinutes}m</Text>
            {!isMobile && (
              <Box w="60px">
                <Progress
                  value={usagePercent}
                  size="xs"
                  colorScheme={usagePercent > 80 ? 'red' : usagePercent > 50 ? 'orange' : 'green'}
                  borderRadius="full"
                />
              </Box>
            )}
          </HStack>
        </HStack>
      </HStack>

      {/* Studio Stage */}
      <Box flex={1} overflow="auto" p={{ base: 3, md: 4 }} position="relative">
        <Box px={{ base: 2, md: 4 }} pt={0} pb={2}>
          <StudioReturnBanner />
        </Box>
        <Flex direction="column" h="full" align="center">
          {renderStage()}
        </Flex>
      </Box>

      {/* Prompt Drawer */}
      <Box
        bg="white"
        borderTop="1px solid"
        borderColor="gray.200"
        p={{ base: 3, md: 4 }}
        pb={{ base: 'calc(env(safe-area-inset-bottom) + 12px)', md: 4 }}
        flexShrink={0}
        boxShadow="0 -4px 20px rgba(0,0,0,0.05)"
        zIndex={2}
      >
        <Container maxW="container.lg" px={{ base: 1, md: 4 }}>
          <VStack spacing={{ base: 2, md: 3 }}>
            {/* Style + Size Chips */}
            <HStack
              w="full"
              spacing={2}
              overflowX="auto"
              pb={1}
              css={{
                '&::-webkit-scrollbar': { display: 'none' },
                scrollbarWidth: 'none',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {styles.map((style) => (
                <Button
                  key={style.id}
                  size={{ base: 'xs', md: 'sm' }}
                  variant={selectedStyle === style.id ? 'solid' : 'outline'}
                  colorScheme={selectedStyle === style.id ? 'purple' : 'gray'}
                  onClick={() => onStyleChange(style.id)}
                  borderRadius="full"
                  flexShrink={0}
                  px={{ base: 2, md: 3 }}
                  leftIcon={<Text>{style.emoji}</Text>}
                  fontWeight={selectedStyle === style.id ? '700' : '500'}
                >
                  {isMobile ? '' : style.label}
                </Button>
              ))}
              <HStack pl={2} borderLeft="1px solid" borderColor="gray.100">
                {sizes.map((size) => (
                  <Button
                    key={size.id}
                    size={{ base: 'xs', md: 'sm' }}
                    variant={selectedSize === size.id ? 'solid' : 'outline'}
                    colorScheme={selectedSize === size.id ? 'pink' : 'gray'}
                    onClick={() => onSizeChange(size.id)}
                    borderRadius="full"
                    flexShrink={0}
                    px={{ base: 2, md: 3 }}
                    fontSize="xs"
                  >
                    {size.label}
                  </Button>
                ))}
              </HStack>
            </HStack>

            {/* Prompt Input */}
            <HStack w="full" spacing={{ base: 2, md: 3 }}>
              <Box position="relative" flex={1}>
                <Box
                  as="input"
                  ref={undefined}
                  value={prompt}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => onPromptChange(e.target.value)}
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === 'Enter' && !loading) onGenerate();
                  }}
                  placeholder={isMobile ? 'Describe your picture...' : 'Describe your picture... ✨ (e.g., a friendly dragon in a rainbow forest)'}
                  style={{
                    width: '100%',
                    height: inputSize === 'lg' ? '56px' : '44px',
                    borderRadius: '9999px',
                    padding: '0 56px 0 20px',
                    fontSize: isMobile ? '14px' : '16px',
                    border: `2px solid ${selectedStyle ? '#B794F4' : '#E2E8F0'}`,
                    background: '#F7FAFC',
                    outline: 'none',
                    transition: 'all 0.2s',
                  }}
                />
                <Box position="absolute" right="8px" top="50%" transform="translateY(-50%)">
                  <IconButton
                    icon={<FiZap />}
                    aria-label="Random idea"
                    size="sm"
                    variant="ghost"
                    colorScheme="purple"
                    onClick={onRandomIdea}
                    borderRadius="full"
                  />
                </Box>
              </Box>
              <Button
                colorScheme="purple"
                size={buttonSize}
                borderRadius="full"
                onClick={onGenerate}
                isLoading={loading}
                loadingText="✨"
                leftIcon={isMobile ? undefined : <FiSend />}
                px={{ base: 5, md: 8 }}
                minW={{ base: 'auto', md: '130px' }}
                boxShadow="0 4px 14px rgba(159,122,234,0.35)"
                _hover={{ transform: 'translateY(-1px)', boxShadow: '0 6px 20px rgba(159,122,234,0.45)' }}
                _active={{ transform: 'translateY(0)' }}
                transition="all 0.2s"
              >
                {isMobile ? '✨' : 'Create'}
              </Button>
            </HStack>

            {/* Quick Suggestions */}
            <Wrap spacing={{ base: 1, md: 2 }} justify="center">
              {suggestions.slice(0, isMobile ? 4 : 6).map((suggestion, i) => (
                <WrapItem key={i}>
                  <Button
                    size="xs"
                    variant="ghost"
                    borderRadius="full"
                    onClick={() => onSuggestionClick(suggestion.text)}
                    color="gray.600"
                    fontSize={{ base: '2xs', md: 'xs' }}
                    px={{ base: 2, md: 3 }}
                    _hover={{ bg: 'purple.50', color: 'purple.600' }}
                    leftIcon={<Text>{suggestion.emoji}</Text>}
                  >
                    {isMobile ? '' : suggestion.text}
                  </Button>
                </WrapItem>
              ))}
            </Wrap>
          </VStack>
        </Container>
      </Box>
    </Flex>
  );
}
