import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  IconButton,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Badge,
  Progress,
  Divider,
  Tooltip,
  useToast,
} from '@chakra-ui/react';
import { FiCheck, FiAlertTriangle, FiAlertCircle, FiMic } from 'react-icons/fi';
import { FiPlay, FiPause, FiSkipBack, FiSkipForward, FiVolume2, FiDownload } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface TurnSegment {
  index: number;
  speaker: string;
  text: string;
  audioPath: string;
  duration: number;
  startTime: number;
  endTime: number;
  voiceId?: string;
  voiceProvider?: string;
  lastModified?: string;
}

interface EpisodeSegments {
  turns: TurnSegment[];
  totalDuration: number;
  version: number;
}

interface PodcastEpisode {
  id: string;
  projectId?: string;
  filePath?: string;
  audioUrl?: string;
  duration: number;
  format?: string;
  provider?: string;
  projectTitle?: string;
  title?: string;
  excerpt?: string;
  segments?: EpisodeSegments;
}

type QualityTag = 'good' | 'glitchy' | 'wrong-voice' | 'mispronounced' | 'distorted' | null;

const QUALITY_TAG_CONFIG: Record<Exclude<QualityTag, null>, { label: string; color: string; icon: any; emoji: string }> = {
  'good': { label: 'Good', color: 'green', icon: FiCheck, emoji: '✅' },
  'glitchy': { label: 'Glitchy Audio', color: 'red', icon: FiAlertTriangle, emoji: '⚠️' },
  'wrong-voice': { label: 'Wrong Voice', color: 'orange', icon: FiMic, emoji: '🔀' },
  'mispronounced': { label: 'Mispronounced', color: 'yellow', icon: FiAlertCircle, emoji: '🗣️' },
  'distorted': { label: 'Distorted', color: 'red', icon: FiAlertTriangle, emoji: '💥' },
};

interface TranscriptSegment {
  speaker: string;
  content: string;
  startTime: number;
  endTime: number;
}

interface PodcastPlaybackPanelProps {
  episode: PodcastEpisode | null;
  transcript?: TranscriptSegment[];
  onTimeUpdate?: (currentTime: number) => void;
  onControlsUpdate?: (data: {
    playbackSpeed: number;
    transcriptSettings: {
      fontSize: 'sm' | 'md' | 'lg';
      autoScroll: boolean;
      showTimestamps: boolean;
    };
  }) => void;
  onQualityTagsChange?: (tags: Record<number, QualityTag>) => void;
  initialQualityTags?: Record<number, QualityTag>;
  onActiveSegmentChange?: (index: number) => void;
  onPlayingChange?: (isPlaying: boolean) => void;
}

