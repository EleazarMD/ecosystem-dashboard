import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  IconButton,
  Tooltip,
  useToast,
  Collapse,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
  Checkbox,
} from '@chakra-ui/react';
import { FiCheck, FiTrash2, FiClock, FiFileText, FiStar, FiMic, FiChevronDown, FiChevronRight } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

type ScriptLength = 'executive' | 'essential' | 'comprehensive' | 'deep-dive';

interface GenerationParams {
  preset?: {
    tone?: string;
    style?: string;
    length?: string;
    audience?: string;
    emphasis?: string;
    participants?: Array<{ role: string; personality: string; gender?: string; name?: string }>;
    podcastFormat?: string;
    podcastStyle?: string;
    includeStories?: boolean;
    disfluencyLevel?: string;
    includeEmphasis?: boolean;
    includeExamples?: boolean;
    participantCount?: number;
    emotionalIntensity?: string;
    includeProsodyMarkers?: boolean;
    interruptionFrequency?: string;
  };
  speakers?: string[];
  language?: string;
  stagesCompleted?: number;
  productionConfig?: {
    writerModel?: string;
    directorModel?: string;
    producerModel?: string;
    targetDuration?: number;
    productionQuality?: string;
    enableDirectorNotes?: boolean;
    enableVoiceDirection?: boolean;
  };
}

interface ScriptVersion {
  id: string;
  project_id: string;
  script_length: ScriptLength;
  version: number;
  title?: string;
  content: string;
  word_count?: number;
  estimated_duration_seconds?: number;
  status: 'generated' | 'edited' | 'approved' | 'rejected';
  is_current: boolean;
  created_at: string;
  ai_model?: string;
  ai_provider?: string;
  generation_params?: GenerationParams;
}

interface ScriptVersionManagerProps {
  projectId: string;
  onScriptSelect?: (script: ScriptVersion) => void;
  selectedScriptId?: string | null; // Track which script is selected for audio
  onSelectForAudio?: (script: ScriptVersion) => void; // New: Select script for audio generation
  showAudioControls?: boolean; // Show "Select for Audio" buttons
  refreshTrigger?: number; // External trigger to refresh versions list
  onBatchDelete?: (ids: string[]) => void; // Batch delete callback
  onScriptDeleted?: (scriptId: string) => void; // Notify parent when a script is deleted
}

