/**
 * File Card Component - Chakra UI Version
 * Individual file display in grid or list view
 */

import { useState } from 'react';
import {
  Box,
  HStack,
  VStack,
  Text,
  Badge,
  IconButton,
  Tooltip,
  Spinner,
} from '@chakra-ui/react';
import { FiTrash2, FiFileText, FiFile, FiCode, FiDatabase } from 'react-icons/fi';
import { FileMetadata } from '@/lib/workspace/file-upload-handler';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface FileCardProps {
  file: FileMetadata;
  onDelete: (fileId: string) => void;
  onClick?: (fileId: string) => void;
  viewMode?: 'grid' | 'list';
}

export default function FileCard({ file, onDelete, onClick, viewMode = 'grid' }: FileCardProps) {
  const [showActions, setShowActions] = useState(false);

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('text') || fileType.includes('markdown')) return '📋';
    if (fileType.includes('javascript') || fileType.includes('typescript')) return '📜';
    if (fileType.includes('python')) return '🐍';
    if (fileType.includes('json')) return '📊';
    if (fileType.includes('html')) return '🌐';
    if (fileType.includes('css')) return '🎨';
    return '📁';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 7) {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking delete button
    if ((e.target as HTMLElement).closest('button[aria-label="Delete file"]')) {
      return;
    }
    onClick?.(file.id);
  };

  const getFileExtension = (fileName: string) => {
    const parts = fileName.split('.');
    return parts.length > 1 ? `.${parts[parts.length - 1].toUpperCase()}` : '';
  };

  if (viewMode === 'list') {
    return (
      <Box
        p={4}
        border="1px solid"
        borderColor={useSemanticToken('border.default')}
        borderRadius="md"
        bg={useSemanticToken('surface.elevated')}
        cursor="pointer"
        transition="all 0.2s"
        _hover={{ borderColor: 'gray.400', shadow: 'md' }}
        onClick={handleCardClick}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        <HStack spacing={3} justify="space-between">
          <HStack spacing={3} flex={1} minW={0}>
            <Text fontSize="3xl">{getFileIcon(file.fileType)}</Text>

            <VStack align="start" spacing={0} flex={1} minW={0}>
              <Text fontWeight="medium" noOfLines={1}>
                {file.fileName}
              </Text>
              <HStack spacing={2} fontSize="xs" color={useSemanticToken('text.secondary')}>
                <Text>{formatFileSize(file.fileSize)}</Text>
                <Text>•</Text>
                <Text>{file.chunkCount} chunks</Text>
                <Text>•</Text>
                <Text>{formatDate(file.uploadedAt)}</Text>
              </HStack>
            </VStack>
          </HStack>

          <HStack spacing={2}>
            {file.vectorized ? (
              <Badge colorScheme="green" display="flex" alignItems="center" gap={1}>
                ✓ Vectorized
              </Badge>
            ) : (
              <Badge colorScheme="yellow" display="flex" alignItems="center" gap={1}>
                <Spinner size="xs" />
                Processing
              </Badge>
            )}

            <IconButton
              aria-label="Delete file"
              icon={<FiTrash2 />}
              size="sm"
              variant="ghost"
              colorScheme="red"
              opacity={showActions ? 1 : 0}
              transition="opacity 0.2s"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(file.id);
              }}
            />
          </HStack>
        </HStack>
      </Box>
    );
  }

  // Grid view
  return (
    <Box
      p={4}
      border="1px solid"
      borderColor={useSemanticToken('border.default')}
      borderRadius="md"
      bg={useSemanticToken('surface.elevated')}
      cursor="pointer"
      transition="all 0.2s"
      _hover={{ borderColor: 'blue.400', shadow: 'lg' }}
      onClick={handleCardClick}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <HStack justify="space-between" mb={3}>
        <Text fontSize="5xl">{getFileIcon(file.fileType)}</Text>

        <IconButton
          aria-label="Delete file"
          icon={<FiTrash2 />}
          size="sm"
          variant="ghost"
          colorScheme="red"
          opacity={showActions ? 1 : 0}
          transition="opacity 0.2s"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(file.id);
          }}
        />
      </HStack>

      <VStack align="start" spacing={2}>
        <Text fontWeight="semibold" fontSize="sm" noOfLines={1} title={file.fileName}>
          {file.fileName}
        </Text>

        <VStack align="start" spacing={1} fontSize="xs" color={useSemanticToken('text.secondary')}>
          <HStack spacing={1}>
            <Text fontWeight="medium">{getFileExtension(file.fileName)}</Text>
            <Text>•</Text>
            <Text>{formatFileSize(file.fileSize)}</Text>
          </HStack>

          {file.vectorized && file.chunkCount && (
            <HStack spacing={1} color="green.600">
              <Text>✓</Text>
              <Text>{file.chunkCount} chunks</Text>
            </HStack>
          )}

          {!file.vectorized && (
            <HStack spacing={1} color="yellow.600">
              <Spinner size="xs" />
              <Text>Processing...</Text>
            </HStack>
          )}
        </VStack>

        <Box pt={2} borderTop="1px solid" borderColor={useSemanticToken('border.subtle')} w="full">
          <Text fontSize="xs" color={useSemanticToken('text.tertiary')}>
            {formatDate(file.uploadedAt)}
          </Text>
        </Box>
      </VStack>
    </Box>
  );
}
