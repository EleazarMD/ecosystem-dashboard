import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Divider,
  Tooltip,
  Button,
  IconButton,
  Textarea,
  Progress,
  Checkbox,
} from '@chakra-ui/react';
import { FiPlay, FiRefreshCw, FiChevronLeft, FiChevronRight, FiX, FiCheckSquare } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

type QualityTag = 'good' | 'glitchy' | 'wrong-voice' | 'mispronounced' | 'distorted' | null;

const QUALITY_TAGS: { key: Exclude<QualityTag, null>; emoji: string; color: string; tip: string }[] = [
  { key: 'good', emoji: '✅', color: 'green', tip: 'Good' },
  { key: 'glitchy', emoji: '⚠️', color: 'red', tip: 'Glitchy' },
  { key: 'wrong-voice', emoji: '🔀', color: 'orange', tip: 'Wrong voice' },
  { key: 'mispronounced', emoji: '🗣️', color: 'yellow', tip: 'Mispronounced' },
  { key: 'distorted', emoji: '💥', color: 'red', tip: 'Distorted' },
];

interface TranscriptSegment {
  speaker: string;
  content: string;
  startTime: number;
  endTime: number;
}

// Pending edit: auto-saved text changes that haven't been re-recorded yet
interface PendingEdit {
  text: string;
  savedAt: number; // timestamp
}

interface PlaybackReviewPanelProps {
  transcript?: TranscriptSegment[];
  qualityTags?: Record<number, QualityTag>;
  onQualityTagChange?: (index: number, tag: QualityTag) => void;
  onSeekToSegment?: (index: number) => void;
  activeSegmentIndex?: number;
  isPlaying?: boolean;
  ttsProvider?: string;
  ttsModel?: string;
  language?: string;
  speakers?: Array<{ name: string; gender?: string; voiceId?: string; voiceName?: string }>;
  episodeId?: string;
}

