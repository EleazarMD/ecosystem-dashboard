import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  IconButton,
  Tooltip,
  Spinner,
  Checkbox,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Button,
  useDisclosure,
} from '@chakra-ui/react';
import { FiPlay, FiClock, FiMusic, FiDownload, FiTrash2, FiAlertTriangle } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface PodcastEpisode {
  id: string;
  projectId: string;
  scriptId?: string | null;
  filePath?: string;
  audioUrl?: string;
  duration: number;
  durationFormatted?: string;
  format: string;
  fileSize?: number;
  fileSizeFormatted?: string;
  provider?: string;
  ttsProvider?: string;
  ttsModel?: string;
  status: string;
  language?: string;
  voices?: string[];
  speakers?: string[];
  createdAt: string;
  createdAtFormatted?: string;
  projectTitle?: string;
  title?: string;
  subtitle?: string;
  excerpt?: string;
}

interface PodcastLibraryProps {
  projectId?: string;
  onEpisodeSelect: (episode: PodcastEpisode) => void;
  selectedEpisodeId?: string | null;
  refreshTrigger?: number; // Increment to trigger refresh
  onBatchDelete?: (ids: string[]) => void; // Batch delete callback
}

export default function PodcastLibrary({ projectId, onEpisodeSelect, selectedEpisodeId, refreshTrigger, onBatchDelete }: PodcastLibraryProps) {
  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedForDelete, setSelectedForDelete] = useState<Set<string>>(new Set());
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  const bgColor = useSemanticToken('surface.elevated');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const hoverBg = useSemanticToken('surface.hover');
  const selectedBg = useSemanticToken('surface.highlight');
  const borderColor = useSemanticToken('border.default');

  useEffect(() => {
    fetchEpisodes();
  }, [projectId, refreshTrigger]);

  const fetchEpisodes = async () => {
    try {
      setLoading(true);
      const url = projectId
        ? `/api/podcast-studio/episodes?projectId=${projectId}`
        : `/api/podcast-studio/episodes`;

      console.log('🎵 Fetching episodes from:', url);
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Episodes API error:', response.status, errorData);
        throw new Error(errorData.message || `Failed to fetch episodes (${response.status})`);
      }

      const data = await response.json();
      console.log('✅ Episodes fetched:', data.episodes?.length || 0);
      setEpisodes(data.episodes || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch episodes:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleDownload = (episode: PodcastEpisode, e: React.MouseEvent) => {
    e.stopPropagation();

    // Create a temporary anchor element to trigger download
    const link = document.createElement('a');
    link.href = episode.audioUrl || episode.filePath || '';
    link.download = `${episode.projectTitle || 'podcast'}.${episode.format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log(`📥 Downloading: ${episode.projectTitle}.${episode.format}`);
  };

  // Toggle selection for batch delete
  const toggleSelectForDelete = (id: string) => {
    setSelectedForDelete(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Handle batch delete with confirmation
  const handleBatchDelete = () => {
    if (selectedForDelete.size > 0 && onBatchDelete) {
      onOpen(); // Open confirmation dialog
    }
  };

  const confirmBatchDelete = () => {
    if (selectedForDelete.size > 0 && onBatchDelete) {
      console.log(`🗑️ Confirming delete of ${selectedForDelete.size} podcasts:`, Array.from(selectedForDelete));
      onBatchDelete(Array.from(selectedForDelete));
      setSelectedForDelete(new Set());
    }
    onClose();
  };

  if (loading) {
    return (
      <VStack h="full" justify="center" align="center" spacing={3}>
        <Spinner size="lg" color="blue.500" />
        <Text fontSize="sm" color={mutedColor}>Loading podcasts...</Text>
      </VStack>
    );
  }

  if (error) {
    return (
      <VStack h="full" justify="center" align="center" spacing={3} p={4}>
        <Text fontSize="sm" color="red.500">Failed to load podcasts</Text>
        <Text fontSize="xs" color={mutedColor}>{error}</Text>
      </VStack>
    );
  }

  if (episodes.length === 0) {
    return (
      <VStack h="full" justify="center" align="center" spacing={3} p={4}>
        <Box fontSize="48px">🎧</Box>
        <Text fontSize="sm" fontWeight="600" color={textColor}>No Podcasts Yet</Text>
        <Text fontSize="xs" color={mutedColor} textAlign="center">
          Generate audio from your scripts to see them here
        </Text>
      </VStack>
    );
  }

  return (
    <VStack spacing={2} align="stretch" p={3}>
      {/* Batch delete header */}
      {onBatchDelete && episodes.length > 0 && (
        <HStack justify="space-between" px={1} py={2}>
          <Text fontSize="xs" color={mutedColor}>
            {selectedForDelete.size > 0 ? `${selectedForDelete.size} selected` : `${episodes.length} podcasts`}
          </Text>
          {selectedForDelete.size > 0 && (
            <Tooltip label={`Delete ${selectedForDelete.size} selected`}>
              <IconButton
                aria-label="Delete selected"
                icon={<FiTrash2 />}
                size="xs"
                colorScheme="red"
                variant="solid"
                onClick={handleBatchDelete}
              />
            </Tooltip>
          )}
        </HStack>
      )}
      
      {episodes.map((episode) => {
        const isSelected = selectedEpisodeId === episode.id;
        const isCheckedForDelete = selectedForDelete.has(episode.id);
        const isSpanish = episode.language === 'spanish';
        const isFailed = episode.status === 'failed';

        return (
          <Box
            key={episode.id}
            p={2}
            bg={isCheckedForDelete ? 'red.50' : isFailed ? 'transparent' : isSelected ? selectedBg : bgColor}
            borderRadius="md"
            borderWidth="1px"
            borderColor={isCheckedForDelete ? 'red.400' : isFailed ? 'red.600' : isSelected ? 'blue.400' : borderColor}
            cursor={isFailed ? 'default' : 'pointer'}
            transition="all 0.2s"
            opacity={isFailed ? 0.6 : 1}
            _hover={{ bg: isFailed ? 'transparent' : isCheckedForDelete ? 'red.100' : isSelected ? selectedBg : hoverBg }}
            onClick={() => !isFailed && onEpisodeSelect(episode)}
          >
            <HStack spacing={2} align="center">
              {/* Checkbox for batch delete */}
              {onBatchDelete && (
                <Checkbox
                  size="sm"
                  isChecked={isCheckedForDelete}
                  onChange={(e) => {
                    e.stopPropagation();
                    toggleSelectForDelete(episode.id);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  colorScheme="red"
                />
              )}
              
              {/* Play button or failure icon */}
              {isFailed ? (
                <Tooltip label={episode.errorDetails ? `Failed: ${episode.errorDetails}` : 'Generation failed'} fontSize="xs">
                  <IconButton
                    aria-label="Failed"
                    icon={<FiAlertTriangle />}
                    size="xs"
                    colorScheme="red"
                    variant="outline"
                    borderRadius="full"
                    isDisabled
                  />
                </Tooltip>
              ) : (
                <IconButton
                  aria-label="Play episode"
                  icon={<FiPlay />}
                  size="xs"
                  colorScheme="green"
                  variant={isSelected ? 'solid' : 'outline'}
                  borderRadius="full"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEpisodeSelect(episode);
                  }}
                />
              )}
              
              {/* Episode info */}
              <VStack align="start" spacing={0} flex="1" minW={0}>
                <HStack spacing={1} w="full">
                  <Text
                    fontSize="11px"
                    fontWeight="600"
                    color={isFailed ? 'red.400' : textColor}
                    noOfLines={1}
                    flex="1"
                  >
                    {isFailed ? 'Generation Failed' : (episode.title || episode.projectTitle || 'Untitled Podcast')}
                  </Text>
                  {isFailed && (
                    <Badge colorScheme="red" fontSize="8px" px={1}>Failed</Badge>
                  )}
                  {isSpanish && !isFailed && (
                    <Badge colorScheme="green" fontSize="8px" px={1}>🇪🇸</Badge>
                  )}
                </HStack>
                <HStack spacing={1} fontSize="9px" color={mutedColor} flexWrap="wrap">
                  {isFailed ? (
                    <Text>{episode.ttsProvider || 'unknown'} TTS • {episode.createdAtFormatted || formatDate(episode.createdAt)}</Text>
                  ) : (
                    <>
                      <HStack spacing={0.5}>
                        <FiClock size={10} />
                        <Text>{episode.durationFormatted || formatDuration(episode.duration)}</Text>
                      </HStack>
                      {episode.fileSizeFormatted && (
                        <>
                          <Text>•</Text>
                          <Text>{episode.fileSizeFormatted}</Text>
                        </>
                      )}
                      <Text>•</Text>
                      <Text>{episode.createdAtFormatted || formatDate(episode.createdAt)}</Text>
                    </>
                  )}
                </HStack>
              </VStack>
              
              {/* Download & format (only for successful episodes) */}
              {!isFailed && (
                <HStack spacing={1}>
                  <Tooltip label={`Download ${episode.format.toUpperCase()}`} fontSize="xs">
                    <IconButton
                      aria-label="Download"
                      icon={<FiDownload />}
                      size="xs"
                      variant="ghost"
                      onClick={(e) => handleDownload(episode, e)}
                    />
                  </Tooltip>
                  <Badge
                    colorScheme="gray"
                    fontSize="8px"
                    textTransform="uppercase"
                    variant="subtle"
                  >
                    {episode.format}
                  </Badge>
                </HStack>
              )}
            </HStack>
          </Box>
        );
      })}

      {/* Confirmation Dialog */}
      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete {selectedForDelete.size} Podcast{selectedForDelete.size > 1 ? 's' : ''}
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete {selectedForDelete.size} podcast{selectedForDelete.size > 1 ? 's' : ''}? 
              This will permanently remove the audio files and cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={confirmBatchDelete} ml={3}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </VStack>
  );
}
