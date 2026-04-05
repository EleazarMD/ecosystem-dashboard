import React, { useState } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  IconButton,
  Select,
  Switch,
  FormControl,
  FormLabel,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Divider,
  Badge,
  Tooltip,
  Input,
  Collapse,
  useDisclosure,
} from '@chakra-ui/react';
import {
  FiDownload,
  FiShare2,
  FiCopy,
  FiClock,
  FiBookmark,
  FiRepeat,
  FiChevronDown,
  FiChevronRight,
  FiFileText,
} from 'react-icons/fi';

interface PodcastControlPanelProps {
  episode: {
    id?: string;
    projectTitle?: string;
    title?: string;
    duration?: number;
    durationFormatted?: string;
    format?: string;
    fileSize?: number;
    fileSizeFormatted?: string;
    language?: string;
    ttsProvider?: string;
    createdAt?: string;
    createdAtFormatted?: string;
    filePath?: string;
    audioUrl?: string;
  } | null;
  playbackSpeed: number;
  onPlaybackSpeedChange: (speed: number) => void;
  onSkip: (seconds: number) => void;
  transcriptSettings: {
    fontSize: 'sm' | 'md' | 'lg';
    autoScroll: boolean;
    showTimestamps: boolean;
  };
  onTranscriptSettingsChange: (settings: any) => void;
}