export default function PlaybackReviewPanel({
  transcript = [],
  qualityTags = {},
  onQualityTagChange,
  onSeekToSegment,
  activeSegmentIndex = -1,
  isPlaying = false,
  ttsProvider,
  ttsModel,
  language,
  speakers = [],
  episodeId,
}: PlaybackReviewPanelProps) {
  const borderColor = useSemanticToken('border.default');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const surfaceBase = useSemanticToken('surface.base');

  const [selectedTurnIndex, setSelectedTurnIndex] = useState<number>(0);
  const [editedText, setEditedText] = useState<string>('');
  const [turnNotes, setTurnNotes] = useState<Record<number, string>>({});
  const [isRerecording, setIsRerecording] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  // Multi-select for batch operations
  const [selectedTurns, setSelectedTurns] = useState<Set<number>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);

  // Pending edits: auto-saved when user types, discarded if not re-recorded
  const [pendingEdits, setPendingEdits] = useState<Record<number, PendingEdit>>({});
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync selected turn with active playback segment
  useEffect(() => {
    if (activeSegmentIndex >= 0 && activeSegmentIndex < transcript.length) {
      setSelectedTurnIndex(activeSegmentIndex);
    }
  }, [activeSegmentIndex, transcript.length]);

  // Load edited text from pending edits or original when switching turns
  useEffect(() => {
    if (transcript[selectedTurnIndex]) {
      const pending = pendingEdits[selectedTurnIndex];
      setEditedText(pending ? pending.text : transcript[selectedTurnIndex].content);
    }
  }, [selectedTurnIndex, transcript, pendingEdits]);

  // Auto-save edits to pendingEdits after 500ms debounce
  const handleTextChange = useCallback((text: string) => {
    setEditedText(text);
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      const original = transcript[selectedTurnIndex]?.content;
      if (text !== original && text.trim()) {
        setPendingEdits(prev => ({
          ...prev,
          [selectedTurnIndex]: { text, savedAt: Date.now() },
        }));
      } else {
        // Text matches original — clear pending edit
        setPendingEdits(prev => {
          const next = { ...prev };
          delete next[selectedTurnIndex];
          return next;
        });
      }
    }, 500);
  }, [selectedTurnIndex, transcript]);

  // Scroll nav strip to keep selected turn visible
  useEffect(() => {
    if (navRef.current) {
      const dot = navRef.current.querySelector(`[data-turn="${selectedTurnIndex}"]`);
      if (dot) {
        (dot as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [selectedTurnIndex]);

  const selectedTurn = transcript[selectedTurnIndex];
  const selectedTag = qualityTags[selectedTurnIndex];
  const hasPendingEdit = !!pendingEdits[selectedTurnIndex];

  const speakerInfo = useMemo(() => {
    if (!selectedTurn) return null;
    return speakers.find(s => s.name === selectedTurn.speaker) || { name: selectedTurn.speaker };
  }, [selectedTurn, speakers]);

  const stats = useMemo(() => {
    const total = transcript.length;
    const tagged = Object.values(qualityTags).filter(t => t !== null).length;
    const issues = Object.values(qualityTags).filter(t => t && t !== 'good').length;
    const pendingCount = Object.keys(pendingEdits).length;
    return { total, tagged, issues, pendingCount };
  }, [transcript.length, qualityTags, pendingEdits]);

  const progressPct = stats.total > 0 ? Math.round((stats.tagged / stats.total) * 100) : 0;

  // Navigation
  const goToPrev = () => {
    const prev = Math.max(0, selectedTurnIndex - 1);
    setSelectedTurnIndex(prev);
    onSeekToSegment?.(prev);
  };
  const goToNext = () => {
    const next = Math.min(transcript.length - 1, selectedTurnIndex + 1);
    setSelectedTurnIndex(next);
    onSeekToSegment?.(next);
  };

  // Multi-select toggle
  const toggleTurnSelection = (index: number) => {
    setSelectedTurns(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const selectAllTurns = () => {
    setSelectedTurns(new Set(transcript.map((_, i) => i)));
  };

  const clearSelection = () => {
    setSelectedTurns(new Set());
    setIsMultiSelectMode(false);
  };

  // Re-record single turn — clears pending edit on success
  const handleRerecord = async () => {
    if (!selectedTurn) return;
    
    setIsRerecording(true);
    try {
      console.log('🔄 Re-recording turn', selectedTurnIndex, {
        text: editedText,
        speaker: selectedTurn.speaker,
        ttsProvider,
        ttsModel,
      });

      if (!episodeId) {
        throw new Error('Episode ID not available');
      }

      // Call regenerate-turn API
      const response = await fetch('/api/podcast-studio/regenerate-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episodeId,
          turnIndex: selectedTurnIndex,
          text: editedText,
          speaker: selectedTurn.speaker,
          voiceId: (speakerInfo as any)?.voiceId,
          voiceProvider: ttsProvider,
          ttsModel,
          language,
          speakerGender: (speakerInfo as any)?.gender,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Re-record failed');
      }

      const result = await response.json();
      console.log('✅ Turn re-recorded:', result.turn);

      // Clear pending edit for this turn
      setPendingEdits(prev => {
        const next = { ...prev };
        delete next[selectedTurnIndex];
        return next;
      });

      // TODO: Notify parent to reload audio player with updated segments
      // For now, user will need to refresh or re-select the episode

    } catch (error) {
      console.error('❌ Re-record failed:', error);
      alert(`Failed to re-record: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRerecording(false);
    }
  };

  // Batch re-record selected turns
  const handleBatchRerecord = async () => {
    if (!episodeId) {
      alert('Episode ID not available');
      return;
    }

    setIsRerecording(true);
    const turnsToRecord = Array.from(selectedTurns).sort((a, b) => a - b);
    console.log(`🔄 Batch re-recording ${turnsToRecord.length} turns...`);

    const successfulTurns: number[] = [];
    const failedTurns: number[] = [];

    for (const turnIndex of turnsToRecord) {
      try {
        const turn = transcript[turnIndex];
        if (!turn) continue;

        const textToRecord = pendingEdits[turnIndex]?.text || turn.content;
        const speaker = speakers.find(s => s.name === turn.speaker) || { name: turn.speaker };

        console.log(`🔄 Re-recording turn ${turnIndex + 1}/${transcript.length}`);

        const response = await fetch('/api/podcast-studio/regenerate-turn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            episodeId,
            turnIndex,
            text: textToRecord,
            speaker: turn.speaker,
            voiceId: (speaker as any)?.voiceId,
            voiceProvider: ttsProvider,
            ttsModel,
            language,
            speakerGender: (speaker as any)?.gender,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Re-record failed');
        }

        const result = await response.json();
        console.log(`✅ Turn ${turnIndex + 1} re-recorded:`, result.turn);
        successfulTurns.push(turnIndex);

      } catch (error) {
        console.error(`❌ Failed to re-record turn ${turnIndex + 1}:`, error);
        failedTurns.push(turnIndex);
      }
    }

    // Clear pending edits for successful turns
    setPendingEdits(prev => {
      const next = { ...prev };
      successfulTurns.forEach(i => delete next[i]);
      return next;
    });

    setSelectedTurns(new Set());
    setIsMultiSelectMode(false);
    setIsRerecording(false);

    // Show summary
    if (failedTurns.length > 0) {
      alert(`Batch re-record completed:\n✅ ${successfulTurns.length} successful\n❌ ${failedTurns.length} failed (turns: ${failedTurns.map(i => i + 1).join(', ')})`);
    } else {
      console.log(`✅ Batch re-record completed: ${successfulTurns.length} turns`);
    }
  };

  // Discard pending edit for current turn
  const discardEdit = () => {
    setPendingEdits(prev => {
      const next = { ...prev };
      delete next[selectedTurnIndex];
      return next;
    });
    if (transcript[selectedTurnIndex]) {
      setEditedText(transcript[selectedTurnIndex].content);
    }
  };

  if (transcript.length === 0) {
    return (
      <VStack spacing={3} p={3} align="stretch">
        <Text fontSize="sm" fontWeight="600" color={textColor}>
          🎛️ Turn Editor
        </Text>
        <Box p={4} bg={surfaceBase} borderRadius="md" textAlign="center">
          <Text fontSize="xs" color={mutedColor}>
            Select a podcast episode to edit individual audio turns.
          </Text>
        </Box>
      </VStack>
    );
  }

  return (
    <VStack spacing={1.5} p={2} align="stretch" h="full" overflow="hidden">
      {/* Header row */}
      <HStack justify="space-between" px={1}>
        <HStack spacing={1.5}>
          <Text fontSize="xs" fontWeight="700" color={textColor}>
            🎛️ Turn Editor
          </Text>
          {stats.pendingCount > 0 && (
            <Badge colorScheme="orange" fontSize="7px" variant="solid" borderRadius="full">
              {stats.pendingCount} unsaved
            </Badge>
          )}
        </HStack>
        <HStack spacing={1}>
          <Tooltip label={isMultiSelectMode ? 'Exit multi-select' : 'Select multiple turns'} fontSize="xs">
            <IconButton
              aria-label="Multi-select"
              icon={isMultiSelectMode ? <FiX size={12} /> : <FiCheckSquare size={12} />}
              size="xs"
              variant={isMultiSelectMode ? 'solid' : 'ghost'}
              colorScheme={isMultiSelectMode ? 'blue' : 'gray'}
              h="20px"
              minW="20px"
              onClick={() => {
                if (isMultiSelectMode) clearSelection();
                else setIsMultiSelectMode(true);
              }}
            />
          </Tooltip>
          <Badge colorScheme={progressPct === 100 ? 'green' : 'gray'} fontSize="7px">
            {stats.tagged}/{stats.total}
          </Badge>
        </HStack>
      </HStack>

      {/* Turn navigator strip */}
      <Box bg={surfaceBase} borderRadius="md" px={1} py={0.5}>
        <HStack spacing={0} ref={navRef} overflowX="auto" py={0.5}
          css={{ '&::-webkit-scrollbar': { height: '2px' }, '&::-webkit-scrollbar-thumb': { background: '#ccc', borderRadius: '2px' } }}
        >
          {transcript.map((seg, i) => {
            const tag = qualityTags[i];
            const isViewing = i === selectedTurnIndex;
            const isCurrent = i === activeSegmentIndex && isPlaying;
            const hasPending = !!pendingEdits[i];
            const isChecked = selectedTurns.has(i);
            const dotColor = tag === 'good' ? 'green.400'
              : tag === 'glitchy' || tag === 'distorted' ? 'red.400'
              : tag === 'wrong-voice' ? 'orange.400'
              : tag === 'mispronounced' ? 'yellow.500'
              : 'gray.300';

            return (
              <Tooltip key={i} label={`#${i + 1} ${seg.speaker}${tag ? ` — ${tag}` : ''}${hasPending ? ' (edited)' : ''}`} fontSize="xs" placement="bottom" openDelay={300}>
                <Box
                  data-turn={i}
                  as="button"
                  minW="20px"
                  h="20px"
                  mx="0.5px"
                  borderRadius="3px"
                  fontSize="7px"
                  fontWeight={isViewing ? '800' : '500'}
                  bg={isChecked ? 'blue.100' : isViewing ? 'blue.500' : 'transparent'}
                  color={isViewing ? 'white' : mutedColor}
                  border="1px solid"
                  borderColor={isViewing ? 'blue.500' : isCurrent ? 'blue.300' : tag ? dotColor : 'transparent'}
                  position="relative"
                  transition="all 0.1s"
                  _hover={{ bg: isViewing ? 'blue.500' : 'gray.100' }}
                  _dark={{
                    bg: isChecked ? 'blue.800' : isViewing ? 'blue.500' : 'transparent',
                    _hover: { bg: isViewing ? 'blue.500' : 'whiteAlpha.100' },
                  }}
                  onClick={() => {
                    if (isMultiSelectMode) {
                      toggleTurnSelection(i);
                    }
                    setSelectedTurnIndex(i);
                    onSeekToSegment?.(i);
                  }}
                >
                  {i + 1}
                  {tag && !isViewing && (
                    <Box position="absolute" top="-2px" right="-2px" w="4px" h="4px" borderRadius="full" bg={dotColor} />
                  )}
                  {hasPending && !isViewing && (
                    <Box position="absolute" bottom="-2px" right="-2px" w="4px" h="4px" borderRadius="full" bg="orange.400" />
                  )}
                </Box>
              </Tooltip>
            );
          })}
        </HStack>
      </Box>

      {/* Batch actions bar (when multi-select is active) */}
      {isMultiSelectMode && (
        <HStack spacing={1} px={1}>
          <Button size="xs" variant="ghost" fontSize="9px" h="22px" onClick={selectAllTurns}>
            All
          </Button>
          <Button size="xs" variant="ghost" fontSize="9px" h="22px" onClick={clearSelection}>
            None
          </Button>
          <Box flex={1} />
          {selectedTurns.size > 0 && (
            <Button
              size="xs"
              colorScheme="blue"
              fontSize="9px"
              h="22px"
              leftIcon={<FiRefreshCw size={10} />}
              onClick={handleBatchRerecord}
              isLoading={isRerecording}
              loadingText="Recording..."
            >
              Re-record {selectedTurns.size} turns
            </Button>
          )}
        </HStack>
      )}

      <Divider my={0} />

      {/* Selected turn editor */}
      {selectedTurn && (
        <VStack spacing={2} align="stretch" flex={1} overflow="auto" px={0.5}>
          {/* Compact turn header: nav + speaker + metadata inline */}
          <HStack spacing={1}>
            <IconButton
              aria-label="Previous"
              icon={<FiChevronLeft size={12} />}
              size="xs"
              variant="ghost"
              h="22px"
              minW="22px"
              onClick={goToPrev}
              isDisabled={selectedTurnIndex === 0}
            />
            <HStack flex={1} spacing={1.5} justify="center" flexWrap="wrap">
              {isMultiSelectMode && (
                <Checkbox
                  size="sm"
                  isChecked={selectedTurns.has(selectedTurnIndex)}
                  onChange={() => toggleTurnSelection(selectedTurnIndex)}
                  colorScheme="blue"
                />
              )}
              <Badge colorScheme="blue" fontSize="8px" variant="solid" borderRadius="sm">
                #{selectedTurnIndex + 1}
              </Badge>
              <Text fontSize="9px" fontWeight="600" color={textColor} noOfLines={1}>
                {selectedTurn.speaker}
              </Text>
              {(speakerInfo as any)?.gender && (
                <Badge colorScheme={(speakerInfo as any).gender === 'female' ? 'pink' : 'cyan'} fontSize="7px" variant="outline" borderRadius="sm">
                  {(speakerInfo as any).gender}
                </Badge>
              )}
              {isPlaying && activeSegmentIndex === selectedTurnIndex && (
                <Badge colorScheme="green" fontSize="6px" variant="solid" borderRadius="sm">▶</Badge>
              )}
            </HStack>
            <IconButton
              aria-label="Next"
              icon={<FiChevronRight size={12} />}
              size="xs"
              variant="ghost"
              h="22px"
              minW="22px"
              onClick={goToNext}
              isDisabled={selectedTurnIndex === transcript.length - 1}
            />
          </HStack>

          {/* Production metadata — single compact row */}
          <HStack spacing={1} flexWrap="wrap" px={1}>
            {ttsProvider && (
              <Badge colorScheme="purple" fontSize="7px" variant="subtle" borderRadius="sm">
                {ttsProvider}
              </Badge>
            )}
            {ttsModel && (
              <Badge colorScheme="gray" fontSize="7px" variant="subtle" borderRadius="sm">
                {ttsModel.replace('gemini-2.5-flash-preview-tts', 'Gemini TTS').replace('qwen-tts-base', 'Qwen TTS')}
              </Badge>
            )}
            {(speakerInfo as any)?.voiceName && (
              <Badge colorScheme="teal" fontSize="7px" variant="subtle" borderRadius="sm">
                {(speakerInfo as any).voiceName}
              </Badge>
            )}
            {language && (
              <Badge colorScheme="gray" fontSize="7px" variant="subtle" borderRadius="sm">
                {language === 'spanish' ? '🇪🇸' : '🇺🇸'} {language}
              </Badge>
            )}
          </HStack>

          {/* Quality tags — compact emoji-only row */}
          <HStack spacing={1} px={1}>
            <Text fontSize="8px" fontWeight="600" color={mutedColor} mr={0.5}>QA</Text>
            {QUALITY_TAGS.map(qt => {
              const isActive = selectedTag === qt.key;
              return (
                <Tooltip key={qt.key} label={qt.tip} fontSize="xs" placement="top">
                  <Box
                    as="button"
                    w="26px"
                    h="24px"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    fontSize="12px"
                    borderRadius="md"
                    border="1.5px solid"
                    borderColor={isActive ? `${qt.color}.400` : borderColor}
                    bg={isActive ? `${qt.color}.50` : 'transparent'}
                    cursor="pointer"
                    transition="all 0.1s"
                    _hover={{ bg: `${qt.color}.50`, borderColor: `${qt.color}.300`, transform: 'scale(1.1)' }}
                    _dark={{
                      bg: isActive ? `${qt.color}.900` : 'transparent',
                    }}
                    onClick={() => onQualityTagChange?.(selectedTurnIndex, isActive ? null : qt.key)}
                  >
                    {qt.emoji}
                  </Box>
                </Tooltip>
              );
            })}
          </HStack>

          {/* Dialogue text — tall editor */}
          <Box flex={1} minH="0">
            <HStack justify="space-between" mb={1} px={1}>
              <Text fontSize="8px" fontWeight="600" color={mutedColor} textTransform="uppercase" letterSpacing="wider">
                Dialogue
              </Text>
              {hasPendingEdit && (
                <HStack spacing={1}>
                  <Badge colorScheme="orange" fontSize="7px" variant="subtle" borderRadius="sm">
                    auto-saved
                  </Badge>
                  <Button size="xs" variant="ghost" fontSize="8px" h="16px" px={1} colorScheme="gray" onClick={discardEdit}>
                    discard
                  </Button>
                </HStack>
              )}
            </HStack>
            <Textarea
              value={editedText}
              onChange={(e) => handleTextChange(e.target.value)}
              fontSize="xs"
              lineHeight="1.5"
              h="100%"
              minH="140px"
              resize="vertical"
              borderRadius="md"
              borderColor={hasPendingEdit ? 'orange.300' : borderColor}
              bg={hasPendingEdit ? 'orange.50' : undefined}
              _focus={{
                borderColor: hasPendingEdit ? 'orange.400' : 'blue.400',
                boxShadow: hasPendingEdit ? '0 0 0 1px var(--chakra-colors-orange-400)' : '0 0 0 1px var(--chakra-colors-blue-400)',
              }}
              _dark={{
                bg: hasPendingEdit ? 'orange.900' : undefined,
              }}
            />
          </Box>

          {/* Notes — compact */}
          <Box>
            <Text fontSize="8px" fontWeight="600" color={mutedColor} textTransform="uppercase" letterSpacing="wider" mb={0.5} px={1}>
              Notes
            </Text>
            <Textarea
              value={turnNotes[selectedTurnIndex] || ''}
              onChange={(e) => setTurnNotes(prev => ({ ...prev, [selectedTurnIndex]: e.target.value }))}
              placeholder="Optional notes..."
              fontSize="10px"
              minH="36px"
              maxH="60px"
              resize="vertical"
              borderRadius="md"
              py={1.5}
            />
          </Box>

        </VStack>
      )}

      {/* Pinned bottom: action buttons + progress — always visible */}
      <Box mt="auto" pt={1.5} borderTopWidth="1px" borderColor={borderColor} flexShrink={0}>
        <HStack spacing={1.5} mb={1.5}>
          <Button
            flex={1}
            size="xs"
            h="28px"
            variant="outline"
            leftIcon={<FiPlay size={11} />}
            fontSize="10px"
            onClick={() => onSeekToSegment?.(selectedTurnIndex)}
          >
            Play
          </Button>
          <Button
            flex={1}
            size="xs"
            h="28px"
            colorScheme="blue"
            leftIcon={<FiRefreshCw size={11} />}
            fontSize="10px"
            onClick={handleRerecord}
            isLoading={isRerecording}
            loadingText="..."
            isDisabled={!ttsProvider}
          >
            Re-record
          </Button>
        </HStack>
        <Progress
          value={progressPct}
          size="xs"
          colorScheme={progressPct === 100 ? 'green' : 'blue'}
          borderRadius="full"
          h="3px"
        />
        <Text fontSize="7px" color={mutedColor} textAlign="center" mt={0.5}>
          {stats.tagged}/{stats.total} reviewed{stats.pendingCount > 0 ? ` · ${stats.pendingCount} pending` : ''}
        </Text>
      </Box>
    </VStack>
  );
}
