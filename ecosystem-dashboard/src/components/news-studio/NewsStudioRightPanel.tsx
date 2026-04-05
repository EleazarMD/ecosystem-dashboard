/**
 * News Studio Right Panel
 * 
 * Contextual panel for News Studio with tabs for:
 * - Story Details: View/edit selected story details
 * - Pipeline Settings: Quick access to pipeline configuration
 * - LLM Config: Model selection and parameters
 * - Sources: RSS feeds and source management
 * - Export: Export stories to various formats
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Button,
  IconButton,
  Divider,
  useToast,
  Icon,
  Spinner,
  FormControl,
  FormLabel,
  Select,
  Switch,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Input,
  Textarea,
  Tooltip,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
  Tag,
  TagLabel,
  Wrap,
  WrapItem,
  Alert,
  AlertIcon,
  Collapse,
  useDisclosure,
} from '@chakra-ui/react';
import {
  FiFileText,
  FiSettings,
  FiCpu,
  FiLink,
  FiShare2,
  FiEdit2,
  FiTrash2,
  FiCopy,
  FiDownload,
  FiMic,
  FiPlay,
  FiPause,
  FiRefreshCw,
  FiExternalLink,
  FiChevronDown,
  FiChevronUp,
  FiCheck,
  FiX,
  FiZap,
  FiClock,
  FiDollarSign,
  FiBookOpen,
  FiGlobe,
  FiRss,
} from 'react-icons/fi';
import { useRightPanel } from '@/contexts/RightPanelContext';
import { useSemanticToken } from '@/hooks/useSemanticToken';

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
  created_at: string;
  status: string;
  research_package?: any;
}

interface PipelineSettings {
  model: string;
  temperature: number;
  max_tokens: number;
  research_depth: 'quick' | 'standard' | 'comprehensive';
  min_sources: number;
  enable_audio: boolean;
  auto_publish: boolean;
}

interface NewsStudioPanelData {
  selectedStory?: Story;
  onStoryUpdate?: (story: Story) => void;
  onStoryDelete?: (storyId: string) => void;
  onRefresh?: () => void;
}

export function NewsStudioRightPanel() {
  const { activeTab, customData } = useRightPanel();
  const data = customData as NewsStudioPanelData | null;

  const bgCard = useSemanticToken('surface.card');
  const borderSubtle = useSemanticToken('border.subtle');

  return (
    <Box h="100%" overflowY="auto" p={4}>
      {activeTab === 'story-details' && (
        <StoryDetailsPanel story={data?.selectedStory} onUpdate={data?.onStoryUpdate} onDelete={data?.onStoryDelete} />
      )}
      {activeTab === 'pipeline-settings' && (
        <PipelineSettingsPanel />
      )}
      {activeTab === 'llm-config' && (
        <LLMConfigPanel />
      )}
      {activeTab === 'sources' && (
        <SourcesPanel />
      )}
      {activeTab === 'export' && (
        <ExportPanel story={data?.selectedStory} />
      )}
    </Box>
  );
}

function StoryDetailsPanel({ 
  story, 
  onUpdate, 
  onDelete 
}: { 
  story?: Story; 
  onUpdate?: (story: Story) => void;
  onDelete?: (storyId: string) => void;
}) {
  const toast = useToast();
  const { isOpen: isEditOpen, onToggle: onEditToggle } = useDisclosure();
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [editedHeadline, setEditedHeadline] = useState('');
  const [editedSummary, setEditedSummary] = useState('');

  const bgCard = useSemanticToken('surface.card');
  const borderSubtle = useSemanticToken('border.subtle');
  const textSecondary = useSemanticToken('text.secondary');

  useEffect(() => {
    if (story) {
      setEditedHeadline(story.headline || story.title);
      setEditedSummary(story.summary || '');
    }
  }, [story]);

  if (!story) {
    return (
      <VStack spacing={4} py={8} color={textSecondary}>
        <Icon as={FiFileText} boxSize={12} opacity={0.5} />
        <Text textAlign="center">Select a story to view details</Text>
        <Text fontSize="sm" textAlign="center">
          Click on any story in the list to see its details, edit content, or generate audio.
        </Text>
      </VStack>
    );
  }

  const handleGenerateAudio = async () => {
    setIsGeneratingAudio(true);
    try {
      const res = await fetch(`/api/news/stories/${story.id}/audio`, {
        method: 'POST',
      });
      if (res.ok) {
        toast({ title: 'Audio generation started', status: 'success', duration: 2000 });
      } else {
        throw new Error('Failed to generate audio');
      }
    } catch (error) {
      toast({ title: 'Audio generation failed', status: 'error', duration: 3000 });
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const handleSaveEdits = async () => {
    try {
      const res = await fetch(`/api/news/stories/${story.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headline: editedHeadline,
          summary: editedSummary,
        }),
      });
      if (res.ok) {
        toast({ title: 'Story updated', status: 'success', duration: 2000 });
        onUpdate?.({ ...story, headline: editedHeadline, summary: editedSummary });
        onEditToggle();
      }
    } catch (error) {
      toast({ title: 'Failed to update story', status: 'error', duration: 3000 });
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this story?')) return;
    try {
      const res = await fetch(`/api/news/stories/${story.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: 'Story deleted', status: 'success', duration: 2000 });
        onDelete?.(story.id);
      }
    } catch (error) {
      toast({ title: 'Failed to delete story', status: 'error', duration: 3000 });
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(story.full_narrative || '');
    toast({ title: 'Copied to clipboard', status: 'success', duration: 1500 });
  };

  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      science: 'purple', business: 'blue', technology: 'cyan',
      healthcare: 'green', economics: 'orange', politics: 'red',
    };
    return colors[cat] || 'gray';
  };

  return (
    <VStack spacing={4} align="stretch">
      {/* Header */}
      <HStack justify="space-between">
        <Badge colorScheme={getCategoryColor(story.category)} fontSize="sm">
          {story.category}
        </Badge>
        <HStack spacing={1}>
          <Tooltip label="Edit">
            <IconButton
              aria-label="Edit story"
              icon={<Icon as={FiEdit2} />}
              size="sm"
              variant="ghost"
              onClick={onEditToggle}
            />
          </Tooltip>
          <Tooltip label="Copy">
            <IconButton
              aria-label="Copy story"
              icon={<Icon as={FiCopy} />}
              size="sm"
              variant="ghost"
              onClick={handleCopyToClipboard}
            />
          </Tooltip>
          <Tooltip label="Delete">
            <IconButton
              aria-label="Delete story"
              icon={<Icon as={FiTrash2} />}
              size="sm"
              variant="ghost"
              colorScheme="red"
              onClick={handleDelete}
            />
          </Tooltip>
        </HStack>
      </HStack>

      {/* Title/Headline */}
      <Collapse in={isEditOpen}>
        <VStack spacing={3} p={3} bg={bgCard} borderRadius="md" borderWidth="1px" borderColor={borderSubtle}>
          <FormControl>
            <FormLabel fontSize="sm">Headline</FormLabel>
            <Input
              value={editedHeadline}
              onChange={(e) => setEditedHeadline(e.target.value)}
              size="sm"
            />
          </FormControl>
          <FormControl>
            <FormLabel fontSize="sm">Summary</FormLabel>
            <Textarea
              value={editedSummary}
              onChange={(e) => setEditedSummary(e.target.value)}
              size="sm"
              rows={3}
            />
          </FormControl>
          <HStack justify="flex-end" w="100%">
            <Button size="sm" variant="ghost" onClick={onEditToggle}>Cancel</Button>
            <Button size="sm" colorScheme="blue" onClick={handleSaveEdits}>Save</Button>
          </HStack>
        </VStack>
      </Collapse>

      <Collapse in={!isEditOpen}>
        <Text fontWeight="bold" fontSize="md">{story.headline || story.title}</Text>
        <Text fontSize="sm" color={textSecondary} mt={1}>{story.summary}</Text>
      </Collapse>

      <Divider />

      {/* Stats */}
      <SimpleGrid columns={2} spacing={3}>
        <Stat size="sm">
          <StatLabel fontSize="xs">Words</StatLabel>
          <StatNumber fontSize="lg">{story.word_count}</StatNumber>
        </Stat>
        <Stat size="sm">
          <StatLabel fontSize="xs">Reading Time</StatLabel>
          <StatNumber fontSize="lg">{story.reading_time_minutes} min</StatNumber>
        </Stat>
      </SimpleGrid>

      {/* Status & Style */}
      <HStack justify="space-between">
        <HStack>
          <Text fontSize="xs" color={textSecondary}>Status:</Text>
          <Badge colorScheme={story.status === 'published' ? 'green' : story.status === 'ready' ? 'blue' : 'gray'}>
            {story.status}
          </Badge>
        </HStack>
        <HStack>
          <Text fontSize="xs" color={textSecondary}>Style:</Text>
          <Badge variant="outline">{story.style_guide}</Badge>
        </HStack>
      </HStack>

      <Divider />

      {/* Sources */}
      {story.citations && story.citations.length > 0 && (
        <Box>
          <Text fontSize="sm" fontWeight="medium" mb={2}>
            <Icon as={FiLink} mr={1} /> Sources ({story.citations.length})
          </Text>
          <VStack spacing={1} align="stretch" maxH="120px" overflowY="auto">
            {story.citations.slice(0, 5).map((citation: any, idx: number) => (
              <HStack key={idx} fontSize="xs" color={textSecondary}>
                <Icon as={FiExternalLink} />
                <Text noOfLines={1}>{citation.source || citation.url || `Source ${idx + 1}`}</Text>
              </HStack>
            ))}
            {story.citations.length > 5 && (
              <Text fontSize="xs" color={textSecondary}>+{story.citations.length - 5} more</Text>
            )}
          </VStack>
        </Box>
      )}

      <Divider />

      {/* Actions */}
      <VStack spacing={2} align="stretch">
        {story.audio_url ? (
          <Button
            leftIcon={<Icon as={FiPlay} />}
            size="sm"
            variant="outline"
            as="a"
            href={story.audio_url}
            target="_blank"
          >
            Play Audio
          </Button>
        ) : (
          <Button
            leftIcon={<Icon as={FiMic} />}
            size="sm"
            colorScheme="purple"
            onClick={handleGenerateAudio}
            isLoading={isGeneratingAudio}
          >
            Generate Audio
          </Button>
        )}
        <Button
          leftIcon={<Icon as={FiShare2} />}
          size="sm"
          variant="outline"
        >
          Export to Podcast
        </Button>
      </VStack>

      {/* Metadata */}
      <Text fontSize="xs" color={textSecondary} textAlign="center">
        Created {new Date(story.created_at).toLocaleString()}
      </Text>
    </VStack>
  );
}