export default function PodcastControlPanel({
  episode,
  playbackSpeed,
  onPlaybackSpeedChange,
  onSkip,
  transcriptSettings,
  onTranscriptSettingsChange,
}: PodcastControlPanelProps) {
  const [jumpTime, setJumpTime] = useState('');
  const [bookmarks, setBookmarks] = useState<{ time: number; label: string }[]>([]);
  const { isOpen: isAdvancedOpen, onToggle: toggleAdvanced } = useDisclosure();

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');

  const handleDownloadAudio = () => {
    if (!episode || !episode.filePath) return;
    const link = document.createElement('a');
    link.href = episode.filePath;
    link.download = `podcast-${episode.id || 'episode'}.${episode.format || 'wav'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadTranscript = (format: 'txt' | 'srt' | 'json') => {
    // This will be implemented to fetch and download transcript
    console.log(`Downloading transcript as ${format}`);
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/podcast-studio?episode=${episode?.id}`;
    navigator.clipboard.writeText(url);
  };

  const handleAddBookmark = () => {
    const currentTime = 0; // This should come from audio player
    setBookmarks([...bookmarks, { time: currentTime, label: `Bookmark ${bookmarks.length + 1}` }]);
  };

  const handleJumpToTime = () => {
    const [mins, secs] = jumpTime.split(':').map(Number);
    const totalSeconds = (mins || 0) * 60 + (secs || 0);
    console.log(`Jumping to ${totalSeconds}s`);
    setJumpTime('');
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Always show the panel, just with limited info when no episode
  const hasEpisode = episode !== null;
  
  console.log('🎛️ PodcastControlPanel rendering:', { hasEpisode, episode, playbackSpeed, transcriptSettings });

  const isSpanish = episode?.language === 'spanish';

  return (
    <VStack
      spacing={3}
      align="stretch"
      p={3}
      bg={bgColor}
      h="full"
      overflowY="auto"
    >
      {/* Episode Info - Compact */}
      <Box>
        <HStack justify="space-between" mb={2}>
          <Text fontSize="sm" fontWeight="600" color={textColor}>
            🎙️ Podcast Controls
          </Text>
          {hasEpisode && (
            <Badge colorScheme="green" fontSize="9px">READY</Badge>
          )}
        </HStack>
        {hasEpisode ? (
          <Box p={2} bg={useSemanticToken('surface.base')} borderRadius="md">
            <VStack align="stretch" spacing={1}>
              {/* Title row */}
              <HStack justify="space-between">
                <Text fontSize="11px" fontWeight="600" color={textColor} noOfLines={1} flex={1}>
                  {episode.title || episode.projectTitle || 'Podcast'}
                </Text>
                {isSpanish && <Text fontSize="10px">🇪🇸</Text>}
              </HStack>
              {/* Metadata row */}
              <HStack spacing={2} fontSize="10px" color={mutedColor} flexWrap="wrap">
                <Text>{episode.durationFormatted || formatDuration(episode.duration || 0)}</Text>
                <Text>•</Text>
                <Badge colorScheme="gray" fontSize="8px" variant="subtle">
                  {(episode.format || 'WAV').toUpperCase()}
                </Badge>
                {episode.fileSizeFormatted && (
                  <>
                    <Text>•</Text>
                    <Text>{episode.fileSizeFormatted}</Text>
                  </>
                )}
              </HStack>
            </VStack>
          </Box>
        ) : (
          <Box p={2} bg={useSemanticToken('surface.base')} borderRadius="md" textAlign="center">
            <Text fontSize="10px" color={mutedColor}>No episode selected</Text>
          </Box>
        )}
      </Box>

      <Divider />

      {/* Playback Controls - Compact */}
      <Box>
        <Text fontSize="xs" fontWeight="600" color={textColor} mb={2}>
          ⚙️ Playback
        </Text>
        
        <HStack spacing={2} mb={2}>
          <FormControl flex={1}>
            <FormLabel fontSize="9px" color={mutedColor} mb={1}>Speed</FormLabel>
            <Select
              size="xs"
              value={playbackSpeed}
              onChange={(e) => onPlaybackSpeedChange(parseFloat(e.target.value))}
            >
              <option value="0.75">0.75x</option>
              <option value="1">1.0x</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2.0x</option>
            </Select>
          </FormControl>
        </HStack>

        <HStack spacing={1}>
          <Button size="xs" onClick={() => onSkip(-30)} flex={1} variant="outline">-30s</Button>
          <Button size="xs" onClick={() => onSkip(-10)} flex={1} variant="outline">-10s</Button>
          <Button size="xs" onClick={() => onSkip(10)} flex={1} variant="outline">+10s</Button>
          <Button size="xs" onClick={() => onSkip(30)} flex={1} variant="outline">+30s</Button>
        </HStack>
      </Box>

      <Divider />

      {/* Transcript Settings - Compact */}
      <Box>
        <Text fontSize="xs" fontWeight="600" color={textColor} mb={2}>
          📝 Transcript
        </Text>

        <FormControl mb={2}>
          <FormLabel fontSize="9px" color={mutedColor} mb={1}>Font Size</FormLabel>
          <Select
            size="xs"
            value={transcriptSettings.fontSize}
            onChange={(e) =>
              onTranscriptSettingsChange({
                ...transcriptSettings,
                fontSize: e.target.value,
              })
            }
          >
            <option value="sm">Small</option>
            <option value="md">Medium</option>
            <option value="lg">Large</option>
          </Select>
        </FormControl>

        <VStack align="stretch" spacing={1}>
          <HStack justify="space-between">
            <Text fontSize="10px" color={mutedColor}>Auto-scroll</Text>
            <Switch
              size="sm"
              isChecked={transcriptSettings.autoScroll}
              onChange={(e) =>
                onTranscriptSettingsChange({
                  ...transcriptSettings,
                  autoScroll: e.target.checked,
                })
              }
            />
          </HStack>
          <HStack justify="space-between">
            <Text fontSize="10px" color={mutedColor}>Show timestamps</Text>
            <Switch
              size="sm"
              isChecked={transcriptSettings.showTimestamps}
              onChange={(e) =>
                onTranscriptSettingsChange({
                  ...transcriptSettings,
                  showTimestamps: e.target.checked,
                })
              }
            />
          </HStack>
        </VStack>
      </Box>

      <Divider />

      {/* Export - Compact inline buttons */}
      <Box>
        <Text fontSize="xs" fontWeight="600" color={textColor} mb={2}>
          📤 Export
        </Text>

        <VStack spacing={1}>
          <HStack w="full" spacing={1}>
            <Tooltip label="Download Audio">
              <Button
                size="xs"
                flex={1}
                leftIcon={<FiDownload />}
                onClick={handleDownloadAudio}
                variant="outline"
              >
                Audio
              </Button>
            </Tooltip>
            <Tooltip label="Download Transcript">
              <Button
                size="xs"
                flex={1}
                leftIcon={<FiFileText />}
                onClick={() => handleDownloadTranscript('txt')}
                variant="outline"
              >
                Transcript
              </Button>
            </Tooltip>
          </HStack>
          <Button
            size="xs"
            w="full"
            leftIcon={<FiCopy />}
            onClick={handleCopyLink}
            variant="ghost"
          >
            Copy Link
          </Button>
        </VStack>
      </Box>

      <Divider />

      {/* Advanced Features - Collapsed by default */}
      <Box>
        <HStack
          justify="space-between"
          cursor="pointer"
          onClick={toggleAdvanced}
          py={1}
        >
          <Text fontSize="xs" fontWeight="600" color={textColor}>
            ⚡ Advanced
          </Text>
          <IconButton
            aria-label="Toggle advanced"
            icon={isAdvancedOpen ? <FiChevronDown /> : <FiChevronRight />}
            size="xs"
            variant="ghost"
          />
        </HStack>

        <Collapse in={isAdvancedOpen}>
          <VStack spacing={2} align="stretch" pt={2}>
            {/* Jump to Time */}
            <FormControl>
              <FormLabel fontSize="9px" color={mutedColor} mb={1}>Jump to Time</FormLabel>
              <HStack>
                <Input
                  size="xs"
                  placeholder="MM:SS"
                  value={jumpTime}
                  onChange={(e) => setJumpTime(e.target.value)}
                />
                <Button size="xs" onClick={handleJumpToTime}>Go</Button>
              </HStack>
            </FormControl>

            {/* Bookmarks */}
            <FormControl>
              <FormLabel fontSize="9px" color={mutedColor} mb={1}>Bookmarks</FormLabel>
              <Button
                size="xs"
                w="full"
                leftIcon={<FiBookmark />}
                onClick={handleAddBookmark}
                variant="outline"
              >
                Add Bookmark
              </Button>
              {bookmarks.length > 0 && (
                <VStack align="stretch" mt={1} spacing={1}>
                  {bookmarks.map((bookmark, idx) => (
                    <HStack
                      key={idx}
                      p={1}
                      bg={useSemanticToken('surface.base')}
                      borderRadius="md"
                      fontSize="9px"
                    >
                      <FiBookmark size={10} />
                      <Text flex={1}>{bookmark.label}</Text>
                      <Text color={mutedColor}>{formatDuration(bookmark.time)}</Text>
                    </HStack>
                  ))}
                </VStack>
              )}
            </FormControl>
          </VStack>
        </Collapse>
      </Box>
    </VStack>
  );
}
