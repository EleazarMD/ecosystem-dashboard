/**
 * Collections View Component
 * 
 * Displays user's image collections/albums
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
    Button,
    useDisclosure,
    useToast,
} from '@chakra-ui/react';
import {
    FiFolder,
    FiPlus,
    FiTrash2,
    FiEdit2,
    FiImage,
} from 'react-icons/fi';
import { CreateCollectionModal } from './CreateCollectionModal';
import { CollectionDetailView } from './CollectionDetailView';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useImageStudio, Collection } from '@/contexts/ImageStudioContext';

export const CollectionsView: React.FC = () => {
    const { 
        collections, 
        collectionsLoading,
        refreshCollections,
        selectedCollection,
        setSelectedCollection,
    } = useImageStudio();
    
    const { isOpen, onOpen, onClose } = useDisclosure();
    const toast = useToast();
    
    const borderColor = useSemanticToken('border.subtle');
    const textSecondary = useSemanticToken('text.secondary');
    const bgHover = useSemanticToken('surface.hover');
    const accentColor = useSemanticToken('accent.primary');

    const handleOpenCollection = (collection: Collection) => {
        setSelectedCollection(collection);
    };

    // If a collection is selected, show the detail view
    if (selectedCollection) {
        return <CollectionDetailView />;
    }

    if (collectionsLoading) {
        return (
            <Center h="400px">
                <VStack spacing={4}>
                    <Spinner size="xl" />
                    <Text color={textSecondary}>Loading collections...</Text>
                </VStack>
            </Center>
        );
    }

    if (collections.length === 0) {
        return (
            <>
                <Center h="400px">
                    <VStack spacing={4}>
                        <Icon as={FiFolder} boxSize={16} color={textSecondary} />
                        <Text fontSize="lg" fontWeight="medium">No collections yet</Text>
                        <Text color={textSecondary} textAlign="center">
                            Create a collection to organize your images
                        </Text>
                        <Button
                            leftIcon={<FiPlus />}
                            colorScheme="blue"
                            onClick={onOpen}
                            mt={2}
                        >
                            Create Your First Collection
                        </Button>
                    </VStack>
                </Center>
                <CreateCollectionModal isOpen={isOpen} onClose={onClose} />
            </>
        );
    }

    const handleDeleteCollection = async (collectionId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this collection? Images will not be deleted.')) {
            try {
                const res = await fetch(`/api/images/collections/${collectionId}`, {
                    method: 'DELETE',
                });
                if (res.ok) {
                    toast({ title: 'Collection deleted', status: 'success', duration: 2000 });
                    refreshCollections();
                } else {
                    toast({ title: 'Failed to delete collection', status: 'error' });
                }
            } catch (error) {
                toast({ title: 'Failed to delete collection', status: 'error' });
            }
        }
    };

    return (
        <Box p={4}>
            <HStack justify="space-between" mb={4}>
                <HStack>
                    <Text fontSize="lg" fontWeight="semibold">
                        Your Collections
                    </Text>
                    <Badge colorScheme="purple">{collections.length} collections</Badge>
                </HStack>
                <Button
                    leftIcon={<FiPlus />}
                    colorScheme="blue"
                    size="sm"
                    onClick={onOpen}
                >
                    New Collection
                </Button>
            </HStack>

            <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={4}>
                {collections.map((collection) => (
                    <Box
                        key={collection.id}
                        borderRadius="lg"
                        overflow="hidden"
                        position="relative"
                        cursor="pointer"
                        border="1px solid"
                        borderColor={borderColor}
                        bg="whiteAlpha.100"
                        _hover={{ bg: bgHover, transform: 'scale(1.02)' }}
                        transition="all 0.2s"
                        onClick={() => handleOpenCollection(collection)}
                    >
                        {/* Cover image or placeholder */}
                        {collection.cover_image_filename ? (
                            <Image
                                src={`/api/image-studio/image?filename=${collection.cover_image_filename}&type=output`}
                                alt={collection.name}
                                w="100%"
                                h="150px"
                                objectFit="cover"
                                fallback={
                                    <Center h="150px" bg="gray.700">
                                        <Spinner size="sm" />
                                    </Center>
                                }
                            />
                        ) : (
                            <Center h="150px" bg="gray.700">
                                <Icon as={FiFolder} boxSize={12} color="gray.500" />
                            </Center>
                        )}

                        {/* Collection info */}
                        <Box p={3}>
                            <HStack justify="space-between">
                                <VStack align="start" spacing={0}>
                                    <Text fontWeight="semibold" noOfLines={1}>
                                        {collection.name}
                                    </Text>
                                    <Text fontSize="xs" color={textSecondary}>
                                        {collection.image_count} images
                                    </Text>
                                </VStack>
                                <HStack spacing={1}>
                                    <Tooltip label="Edit collection">
                                        <IconButton
                                            aria-label="Edit"
                                            icon={<FiEdit2 />}
                                            size="xs"
                                            variant="ghost"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </Tooltip>
                                    <Tooltip label="Delete collection">
                                        <IconButton
                                            aria-label="Delete"
                                            icon={<FiTrash2 />}
                                            size="xs"
                                            variant="ghost"
                                            colorScheme="red"
                                            onClick={(e) => handleDeleteCollection(collection.id, e)}
                                        />
                                    </Tooltip>
                                </HStack>
                            </HStack>
                            {collection.description && (
                                <Text fontSize="xs" color={textSecondary} mt={1} noOfLines={2}>
                                    {collection.description}
                                </Text>
                            )}
                        </Box>
                    </Box>
                ))}
            </SimpleGrid>

            <CreateCollectionModal isOpen={isOpen} onClose={onClose} />
        </Box>
    );
};
