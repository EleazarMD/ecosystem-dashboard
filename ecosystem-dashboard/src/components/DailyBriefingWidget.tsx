/**
 * Daily Email Briefing Widget
 * 
 * Displays the daily email briefing in a compact, actionable format.
 * Can be embedded in the Email Intelligence Hub or other dashboard pages.
 * 
 * @module components/DailyBriefingWidget
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Card,
  CardBody,
  CardHeader,
  Badge,
  Button,
  IconButton,
  Spinner,
  useColorModeValue,
  Collapse,
  useDisclosure,
  Divider,
  Progress,
  Tooltip,
  Flex,
  Avatar,
  Tag,
  TagLabel,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useToast,
} from '@chakra-ui/react';
import {
  SparklesIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  EnvelopeIcon,
  ClockIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  PlayIcon,
  StopIcon,
  SpeakerWaveIcon,
  DocumentTextIcon,
  EllipsisVerticalIcon,
} from '@heroicons/react/24/outline';

// Use Hermes API via Next.js proxy to avoid CORS issues
const HERMES_API_URL = '/api/hermes-proxy';

interface ActionItem {
  email_id: string;
  subject: string;
  from_email: string;
  from_name: string | null;
  action_type: string;
  priority: string;
  summary: string;
  context: string;
  deadline: string | null;
  suggested_response: string | null;
}

interface ContactHighlight {
  email: string;
  name: string | null;
  email_count: number;
  sentiment: string;
  key_topics: string[];
  relationship_note: string;
}

interface TopicCluster {
  topic: string;
  email_count: number;
  priority: string;
  summary: string;
}

interface BriefingMetrics {
  total_emails: number;
  needs_response: number;
  high_priority: number;
  new_contacts: number;
  response_rate: number;
  avg_sentiment: number;
  sentiment_label: string;
  by_category: Record<string, number>;
  unique_contacts: number;
}

interface DailyBriefing {
  briefing_id: string;
  generated_at: string;
  period_start: string;
  period_end: string;
  account: string;
  executive_summary: string;
  headline: string;
  metrics: BriefingMetrics;
  action_items: ActionItem[];
  action_summary: string;
  contact_highlights: ContactHighlight[];
  topic_clusters: TopicCluster[];
  insights: string[];
  podcast_script: string;
  podcast_duration_estimate: number;
}

interface DailyBriefingWidgetProps {
  account?: string;
  compact?: boolean;
  onEmailClick?: (emailId: string) => void;
}

const priorityColors: Record<string, string> = {
  critical: 'red',
  high: 'orange',
  medium: 'yellow',
  low: 'green',
};

const priorityEmoji: Record<string, string> = {
  critical: '🔴',
  high: '🟠',
  medium: '🟡',
  low: '🟢',
};

const sentimentColors: Record<string, string> = {
  positive: 'green',
  neutral: 'gray',
  negative: 'red',
  mixed: 'purple',
};

export const DailyBriefingWidget: React.FC<DailyBriefingWidgetProps> = ({
  account = 'all',
  compact = false,
  onEmailClick,
}) => {
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioPeriod, setAudioPeriod] = useState<24 | 168>(24); // 24h or 7 days
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const { isOpen: showDetails, onToggle: toggleDetails } = useDisclosure({ defaultIsOpen: !compact });
  const { isOpen: showPodcast, onToggle: togglePodcast } = useDisclosure();
  const toast = useToast();

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const mutedText = useColorModeValue('gray.600', 'gray.400');
  const audioBg = useColorModeValue('blue.50', 'blue.900');
  const statsBg = useColorModeValue('gray.50', 'gray.700');

  const fetchLatestBriefing = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${HERMES_API_URL}?path=v1/intelligence/briefing/latest&account=${account}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to fetch briefing:', response.status, errorData);
        throw new Error(errorData.detail || `Failed to fetch briefing (${response.status})`);
      }
      const data = await response.json();
      // Handle both old format (data.success) and new format (direct data)
      const briefingData = data.success ? data.briefing : data;
      
      // If briefing has no emails, generate a new one with 7-day period to capture recent emails
      if (briefingData && briefingData.metrics && briefingData.metrics.total_emails === 0) {
        console.log('Briefing has 0 emails, generating new 7-day briefing...');
        const genResponse = await fetch(
          `${HERMES_API_URL}?path=v1/intelligence/briefing/generate&account=${account}&period_hours=168&include_podcast=true`,
          { method: 'POST' }
        );
        if (genResponse.ok) {
          const genData = await genResponse.json();
          setBriefing(genData.success ? genData.briefing : genData.briefing || genData);
          return;
        } else {
          const genError = await genResponse.json().catch(() => ({}));
          console.error('Failed to generate briefing:', genResponse.status, genError);
          throw new Error(genError.detail || `Failed to generate briefing (${genResponse.status})`);
        }
      }
      
      setBriefing(briefingData);
    } catch (err) {
      console.error('Briefing fetch error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [account]);

  const generateNewBriefing = async () => {
    setGenerating(true);
    setError(null);
    try {
      const response = await fetch(
        `${HERMES_API_URL}?path=v1/intelligence/briefing/generate&account=${account}&period_hours=24&include_podcast=true`,
        { method: 'POST' }
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to generate briefing:', response.status, errorData);
        throw new Error(errorData.detail || `Failed to generate briefing (${response.status})`);
      }
      const data = await response.json();
      console.log('Briefing generated successfully:', data);
      // Handle both old format (data.success) and new format (direct data)
      setBriefing(data.success ? data.briefing : data.briefing || data);
    } catch (err) {
      console.error('Briefing generation error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    fetchLatestBriefing();
  }, [fetchLatestBriefing]);

  // Audio playback handlers
  const handlePlayAudio = async (period: 24 | 168 = 24) => {
    // Set period first, then loading state to avoid race condition
    setAudioPeriod(period);
    setAudioLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `${HERMES_API_URL}?path=v1/intelligence/briefing/audio&account=${account}&period_hours=${period}`,
        { method: 'POST' }
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'TTS service unavailable' }));
        // Show user-friendly notification
        toast({
          title: 'Audio Not Available',
          description: 'TTS service is unavailable. Showing podcast script instead.',
          status: 'info',
          duration: 4000,
          isClosable: true,
        });
        console.warn('TTS service unavailable:', errorData.detail);
        if (!showPodcast) {
          togglePodcast();
        }
        return;
      }
      
      // Check if we got actual audio data
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('audio/')) {
        toast({
          title: 'Audio Not Available',
          description: 'TTS service returned invalid format. Showing podcast script instead.',
          status: 'info',
          duration: 4000,
          isClosable: true,
        });
        console.warn('TTS service returned non-audio content');
        if (!showPodcast) {
          togglePodcast();
        }
        return;
      }
      
      const blob = await response.blob();
      if (blob.size === 0) {
        toast({
          title: 'Audio Not Available',
          description: 'TTS service returned empty audio. Showing podcast script instead.',
          status: 'info',
          duration: 4000,
          isClosable: true,
        });
        console.warn('TTS service returned empty audio');
        if (!showPodcast) {
          togglePodcast();
        }
        return;
      }
      
      const url = URL.createObjectURL(blob);
      
      if (audioRef.current) {
        audioRef.current.src = url;
        await audioRef.current.play();
        setAudioPlaying(true);
      }
    } catch (err) {
      console.error('Audio playback error:', err);
      // Don't show error to user, just silently show podcast script
      if (!showPodcast) {
        togglePodcast();
      }
    } finally {
      setAudioLoading(false);
    }
  };

  const handleStopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setAudioPlaying(false);
    }
  };

  // Handle audio end
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      const handleEnded = () => setAudioPlaying(false);
      audio.addEventListener('ended', handleEnded);
      return () => audio.removeEventListener('ended', handleEnded);
    }
  }, []);

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
        <CardBody>
          <VStack py={8}>
            <Spinner size="lg" color="blue.500" />
            <Text color={mutedText}>Loading briefing...</Text>
          </VStack>
        </CardBody>
      </Card>
    );
  }

  if (error && !briefing) {
    return (
      <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
        <CardBody>
          <VStack py={4} spacing={3}>
            <Text color="red.500" fontSize="sm">{error}</Text>
            <Button
              leftIcon={<ArrowPathIcon className="w-4 h-4" />}
              onClick={generateNewBriefing}
              isLoading={generating}
              colorScheme="blue"
              size="sm"
            >
              Generate Briefing
            </Button>
          </VStack>
        </CardBody>
      </Card>
    );
  }

  if (!briefing) return null;

  return (
    <Card bg={cardBg} borderColor={borderColor} borderWidth="1px" borderRadius="xl" shadow="sm">
      <CardHeader pb={2}>
        <Flex justify="space-between" align="center">
          <HStack spacing={3}>
            <Box p={2} bg="purple.50" borderRadius="full">
              <SparklesIcon className="w-5 h-5 text-purple-600" />
            </Box>
            <Box>
              <Heading size="sm" fontWeight="600">Today's Briefing</Heading>
              <Text fontSize="xs" color={mutedText}>
                Updated {formatTime(briefing.generated_at)}
              </Text>
            </Box>
          </HStack>
          <HStack>
            <Tooltip label="Generate new briefing">
              <IconButton
                aria-label="Refresh"
                icon={<ArrowPathIcon className="w-4 h-4" />}
                size="sm"
                variant="ghost"
                onClick={generateNewBriefing}
                isLoading={generating}
              />
            </Tooltip>
            <Menu>
              <MenuButton
                as={IconButton}
                aria-label="Options"
                icon={<EllipsisVerticalIcon className="w-4 h-4" />}
                size="sm"
                variant="ghost"
              />
              <MenuList>
                <MenuItem icon={<DocumentTextIcon className="w-4 h-4" />}>
                  View Full Report
                </MenuItem>
                <MenuItem icon={<SpeakerWaveIcon className="w-4 h-4" />} onClick={togglePodcast}>
                  {showPodcast ? 'Hide' : 'Show'} Podcast Script
                </MenuItem>
              </MenuList>
            </Menu>
          </HStack>
        </Flex>
      </CardHeader>

      <CardBody pt={0}>
        <VStack align="stretch" spacing={4}>
          {/* Headline */}
          <Text fontWeight="medium" fontSize="sm" color="purple.600" lineHeight="tall">
            {briefing.headline}
          </Text>

          {/* Audio Briefing Controls */}
          <Box p={3} bg={audioBg} borderRadius="lg">
            <HStack justify="space-between" mb={2}>
              <HStack>
                <SpeakerWaveIcon className="w-5 h-5 text-blue-600" />
                <Text fontWeight="medium" fontSize="sm" color="blue.700">
                  Audio Briefing
                </Text>
              </HStack>
              {audioPlaying && (
                <Badge colorScheme="green" fontSize="xs">
                  Playing {audioPeriod === 24 ? 'Daily' : 'Weekly'}
                </Badge>
              )}
            </HStack>
            <HStack spacing={2}>
              {audioPlaying ? (
                <Button
                  size="sm"
                  colorScheme="red"
                  leftIcon={<StopIcon className="w-4 h-4" />}
                  onClick={handleStopAudio}
                >
                  Stop
                </Button>
              ) : (
                <>
                  <Button
                    size="sm"
                    colorScheme="blue"
                    leftIcon={<PlayIcon className="w-4 h-4" />}
                    onClick={() => handlePlayAudio(24)}
                    isLoading={audioLoading && audioPeriod === 24}
                    loadingText="Generating..."
                  >
                    Today
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    colorScheme="blue"
                    leftIcon={<PlayIcon className="w-4 h-4" />}
                    onClick={() => handlePlayAudio(168)}
                    isLoading={audioLoading && audioPeriod === 168}
                    loadingText="Generating..."
                  >
                    Past 7 Days
                  </Button>
                </>
              )}
            </HStack>
            <audio ref={audioRef} style={{ display: 'none' }} />
          </Box>

          {/* Quick Stats - Compact */}
          <HStack spacing={4} py={2} px={3} bg={statsBg} borderRadius="lg">
            <HStack spacing={1}>
              <Text fontSize="xl" fontWeight="bold">{briefing.metrics.total_emails}</Text>
              <Text fontSize="xs" color={mutedText}>emails</Text>
            </HStack>
            <Divider orientation="vertical" h={6} />
            <HStack spacing={1}>
              <Text fontSize="xl" fontWeight="bold" color="orange.500">{briefing.metrics.needs_response}</Text>
              <Text fontSize="xs" color={mutedText}>need reply</Text>
            </HStack>
            <Divider orientation="vertical" h={6} />
            <HStack spacing={1}>
              <Text fontSize="xl" fontWeight="bold">{briefing.metrics.response_rate}%</Text>
              <Text fontSize="xs" color={mutedText}>response</Text>
            </HStack>
            <Divider orientation="vertical" h={6} />
            <Badge colorScheme={sentimentColors[briefing.metrics.sentiment_label]} fontSize="xs">
              {briefing.metrics.sentiment_label}
            </Badge>
          </HStack>

          {/* Executive Summary - Collapsed by default in compact mode */}
          {!compact && (
            <Text fontSize="sm" color={mutedText} lineHeight="tall">
              {briefing.executive_summary}
            </Text>
          )}

          {/* Action Items Summary */}
          {briefing.action_items.length > 0 && (
            <Box>
              <HStack justify="space-between" mb={2}>
                <Text fontWeight="medium" fontSize="sm">
                  Action Items ({briefing.action_items.length})
                </Text>
                <Button
                  size="xs"
                  variant="ghost"
                  rightIcon={showDetails ? <ChevronUpIcon className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />}
                  onClick={toggleDetails}
                >
                  {showDetails ? 'Less' : 'More'}
                </Button>
              </HStack>
              
              <Text fontSize="sm" color={mutedText} mb={2}>
                {briefing.action_summary}
              </Text>

              <Collapse in={showDetails}>
                <VStack align="stretch" spacing={2}>
                  {briefing.action_items.slice(0, 5).map((item, idx) => (
                    <Box
                      key={idx}
                      p={2}
                      borderWidth="1px"
                      borderColor={borderColor}
                      borderRadius="md"
                      cursor={onEmailClick ? 'pointer' : 'default'}
                      onClick={() => onEmailClick?.(item.email_id)}
                      _hover={onEmailClick ? { bg: useColorModeValue('gray.50', 'gray.700') } : {}}
                    >
                      <HStack justify="space-between" mb={1}>
                        <HStack>
                          <Text fontSize="xs">{priorityEmoji[item.priority]}</Text>
                          <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                            {item.subject}
                          </Text>
                        </HStack>
                        <Badge size="sm" colorScheme={priorityColors[item.priority]}>
                          {item.priority}
                        </Badge>
                      </HStack>
                      <Text fontSize="xs" color={mutedText}>
                        From: {item.from_name || item.from_email}
                      </Text>
                      <Text fontSize="xs" color={mutedText} noOfLines={2}>
                        {item.summary}
                      </Text>
                    </Box>
                  ))}
                </VStack>
              </Collapse>
            </Box>
          )}

          {/* Insights */}
          {briefing.insights.length > 0 && (
            <Box>
              <Text fontWeight="medium" fontSize="sm" mb={2}>
                💡 Insights
              </Text>
              <VStack align="stretch" spacing={1}>
                {briefing.insights.map((insight, idx) => (
                  <Text key={idx} fontSize="xs" color={mutedText}>
                    {insight}
                  </Text>
                ))}
              </VStack>
            </Box>
          )}

          {/* Topic Clusters */}
          {briefing.topic_clusters.length > 0 && showDetails && (
            <Box>
              <Text fontWeight="medium" fontSize="sm" mb={2}>
                📁 Topics
              </Text>
              <Flex wrap="wrap" gap={2}>
                {briefing.topic_clusters.slice(0, 6).map((cluster, idx) => (
                  <Tag key={idx} size="sm" colorScheme={priorityColors[cluster.priority]}>
                    <TagLabel>
                      {cluster.topic} ({cluster.email_count})
                    </TagLabel>
                  </Tag>
                ))}
              </Flex>
            </Box>
          )}

          {/* Podcast Script */}
          <Collapse in={showPodcast}>
            <Box p={3} bg={useColorModeValue('purple.50', 'purple.900')} borderRadius="md">
              <HStack justify="space-between" mb={2}>
                <HStack>
                  <SpeakerWaveIcon className="w-4 h-4 text-purple-600" />
                  <Text fontWeight="medium" fontSize="sm" color="purple.600">
                    Podcast Script
                  </Text>
                </HStack>
                <Badge colorScheme="purple">
                  ~{formatDuration(briefing.podcast_duration_estimate)}
                </Badge>
              </HStack>
              <Text fontSize="sm" whiteSpace="pre-wrap">
                {briefing.podcast_script}
              </Text>
            </Box>
          </Collapse>

          {/* Contact Highlights */}
          {briefing.contact_highlights.length > 0 && showDetails && (
            <Box>
              <Text fontWeight="medium" fontSize="sm" mb={2}>
                👥 Key Contacts
              </Text>
              <HStack spacing={2} overflowX="auto">
                {briefing.contact_highlights.slice(0, 4).map((contact, idx) => (
                  <Box
                    key={idx}
                    p={2}
                    borderWidth="1px"
                    borderColor={borderColor}
                    borderRadius="md"
                    minW="120px"
                  >
                    <VStack spacing={1}>
                      <Avatar size="sm" name={contact.name || contact.email} />
                      <Text fontSize="xs" fontWeight="medium" noOfLines={1}>
                        {contact.name || contact.email.split('@')[0]}
                      </Text>
                      <Badge size="sm" colorScheme={sentimentColors[contact.sentiment]}>
                        {contact.email_count} emails
                      </Badge>
                    </VStack>
                  </Box>
                ))}
              </HStack>
            </Box>
          )}
        </VStack>
      </CardBody>
    </Card>
  );
};

export default DailyBriefingWidget;
