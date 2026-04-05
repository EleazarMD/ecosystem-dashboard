/**
 * Audio TTS Controls Panel
 * Right panel component for audio briefing playback and TTS settings
 * Uses Qwen3 TTS for email briefings and audio summaries
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Select,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  SliderMark,
  FormControl,
  FormLabel,
  Divider,
  Button,
  Badge,
  IconButton,
  Tooltip,
  useToast,
  Collapse,
  Switch,
  Spinner,
  Progress,
} from '@chakra-ui/react';
import {
  SpeakerWaveIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  ArrowPathIcon,
  SparklesIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useQwenTTS, VOICE_CATEGORIES, SERVICE_VOICE_DEFAULTS } from '@/hooks/useQwenTTS';

// Voice presets for different personas - mapped to Qwen3 voice profiles
const VOICE_PRESETS = {
  professional: {
    name: 'Professional',
    voice_id: 'american_male_executive',
    description: 'Clear, authoritative business voice',
  },
  friendly: {
    name: 'Friendly',
    voice_id: 'american_female_warm',
    description: 'Warm, approachable tone',
  },
  calm: {
    name: 'Calm',
    voice_id: 'british_female_refined',
    description: 'Relaxed, soothing delivery',
  },
  energetic: {
    name: 'Energetic',
    voice_id: 'american_female_confident',
    description: 'Upbeat, motivating style',
  },
};

// Available voices from Qwen3 TTS
const AVAILABLE_VOICES = [
  { id: 'american_male_anchor', name: 'American Male Anchor', gender: 'male' },
  { id: 'american_male_executive', name: 'American Male Executive', gender: 'male' },
  { id: 'american_male_narrator', name: 'American Male Narrator', gender: 'male' },
  { id: 'american_female_warm', name: 'American Female Warm', gender: 'female' },
  { id: 'american_female_confident', name: 'American Female Confident', gender: 'female' },
  { id: 'american_female_sophisticated', name: 'American Female Sophisticated', gender: 'female' },
  { id: 'british_female_anchor', name: 'British Female Anchor', gender: 'female' },
  { id: 'british_female_refined', name: 'British Female Refined', gender: 'female' },
  { id: 'mexican_female_warm', name: 'Mexican Female Warm', gender: 'female' },
  { id: 'mexican_male_warm', name: 'Mexican Male Warm', gender: 'male' },
];

interface TTSSettings {
  voice_id: string;
  temperature: number;
  autoPlay: boolean;
}

interface BriefingData {
  headline: string;
  executiveSummary: string;
  podcastScript: string;
  podcastDuration: number;
  generatedAt: string;
  metrics?: {
    totalEmails: number;
    needsResponse: number;
  };
}

interface AudioTTSControlsPanelProps {
  customData?: {
    emailContext?: {
      subject?: string;
      from?: string;
      body?: string;
    };
    briefing?: BriefingData;
  };
}

export default function AudioTTSControlsPanel({ customData }: AudioTTSControlsPanelProps) {
  const toast = useToast();
  const audioRef = useRef<HTMLAudioElement>(null);
  const briefingAudioRef = useRef<HTMLAudioElement | null>(null);
  
  const { getVoiceForService } = useQwenTTS();
  
  const textColor = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.subtle');
  const bgSubtle = useSemanticToken('surface.subtle');

  // Audio Briefing Player state
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [briefingPlaying, setBriefingPlaying] = useState(false);
  const [briefingGenerating, setBriefingGenerating] = useState(false);
  const [briefingAudioUrl, setBriefingAudioUrl] = useState<string | null>(null);
  const [briefingProgress, setBriefingProgress] = useState(0);
  const [briefingDuration, setBriefingDuration] = useState(0);
  const [refreshingBriefing, setRefreshingBriefing] = useState(false);

  // TTS Settings state - using Qwen3 TTS
  const [settings, setSettings] = useState<TTSSettings>({
    voice_id: 'american_male_anchor',
    temperature: 0.4,
    autoPlay: false,
  });
  
  const [activePreset, setActivePreset] = useState<string | null>('professional');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Fetch latest briefing
  const fetchBriefing = useCallback(async () => {
    setBriefingLoading(true);
    try {
      const response = await fetch('/api/hermes-proxy?path=v1/intelligence/briefing/latest&account=all');
      if (response.ok) {
        const data = await response.json();
        const b = data.briefing || data;
        const metrics = b.metrics || data.metrics || {};
        setBriefing({
          headline: b.headline || 'Email Intelligence Report',
          executiveSummary: b.executive_summary || '',
          podcastScript: b.podcast_script || '',
          podcastDuration: b.podcast_duration_estimate || 60,
          generatedAt: b.generated_at || data.generated_at || new Date().toISOString(),
          metrics: {
            totalEmails: metrics.total_emails || 0,
            needsResponse: metrics.needs_response || 0,
          },
        });
      }
    } catch (error) {
      console.error('Failed to fetch briefing:', error);
    } finally {
      setBriefingLoading(false);
    }
  }, []);

  useEffect(() => {
    // Use briefing from customData if available, otherwise fetch
    if (customData?.briefing) {
      setBriefing(customData.briefing);
    } else {
      fetchBriefing();
    }
  }, [customData?.briefing, fetchBriefing]);

  // Generate fresh briefing
  const handleRefreshBriefing = useCallback(async () => {
    setRefreshingBriefing(true);
    try {
      toast({ title: 'Generating Fresh Briefing', description: 'Analyzing emails...', status: 'info', duration: 5000 });
      
      await fetch('/api/hermes-proxy?path=v1/intelligence/briefing/generate&account=all&period_hours=24&include_podcast=true', { method: 'POST' });
      await fetch('/api/hermes-proxy?path=v1/intelligence/briefing/audio&account=all&force_regenerate=true', { method: 'POST' });
      await fetchBriefing();
      
      // Reset audio state
      if (briefingAudioUrl) URL.revokeObjectURL(briefingAudioUrl);
      setBriefingAudioUrl(null);
      setBriefingProgress(0);
      setBriefingPlaying(false);
      
      toast({ title: 'Briefing Ready', status: 'success', duration: 3000 });
    } catch (error) {
      toast({ title: 'Refresh Failed', status: 'error', duration: 3000 });
    } finally {
      setRefreshingBriefing(false);
    }
  }, [fetchBriefing, toast, briefingAudioUrl]);

  // Setup audio listeners helper
  const setupBriefingAudioListeners = useCallback((audio: HTMLAudioElement) => {
    audio.onloadedmetadata = () => setBriefingDuration(audio.duration);
    audio.ontimeupdate = () => {
      if (audio.duration > 0) setBriefingProgress((audio.currentTime / audio.duration) * 100);
    };
    audio.onended = () => { setBriefingPlaying(false); setBriefingProgress(0); };
    audio.onerror = () => { setBriefingPlaying(false); toast({ title: 'Audio playback error', status: 'error', duration: 2000 }); };
  }, [toast]);

  // Play/pause briefing audio
  const handleBriefingPlayPause = useCallback(async () => {
    if (briefingPlaying) {
      if (briefingAudioRef.current) {
        briefingAudioRef.current.pause();
        briefingAudioRef.current.currentTime = 0;
      }
      setBriefingPlaying(false);
      setBriefingProgress(0);
      return;
    }

    const textToSpeak = briefing?.podcastScript || briefing?.executiveSummary;
    if (!textToSpeak) {
      toast({ title: 'No briefing content available', status: 'info', duration: 2000 });
      return;
    }

    // If audio already loaded, just play
    if (briefingAudioUrl && briefingAudioRef.current) {
      briefingAudioRef.current.play();
      setBriefingPlaying(true);
      return;
    }

    setBriefingGenerating(true);
    try {
      // Check if audio exists on server
      const statusRes = await fetch('/api/hermes-proxy?path=v1/intelligence/briefing/audio/status&account=all');
      const audioStatus = await statusRes.json();

      if (audioStatus.has_audio) {
        const audioRes = await fetch('/api/hermes-proxy?path=v1/intelligence/briefing/audio&account=all', { method: 'POST' });
        if (audioRes.ok) {
          const blob = await audioRes.blob();
          const url = URL.createObjectURL(blob);
          setBriefingAudioUrl(url);
          const audio = new Audio(url);
          briefingAudioRef.current = audio;
          setupBriefingAudioListeners(audio);
          await audio.play();
          setBriefingPlaying(true);
          setBriefingGenerating(false);
          return;
        }
      }

      // Generate new audio
      toast({ title: 'Generating Audio', description: 'Using Qwen3 TTS...', status: 'info', duration: 3000 });
      const voiceId = getVoiceForService('daily-news');
      const response = await fetch(`/api/hermes-proxy?path=v1/intelligence/briefing/audio&account=all&voice_id=${voiceId}`, { method: 'POST' });

      if (!response.ok) {
        // Fallback: direct TTS
        const directRes = await fetch('/api/ai-gateway/qwen-tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: textToSpeak, mode: 'clone-from-library', voice_id: voiceId, language: 'Auto', temperature: settings.temperature, top_p: 0.85 }),
        });
        if (!directRes.ok) throw new Error('TTS generation failed');
        const blob = await directRes.blob();
        const url = URL.createObjectURL(blob);
        setBriefingAudioUrl(url);
        const audio = new Audio(url);
        briefingAudioRef.current = audio;
        setupBriefingAudioListeners(audio);
        await audio.play();
        setBriefingPlaying(true);
        setBriefingGenerating(false);
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setBriefingAudioUrl(url);
      const audio = new Audio(url);
      briefingAudioRef.current = audio;
      setupBriefingAudioListeners(audio);
      await audio.play();
      setBriefingPlaying(true);
    } catch (error) {
      console.error('Audio generation failed:', error);
      toast({ title: 'Audio Generation Failed', status: 'error', duration: 3000 });
    } finally {
      setBriefingGenerating(false);
    }
  }, [briefing, briefingPlaying, briefingAudioUrl, getVoiceForService, settings.temperature, setupBriefingAudioListeners, toast]);

  // Cleanup audio URL on unmount
  useEffect(() => {
    return () => {
      if (briefingAudioUrl) URL.revokeObjectURL(briefingAudioUrl);
    };
  }, [briefingAudioUrl]);

  // Format time helper
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('email-tts-settings-qwen');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings(parsed);
        // Check if matches a preset
        const matchingPreset = Object.entries(VOICE_PRESETS).find(
          ([_, preset]) => preset.voice_id === parsed.voice_id
        );
        setActivePreset(matchingPreset ? matchingPreset[0] : null);
      } catch (e) {
        console.error('Failed to load TTS settings:', e);
      }
    }
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('email-tts-settings-qwen', JSON.stringify(settings));
  }, [settings]);

  const handlePresetChange = (presetKey: string) => {
    const preset = VOICE_PRESETS[presetKey as keyof typeof VOICE_PRESETS];
    if (preset) {
      setSettings({
        ...settings,
        voice_id: preset.voice_id,
      });
      setActivePreset(presetKey);
    }
  };

  const handleSettingChange = (key: keyof TTSSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setActivePreset(null); // Clear preset when manually changing
  };

  const handlePreviewVoice = async () => {
    setIsGenerating(true);
    try {
      const previewText = "Good morning! Here's your email briefing for today. You have 5 emails that need your attention.";
      
      // Use Qwen3 TTS API
      const response = await fetch('/api/ai-gateway/qwen-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: previewText,
          mode: 'clone-from-library',
          voice_id: settings.voice_id,
          language: 'Auto',
          temperature: settings.temperature,
          top_p: 0.85,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate preview');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      toast({
        title: 'Preview Error',
        description: 'Failed to generate voice preview. Is Qwen3 TTS running?',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  // Handle audio end
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      const handleEnded = () => setIsPlaying(false);
      audio.addEventListener('ended', handleEnded);
      return () => audio.removeEventListener('ended', handleEnded);
    }
  }, []);

  return (
    <Box p={3} h="full" overflowY="auto">
      <VStack align="stretch" spacing={3}>

        {/* ── AUDIO BRIEFING PLAYER ── */}
        <Box
          p={4}
          bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
          borderRadius="12px"
          color="white"
        >
          <HStack spacing={3} mb={3}>
            <IconButton
              aria-label={briefingPlaying ? 'Stop' : briefingGenerating ? 'Generating...' : 'Play'}
              icon={briefingGenerating ?
                <Spinner size="sm" color="white" /> :
                briefingPlaying ?
                  <PauseIcon style={{ width: '20px', height: '20px' }} /> :
                  <PlayIcon style={{ width: '20px', height: '20px' }} />
              }
              size="md"
              borderRadius="full"
              bg="whiteAlpha.200"
              color="white"
              _hover={{ bg: 'whiteAlpha.300' }}
              onClick={handleBriefingPlayPause}
              isDisabled={briefingGenerating}
            />
            <Box flex={1}>
              <Text fontSize="13px" fontWeight="600">
                Daily Audio Briefing
              </Text>
              <Text fontSize="11px" opacity={0.8}>
                {briefingGenerating
                  ? 'Generating with Qwen3 TTS...'
                  : briefingPlaying
                    ? 'Playing...'
                    : briefingAudioUrl
                      ? `${formatTime(briefingDuration)} ready`
                      : 'Click to generate & play'}
              </Text>
            </Box>
            <Tooltip label="Generate fresh briefing">
              <IconButton
                aria-label="Refresh briefing"
                icon={<ArrowPathIcon style={{ width: '16px', height: '16px' }} />}
                size="sm"
                variant="ghost"
                color="white"
                _hover={{ bg: 'whiteAlpha.200' }}
                onClick={handleRefreshBriefing}
                isLoading={refreshingBriefing}
              />
            </Tooltip>
          </HStack>

          <Progress
            value={briefingProgress}
            size="sm"
            colorScheme="whiteAlpha"
            bg="whiteAlpha.200"
            borderRadius="full"
            isIndeterminate={briefingGenerating}
          />

          <HStack justify="space-between" mt={1.5} fontSize="10px" opacity={0.7}>
            <Text>{formatTime((briefingProgress / 100) * briefingDuration)}</Text>
            <Text>{briefingDuration > 0 ? formatTime(briefingDuration) : '--:--'}</Text>
          </HStack>
        </Box>

        {/* Briefing Summary */}
        {briefing && (
          <Box p={3} bg={bgSubtle} borderRadius="md" borderLeft="3px solid" borderLeftColor="purple.400">
            <Text fontSize="12px" fontWeight="600" color={textColor} mb={1} noOfLines={2}>
              {briefing.headline}
            </Text>
            <Text fontSize="11px" color={textSecondary} noOfLines={3}>
              {briefing.executiveSummary}
            </Text>
            {briefing.metrics && (
              <HStack spacing={3} mt={2} fontSize="10px" color={textSecondary}>
                <Text>{briefing.metrics.totalEmails} emails</Text>
                {briefing.metrics.needsResponse > 0 && (
                  <Badge colorScheme="orange" fontSize="9px">{briefing.metrics.needsResponse} need response</Badge>
                )}
              </HStack>
            )}
            <Text fontSize="9px" color={textSecondary} mt={1} opacity={0.7}>
              {briefing.generatedAt ? new Date(briefing.generatedAt).toLocaleString() : ''}
            </Text>
          </Box>
        )}

        <Divider borderColor={borderColor} />

        {/* ── VOICE SETTINGS ── */}
        <HStack justify="space-between">
          <HStack spacing={2}>
            <SpeakerWaveIcon style={{ width: '16px', height: '16px', color: 'var(--chakra-colors-purple-500)' }} />
            <Text fontWeight="600" color={textColor} fontSize="sm">Voice Settings</Text>
          </HStack>
          <Badge colorScheme="purple" fontSize="2xs">Qwen3 TTS</Badge>
        </HStack>

        {/* Voice Presets - Compact */}
        <Box>
          <Text fontWeight="500" color={textColor} mb={2} fontSize="xs">
            Voice Persona
          </Text>
          <VStack align="stretch" spacing={1}>
            {Object.entries(VOICE_PRESETS).map(([key, preset]) => (
              <Box
                key={key}
                p={2}
                borderRadius="md"
                borderWidth="1px"
                borderColor={activePreset === key ? 'purple.500' : borderColor}
                bg={activePreset === key ? 'purple.50' : 'transparent'}
                cursor="pointer"
                onClick={() => handlePresetChange(key)}
                _hover={{ borderColor: 'purple.300' }}
                transition="all 0.2s"
              >
                <HStack justify="space-between">
                  <VStack align="start" spacing={0}>
                    <Text fontWeight="500" fontSize="xs" color={textColor}>
                      {preset.name}
                    </Text>
                    <Text fontSize="2xs" color={textSecondary}>
                      {preset.description}
                    </Text>
                  </VStack>
                  {activePreset === key && (
                    <Badge colorScheme="purple" fontSize="2xs">Active</Badge>
                  )}
                </HStack>
              </Box>
            ))}
          </VStack>
        </Box>

        <Divider borderColor={borderColor} />

        {/* Advanced Settings Toggle */}
        <HStack justify="space-between">
          <HStack spacing={2}>
            <Cog6ToothIcon style={{ width: '14px', height: '14px', color: textSecondary }} />
            <Text fontSize="xs" color={textSecondary}>Advanced Settings</Text>
          </HStack>
          <Switch
            size="sm"
            isChecked={showAdvanced}
            onChange={(e) => setShowAdvanced(e.target.checked)}
            colorScheme="purple"
          />
        </HStack>

        <Collapse in={showAdvanced}>
          <VStack align="stretch" spacing={4} pt={2}>
            {/* Voice Selection */}
            <FormControl>
              <FormLabel fontSize="sm" color={textSecondary}>Voice Profile</FormLabel>
              <Select
                size="sm"
                value={settings.voice_id}
                onChange={(e) => handleSettingChange('voice_id', e.target.value)}
              >
                {AVAILABLE_VOICES.map((voice) => (
                  <option key={voice.id} value={voice.id}>
                    {voice.name} ({voice.gender})
                  </option>
                ))}
              </Select>
            </FormControl>

            {/* Temperature Slider */}
            <FormControl>
              <FormLabel fontSize="sm" color={textSecondary}>
                Temperature: {settings.temperature.toFixed(2)}
              </FormLabel>
              <Slider
                min={0.1}
                max={1.0}
                step={0.05}
                value={settings.temperature}
                onChange={(val) => handleSettingChange('temperature', val)}
                colorScheme="purple"
              >
                <SliderMark value={0.1} mt={2} ml={-2} fontSize="xs" color={textSecondary}>
                  Stable
                </SliderMark>
                <SliderMark value={0.5} mt={2} ml={-3} fontSize="xs" color={textSecondary}>
                  Balanced
                </SliderMark>
                <SliderMark value={1.0} mt={2} ml={-2} fontSize="xs" color={textSecondary}>
                  Creative
                </SliderMark>
                <SliderTrack>
                  <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb />
              </Slider>
            </FormControl>
          </VStack>
        </Collapse>

        <Divider borderColor={borderColor} />

        {/* Auto-play Setting */}
        <FormControl display="flex" alignItems="center" justifyContent="space-between">
          <FormLabel mb={0} fontSize="sm" color={textSecondary}>
            Auto-play briefings
          </FormLabel>
          <Switch
            isChecked={settings.autoPlay}
            onChange={(e) => handleSettingChange('autoPlay', e.target.checked)}
            colorScheme="purple"
          />
        </FormControl>

        <Divider borderColor={borderColor} />

        {/* Preview Button */}
        <VStack spacing={2}>
          {isPlaying ? (
            <Button
              w="full"
              size="sm"
              colorScheme="red"
              leftIcon={<StopIcon style={{ width: '14px', height: '14px' }} />}
              onClick={handleStopAudio}
              fontSize="xs"
            >
              Stop Preview
            </Button>
          ) : (
            <Button
              w="full"
              size="sm"
              colorScheme="purple"
              leftIcon={<PlayIcon style={{ width: '14px', height: '14px' }} />}
              onClick={handlePreviewVoice}
              isLoading={isGenerating}
              loadingText="Generating..."
              fontSize="xs"
            >
              Preview Voice
            </Button>
          )}
          <Text fontSize="2xs" color={textSecondary} textAlign="center">
            Test your voice settings with a sample briefing
          </Text>
        </VStack>

        {/* Hidden audio element */}
        <audio ref={audioRef} style={{ display: 'none' }} />
      </VStack>
    </Box>
  );
}

export { AudioTTSControlsPanel };
