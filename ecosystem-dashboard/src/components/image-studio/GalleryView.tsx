/**
 * Gallery View Component
 * 
 * Displays user's generated images in a grid
 */

import React, { useState } from 'react';
import {
    Box,
    SimpleGrid,
    Image,
    Text,
    VStack,
    HStack,
    IconButton,
    Spinner,
    Center,
    Icon,
    Badge,
    Tooltip,
    useToast,
} from '@chakra-ui/react';
import {
    FiHeart,
    FiDownload,
    FiShare2,
    FiTrash2,
    FiImage,
    FiLayers,
} from 'react-icons/fi';
import { AddToCollectionModal } from './AddToCollectionModal';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useImageStudio } from '@/contexts/ImageStudioContext';
import { ImageViewerModal } from './ImageViewerModal';
import type { GeneratedImage } from '@/contexts/ImageStudioContext';

export const GalleryView: React.FC = () => {
    const { 
        galleryImages, 
        galleryLoading, 
        galleryTotal,
        toggleFavorite,
        refreshGallery,
        deleteImage,
    } = useImageStudio();
    
    const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const [collectionModalImage, setCollectionModalImage] = useState<GeneratedImage | null>(null);
    const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
    
    const toast = useToast();
    const borderColor = useSemanticToken('border.subtle');
    const textSecondary = useSemanticToken('text.secondary');
    const bgHover = useSemanticToken('surface.hover');

    const handleDownload = async (filePath: string, filename: string) => {
        try {
            const response = await fetch(filePath);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast({ title: 'Image downloaded', status: 'success', duration: 2000 });
        } catch (error) {
            toast({ title: 'Download failed', status: 'error' });
        }
    };

    const handleDelete = async (imageId: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (confirm('Are you sure you want to delete this image? This action cannot be undone.')) {
            const success = await deleteImage(imageId);
            if (success) {
                toast({ title: 'Image deleted successfully', status: 'success', duration: 2000 });
            } else {
                toast({ title: 'Failed to delete image', status: 'error', duration: 2000 });
            }
        }
    };

    const handleImageClick = (image: GeneratedImage) => {
        setSelectedImage(image);
        setIsViewerOpen(true);
    };

    const handleNavigate = (direction: 'prev' | 'next') => {
        if (!selectedImage) return;
        
        const currentIndex = galleryImages.findIndex(img => img.id === selectedImage.id);
        let newIndex: number;
        
        if (direction === 'prev') {
            newIndex = currentIndex > 0 ? currentIndex - 1 : currentIndex;
        } else {
            newIndex = currentIndex < galleryImages.length - 1 ? currentIndex + 1 : currentIndex;
        }
        
        setSelectedImage(galleryImages[newIndex]);
    };

    const handleViewerClose = () => {
        setIsViewerOpen(false);
        setSelectedImage(null);
    };

    if (galleryLoading) {
        return (
            <Center h="400px">
                <VStack spacing={4}>
                    <Spinner size="xl" />
                    <Text color={textSecondary}>Loading gallery...</Text>
                </VStack>
            </Center>
        );
    }

    if (galleryImages.length === 0) {
        return (
            <Center h="400px">
                <VStack spacing={4}>
                    <Icon as={FiImage} boxSize={16} color={textSecondary} />
                    <Text fontSize="lg" fontWeight="medium">No images yet</Text>
                    <Text color={textSecondary} textAlign="center">
                        Generate your first image to see it here
                    </Text>
                </VStack>
            </Center>
        );
    }

    return (
        <Box p={4}>
            <HStack justify="space-between" mb={4}>
                <Text fontSize="lg" fontWeight="semibold">
                    Your Gallery
                </Text>
                <Badge colorScheme="blue">{galleryTotal} images</Badge>
            </HStack>

            <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing={4}>
                {galleryImages.map((image) => (
                    <Box
                        key={image.id}
                        borderRadius="lg"
                        overflow="hidden"
                        position="relative"
                        _hover={{ transform: 'scale(1.02)' }}
                        transition="transform 0.2s"
                        cursor="pointer"
                        border="1px solid"
                        borderColor={borderColor}
                        bg="whiteAlpha.100"
                        onClick={() => handleImageClick(image)}
                    >
                        <Image
                            src={image.file_path}
                            alt={image.prompt}
                            w="100%"
                            h="200px"
                            objectFit="cover"
                        />
                        
                        {/* Overlay on hover */}
                        <Box
                            position="absolute"
                            top={0}
                            left={0}
                            right={0}
                            bottom={0}
                            bg="blackAlpha.600"
                            opacity={0}
                            _hover={{ opacity: 1 }}
                            transition="opacity 0.2s"
                            display="flex"
                            flexDirection="column"
                            justifyContent="space-between"
                            p={3}
                        >
                            {/* Top actions */}
                            <HStack justify="flex-end">
                                <Tooltip label={image.is_favorite ? 'Remove from favorites' : 'Add to favorites'}>
                                    <IconButton
                                        aria-label="Favorite"
                                        icon={<FiHeart fill={image.is_favorite ? 'red' : 'none'} />}
                                        size="sm"
                                        colorScheme={image.is_favorite ? 'red' : 'whiteAlpha'}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleFavorite(image.id);
                                        }}
                                    />
                                </Tooltip>
                                <Tooltip label="Download">
                                    <IconButton
                                        aria-label="Download"
                                        icon={<FiDownload />}
                                        size="sm"
                                        colorScheme="whiteAlpha"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDownload(image.file_path, image.filename);
                                        }}
                                    />
                                </Tooltip>
                                <Tooltip label="Add to collection">
                                    <IconButton
                                        aria-label="Add to collection"
                                        icon={<FiLayers />}
                                        size="sm"
                                        colorScheme="whiteAlpha"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setCollectionModalImage(image);
                                            setIsCollectionModalOpen(true);
                                        }}
                                    />
                                </Tooltip>
                                <Tooltip label="Delete image">
                                    <IconButton
                                        aria-label="Delete"
                                        icon={<FiTrash2 />}
                                        size="sm"
                                        colorScheme="blue"
                                        onClick={(e) => handleDelete(image.id, e)}
                                    />
                                </Tooltip>
                            </HStack>

                            {/* Bottom info */}
                            <Box>
                                <Text 
                                    color="white" 
                                    fontSize="xs" 
                                    noOfLines={2}
                                    fontWeight="medium"
                                >
                                    {image.prompt}
                                </Text>
                                <HStack mt={1} spacing={2}>
                                    <Badge size="sm" colorScheme="purple">
                                        {image.model}
                                    </Badge>
                                    <Text color="whiteAlpha.700" fontSize="2xs">
                                        {image.width}x{image.height}
                                    </Text>
                                </HStack>
                            </Box>
                        </Box>

                        {/* Favorite indicator */}
                        {image.is_favorite && (
                            <Icon
                                as={FiHeart}
                                position="absolute"
                                top={2}
                                right={2}
                                color="red.500"
                                fill="red.500"
                                boxSize={4}
                            />
                        )}
                    </Box>
            ))}
        </SimpleGrid>

        {/* Image Viewer Modal */}
        <ImageViewerModal
            isOpen={isViewerOpen}
            onClose={handleViewerClose}
            image={selectedImage}
            images={galleryImages}
            onNavigate={handleNavigate}
            onToggleFavorite={toggleFavorite}
            onDelete={handleDelete}
        />

        {/* Add to Collection Modal */}
        {collectionModalImage && (
            <AddToCollectionModal
                isOpen={isCollectionModalOpen}
                onClose={() => {
                    setIsCollectionModalOpen(false);
                    setCollectionModalImage(null);
                }}
                imageId={collectionModalImage.id}
                imagePath={collectionModalImage.file_path}
            />
        )}
        </Box>
    );
};
