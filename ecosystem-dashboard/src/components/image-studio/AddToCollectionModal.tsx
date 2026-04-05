/**
 * Add To Collection Modal
 * 
 * Modal dialog for adding an image to a collection
 */

import React, { useState, useEffect } from 'react';
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalFooter,
    ModalBody,
    ModalCloseButton,
    Button,
    VStack,
    HStack,
    Text,
    Icon,
    Box,
    Spinner,
    Center,
    useToast,
    Input,
    InputGroup,
    InputLeftElement,
    Divider,
} from '@chakra-ui/react';
import { FiFolder, FiPlus, FiCheck, FiSearch } from 'react-icons/fi';
import { useImageStudio } from '@/contexts/ImageStudioContext';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface AddToCollectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageId: string;
    imagePath?: string;
}

export const AddToCollectionModal: React.FC<AddToCollectionModalProps> = ({
    isOpen,
    onClose,
    imageId,
    imagePath,
}) => {
    const { collections, collectionsLoading, refreshCollections, createCollection } = useImageStudio();
    const toast = useToast();
    
    const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateNew, setShowCreateNew] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    
    const borderColor = useSemanticToken('border.subtle');
    const bgHover = useSemanticToken('surface.hover');
    const textSecondary = useSemanticToken('text.secondary');

    useEffect(() => {
        if (isOpen) {
            refreshCollections();
            setSelectedCollectionId(null);
            setSearchQuery('');
            setShowCreateNew(false);
            setNewCollectionName('');
        }
    }, [isOpen, refreshCollections]);

    const filteredCollections = collections.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAddToCollection = async () => {
        if (!selectedCollectionId) {
            toast({
                title: 'Select a collection',
                description: 'Please select a collection to add the image to',
                status: 'warning',
                duration: 3000,
            });
            return;
        }

        setIsAdding(true);
        try {
            const res = await fetch(`/api/images/collections/${selectedCollectionId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image_id: imageId }),
            });

            if (res.ok) {
                const collection = collections.find(c => c.id === selectedCollectionId);
                toast({
                    title: 'Image added',
                    description: `Added to "${collection?.name}"`,
                    status: 'success',
                    duration: 2000,
                });
                refreshCollections();
                onClose();
            } else {
                const data = await res.json();
                toast({
                    title: 'Failed to add image',
                    description: data.error || 'Unknown error',
                    status: 'error',
                    duration: 3000,
                });
            }
        } catch (error) {
            toast({
                title: 'Failed to add image',
                status: 'error',
                duration: 3000,
            });
        } finally {
            setIsAdding(false);
        }
    };

    const handleCreateAndAdd = async () => {
        if (!newCollectionName.trim()) {
            toast({
                title: 'Name required',
                description: 'Please enter a collection name',
                status: 'warning',
                duration: 3000,
            });
            return;
        }

        setIsCreating(true);
        try {
            // Create collection
            const createRes = await fetch('/api/images/collections', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newCollectionName.trim() }),
            });

            if (createRes.ok) {
                const { collection } = await createRes.json();
                
                // Add image to new collection
                const addRes = await fetch(`/api/images/collections/${collection.id}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image_id: imageId }),
                });

                if (addRes.ok) {
                    toast({
                        title: 'Collection created',
                        description: `Created "${newCollectionName}" and added image`,
                        status: 'success',
                        duration: 2000,
                    });
                    refreshCollections();
                    onClose();
                }
            } else {
                toast({
                    title: 'Failed to create collection',
                    status: 'error',
                    duration: 3000,
                });
            }
        } catch (error) {
            toast({
                title: 'Failed to create collection',
                status: 'error',
                duration: 3000,
            });
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="md">
            <ModalOverlay backdropFilter="blur(4px)" />
            <ModalContent>
                <ModalHeader>
                    <HStack>
                        <Icon as={FiFolder} />
                        <Text>Add to Collection</Text>
                    </HStack>
                </ModalHeader>
                <ModalCloseButton />
                
                <ModalBody>
                    <VStack spacing={4} align="stretch">
                        {/* Search */}
                        <InputGroup size="sm">
                            <InputLeftElement>
                                <Icon as={FiSearch} color="gray.400" />
                            </InputLeftElement>
                            <Input
                                placeholder="Search collections..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </InputGroup>

                        {/* Collections list */}
                        {collectionsLoading ? (
                            <Center py={8}>
                                <Spinner />
                            </Center>
                        ) : (
                            <VStack 
                                spacing={2} 
                                align="stretch" 
                                maxH="250px" 
                                overflowY="auto"
                                pr={2}
                            >
                                {filteredCollections.length === 0 ? (
                                    <Center py={4}>
                                        <Text color={textSecondary} fontSize="sm">
                                            {searchQuery ? 'No matching collections' : 'No collections yet'}
                                        </Text>
                                    </Center>
                                ) : (
                                    filteredCollections.map((collection) => (
                                        <Box
                                            key={collection.id}
                                            p={3}
                                            borderRadius="md"
                                            border="1px solid"
                                            borderColor={selectedCollectionId === collection.id ? 'blue.500' : borderColor}
                                            bg={selectedCollectionId === collection.id ? 'blue.50' : 'transparent'}
                                            cursor="pointer"
                                            _hover={{ bg: bgHover }}
                                            onClick={() => setSelectedCollectionId(collection.id)}
                                            transition="all 0.2s"
                                        >
                                            <HStack justify="space-between">
                                                <HStack>
                                                    <Icon as={FiFolder} color={selectedCollectionId === collection.id ? 'blue.500' : 'gray.500'} />
                                                    <VStack align="start" spacing={0}>
                                                        <Text fontWeight="medium" fontSize="sm">
                                                            {collection.name}
                                                        </Text>
                                                        <Text fontSize="xs" color={textSecondary}>
                                                            {collection.image_count} images
                                                        </Text>
                                                    </VStack>
                                                </HStack>
                                                {selectedCollectionId === collection.id && (
                                                    <Icon as={FiCheck} color="blue.500" />
                                                )}
                                            </HStack>
                                        </Box>
                                    ))
                                )}
                            </VStack>
                        )}

                        <Divider />

                        {/* Create new collection */}
                        {showCreateNew ? (
                            <VStack spacing={2} align="stretch">
                                <Input
                                    placeholder="New collection name..."
                                    value={newCollectionName}
                                    onChange={(e) => setNewCollectionName(e.target.value)}
                                    size="sm"
                                    autoFocus
                                />
                                <HStack>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                            setShowCreateNew(false);
                                            setNewCollectionName('');
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        size="sm"
                                        colorScheme="green"
                                        onClick={handleCreateAndAdd}
                                        isLoading={isCreating}
                                        loadingText="Creating..."
                                    >
                                        Create & Add
                                    </Button>
                                </HStack>
                            </VStack>
                        ) : (
                            <Button
                                leftIcon={<FiPlus />}
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowCreateNew(true)}
                                justifyContent="flex-start"
                            >
                                Create new collection
                            </Button>
                        )}
                    </VStack>
                </ModalBody>

                <ModalFooter>
                    <Button variant="ghost" mr={3} onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        colorScheme="blue"
                        onClick={handleAddToCollection}
                        isLoading={isAdding}
                        isDisabled={!selectedCollectionId}
                    >
                        Add to Collection
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};
