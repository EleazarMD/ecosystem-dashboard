/**
 * Files Tab Content - For Right Panel
 * Displays workspace files in the existing right panel
 */

import { useState, useEffect } from 'react';
import {
  VStack,
  HStack,
  Input,
  InputGroup,
  InputLeftElement,
  IconButton,
  Text,
  Button,
  SimpleGrid,
  Spinner,
  Box,
  useToast,
  Tooltip,
} from '@chakra-ui/react';
import { FiSearch, FiGrid, FiList, FiUploadCloud } from 'react-icons/fi';
import FileCard from './FileCard';
import FileDetailModal from './FileDetailModal';
import FileUploadZone from './FileUploadZone';
import { FileMetadata } from '@/lib/workspace/file-upload-handler';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface FilesTabContentProps {
  workspaceId: string;
}

export function FilesTabContent({ workspaceId }: FilesTabContentProps) {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list'); // Default to list for narrow panel
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [showUploadZone, setShowUploadZone] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const toast = useToast();

  useEffect(() => {
    fetchFiles();
  }, [workspaceId, refreshTrigger]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/workspace-ai/files?workspaceId=${workspaceId}&limit=50`
      );

      if (!response.ok) throw new Error('Failed to load files');

      const data = await response.json();
      if (data.success) {
        setFiles(data.files || []);
      }
    } catch (err) {
      toast({
        title: 'Error loading files',
        description: err instanceof Error ? err.message : 'Failed to load files',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm('Delete this file? This cannot be undone.')) return;

    try {
      const response = await fetch(`/api/workspace-ai/files/${fileId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete');

      const data = await response.json();
      if (data.success) {
        setFiles(prev => prev.filter(f => f.id !== fileId));
        toast({
          title: 'File deleted',
          status: 'success',
          duration: 3000,
        });
      }
    } catch (err) {
      toast({
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Failed to delete',
        status: 'error',
        duration: 5000,
      });
    }
  };

  const handleUploadComplete = () => {
    setShowUploadZone(false);
    setRefreshTrigger(prev => prev + 1);
  };

  const filteredFiles = files.filter(file =>
    file.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Box h="full" display="flex" flexDirection="column">
      <VStack spacing={3} align="stretch" p={3} flex={1}>
        {/* Header */}
        <HStack justify="space-between">
          <Text fontSize="sm" fontWeight="600" color={useSemanticToken('text.secondary')}>
            {files.length} file{files.length !== 1 ? 's' : ''}
          </Text>
          <Tooltip label="Upload file">
            <IconButton
              aria-label="Upload file"
              icon={<FiUploadCloud />}
              size="sm"
              colorScheme="blue"
              onClick={() => setShowUploadZone(true)}
            />
          </Tooltip>
        </HStack>

        {/* Search and View Controls */}
        <HStack spacing={2}>
          <InputGroup size="sm" flex={1}>
            <InputLeftElement pointerEvents="none">
              <FiSearch color="gray" />
            </InputLeftElement>
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </InputGroup>

          <HStack spacing={0} border="1px solid" borderColor={useSemanticToken('border.default')} borderRadius="md">
            <IconButton
              aria-label="Grid view"
              icon={<FiGrid />}
              size="sm"
              variant={viewMode === 'grid' ? 'solid' : 'ghost'}
              colorScheme={viewMode === 'grid' ? 'gray' : undefined}
              onClick={() => setViewMode('grid')}
              borderRadius="md"
            />
            <IconButton
              aria-label="List view"
              icon={<FiList />}
              size="sm"
              variant={viewMode === 'list' ? 'solid' : 'ghost'}
              colorScheme={viewMode === 'list' ? 'gray' : undefined}
              onClick={() => setViewMode('list')}
              borderRadius="md"
            />
          </HStack>
        </HStack>

        {/* File List */}
        <Box flex={1} overflowY="auto">
          {loading ? (
            <VStack py={8}>
              <Spinner color="blue.500" />
              <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Loading files...</Text>
            </VStack>
          ) : files.length === 0 ? (
            <VStack py={8} spacing={3}>
              <Text fontSize="3xl">📄</Text>
              <Text fontSize="sm" fontWeight="medium">No files yet</Text>
              <Text fontSize="xs" color={useSemanticToken('text.secondary')} textAlign="center">
                Upload files to enable AI-powered search
              </Text>
              <Button
                leftIcon={<FiUploadCloud />}
                colorScheme="blue"
                size="sm"
                onClick={() => setShowUploadZone(true)}
              >
                Upload File
              </Button>
            </VStack>
          ) : filteredFiles.length === 0 ? (
            <VStack py={8}>
              <FiSearch size={24} color="var(--chakra-colors-gray-400)" />
              <Text fontSize="sm" color={useSemanticToken('text.secondary')}>No files match your search</Text>
            </VStack>
          ) : viewMode === 'grid' ? (
            <SimpleGrid columns={1} spacing={2}>
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
        </Box>
      </VStack>

      {/* Upload Modal */}
      {showUploadZone && (
        <FileUploadZone
          workspaceId={workspaceId}
          onComplete={handleUploadComplete}
          onClose={() => setShowUploadZone(false)}
        />
      )}

      {/* File Detail Modal */}
      {selectedFileId && (
        <FileDetailModal
          fileId={selectedFileId}
          workspaceId={workspaceId}
          onClose={() => setSelectedFileId(null)}
        />
      )}
    </Box>
  );
}
