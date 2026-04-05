/**
 * Image Viewer Modal Component
 * 
 * Full-screen viewer for gallery images with navigation and details
 */

import React from 'react';
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalBody,
    ModalCloseButton,
    Box,
    Image,
    VStack,
    HStack,
    Text,
    IconButton,
    Badge,
    Tooltip,
    useToast,
} from '@chakra-ui/react';
import {
    FiChevronLeft,
    FiChevronRight,
    FiHeart,
    FiDownload,
    FiTrash2,
    FiMaximize2,
} from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import type { GeneratedImage } from '@/contexts/ImageStudioContext';

interface ImageViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    image: GeneratedImage | null;
    images: GeneratedImage[];
    onNavigate: (direction: 'prev' | 'next') => void;
    onToggleFavorite: (imageId: string) => void;
    onDelete: (imageId: string) => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
    isOpen,
    onClose,
    image,
    images,
    onNavigate,
    onToggleFavorite,
    onDelete,
}) => {
    const toast = useToast();
    const borderColor = useSemanticToken('border.subtle');
    const bgSecondary = useSemanticToken('surface.secondary');

    if (!image) return null;

    const currentIndex = images.findIndex(img => img.id === image.id);
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < images.length - 1;

    const handleDownload = async () => {
        try {
            const response = await fetch(image.file_path);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = image.filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast({ title: 'Image downloaded', status: 'success', duration: 2000 });
        } catch (error) {
            toast({ title: 'Download failed', status: 'error' });
        }
    };

    const handleDelete = () => {
        if (confirm('Are you sure you want to delete this image? This action cannot be undone.')) {
            onDelete(image.id);
            onClose();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowLeft' && hasPrev) {
            onNavigate('prev');
        } else if (e.key === 'ArrowRight' && hasNext) {
            onNavigate('next');
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            size="full"
            motionPreset="slideInBottom"
        >
            <ModalOverlay bg="blackAlpha.900" backdropFilter="blur(10px)" />
            <ModalContent 
                bg="transparent" 
                boxShadow="none"
                onKeyDown={handleKeyDown}
                tabIndex={0}
            >
                <ModalCloseButton 
                    color="white" 
                    size="lg" 
                    zIndex={2}
                    _hover={{ bg: 'whiteAlpha.200' }}
                />
                
                <ModalBody p={0} display="flex" alignItems="center" justifyContent="center">
                    <Box 
                        position="relative" 
                        w="full" 
                        h="100vh" 
                        display="flex" 
                        flexDirection="column"
                        alignItems="center"
                        justifyContent="center"
                        p={8}
                    >
                        {/* Navigation buttons */}
                        {hasPrev && (
                            <IconButton
                                aria-label="Previous image"
                                icon={<FiChevronLeft />}
                                position="absolute"
                                left={4}
                                top="50%"
                                transform="translateY(-50%)"
                                size="lg"
                                colorScheme="whiteAlpha"
                                bg="blackAlpha.600"
                                color="white"
                                _hover={{ bg: 'blackAlpha.800' }}
                                onClick={() => onNavigate('prev')}
                                zIndex={2}
                            />
                        )}
                        
                        {hasNext && (
                            <IconButton
                                aria-label="Next image"
                                icon={<FiChevronRight />}
                                position="absolute"
                                right={4}
                                top="50%"
                                transform="translateY(-50%)"
                                size="lg"
                                colorScheme="whiteAlpha"
                                bg="blackAlpha.600"
                                color="white"
                                _hover={{ bg: 'blackAlpha.800' }}
                                onClick={() => onNavigate('next')}
                                zIndex={2}
                            />
                        )}

                        {/* Main image */}
                        <Box 
                            maxW="90vw" 
                            maxH="70vh" 
                            position="relative"
                            borderRadius="lg"
                            overflow="hidden"
                            boxShadow="2xl"
                        >
                            <Image
                                src={image.file_path}
                                alt={image.prompt}
                                maxW="100%"
                                maxH="70vh"
                                objectFit="contain"
                                loading="lazy"
                            />
                        </Box>

                        {/* Image details panel */}
                        <Box
                            mt={4}
                            p={4}
                            bg={bgSecondary}
                            borderRadius="lg"
                            border="1px solid"
                            borderColor={borderColor}
                            maxW="90vw"
                            w="full"
                            maxH="20vh"
                            overflowY="auto"
                        >
                            <VStack align="stretch" spacing={3}>
                                {/* Action buttons */}
                                <HStack justify="space-between">
                                    <HStack spacing={2}>
                                        <Badge colorScheme="purple">{image.model}</Badge>
                                        <Badge colorScheme="blue">
                                            {image.width}x{image.height}
                                        </Badge>
                                        {image.seed && (
                                            <Badge colorScheme="gray">Seed: {image.seed}</Badge>
                                        )}
                                        <Text fontSize="xs" color="gray.400">
                                            {currentIndex + 1} / {images.length}
                                        </Text>
                                    </HStack>
                                    
                                    <HStack spacing={2}>
                                        <Tooltip label={image.is_favorite ? 'Remove from favorites' : 'Add to favorites'}>
                                            <IconButton
                                                aria-label="Favorite"
                                                icon={<FiHeart fill={image.is_favorite ? 'red' : 'none'} />}
                                                size="sm"
                                                colorScheme={image.is_favorite ? 'red' : 'gray'}
                                                onClick={() => onToggleFavorite(image.id)}
                                            />
                                        </Tooltip>
                                        <Tooltip label="Download">
                                            <IconButton
                                                aria-label="Download"
                                                icon={<FiDownload />}
                                                size="sm"
                                                colorScheme="blue"
                                                onClick={handleDownload}
                                            />
                                        </Tooltip>
                                        <Tooltip label="Delete">
                                            <IconButton
                                                aria-label="Delete"
                                                icon={<FiTrash2 />}
                                                size="sm"
                                                colorScheme="red"
                                                onClick={handleDelete}
                                            />
                                        </Tooltip>
                                    </HStack>
                                </HStack>

                                {/* Prompt */}
                                <Box>
                                    <Text fontSize="xs" color="gray.400" mb={1}>
                                        Prompt:
                                    </Text>
                                    <Text fontSize="sm" color="white">
                                        {image.prompt}
                                    </Text>
                                </Box>

                                {/* Negative prompt if exists */}
                                {image.negative_prompt && (
                                    <Box>
                                        <Text fontSize="xs" color="gray.400" mb={1}>
                                            Negative Prompt:
                                        </Text>
                                        <Text fontSize="sm" color="white">
                                            {image.negative_prompt}
                                        </Text>
                                    </Box>
                                )}

                                {/* Generation details */}
                                {(image.steps || image.cfg_scale) && (
                                    <HStack spacing={4} fontSize="xs" color="gray.400">
                                        {image.steps && <Text>Steps: {image.steps}</Text>}
                                        {image.cfg_scale && <Text>CFG Scale: {image.cfg_scale}</Text>}
                                        {image.generation_time_ms && (
                                            <Text>Time: {(image.generation_time_ms / 1000).toFixed(2)}s</Text>
                                        )}
                                    </HStack>
                                )}
                            </VStack>
                        </Box>

                        {/* Keyboard shortcuts hint */}
                        <Text 
                            position="absolute" 
                            bottom={2} 
                            fontSize="xs" 
                            color="whiteAlpha.600"
                        >
                            Use ← → arrow keys to navigate • ESC to close
                        </Text>
                    </Box>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
};
