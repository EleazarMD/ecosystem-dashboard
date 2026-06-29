/**
 * ArtGallery — Polished masonry gallery for child-generated art.
 */

import React from 'react';
import {
  Box, VStack, HStack, Text, SimpleGrid, Image, Badge,
  IconButton, useBreakpointValue, AspectRatio,
} from '@chakra-ui/react';
import { FiHeart, FiShare2, FiTrash2, FiDownload, FiEdit3 } from 'react-icons/fi';
import { useChildTheme } from '@/components/child/ChildThemeProvider';
import type { ArtImage } from './art-studio-types';

interface ArtGalleryProps {
  images: ArtImage[];
  onOpenImage: (image: ArtImage) => void;
  onToggleFavorite: (imageId: string) => void;
  onDeleteImage: (image: ArtImage) => void;
  onCustomizeImage?: (image: ArtImage) => void;
  onShareImage?: (image: ArtImage) => void;
  onPrintImage?: (image: ArtImage) => void;
}

export function ArtGallery({
  images,
  onOpenImage,
  onToggleFavorite,
  onDeleteImage,
  onCustomizeImage,
  onShareImage,
  onPrintImage,
}: ArtGalleryProps) {
  const { colors } = useChildTheme();
  const galleryColumns = useBreakpointValue({ base: 2, sm: 3, md: 3, lg: 4 });
  const favoriteCount = images.filter((i) => i.favorite).length;

  if (images.length === 0) {
    return (
      <VStack spacing={6} align="center" py={12} textAlign="center">
        <Box
          w="140px"
          h="140px"
          borderRadius="3xl"
          bg={colors?.primary ? `${colors.primary}11` : 'purple.50'}
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Text fontSize="6xl">🎨</Text>
        </Box>
        <VStack spacing={2}>
          <Text fontSize="xl" fontWeight="bold" color={colors?.primary || 'purple.600'}>
            No creations yet!
          </Text>
          <Text color="gray.500" maxW="400px">
            Your gallery is waiting for its first masterpiece. Type an idea below and tap Create!
          </Text>
        </VStack>
      </VStack>
    );
  }

  return (
    <VStack spacing={5} align="stretch" w="full">
      <HStack justify="space-between" flexWrap="wrap" gap={2}>
        <VStack spacing={0} align="start">
          <Text fontWeight="bold" fontSize="lg">🖼️ Your Gallery</Text>
          <Text fontSize="xs" color="gray.500">
            {images.length} artwork{images.length !== 1 ? 's' : ''}
            {favoriteCount > 0 && ` • ${favoriteCount} favorite${favoriteCount !== 1 ? 's' : ''}`}
          </Text>
        </VStack>
      </HStack>

      <SimpleGrid columns={galleryColumns} spacing={{ base: 3, md: 4 }}>
        {images.map((image) => (
          <Box
            key={image.id}
            bg="white"
            borderRadius="2xl"
            overflow="hidden"
            boxShadow="md"
            position="relative"
            cursor="pointer"
            transition="all 0.25s"
            border="2px solid"
            borderColor="transparent"
            _hover={{
              transform: 'translateY(-6px)',
              boxShadow: 'xl',
              borderColor: 'purple.200',
              '& .gallery-actions': { opacity: 1 },
            }}
            onClick={() => onOpenImage(image)}
            role="group"
          >
            <AspectRatio ratio={1}>
              {image.status === 'pending' || image.status === 'processing' ? (
                <Box
                  bg="purple.50"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  p={4}
                >
                  <VStack spacing={3} w="full">
                    <Box
                      w="60px"
                      h="60px"
                      borderRadius="full"
                      bg="purple.100"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Text fontSize="2xl">🎨</Text>
                    </Box>
                    <Text fontSize="2xs" color="gray.600" fontWeight="bold" textAlign="center">
                      {image.progress?.message || 'Creating...'}
                    </Text>
                    <Box w="full" bg="gray.100" borderRadius="full" h="6px">
                      <Box
                        w={`${image.progress?.percent || 0}%`}
                        h="full"
                        bg="purple.400"
                        borderRadius="full"
                        transition="width 0.5s ease-in-out"
                      />
                    </Box>
                  </VStack>
                </Box>
              ) : image.imageUrl ? (
                <Image src={image.imageUrl} alt={image.prompt} objectFit="cover" />
              ) : (
                <Box bg="gray.100" display="flex" alignItems="center" justifyContent="center">
                  <Text fontSize="2xl">😕</Text>
                </Box>
              )}
            </AspectRatio>

            {/* Favorite badge */}
            {image.favorite && (
              <Box position="absolute" top={2} left={2} zIndex={1}>
                <Badge colorScheme="red" borderRadius="full" px={2} py={0.5} fontSize="xs">
                  ❤️
                </Badge>
              </Box>
            )}

            {/* Status badge */}
            {(image.status === 'pending' || image.status === 'processing') && (
              <Box position="absolute" top={2} left={image.favorite ? 10 : 2} zIndex={1}>
                <Badge colorScheme="yellow" fontSize="2xs" borderRadius="full">
                  {image.status === 'pending' ? '⏳ Queued' : '🎨 Creating'}
                </Badge>
              </Box>
            )}

            {/* Hover actions */}
            <HStack
              className="gallery-actions"
              position="absolute"
              top={2}
              right={2}
              spacing={1}
              opacity={0}
              transition="opacity 0.2s"
              zIndex={2}
              bg="whiteAlpha.900"
              backdropFilter="blur(8px)"
              p={1}
              borderRadius="full"
              boxShadow="sm"
              onClick={(e) => e.stopPropagation()}
            >
              <IconButton
                icon={<FiHeart />}
                aria-label="Favorite"
                size="2xs"
                minW="24px"
                h="24px"
                colorScheme={image.favorite ? 'red' : 'gray'}
                variant={image.favorite ? 'solid' : 'ghost'}
                borderRadius="full"
                onClick={() => onToggleFavorite(image.id)}
              />
              <IconButton
                icon={<FiEdit3 />}
                aria-label="Customize"
                size="2xs"
                minW="24px"
                h="24px"
                variant="ghost"
                borderRadius="full"
                onClick={() => onCustomizeImage?.(image)}
              />
              <IconButton
                icon={<FiShare2 />}
                aria-label="Share"
                size="2xs"
                minW="24px"
                h="24px"
                variant="ghost"
                borderRadius="full"
                onClick={() => onShareImage?.(image)}
              />
              <IconButton
                icon={<FiDownload />}
                aria-label="Download"
                size="2xs"
                minW="24px"
                h="24px"
                variant="ghost"
                borderRadius="full"
                as="a"
                href={image.imageUrl}
                download={`art-${image.id}.png`}
              />
              <IconButton
                icon={<FiTrash2 />}
                aria-label="Delete"
                size="2xs"
                minW="24px"
                h="24px"
                variant="ghost"
                colorScheme="red"
                borderRadius="full"
                onClick={() => onDeleteImage(image)}
              />
            </HStack>

            {/* Prompt text */}
            <Box p={3} bg="white">
              <Text fontSize="xs" noOfLines={1} fontWeight="medium">
                {image.prompt}
              </Text>
              <Text fontSize="2xs" color="gray.400" mt={0.5}>
                {image.createdAt.toLocaleDateString()} • {image.createdAt.toLocaleTimeString()}
              </Text>
            </Box>
          </Box>
        ))}
      </SimpleGrid>
    </VStack>
  );
}