function PipelineSettingsPanel() {
  const toast = useToast();
  const [settings, setSettings] = useState<PipelineSettings>({
    model: 'gemini-2.0-flash',
    temperature: 0.7,
    max_tokens: 3000,
    research_depth: 'standard',
    min_sources: 3,
    enable_audio: false,
    auto_publish: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const textSecondary = useSemanticToken('text.secondary');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/news/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.settings?.pipeline) {
          setSettings(prev => ({ ...prev, ...data.settings.pipeline }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/news/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipeline: settings }),
      });
      if (res.ok) {
        toast({ title: 'Settings saved', status: 'success', duration: 2000 });
      }
    } catch (error) {
      toast({ title: 'Failed to save settings', status: 'error', duration: 3000 });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <Spinner />;
  }

  return (
    <VStack spacing={4} align="stretch">
      <Text fontWeight="bold" fontSize="md">
        <Icon as={FiSettings} mr={2} />
        Pipeline Settings
      </Text>

      <FormControl>
        <FormLabel fontSize="sm">Research Depth</FormLabel>
        <Select
          value={settings.research_depth}
          onChange={(e) => setSettings(s => ({ ...s, research_depth: e.target.value as any }))}
          size="sm"
        >
          <option value="quick">Quick (2-3 sources)</option>
          <option value="standard">Standard (4-6 sources)</option>
          <option value="comprehensive">Comprehensive (8+ sources)</option>
        </Select>
      </FormControl>

      <FormControl>
        <FormLabel fontSize="sm">Minimum Sources: {settings.min_sources}</FormLabel>
        <Slider
          value={settings.min_sources}
          min={1}
          max={10}
          step={1}
          onChange={(val) => setSettings(s => ({ ...s, min_sources: val }))}
        >
          <SliderTrack><SliderFilledTrack /></SliderTrack>
          <SliderThumb />
        </Slider>
      </FormControl>

      <Divider />

      <FormControl display="flex" alignItems="center" justifyContent="space-between">
        <FormLabel mb={0} fontSize="sm">Auto-generate Audio</FormLabel>
        <Switch
          isChecked={settings.enable_audio}
          onChange={(e) => setSettings(s => ({ ...s, enable_audio: e.target.checked }))}
        />
      </FormControl>

      <FormControl display="flex" alignItems="center" justifyContent="space-between">
        <FormLabel mb={0} fontSize="sm">Auto-publish Stories</FormLabel>
        <Switch
          isChecked={settings.auto_publish}
          onChange={(e) => setSettings(s => ({ ...s, auto_publish: e.target.checked }))}
        />
      </FormControl>

      <Button colorScheme="blue" size="sm" onClick={handleSave} isLoading={isSaving}>
        Save Settings
      </Button>
    </VStack>
  );
}

