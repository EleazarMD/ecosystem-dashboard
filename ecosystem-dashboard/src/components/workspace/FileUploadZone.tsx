/**
 * File Upload Zone Component - Chakra UI Version
 * Drag & drop interface for file uploads with progress tracking
 */

import { useState, useCallback } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Progress,
  Icon,
  useToast,
  Spinner,
} from '@chakra-ui/react';
import { FiUploadCloud, FiFile, FiCheck, FiX } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface FileUploadZoneProps {
  workspaceId: string;
  onComplete: () => void;
  onClose: () => void;
}

interface UploadStatus {
  file: File;
  status: 'uploading' | 'processing' | 'complete' | 'error';
  progress: number;
  message: string;
  fileId?: string;
  chunkCount?: number;
  error?: string;
}

export default function FileUploadZone({ workspaceId, onComplete, onClose }: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadStatus[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const toast = useToast();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, [workspaceId]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  }, [workspaceId]);

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;

    setIsUploading(true);

    const newUploads: UploadStatus[] = files.map(file => ({
      file,
      status: 'uploading',
      progress: 0,
      message: 'Preparing upload...',
    }));

    setUploads(newUploads);

    for (let i = 0; i < files.length; i++) {
      await uploadFile(files[i], i);
    }

    setIsUploading(false);
  };

  const uploadFile = async (file: File, index: number) => {
    try {
      // Update: Starting upload
      updateUpload(index, {
        progress: 10,
        message: 'Uploading file...',
      });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('workspaceId', workspaceId);

      const response = await fetch('/api/workspace-ai/upload-file', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      // Update: Extracting text
      updateUpload(index, {
        progress: 50,
        message: 'Extracting text...',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Upload failed');
      }

      // Update: Generating embeddings
      updateUpload(index, {
        progress: 75,
        message: `Generating embeddings... (${data.chunkCount} chunks)`,
      });

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 500));

      // Update: Complete
      updateUpload(index, {
        status: 'complete',
        progress: 100,
        message: `Vectorized • ${data.chunkCount} chunks created`,
        fileId: data.fileId,
        chunkCount: data.chunkCount,
      });

      toast({
        title: 'File uploaded',
        description: `${file.name} has been processed successfully`,
        status: 'success',
        duration: 3000,
      });

    } catch (error) {
      updateUpload(index, {
        status: 'error',
        progress: 0,
        message: 'Upload failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload file',
        status: 'error',
        duration: 5000,
      });
    }
  };

  const updateUpload = (index: number, updates: Partial<UploadStatus>) => {
    setUploads(prev => prev.map((upload, i) =>
      i === index ? { ...upload, ...updates } : upload
    ));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const allComplete = uploads.length > 0 && uploads.every(u => u.status === 'complete' || u.status === 'error');

  const handleDone = () => {
    onComplete();
    onClose();
  };

  return (
    <Modal isOpen={true} onClose={onClose} size="2xl" closeOnOverlayClick={!isUploading}>
      <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(4px)" />
      <ModalContent>
        <ModalHeader>Upload Files</ModalHeader>
        <ModalCloseButton isDisabled={isUploading} />

        <ModalBody pb={6}>
          <VStack spacing={6} align="stretch">
            {/* Drop Zone */}
            {uploads.length === 0 && (
              <Box
                as="label"
                htmlFor="file-input"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                p={12}
                border="2px dashed"
                borderColor={isDragging ? 'blue.400' : 'gray.300'}
                borderRadius="lg"
                bg={isDragging ? 'blue.50' : 'gray.50'}
                cursor="pointer"
                transition="all 0.2s"
                _hover={{ borderColor: 'blue.400', bg: 'blue.50' }}
                textAlign="center"
              >
                <VStack spacing={4}>
                  <Icon as={FiUploadCloud} w={12} h={12} color={isDragging ? 'blue.500' : 'gray.400'} />
                  <VStack spacing={1}>
                    <Text fontWeight="medium" color={useSemanticToken('text.primary')}>
                      Drag & drop files here
                    </Text>
                    <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                      or
                    </Text>
                    <Button colorScheme="blue" size="sm">
                      Browse Files
                    </Button>
                  </VStack>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                    Supported: PDF, TXT, MD, Code files • Max 50MB
                  </Text>
                </VStack>
                <input
                  id="file-input"
                  type="file"
                  multiple
                  accept=".pdf,.txt,.md,.js,.ts,.py,.java,.cpp,.json,.xml,.html,.css"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
              </Box>
            )}

            {/* Upload Progress List */}
            {uploads.length > 0 && (
              <VStack spacing={3} align="stretch">
                {uploads.map((upload, index) => (
                  <Box
                    key={index}
                    p={4}
                    border="1px solid"
                    borderColor={useSemanticToken('border.default')}
                    borderRadius="md"
                    bg={useSemanticToken('surface.elevated')}
                  >
                    <HStack spacing={3} mb={2}>
                      <Icon as={FiFile} color={useSemanticToken('text.secondary')} />
                      <VStack align="start" flex={1} spacing={0}>
                        <Text fontWeight="medium" fontSize="sm" noOfLines={1}>
                          {upload.file.name}
                        </Text>
                        <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                          {formatFileSize(upload.file.size)}
                        </Text>
                      </VStack>

                      {upload.status === 'complete' && (
                        <Icon as={FiCheck} color="green.500" w={5} h={5} />
                      )}
                      {upload.status === 'error' && (
                        <Icon as={FiX} color="red.500" w={5} h={5} />
                      )}
                      {(upload.status === 'uploading' || upload.status === 'processing') && (
                        <Spinner size="sm" color="blue.500" />
                      )}
                    </HStack>

                    {upload.status !== 'error' && (
                      <Progress
                        value={upload.progress}
                        size="sm"
                        colorScheme={upload.status === 'complete' ? 'green' : 'blue'}
                        borderRadius="full"
                        mb={2}
                      />
                    )}

                    <Text
                      fontSize="xs"
                      color={
                        upload.status === 'complete' ? 'green.600' :
                          upload.status === 'error' ? 'red.600' :
                            'gray.600'
                      }
                    >
                      {upload.message}
                    </Text>

                    {upload.error && (
                      <Text fontSize="xs" color="red.600" mt={1}>
                        Error: {upload.error}
                      </Text>
                    )}
                  </Box>
                ))}
              </VStack>
            )}

            {/* Action Buttons */}
            {allComplete && (
              <HStack justify="flex-end">
                <Button onClick={handleDone} colorScheme="blue">
                  Done
                </Button>
              </HStack>
            )}
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
