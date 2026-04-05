/**
 * Child Journal Page
 * 
 * A creative journaling experience integrated with:
 * - Workspace-AI for writing assistance
 * - Planner for scheduling and reminders
 * - GooseMind for skill evaluation and recommendations
 * 
 * Features:
 * - Daily prompts and mood tracking
 * - Highlight positives and reflect on challenges
 * - AI-powered writing feedback
 * - Streak tracking and achievements
 * - Theme-aware design (Minecraft/Pusheen)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Text,
  Button,
  IconButton,
  SimpleGrid,
  Badge,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Input,
  Textarea,
  Select,
  FormControl,
  FormLabel,
  useDisclosure,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Progress,
  Divider,
  Collapse,
  Spinner,
  Flex,
  Spacer,
  Wrap,
  WrapItem,
  Tag,
  TagLabel,
  TagCloseButton,
  Tooltip,
  CircularProgress,
  CircularProgressLabel,
  Card,
  CardBody,
  CardHeader,
  Heading,
} from '@chakra-ui/react';
import {
  FiArrowLeft,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiSave,
  FiStar,
  FiHeart,
  FiSun,
  FiMoon,
  FiCloud,
  FiZap,
  FiAward,
  FiTrendingUp,
  FiCalendar,
  FiBook,
  FiFeather,
  FiSmile,
  FiTarget,
  FiMessageCircle,
  FiX,
  FiChevronDown,
  FiChevronUp,
  FiRefreshCw,
} from 'react-icons/fi';
import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth';
import { useRouter } from 'next/router';
import { authOptions } from '../api/auth/[...nextauth]';
import ChildDashboardLayout from '@/components/layout/ChildDashboardLayout';
import { useChildTheme } from '@/components/child/ChildThemeProvider';
import { BackgroundContextMenu, getBackgroundStyles, BackgroundMode } from '@/components/child/BackgroundContextMenu';
import { useRightPanel } from '@/contexts/RightPanelContext';
import { StudentProgressProvider } from '@/contexts/StudentProgressContext';
import {
  JournalEntry,
  JournalEntryType,
  MoodType,
  JournalHighlight,
  JournalStreak,
  JournalAIEvaluation,
  MOOD_CONFIG,
  JOURNAL_TYPE_CONFIG,
  DAILY_PROMPTS,
  JournalPrompt,
} from '@/types/journal';

// ============================================================================
// Page Component
// ============================================================================

function JournalPageContent() {
  const router = useRouter();
  const toast = useToast();
  const { colors, childExtras, themeId } = useChildTheme();
  const { setContext, setIsOpen } = useRightPanel();
  
  // State
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [streak, setStreak] = useState<JournalStreak | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeView, setActiveView] = useState<'write' | 'entries' | 'progress'>('write');
  const [dailyPrompt, setDailyPrompt] = useState<JournalPrompt | null>(null);
  
  // Editor state
  const [isEditing, setIsEditing] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [entryType, setEntryType] = useState<JournalEntryType>('daily');
  const [mood, setMood] = useState<MoodType | ''>('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [highlights, setHighlights] = useState<Omit<JournalHighlight, 'id'>[]>([]);
  const [newHighlight, setNewHighlight] = useState('');
  const [highlightType, setHighlightType] = useState<'positive' | 'challenge' | 'improvement'>('positive');
  
  // AI state
  const [aiLoading, setAiLoading] = useState(false);
  const [currentEvaluation, setCurrentEvaluation] = useState<JournalAIEvaluation | null>(null);
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [evaluatingEntryId, setEvaluatingEntryId] = useState<string | null>(null);
  const [entryEvaluations, setEntryEvaluations] = useState<Record<string, JournalAIEvaluation>>({});
  
  // Delete confirmation modal state
  const { isOpen: isDeleteModalOpen, onOpen: onDeleteModalOpen, onClose: onDeleteModalClose } = useDisclosure();
  const [entryToDelete, setEntryToDelete] = useState<JournalEntry | null>(null);
  
  // Analytics state
  const [analytics, setAnalytics] = useState<{
    totalWords: number;
    avgWordsPerEntry: number;
    entryCount: number;
    topTags: Array<{ tag: string; count: number }>;
    moodDistribution: Record<string, number>;
    trendingTopics: string[];
    recommendedFocus: string[];
  } | null>(null);
  
  // Theme
  const backgroundImages = childExtras?.decorations?.backgroundImages;
  // Get journal-specific background or fall back to default
  const getBackgroundImage = () => {
    if (!backgroundImages) return undefined;
    const bgMap: Record<string, string | undefined> = backgroundImages as any;
    return bgMap['journal'] || backgroundImages.default;
  };
  const backgroundImage = getBackgroundImage();
  const primaryColor = colors?.primary || '#667eea';
  const cardBg = colors?.backgroundSecondary || 'rgba(255, 255, 255, 0.9)';
  const isMinecraft = themeId?.includes('minecraft');
  const isPusheen = themeId?.includes('pusheen');
  
  // Background mode
  const [bgMode, setBgMode] = useState<BackgroundMode>('cover');
  
  useEffect(() => {
    const saved = localStorage.getItem('childBgMode');
    if (saved) setBgMode(saved as BackgroundMode);
  }, []);
  
  const handleBgModeChange = (mode: BackgroundMode) => {
    setBgMode(mode);
    localStorage.setItem('childBgMode', mode);
  };
  
  const bgStyles = getBackgroundStyles(bgMode);

  // Panel is managed by ChildDashboardLayout via pageType="journal"
  // Just ensure it's open on mount
  useEffect(() => {
    setIsOpen(true);
  }, [setIsOpen]);

  // Fetch data on mount
  useEffect(() => {
    fetchEntries();
    fetchStreak();
    fetchDailyPrompt();
    fetchAnalytics();
  }, []);

  const fetchEntries = async () => {
    try {
      const res = await fetch('/api/child/journal?limit=20');
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
      }
    } catch (error) {
      console.error('Failed to fetch entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStreak = async () => {
    try {
      const res = await fetch('/api/child/journal?action=streak');
      if (res.ok) {
        const data = await res.json();
        setStreak(data.streak);
      }
    } catch (error) {
      console.error('Failed to fetch streak:', error);
    }
  };

  const fetchDailyPrompt = async () => {
    try {
      const res = await fetch('/api/child/journal?action=prompt');
      if (res.ok) {
        const data = await res.json();
        setDailyPrompt(data.prompt);
      }
    } catch (error) {
      // Use fallback prompt
      setDailyPrompt(DAILY_PROMPTS[0]);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/child/journal?action=analytics');
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      toast({
        title: '📝 Add a title and some writing!',
        status: 'warning',
        duration: 2000,
      });
      return;
    }

    setSaving(true);
    try {
      const method = editingEntry ? 'PUT' : 'POST';
      const body = editingEntry 
        ? { id: editingEntry.id, title, content, mood: mood || undefined, tags, highlights }
        : { type: entryType, title, content, mood: mood || undefined, tags, highlights };

      const res = await fetch('/api/child/journal', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        toast({
          title: data.message || '📔 Saved!',
          status: 'success',
          duration: 2000,
        });
        
        // Reset form and switch to entries view
        resetForm();
        await fetchEntries();
        await fetchStreak();
        setActiveView('entries'); // Switch to entries tab to show saved entry
        
        // Offer AI evaluation
        if (!editingEntry) {
          toast({
            title: '✨ Want feedback on your writing?',
            description: 'Click "Get Feedback" to see how you did!',
            status: 'info',
            duration: 4000,
            isClosable: true,
          });
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error('[Journal] Save failed:', res.status, errorData);
        throw new Error(errorData.error || 'Failed to save');
      }
    } catch (error) {
      console.error('[Journal] Save error:', error);
      toast({
        title: 'Oops! Something went wrong',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setSaving(false);
    }
  };

  // Open delete confirmation modal
  const confirmDelete = (entry: JournalEntry) => {
    setEntryToDelete(entry);
    onDeleteModalOpen();
  };

  // Actually delete the entry after confirmation
  const handleDelete = async () => {
    if (!entryToDelete) return;

    try {
      const res = await fetch(`/api/child/journal?id=${entryToDelete.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast({
          title: '🗑️ Entry deleted',
          status: 'info',
          duration: 2000,
        });
        fetchEntries();
        fetchStreak();
        fetchAnalytics();
        onDeleteModalClose();
        setEntryToDelete(null);
      }
    } catch (error) {
      toast({
        title: 'Failed to delete',
        status: 'error',
        duration: 2000,
      });
    }
  };

  const handleEdit = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setTitle(entry.title);
    setContent(entry.content);
    setEntryType(entry.type);
    setMood(entry.mood || '');
    setTags(entry.tags);
    setHighlights(entry.highlights);
    setIsEditing(true);
    setActiveView('write');
  };

  const handleGetFeedback = async (entryId: string) => {
    setAiLoading(true);
    setEvaluatingEntryId(entryId);
    try {
      const res = await fetch('/api/child/journal/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId, action: 'evaluate' }),
      });

      if (res.ok) {
        const data = await res.json();
        // Store evaluation for this specific entry
        setEntryEvaluations(prev => ({
          ...prev,
          [entryId]: data.evaluation,
        }));
        setCurrentEvaluation(data.evaluation);
        setShowEvaluation(true);
      }
    } catch (error) {
      toast({
        title: 'Could not get feedback',
        status: 'error',
        duration: 2000,
      });
    } finally {
      setAiLoading(false);
      setEvaluatingEntryId(null);
    }
  };
  
  const dismissFeedback = (entryId: string) => {
    setEntryEvaluations(prev => {
      const newEvals = { ...prev };
      delete newEvals[entryId];
      return newEvals;
    });
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setEntryType('daily');
    setMood('');
    setTags([]);
    setHighlights([]);
    setEditingEntry(null);
    setIsEditing(false);
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const addHighlight = () => {
    if (newHighlight.trim()) {
      setHighlights([...highlights, { text: newHighlight.trim(), type: highlightType }]);
      setNewHighlight('');
    }
  };

  const usePrompt = (prompt: string) => {
    setContent(content + (content ? '\n\n' : '') + prompt + '\n');
  };

  // ============================================================================
  // Render Components
  // ============================================================================

  const renderStreakCard = () => (
    <Box
      bg={cardBg}
      borderRadius={isMinecraft ? '4px' : '2xl'}
      p={4}
      boxShadow={isMinecraft ? '4px 4px 0px #5D8C3E' : 'lg'}
      border={isMinecraft ? '3px solid #8B5A2B' : isPusheen ? '2px solid #8B7355' : 'none'}
    >
      <HStack justify="space-between" mb={3}>
        <HStack>
          <Text fontSize="2xl">🔥</Text>
          <Text fontWeight="bold" color={primaryColor}>Writing Streak</Text>
        </HStack>
        <Badge colorScheme="orange" fontSize="lg" px={3} py={1} borderRadius="full">
          {streak?.currentStreak || 0} days
        </Badge>
      </HStack>
      <SimpleGrid columns={3} spacing={2}>
        <VStack>
          <Text fontSize="xl" fontWeight="bold">{streak?.totalEntries || 0}</Text>
          <Text fontSize="xs" color="gray.500">Total</Text>
        </VStack>
        <VStack>
          <Text fontSize="xl" fontWeight="bold">{streak?.entriesThisWeek || 0}</Text>
          <Text fontSize="xs" color="gray.500">This Week</Text>
        </VStack>
        <VStack>
          <Text fontSize="xl" fontWeight="bold">{streak?.longestStreak || 0}</Text>
          <Text fontSize="xs" color="gray.500">Best Streak</Text>
        </VStack>
      </SimpleGrid>
    </Box>
  );

  const renderMoodSelector = () => (
    <FormControl>
      <FormLabel fontWeight="bold">How are you feeling? 💭</FormLabel>
      <Wrap spacing={2}>
        {Object.entries(MOOD_CONFIG).map(([key, config]) => (
          <WrapItem key={key}>
            <Button
              size="sm"
              variant={mood === key ? 'solid' : 'outline'}
              colorScheme={mood === key ? config.color : 'gray'}
              onClick={() => setMood(key as MoodType)}
              borderRadius={isMinecraft ? '4px' : 'full'}
            >
              {config.emoji} {config.label}
            </Button>
          </WrapItem>
        ))}
      </Wrap>
    </FormControl>
  );

  const renderTypeSelector = () => (
    <FormControl>
      <FormLabel fontWeight="bold">What kind of entry? 📔</FormLabel>
      <Wrap spacing={2}>
        {Object.entries(JOURNAL_TYPE_CONFIG).map(([key, config]) => (
          <WrapItem key={key}>
            <Button
              size="sm"
              variant={entryType === key ? 'solid' : 'outline'}
              colorScheme={entryType === key ? config.color : 'gray'}
              onClick={() => setEntryType(key as JournalEntryType)}
              borderRadius={isMinecraft ? '4px' : 'full'}
            >
              {config.emoji} {config.label}
            </Button>
          </WrapItem>
        ))}
      </Wrap>
    </FormControl>
  );

  const renderHighlightsSection = () => (
    <Box>
      <Text fontWeight="bold" mb={2}>Highlights ✨</Text>
      <HStack mb={2}>
        <Select
          size="sm"
          value={highlightType}
          onChange={(e) => setHighlightType(e.target.value as any)}
          w="150px"
          borderRadius={isMinecraft ? '4px' : 'md'}
        >
          <option value="positive">🌟 Positive</option>
          <option value="challenge">💪 Challenge</option>
          <option value="improvement">🎯 To Improve</option>
        </Select>
        <Input
          size="sm"
          placeholder="Add a highlight..."
          value={newHighlight}
          onChange={(e) => setNewHighlight(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addHighlight()}
          borderRadius={isMinecraft ? '4px' : 'md'}
        />
        <IconButton
          aria-label="Add highlight"
          icon={<FiPlus />}
          size="sm"
          onClick={addHighlight}
          colorScheme="green"
          borderRadius={isMinecraft ? '4px' : 'md'}
        />
      </HStack>
      <Wrap spacing={2}>
        {highlights.map((h, i) => (
          <WrapItem key={i}>
            <Tag
              size="md"
              colorScheme={h.type === 'positive' ? 'green' : h.type === 'challenge' ? 'orange' : 'blue'}
              borderRadius={isMinecraft ? '4px' : 'full'}
            >
              <TagLabel>
                {h.type === 'positive' ? '🌟' : h.type === 'challenge' ? '💪' : '🎯'} {h.text}
              </TagLabel>
              <TagCloseButton onClick={() => setHighlights(highlights.filter((_, idx) => idx !== i))} />
            </Tag>
          </WrapItem>
        ))}
      </Wrap>
    </Box>
  );

  const renderWriteTab = () => (
    <VStack spacing={4} align="stretch">
      {/* Daily Prompt Card */}
      {dailyPrompt && !editingEntry && (
        <Box
          bg={isPusheen ? 'rgba(255, 182, 193, 0.3)' : isMinecraft ? 'rgba(93, 140, 62, 0.2)' : 'blue.50'}
          borderRadius={isMinecraft ? '4px' : '2xl'}
          p={4}
          border={isMinecraft ? '2px solid #5D8C3E' : isPusheen ? '2px solid #FFB6C1' : '2px solid'}
          borderColor={isMinecraft ? '#5D8C3E' : isPusheen ? '#FFB6C1' : 'blue.200'}
        >
          <HStack justify="space-between" mb={2}>
            <HStack>
              <Text fontSize="xl">{dailyPrompt.emoji}</Text>
              <Text fontWeight="bold" color={primaryColor}>Today's Prompt</Text>
            </HStack>
            <Button
              size="sm"
              variant="ghost"
              leftIcon={<FiRefreshCw />}
              onClick={fetchDailyPrompt}
            >
              New Prompt
            </Button>
          </HStack>
          <Text fontSize="lg" fontStyle="italic" mb={2}>"{dailyPrompt.prompt}"</Text>
          <Button
            size="sm"
            colorScheme={isMinecraft ? 'green' : isPusheen ? 'pink' : 'blue'}
            onClick={() => usePrompt(dailyPrompt.prompt)}
            borderRadius={isMinecraft ? '4px' : 'full'}
          >
            Use This Prompt ✨
          </Button>
        </Box>
      )}

      {/* Entry Type Selector */}
      {!editingEntry && renderTypeSelector()}

      {/* Mood Selector */}
      {renderMoodSelector()}

      {/* Title Input */}
      <FormControl>
        <FormLabel fontWeight="bold">Title 📝</FormLabel>
        <Input
          placeholder="Give your entry a title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          size="lg"
          borderRadius={isMinecraft ? '4px' : 'xl'}
          borderWidth="2px"
          borderColor={primaryColor}
          _focus={{ boxShadow: `0 0 0 2px ${primaryColor}` }}
        />
      </FormControl>

      {/* Content Textarea */}
      <FormControl>
        <FormLabel fontWeight="bold">
          {JOURNAL_TYPE_CONFIG[entryType].emoji} {JOURNAL_TYPE_CONFIG[entryType].prompt}
        </FormLabel>
        <Textarea
          placeholder="Start writing here..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          minH="200px"
          borderRadius={isMinecraft ? '4px' : 'xl'}
          borderWidth="2px"
          borderColor={primaryColor}
          _focus={{ boxShadow: `0 0 0 2px ${primaryColor}` }}
          fontSize="md"
          lineHeight="1.8"
        />
        <HStack justify="space-between" mt={1}>
          <Text fontSize="sm" color="gray.500">
            {content.split(/\s+/).filter(w => w).length} words
          </Text>
        </HStack>
      </FormControl>

      {/* Highlights */}
      {renderHighlightsSection()}

      {/* Tags */}
      <Box>
        <Text fontWeight="bold" mb={2}>Tags 🏷️</Text>
        <HStack mb={2}>
          <Input
            size="sm"
            placeholder="Add a tag..."
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addTag()}
            borderRadius={isMinecraft ? '4px' : 'md'}
          />
          <IconButton
            aria-label="Add tag"
            icon={<FiPlus />}
            size="sm"
            onClick={addTag}
            borderRadius={isMinecraft ? '4px' : 'md'}
          />
        </HStack>
        <Wrap spacing={2}>
          {tags.map((tag, i) => (
            <WrapItem key={i}>
              <Tag size="md" colorScheme="purple" borderRadius={isMinecraft ? '4px' : 'full'}>
                <TagLabel>#{tag}</TagLabel>
                <TagCloseButton onClick={() => removeTag(tag)} />
              </Tag>
            </WrapItem>
          ))}
        </Wrap>
      </Box>

      {/* Action Buttons */}
      <HStack justify="flex-end" spacing={3} pt={4}>
        {editingEntry && (
          <Button
            variant="ghost"
            onClick={resetForm}
          >
            Cancel
          </Button>
        )}
        <Button
          colorScheme={isMinecraft ? 'green' : isPusheen ? 'pink' : 'blue'}
          size="lg"
          leftIcon={<FiSave />}
          onClick={handleSave}
          isLoading={saving}
          borderRadius={isMinecraft ? '4px' : 'full'}
          boxShadow={isMinecraft ? '4px 4px 0px #5D8C3E' : 'lg'}
        >
          {editingEntry ? 'Update Entry' : 'Save Entry'} 📔
        </Button>
      </HStack>
    </VStack>
  );

  const renderEntriesTab = () => (
    <VStack spacing={4} align="stretch">
      {loading ? (
        <Flex justify="center" py={8}>
          <Spinner size="xl" color={primaryColor} />
        </Flex>
      ) : entries.length === 0 ? (
        <Box textAlign="center" py={8}>
          <Text fontSize="4xl" mb={2}>📔</Text>
          <Text fontSize="lg" color="gray.500">No entries yet!</Text>
          <Text color="gray.400">Start writing to see your journal here.</Text>
        </Box>
      ) : (
        entries.map((entry) => (
          <Box
            key={entry.id}
            bg={cardBg}
            borderRadius={isMinecraft ? '4px' : '2xl'}
            p={4}
            boxShadow={isMinecraft ? '4px 4px 0px #5D8C3E' : 'md'}
            border={isMinecraft ? '3px solid #8B5A2B' : isPusheen ? '2px solid #8B7355' : '1px solid'}
            borderColor={isMinecraft ? '#8B5A2B' : isPusheen ? '#8B7355' : 'gray.200'}
            _hover={{
              transform: isMinecraft ? 'translate(-2px, -2px)' : 'translateY(-2px)',
              boxShadow: isMinecraft ? '6px 6px 0px #55CDFC' : 'lg',
            }}
            transition="all 0.2s"
          >
            <HStack justify="space-between" mb={2}>
              <HStack>
                <Text fontSize="xl">{JOURNAL_TYPE_CONFIG[entry.type].emoji}</Text>
                <Text fontWeight="bold" fontSize="lg">{entry.title}</Text>
                {entry.mood && (
                  <Badge colorScheme={MOOD_CONFIG[entry.mood].color}>
                    {MOOD_CONFIG[entry.mood].emoji}
                  </Badge>
                )}
              </HStack>
              <HStack>
                <Text fontSize="sm" color="gray.500">
                  {new Date(entry.date).toLocaleDateString()}
                </Text>
                <IconButton
                  aria-label="Edit"
                  icon={<FiEdit2 />}
                  size="sm"
                  variant="ghost"
                  onClick={() => handleEdit(entry)}
                />
                <IconButton
                  aria-label="Delete"
                  icon={<FiTrash2 />}
                  size="sm"
                  variant="ghost"
                  colorScheme="red"
                  onClick={() => confirmDelete(entry)}
                />
              </HStack>
            </HStack>
            
            <Text noOfLines={3} color="gray.600" mb={2}>
              {entry.content}
            </Text>
            
            {entry.highlights.length > 0 && (
              <Wrap spacing={1} mb={2}>
                {entry.highlights.slice(0, 3).map((h, i) => (
                  <WrapItem key={i}>
                    <Tag size="sm" colorScheme={h.type === 'positive' ? 'green' : h.type === 'challenge' ? 'orange' : 'blue'}>
                      {h.type === 'positive' ? '🌟' : h.type === 'challenge' ? '💪' : '🎯'} {h.text}
                    </Tag>
                  </WrapItem>
                ))}
              </Wrap>
            )}
            
            {entry.tags.length > 0 && (
              <Wrap spacing={1} mb={2}>
                {entry.tags.map((tag, i) => (
                  <WrapItem key={i}>
                    <Tag size="sm" variant="subtle" colorScheme="purple">#{tag}</Tag>
                  </WrapItem>
                ))}
              </Wrap>
            )}
            
            {/* Inline Feedback Section */}
            {evaluatingEntryId === entry.id && aiLoading && (
              <Box 
                mt={3} 
                p={4} 
                bg={isPusheen ? 'pink.50' : isMinecraft ? 'green.50' : 'blue.50'} 
                borderRadius={isMinecraft ? '4px' : 'lg'}
                border="2px dashed"
                borderColor={isPusheen ? 'pink.200' : isMinecraft ? 'green.300' : 'blue.200'}
              >
                <HStack justify="center" spacing={3}>
                  <Spinner size="sm" color={primaryColor} />
                  <Text fontSize="sm" color="gray.600">✨ Getting your feedback...</Text>
                </HStack>
              </Box>
            )}
            
            {entryEvaluations[entry.id] && (
              <Box 
                mt={3} 
                p={4} 
                bg={isPusheen ? 'pink.50' : isMinecraft ? 'green.50' : 'blue.50'} 
                borderRadius={isMinecraft ? '4px' : 'lg'}
                border="2px solid"
                borderColor={isPusheen ? 'pink.200' : isMinecraft ? 'green.300' : 'blue.200'}
              >
                <HStack justify="space-between" mb={3}>
                  <HStack>
                    <Text fontSize="xl">✨</Text>
                    <Text fontWeight="bold" color={primaryColor}>Your Writing Feedback</Text>
                  </HStack>
                  <IconButton
                    aria-label="Dismiss"
                    icon={<FiX />}
                    size="xs"
                    variant="ghost"
                    onClick={() => dismissFeedback(entry.id)}
                  />
                </HStack>
                
                {/* Encouragement */}
                <Box bg="white" p={3} borderRadius="md" mb={3}>
                  <Text fontStyle="italic" fontSize="sm">{entryEvaluations[entry.id].encouragement}</Text>
                </Box>
                
                {/* Skills */}
                <Text fontWeight="bold" fontSize="sm" mb={2}>📊 Skills</Text>
                <SimpleGrid columns={2} spacing={2} mb={3}>
                  {Object.entries(entryEvaluations[entry.id].skills).map(([skill, data]) => (
                    <Box key={skill} bg="white" p={2} borderRadius="md">
                      <HStack justify="space-between" mb={1}>
                        <Text fontSize="xs" textTransform="capitalize">{skill}</Text>
                        <Badge colorScheme={data.score >= 4 ? 'green' : data.score >= 3 ? 'yellow' : 'orange'} size="sm">
                          {data.score}/5
                        </Badge>
                      </HStack>
                      <Progress
                        value={data.score * 20}
                        size="xs"
                        colorScheme={data.score >= 4 ? 'green' : data.score >= 3 ? 'yellow' : 'orange'}
                        borderRadius="full"
                      />
                    </Box>
                  ))}
                </SimpleGrid>
                
                {/* Strengths */}
                {entryEvaluations[entry.id].strengths.length > 0 && (
                  <Box mb={3}>
                    <Text fontWeight="bold" fontSize="sm" mb={1}>🌟 What You Did Great</Text>
                    <VStack align="start" spacing={1}>
                      {entryEvaluations[entry.id].strengths.slice(0, 3).map((s, i) => (
                        <Text key={i} fontSize="xs" color="green.600">✓ {s}</Text>
                      ))}
                    </VStack>
                  </Box>
                )}
                
                {/* Tips */}
                {entryEvaluations[entry.id].recommendations.length > 0 && (
                  <Box>
                    <Text fontWeight="bold" fontSize="sm" mb={1}>💡 Tips to Try Next Time</Text>
                    <VStack align="start" spacing={1}>
                      {entryEvaluations[entry.id].recommendations.slice(0, 2).map((r, i) => (
                        <Text key={i} fontSize="xs" color="blue.600">{r.emoji} {r.title}</Text>
                      ))}
                    </VStack>
                  </Box>
                )}
              </Box>
            )}
            
            {/* Get Feedback Button - only show if no feedback yet */}
            {!entryEvaluations[entry.id] && evaluatingEntryId !== entry.id && (
              <HStack justify="flex-end" mt={2}>
                <Button
                  size="sm"
                  variant="ghost"
                  leftIcon={<FiZap />}
                  onClick={() => handleGetFeedback(entry.id)}
                  colorScheme={isMinecraft ? 'green' : isPusheen ? 'pink' : 'blue'}
                >
                  Get Feedback ✨
                </Button>
              </HStack>
            )}
          </Box>
        ))
      )}
    </VStack>
  );

  const renderProgressTab = () => (
    <VStack spacing={4} align="stretch">
      {renderStreakCard()}
      
      {/* Word Count Stats */}
      <Box
        bg={cardBg}
        borderRadius={isMinecraft ? '4px' : '2xl'}
        p={4}
        boxShadow={isMinecraft ? '4px 4px 0px #5D8C3E' : 'lg'}
        border={isMinecraft ? '3px solid #8B5A2B' : isPusheen ? '2px solid #8B7355' : 'none'}
      >
        <HStack mb={3}>
          <Text fontSize="2xl">📊</Text>
          <Text fontWeight="bold" color={primaryColor}>Your Writing Stats</Text>
        </HStack>
        
        <SimpleGrid columns={3} spacing={3}>
          <Box textAlign="center" p={3} bg={isPusheen ? 'pink.50' : isMinecraft ? 'green.50' : 'blue.50'} borderRadius={isMinecraft ? '4px' : 'lg'}>
            <Text fontSize="2xl" fontWeight="bold" color={primaryColor}>
              {analytics?.totalWords || 0}
            </Text>
            <Text fontSize="xs" color="gray.600">Total Words</Text>
          </Box>
          <Box textAlign="center" p={3} bg={isPusheen ? 'pink.50' : isMinecraft ? 'green.50' : 'blue.50'} borderRadius={isMinecraft ? '4px' : 'lg'}>
            <Text fontSize="2xl" fontWeight="bold" color={primaryColor}>
              {analytics?.avgWordsPerEntry || 0}
            </Text>
            <Text fontSize="xs" color="gray.600">Avg per Entry</Text>
          </Box>
          <Box textAlign="center" p={3} bg={isPusheen ? 'pink.50' : isMinecraft ? 'green.50' : 'blue.50'} borderRadius={isMinecraft ? '4px' : 'lg'}>
            <Text fontSize="2xl" fontWeight="bold" color={primaryColor}>
              {analytics?.entryCount || entries.length}
            </Text>
            <Text fontSize="xs" color="gray.600">Entries</Text>
          </Box>
        </SimpleGrid>
      </Box>

      {/* Mood Distribution */}
      {analytics?.moodDistribution && Object.keys(analytics.moodDistribution).length > 0 && (
        <Box
          bg={cardBg}
          borderRadius={isMinecraft ? '4px' : '2xl'}
          p={4}
          boxShadow={isMinecraft ? '4px 4px 0px #5D8C3E' : 'lg'}
          border={isMinecraft ? '3px solid #8B5A2B' : isPusheen ? '2px solid #8B7355' : 'none'}
        >
          <HStack mb={3}>
            <Text fontSize="2xl">🎭</Text>
            <Text fontWeight="bold" color={primaryColor}>How You've Been Feeling</Text>
          </HStack>
          <Wrap spacing={2}>
            {Object.entries(analytics.moodDistribution).map(([mood, count]) => (
              <WrapItem key={mood}>
                <Badge 
                  colorScheme={MOOD_CONFIG[mood as MoodType]?.color || 'gray'} 
                  px={3} 
                  py={1} 
                  borderRadius="full"
                  fontSize="sm"
                >
                  {MOOD_CONFIG[mood as MoodType]?.emoji || '😊'} {mood} ({count})
                </Badge>
              </WrapItem>
            ))}
          </Wrap>
        </Box>
      )}

      {/* Your Top Tags */}
      {analytics?.topTags && analytics.topTags.length > 0 && (
        <Box
          bg={cardBg}
          borderRadius={isMinecraft ? '4px' : '2xl'}
          p={4}
          boxShadow={isMinecraft ? '4px 4px 0px #5D8C3E' : 'lg'}
          border={isMinecraft ? '3px solid #8B5A2B' : isPusheen ? '2px solid #8B7355' : 'none'}
        >
          <HStack mb={3}>
            <Text fontSize="2xl">🏷️</Text>
            <Text fontWeight="bold" color={primaryColor}>Your Favorite Topics</Text>
          </HStack>
          <Wrap spacing={2}>
            {analytics.topTags.map((item, idx) => (
              <WrapItem key={idx}>
                <Tag colorScheme={isMinecraft ? 'green' : isPusheen ? 'pink' : 'purple'} size="lg">
                  <TagLabel>#{item.tag} ({item.count})</TagLabel>
                </Tag>
              </WrapItem>
            ))}
          </Wrap>
        </Box>
      )}

      {/* Recommended Focus Areas */}
      {analytics?.recommendedFocus && analytics.recommendedFocus.length > 0 && (
        <Box
          bg={cardBg}
          borderRadius={isMinecraft ? '4px' : '2xl'}
          p={4}
          boxShadow={isMinecraft ? '4px 4px 0px #5D8C3E' : 'lg'}
          border={isMinecraft ? '3px solid #8B5A2B' : isPusheen ? '2px solid #8B7355' : 'none'}
        >
          <HStack mb={3}>
            <Text fontSize="2xl">🎯</Text>
            <Text fontWeight="bold" color={primaryColor}>Try This Next!</Text>
          </HStack>
          <VStack align="stretch" spacing={2}>
            {analytics.recommendedFocus.map((rec, idx) => (
              <Box 
                key={idx} 
                p={2} 
                bg={isPusheen ? 'pink.50' : isMinecraft ? 'green.50' : 'blue.50'} 
                borderRadius={isMinecraft ? '4px' : 'md'}
              >
                <Text fontSize="sm">{rec}</Text>
              </Box>
            ))}
          </VStack>
        </Box>
      )}
      
      {/* Evaluation Results */}
      {currentEvaluation && (
        <Box
          bg={cardBg}
          borderRadius={isMinecraft ? '4px' : '2xl'}
          p={4}
          boxShadow={isMinecraft ? '4px 4px 0px #5D8C3E' : 'lg'}
          border={isMinecraft ? '3px solid #8B5A2B' : isPusheen ? '2px solid #8B7355' : 'none'}
        >
          <HStack mb={4}>
            <Text fontSize="2xl">✨</Text>
            <Text fontWeight="bold" fontSize="lg" color={primaryColor}>Latest Writing Feedback</Text>
          </HStack>
          
          <Box bg={isPusheen ? 'pink.50' : isMinecraft ? 'green.50' : 'blue.50'} p={3} borderRadius="lg" mb={4}>
            <Text fontStyle="italic">{currentEvaluation.encouragement}</Text>
          </Box>
          
          <Text fontWeight="bold" mb={2}>Skills 📊</Text>
          <SimpleGrid columns={2} spacing={3} mb={4}>
            {Object.entries(currentEvaluation.skills).map(([skill, data]) => (
              <Box key={skill}>
                <HStack justify="space-between">
                  <Text fontSize="sm" textTransform="capitalize">{skill}</Text>
                  <Text fontSize="sm" fontWeight="bold">{data.score}/5</Text>
                </HStack>
                <Progress
                  value={data.score * 20}
                  size="sm"
                  colorScheme={data.score >= 4 ? 'green' : data.score >= 3 ? 'yellow' : 'orange'}
                  borderRadius="full"
                />
              </Box>
            ))}
          </SimpleGrid>
          
          {currentEvaluation.strengths.length > 0 && (
            <Box mb={3}>
              <Text fontWeight="bold" mb={1}>🌟 Strengths</Text>
              {currentEvaluation.strengths.map((s, i) => (
                <Text key={i} fontSize="sm" color="green.600">• {s}</Text>
              ))}
            </Box>
          )}
          
          {currentEvaluation.recommendations.length > 0 && (
            <Box>
              <Text fontWeight="bold" mb={1}>💡 Tips</Text>
              {currentEvaluation.recommendations.map((r, i) => (
                <Text key={i} fontSize="sm" color="blue.600">{r.emoji} {r.title}: {r.description}</Text>
              ))}
            </Box>
          )}
        </Box>
      )}
      
      {/* Writing Tips */}
      <Box
        bg={cardBg}
        borderRadius={isMinecraft ? '4px' : '2xl'}
        p={4}
        boxShadow={isMinecraft ? '4px 4px 0px #5D8C3E' : 'lg'}
        border={isMinecraft ? '3px solid #8B5A2B' : isPusheen ? '2px solid #8B7355' : 'none'}
      >
        <HStack mb={3}>
          <Text fontSize="2xl">💡</Text>
          <Text fontWeight="bold" color={primaryColor}>Writing Tips</Text>
        </HStack>
        <VStack align="stretch" spacing={2}>
          <Text fontSize="sm">✏️ Write a little bit every day to build your streak!</Text>
          <Text fontSize="sm">🌟 Start with what made you happy today</Text>
          <Text fontSize="sm">💭 It's okay to write about hard things too</Text>
          <Text fontSize="sm">🎨 Use describing words to paint a picture</Text>
          <Text fontSize="sm">❓ Ask yourself "What else?" to add more details</Text>
        </VStack>
      </Box>
    </VStack>
  );

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <BackgroundContextMenu onModeChange={handleBgModeChange} currentMode={bgMode}>
      <Box
        minH="calc(100vh - 70px)"
        position="relative"
        bg={colors?.background || '#f0f4ff'}
        backgroundImage={backgroundImage ? `url(${backgroundImage})` : undefined}
        backgroundSize={bgStyles.backgroundSize}
        backgroundPosition={bgStyles.backgroundPosition}
        backgroundRepeat={bgStyles.backgroundRepeat}
        backgroundAttachment={bgStyles.backgroundAttachment}
      >
        {/* Overlay for readability */}
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="rgba(255, 255, 255, 0.85)"
        />
        
        <Box position="relative" zIndex={1}>
          <Container maxW="4xl" py={6}>
          <VStack spacing={6} align="stretch">
            {/* Header */}
            <Box
              bg={cardBg}
              borderRadius={isMinecraft ? '4px' : '2xl'}
              p={4}
              boxShadow={isMinecraft ? '4px 4px 0px #5D8C3E' : 'lg'}
              border={isMinecraft ? '3px solid #8B5A2B' : isPusheen ? '2px solid #8B7355' : 'none'}
            >
              <HStack justify="space-between">
                <HStack>
                  <Text fontSize="3xl">📔</Text>
                  <VStack align="start" spacing={0}>
                    <Text fontSize="2xl" fontWeight="bold" color={primaryColor}>
                      My Journal
                    </Text>
                    <Text fontSize="sm" color="gray.500">
                      Write, reflect, and grow!
                    </Text>
                  </VStack>
                </HStack>
                {streak && (
                  <HStack>
                    <Text fontSize="2xl">🔥</Text>
                    <VStack align="end" spacing={0}>
                      <Text fontWeight="bold" color="orange.500">{streak.currentStreak} day streak!</Text>
                      <Text fontSize="xs" color="gray.500">{streak.totalEntries} total entries</Text>
                    </VStack>
                  </HStack>
                )}
              </HStack>
            </Box>

            {/* Tabs */}
            <Box
              bg={cardBg}
              borderRadius={isMinecraft ? '4px' : '2xl'}
              boxShadow={isMinecraft ? '4px 4px 0px #5D8C3E' : 'lg'}
              border={isMinecraft ? '3px solid #8B5A2B' : isPusheen ? '2px solid #8B7355' : 'none'}
              overflow="hidden"
            >
              <Tabs
                variant="soft-rounded"
                colorScheme={isMinecraft ? 'green' : isPusheen ? 'pink' : 'blue'}
                index={activeView === 'write' ? 0 : activeView === 'entries' ? 1 : 2}
                onChange={(i) => setActiveView(i === 0 ? 'write' : i === 1 ? 'entries' : 'progress')}
              >
                <TabList p={4} bg={isMinecraft ? 'rgba(93, 140, 62, 0.1)' : isPusheen ? 'rgba(255, 182, 193, 0.2)' : 'gray.50'}>
                  <Tab borderRadius={isMinecraft ? '4px' : 'full'}>✍️ Write</Tab>
                  <Tab borderRadius={isMinecraft ? '4px' : 'full'}>📚 My Entries</Tab>
                  <Tab borderRadius={isMinecraft ? '4px' : 'full'}>📊 Progress</Tab>
                </TabList>
                
                <TabPanels>
                  <TabPanel>{renderWriteTab()}</TabPanel>
                  <TabPanel>{renderEntriesTab()}</TabPanel>
                  <TabPanel>{renderProgressTab()}</TabPanel>
                </TabPanels>
              </Tabs>
            </Box>
          </VStack>
          </Container>
        </Box>
      </Box>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={onDeleteModalClose} isCentered size="sm">
        <ModalOverlay bg="blackAlpha.600" />
        <ModalContent borderRadius="2xl" mx={4} overflow="hidden">
          <ModalBody p={6} textAlign="center">
            <VStack spacing={4}>
              {/* Kid-friendly illustration */}
              <Box
                w="80px"
                h="80px"
                borderRadius="full"
                bg="red.50"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Text fontSize="4xl">🗑️</Text>
              </Box>
              
              {/* Title */}
              <Text fontSize="xl" fontWeight="bold" color="gray.700">
                Delete this journal entry?
              </Text>
              
              {/* Preview of entry to delete */}
              {entryToDelete && (
                <Box
                  w="full"
                  p={3}
                  borderRadius="xl"
                  bg={isPusheen ? 'pink.50' : isMinecraft ? 'green.50' : 'blue.50'}
                  border="2px solid"
                  borderColor={isPusheen ? 'pink.200' : isMinecraft ? 'green.200' : 'blue.200'}
                >
                  <HStack mb={1}>
                    <Text>{JOURNAL_TYPE_CONFIG[entryToDelete.type].emoji}</Text>
                    <Text fontWeight="bold" fontSize="sm" noOfLines={1}>{entryToDelete.title}</Text>
                  </HStack>
                  <Text fontSize="xs" color="gray.500" noOfLines={2}>{entryToDelete.content}</Text>
                </Box>
              )}
              
              {/* Message */}
              <Text color="gray.500" fontSize="sm">
                This will remove your entry forever. Are you sure?
              </Text>
              
              {/* Action buttons */}
              <HStack spacing={3} w="full" pt={2}>
                <Button
                  flex={1}
                  variant="outline"
                  colorScheme="gray"
                  borderRadius="full"
                  onClick={onDeleteModalClose}
                  leftIcon={<Text>👋</Text>}
                >
                  Keep it
                </Button>
                <Button
                  flex={1}
                  colorScheme="red"
                  borderRadius="full"
                  onClick={handleDelete}
                  leftIcon={<Text>🗑️</Text>}
                >
                  Delete
                </Button>
              </HStack>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </BackgroundContextMenu>
  );
}

// ============================================================================
// Page Wrapper
// ============================================================================

export default function JournalPage() {
  return (
    <ChildDashboardLayout pageType="journal">
      <StudentProgressProvider>
        <JournalPageContent />
      </StudentProgressProvider>
    </ChildDashboardLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);
  
  if (!session) {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
};