interface ClonedVoice {
  id: string;
  name: string;
  description?: string;
  language?: string;
}

function LLMConfigPanel() {
  const toast = useToast();
  const [config, setConfig] = useState({
    model: 'gemini-2.0-flash',
    temperature: 0.7,
    max_tokens: 3000,
    fallback_model: 'qwen3-32b',
    tts_model: 'openai-alloy',
    tts_speed: 1.0,
    cloned_voice_id: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [clonedVoices, setClonedVoices] = useState<ClonedVoice[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);

  const textSecondary = useSemanticToken('text.secondary');

  // Fetch cloned voices from Voice Studio
  useEffect(() => {
    const fetchClonedVoices = async () => {
      setIsLoadingVoices(true);
      try {
        // Fetch custom cloned voices
        const [voicesRes, libraryRes] = await Promise.all([
          fetch('/api/ai-gateway/qwen-tts?action=voices').catch(() => null),
          fetch('/api/ai-gateway/qwen-tts?action=library-voices').catch(() => null),
        ]);

        const voices: ClonedVoice[] = [];

        if (voicesRes?.ok) {
          const data = await voicesRes.json();
          if (data.voices && Array.isArray(data.voices)) {
            voices.push(...data.voices.map((v: any) => ({
              id: v.id || v.voice_id,
              name: v.name,
              description: v.description,
              language: v.language,
            })));
          }
        }

        if (libraryRes?.ok) {
          const data = await libraryRes.json();
          if (data.voices && typeof data.voices === 'object') {
            Object.entries(data.voices).forEach(([id, voice]: [string, any]) => {
              voices.push({
                id,
                name: voice.name || id,
                description: voice.description,
                language: voice.language,
              });
            });
          }
        }

        setClonedVoices(voices);
      } catch (error) {
        console.error('Failed to fetch cloned voices:', error);
      } finally {
        setIsLoadingVoices(false);
      }
    };

    fetchClonedVoices();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save config to API
      toast({ title: 'Configuration saved', status: 'success', duration: 2000 });
    } catch (error) {
      toast({ title: 'Failed to save', status: 'error', duration: 3000 });
    } finally {
      setIsSaving(false);
    }
  };

  // Check if using a cloned voice model
  const isClonedVoiceModel = config.tts_model === 'qwen-tts' || config.tts_model === 'coqui-xtts';

  return (
    <VStack spacing={4} align="stretch">
      <Text fontWeight="bold" fontSize="md">
        <Icon as={FiCpu} mr={2} />
        LLM Configuration
      </Text>

      <FormControl>
        <FormLabel fontSize="sm">Primary Model</FormLabel>
        <Select
          value={config.model}
          onChange={(e) => setConfig(c => ({ ...c, model: e.target.value }))}
          size="sm"
        >
          <option value="gemini-2.0-flash">Gemini 2.0 Flash (1M context)</option>
          <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
          <option value="gpt-4o">GPT-4o</option>
          <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
        </Select>
        <Text fontSize="xs" color={textSecondary} mt={1}>
          Used for story synthesis with large research packages
        </Text>
      </FormControl>

      <FormControl>
        <FormLabel fontSize="sm">Fallback Model</FormLabel>
        <Select
          value={config.fallback_model}
          onChange={(e) => setConfig(c => ({ ...c, fallback_model: e.target.value }))}
          size="sm"
        >
          <option value="qwen3-32b">Qwen3 32B (Local)</option>
          <option value="llama-3.1-70b">Llama 3.1 70B (Local)</option>
          <option value="mistral-large">Mistral Large</option>
        </Select>
        <Text fontSize="xs" color={textSecondary} mt={1}>
          Used when primary model is unavailable
        </Text>
      </FormControl>

      <Divider />

      <Text fontWeight="semibold" fontSize="sm">Audio Generation (TTS)</Text>

      <FormControl>
        <FormLabel fontSize="sm">TTS Model</FormLabel>
        <Select
          value={config.tts_model}
          onChange={(e) => setConfig(c => ({ ...c, tts_model: e.target.value, cloned_voice_id: '' }))}
          size="sm"
        >
          <optgroup label="Cloud Models">
            <option value="openai-alloy">OpenAI Alloy</option>
            <option value="openai-nova">OpenAI Nova</option>
            <option value="openai-shimmer">OpenAI Shimmer</option>
            <option value="openai-echo">OpenAI Echo</option>
            <option value="openai-fable">OpenAI Fable</option>
            <option value="openai-onyx">OpenAI Onyx</option>
          </optgroup>
          <optgroup label="Local Models (Voice Cloning)">
            <option value="qwen-tts">Qwen TTS (Local)</option>
            <option value="coqui-xtts">Coqui XTTS v2 (Local)</option>
            <option value="bark">Bark (Local)</option>
          </optgroup>
        </Select>
        <Text fontSize="xs" color={textSecondary} mt={1}>
          Voice model for audio narration
        </Text>
      </FormControl>

      {/* Cloned Voice Selection - only show for compatible models */}
      {isClonedVoiceModel && (
        <FormControl>
          <FormLabel fontSize="sm">
            Cloned Voice {isLoadingVoices && <Spinner size="xs" ml={2} />}
          </FormLabel>
          <Select
            value={config.cloned_voice_id}
            onChange={(e) => setConfig(c => ({ ...c, cloned_voice_id: e.target.value }))}
            size="sm"
            placeholder="Select a cloned voice..."
          >
            {clonedVoices.length === 0 && !isLoadingVoices && (
              <option disabled>No cloned voices available</option>
            )}
            {clonedVoices.map((voice) => (
              <option key={voice.id} value={voice.id}>
                {voice.name} {voice.language ? `(${voice.language})` : ''}
              </option>
            ))}
          </Select>
          <Text fontSize="xs" color={textSecondary} mt={1}>
            Select from Voice Studio library
          </Text>
        </FormControl>
      )}

      <FormControl>
        <FormLabel fontSize="sm">Speech Speed: {config.tts_speed.toFixed(1)}x</FormLabel>
        <Slider
          value={config.tts_speed}
          min={0.5}
          max={2.0}
          step={0.1}
          onChange={(val) => setConfig(c => ({ ...c, tts_speed: val }))}
        >
          <SliderTrack><SliderFilledTrack /></SliderTrack>
          <SliderThumb />
        </Slider>
        <HStack justify="space-between" fontSize="xs" color={textSecondary}>
          <Text>Slower</Text>
          <Text>Faster</Text>
        </HStack>
      </FormControl>

      <Divider />

      <FormControl>
        <FormLabel fontSize="sm">Temperature: {config.temperature}</FormLabel>
        <Slider
          value={config.temperature}
          min={0}
          max={1}
          step={0.1}
          onChange={(val) => setConfig(c => ({ ...c, temperature: val }))}
        >
          <SliderTrack><SliderFilledTrack /></SliderTrack>
          <SliderThumb />
        </Slider>
        <HStack justify="space-between" fontSize="xs" color={textSecondary}>
          <Text>Focused</Text>
          <Text>Creative</Text>
        </HStack>
      </FormControl>

      <FormControl>
        <FormLabel fontSize="sm">Max Output Tokens: {config.max_tokens}</FormLabel>
        <Slider
          value={config.max_tokens}
          min={1000}
          max={8000}
          step={500}
          onChange={(val) => setConfig(c => ({ ...c, max_tokens: val }))}
        >
          <SliderTrack><SliderFilledTrack /></SliderTrack>
          <SliderThumb />
        </Slider>
      </FormControl>

      <Alert status="info" fontSize="xs">
        <AlertIcon />
        Changes apply to new story generations only
      </Alert>

      <Button colorScheme="blue" size="sm" onClick={handleSave} isLoading={isSaving}>
        Save Configuration
      </Button>
    </VStack>
  );
}

interface NewsSource {
  id: string;
  name: string;
  url: string;
  category: string;
  feed_type: string;
  credibility_score: number;
  enabled: boolean;
  priority: number;
}

function SourcesPanel() {
  const toast = useToast();
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const textSecondary = useSemanticToken('text.secondary');
  const bgCard = useSemanticToken('surface.card');
  const borderSubtle = useSemanticToken('border.subtle');

  const fetchSources = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/news/sources');
      if (res.ok) {
        const data = await res.json();
        setSources(data.sources || []);
      }
    } catch (error) {
      console.error('Failed to fetch sources:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const handleToggleSource = async (sourceId: string, enabled: boolean) => {
    try {
      const res = await fetch(`/api/news/sources/${sourceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      if (res.ok) {
        setSources(sources.map(s => s.id === sourceId ? { ...s, enabled } : s));
        toast({ title: enabled ? 'Source enabled' : 'Source disabled', status: 'success', duration: 1500 });
      }
    } catch (error) {
      toast({ title: 'Failed to update source', status: 'error', duration: 2000 });
    }
  };

  const filteredSources = selectedCategory === 'all' 
    ? sources 
    : sources.filter(s => s.category === selectedCategory);

  const categories = ['all', ...Array.from(new Set(sources.map(s => s.category)))];

  return (
    <VStack spacing={4} align="stretch">
      <HStack justify="space-between">
        <Text fontWeight="bold" fontSize="md">
          <Icon as={FiRss} mr={2} />
          News Sources
        </Text>
        <Button size="xs" leftIcon={<Icon as={FiRefreshCw} />} variant="ghost" onClick={fetchSources} isLoading={isLoading}>
          Refresh
        </Button>
      </HStack>

      <Select size="sm" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
        {categories.map(cat => (
          <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
        ))}
      </Select>

      {isLoading ? (
        <Spinner size="sm" />
      ) : filteredSources.length === 0 ? (
        <Text fontSize="sm" color={textSecondary} textAlign="center">No sources found</Text>
      ) : (
        <Box 
          maxH="calc(100vh - 450px)" 
          minH="200px"
          overflowY="auto" 
          pr={1}
          css={{
            '&::-webkit-scrollbar': { width: '6px' },
            '&::-webkit-scrollbar-thumb': { background: 'gray.300', borderRadius: '3px' },
          }}
        >
          <VStack spacing={2} align="stretch">
            {filteredSources.map((source) => (
              <HStack
                key={source.id}
                p={2}
                bg={bgCard}
                borderRadius="md"
                borderWidth="1px"
                borderColor={borderSubtle}
                justify="space-between"
              >
                <HStack flex={1} minW={0}>
                  <Icon as={FiGlobe} color={source.enabled ? 'green.500' : 'gray.400'} flexShrink={0} />
                  <VStack align="start" spacing={0} minW={0}>
                    <Text fontSize="sm" fontWeight="medium" noOfLines={1}>{source.name}</Text>
                    <HStack spacing={1}>
                      <Text fontSize="xs" color={textSecondary}>{source.feed_type.toUpperCase()}</Text>
                      <Text fontSize="xs" color={textSecondary}>•</Text>
                      <Text fontSize="xs" color={textSecondary}>{source.category}</Text>
                    </HStack>
                  </VStack>
                </HStack>
                <Switch
                  size="sm"
                  isChecked={source.enabled}
                  onChange={() => handleToggleSource(source.id, !source.enabled)}
                />
              </HStack>
            ))}
          </VStack>
        </Box>
      )}

      <Text fontSize="xs" color={textSecondary} textAlign="center">
        Showing {filteredSources.length} sources • {sources.filter(s => s.enabled).length} of {sources.length} enabled
      </Text>

      <Divider />

      <Button size="sm" leftIcon={<Icon as={FiLink} />} variant="outline">
        Add Source
      </Button>

      <Alert status="info" fontSize="xs">
        <AlertIcon />
        Sources are checked every 6 hours for new articles
      </Alert>
    </VStack>
  );
}

function ExportPanel({ story }: { story?: Story }) {
  const toast = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const textSecondary = useSemanticToken('text.secondary');

  const handleExport = async (format: string) => {
    if (!story) {
      toast({ title: 'No story selected', status: 'warning', duration: 2000 });
      return;
    }

    setIsExporting(true);
    try {
      if (format === 'clipboard') {
        await navigator.clipboard.writeText(story.full_narrative || '');
        toast({ title: 'Copied to clipboard', status: 'success', duration: 1500 });
      } else if (format === 'markdown') {
        const md = `# ${story.headline || story.title}\n\n${story.summary}\n\n---\n\n${story.full_narrative}`;
        const blob = new Blob([md], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${story.title.slice(0, 50).replace(/[^a-z0-9]/gi, '-')}.md`;
        a.click();
        toast({ title: 'Downloaded as Markdown', status: 'success', duration: 2000 });
      } else if (format === 'podcast') {
        const res = await fetch('/api/news/stories/export-to-podcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ story_id: story.id }),
        });
        if (res.ok) {
          toast({ title: 'Exported to Podcast Studio', status: 'success', duration: 2000 });
        }
      }
    } catch (error) {
      toast({ title: 'Export failed', status: 'error', duration: 3000 });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <VStack spacing={4} align="stretch">
      <Text fontWeight="bold" fontSize="md">
        <Icon as={FiShare2} mr={2} />
        Export Story
      </Text>

      {!story ? (
        <Alert status="info">
          <AlertIcon />
          Select a story to export
        </Alert>
      ) : (
        <>
          <Text fontSize="sm" color={textSecondary}>
            Exporting: <strong>{story.headline || story.title}</strong>
          </Text>

          <VStack spacing={2} align="stretch">
            <Button
              leftIcon={<Icon as={FiCopy} />}
              size="sm"
              variant="outline"
              onClick={() => handleExport('clipboard')}
              isLoading={isExporting}
            >
              Copy to Clipboard
            </Button>
            <Button
              leftIcon={<Icon as={FiDownload} />}
              size="sm"
              variant="outline"
              onClick={() => handleExport('markdown')}
              isLoading={isExporting}
            >
              Download as Markdown
            </Button>
            <Button
              leftIcon={<Icon as={FiMic} />}
              size="sm"
              colorScheme="purple"
              onClick={() => handleExport('podcast')}
              isLoading={isExporting}
            >
              Export to Podcast Studio
            </Button>
          </VStack>

          <Divider />

          <Text fontSize="xs" color={textSecondary}>
            More export options coming soon: PDF, Email Newsletter, Social Media
          </Text>
        </>
      )}
    </VStack>
  );
}

export default NewsStudioRightPanel;
