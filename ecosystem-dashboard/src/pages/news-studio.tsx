/**
 * News Studio Page
 * 
 * Dashboard for managing automated news story generation pipeline.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';
import {
  Box,
  Flex,
  Grid,
  GridItem,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Text,
  Badge,
  Button,
  IconButton,
  HStack,
  VStack,
  Heading,
  SimpleGrid,
  Switch,
  FormControl,
  FormLabel,
  Select,
  Input,
  Checkbox,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Divider,
  useToast,
  Spinner,
  Alert,
  AlertIcon,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Tag,
  TagLabel,
  Wrap,
  WrapItem,
  Icon,
  Link,
  Progress,
  Tooltip,
  useColorModeValue,
} from '@chakra-ui/react';
import {
  FiFileText,
  FiRefreshCw,
  FiPlay,
  FiPause,
  FiSettings,
  FiBarChart2,
  FiPackage,
  FiClock,
  FiDollarSign,
  FiAlertCircle,
  FiCheckCircle,
  FiVolume2,
  FiExternalLink,
  FiChevronLeft,
  FiShare2,
  FiCopy,
  FiDownload,
} from 'react-icons/fi';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useRightPanel } from '@/contexts/RightPanelContext';
import VoiceSettingsPanel, { DEFAULT_VOICE_CONFIG, type VoiceConfig } from '@/components/news-studio/VoiceSettingsPanel';

interface Story {
  id: string;
  title: string;
  headline: string;
  summary: string;
  full_narrative: string;
  category: string;
  style_guide: string;
  word_count: number;
  reading_time_minutes: number;
  citations: any[];
  sources: any[];
  audio_url?: string;
  audio_duration_seconds?: number;
  created_at: string;
  status: string;
  frameworks_applied?: string[];
  verification_status?: string;
}

// Simple markdown-like renderer for story content
function renderFormattedText(text: string): React.ReactNode {
  if (!text) return null;
  
  // Split by double newlines for paragraphs
  const sections = text.split(/\n\n+/);
  
  return sections.map((section, idx) => {
    // Check if it's a heading (starts with ** and ends with **)
    const headingMatch = section.match(/^\*\*(.+?)\*\*\s*$/);
    if (headingMatch) {
      return (
        <Heading key={idx} size="sm" mt={idx > 0 ? 4 : 0} mb={2} color="blue.600">
          {headingMatch[1]}
        </Heading>
      );
    }
    
    // Check if it's a ## heading
    const h2Match = section.match(/^##\s*(.+)$/);
    if (h2Match) {
      return (
        <Heading key={idx} size="md" mt={idx > 0 ? 5 : 0} mb={3} color="blue.700">
          {h2Match[1]}
        </Heading>
      );
    }
    
    // Check if it's a ### subheading
    const h3Match = section.match(/^###\s*(.+)$/);
    if (h3Match) {
      return (
        <Heading key={idx} size="sm" mt={idx > 0 ? 4 : 0} mb={2} color="blue.600">
          {h3Match[1]}
        </Heading>
      );
    }
    
    // Regular paragraph - process inline formatting
    let processed = section
      // Remove leading ## or ### from inline text
      .replace(/^##\s+/, '')
      .replace(/^###\s+/, '')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([0-9]+)\]/g, '<sup>[$1]</sup>');
    
    return (
      <Text 
        key={idx} 
        mb={3} 
        lineHeight="tall"
        dangerouslySetInnerHTML={{ __html: processed }}
        sx={{
          'strong': { fontWeight: 'semibold' },
          'sup': { fontSize: 'xs', color: 'blue.500', cursor: 'pointer' },
        }}
      />
    );
  });
}

interface Batch {
  id: string;
  edition: 'morning' | 'afternoon';
  batch_date: string;
  story_count: number;
  status: string;
}

interface PipelineStatus {
  status: 'active' | 'paused' | 'disabled';
  last_run?: { time: string; story_count: number; status: string };
  next_run?: string;
  stories_today: number;
  cost_today: number;
  errors_last_24h: number;
}

interface Settings {
  pipeline: {
    enabled: boolean;
    paused: boolean;
    schedule: {
      morning: { enabled: boolean; time: string };
      afternoon: { enabled: boolean; time: string };
    };
    stories_per_batch: number;
    categories: string[];
    max_daily_cost: number;
  };
  quality: {
    min_sources_per_story: number;
    min_word_count: number;
    max_word_count: number;
  };
  composition: {
    tone: string;
    complexity: string;
    reading_level: string;
    frameworks_enabled: boolean;
    preferred_frameworks: string[];
  };
  voice: {
    enabled: boolean;
    provider: 'qwen' | 'gemini';
    selection_mode: 'manual' | 'rotation' | 'random' | 'category';
    default_voice: string;
    voice_pool: string[];
    category_voices: Record<string, string[]>;
    settings: {
      temperature: number;
      speed: number;
      auto_generate: boolean;
    };
  };
}

const CATEGORIES = [
  { value: 'science', label: 'Science', color: 'purple' },
  { value: 'business', label: 'Business', color: 'blue' },
  { value: 'technology', label: 'Technology', color: 'cyan' },
  { value: 'healthcare', label: 'Healthcare', color: 'green' },
  { value: 'economics', label: 'Economics', color: 'orange' },
  { value: 'politics', label: 'Politics', color: 'red' },
];

const FRAMEWORKS = {
  decision_science: [
    { id: 'prospect_theory', name: 'Prospect Theory', author: 'Kahneman & Tversky' },
    { id: 'many_model_thinking', name: 'Many-Model Thinking', author: 'Scott E. Page' },
  ],
  strategic: [
    { id: 'porters_five_forces', name: "Porter's Five Forces", author: 'Michael Porter' },
    { id: 'game_theory', name: 'Game Theory', author: 'Von Neumann' },
  ],
};

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    science: 'purple', business: 'blue', technology: 'cyan',
    healthcare: 'green', economics: 'orange', politics: 'red',
  };
  return colors[category] || 'gray';
}

function NewsStudioContent() {
  const [activeTab, setActiveTab] = useState(0);
  const [stories, setStories] = useState<Story[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  
  const toast = useToast();
  const { isOpen: isStoryOpen, onOpen: onStoryOpen, onClose: onStoryClose } = useDisclosure();
  const { isOpen: isPauseOpen, onOpen: onPauseOpen, onClose: onPauseClose } = useDisclosure();
  
  // Right panel integration
  const { setCustomData, setIsOpen: setRightPanelOpen, setActiveTab: setRightPanelTab } = useRightPanel();
  
  const bgBase = useSemanticToken('surface.base');
  const bgCard = useSemanticToken('surface.card');
  const borderSubtle = useSemanticToken('border.subtle');
  const textSecondary = useSemanticToken('text.secondary');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [storiesRes, batchesRes, statusRes, settingsRes] = await Promise.all([
        fetch('/api/news/stories?limit=20&status=all').catch(() => null),
        fetch('/api/news/batches?limit=10').catch(() => null),
        fetch('/api/news/pipeline/status').catch(() => null),
        fetch('/api/news/settings').catch(() => null),
      ]);

      if (storiesRes?.ok) {
        const data = await storiesRes.json();
        setStories(data.stories || []);
      }
      if (batchesRes?.ok) {
        const data = await batchesRes.json();
        setBatches(data.batches || []);
      }
      if (statusRes?.ok) {
        const data = await statusRes.json();
        setPipelineStatus(data);
      }
      if (settingsRes?.ok) {
        const data = await settingsRes.json();
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Initialize right panel with callbacks
  useEffect(() => {
    setCustomData({
      selectedStory: selectedStory,
      onStoryUpdate: (updatedStory: Story) => {
        setStories(prev => prev.map(s => s.id === updatedStory.id ? updatedStory : s));
        setSelectedStory(updatedStory);
      },
      onStoryDelete: (storyId: string) => {
        setStories(prev => prev.filter(s => s.id !== storyId));
        setSelectedStory(null);
      },
      onRefresh: fetchData,
    });
  }, [selectedStory, setCustomData, fetchData]);

  const handleViewStory = (story: Story) => {
    setSelectedStory(story);
    setRightPanelTab('story-details');
    setRightPanelOpen(true);
    onStoryOpen();
  };

  const handlePause = async (reason?: string, until?: string) => {
    try {
      const res = await fetch('/api/news/pipeline/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, until }),
      });
      if (res.ok) {
        toast({ title: 'Pipeline paused', status: 'info', duration: 2000 });
        fetchData();
        onPauseClose();
      }
    } catch (error) {
      toast({ title: 'Failed to pause', status: 'error', duration: 3000 });
    }
  };

  const handleResume = async () => {
    try {
      const res = await fetch('/api/news/pipeline/resume', { method: 'POST' });
      if (res.ok) {
        toast({ title: 'Pipeline resumed', status: 'success', duration: 2000 });
        fetchData();
      }
    } catch (error) {
      toast({ title: 'Failed to resume', status: 'error', duration: 3000 });
    }
  };

  const handleRunNow = async () => {
    toast({ title: 'Starting pipeline run...', status: 'info', duration: 2000 });
    try {
      const res = await fetch('/api/news/pipeline/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: settings?.pipeline.categories[0] || 'technology',
          count: settings?.pipeline.stories_per_batch || 3,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        toast({
          title: `Generated ${data.summary?.successful || 0} stories`,
          status: 'success',
          duration: 3000,
        });
        fetchData();
      }
    } catch (error) {
      toast({ title: 'Pipeline run failed', status: 'error', duration: 3000 });
    }
  };

  const handleSaveSettings = async (updates: Partial<Settings>) => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/news/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        toast({ title: 'Settings saved', status: 'success', duration: 2000 });
      }
    } catch (error) {
      toast({ title: 'Failed to save settings', status: 'error', duration: 3000 });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Box minH="100vh" bg={bgBase} p={{ base: 2, md: 4 }}>
      <Flex justify="space-between" align="center" mb={4}>
        <HStack spacing={3}>
          <Icon as={FiFileText} boxSize={6} />
          <Heading size="md">News Studio</Heading>
          {pipelineStatus && (
            <Badge
              colorScheme={
                pipelineStatus.status === 'active' ? 'green' :
                pipelineStatus.status === 'paused' ? 'yellow' : 'gray'
              }
            >
              {pipelineStatus.status}
            </Badge>
          )}
        </HStack>
        
        <HStack spacing={2}>
          {pipelineStatus?.status === 'paused' ? (
            <Button leftIcon={<Icon as={FiPlay} />} colorScheme="green" size="sm" onClick={handleResume}>
              Resume
            </Button>
          ) : (
            <Button leftIcon={<Icon as={FiPause} />} variant="outline" size="sm" onClick={onPauseOpen}>
              Pause
            </Button>
          )}
          <Button leftIcon={<Icon as={FiPlay} />} colorScheme="blue" size="sm" onClick={handleRunNow}>
            Run Now
          </Button>
          <IconButton
            aria-label="Refresh"
            icon={<Icon as={FiRefreshCw} />}
            variant="ghost"
            size="sm"
            onClick={fetchData}
            isLoading={isLoading}
          />
        </HStack>
      </Flex>

      {pipelineStatus && (
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={4}>
          <Box bg={bgCard} p={3} borderRadius="lg" borderWidth="1px" borderColor={borderSubtle}>
            <Text fontSize="xs" color={textSecondary}>Stories Today</Text>
            <Text fontSize="2xl" fontWeight="bold">{pipelineStatus.stories_today}</Text>
            <HStack fontSize="xs" color={textSecondary}>
              <Icon as={FiClock} />
              <Text>Next: {pipelineStatus.next_run 
                ? new Date(pipelineStatus.next_run).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'N/A'}</Text>
            </HStack>
          </Box>
          
          <Box bg={bgCard} p={3} borderRadius="lg" borderWidth="1px" borderColor={borderSubtle}>
            <Text fontSize="xs" color={textSecondary}>Cost Today</Text>
            <Text fontSize="2xl" fontWeight="bold">${pipelineStatus.cost_today.toFixed(2)}</Text>
            <HStack fontSize="xs" color={textSecondary}>
              <Icon as={FiDollarSign} />
              <Text>Max: ${settings?.pipeline.max_daily_cost || 5}</Text>
            </HStack>
          </Box>
          
          <Box bg={bgCard} p={3} borderRadius="lg" borderWidth="1px" borderColor={borderSubtle}>
            <Text fontSize="xs" color={textSecondary}>Last Run</Text>
            <Text fontSize="2xl" fontWeight="bold">
              {pipelineStatus.last_run?.story_count || 0} stories
            </Text>
            <Text fontSize="xs" color={textSecondary}>
              {pipelineStatus.last_run?.time
                ? new Date(pipelineStatus.last_run.time).toLocaleString()
                : 'Never'}
            </Text>
          </Box>
          
          <Box bg={bgCard} p={3} borderRadius="lg" borderWidth="1px" borderColor={borderSubtle}>
            <Text fontSize="xs" color={textSecondary}>Errors (24h)</Text>
            <Text fontSize="2xl" fontWeight="bold" color={pipelineStatus.errors_last_24h > 0 ? 'red.500' : 'green.500'}>
              {pipelineStatus.errors_last_24h}
            </Text>
            <HStack fontSize="xs" color={textSecondary}>
              {pipelineStatus.errors_last_24h === 0 ? (
                <><Icon as={FiCheckCircle} /><Text>All clear</Text></>
              ) : (
                <><Icon as={FiAlertCircle} /><Text>Check logs</Text></>
              )}
            </HStack>
          </Box>
        </SimpleGrid>
      )}

      <Box bg={bgCard} borderRadius="lg" borderWidth="1px" borderColor={borderSubtle}>
        <Tabs index={activeTab} onChange={setActiveTab}>
          <TabList px={4} pt={2}>
            <Tab><HStack><Icon as={FiFileText} /><Text>Stories</Text></HStack></Tab>
            <Tab><HStack><Icon as={FiPackage} /><Text>Batches</Text></HStack></Tab>
            <Tab><HStack><Icon as={FiSettings} /><Text>Settings</Text></HStack></Tab>
            <Tab><HStack><Icon as={FiBarChart2} /><Text>Analytics</Text></HStack></Tab>
          </TabList>

          <TabPanels>
            <TabPanel p={0}>
              {isLoading ? (
                <Flex justify="center" py={8}><Spinner /></Flex>
              ) : stories.length === 0 ? (
                <Box p={4}>
                  <Alert status="info"><AlertIcon />No stories generated yet. Click "Run Now" to generate stories.</Alert>
                </Box>
              ) : (
                <StoriesGrid 
                  stories={stories}
                  selectedStory={selectedStory}
                  onSelectStory={setSelectedStory}
                  onRefresh={fetchData}
                />
              )}
            </TabPanel>

            <TabPanel>
              {isLoading ? (
                <Flex justify="center" py={8}><Spinner /></Flex>
              ) : batches.length === 0 ? (
                <Alert status="info"><AlertIcon />No batches created yet.</Alert>
              ) : (
                <VStack spacing={3} align="stretch">
                  {batches.map((batch) => (
                    <Box key={batch.id} p={3} borderWidth="1px" borderRadius="md" borderColor={borderSubtle}>
                      <Flex justify="space-between" align="center">
                        <Box>
                          <HStack mb={1}>
                            <Badge colorScheme={batch.edition === 'morning' ? 'orange' : 'blue'}>{batch.edition}</Badge>
                            <Text fontWeight="bold">{new Date(batch.batch_date).toLocaleDateString()}</Text>
                          </HStack>
                          <Text fontSize="sm" color={textSecondary}>{batch.story_count} stories</Text>
                        </Box>
                        <Badge colorScheme={batch.status === 'published' ? 'green' : 'gray'}>{batch.status}</Badge>
                      </Flex>
                    </Box>
                  ))}
                </VStack>
              )}
            </TabPanel>

            <TabPanel>
              {settings ? (
                <SettingsPanel settings={settings} onSave={handleSaveSettings} isSaving={isSaving} />
              ) : (
                <Flex justify="center" py={8}><Spinner /></Flex>
              )}
            </TabPanel>

            <TabPanel>
              <VStack spacing={4} align="stretch">
                <Heading size="sm">Stories by Category</Heading>
                <SimpleGrid columns={{ base: 2, md: 3 }} spacing={3}>
                  {Object.entries(stories.reduce((acc, story) => {
                    acc[story.category] = (acc[story.category] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)).map(([category, count]) => (
                    <Box key={category} p={3} borderWidth="1px" borderRadius="md" borderColor={borderSubtle}>
                      <HStack justify="space-between">
                        <Badge colorScheme={getCategoryColor(category)}>{category}</Badge>
                        <Text fontWeight="bold">{count}</Text>
                      </HStack>
                    </Box>
                  ))}
                </SimpleGrid>
                <Alert status="info" mt={4}><AlertIcon />Detailed analytics coming soon.</Alert>
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>

      <PauseModal isOpen={isPauseOpen} onClose={onPauseClose} onPause={handlePause} />
    </Box>
  );
}

function StoriesGrid({ 
  stories, 
  selectedStory, 
  onSelectStory, 
  onRefresh 
}: { 
  stories: Story[]; 
  selectedStory: Story | null; 
  onSelectStory: (story: Story | null) => void; 
  onRefresh: () => void;
}) {
  const borderSubtle = useSemanticToken('border.subtle');
  const textSecondary = useSemanticToken('text.secondary');
  const selectedBg = useColorModeValue('blue.50', 'blue.900');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');

  return (
    <Grid templateColumns={{ base: '1fr', lg: selectedStory ? '380px 1fr' : '1fr' }} minH="500px">
      {/* Story List */}
      <GridItem 
        borderRightWidth={{ lg: selectedStory ? '1px' : '0' }} 
        borderColor={borderSubtle}
        maxH="calc(100vh - 300px)"
        overflowY="auto"
      >
        <VStack spacing={0} align="stretch">
          {stories.map((story) => (
            <Box 
              key={story.id} 
              p={3} 
              borderBottomWidth="1px" 
              borderColor={borderSubtle}
              bg={selectedStory?.id === story.id ? selectedBg : 'transparent'}
              cursor="pointer"
              onClick={() => onSelectStory(story)}
              _hover={{ bg: selectedStory?.id === story.id ? selectedBg : hoverBg }}
              transition="background 0.15s"
            >
              <HStack mb={1} spacing={2}>
                <Badge size="sm" colorScheme={getCategoryColor(story.category)}>{story.category}</Badge>
                <Badge size="sm" variant="outline" colorScheme={story.status === 'published' ? 'green' : story.status === 'ready' ? 'blue' : 'gray'}>
                  {story.status}
                </Badge>
                {story.audio_url && <Icon as={FiVolume2} color="green.500" boxSize={3} />}
              </HStack>
              <Text fontWeight="semibold" fontSize="sm" noOfLines={2} mb={1}>
                {story.headline || story.title}
              </Text>
              <HStack fontSize="xs" color={textSecondary} spacing={3}>
                <Text>{story.word_count} words</Text>
                <Text>•</Text>
                <Text>{story.reading_time_minutes} min read</Text>
                <Text>•</Text>
                <Text>{new Date(story.created_at).toLocaleDateString()}</Text>
              </HStack>
            </Box>
          ))}
        </VStack>
      </GridItem>

      {/* Story Detail View */}
      {selectedStory && (
        <GridItem p={4} maxH="calc(100vh - 300px)" overflowY="auto">
          <InlineStoryView 
            story={selectedStory} 
            onClose={() => onSelectStory(null)}
            onRefresh={onRefresh}
          />
        </GridItem>
      )}

      {/* Empty state when no story selected on large screens */}
      {!selectedStory && (
        <GridItem display={{ base: 'none', lg: 'flex' }} alignItems="center" justifyContent="center" p={8}>
          <VStack spacing={3} color={textSecondary}>
            <Icon as={FiFileText} boxSize={12} opacity={0.3} />
            <Text>Select a story to view details</Text>
          </VStack>
        </GridItem>
      )}
    </Grid>
  );
}

