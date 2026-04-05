/**
 * File List Component - Chakra UI Version
 * Displays workspace files in grid or list view with search and filters
 */

import { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Input,
  InputGroup,
  InputLeftElement,
  IconButton,
  Text,
  SimpleGrid,
  Spinner,
  Button,
  useToast,
} from '@chakra-ui/react';
import { FiSearch, FiGrid, FiList, FiAlertTriangle } from 'react-icons/fi';
import FileCard from './FileCard';
import FileDetailModal from './FileDetailModal';
import { FileMetadata } from '@/lib/workspace/file-upload-handler';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface FileListProps {
  workspaceId: string;
  refreshTrigger: number;
  onUploadClick: () => void;
}

export default function FileList({ workspaceId, refreshTrigger, onUploadClick }: FileListProps) {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    fetchFiles();
  }, [workspaceId, refreshTrigger]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/workspace-ai/files?workspaceId=${workspaceId}&limit=50`
      );

      if (!response.ok) {
        throw new Error('Failed to load files');
      }

      const data = await response.json();

      if (data.success) {
        setFiles(data.files || []);
      } else {
        throw new Error(data.error || 'Failed to load files');
      }
    } catch (err) {
      console.error('Error fetching files:', err);
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/workspace-ai/files/${fileId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete file');
      }

      const data = await response.json();

      if (data.success) {
        setFiles(prev => prev.filter(f => f.id !== fileId));
        toast({
          title: 'File deleted',
          status: 'success',
          duration: 3000,
        });
      } else {
        throw new Error(data.error || 'Failed to delete file');
      }
    } catch (err) {
      toast({
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Failed to delete file',
        status: 'error',
        duration: 5000,
      });
    }
  };

  const filteredFiles = files.filter(file =>
    file.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <Box textAlign="center" py={12}>
        <Spinner size="xl" color="blue.500" thickness="4px" />
        <Text mt={4} color={useSemanticToken('text.secondary')}>
          Loading files...
        </Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        p={8}
        border="1px solid"
        borderColor="red.200"
        borderRadius="md"
        bg="red.50"
        textAlign="center"
      >
        <FiAlertTriangle size={48} color="var(--chakra-colors-red-500)" style={{ margin: '0 auto' }} />
        <Text mt={4} fontWeight="medium" color="red.600">
          {error}
        </Text>
        <Button mt={4} onClick={fetchFiles} size="sm" variant="outline" colorScheme="red">
          Try Again
        </Button>
      </Box>
    );
  }

  if (files.length === 0) {
    return (
      <Box
        p={12}
        border="1px solid"
        borderColor={useSemanticToken('border.default')}
        borderRadius="md"
        bg={useSemanticToken('surface.elevated')}
        textAlign="center"
      >
        <Text fontSize="6xl" mb={4}>
          📁
        </Text>
        <Text fontSize="lg" fontWeight="semibold" mb={2}>
          No files yet
        </Text>
        <Text color={useSemanticToken('text.secondary')} mb={6}>
          Upload your first file to get started with AI-powered search
        </Text>
        <Button colorScheme="blue" onClick={onUploadClick}>
          Upload File
        </Button>
      </Box>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      {/* Search and Actions Bar */}
      <HStack spacing={4} justify="space-between">
        <InputGroup maxW="md">
          <InputLeftElement pointerEvents="none">
            <FiSearch color="gray" />
          </InputLeftElement>
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </InputGroup>

        <HStack spacing={1} border="1px solid" borderColor={useSemanticToken('border.default')} borderRadius="md" p={1}>
          <IconButton
            aria-label="Grid view"
            icon={<FiGrid />}
            size="sm"
            variant={viewMode === 'grid' ? 'solid' : 'ghost'}
            colorScheme={viewMode === 'grid' ? 'gray' : undefined}
            onClick={() => setViewMode('grid')}
          />
          <IconButton
            aria-label="List view"
            icon={<FiList />}
            size="sm"
            variant={viewMode === 'list' ? 'solid' : 'ghost'}
            colorScheme={viewMode === 'list' ? 'gray' : undefined}
            onClick={() => setViewMode('list')}
          />
        </HStack>
      </HStack>

      {/* File Count */}
      <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
        {filteredFiles.length} {filteredFiles.length === 1 ? 'file' : 'files'}
        {searchQuery && ` matching "${searchQuery}"`}
      </Text>

      {/* File Grid/List */}
      {filteredFiles.length === 0 ? (
        <Box
          p={12}
          border="1px solid"
          borderColor={useSemanticToken('border.default')}
          borderRadius="md"
          bg={useSemanticToken('surface.elevated')}
          textAlign="center"
        >
          <FiSearch size={48} color="var(--chakra-colors-gray-400)" style={{ margin: '0 auto' }} />
          <Text mt={4} color={useSemanticToken('text.secondary')}>
            No files match your search
          </Text>
        </Box>
      ) : viewMode === 'grid' ? (
        <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing={4}>
          {filteredFiles.map(file => (
            <FileCard
              key={file.id}
              file={file}
              onDelete={handleDelete}
              onClick={setSelectedFileId}
            />
          ))}
        </SimpleGrid>
      ) : (
        <VStack spacing={2} align="stretch">
          {filteredFiles.map(file => (
            <FileCard
              key={file.id}
              file={file}
              onDelete={handleDelete}
              onClick={setSelectedFileId}
              viewMode="list"
            />
          ))}
        </VStack>
      )}

      {/* File Detail Modal */}
      {selectedFileId && (
        <FileDetailModal
          fileId={selectedFileId}
          workspaceId={workspaceId}
          onClose={() => setSelectedFileId(null)}
        />
      )}
    </VStack>
  );
}
