/**
 * Uploads View Component
 * 
 * Allows users to upload images to their gallery
 */

import React, { useState, useRef, useCallback } from 'react';
import {
    Box,
    VStack,
    HStack,
    Text,
    Button,
    Icon,
    Center,
    Spinner,
    Image,
    useToast,
    SimpleGrid,
    Input,
    FormControl,
    FormLabel,
    Select,
    Progress,
} from '@chakra-ui/react';
import { FiUpload, FiImage, FiX, FiCheck } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useImageStudio } from '@/contexts/ImageStudioContext';

interface UploadFile {
    file: File;
    preview: string;
    status: 'pending' | 'uploading' | 'success' | 'error';
    progress: number;
    error?: string;
}

export const UploadsView: React.FC = () => {
    const [files, setFiles] = useState<UploadFile[]>([]);
    const [visibility, setVisibility] = useState('private');
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const toast = useToast();
    const { refreshGallery } = useImageStudio();

    const surfaceHover = useSemanticToken('surface.hover');
    const borderColor = useSemanticToken('border.subtle');
    const accentColor = useSemanticToken('interactive.primary');

    const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = event.target.files;
        if (!selectedFiles) return;

        const newFiles: UploadFile[] = [];

        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];

            // Validate file type
            if (!file.type.startsWith('image/')) {
                toast({
                    title: 'Invalid File',
                    description: `${file.name} is not an image file`,
                    status: 'error',
                    duration: 3000,
                });
                continue;
            }

            // Validate file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                toast({
                    title: 'File Too Large',
                    description: `${file.name} exceeds 10MB limit`,
                    status: 'error',
                    duration: 3000,
                });
                continue;
            }

            newFiles.push({
                file,
                preview: URL.createObjectURL(file),
                status: 'pending',
                progress: 0,
            });
        }

        setFiles(prev => [...prev, ...newFiles]);

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [toast]);

    const handleDrop = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        const droppedFiles = event.dataTransfer.files;
        
        // Create a synthetic event to reuse handleFileSelect logic
        const syntheticEvent = {
            target: { files: droppedFiles }
        } as React.ChangeEvent<HTMLInputElement>;
        
        handleFileSelect(syntheticEvent);
    }, [handleFileSelect]);

    const handleDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
    }, []);

    const removeFile = useCallback((index: number) => {
        setFiles(prev => {
            const newFiles = [...prev];
            URL.revokeObjectURL(newFiles[index].preview);
            newFiles.splice(index, 1);
            return newFiles;
        });
    }, []);

    const uploadFiles = async () => {
        if (files.length === 0) return;

        setIsUploading(true);
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < files.length; i++) {
            if (files[i].status === 'success') continue;

            // Update status to uploading
            setFiles(prev => {
                const newFiles = [...prev];
                newFiles[i] = { ...newFiles[i], status: 'uploading', progress: 0 };
                return newFiles;
            });

            try {
                const formData = new FormData();
                formData.append('image', files[i].file);
                formData.append('visibility', visibility);
                formData.append('description', files[i].file.name);

                const response = await fetch('/api/images/upload', {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    throw new Error('Upload failed');
                }

                // Update status to success
                setFiles(prev => {
                    const newFiles = [...prev];
                    newFiles[i] = { ...newFiles[i], status: 'success', progress: 100 };
                    return newFiles;
                });
                successCount++;
            } catch (error) {
                // Update status to error
                setFiles(prev => {
                    const newFiles = [...prev];
                    newFiles[i] = { 
                        ...newFiles[i], 
                        status: 'error', 
                        error: 'Upload failed' 
                    };
                    return newFiles;
                });
                errorCount++;
            }
        }

        setIsUploading(false);

        if (successCount > 0) {
            toast({
                title: 'Upload Complete',
                description: `${successCount} image${successCount > 1 ? 's' : ''} uploaded successfully`,
                status: 'success',
                duration: 3000,
            });
            // Refresh gallery
            refreshGallery();
        }

        if (errorCount > 0) {
            toast({
                title: 'Some Uploads Failed',
                description: `${errorCount} image${errorCount > 1 ? 's' : ''} failed to upload`,
                status: 'error',
                duration: 3000,
            });
        }
    };

    const clearCompleted = () => {
        setFiles(prev => prev.filter(f => f.status !== 'success'));
    };

    return (
        <Box h="100%" overflow="auto" p={{ base: 2, md: 4 }}>
            <VStack spacing={4} align="stretch" maxW="1200px" mx="auto">
                {/* Header */}
                <HStack justify="space-between">
                    <Text fontSize="xl" fontWeight="bold">Upload Images</Text>
                    {files.some(f => f.status === 'success') && (
                        <Button size="sm" variant="ghost" onClick={clearCompleted}>
                            Clear Completed
                        </Button>
                    )}
                </HStack>

                {/* Drop Zone */}
                <GlassPanel p={0}>
                    <Center
                        h="200px"
                        border="2px dashed"
                        borderColor={borderColor}
                        borderRadius="lg"
                        cursor="pointer"
                        onClick={() => fileInputRef.current?.click()}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        _hover={{ bg: surfaceHover, borderColor: accentColor }}
                        transition="all 0.2s"
                        m={4}
                    >
                        <VStack spacing={3}>
                            <Icon as={FiUpload} boxSize={10} color="gray.400" />
                            <VStack spacing={1}>
                                <Text fontWeight="medium">
                                    Drop images here or click to browse
                                </Text>
                                <Text fontSize="sm" color="gray.500">
                                    PNG, JPG, GIF, WebP up to 10MB each
                                </Text>
                            </VStack>
                        </VStack>
                    </Center>
                </GlassPanel>

                {/* Upload Options */}
                {files.length > 0 && (
                    <GlassPanel p={4}>
                        <HStack spacing={4} justify="space-between" flexWrap="wrap">
                            <FormControl maxW="200px">
                                <FormLabel fontSize="sm">Visibility</FormLabel>
                                <Select 
                                    size="sm" 
                                    value={visibility}
                                    onChange={(e) => setVisibility(e.target.value)}
                                >
                                    <option value="private">Private</option>
                                    <option value="family">Family</option>
                                    <option value="public">Public</option>
                                </Select>
                            </FormControl>
                            <Button
                                colorScheme="blue"
                                leftIcon={<FiUpload />}
                                onClick={uploadFiles}
                                isLoading={isUploading}
                                loadingText="Uploading..."
                                isDisabled={files.every(f => f.status === 'success')}
                            >
                                Upload {files.filter(f => f.status !== 'success').length} Image{files.filter(f => f.status !== 'success').length !== 1 ? 's' : ''}
                            </Button>
                        </HStack>
                    </GlassPanel>
                )}

                {/* File List */}
                {files.length > 0 && (
                    <SimpleGrid columns={{ base: 2, md: 3, lg: 4 }} spacing={4}>
                        {files.map((file, index) => (
                            <GlassPanel key={index} p={2} position="relative">
                                <Box position="relative" paddingTop="100%">
                                    <Image
                                        src={file.preview}
                                        alt={file.file.name}
                                        position="absolute"
                                        top={0}
                                        left={0}
                                        w="100%"
                                        h="100%"
                                        objectFit="cover"
                                        borderRadius="md"
                                        opacity={file.status === 'uploading' ? 0.5 : 1}
                                    />
                                    
                                    {/* Status Overlay */}
                                    {file.status === 'uploading' && (
                                        <Center
                                            position="absolute"
                                            top={0}
                                            left={0}
                                            right={0}
                                            bottom={0}
                                        >
                                            <Spinner size="lg" color={accentColor} />
                                        </Center>
                                    )}
                                    
                                    {file.status === 'success' && (
                                        <Center
                                            position="absolute"
                                            top={2}
                                            right={2}
                                            bg="green.500"
                                            borderRadius="full"
                                            p={1}
                                        >
                                            <Icon as={FiCheck} color="white" boxSize={4} />
                                        </Center>
                                    )}

                                    {file.status !== 'success' && file.status !== 'uploading' && (
                                        <Button
                                            position="absolute"
                                            top={1}
                                            right={1}
                                            size="xs"
                                            colorScheme="red"
                                            variant="solid"
                                            borderRadius="full"
                                            minW="auto"
                                            p={1}
                                            onClick={() => removeFile(index)}
                                        >
                                            <Icon as={FiX} boxSize={3} />
                                        </Button>
                                    )}
                                </Box>
                                
                                <Text 
                                    fontSize="xs" 
                                    mt={2} 
                                    noOfLines={1}
                                    color={file.status === 'error' ? 'red.400' : undefined}
                                >
                                    {file.status === 'error' ? file.error : file.file.name}
                                </Text>
                                
                                {file.status === 'uploading' && (
                                    <Progress 
                                        size="xs" 
                                        isIndeterminate 
                                        colorScheme="blue" 
                                        mt={1}
                                    />
                                )}
                            </GlassPanel>
                        ))}
                    </SimpleGrid>
                )}

                {/* Empty State */}
                {files.length === 0 && (
                    <Center py={8}>
                        <VStack spacing={2} color="gray.500">
                            <Icon as={FiImage} boxSize={12} />
                            <Text>No images selected</Text>
                            <Text fontSize="sm">
                                Drag and drop images or click the upload area above
                            </Text>
                        </VStack>
                    </Center>
                )}
            </VStack>

            {/* Hidden File Input */}
            <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                display="none"
            />
        </Box>
    );
};

export default UploadsView;