function InlineStoryView({ story, onClose, onRefresh }: { story: Story; onClose: () => void; onRefresh: () => void }) {
  const toast = useToast();
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [localAudioUrl, setLocalAudioUrl] = useState<string | null>(story.audio_url || null);
  const [audioDuration, setAudioDuration] = useState<number | null>(story.audio_duration_seconds || null);
  
  const bgCard = useSemanticToken('surface.card');
  const borderSubtle = useSemanticToken('border.subtle');
  const textSecondary = useSemanticToken('text.secondary');

  const handleGenerateAudio = async () => {
    setIsGeneratingAudio(true);
    setAudioProgress(10);
    
    try {
      // Use the dedicated news story audio generation endpoint
      const res = await fetch(`/api/news/stories/${story.id}/generate-audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voice: 'american_male_anchor',
          speed: 1.0,
        }),
      });
      
      setAudioProgress(70);
      
      if (res.ok) {
        const data = await res.json();
        setAudioProgress(100);
        // Update local state immediately so player appears
        setLocalAudioUrl(data.audioUrl);
        setAudioDuration(data.durationSeconds);
        toast({ title: 'Audio generated successfully', description: `Duration: ${data.durationSeconds}s`, status: 'success', duration: 3000 });
        onRefresh();
      } else {
        const error = await res.json();
        toast({ title: 'Audio generation failed', description: error.message || 'Unknown error', status: 'error', duration: 4000 });
      }
    } catch (error) {
      console.error('Audio generation error:', error);
      toast({ title: 'Audio generation failed', description: error instanceof Error ? error.message : 'Network error', status: 'error', duration: 3000 });
    } finally {
      setIsGeneratingAudio(false);
      setAudioProgress(0);
    }
  };

  const handleCopyToClipboard = async () => {
    const text = `# ${story.headline || story.title}\n\n${story.summary}\n\n${story.full_narrative}`;
    await navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard', status: 'success', duration: 2000 });
  };

  const handleDownloadMarkdown = () => {
    const content = `# ${story.headline || story.title}\n\n**Category:** ${story.category}\n**Style:** ${story.style_guide}\n**Word Count:** ${story.word_count}\n**Reading Time:** ${story.reading_time_minutes} minutes\n\n---\n\n## Summary\n\n${story.summary}\n\n---\n\n${story.full_narrative}\n\n---\n\n## Sources\n\n${story.citations?.map((c, i) => `${i + 1}. [${c.title}](${c.url})`).join('\n') || 'No citations available'}`;
    
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${story.headline || story.title}.md`.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <VStack align="stretch" spacing={4}>
      {/* Header */}
      <Flex justify="space-between" align="start">
        <Box flex={1}>
          <HStack mb={2} spacing={2}>
            <Badge colorScheme={getCategoryColor(story.category)}>{story.category}</Badge>
            <Badge variant="outline">{story.style_guide}</Badge>
            <Badge colorScheme={story.status === 'published' ? 'green' : story.status === 'ready' ? 'blue' : 'gray'}>
              {story.status}
            </Badge>
          </HStack>
          <Heading size="md" mb={2}>{story.headline || story.title}</Heading>
          <HStack fontSize="sm" color={textSecondary} spacing={4} flexWrap="wrap">
            <Text>{story.word_count} words</Text>
            <Text>•</Text>
            <Text>{story.reading_time_minutes} min read</Text>
            <Text>•</Text>
            <Text>{new Date(story.created_at).toLocaleString()}</Text>
          </HStack>
        </Box>
        <IconButton
          aria-label="Close"
          icon={<Icon as={FiChevronLeft} />}
          variant="ghost"
          size="sm"
          onClick={onClose}
          display={{ base: 'flex', lg: 'none' }}
        />
      </Flex>

      {/* Audio Player */}
      {localAudioUrl && (
        <Box 
          p={3} 
          bg="green.50" 
          borderRadius="md" 
          border="1px solid" 
          borderColor="green.200"
        >
          <HStack spacing={3} mb={2}>
            <Icon as={FiVolume2} color="green.600" />
            <Text fontSize="sm" fontWeight="medium" color="green.700">
              Audio Ready {audioDuration ? `(${Math.floor(audioDuration / 60)}:${String(audioDuration % 60).padStart(2, '0')})` : ''}
            </Text>
          </HStack>
          <audio 
            controls 
            src={localAudioUrl} 
            style={{ width: '100%', height: '40px' }}
          />
        </Box>
      )}

      {/* Action Buttons */}
      <HStack spacing={2} flexWrap="wrap">
        {!localAudioUrl && (
          <Button
            leftIcon={<Icon as={FiVolume2} />}
            size="sm"
            colorScheme="blue"
            onClick={handleGenerateAudio}
            isLoading={isGeneratingAudio}
            loadingText="Generating..."
          >
            Generate Audio
          </Button>
        )}
        {localAudioUrl && (
          <Button
            leftIcon={<Icon as={FiVolume2} />}
            size="sm"
            variant="outline"
            colorScheme="blue"
            onClick={handleGenerateAudio}
            isLoading={isGeneratingAudio}
            loadingText="Regenerating..."
          >
            Regenerate Audio
          </Button>
        )}
        <Tooltip label="Copy to clipboard">
          <IconButton
            aria-label="Copy"
            icon={<Icon as={FiCopy} />}
            size="sm"
            variant="outline"
            onClick={handleCopyToClipboard}
          />
        </Tooltip>
        <Tooltip label="Download as Markdown">
          <IconButton
            aria-label="Download"
            icon={<Icon as={FiDownload} />}
            size="sm"
            variant="outline"
            onClick={handleDownloadMarkdown}
          />
        </Tooltip>
      </HStack>

      {isGeneratingAudio && (
        <Progress value={audioProgress} size="sm" colorScheme="blue" borderRadius="full" />
      )}

      <Divider />

      {/* Summary */}
      <Box>
        <Text fontWeight="semibold" fontSize="sm" color={textSecondary} mb={1}>Summary</Text>
        <Text fontSize="md" fontStyle="italic" color="gray.600" lineHeight="tall">
          {story.summary}
        </Text>
      </Box>

      <Divider />

      {/* Full Article */}
      <Box>
        <Text fontWeight="semibold" fontSize="sm" color={textSecondary} mb={3}>Full Article</Text>
        <Box fontSize="md" lineHeight="1.8">
          {renderFormattedText(story.full_narrative)}
        </Box>
      </Box>

      {/* Citations */}
      {story.citations && story.citations.length > 0 && (
        <>
          <Divider />
          <Box>
            <Text fontWeight="semibold" fontSize="sm" color={textSecondary} mb={2}>
              Sources ({story.citations.length})
            </Text>
            <VStack align="stretch" spacing={2}>
              {story.citations.map((citation, idx) => (
                <HStack key={idx} fontSize="sm" spacing={2}>
                  <Badge size="sm" colorScheme="gray">{idx + 1}</Badge>
                  <Link href={citation.url} isExternal color="blue.500" noOfLines={1}>
                    {citation.title || citation.url}
                    <Icon as={FiExternalLink} ml={1} boxSize={3} />
                  </Link>
                </HStack>
              ))}
            </VStack>
          </Box>
        </>
      )}
    </VStack>
  );
}

function SettingsPanel({ settings, onSave, isSaving }: { settings: Settings; onSave: (u: Partial<Settings>) => void; isSaving: boolean }) {
  const [localSettings, setLocalSettings] = useState(settings);

  const handleChange = (path: string, value: any) => {
    const keys = path.split('.');
    const newSettings = JSON.parse(JSON.stringify(localSettings));
    let current: any = newSettings;
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    setLocalSettings(newSettings);
  };

  return (
    <VStack spacing={6} align="stretch">
      <Box>
        <Heading size="sm" mb={3}>Schedule</Heading>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          <FormControl display="flex" alignItems="center">
            <FormLabel mb={0}>Morning Edition (6 AM)</FormLabel>
            <Switch isChecked={localSettings.pipeline.schedule.morning.enabled} onChange={(e) => handleChange('pipeline.schedule.morning.enabled', e.target.checked)} />
          </FormControl>
          <FormControl display="flex" alignItems="center">
            <FormLabel mb={0}>Afternoon Edition (2 PM)</FormLabel>
            <Switch isChecked={localSettings.pipeline.schedule.afternoon.enabled} onChange={(e) => handleChange('pipeline.schedule.afternoon.enabled', e.target.checked)} />
          </FormControl>
        </SimpleGrid>
      </Box>

      <Divider />

      <Box>
        <Heading size="sm" mb={3}>Stories per Batch: {localSettings.pipeline.stories_per_batch}</Heading>
        <Slider value={localSettings.pipeline.stories_per_batch} min={1} max={10} step={1} onChange={(val) => handleChange('pipeline.stories_per_batch', val)}>
          <SliderTrack><SliderFilledTrack /></SliderTrack>
          <SliderThumb />
        </Slider>
      </Box>

      <Divider />

      <Box>
        <Heading size="sm" mb={3}>Categories</Heading>
        <Wrap spacing={3}>
          {CATEGORIES.map((cat) => (
            <WrapItem key={cat.value}>
              <Checkbox
                isChecked={localSettings.pipeline.categories.includes(cat.value)}
                onChange={(e) => {
                  const cats = e.target.checked
                    ? [...localSettings.pipeline.categories, cat.value]
                    : localSettings.pipeline.categories.filter((c) => c !== cat.value);
                  handleChange('pipeline.categories', cats);
                }}
              >
                <Badge colorScheme={cat.color}>{cat.label}</Badge>
              </Checkbox>
            </WrapItem>
          ))}
        </Wrap>
      </Box>

      <Divider />

      <Box>
        <Heading size="sm" mb={3}>Composition</Heading>
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
          <FormControl>
            <FormLabel>Tone</FormLabel>
            <Select value={localSettings.composition.tone} onChange={(e) => handleChange('composition.tone', e.target.value)}>
              <option value="analytical">Analytical</option>
              <option value="conversational">Conversational</option>
              <option value="formal">Formal</option>
              <option value="narrative">Narrative</option>
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Complexity</FormLabel>
            <Select value={localSettings.composition.complexity} onChange={(e) => handleChange('composition.complexity', e.target.value)}>
              <option value="executive">Executive Summary</option>
              <option value="detailed">Detailed Analysis</option>
              <option value="technical">Technical Deep Dive</option>
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Reading Level</FormLabel>
            <Select value={localSettings.composition.reading_level} onChange={(e) => handleChange('composition.reading_level', e.target.value)}>
              <option value="general">General Audience</option>
              <option value="college">College Level</option>
              <option value="graduate">Graduate Level</option>
              <option value="expert">Expert</option>
            </Select>
          </FormControl>
        </SimpleGrid>
      </Box>

      <Divider />

      <Box>
        <Heading size="sm" mb={3}>Analytical Frameworks</Heading>
        <FormControl display="flex" alignItems="center" mb={3}>
          <FormLabel mb={0}>Enable Frameworks</FormLabel>
          <Switch isChecked={localSettings.composition.frameworks_enabled} onChange={(e) => handleChange('composition.frameworks_enabled', e.target.checked)} />
        </FormControl>
        {localSettings.composition.frameworks_enabled && (
          <Accordion allowMultiple>
            {Object.entries(FRAMEWORKS).map(([category, frameworks]) => (
              <AccordionItem key={category}>
                <AccordionButton>
                  <Box flex="1" textAlign="left" fontWeight="medium">
                    {category.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </Box>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel>
                  <Wrap spacing={2}>
                    {frameworks.map((fw) => (
                      <WrapItem key={fw.id}>
                        <Tag
                          size="md"
                          variant={localSettings.composition.preferred_frameworks.includes(fw.id) ? 'solid' : 'outline'}
                          colorScheme="blue"
                          cursor="pointer"
                          onClick={() => {
                            const prefs = localSettings.composition.preferred_frameworks.includes(fw.id)
                              ? localSettings.composition.preferred_frameworks.filter((f) => f !== fw.id)
                              : [...localSettings.composition.preferred_frameworks, fw.id];
                            handleChange('composition.preferred_frameworks', prefs);
                          }}
                        >
                          <TagLabel>{fw.name}</TagLabel>
                        </Tag>
                      </WrapItem>
                    ))}
                  </Wrap>
                </AccordionPanel>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </Box>

      <Divider />

      {/* Voice Settings */}
      <Box>
        <HStack mb={3}>
          <Icon as={FiVolume2} />
          <Heading size="sm">Voice & Audio</Heading>
        </HStack>
        <VoiceSettingsPanel
          config={localSettings.voice || DEFAULT_VOICE_CONFIG}
          onChange={(voiceConfig) => handleChange('voice', voiceConfig)}
        />
      </Box>

      <Button colorScheme="blue" onClick={() => onSave(localSettings)} isLoading={isSaving}>Save Settings</Button>
    </VStack>
  );
}

function PauseModal({ isOpen, onClose, onPause }: { isOpen: boolean; onClose: () => void; onPause: (r?: string, u?: string) => void }) {
  const [reason, setReason] = useState('');
  const [until, setUntil] = useState('');

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Pause Pipeline</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            <FormControl>
              <FormLabel>Reason (optional)</FormLabel>
              <Input placeholder="e.g., Maintenance, Testing..." value={reason} onChange={(e) => setReason(e.target.value)} />
            </FormControl>
            <FormControl>
              <FormLabel>Resume at (optional)</FormLabel>
              <Input type="datetime-local" value={until} onChange={(e) => setUntil(e.target.value)} />
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>Cancel</Button>
          <Button colorScheme="orange" onClick={() => onPause(reason || undefined, until ? new Date(until).toISOString() : undefined)}>Pause Pipeline</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default function NewsStudioPage() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <Head>
        <title>News Studio | AI Homelab Dashboard</title>
      </Head>
      
      <DashboardLayout>
        {mounted && <NewsStudioContent />}
      </DashboardLayout>
    </>
  );
}
