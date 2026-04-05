/**
 * Create Collection Modal
 * 
 * Modal dialog for creating new image collections
 */

import React, { useState } from 'react';
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalFooter,
    ModalBody,
    ModalCloseButton,
    Button,
    FormControl,
    FormLabel,
    Input,
    Textarea,
    VStack,
    Select,
    useToast,
    Icon,
    HStack,
    Text,
} from '@chakra-ui/react';
import { FiFolder, FiLock, FiUsers, FiGlobe } from 'react-icons/fi';
import { useImageStudio } from '@/contexts/ImageStudioContext';

interface CreateCollectionModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CreateCollectionModal: React.FC<CreateCollectionModalProps> = ({
    isOpen,
    onClose,
}) => {
    const { createCollection } = useImageStudio();
    const toast = useToast();
    
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [visibility, setVisibility] = useState('private');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async () => {
        if (!name.trim()) {
            toast({
                title: 'Name required',
                description: 'Please enter a collection name',
                status: 'warning',
                duration: 3000,
            });
            return;
        }

        setIsLoading(true);
        try {
            await createCollection(name.trim(), description.trim() || undefined);
            toast({
                title: 'Collection created',
                description: `"${name}" has been created successfully`,
                status: 'success',
                duration: 3000,
            });
            handleClose();
        } catch (error) {
            toast({
                title: 'Failed to create collection',
                status: 'error',
                duration: 3000,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setName('');
        setDescription('');
        setVisibility('private');
        onClose();
    };

    const visibilityOptions = [
        { value: 'private', label: 'Private', icon: FiLock, description: 'Only you can see' },
        { value: 'family', label: 'Family', icon: FiUsers, description: 'Shared with family' },
        { value: 'public', label: 'Public', icon: FiGlobe, description: 'Anyone can see' },
    ];

    return (
        <Modal isOpen={isOpen} onClose={handleClose} size="md">
            <ModalOverlay backdropFilter="blur(4px)" />
            <ModalContent>
                <ModalHeader>
                    <HStack>
                        <Icon as={FiFolder} />
                        <Text>Create New Collection</Text>
                    </HStack>
                </ModalHeader>
                <ModalCloseButton />
                
                <ModalBody>
                    <VStack spacing={4}>
                        <FormControl isRequired>
                            <FormLabel>Collection Name</FormLabel>
                            <Input
                                placeholder="e.g., Landscapes, Portraits, AI Art"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                autoFocus
                            />
                        </FormControl>

                        <FormControl>
                            <FormLabel>Description</FormLabel>
                            <Textarea
                                placeholder="Add a description for your collection..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                            />
                        </FormControl>

                        <FormControl>
                            <FormLabel>Visibility</FormLabel>
                            <Select
                                value={visibility}
                                onChange={(e) => setVisibility(e.target.value)}
                            >
                                {visibilityOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label} - {opt.description}
                                    </option>
                                ))}
                            </Select>
                        </FormControl>
                    </VStack>
                </ModalBody>

                <ModalFooter>
                    <Button variant="ghost" mr={3} onClick={handleClose}>
                        Cancel
                    </Button>
                    <Button
                        colorScheme="blue"
                        onClick={handleSubmit}
                        isLoading={isLoading}
                        loadingText="Creating..."
                    >
                        Create Collection
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};