export default function ScriptVersionManager({ projectId, onScriptSelect, selectedScriptId, onSelectForAudio, showAudioControls, refreshTrigger, onBatchDelete, onScriptDeleted }: ScriptVersionManagerProps) {
  // All scripts grouped by length
  const [allScripts, setAllScripts] = useState<Record<ScriptLength, ScriptVersion[]>>({
    executive: [],
    essential: [],
    comprehensive: [],
    'deep-dive': [],
  });
  const [expandedCategories, setExpandedCategories] = useState<Record<ScriptLength, boolean>>({
    executive: true,
    essential: true,
    comprehensive: true,
    'deep-dive': true,
  });
  const [loading, setLoading] = useState(false);
  const [deleteScriptId, setDeleteScriptId] = useState<string | null>(null);
  const [hasAutoLoaded, setHasAutoLoaded] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<Set<string>>(new Set());
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const toast = useToast();
  
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.tertiary');
  const cardBg = useSemanticToken('surface.base');
  const surfaceHover = useSemanticToken('surface.hover');

  const lengthColors: Record<ScriptLength, string> = {
    executive: 'orange',
    essential: 'green',
    comprehensive: 'blue',
    'deep-dive': 'purple',
  };

  const lengthLabels: Record<ScriptLength, string> = {
    executive: '🎯 Executive',
    essential: '⚡ Essential',
    comprehensive: '📝 Comprehensive',
    'deep-dive': '📚 Deep Dive',
  };

  const scriptLengths: ScriptLength[] = ['executive', 'essential', 'comprehensive', 'deep-dive'];

  // Fetch all scripts for all categories
  useEffect(() => {
    setHasAutoLoaded(false);
    fetchAllVersions();
  }, [projectId, refreshTrigger]);

  // Auto-load current version when scripts are first fetched
  useEffect(() => {
    if (!hasAutoLoaded && onScriptSelect) {
      // Find first current version across all categories
      for (const length of scriptLengths) {
        const currentVersion = allScripts[length].find(v => v.is_current);
        if (currentVersion) {
          console.log('📜 Auto-loading current script version:', currentVersion);
          onScriptSelect(currentVersion);
          setHasAutoLoaded(true);
          break;
        }
      }
    }
  }, [allScripts, hasAutoLoaded, onScriptSelect]);

  const fetchAllVersions = async () => {
    setLoading(true);
    try {
      console.log(`📂 Fetching all script versions for project ${projectId}`);
      
      const results: Record<ScriptLength, ScriptVersion[]> = {
        executive: [],
        essential: [],
        comprehensive: [],
        'deep-dive': [],
      };

      // Fetch all categories in parallel
      await Promise.all(
        scriptLengths.map(async (length) => {
          const response = await fetch(
            `/api/podcast-studio/script-versions?projectId=${projectId}&scriptLength=${length}`
          );
          if (response.ok) {
            const data = await response.json();
            results[length] = data;
          }
        })
      );

      const totalCount = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);
      console.log(`✅ Found ${totalCount} total scripts across all categories`);
      setAllScripts(results);
    } catch (error) {
      console.error('Failed to fetch versions:', error);
      toast({
        title: 'Failed to load versions',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (length: ScriptLength) => {
    setExpandedCategories(prev => ({
      ...prev,
      [length]: !prev[length],
    }));
  };

  const handleSetCurrent = async (scriptId: string) => {
    try {
      const response = await fetch('/api/podcast-studio/script-versions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptId,
          action: 'set-current',
        }),
      });

      if (response.ok) {
        toast({
          title: 'Version set as current',
          status: 'success',
          duration: 2000,
        });
        fetchAllVersions();
      }
    } catch (error) {
      toast({
        title: 'Failed to set current version',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteScriptId) return;

    try {
      const response = await fetch(
        `/api/podcast-studio/script-versions?scriptId=${deleteScriptId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        toast({
          title: 'Version deleted',
          status: 'success',
          duration: 2000,
        });
        onScriptDeleted?.(deleteScriptId);
        fetchAllVersions();
      } else {
        const error = await response.json();
        toast({
          title: 'Cannot delete version',
          description: error.error,
          status: 'error',
          duration: 4000,
        });
      }
    } catch (error) {
      toast({
        title: 'Failed to delete version',
        status: 'error',
        duration: 3000,
      });
    } finally {
      onClose();
      setDeleteScriptId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const totalScripts = Object.values(allScripts).reduce((sum, arr) => sum + arr.length, 0);

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
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const batchDeleteCancelRef = React.useRef<HTMLButtonElement>(null);

  const handleBatchDelete = () => {
    if (selectedForDelete.size > 0 && onBatchDelete) {
      setShowBatchDeleteConfirm(true);
    }
  };

  const confirmBatchDelete = () => {
    if (selectedForDelete.size > 0 && onBatchDelete) {
      console.log(`🗑️ Confirming delete of ${selectedForDelete.size} scripts:`, Array.from(selectedForDelete));
      onBatchDelete(Array.from(selectedForDelete));
      setSelectedForDelete(new Set());
    }
    setShowBatchDeleteConfirm(false);
  };

  // Render a single script item
  const renderScriptItem = (version: ScriptVersion) => {
    const isSelectedForAudio = selectedScriptId === version.id;
    const isSelected = selectedScriptId === version.id;
    const isCheckedForDelete = selectedForDelete.has(version.id);
    
    return (
      <Box
        key={version.id}
        px={3}
        py={2}
        ml={4}
        bg={isCheckedForDelete ? 'red.50' : isSelected ? surfaceHover : 'transparent'}
        borderRadius="md"
        borderLeft="2px solid"
        borderLeftColor={isCheckedForDelete ? 'red.500' : isSelectedForAudio ? 'green.500' : version.is_current ? 'blue.500' : borderColor}
        cursor="pointer"
        _hover={{ bg: isCheckedForDelete ? 'red.100' : surfaceHover }}
        onClick={() => onScriptSelect?.(version)}
        transition="all 0.15s"
      >
        <HStack justify="space-between" spacing={2}>
          <HStack spacing={2} flex={1} minW={0}>
            {onBatchDelete && (
              <Checkbox
                size="sm"
                isChecked={isCheckedForDelete}
                onChange={(e) => {
                  e.stopPropagation();
                  toggleSelectForDelete(version.id);
                }}
                onClick={(e) => e.stopPropagation()}
                colorScheme="red"
              />
            )}
            {version.is_current && (
              <Tooltip label="Current version">
                <Box flexShrink={0}>
                  <FiStar color="gold" size={12} />
                </Box>
              </Tooltip>
            )}
            {isSelectedForAudio && (
              <Badge colorScheme="green" fontSize="8px" flexShrink={0}>
                🎵
              </Badge>
            )}
            <Text fontSize="xs" fontWeight="500" color={textColor} noOfLines={1}>
              v{version.version}
            </Text>
            <Text fontSize="xs" color={mutedColor} noOfLines={1}>
              {version.word_count || 0}w • {formatDuration(version.estimated_duration_seconds)}
            </Text>
          </HStack>
          <HStack spacing={1} flexShrink={0}>
            {showAudioControls && (
              <Tooltip label={isSelectedForAudio ? 'Selected for Audio' : 'Select for Audio'}>
                <IconButton
                  aria-label="Select for audio"
                  icon={isSelectedForAudio ? <FiCheck /> : <FiMic />}
                  size="xs"
                  variant={isSelectedForAudio ? 'solid' : 'ghost'}
                  colorScheme={isSelectedForAudio ? 'green' : 'gray'}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectForAudio?.(version);
                  }}
                />
              </Tooltip>
            )}
            <Tooltip label="Delete">
              <IconButton
                aria-label="Delete"
                icon={<FiTrash2 />}
                size="xs"
                variant="ghost"
                colorScheme="red"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteScriptId(version.id);
                  onOpen();
                }}
              />
            </Tooltip>
          </HStack>
        </HStack>
        {/* Script metadata badges */}
        <HStack spacing={1} mt={1} flexWrap="wrap">
          {version.generation_params?.preset?.podcastStyle && (
            <Badge colorScheme="purple" fontSize="7px" px={1} variant="subtle">
              {version.generation_params.preset.podcastStyle}
            </Badge>
          )}
          {version.generation_params?.language && (
            <Badge colorScheme="teal" fontSize="7px" px={1} variant="subtle">
              {version.generation_params.language}
            </Badge>
          )}
          {version.generation_params?.preset?.audience && version.generation_params.preset.audience !== 'general' && version.generation_params.preset.audience !== 'general audience' && (
            <Badge colorScheme="orange" fontSize="7px" px={1} variant="subtle">
              {version.generation_params.preset.audience}
            </Badge>
          )}
          {version.ai_model && (
            <Badge colorScheme="gray" fontSize="7px" px={1} variant="outline">
              {version.ai_model.replace('gemini-', '').replace('-preview', '').substring(0, 12)}
            </Badge>
          )}
          {version.generation_params?.stagesCompleted && (
            <Badge colorScheme="blue" fontSize="7px" px={1} variant="outline">
              {version.generation_params.stagesCompleted}-stage
            </Badge>
          )}
        </HStack>
      </Box>
    );
  };

  return (
    <Box p={3}>
      <VStack align="stretch" spacing={3}>
        {/* Header */}
        <HStack justify="space-between" px={1}>
          <HStack spacing={2}>
            <FiFileText size={14} />
            <Text fontSize="sm" fontWeight="600" color={textColor}>
              Script Versions
            </Text>
          </HStack>
          <HStack spacing={2}>
            {selectedForDelete.size > 0 && onBatchDelete && (
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
            <Badge colorScheme="blue" fontSize="xs">{totalScripts}</Badge>
          </HStack>
        </HStack>

        {/* Loading State */}
        {loading ? (
          <Text fontSize="xs" color={mutedColor} textAlign="center" py={4}>
            Loading scripts...
          </Text>
        ) : totalScripts === 0 ? (
          <Box
            p={3}
            bg={cardBg}
            borderRadius="md"
            border="1px dashed"
            borderColor={borderColor}
            textAlign="center"
          >
            <Text fontSize="xs" color={mutedColor}>
              No scripts generated yet
            </Text>
            <Text fontSize="xs" color={mutedColor} mt={1}>
              💡 Generate multiple versions to compare
            </Text>
          </Box>
        ) : (
          /* Hierarchical Category List */
          <VStack align="stretch" spacing={1}>
            {scriptLengths.map((length) => {
              const scripts = allScripts[length];
              const hasScripts = scripts.length > 0;
              const isExpanded = expandedCategories[length];
              
              return (
                <Box key={length}>
                  {/* Category Header */}
                  <HStack
                    px={2}
                    py={1.5}
                    bg={hasScripts ? cardBg : 'transparent'}
                    borderRadius="md"
                    cursor={hasScripts ? 'pointer' : 'default'}
                    opacity={hasScripts ? 1 : 0.5}
                    onClick={() => hasScripts && toggleCategory(length)}
                    _hover={hasScripts ? { bg: surfaceHover } : {}}
                    transition="all 0.15s"
                  >
                    <Box color={mutedColor} w={4}>
                      {hasScripts && (isExpanded ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />)}
                    </Box>
                    <Badge 
                      colorScheme={lengthColors[length]} 
                      fontSize="9px"
                      variant="subtle"
                    >
                      {lengthLabels[length]}
                    </Badge>
                    <Text fontSize="xs" color={mutedColor} ml="auto">
                      {scripts.length} {scripts.length === 1 ? 'script' : 'scripts'}
                    </Text>
                  </HStack>

                  {/* Scripts under this category */}
                  <Collapse in={isExpanded && hasScripts} animateOpacity>
                    <VStack align="stretch" spacing={1} mt={1} mb={2}>
                      {scripts.map(renderScriptItem)}
                    </VStack>
                  </Collapse>
                </Box>
              );
            })}
          </VStack>
        )}
      </VStack>

      {/* Delete Confirmation Dialog */}
      {/* Single delete confirmation */}
      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Script Version
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure? This version will be permanently deleted.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleDelete} ml={3}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* Batch delete confirmation */}
      <AlertDialog
        isOpen={showBatchDeleteConfirm}
        leastDestructiveRef={batchDeleteCancelRef}
        onClose={() => setShowBatchDeleteConfirm(false)}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete {selectedForDelete.size} Script{selectedForDelete.size > 1 ? 's' : ''}
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete {selectedForDelete.size} script version{selectedForDelete.size > 1 ? 's' : ''}? 
              This cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={batchDeleteCancelRef} onClick={() => setShowBatchDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={confirmBatchDelete} ml={3}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}
