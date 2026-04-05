/**
 * PDF Upload Panel Component
 * Allows users to upload PDFs to the NeMo Retriever RAG service
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Progress,
  Icon,
  Badge,
  useToast,
  List,
  ListItem,
  IconButton,
  Spinner,
  Divider,
} from '@chakra-ui/react';
import { FiUpload, FiFile, FiTrash2, FiCheck, FiX, FiDatabase } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface UploadedDocument {
  document_id: string;
  filename: string;
  pages: number;
  chunks: number;
  status: 'success' | 'error';
}

interface PDFUploadPanelProps {
  workspaceId?: string;
  onUploadComplete?: (doc: UploadedDocument) => void;
}

export default function PDFUploadPanel({ 
  workspaceId = 'default',
  onUploadComplete 
}: PDFUploadPanelProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  // Semantic tokens
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const successColor = useSemanticToken('status.success');
  const errorColor = useSemanticToken('status.error');

  // Load existing documents
  const loadDocuments = useCallback(async () => {
    try {
      const response = await fetch(`/api/workspace-ai/pdf/documents?workspace_id=${workspaceId}`);
      if (response.ok) {
        const data = await response.json();
        // Map to our format
        const docs = data.documents?.map((d: any) => ({
          document_id: d.document_id,
          filename: d.filename,
          pages: 0,
          chunks: 0,
          status: 'success' as const,
        })) || [];
        setDocuments(docs);
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  }, [workspaceId]);

  // Load on mount
  React.useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a PDF file',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('workspace_id', workspaceId);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const response = await fetch('/api/workspace-ai/pdf/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();

      const newDoc: UploadedDocument = {
        document_id: data.document_id,
        filename: data.filename,
        pages: data.pages,
        chunks: data.chunks,
        status: 'success',
      };

      setDocuments(prev => [newDoc, ...prev]);
      onUploadComplete?.(newDoc);

      toast({
        title: 'PDF uploaded successfully',
        description: `${data.filename}: ${data.pages} pages, ${data.chunks} chunks indexed`,
        status: 'success',
        duration: 5000,
      });

    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUpload(e.target.files[0]);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      const response = await fetch(`/api/workspace-ai/pdf/documents/${documentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setDocuments(prev => prev.filter(d => d.document_id !== documentId));
        toast({
          title: 'Document deleted',
          status: 'success',
          duration: 2000,
        });
      }
    } catch (error) {
      toast({
        title: 'Failed to delete document',
        status: 'error',
        duration: 3000,
      });
    }
  };

  return (
    <VStack spacing={4} align="stretch" p={4}>
      {/* Upload Area */}
      <Box
        p={6}
        borderRadius="lg"
        border="2px dashed"
        borderColor={dragActive ? 'blue.400' : borderColor}
        bg={dragActive ? 'blue.50' : bgColor}
        textAlign="center"
        cursor="pointer"
        transition="all 0.2s"
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        _hover={{ borderColor: 'blue.400' }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        {isUploading ? (
          <VStack spacing={3}>
            <Spinner size="lg" color="blue.500" />
            <Text color={textColor} fontWeight="medium">Processing PDF...</Text>
            <Progress 
              value={uploadProgress} 
              size="sm" 
              colorScheme="blue" 
              w="full" 
              borderRadius="full"
            />
            <Text fontSize="sm" color={mutedColor}>
              Extracting text, tables, and generating embeddings
            </Text>
          </VStack>
        ) : (
          <VStack spacing={2}>
            <Icon as={FiUpload} boxSize={8} color="blue.500" />
            <Text color={textColor} fontWeight="medium">
              Drop PDF here or click to upload
            </Text>
            <Text fontSize="sm" color={mutedColor}>
              Max file size: 100MB
            </Text>
          </VStack>
        )}
      </Box>

      {/* Documents List */}
      {documents.length > 0 && (
        <>
          <Divider />
          <HStack justify="space-between">
            <HStack>
              <Icon as={FiDatabase} color={mutedColor} />
              <Text fontSize="sm" fontWeight="medium" color={textColor}>
                Indexed Documents
              </Text>
            </HStack>
            <Badge colorScheme="blue">{documents.length}</Badge>
          </HStack>

          <List spacing={2}>
            {documents.map((doc) => (
              <ListItem
                key={doc.document_id}
                p={3}
                bg={bgColor}
                borderRadius="md"
                border="1px solid"
                borderColor={borderColor}
              >
                <HStack justify="space-between">
                  <HStack spacing={3}>
                    <Icon 
                      as={doc.status === 'success' ? FiCheck : FiX} 
                      color={doc.status === 'success' ? successColor : errorColor}
                    />
                    <VStack align="start" spacing={0}>
                      <Text fontSize="sm" fontWeight="medium" color={textColor} noOfLines={1}>
                        {doc.filename}
                      </Text>
                      {doc.pages > 0 && (
                        <Text fontSize="xs" color={mutedColor}>
                          {doc.pages} pages • {doc.chunks} chunks
                        </Text>
                      )}
                    </VStack>
                  </HStack>
                  <IconButton
                    aria-label="Delete document"
                    icon={<FiTrash2 />}
                    size="sm"
                    variant="ghost"
                    colorScheme="red"
                    onClick={() => handleDeleteDocument(doc.document_id)}
                  />
                </HStack>
              </ListItem>
            ))}
          </List>
        </>
      )}
    </VStack>
  );
}
