/**
 * Calendar Briefing Panel
 * Right panel component showing daily calendar briefing with audio playback
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Divider,
  Badge,
  Icon,
  Spinner,
  Progress,
  IconButton,
  useToast,
} from '@chakra-ui/react';
import {
  PlayIcon,
  PauseIcon,
  ArrowPathIcon,
  CalendarIcon,
  ClockIcon,
  SparklesIcon,
  SunIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useRightPanel } from '@/contexts/RightPanelContext';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface CalendarBriefing {
  headline: string;
  executive_summary: string;
  total_meetings: number;
  total_duration_minutes: number;
  focus_time_minutes: number;
  meeting_to_focus_ratio: number;
  meeting_briefs: Array<{
    event_id: string;
    title: string;
    start_time: string;
    end_time: string;
    attendees: string[];
  }>;
  focus_time_blocks: Array<{
    start: string;
    end: string;
    duration_minutes: number;
  }>;
  conflicts: Array<{
    event1_title: string;
    event2_title: string;
    overlap_minutes: number;
  }>;
  preparation_recommendations: string[];
  podcast_script: string;
  generated_at: string;
}

interface EmailBriefing {
  briefing_id: string;
  headline: string;
  executive_summary: string;
  generated_at: string;
  metrics: {
    total_emails: number;
    needs_response: number;
    high_priority: number;
    response_rate: number;
  };
  action_items: Array<{
    subject: string;
    from_name: string;
    priority: string;
    summary: string;
  }>;
  insights: string[];
}

export function CalendarBriefingPanel() {
  const toast = useToast();
  const { customData } = useRightPanel();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Theme tokens
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const bgElevated = useSemanticToken('surface.elevated');
  const border = useSemanticToken('border.default');

  const hasFetched = useRef(false);

  // State
  const [briefing, setBriefing] = useState<CalendarBriefing | null>(null);
  const [emailBriefing, setEmailBriefing] = useState<EmailBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Fetch calendar briefing
  const fetchBriefing = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/hermes-proxy?path=v1/calendar-intelligence/briefing&date=${today}`);
      if (response.ok) {
        const data = await response.json();
        setBriefing(data);
      }
    } catch (error) {
      console.error('Failed to fetch calendar briefing:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch email daily briefing from Hermes Core
  const fetchEmailBriefing = useCallback(async () => {
    try {
      const response = await fetch('/api/hermes-proxy?path=v1/intelligence/briefing/latest&account=all');
      if (response.ok) {
        const data = await response.json();
        // Hermes returns briefing directly
        if (data?.briefing_id) {
          setEmailBriefing(data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch email briefing:', error);
    }
  }, []);

  // On mount: if customData already has briefing use it, otherwise fetch.
  // customData may arrive later (async) — watch for it once.
  useEffect(() => {
    if (customData?.type === 'calendar-briefing' && customData.briefing) {
      setBriefing(customData.briefing);
      setLoading(false);
      hasFetched.current = true;
    } else if (!hasFetched.current) {
      hasFetched.current = true;
      fetchBriefing();
    }
  }, [customData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch email briefing once on mount
  useEffect(() => {
    fetchEmailBriefing();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Audio playback
  const handlePlayPause = async () => {
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setIsPlaying(false);
      setAudioProgress(0);
      return;
    }

    const textToSpeak = briefing?.podcast_script || briefing?.executive_summary;
    if (!textToSpeak) {
      toast({ title: 'No audio briefing available', status: 'info', duration: 2000 });
      return;
    }

    setGeneratingAudio(true);
    try {
      const response = await fetch('/api/ai-gateway/qwen-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToSpeak,
          mode: 'synthesize',
          language: 'English',
          temperature: 0.4,
          top_p: 0.85,
        }),
      });

      if (!response.ok) {
        let reason = 'TTS service unavailable';
        try {
          const errJson = await response.json();
          reason = errJson?.error || errJson?.message || reason;
        } catch {}
        throw new Error(reason);
      }

      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onloadedmetadata = () => {};
      audio.ontimeupdate = () => {
        if (audio.duration > 0) {
          setAudioProgress((audio.currentTime / audio.duration) * 100);
        }
      };
      audio.onended = () => {
        setIsPlaying(false);
        setAudioProgress(0);
      };

      await audio.play();
      setIsPlaying(true);
      setGeneratingAudio(false);

      toast({
        title: 'Playing Calendar Briefing',
        status: 'success',
        duration: 2000,
      });
    } catch (error) {
      console.error('TTS generation failed:', error);
      setGeneratingAudio(false);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Audio Unavailable',
        description: msg,
        status: 'warning',
        duration: 4000,
      });
    }
  };

  // Format time
  const formatTime = (timeStr: string) => {
    try {
      return new Date(timeStr).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return timeStr;
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  if (loading) {
    return (
      <VStack spacing={4} py={8}>
        <Spinner size="md" color="blue.500" />
        <Text fontSize="sm" color={textSecondary}>Loading briefing...</Text>
      </VStack>
    );
  }

  if (!briefing) {
    return (
      <VStack spacing={4} py={8}>
        <CalendarIcon style={{ width: '32px', height: '32px', color: '#6B7280' }} />
        <Text fontSize="sm" color={textSecondary}>No briefing available</Text>
        <Button size="sm" onClick={fetchBriefing} leftIcon={<ArrowPathIcon style={{ width: '14px', height: '14px' }} />}>
          Refresh
        </Button>
      </VStack>
    );
  }

  return (
    <VStack spacing={4} align="stretch">
      {/* Audio Player */}
      <Box
        p={3}
        bg="linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(16, 185, 129, 0.15))"
        borderRadius="lg"
        border="1px solid"
        borderColor="rgba(59, 130, 246, 0.3)"
      >
        <HStack spacing={2} mb={2}>
          <SparklesIcon style={{ width: '14px', height: '14px', color: '#3B82F6' }} />
          <Text fontSize="12px" fontWeight="600" color={textPrimary}>
            Daily Audio Briefing
          </Text>
        </HStack>

        <HStack spacing={3}>
          <IconButton
            aria-label={isPlaying ? 'Pause' : 'Play'}
            icon={
              generatingAudio ? (
                <Spinner size="sm" />
              ) : isPlaying ? (
                <PauseIcon style={{ width: '16px', height: '16px' }} />
              ) : (
                <PlayIcon style={{ width: '16px', height: '16px' }} />
              )
            }
            onClick={handlePlayPause}
            isDisabled={generatingAudio}
            colorScheme="blue"
            borderRadius="full"
            size="sm"
          />
          <Box flex="1">
            <Text fontSize="11px" color={textSecondary} mb={1}>
              {generatingAudio ? 'Generating audio...' : 'Click to generate & play'}
            </Text>
            <Progress
              value={audioProgress}
              size="xs"
              colorScheme="blue"
              borderRadius="full"
            />
          </Box>
        </HStack>
      </Box>

      {/* Headline */}
      <Box>
        <Text fontSize="14px" fontWeight="600" color={textPrimary} mb={1}>
          {briefing.headline}
        </Text>
        <Text fontSize="12px" color={textSecondary} lineHeight="1.5">
          {briefing.executive_summary}
        </Text>
      </Box>

      <Divider />

      {/* Quick Stats */}
      <HStack spacing={4} justify="space-around">
        <VStack spacing={0}>
          <Text fontSize="20px" fontWeight="700" color="blue.500">
            {briefing.total_meetings}
          </Text>
          <Text fontSize="10px" color={textSecondary}>Meetings</Text>
        </VStack>
        <VStack spacing={0}>
          <Text fontSize="20px" fontWeight="700" color="purple.500">
            {formatDuration(briefing.total_duration_minutes)}
          </Text>
          <Text fontSize="10px" color={textSecondary}>Meeting Time</Text>
        </VStack>
        <VStack spacing={0}>
          <Text fontSize="20px" fontWeight="700" color="green.500">
            {formatDuration(briefing.focus_time_minutes)}
          </Text>
          <Text fontSize="10px" color={textSecondary}>Focus Time</Text>
        </VStack>
      </HStack>

      {/* Conflicts Warning */}
      {briefing.conflicts && briefing.conflicts.length > 0 && (
        <Box p={2} bg="red.50" _dark={{ bg: 'red.900' }} borderRadius="md">
          <HStack spacing={2}>
            <ExclamationTriangleIcon style={{ width: '14px', height: '14px', color: '#EF4444' }} />
            <Text fontSize="11px" color="red.600" _dark={{ color: 'red.300' }}>
              {briefing.conflicts.length} scheduling conflict{briefing.conflicts.length > 1 ? 's' : ''}
            </Text>
          </HStack>
        </Box>
      )}

      <Divider />

      {/* Upcoming Meetings */}
      {briefing.meeting_briefs && briefing.meeting_briefs.length > 0 && (
        <Box>
          <HStack spacing={2} mb={2}>
            <ClockIcon style={{ width: '14px', height: '14px', color: textSecondary }} />
            <Text fontSize="11px" fontWeight="600" color={textSecondary} textTransform="uppercase">
              Today's Meetings
            </Text>
          </HStack>
          <VStack spacing={2} align="stretch">
            {briefing.meeting_briefs.slice(0, 4).map((meeting, idx) => (
              <HStack
                key={meeting.event_id || idx}
                p={2}
                bg={bgElevated}
                borderRadius="md"
                spacing={2}
              >
                <Box w="3px" h="100%" minH="30px" bg="blue.500" borderRadius="full" />
                <VStack spacing={0} align="start" flex="1">
                  <Text fontSize="12px" fontWeight="500" color={textPrimary} noOfLines={1}>
                    {meeting.title}
                  </Text>
                  <Text fontSize="10px" color={textSecondary}>
                    {formatTime(meeting.start_time)} - {formatTime(meeting.end_time)}
                  </Text>
                </VStack>
                {meeting.attendees && meeting.attendees.length > 0 && (
                  <Badge fontSize="9px" colorScheme="gray">
                    {meeting.attendees.length}
                  </Badge>
                )}
              </HStack>
            ))}
          </VStack>
        </Box>
      )}

      {/* No Meetings */}
      {(!briefing.meeting_briefs || briefing.meeting_briefs.length === 0) && (
        <Box p={4} textAlign="center">
          <SunIcon style={{ width: '24px', height: '24px', color: '#10B981', margin: '0 auto 8px' }} />
          <Text fontSize="12px" color={textSecondary}>
            No meetings today - enjoy your focus time!
          </Text>
        </Box>
      )}

      {/* Preparation Tips */}
      {briefing.preparation_recommendations && briefing.preparation_recommendations.length > 0 && (
        <>
          <Divider />
          <Box>
            <HStack spacing={2} mb={2}>
              <CheckCircleIcon style={{ width: '14px', height: '14px', color: '#F59E0B' }} />
              <Text fontSize="11px" fontWeight="600" color={textSecondary} textTransform="uppercase">
                Tips
              </Text>
            </HStack>
            <VStack spacing={1} align="stretch">
              {briefing.preparation_recommendations.slice(0, 3).map((tip, idx) => (
                <Text key={idx} fontSize="11px" color={textSecondary}>
                  • {tip.replace(/^[⚠️📅🎯⏰✨🏃]\s*/, '')}
                </Text>
              ))}
            </VStack>
          </Box>
        </>
      )}

      {/* Email Briefing Section */}
      {emailBriefing && (
        <>
          <Divider />
          <Box>
            <HStack spacing={2} mb={2}>
              <SparklesIcon style={{ width: '14px', height: '14px', color: '#8B5CF6' }} />
              <Text fontSize="11px" fontWeight="600" color={textSecondary} textTransform="uppercase">
                Email Intelligence
              </Text>
              <Badge fontSize="9px" colorScheme="purple" ml="auto">
                {emailBriefing.metrics?.total_emails || 0} emails
              </Badge>
            </HStack>
            <Text fontSize="12px" color={textPrimary} fontWeight="500" mb={1}>
              {emailBriefing.headline}
            </Text>
            <Text fontSize="11px" color={textSecondary} lineHeight="1.5" mb={2}>
              {emailBriefing.executive_summary}
            </Text>
            {/* Email Quick Stats */}
            <HStack spacing={3} mb={2}>
              {emailBriefing.metrics?.needs_response > 0 && (
                <Badge fontSize="9px" colorScheme="orange">
                  {emailBriefing.metrics.needs_response} need response
                </Badge>
              )}
              {emailBriefing.metrics?.high_priority > 0 && (
                <Badge fontSize="9px" colorScheme="red">
                  {emailBriefing.metrics.high_priority} high priority
                </Badge>
              )}
            </HStack>
            {/* Top action items */}
            {emailBriefing.action_items && emailBriefing.action_items.length > 0 && (
              <VStack spacing={1} align="stretch">
                {emailBriefing.action_items.slice(0, 3).map((item, idx) => (
                  <HStack key={idx} p={2} bg={bgElevated} borderRadius="md" spacing={2}>
                    <Box w="3px" minH="24px" bg={item.priority === 'high' ? 'red.400' : item.priority === 'medium' ? 'orange.400' : 'gray.400'} borderRadius="full" />
                    <VStack spacing={0} align="start" flex="1">
                      <Text fontSize="11px" fontWeight="500" color={textPrimary} noOfLines={1}>
                        {item.subject}
                      </Text>
                      <Text fontSize="10px" color={textSecondary}>
                        {item.from_name} · {item.summary?.slice(0, 50)}
                      </Text>
                    </VStack>
                  </HStack>
                ))}
              </VStack>
            )}
            {/* Insights */}
            {emailBriefing.insights && emailBriefing.insights.length > 0 && (
              <VStack spacing={1} align="stretch" mt={2}>
                {emailBriefing.insights.slice(0, 2).map((insight, idx) => (
                  <Text key={idx} fontSize="10px" color={textSecondary}>
                    {insight}
                  </Text>
                ))}
              </VStack>
            )}
          </Box>
        </>
      )}

      {/* Refresh Button */}
      <Button
        size="sm"
        variant="ghost"
        leftIcon={<ArrowPathIcon style={{ width: '14px', height: '14px' }} />}
        onClick={() => { fetchBriefing(); fetchEmailBriefing(); }}
        mt={2}
      >
        Refresh Briefing
      </Button>
    </VStack>
  );
}