export default function PodcastPlaybackPanel({ 
  episode, 
  transcript = [],
  onTimeUpdate,
  onControlsUpdate,
  onQualityTagsChange,
  initialQualityTags = {},
  onActiveSegmentChange,
  onPlayingChange,
}: PodcastPlaybackPanelProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(episode?.duration || 0);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [transcriptSettings, setTranscriptSettings] = useState({
    fontSize: 'md' as 'sm' | 'md' | 'lg',
    autoScroll: true,
    showTimestamps: true,
  });
  const [qualityTags, setQualityTags] = useState<Record<number, QualityTag>>(initialQualityTags);
  
  // Per-turn playback state
  const [segments, setSegments] = useState<EpisodeSegments | null>(null);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [usePerTurnPlayback, setUsePerTurnPlayback] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationRef = useRef<number | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  // Recompute transcript timing from word counts, scaled to actual audio duration
  // This fixes sync when turn.duration is 0/undefined
  const timedTranscript = useMemo(() => {
    if (transcript.length === 0) return [];
    
    // Check if transcript already has valid timing
    const hasValidTiming = transcript.some(seg => seg.endTime > 0);
    if (hasValidTiming && duration > 0) {
      // Timing exists — but may need scaling if total doesn't match audio duration
      const lastEnd = transcript[transcript.length - 1].endTime;
      if (lastEnd > 0 && Math.abs(lastEnd - duration) > 2) {
        // Scale to match actual audio duration
        const scale = duration / lastEnd;
        return transcript.map(seg => ({
          ...seg,
          startTime: seg.startTime * scale,
          endTime: seg.endTime * scale,
        }));
      }
      return transcript;
    }
    
    // No valid timing — estimate from word counts
    const wordCounts = transcript.map(seg => seg.content.split(/\s+/).length);
    const totalWords = wordCounts.reduce((sum, w) => sum + w, 0);
    const audioDur = duration || (totalWords / 150) * 60; // fallback: 150 wpm
    
    let cumulative = 0;
    return transcript.map((seg, idx) => {
      const words = wordCounts[idx];
      // Add 0.5s pause between speakers
      const pause = idx > 0 ? 0.5 : 0;
      const segDuration = (words / totalWords) * (audioDur - (transcript.length - 1) * 0.5);
      const startTime = cumulative + pause;
      const endTime = startTime + segDuration;
      cumulative = endTime;
      return { ...seg, startTime, endTime };
    });
  }, [transcript, duration]);

  // Quality tag handler
  const handleQualityTag = useCallback((index: number, tag: QualityTag) => {
    setQualityTags(prev => {
      const next = { ...prev };
      if (tag === null || prev[index] === tag) {
        delete next[index];
      } else {
        next[index] = tag;
      }
      onQualityTagsChange?.(next);
      return next;
    });
  }, [onQualityTagsChange]);

  // Click-to-seek: jump audio to a segment's start time
  const seekToSegment = useCallback((index: number) => {
    const audio = audioRef.current;
    const seg = timedTranscript[index];
    if (!audio || !seg) return;

    if (usePerTurnPlayback && segments) {
      // Per-turn mode: load the turn and start from beginning
      console.log(`🎵 Seeking to turn ${index}`);
      setCurrentTurnIndex(index);
      setActiveSegmentIndex(index);
      onActiveSegmentChange?.(index);
      setCurrentTime(seg.startTime);
      
      // Audio source will update via useEffect
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.currentTime = 0; // Start of turn
        }
      }, 100);
    } else {
      // Single audio mode: direct seek
      audio.currentTime = seg.startTime;
      setCurrentTime(seg.startTime);
      setActiveSegmentIndex(index);
    }
  }, [timedTranscript, usePerTurnPlayback, segments, onActiveSegmentChange]);
  // Update audio source when current turn changes (per-turn mode)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !usePerTurnPlayback || !segments) return;

    const currentTurn = segments.turns[currentTurnIndex];
    if (!currentTurn) return;

    const wasPlaying = isPlaying;
    const newSrc = currentTurn.audioPath;

    console.log(`🎵 Loading turn ${currentTurnIndex}: ${newSrc}`);
    
    // Update audio source
    audio.src = newSrc;
    audio.load();

    // Auto-play if we were already playing
    if (wasPlaying) {
      audio.play().catch(err => {
        console.error('Failed to auto-play next turn:', err);
        setIsPlaying(false);
      });
    }
  }, [currentTurnIndex, usePerTurnPlayback, segments]);

  // Smooth progress update using requestAnimationFrame
  const updateProgress = useCallback(() => {
    const audio = audioRef.current;
    if (audio && isPlaying) {
      // Calculate cumulative time across turns
      let cumulativeTime = 0;
      if (usePerTurnPlayback && segments) {
        // Add time from all previous turns
        for (let i = 0; i < currentTurnIndex; i++) {
          cumulativeTime += segments.turns[i]?.duration || 0;
        }
        // Add current turn's progress
        cumulativeTime += audio.currentTime;
      } else {
        cumulativeTime = audio.currentTime;
      }

      setCurrentTime(cumulativeTime);
      onTimeUpdate?.(cumulativeTime);
      
      // Update active transcript segment using recomputed timing
      if (timedTranscript.length > 0) {
        const time = cumulativeTime;
        const index = timedTranscript.findIndex(
          (seg) => time >= seg.startTime && time < seg.endTime
        );
        if (index !== -1 && index !== activeSegmentIndex) {
          setActiveSegmentIndex(index);
          onActiveSegmentChange?.(index);
          scrollToActiveSegment(index);
        }
      }
      
      animationRef.current = requestAnimationFrame(updateProgress);
    }
  }, [isPlaying, timedTranscript, activeSegmentIndex, onTimeUpdate, usePerTurnPlayback, segments, currentTurnIndex]);

  // Start/stop animation frame based on play state
  useEffect(() => {
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(updateProgress);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, updateProgress]);


  // Notify parent of playing state changes
  useEffect(() => {
    onPlayingChange?.(isPlaying);
  }, [isPlaying, onPlayingChange]);

  const bgColor = useSemanticToken('surface.elevated');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.default');
  const activeBg = useSemanticToken('surface.highlight');

  // Fetch segments metadata when episode changes
  useEffect(() => {
    if (!episode?.id) {
      setSegments(null);
      setUsePerTurnPlayback(false);
      return;
    }

    const fetchSegments = async () => {
      try {
        const response = await fetch(`/api/podcast-studio/episode-segments?episodeId=${episode.id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.segments?.turns && data.segments.turns.length > 0) {
            console.log(`🎵 Loaded ${data.segments.turns.length} per-turn audio clips`);
            setSegments(data.segments);
            setUsePerTurnPlayback(true);
            setDuration(data.segments.totalDuration || episode.duration);
          } else {
            console.log('🎵 No per-turn segments, using single audio file');
            setSegments(null);
            setUsePerTurnPlayback(false);
            setDuration(episode.duration);
          }
        } else {
          // Segments not found or error - fall back to single audio
          setSegments(null);
          setUsePerTurnPlayback(false);
          setDuration(episode.duration);
        }
      } catch (error) {
        console.error('Failed to fetch segments:', error);
        setSegments(null);
        setUsePerTurnPlayback(false);
        setDuration(episode.duration);
      }
    };

    fetchSegments();
  }, [episode?.id, episode?.duration]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      // Use episode duration if available, otherwise fall back to audio metadata
      if (episode?.duration) {
        setDuration(episode.duration);
      } else if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      if (usePerTurnPlayback && segments) {
        // Per-turn mode: advance to next turn
        const nextTurnIndex = currentTurnIndex + 1;
        if (nextTurnIndex < segments.turns.length) {
          console.log(`🎵 Turn ${currentTurnIndex} ended, advancing to turn ${nextTurnIndex}`);
          setCurrentTurnIndex(nextTurnIndex);
          setActiveSegmentIndex(nextTurnIndex);
          onActiveSegmentChange?.(nextTurnIndex);
          // Audio source will update via useEffect, play will continue
        } else {
          // End of episode
          console.log('🎵 Episode ended');
          setIsPlaying(false);
          setCurrentTime(0);
          setCurrentTurnIndex(0);
        }
      } else {
        // Single audio mode: end playback
        setIsPlaying(false);
        setCurrentTime(0);
      }
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [usePerTurnPlayback, segments, currentTurnIndex, episode?.duration, onActiveSegmentChange]);

  const scrollToActiveSegment = (index: number) => {
    if (!transcriptRef.current || !transcriptSettings.autoScroll) return;
    const element = transcriptRef.current.querySelector(`[data-segment="${index}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handlePlaybackSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
    onControlsUpdate?.({ playbackSpeed: speed, transcriptSettings });
  };

  const handleSkip = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(audio.currentTime + seconds, duration));
  };

  const handleTranscriptSettingsChange = (newSettings: typeof transcriptSettings) => {
    setTranscriptSettings(newSettings);
    onControlsUpdate?.({ playbackSpeed, transcriptSettings: newSettings });
  };

  // Apply playback speed when audio is loaded
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) {
      console.error('🎵 No audio element found');
      return;
    }

    console.log('🎵 Toggle play - current state:', isPlaying, 'audio src:', audio.src);

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      try {
        await audio.play();
        setIsPlaying(true);
        console.log('🎵 Audio playing');
      } catch (error) {
        console.error('🎵 Failed to play audio:', error);
        setIsPlaying(false);
      }
    }
  };

  const handleSeek = (value: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (usePerTurnPlayback && segments) {
      // Per-turn mode: find which turn contains this time
      let cumulativeTime = 0;
      for (let i = 0; i < segments.turns.length; i++) {
        const turn = segments.turns[i];
        const turnEnd = cumulativeTime + turn.duration;
        
        if (value >= cumulativeTime && value < turnEnd) {
          // Found the turn - load it and seek to offset within turn
          const offsetInTurn = value - cumulativeTime;
          console.log(`🎵 Seeking to turn ${i}, offset ${offsetInTurn.toFixed(2)}s`);
          
          setCurrentTurnIndex(i);
          setActiveSegmentIndex(i);
          onActiveSegmentChange?.(i);
          
          // Audio source will update via useEffect, then we seek
          setTimeout(() => {
            if (audioRef.current) {
              audioRef.current.currentTime = offsetInTurn;
              setCurrentTime(value);
            }
          }, 100);
          return;
        }
        
        cumulativeTime = turnEnd;
      }
    } else {
      // Single audio mode: direct seek
      audio.currentTime = value;
      setCurrentTime(value);
    }
  };

  const skip = (seconds: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime += seconds;
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDownload = () => {
    if (!episode) return;
    
    const audioSrc = episode.audioUrl || episode.filePath || '';
    const fileName = episode.title || episode.projectTitle || 'podcast';
    const fileExt = episode.format || 'wav';
    
    // Create a temporary anchor element to trigger download
    const link = document.createElement('a');
    link.href = audioSrc;
    link.download = `${fileName}.${fileExt}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!episode) {
    return (
      <VStack h="full" justify="center" align="center" spacing={4} p={8}>
        <Box fontSize="64px">🎧</Box>
        <Text fontSize="lg" fontWeight="600" color={textColor}>
          No Podcast Selected
        </Text>
        <Text fontSize="sm" color={mutedColor} textAlign="center" maxW="400px">
          Select a podcast from the library to start playback
        </Text>
      </VStack>
    );
  }

  // Determine audio source based on playback mode
  const audioSrc = useMemo(() => {
    if (usePerTurnPlayback && segments && segments.turns[currentTurnIndex]) {
      return segments.turns[currentTurnIndex].audioPath;
    }
    return episode.audioUrl || episode.filePath || '';
  }, [usePerTurnPlayback, segments, currentTurnIndex, episode.audioUrl, episode.filePath]);
  
  console.log('🎵 PodcastPlaybackPanel - Playback mode:', usePerTurnPlayback ? 'per-turn' : 'single-file');
  console.log('🎵 PodcastPlaybackPanel - Audio source:', audioSrc);
  console.log('🎵 PodcastPlaybackPanel - Current turn:', currentTurnIndex);
  
  return (
    <VStack h="full" spacing={0} align="stretch">
      <audio 
        ref={audioRef} 
        src={audioSrc} 
        preload="metadata"
        onError={(e) => console.error('🎵 Audio error:', e)}
        onLoadStart={() => console.log('🎵 Audio load started')}
        onCanPlay={() => console.log('🎵 Audio can play')}
      />

      {/* Episode Header */}
      <Box
        p={4}
        bg={bgColor}
        borderBottom="1px solid"
        borderColor={borderColor}
      >
        <VStack align="stretch" spacing={2}>
          <HStack justify="space-between">
            <VStack align="start" spacing={1} flex={1} minW={0}>
              <Text fontSize="lg" fontWeight="700" color={textColor} noOfLines={1}>
                {episode.title || episode.projectTitle || 'Untitled Podcast'}
              </Text>
              <HStack spacing={2} fontSize="xs" color={mutedColor}>
                {episode.format && (
                  <>
                    <Badge colorScheme="blue" fontSize="10px">
                      {episode.format.toUpperCase()}
                    </Badge>
                    <Text>•</Text>
                  </>
                )}
                <Text>{formatTime(episode.duration)}</Text>
                {episode.provider && (
                  <>
                    <Text>•</Text>
                    <Badge
                      colorScheme={episode.provider === 'gemini' ? 'blue' : 'purple'}
                      fontSize="10px"
                      variant="subtle"
                    >
                      {episode.provider === 'gemini' ? 'Gemini TTS' : 'OpenAI TTS'}
                    </Badge>
                  </>
                )}
              </HStack>
            </VStack>
            <Tooltip label={`Download ${episode.format ? episode.format.toUpperCase() : 'audio'} file`} fontSize="xs">
              <IconButton
                aria-label="Download podcast"
                icon={<FiDownload />}
                size="sm"
                colorScheme="blue"
                variant="outline"
                onClick={handleDownload}
              />
            </Tooltip>
          </HStack>

          {/* Progress Bar */}
          <VStack spacing={1} align="stretch">
            <Slider
              value={currentTime}
              min={0}
              max={duration || 1}
              step={0.1}
              onChange={handleSeek}
              focusThumbOnChange={false}
            >
              <SliderTrack bg={useSemanticToken('surface.elevated')} h="6px">
                <SliderFilledTrack bg="blue.500" />
              </SliderTrack>
              <SliderThumb boxSize={4} />
            </Slider>
            
            <HStack justify="space-between" fontSize="xs" color={mutedColor}>
              <Text>{formatTime(currentTime)}</Text>
              <Text>{formatTime(duration)}</Text>
            </HStack>
          </VStack>

          {/* Playback Controls */}
          <HStack justify="center" spacing={4} pt={2}>
            <IconButton
              aria-label="Skip back 10 seconds"
              icon={<FiSkipBack />}
              onClick={() => skip(-10)}
              variant="ghost"
              size="lg"
            />
            
            <IconButton
              aria-label={isPlaying ? 'Pause' : 'Play'}
              icon={isPlaying ? <FiPause /> : <FiPlay />}
              onClick={togglePlay}
              colorScheme="blue"
              size="lg"
              borderRadius="full"
              w="60px"
              h="60px"
              fontSize="24px"
            />
            
            <IconButton
              aria-label="Skip forward 10 seconds"
              icon={<FiSkipForward />}
              onClick={() => skip(10)}
              variant="ghost"
              size="lg"
            />
          </HStack>
        </VStack>
      </Box>

      {/* Real-Time Transcript with Quality Tagging */}
      <Box
        flex={1}
        overflowY="auto"
        p={6}
        ref={transcriptRef}
      >
        <VStack align="stretch" spacing={4}>
          {/* Header + QA summary */}
          <HStack justify="space-between" mb={2}>
            <HStack spacing={2}>
              <Text fontSize="md" fontWeight="600" color={textColor}>
                📝 Live Transcript
              </Text>
              {isPlaying && (
                <Badge colorScheme="green" fontSize="10px">
                  ● LIVE
                </Badge>
              )}
            </HStack>
            {/* QA summary badges */}
            {Object.keys(qualityTags).length > 0 && (
              <HStack spacing={1}>
                {Object.entries(
                  Object.values(qualityTags).reduce((acc, tag) => {
                    if (tag) acc[tag] = (acc[tag] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([tag, count]) => {
                  const cfg = QUALITY_TAG_CONFIG[tag as Exclude<QualityTag, null>];
                  return cfg ? (
                    <Badge key={tag} colorScheme={cfg.color} fontSize="9px" variant="subtle">
                      {cfg.emoji} {count}
                    </Badge>
                  ) : null;
                })}
                <Text fontSize="9px" color={mutedColor}>
                  {Object.keys(qualityTags).length}/{timedTranscript.length} tagged
                </Text>
              </HStack>
            )}
          </HStack>

          {timedTranscript.length === 0 ? (
            <Box p={8} textAlign="center">
              <Text fontSize="sm" color={mutedColor}>
                Transcript not available for this episode
              </Text>
            </Box>
          ) : (
            timedTranscript.map((segment, index) => {
              const tag = qualityTags[index];
              const tagConfig = tag ? QUALITY_TAG_CONFIG[tag] : null;
              const isActive = index === activeSegmentIndex;
              // Alternate speaker colors based on unique speaker names
              const speakerNames = [...new Set(timedTranscript.map(s => s.speaker))];
              const speakerIdx = speakerNames.indexOf(segment.speaker);
              const speakerColor = ['blue', 'purple', 'green', 'orange'][speakerIdx % 4];

              return (
                <Box
                  key={index}
                  data-segment={index}
                  p={4}
                  bg={isActive ? activeBg : bgColor}
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor={
                    tagConfig && !isActive ? `${tagConfig.color}.400` :
                    isActive ? 'blue.400' : borderColor
                  }
                  borderLeftWidth={isActive ? '5px' : tagConfig ? '4px' : '1px'}
                  borderLeftColor={isActive ? 'blue.500' : tagConfig ? `${tagConfig.color}.400` : borderColor}
                  transition="all 0.3s ease"
                  opacity={isActive ? 1 : 0.5}
                  cursor="pointer"
                  onClick={() => seekToSegment(index)}
                  _hover={{ opacity: isActive ? 1 : 0.85, bg: activeBg }}
                  transform={isActive ? 'scale(1.01)' : 'scale(1)'}
                  boxShadow={isActive ? '0 0 0 1px var(--chakra-colors-blue-400), 0 4px 20px -4px rgba(66,133,244,0.35)' : 'none'}
                  position="relative"
                  sx={isActive && isPlaying ? {
                    '@keyframes nowPlaying': {
                      '0%, 100%': { borderLeftColor: 'var(--chakra-colors-blue-500)' },
                      '50%': { borderLeftColor: 'var(--chakra-colors-blue-300)' },
                    },
                    animation: 'nowPlaying 1.5s ease-in-out infinite',
                  } : undefined}
                >
                  <VStack align="stretch" spacing={2}>
                    <HStack justify="space-between">
                      <HStack spacing={2}>
                        {isActive && isPlaying && (
                          <Badge colorScheme="blue" fontSize="8px" variant="solid" px={1.5}>
                            ▶ NOW
                          </Badge>
                        )}
                        <Badge colorScheme={speakerColor} fontSize="10px">
                          🎙️ {segment.speaker}
                        </Badge>
                        <Badge colorScheme="gray" fontSize="9px" variant="outline">
                          #{index + 1}
                        </Badge>
                        {tagConfig && (
                          <Badge colorScheme={tagConfig.color} fontSize="9px" variant="solid">
                            {tagConfig.emoji} {tagConfig.label}
                          </Badge>
                        )}
                      </HStack>
                      {transcriptSettings.showTimestamps && (
                        <Text fontSize="xs" color={mutedColor}>
                          {formatTime(segment.startTime)}
                        </Text>
                      )}
                    </HStack>
                    <Text
                      fontSize={transcriptSettings.fontSize}
                      color={textColor}
                      lineHeight="1.6"
                    >
                      {segment.content}
                    </Text>
                  </VStack>
                </Box>
              );
            })
          )}
        </VStack>
      </Box>
    </VStack>
  );
}
