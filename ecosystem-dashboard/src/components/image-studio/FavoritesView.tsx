/**
 * Favorites View Component
 * 
 * Displays user's favorite images
 */

import React from 'react';
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
    FiStar,
} from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useImageStudio } from '@/contexts/ImageStudioContext';

export const FavoritesView: React.FC = () => {
    const { 
        favoriteImages, 
        favoritesLoading,
        toggleFavorite,
    } = useImageStudio();
    
    const toast = useToast();
    const borderColor = useSemanticToken('border.subtle');
    const textSecondary = useSemanticToken('text.secondary');

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

    if (favoritesLoading) {
        return (
            <Center h="400px">
                <VStack spacing={4}>
                    <Spinner size="xl" />
                    <Text color={textSecondary}>Loading favorites...</Text>
                </VStack>
            </Center>
        );
    }

    if (favoriteImages.length === 0) {
        return (
            <Center h="400px">
                <VStack spacing={4}>
                    <Icon as={FiStar} boxSize={16} color={textSecondary} />
                    <Text fontSize="lg" fontWeight="medium">No favorites yet</Text>
                    <Text color={textSecondary} textAlign="center">
                        Click the heart icon on any image to add it to favorites
                    </Text>
                </VStack>
            </Center>
        );
    }

    return (
        <Box p={4}>
            <HStack justify="space-between" mb={4}>
                <Text fontSize="lg" fontWeight="semibold">
                    Your Favorites
                </Text>
                <Badge colorScheme="red">{favoriteImages.length} images</Badge>
            </HStack>

            <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing={4}>
                {favoriteImages.map((image) => (
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
                    >
                        <Image
                            src={image.file_path}
                            alt={image.prompt}
                            w="100%"
                            h="200px"
                            objectFit="cover"
                        />
                        
                        {/* Action buttons */}
                        <HStack 
                            position="absolute" 
                            top={2} 
                            right={2} 
                            spacing={1}
                        >
                            <Tooltip label="Remove from favorites">
                                <IconButton
                                    aria-label="Remove favorite"
                                    icon={<FiHeart fill="red" />}
                                    size="sm"
                                    colorScheme="red"
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
                        </HStack>

                        {/* Prompt preview */}
                        <Box p={2} bg="blackAlpha.700">
                            <Text 
                                color="white" 
                                fontSize="xs" 
                                noOfLines={2}
                            >
                                {image.prompt}
                            </Text>
                        </Box>
                    </Box>
                ))}
            </SimpleGrid>
        </Box>
    );
};
