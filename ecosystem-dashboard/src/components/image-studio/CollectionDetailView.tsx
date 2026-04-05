/**
 * Collection Detail View Component
 * 
 * Displays images within a collection with modern UX
 * - Grid view of images
 * - Set cover image functionality
 * - Remove images from collection
 * - Back navigation
 */

import React, { useEffect, useState } from 'react';
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
    useToast,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    Flex,
    Spacer,
    useDisclosure,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalBody,
    ModalCloseButton,
} from '@chakra-ui/react';
import {
    FiArrowLeft,
    FiImage,
    FiTrash2,
    FiStar,
    FiMoreVertical,
    FiDownload,
    FiMaximize2,
    FiCheck,
    FiPlus,
    FiChevronRight,
} from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useImageStudio, GeneratedImage } from '@/contexts/ImageStudioContext';
import { motion, AnimatePresence } from 'framer-motion';

const MotionBox = motion(Box);

export const CollectionDetailView: React.FC = () => {
    const {
        selectedCollection,
        setSelectedCollection,
        collectionImages,
        collectionImagesLoading,
        fetchCollectionImages,
        setCollectionCover,
        removeImageFromCollection,
        toggleFavorite,
    } = useImageStudio();

    const toast = useToast();
    const { isOpen: isLightboxOpen, onOpen: onLightboxOpen, onClose: onLightboxClose } = useDisclosure();
    const [lightboxImage, setLightboxImage] = useState<GeneratedImage | null>(null);
    const [hoveredImageId, setHoveredImageId] = useState<string | null>(null);

    const borderColor = useSemanticToken('border.subtle');
    const textSecondary = useSemanticToken('text.secondary');
    const bgHover = useSemanticToken('surface.hover');
    const surfaceBg = useSemanticToken('surface.default');
    const accentColor = useSemanticToken('accent.primary');

    // Fetch images when collection is selected
    useEffect(() => {
        if (selectedCollection?.id) {
            fetchCollectionImages(selectedCollection.id);
        }
    }, [selectedCollection?.id, fetchCollectionImages]);

    const handleBack = () => {
        setSelectedCollection(null);
    };

    const handleSetCover = async (imageId: string) => {
        if (!selectedCollection) return;
        await setCollectionCover(selectedCollection.id, imageId);
        toast({
            title: 'Cover image updated',
            status: 'success',
            duration: 2000,
        });
    };

    const handleRemoveImage = async (imageId: string) => {
        if (!selectedCollection) return;
        await removeImageFromCollection(selectedCollection.id, imageId);
        toast({
            title: 'Image removed from collection',
            status: 'info',
            duration: 2000,
        });
    };

    const handleOpenLightbox = (image: GeneratedImage) => {
        setLightboxImage(image);
        onLightboxOpen();
    };

    const handleDownload = async (image: GeneratedImage) => {
        try {
            const response = await fetch(`/api/image-studio/image?filename=${image.filename}&type=output`);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = image.filename || 'image.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            toast({ title: 'Failed to download image', status: 'error' });
        }
    };

    if (!selectedCollection) {
        return null;
    }

    if (collectionImagesLoading) {
        return (
            <Center h="400px">
                <VStack spacing={4}>
                    <Spinner size="xl" color={accentColor} />
                    <Text color={textSecondary}>Loading collection...</Text>
                </VStack>
            </Center>
        );
    }

    const isCoverImage = (imageId: string) => {
        return selectedCollection.cover_image_id === imageId;
    };

    return (
        <Box p={4}>
            {/* Header with breadcrumb and back button */}
            <Flex align="center" mb={6}>
                <HStack spacing={3}>
                    <IconButton
                        aria-label="Back to collections"
                        icon={<FiArrowLeft />}
                        variant="ghost"
                        size="sm"
                        onClick={handleBack}
                    />
                    <Breadcrumb separator={<FiChevronRight color="gray.500" />}>
                        <BreadcrumbItem>
                            <BreadcrumbLink 
                                onClick={handleBack}
                                color={textSecondary}
                                _hover={{ color: accentColor }}
                            >
                                Collections
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbItem isCurrentPage>
                            <Text fontWeight="semibold">{selectedCollection.name}</Text>
                        </BreadcrumbItem>
                    </Breadcrumb>
                </HStack>
                <Spacer />
                <HStack>
                    <Badge colorScheme="purple" fontSize="sm">
                        {collectionImages.length} images
                    </Badge>
                </HStack>
            </Flex>

            {/* Collection description */}
            {selectedCollection.description && (
                <Text color={textSecondary} mb={4} fontSize="sm">
                    {selectedCollection.description}
                </Text>
            )}

            {/* Empty state */}
            {collectionImages.length === 0 ? (
                <Center h="300px">
                    <VStack spacing={4}>
                        <Icon as={FiImage} boxSize={16} color={textSecondary} />
                        <Text fontSize="lg" fontWeight="medium">No images yet</Text>
                        <Text color={textSecondary} textAlign="center">
                            Add images from your gallery to this collection
                        </Text>
                        <Button
                            leftIcon={<FiPlus />}
                            colorScheme="blue"
                            variant="outline"
                            onClick={handleBack}
                        >
                            Browse Gallery
                        </Button>
                    </VStack>
                </Center>
            ) : (
                /* Image grid */
                <SimpleGrid columns={{ base: 2, sm: 3, md: 4, lg: 5 }} spacing={4}>
                    <AnimatePresence>
                        {collectionImages.map((image, index) => (
                            <MotionBox
                                key={image.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.2, delay: index * 0.03 }}
                                position="relative"
                                borderRadius="lg"
                                overflow="hidden"
                                cursor="pointer"
                                border="2px solid"
                                borderColor={isCoverImage(image.id) ? 'blue.500' : borderColor}
                                bg={surfaceBg}
                                _hover={{ 
                                    transform: 'scale(1.02)',
                                    boxShadow: 'lg',
                                }}
                                onMouseEnter={() => setHoveredImageId(image.id)}
                                onMouseLeave={() => setHoveredImageId(null)}
                                onClick={() => handleOpenLightbox(image)}
                            >
                                {/* Cover badge */}
                                {isCoverImage(image.id) && (
                                    <Badge
                                        position="absolute"
                                        top={2}
                                        left={2}
                                        colorScheme="blue"
                                        fontSize="xs"
                                        zIndex={2}
                                    >
                                        Cover
                                    </Badge>
                                )}

                                {/* Image */}
                                <Image
                                    src={`/api/image-studio/image?filename=${image.filename}&type=output`}
                                    alt={image.prompt}
                                    w="100%"
                                    h="180px"
                                    objectFit="cover"
                                    fallback={
                                        <Center h="180px" bg="gray.100">
                                            <Spinner size="sm" />
                                        </Center>
                                    }
                                />

                                {/* Hover overlay with actions */}
                                <Box
                                    position="absolute"
                                    top={0}
                                    left={0}
                                    right={0}
                                    bottom={0}
                                    bg="blackAlpha.600"
                                    opacity={hoveredImageId === image.id ? 1 : 0}
                                    transition="opacity 0.2s"
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="center"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <HStack spacing={2}>
                                        <Tooltip label="View full size">
                                            <IconButton
                                                aria-label="View"
                                                icon={<FiMaximize2 />}
                                                size="sm"
                                                colorScheme="whiteAlpha"
                                                onClick={() => handleOpenLightbox(image)}
                                            />
                                        </Tooltip>
                                        <Tooltip label={isCoverImage(image.id) ? 'Current cover' : 'Set as cover'}>
                                            <IconButton
                                                aria-label="Set as cover"
                                                icon={isCoverImage(image.id) ? <FiCheck /> : <FiImage />}
                                                size="sm"
                                                colorScheme={isCoverImage(image.id) ? 'blue' : 'whiteAlpha'}
                                                onClick={() => handleSetCover(image.id)}
                                            />
                                        </Tooltip>
                                        <Tooltip label="Download">
                                            <IconButton
                                                aria-label="Download"
                                                icon={<FiDownload />}
                                                size="sm"
                                                colorScheme="whiteAlpha"
                                                onClick={() => handleDownload(image)}
                                            />
                                        </Tooltip>
                                        <Tooltip label="Remove from collection">
                                            <IconButton
                                                aria-label="Remove"
                                                icon={<FiTrash2 />}
                                                size="sm"
                                                colorScheme="red"
                                                onClick={() => handleRemoveImage(image.id)}
                                            />
                                        </Tooltip>
                                    </HStack>
                                </Box>
                            </MotionBox>
                        ))}
                    </AnimatePresence>
                </SimpleGrid>
            )}

            {/* Lightbox Modal */}
            <Modal isOpen={isLightboxOpen} onClose={onLightboxClose} size="6xl" isCentered>
                <ModalOverlay bg="blackAlpha.800" />
                <ModalContent bg="transparent" boxShadow="none" maxW="90vw">
                    <ModalCloseButton color="white" size="lg" />
                    <ModalBody p={0} display="flex" justifyContent="center" alignItems="center">
                        {lightboxImage && (
                            <VStack spacing={4}>
                                <Image
                                    src={`/api/image-studio/image?filename=${lightboxImage.filename}&type=output`}
                                    alt={lightboxImage.prompt}
                                    maxH="80vh"
                                    maxW="90vw"
                                    objectFit="contain"
                                    borderRadius="lg"
                                />
                                <Box
                                    bg="blackAlpha.700"
                                    p={4}
                                    borderRadius="lg"
                                    maxW="600px"
                                >
                                    <Text color="white" fontSize="sm" noOfLines={3}>
                                        {lightboxImage.prompt}
                                    </Text>
                                    <HStack mt={3} spacing={2}>
                                        <Button
                                            size="sm"
                                            leftIcon={<FiDownload />}
                                            onClick={() => handleDownload(lightboxImage)}
                                        >
                                            Download
                                        </Button>
                                        {!isCoverImage(lightboxImage.id) && (
                                            <Button
                                                size="sm"
                                                leftIcon={<FiImage />}
                                                variant="outline"
                                                colorScheme="blue"
                                                onClick={() => {
                                                    handleSetCover(lightboxImage.id);
                                                    onLightboxClose();
                                                }}
                                            >
                                                Set as Cover
                                            </Button>
                                        )}
                                    </HStack>
                                </Box>
                            </VStack>
                        )}
                    </ModalBody>
                </ModalContent>
            </Modal>
        </Box>
    );
};

export default CollectionDetailView;
