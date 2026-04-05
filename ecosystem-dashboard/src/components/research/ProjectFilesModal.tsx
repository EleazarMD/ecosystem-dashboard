import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  VStack,
  HStack,
  Text,
  Button,
  Icon,
  Box,
  Spinner,
  Badge,
  IconButton,
  Tooltip,
  useToast,
} from '@chakra-ui/react';
import { FiFile, FiUpload, FiTrash2, FiCheck, FiClock, FiEye, FiRefreshCw } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface Document {
  id: number;
  filename: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
  processed: boolean;
  metadata?: {
    fileData?: string;
    [key: string]: any;
  };
}

interface ProjectFilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  projectName: string;
  onFileUpload: (file: File) => void;
}

export default function ProjectFilesModal({
  isOpen,
  onClose,
  projectId,
  projectName,
  onFileUpload,
}: ProjectFilesModalProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredDocId, setHoveredDocId] = useState<number | null>(null);
  const toast = useToast();

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const hoverBg = useSemanticToken('surface.hover');
  const iconBg = useSemanticToken('surface.base');
  const primaryColor = useSemanticToken('primary.500');
  const primaryLight = useSemanticToken('primary.50');

  useEffect(() => {
    if (isOpen && projectId) {
      loadDocuments();
    }
  }, [isOpen, projectId]);

  // Refresh documents every 3 seconds while modal is open
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      loadDocuments();
    }, 3000);

    return () => clearInterval(interval);
  }, [isOpen, projectId]);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/ai-research/upload-document?projectId=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.md,.pdf,image/*,video/*,audio/*';
    input.multiple = true;
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        for (let i = 0; i < files.length; i++) {
          await onFileUpload(files[i]);
        }
        // Reload documents after upload
        setTimeout(() => loadDocuments(), 1000);
      }
    };
    input.click();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('video')) return '🎬';
    if (fileType.includes('audio')) return '🎵';
    return '📝';
  };

  const handleViewDocument = (doc: Document) => {
    // Check if file has content stored
    if (!doc.metadata?.fileData) {
      toast({
        title: 'Cannot view file',
        description: 'This file was uploaded before viewing was supported. Please re-upload to view it.',
        status: 'warning',
        duration: 5000,
      });
      return;
    }

    // Open document in new tab
    const url = `/api/ai-research/view-document/${doc.id}`;
    window.open(url, '_blank');

    toast({
      title: 'Opening document',
      description: `Viewing ${doc.filename}`,
      status: 'info',
      duration: 2000,
    });
  };

  const handleFixStuckDocuments = async () => {
    try {
      const response = await fetch('/api/ai-research/fix-stuck-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: 'Documents fixed',
          description: `${data.count} document(s) marked as processed`,
          status: 'success',
          duration: 3000,
        });
        await loadDocuments();
      }
    } catch (error) {
      console.error('Failed to fix documents:', error);
      toast({
        title: 'Fix failed',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleDeleteDocument = async (documentId: number, filename: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the document when clicking delete

    if (!confirm(`Delete "${filename}"? This will also delete all associated chunks and embeddings.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/ai-research/delete-document`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId }),
      });

      if (response.ok) {
        toast({
          title: 'Document deleted',
          description: `${filename} has been removed`,
          status: 'success',
          duration: 3000,
        });
        await loadDocuments();
      } else {
        throw new Error('Delete failed');
      }
    } catch (error) {
      console.error('Failed to delete document:', error);
      toast({
        title: 'Delete failed',
        description: 'Could not delete document',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleForceDeleteAll = async () => {
    if (!confirm(`⚠️ NUCLEAR OPTION: Delete ALL documents from this project?\n\nThis will permanently delete all files, chunks, and embeddings.\n\nThis cannot be undone!`)) {
      return;
    }

    try {
      const response = await fetch(`/api/ai-research/force-delete-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: 'All documents deleted',
          description: `Deleted ${data.documentsDeleted} documents and ${data.chunksDeleted} chunks`,
          status: 'success',
          duration: 5000,
        });
        await loadDocuments();
      } else {
        throw new Error('Delete failed');
      }
    } catch (error) {
      console.error('Failed to delete all documents:', error);
      toast({
        title: 'Delete failed',
        description: 'Could not delete documents',
        status: 'error',
        duration: 3000,
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" isCentered>
      <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
      <ModalContent
        bg={bgColor}
        borderRadius="2xl"
        boxShadow="2xl"
        maxH="80vh"
        borderColor={borderColor}
        borderWidth="1px"
      >
        <ModalHeader
          borderBottom="1px solid"
          borderColor={borderColor}
          pt={6}
          pb={4}
        >
          <VStack align="start" spacing={1}>
            <HStack spacing={2}>
              <Box
                w={8}
                h={8}
                bg={primaryLight}
                borderRadius="lg"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Text fontSize="lg">📁</Text>
              </Box>
              <Text fontSize="lg" fontWeight="600">{projectName}</Text>
            </HStack>
            <HStack spacing={2}>
              <Text fontSize="xs" color={useSemanticToken('text.secondary')} fontWeight="normal">
                {documents.length} {documents.length === 1 ? 'file' : 'files'} • Processed with Gemini + Embeddings
              </Text>
              <IconButton
                aria-label="Refresh"
                icon={<FiRefreshCw />}
                size="xs"
                variant="ghost"
                onClick={loadDocuments}
                isLoading={isLoading}
              />
            </HStack>
          </VStack>
        </ModalHeader>
        <ModalCloseButton top={6} right={6} />

        <ModalBody py={6} px={6}>
          <VStack spacing={4} align="stretch">
            {/* Add Files Button - Modern Design */}
            <Button
              onClick={handleFileSelect}
              size="md"
              variant="outline"
              borderColor={borderColor}
              borderRadius="xl"
              h="50px"
              _hover={{
                bg: hoverBg,
                borderColor: primaryColor
              }}
              transition="all 0.2s"
            >
              <HStack spacing={3}>
                <Box
                  w={8}
                  h={8}
                  bg={primaryLight}
                  borderRadius="lg"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <FiUpload size={16} color={primaryColor} />
                </Box>
                <Text fontWeight="500">Add files</Text>
              </HStack>
            </Button>

            {/* Fix Stuck Documents Button (only show if there are unprocessed docs) */}
            {documents.some(doc => !doc.processed) && (
              <VStack spacing={2} align="stretch">
                <Button
                  onClick={handleFixStuckDocuments}
                  size="sm"
                  variant="ghost"
                  colorScheme="orange"
                  borderRadius="xl"
                >
                  Fix stuck documents ({documents.filter(doc => !doc.processed).length})
                </Button>
                <Button
                  onClick={handleForceDeleteAll}
                  size="sm"
                  variant="ghost"
                  colorScheme="red"
                  borderRadius="xl"
                >
                  🗑️ Delete all documents (nuclear option)
                </Button>
              </VStack>
            )}

            {/* Documents List */}
            {isLoading ? (
              <VStack py={8}>
                <Spinner color={primaryColor} />
                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Loading files...</Text>
              </VStack>
            ) : documents.length === 0 ? (
              <VStack py={8} spacing={2}>
                <Text fontSize="2xl">📂</Text>
                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>No files yet</Text>
                <Text fontSize="xs" color={useSemanticToken('text.tertiary')}>Upload documents to use with RAG</Text>
              </VStack>
            ) : (
              <VStack spacing={2} align="stretch" maxH="500px" overflowY="auto" pr={2}>
                {documents.map((doc) => {
                  const isHovered = hoveredDocId === doc.id;

                  return (
                    <Box
                      key={doc.id}
                      p={4}
                      borderWidth="1px"
                      borderColor={borderColor}
                      borderRadius="xl"
                      bg={useSemanticToken('surface.base')}
                      _hover={{
                        bg: hoverBg,
                        borderColor: primaryColor,
                        transform: 'translateY(-1px)',
                        shadow: 'sm'
                      }}
                      transition="all 0.2s"
                      cursor="pointer"
                      onClick={() => handleViewDocument(doc)}
                      onMouseEnter={() => setHoveredDocId(doc.id)}
                      onMouseLeave={() => setHoveredDocId(null)}
                      position="relative"
                    >
                      <HStack spacing={4}>
                        {/* File Icon */}
                        <Box
                          w={12}
                          h={12}
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          bg={doc.file_type.includes('pdf') ? 'red.50' : primaryLight}
                          borderRadius="lg"
                          fontSize="2xl"
                          flexShrink={0}
                        >
                          {getFileIcon(doc.file_type)}
                        </Box>

                        {/* File Info */}
                        <VStack align="start" spacing={1} flex={1} minW={0}>
                          <HStack spacing={2}>
                            <Text fontSize="sm" fontWeight="600" noOfLines={1}>
                              {doc.filename}
                            </Text>
                            {isHovered && (
                              <HStack spacing={1} color={primaryColor} fontSize="xs">
                                <FiEye size={12} />
                                <Text fontWeight="500">View</Text>
                              </HStack>
                            )}
                          </HStack>
                          <HStack spacing={2} fontSize="xs" color={useSemanticToken('text.secondary')}>
                            <Text textTransform="uppercase">{doc.file_type.split('/')[1] || 'FILE'}</Text>
                            <Text>•</Text>
                            <Text>{formatFileSize(doc.file_size)}</Text>
                          </HStack>
                        </VStack>

                        {/* Processing Status */}
                        {doc.processed ? (
                          <Badge
                            colorScheme="green"
                            borderRadius="full"
                            px={3}
                            py={1}
                            display="flex"
                            alignItems="center"
                            gap={1.5}
                            fontSize="xs"
                            fontWeight="600"
                          >
                            <Box as={FiCheck} size={12} />
                            Ready
                          </Badge>
                        ) : (
                          <Badge
                            colorScheme="blue"
                            borderRadius="full"
                            px={3}
                            py={1}
                            display="flex"
                            alignItems="center"
                            gap={1.5}
                            fontSize="xs"
                            fontWeight="600"
                          >
                            <Spinner size="xs" />
                            Processing
                          </Badge>
                        )}

                        {/* Delete Button */}
                        <Tooltip label="Delete document">
                          <IconButton
                            aria-label="Delete document"
                            icon={<FiTrash2 />}
                            size="sm"
                            variant="ghost"
                            colorScheme="red"
                            onClick={(e) => handleDeleteDocument(doc.id, doc.filename, e)}
                            opacity={isHovered ? 1 : 0}
                            transition="opacity 0.2s"
                          />
                        </Tooltip>
                      </HStack>
                    </Box>
                  );
                })}
              </VStack>
            )}
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
