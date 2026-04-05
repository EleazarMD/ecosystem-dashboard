/**
 * Dashboard Briefing Panel
 * Right panel for Email Intelligence Dashboard with audio briefing player,
 * briefing summary, key insights, and quick actions.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Progress,
  Spinner,
  Skeleton,
  SkeletonText,
  Divider,
  Collapse,
  useDisclosure,
} from '@chakra-ui/react';
import {
  PlayIcon,
  PauseIcon,
  ArrowPathIcon,
  SparklesIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  SpeakerWaveIcon,
  DocumentTextIcon,
  ChartBarIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useQwenTTS } from '@/hooks/useQwenTTS';

const HERMES_API_URL = '/api/hermes-proxy';

interface BriefingData {
  headline: string;
  executiveSummary: string;
  actionSummary: string;
  podcastScript: string;
  generatedAt: string;
  totalEmails: number;
  needsResponse: number;
  highPriority: number;
  responseRate: number;
  insights: string[];
}

export default function DashboardBriefingPanel() {
  const toast = useToast();
  const textColor = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const textMuted = useSemanticToken('text.muted');
  const borderColor = useSemanticToken('border.subtle');
  const bgSubtle = useSemanticToken('surface.subtle');

  const { getVoiceForService } = useQwenTTS();

  // Briefing data
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(true);

  // Audio playback state
  const [playing, setPlaying] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Collapsible sections
  const { isOpen: showScript, onToggle: toggleScript } = useDisclosure();
  const { isOpen: showInsights, onToggle: toggleInsights } = useDisclosure({ defaultIsOpen: true });

  // Format time helper
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Fetch latest briefing
  const fetchBriefing = useCallback(async () => {
    setBriefingLoading(true);
    try {
      const response = await fetch(`${HERMES_API_URL}?path=v1/intelligence/briefing/latest&account=all`);
      if (response.ok) {
        const data = await response.json();
        const b = data.briefing || data;
        const metrics = b.metrics || data.metrics || {};
        setBriefing({
          headline: b.headline || 'Email Intelligence Report',
          executiveSummary: b.executive_summary || '',
          actionSummary: b.action_summary || '',
          podcastScript: b.podcast_script || '',
          generatedAt: b.generated_at || data.generated_at || '',
          totalEmails: metrics.total_emails || 0,
          needsResponse: metrics.needs_response || 0,
          highPriority: metrics.high_priority || 0,
          responseRate: metrics.response_rate || 0,
          insights: b.insights || [],
        });
      }
    } catch (error) {
      console.error('Failed to fetch briefing:', error);
    } finally {
      setBriefingLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBriefing();
  }, [fetchBriefing]);

  // Setup audio element listeners
  const setupAudioListeners = useCallback((audio: HTMLAudioElement) => {
    audio.onloadedmetadata = () => setDuration(audio.duration);
    audio.ontimeupdate = () => {
      if (audio.duration > 0) setProgress((audio.currentTime / audio.duration) * 100);
    };
    audio.onended = () => { setPlaying(false); setProgress(0); };
    audio.onerror = () => { setPlaying(false); toast({ title: 'Audio playback error', status: 'error', duration: 2000 }); };
  }, [toast]);

  // Play / Pause handler
  const handlePlayPause = useCallback(async () => {
    if (playing) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setPlaying(false);
      setProgress(0);
      return;
    }

    const textToSpeak = briefing?.podcastScript || briefing?.executiveSummary;
    if (!textToSpeak) {
      toast({ title: 'No briefing content available', status: 'info', duration: 2000 });
      return;
    }

    // If audio already loaded, just play
    if (audioUrl && audioRef.current) {
      audioRef.current.play();
      setPlaying(true);
      return;
    }

    setGenerating(true);
    try {
      // Check if audio exists on server
      const statusRes = await fetch(`${HERMES_API_URL}?path=v1/intelligence/briefing/audio/status&account=all`);
      const audioStatus = await statusRes.json();

      if (audioStatus.has_audio) {
        const audioRes = await fetch(`${HERMES_API_URL}?path=v1/intelligence/briefing/audio&account=all`, { method: 'POST' });
        if (audioRes.ok) {
          const blob = await audioRes.blob();
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);
          const audio = new Audio(url);
          audioRef.current = audio;
          setupAudioListeners(audio);
          await audio.play();
          setPlaying(true);
          setGenerating(false);
          return;
        }
      }

      // Generate new audio via TTS
      toast({ title: 'Generating Audio', description: 'Using Qwen3 TTS...', status: 'info', duration: 3000 });
      const voiceId = getVoiceForService('daily-news');
      const response = await fetch(`${HERMES_API_URL}?path=v1/intelligence/briefing/audio&account=all&voice_id=${voiceId}`, { method: 'POST' });

      if (!response.ok) {
        // Fallback to direct TTS
        const directRes = await fetch('/api/ai-gateway/qwen-tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: textToSpeak,
            mode: 'clone-from-library',
            voice_id: voiceId,
            language: 'Auto',
            temperature: 0.4,
            top_p: 0.85,
          }),
        });
        if (!directRes.ok) throw new Error('TTS generation failed');
        const blob = await directRes.blob();
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        const audio = new Audio(url);
        audioRef.current = audio;
        setupAudioListeners(audio);
        await audio.play();
        setPlaying(true);
        setGenerating(false);
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      const audio = new Audio(url);
      audioRef.current = audio;
      setupAudioListeners(audio);
      await audio.play();
      setPlaying(true);
    } catch (error) {
      console.error('Audio generation failed:', error);
      toast({ title: 'Audio Generation Failed', status: 'error', duration: 3000 });
    } finally {
      setGenerating(false);
    }
  }, [briefing, playing, audioUrl, getVoiceForService, setupAudioListeners, toast]);

  // Refresh briefing (regenerate)
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      toast({ title: 'Generating Fresh Briefing', description: 'Analyzing emails...', status: 'info', duration: 5000 });
      await fetch(`${HERMES_API_URL}?path=v1/intelligence/briefing/generate&account=all&period_hours=24&include_podcast=true`, { method: 'POST' });
      await fetch(`${HERMES_API_URL}?path=v1/intelligence/briefing/audio&account=all&force_regenerate=true`, { method: 'POST' });
      await fetchBriefing();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
      setProgress(0);
      setPlaying(false);
      toast({ title: 'Briefing Ready', status: 'success', duration: 3000 });
      // Notify the main page to refresh
      window.dispatchEvent(new CustomEvent('briefing-updated'));
    } catch (error) {
      toast({ title: 'Refresh Failed', status: 'error', duration: 3000 });
    } finally {
      setRefreshing(false);
    }
  }, [fetchBriefing, toast, audioUrl]);

  // Cleanup audio URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  return (
    <Box p={3} h="full" overflowY="auto" className="custom-scrollbar">
      <VStack align="stretch" spacing={3}>

        {/* ── AUDIO PLAYER ── */}
        <Box
          p={4}
          bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
          borderRadius="12px"
          color="white"
        >
          <HStack spacing={3} mb={3}>
            <IconButton
              aria-label={playing ? 'Stop' : generating ? 'Generating...' : 'Play Briefing'}
              icon={generating
                ? <Spinner size="sm" color="white" />
                : playing
                  ? <PauseIcon style={{ width: 20, height: 20 }} />
                  : <PlayIcon style={{ width: 20, height: 20 }} />
              }
              size="md"
              borderRadius="full"
              bg="whiteAlpha.200"
              color="white"
              _hover={{ bg: 'whiteAlpha.300' }}
              onClick={handlePlayPause}
              isDisabled={generating}
            />
            <Box flex={1}>
              <Text fontSize="13px" fontWeight="600">
                Daily Audio Briefing
              </Text>
              <Text fontSize="11px" opacity={0.8}>
                {generating
                  ? 'Generating with Qwen3 TTS...'
                  : playing
                    ? 'Playing...'
                    : audioUrl
                      ? `${formatTime(duration)} ready`
                      : 'Click to generate & play'}
              </Text>
            </Box>
            <Tooltip label="Generate fresh briefing">
              <IconButton
                aria-label="Refresh briefing"
                icon={<ArrowPathIcon style={{ width: 16, height: 16 }} />}
                size="sm"
                variant="ghost"
                color="white"
                _hover={{ bg: 'whiteAlpha.200' }}
                onClick={handleRefresh}
                isLoading={refreshing}
              />
            </Tooltip>
          </HStack>

          <Progress
            value={progress}
            size="sm"
            colorScheme="whiteAlpha"
            bg="whiteAlpha.200"
            borderRadius="full"
            isIndeterminate={generating}
          />

          <HStack justify="space-between" mt={1.5} fontSize="10px" opacity={0.7}>
            <Text>{formatTime((progress / 100) * duration)}</Text>
            <Text>{duration > 0 ? formatTime(duration) : '--:--'}</Text>
          </HStack>
        </Box>

        {/* ── BRIEFING CONTENT ── */}
        {briefingLoading ? (
          <VStack spacing={3} align="stretch">
            <Skeleton height="20px" borderRadius="md" />
            <SkeletonText noOfLines={3} spacing={2} />
            <Skeleton height="40px" borderRadius="md" />
          </VStack>
        ) : briefing ? (
          <>
            {/* Briefing Summary */}
            <Box p={3} bg={bgSubtle} borderRadius="md" borderLeft="3px solid" borderLeftColor="purple.400">
              <Text fontSize="12px" fontWeight="600" color={textColor} mb={1} noOfLines={2}>
                {briefing.headline}
              </Text>
              <Text fontSize="11px" color={textSecondary} noOfLines={3}>
                {briefing.executiveSummary}
              </Text>
              <HStack spacing={3} mt={2} fontSize="10px" color={textSecondary}>
                <Text>{briefing.totalEmails} emails</Text>
                {briefing.needsResponse > 0 && (
                  <Badge colorScheme="orange" fontSize="9px">{briefing.needsResponse} need response</Badge>
                )}
              </HStack>
              <Text fontSize="9px" color={textSecondary} mt={1} opacity={0.7}>
                {briefing.generatedAt ? new Date(briefing.generatedAt).toLocaleString() : ''}
              </Text>
            </Box>

            {/* Action Summary */}
            {briefing.actionSummary && (
              <Box p={2} bg={bgSubtle} borderRadius="md" borderLeft="3px solid" borderLeftColor="orange.400">
                <Text fontSize="11px" color={textSecondary}>
                  {briefing.actionSummary}
                </Text>
              </Box>
            )}

            <Divider borderColor={borderColor} />

            {/* Insights Section */}
            {briefing.insights && briefing.insights.length > 0 && (
              <Box>
                <HStack
                  spacing={2}
                  cursor="pointer"
                  onClick={toggleInsights}
                  _hover={{ opacity: 0.8 }}
                >
                  <LightBulbIcon style={{ width: 14, height: 14, color: 'var(--chakra-colors-yellow-500)' }} />
                  <Text fontSize="10px" fontWeight="600" color={textMuted} textTransform="uppercase" flex={1}>
                    Key Insights ({briefing.insights.length})
                  </Text>
                  {showInsights
                    ? <ChevronUpIcon style={{ width: 12, height: 12 }} />
                    : <ChevronDownIcon style={{ width: 12, height: 12 }} />
                  }
                </HStack>
                <Collapse in={showInsights}>
                  <VStack align="stretch" spacing={1.5} mt={2}>
                    {briefing.insights.map((insight, i) => (
                      <Text key={i} fontSize="11px" color={textSecondary} lineHeight="1.4" pl={1}>
                        {insight}
                      </Text>
                    ))}
                  </VStack>
                </Collapse>
              </Box>
            )}

            {/* Podcast Script (collapsible) */}
            {briefing.podcastScript && (
              <Box>
                <HStack
                  spacing={2}
                  cursor="pointer"
                  onClick={toggleScript}
                  _hover={{ opacity: 0.8 }}
                >
                  <DocumentTextIcon style={{ width: 14, height: 14, color: 'var(--chakra-colors-purple-500)' }} />
                  <Text fontSize="10px" fontWeight="600" color={textMuted} textTransform="uppercase" flex={1}>
                    Full Script
                  </Text>
                  {showScript
                    ? <ChevronUpIcon style={{ width: 12, height: 12 }} />
                    : <ChevronDownIcon style={{ width: 12, height: 12 }} />
                  }
                </HStack>
                <Collapse in={showScript}>
                  <Box mt={2} p={2} bg={bgSubtle} borderRadius="md" maxH="200px" overflowY="auto">
                    <Text fontSize="11px" color={textSecondary} lineHeight="1.6" whiteSpace="pre-wrap">
                      {briefing.podcastScript}
                    </Text>
                  </Box>
                </Collapse>
              </Box>
            )}
          </>
        ) : (
          <VStack spacing={3} py={6} textAlign="center">
            <SparklesIcon style={{ width: 32, height: 32, opacity: 0.3 }} />
            <Text fontSize="12px" color={textMuted}>
              No briefing available
            </Text>
            <Button
              size="sm"
              colorScheme="purple"
              variant="outline"
              onClick={handleRefresh}
              isLoading={refreshing}
              leftIcon={<ArrowPathIcon style={{ width: 14, height: 14 }} />}
            >
              Generate Briefing
            </Button>
          </VStack>
        )}
      </VStack>
    </Box>
  );
}
