/**
 * Child Dictionary Page
 * 
 * A comprehensive, kid-friendly dictionary with:
 * - Age-adaptive definitions
 * - Word of the Day
 * - Vocabulary tracking & gamification
 * - Spanish/bilingual support
 * - Interactive quizzes
 * - Themed UI (Minecraft/Pusheen)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Text,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Button,
  IconButton,
  Badge,
  SimpleGrid,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Divider,
  Progress,
  Spinner,
  useToast,
  Image,
  Tooltip,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  Radio,
  RadioGroup,
  Stack,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Wrap,
  WrapItem,
  Tag,
  TagLabel,
  TagLeftIcon,
  Alert,
  AlertIcon,
  Flex,
  useBreakpointValue,
} from '@chakra-ui/react';
import { 
  FiSearch, 
  FiVolume2, 
  FiHeart, 
  FiStar, 
  FiBook, 
  FiAward, 
  FiTrendingUp,
  FiClock,
  FiZap,
  FiTarget,
  FiCheck,
  FiX,
  FiRefreshCw,
} from 'react-icons/fi';
import ChildDashboardLayout from '@/components/layout/ChildDashboardLayout';
import { useChildTheme } from '@/components/child/ChildThemeProvider';
import { useRightPanel } from '@/contexts/RightPanelContext';
import { BackgroundContextMenu, getBackgroundStyles, BackgroundMode } from '@/components/child/BackgroundContextMenu';
import { useKidsPIC } from '@/hooks/useKidsPIC';

interface DictionaryEntry {
  word: string;
  definition: string;
  pronunciation?: string;
  partOfSpeech: string;
  examples: string[];
  synonyms: string[];
  antonyms: string[];
  spanishTranslation?: string;
  spanishDefinition?: string;
  etymology?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category?: string;
  relatedWords: string[];
  funFact?: string;
}

interface VocabStats {
  total_words: number;
  words_this_week: number;
  words_today: number;
}

interface RecentWord {
  word: string;
  lookup_count: number;
  last_looked_up: string;
}

interface QuizQuestion {
  word: string;
  definition: string;
  options: string[];
  correctIndex: number;
}

// Word categories for browsing
const WORD_CATEGORIES = [
  { id: 'animals', name: 'Animals', emoji: '🐾', color: 'orange' },
  { id: 'science', name: 'Science', emoji: '🔬', color: 'blue' },
  { id: 'nature', name: 'Nature', emoji: '🌿', color: 'green' },
  { id: 'space', name: 'Space', emoji: '🚀', color: 'purple' },
  { id: 'feelings', name: 'Feelings', emoji: '💭', color: 'pink' },
  { id: 'actions', name: 'Actions', emoji: '⚡', color: 'yellow' },
  { id: 'food', name: 'Food', emoji: '🍕', color: 'red' },
  { id: 'places', name: 'Places', emoji: '🏰', color: 'cyan' },
];

// Sample words for each category (for browsing)
const CATEGORY_WORDS: Record<string, string[]> = {
  animals: ['elephant', 'dolphin', 'butterfly', 'penguin', 'chameleon', 'octopus'],
  science: ['molecule', 'gravity', 'experiment', 'hypothesis', 'energy', 'atom'],
  nature: ['ecosystem', 'photosynthesis', 'habitat', 'climate', 'volcano', 'glacier'],
  space: ['constellation', 'asteroid', 'galaxy', 'orbit', 'nebula', 'satellite'],
  feelings: ['curious', 'excited', 'grateful', 'confident', 'peaceful', 'determined'],
  actions: ['explore', 'discover', 'create', 'imagine', 'collaborate', 'persevere'],
  food: ['nutritious', 'delicious', 'ingredient', 'recipe', 'appetite', 'cuisine'],
  places: ['ancient', 'magnificent', 'tropical', 'mysterious', 'historic', 'remote'],
};

function DictionaryPageContent() {
  const { colors, themeId, childExtras } = useChildTheme();
  const toast = useToast();
  const { setContext, setCustomData } = useRightPanel();
  
  // PIC integration for tracking vocabulary learning
  const { logActivity, updateProgress, addKnowledge } = useKidsPIC();
  
  // Debug theme loading
  useEffect(() => {
    const isMinecraftTheme = themeId?.includes('minecraft') || childExtras?.themeName === 'minecraft';
    console.log('[Dictionary] Theme updated:', { 
      themeId, 
      themeName: childExtras?.themeName, 
      hasBackground: !!childExtras?.decorations?.backgroundImages,
      primaryColor: colors?.primary,
      isMinecraft: isMinecraftTheme
    });
    
    if (isMinecraftTheme) {
      console.log('[Dictionary] ✅ Minecraft theme active!');
    }
  }, [themeId, childExtras, colors]);
  
  // Responsive values
  const isMobile = useBreakpointValue({ base: true, md: false });
  const containerPadding = useBreakpointValue({ base: 3, md: 4 });
  const cardSpacing = useBreakpointValue({ base: 3, md: 4 });
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<DictionaryEntry | null>(null);
  const [wordOfDay, setWordOfDay] = useState<DictionaryEntry | null>(null);
  const [stats, setStats] = useState<VocabStats | null>(null);
  const [recentWords, setRecentWords] = useState<RecentWord[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  
  // Quiz state
  const [quizActive, setQuizActive] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [showQuizResult, setShowQuizResult] = useState(false);
  
  const { isOpen: isQuizOpen, onOpen: onQuizOpen, onClose: onQuizClose } = useDisclosure();

  // Set right panel context on mount
  useEffect(() => {
    setContext('child-dictionary');
  }, [setContext]);
  
  // Update panel with current word
  useEffect(() => {
    if (currentEntry) {
      setCustomData({
        currentWord: currentEntry,
      });
    }
  }, [currentEntry, setCustomData]);

  // Listen for events from right panel
  useEffect(() => {
    const handlePanelSearch = (e: CustomEvent) => {
      const word = e.detail?.word;
      if (word) {
        setSearchQuery(word);
        handleSearch(word);
      }
    };
    
    const handlePanelQuiz = () => {
      setActiveTab(4); // Quiz tab
      startQuiz();
    };
    
    window.addEventListener('dictionary-search', handlePanelSearch as EventListener);
    window.addEventListener('dictionary-start-quiz', handlePanelQuiz);
    
    return () => {
      window.removeEventListener('dictionary-search', handlePanelSearch as EventListener);
      window.removeEventListener('dictionary-start-quiz', handlePanelQuiz);
    };
  }, []);

  // Defer non-critical data fetching to avoid blocking render
  useEffect(() => {
    // Use setTimeout to defer these calls until after initial render
    const timer = setTimeout(() => {
      fetchWordOfDay();
      fetchStats();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  const fetchWordOfDay = async () => {
    try {
      const res = await fetch('/api/child/dictionary?action=word-of-day');
      if (res.ok) {
        const data = await res.json();
        setWordOfDay(data.wordOfDay);
      }
    } catch (error) {
      console.error('[Dictionary] Failed to fetch word of day:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/child/dictionary?action=stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setRecentWords(data.recentWords || []);
        setFavorites(data.favorites?.map((f: any) => f.word) || []);
      }
    } catch (error) {
      console.error('[Dictionary] Failed to fetch stats:', error);
    }
  };

  const handleSearch = async (word?: string) => {
    const searchWord = word || searchQuery.trim();
    if (!searchWord) return;
    
    console.log('[Dictionary] Searching for:', searchWord);
    setLoading(true);
    try {
      const res = await fetch(`/api/child/dictionary?word=${encodeURIComponent(searchWord)}&source=dictionary`);
      console.log('[Dictionary] API response status:', res.status);
      if (res.ok) {
        const data = await res.json();
        console.log('[Dictionary] API response data:', data);
        console.log('[Dictionary] Setting currentEntry to:', data.entry);
        setCurrentEntry(data.entry);
        console.log('[Dictionary] Current activeTab:', activeTab, '- will switch to tab 1');
        // Refresh stats after lookup
        fetchStats();
        
        // Log to PIC system
        if (data.entry) {
          logActivity({
            activityType: 'word_lookup',
            activityCategory: 'dictionary',
            sourceType: 'dictionary',
            title: data.entry.word,
            metadata: { 
              partOfSpeech: data.entry.partOfSpeech,
              difficulty: data.entry.difficulty,
              category: data.entry.category,
            },
          });
          updateProgress('dictionary', 'words_learned', 1);
          addKnowledge({
            sourceType: 'activity',
            knowledgeType: 'skill',
            category: 'vocabulary',
            title: data.entry.word,
            content: `Learned word: ${data.entry.word} - ${data.entry.definition}`,
            keywords: [data.entry.word, data.entry.partOfSpeech, ...(data.entry.synonyms || []).slice(0, 3)],
          });
        }
      } else {
        const errorText = await res.text();
        console.error('[Dictionary] API error:', res.status, errorText);
        toast({
          title: "Word not found",
          description: "Try a different word!",
          status: 'info',
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('[Dictionary] Search error:', error);
      toast({
        title: 'Oops!',
        description: 'Something went wrong. Try again!',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSpeak = (word: string) => {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.rate = 0.8;
    window.speechSynthesis.speak(utterance);
  };

  const handleToggleFavorite = async (word: string, definition?: string) => {
    const isFavorite = favorites.includes(word.toLowerCase());
    
    try {
      await fetch('/api/child/dictionary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isFavorite ? 'unfavorite' : 'favorite',
          word,
          definition,
        }),
      });
      
      if (isFavorite) {
        setFavorites(prev => prev.filter(w => w !== word.toLowerCase()));
        toast({
          title: 'Word removed',
          status: 'info',
          duration: 2000,
        });
      } else {
        setFavorites(prev => [...prev, word.toLowerCase()]);
        toast({
          title: '⭐ Word saved!',
          description: `"${word}" added to your word bank!`,
          status: 'success',
          duration: 2000,
        });
      }
    } catch (error) {
      console.error('[Dictionary] Favorite error:', error);
    }
  };

  // Generate quiz questions from recent/favorite words
  const startQuiz = async () => {
    const wordsForQuiz = Array.from(new Set([...favorites, ...recentWords.map(w => w.word)])).slice(0, 10);
    
    if (wordsForQuiz.length < 3) {
      toast({
        title: 'Need more words!',
        description: 'Look up at least 3 words first to take a quiz.',
        status: 'info',
        duration: 4000,
      });
      return;
    }
    
    setLoading(true);
    const questions: QuizQuestion[] = [];
    
    // Fetch definitions for quiz words
    for (const word of wordsForQuiz.slice(0, 5)) {
      try {
        const res = await fetch(`/api/child/dictionary?word=${encodeURIComponent(word)}&source=quiz`);
        if (res.ok) {
          const data = await res.json();
          const entry = data.entry;
          
          // Create wrong options from other words' definitions or generic wrong answers
          const wrongOptions = [
            'Something you eat for breakfast',
            'A type of animal that lives in water',
            'A feeling when you are happy',
            'A place where people live',
            'An action you do every day',
          ].filter(opt => opt !== entry.definition).slice(0, 3);
          
          const options = [entry.definition, ...wrongOptions.slice(0, 3)];
          // Shuffle options
          const shuffled = options.sort(() => Math.random() - 0.5);
          
          questions.push({
            word: entry.word,
            definition: entry.definition,
            options: shuffled,
            correctIndex: shuffled.indexOf(entry.definition),
          });
        }
      } catch (e) {
        console.error('[Quiz] Error fetching word:', e);
      }
    }
    
    setLoading(false);
    
    if (questions.length > 0) {
      setQuizQuestions(questions);
      setCurrentQuestionIndex(0);
      setQuizScore(0);
      setSelectedAnswer(null);
      setShowQuizResult(false);
      setQuizActive(true);
      onQuizOpen();
    }
  };

  const handleQuizAnswer = (answer: string) => {
    setSelectedAnswer(answer);
    const currentQuestion = quizQuestions[currentQuestionIndex];
    const isCorrect = currentQuestion.options.indexOf(answer) === currentQuestion.correctIndex;
    
    if (isCorrect) {
      setQuizScore(prev => prev + 1);
    }
    
    // Move to next question after delay
    setTimeout(() => {
      if (currentQuestionIndex < quizQuestions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setSelectedAnswer(null);
      } else {
        setShowQuizResult(true);
      }
    }, 1500);
  };

  const resetQuiz = () => {
    setQuizActive(false);
    setQuizQuestions([]);
    setCurrentQuestionIndex(0);
    setQuizScore(0);
    setSelectedAnswer(null);
    setShowQuizResult(false);
    onQuizClose();
  };

  // Theme colors - use theme colors from context
  const isMinecraft = themeId?.includes('minecraft') || childExtras?.themeName === 'minecraft';
  const isPusheen = themeId?.includes('pusheen') || childExtras?.themeName === 'pusheen';
  const hasThemedBackground = isMinecraft || isPusheen;
  const themeColor = isMinecraft ? 'green' : isPusheen ? 'pink' : 'purple';
  const themeBg = colors?.backgroundSecondary || `${themeColor}.50`;
  const themeAccent = colors?.primary || `${themeColor}.500`;
  
  // More transparent cards for better background visibility (matching home.tsx)
  const cardBg = isMinecraft 
    ? 'rgba(135, 206, 235, 0.85)'  // Sky blue for Minecraft
    : isPusheen 
    ? 'rgba(255, 255, 255, 0.85)' 
    : (colors?.background || 'white');
  
  // Background mode state - load from localStorage
  const [bgMode, setBgMode] = useState<BackgroundMode>('tile-medium');
  
  useEffect(() => {
    const saved = localStorage.getItem('childDictionaryBgMode');
    if (saved) setBgMode(saved as BackgroundMode);
  }, []);
  
  const handleBgModeChange = (mode: BackgroundMode) => {
    setBgMode(mode);
    localStorage.setItem('childDictionaryBgMode', mode);
  };
  
  // Get background image from theme
  const backgroundImages = childExtras?.decorations?.backgroundImages;
  const backgroundImage = backgroundImages?.dictionary || backgroundImages?.default;
  const bgStyles = getBackgroundStyles(bgMode);

  // Difficulty badge color
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'green';
      case 'medium': return 'orange';
      case 'hard': return 'red';
      default: return 'gray';
    }
  };

  // Auto-switch to search results when we have an entry
  useEffect(() => {
    console.log('[Dictionary] useEffect triggered - currentEntry:', currentEntry?.word, 'activeTab:', activeTab);
    if (currentEntry && activeTab !== 1) {
      console.log('[Dictionary] Switching to Results tab (1)');
      setActiveTab(1);
    }
  }, [currentEntry, activeTab]);

  return (
    <BackgroundContextMenu onModeChange={handleBgModeChange} currentMode={bgMode}>
      <Box 
        minH="calc(100vh - 60px)" 
        bg={colors?.background || themeBg}
        backgroundImage={backgroundImage ? `url(${backgroundImage})` : undefined}
        backgroundRepeat={bgStyles.backgroundRepeat}
        backgroundSize={bgStyles.backgroundSize}
        backgroundPosition={bgStyles.backgroundPosition}
        backgroundAttachment={bgStyles.backgroundAttachment}
        py={{ base: 3, md: 6 }}
        pb={{ base: 'calc(env(safe-area-inset-bottom) + 16px)', md: 6 }}
      >
        <Container maxW="container.md" px={{ base: 3, md: 4 }}>
        <VStack spacing={cardSpacing} align="stretch">
          {/* Compact Header with Search */}
          <Box
            bg={cardBg}
            borderRadius={isMinecraft ? '4px' : 'xl'}
            p={4}
            boxShadow={isMinecraft ? `3px 3px 0px ${themeAccent}` : 'sm'}
            border="1px solid"
            borderColor={isMinecraft ? themeAccent : 'gray.100'}
          >
            <VStack spacing={3}>
              {/* Title Row - Compact */}
              <Flex w="100%" justify="space-between" align="center" flexWrap="wrap" gap={2}>
                <HStack spacing={2}>
                  <Text fontSize="xl">📖</Text>
                  <Text 
                    fontSize={{ base: 'md', md: 'lg' }} 
                    fontWeight="bold" 
                    color={themeAccent}
                    fontFamily={isMinecraft ? '"VT323", monospace' : 'inherit'}
                  >
                    My Dictionary
                  </Text>
                </HStack>
                
                {/* Compact Stats */}
                {stats && (
                  <HStack spacing={2}>
                    <Badge 
                      colorScheme={themeColor} 
                      fontSize="xs" 
                      px={2} 
                      py={0.5}
                      borderRadius={isMinecraft ? '2px' : 'full'}
                    >
                      📚 {stats.total_words} words
                    </Badge>
                    <Badge 
                      colorScheme="orange" 
                      fontSize="xs" 
                      px={2} 
                      py={0.5}
                      borderRadius={isMinecraft ? '2px' : 'full'}
                    >
                      ⚡ {stats.words_today} today
                    </Badge>
                  </HStack>
                )}
              </Flex>
              
              {/* Search bar - Connected to results */}
              <InputGroup size="md">
                <InputLeftElement pointerEvents="none">
                  <FiSearch color="gray" />
                </InputLeftElement>
                <Input
                  placeholder="Search for a word..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  bg="white"
                  borderRadius={isMinecraft ? '4px' : 'full'}
                  fontSize="sm"
                  border="2px solid"
                  borderColor="gray.200"
                  _focus={{ 
                    borderColor: themeAccent, 
                    boxShadow: isMinecraft ? `2px 2px 0px ${themeAccent}` : `0 0 0 1px ${themeAccent}` 
                  }}
                  _hover={{ borderColor: 'gray.300' }}
                />
                <InputRightElement width="3.5rem">
                  <Button
                    h="1.5rem"
                    size="xs"
                    colorScheme={themeColor}
                    borderRadius={isMinecraft ? '2px' : 'full'}
                    onClick={() => handleSearch()}
                    isLoading={loading}
                    fontWeight="bold"
                  >
                    Go!
                  </Button>
                </InputRightElement>
              </InputGroup>
            </VStack>
          </Box>

          {/* Tab Navigation - Compact */}
          <Tabs 
            index={activeTab} 
            onChange={setActiveTab}
            colorScheme={themeColor}
            variant="soft-rounded"
            size="sm"
          >
            <TabList 
              flexWrap="wrap" 
              gap={1} 
              bg={cardBg}
              p={2}
              borderRadius={isMinecraft ? '4px' : 'lg'}
              boxShadow="sm"
            >
              <Tab fontSize="xs" px={3} py={1.5} borderRadius={isMinecraft ? '2px' : 'full'}>
                🌟 Today
              </Tab>
              <Tab fontSize="xs" px={3} py={1.5} borderRadius={isMinecraft ? '2px' : 'full'}>
                🔍 Results
              </Tab>
              <Tab fontSize="xs" px={3} py={1.5} borderRadius={isMinecraft ? '2px' : 'full'}>
                📚 Browse
              </Tab>
              <Tab fontSize="xs" px={3} py={1.5} borderRadius={isMinecraft ? '2px' : 'full'}>
                ⭐ My Words
              </Tab>
              <Tab fontSize="xs" px={3} py={1.5} borderRadius={isMinecraft ? '2px' : 'full'}>
                🎮 Quiz
              </Tab>
            </TabList>

            <TabPanels>
              {/* Word of the Day Tab */}
              <TabPanel px={0} pt={3}>
                {wordOfDay ? (
                  <Box
                    bg={cardBg}
                    borderRadius={isMinecraft ? '4px' : 'xl'}
                    overflow="hidden"
                    boxShadow={isMinecraft ? `3px 3px 0px ${themeAccent}` : 'sm'}
                    border="1px solid"
                    borderColor={isMinecraft ? themeAccent : 'gray.100'}
                  >
                    {/* Word Header */}
                    <Box 
                      bg={isMinecraft ? themeAccent : `${themeColor}.100`} 
                      px={4} 
                      py={3}
                    >
                      <Flex justify="space-between" align="center">
                        <HStack spacing={2}>
                          <Text fontSize="lg">🌟</Text>
                          <Box>
                            <Text fontSize="xs" color={isMinecraft ? 'whiteAlpha.800' : 'gray.600'}>
                              Word of the Day
                            </Text>
                            <Text 
                              fontSize={{ base: 'lg', md: 'xl' }} 
                              fontWeight="bold" 
                              color={isMinecraft ? 'white' : themeAccent}
                              fontFamily={isMinecraft ? '"VT323", monospace' : 'inherit'}
                            >
                              {wordOfDay.word}
                            </Text>
                          </Box>
                        </HStack>
                        <HStack spacing={1}>
                          <IconButton
                            icon={<FiVolume2 />}
                            aria-label="Pronounce"
                            size="sm"
                            colorScheme={isMinecraft ? 'whiteAlpha' : themeColor}
                            variant="ghost"
                            onClick={() => handleSpeak(wordOfDay.word)}
                          />
                          <IconButton
                            icon={<FiHeart />}
                            aria-label="Save"
                            size="sm"
                            colorScheme="pink"
                            variant={favorites.includes(wordOfDay.word.toLowerCase()) ? 'solid' : 'ghost'}
                            onClick={() => handleToggleFavorite(wordOfDay.word, wordOfDay.definition)}
                          />
                        </HStack>
                      </Flex>
                    </Box>
                    
                    {/* Word Content */}
                    <Box p={4}>
                      <VStack align="stretch" spacing={3}>
                        <HStack spacing={2}>
                          {wordOfDay.pronunciation && (
                            <Text fontSize="sm" color="gray.500" fontStyle="italic">
                              🔊 {wordOfDay.pronunciation}
                            </Text>
                          )}
                          <Badge 
                            colorScheme={getDifficultyColor(wordOfDay.difficulty)} 
                            fontSize="xs"
                            borderRadius={isMinecraft ? '2px' : 'full'}
                          >
                            {wordOfDay.partOfSpeech} • {wordOfDay.difficulty}
                          </Badge>
                        </HStack>
                        
                        <Text fontSize="sm" lineHeight="tall" color="gray.700">
                          {wordOfDay.definition}
                        </Text>
                        
                        {wordOfDay.examples && wordOfDay.examples.length > 0 && (
                          <Box bg="gray.50" p={3} borderRadius={isMinecraft ? '4px' : 'md'}>
                            <Text fontSize="xs" fontWeight="bold" mb={1}>✏️ Examples:</Text>
                            <VStack align="stretch" spacing={1}>
                              {wordOfDay.examples.slice(0, 2).map((ex, i) => (
                                <Text key={i} fontSize="xs" fontStyle="italic" color="gray.600">
                                  "{ex}"
                                </Text>
                              ))}
                            </VStack>
                          </Box>
                        )}
                        
                        {wordOfDay.spanishTranslation && (
                          <HStack bg="orange.50" p={2} borderRadius={isMinecraft ? '4px' : 'md'}>
                            <Text fontSize="md">🇲🇽</Text>
                            <Box>
                              <Text fontSize="sm" fontWeight="bold" color="orange.700">
                                {wordOfDay.spanishTranslation}
                              </Text>
                              {wordOfDay.spanishDefinition && (
                                <Text fontSize="xs" color="orange.600">
                                  {wordOfDay.spanishDefinition}
                                </Text>
                              )}
                            </Box>
                          </HStack>
                        )}
                        
                        {(wordOfDay.synonyms?.length > 0 || wordOfDay.relatedWords?.length > 0) && (
                          <>
                            <Divider />
                            <Wrap spacing={1}>
                              {wordOfDay.synonyms?.slice(0, 4).map((syn, i) => (
                                <WrapItem key={i}>
                                  <Tag 
                                    size="sm"
                                    colorScheme={themeColor} 
                                    cursor="pointer"
                                    borderRadius={isMinecraft ? '2px' : 'full'}
                                    onClick={() => {
                                      setSearchQuery(syn);
                                      handleSearch(syn);
                                    }}
                                  >
                                    {syn}
                                  </Tag>
                                </WrapItem>
                              ))}
                              {wordOfDay.relatedWords?.slice(0, 3).map((rel, i) => (
                                <WrapItem key={i}>
                                  <Tag 
                                    size="sm"
                                    colorScheme="gray" 
                                    cursor="pointer"
                                    borderRadius={isMinecraft ? '2px' : 'full'}
                                    onClick={() => {
                                      setSearchQuery(rel);
                                      handleSearch(rel);
                                    }}
                                  >
                                    {rel}
                                  </Tag>
                                </WrapItem>
                              ))}
                            </Wrap>
                          </>
                        )}
                      </VStack>
                    </Box>
                  </Box>
                ) : (
                  <Box
                    bg={cardBg}
                    borderRadius={isMinecraft ? '4px' : 'xl'}
                    p={6}
                    textAlign="center"
                    boxShadow="sm"
                  >
                    <Spinner size="md" color={themeAccent} />
                    <Text mt={3} fontSize="sm" color="gray.500">Loading word of the day...</Text>
                  </Box>
                )}
              </TabPanel>

              {/* Search Results Tab */}
              <TabPanel px={0} pt={3}>
                {currentEntry ? (
                  <Box
                    bg={cardBg}
                    borderRadius={isMinecraft ? '4px' : 'xl'}
                    overflow="hidden"
                    boxShadow={isMinecraft ? `3px 3px 0px ${themeAccent}` : 'sm'}
                    border="1px solid"
                    borderColor={isMinecraft ? themeAccent : 'gray.100'}
                  >
                    {/* Word Header */}
                    <Box 
                      bg={isMinecraft ? themeAccent : `${themeColor}.50`} 
                      px={4} 
                      py={3}
                    >
                      <Flex justify="space-between" align="center">
                        <HStack spacing={2}>
                          <Text fontSize="lg">📖</Text>
                          <Text 
                            fontSize={{ base: 'lg', md: 'xl' }} 
                            fontWeight="bold" 
                            color={isMinecraft ? 'white' : themeAccent}
                            fontFamily={isMinecraft ? '"VT323", monospace' : 'inherit'}
                          >
                            {currentEntry.word}
                          </Text>
                        </HStack>
                        <HStack spacing={1}>
                          <IconButton
                            icon={<FiVolume2 />}
                            aria-label="Pronounce"
                            size="sm"
                            colorScheme={isMinecraft ? 'whiteAlpha' : themeColor}
                            variant="ghost"
                            onClick={() => handleSpeak(currentEntry.word)}
                          />
                          <IconButton
                            icon={<FiHeart />}
                            aria-label="Save"
                            size="sm"
                            colorScheme="pink"
                            variant={favorites.includes(currentEntry.word.toLowerCase()) ? 'solid' : 'ghost'}
                            onClick={() => handleToggleFavorite(currentEntry.word, currentEntry.definition)}
                          />
                        </HStack>
                      </Flex>
                    </Box>
                    
                    {/* Word Content */}
                    <Box p={4}>
                      <VStack align="stretch" spacing={3}>
                        <HStack spacing={2} flexWrap="wrap">
                          {currentEntry.pronunciation && (
                            <Text fontSize="sm" color="gray.500" fontStyle="italic">
                              🔊 {currentEntry.pronunciation}
                            </Text>
                          )}
                          <Badge colorScheme="blue" fontSize="xs" borderRadius={isMinecraft ? '2px' : 'full'}>
                            {currentEntry.partOfSpeech}
                          </Badge>
                          <Badge 
                            colorScheme={getDifficultyColor(currentEntry.difficulty)} 
                            fontSize="xs"
                            borderRadius={isMinecraft ? '2px' : 'full'}
                          >
                            {currentEntry.difficulty}
                          </Badge>
                        </HStack>
                        
                        <Text fontSize="sm" lineHeight="tall" color="gray.700">
                          {currentEntry.definition}
                        </Text>
                        
                        {currentEntry.examples && currentEntry.examples.length > 0 && (
                          <Box bg="gray.50" p={3} borderRadius={isMinecraft ? '4px' : 'md'}>
                            <Text fontSize="xs" fontWeight="bold" mb={1}>✏️ Examples:</Text>
                            <VStack align="stretch" spacing={1}>
                              {currentEntry.examples.slice(0, 2).map((ex, i) => (
                                <Text key={i} fontSize="xs" fontStyle="italic" color="gray.600">
                                  "{ex}"
                                </Text>
                              ))}
                            </VStack>
                          </Box>
                        )}
                        
                        {currentEntry.etymology && (
                          <Box bg="yellow.50" p={2} borderRadius={isMinecraft ? '4px' : 'md'}>
                            <Text fontSize="xs">
                              <strong>📜 Origin:</strong> {currentEntry.etymology}
                            </Text>
                          </Box>
                        )}
                        
                        {currentEntry.spanishTranslation && (
                          <HStack bg="orange.50" p={2} borderRadius={isMinecraft ? '4px' : 'md'}>
                            <Text fontSize="md">🇲🇽</Text>
                            <Box>
                              <Text fontSize="sm" fontWeight="bold" color="orange.700">
                                {currentEntry.spanishTranslation}
                              </Text>
                              {currentEntry.spanishDefinition && (
                                <Text fontSize="xs" color="orange.600">
                                  {currentEntry.spanishDefinition}
                                </Text>
                              )}
                            </Box>
                          </HStack>
                        )}
                        
                        {currentEntry.funFact && (
                          <Box bg="blue.50" p={2} borderRadius={isMinecraft ? '4px' : 'md'}>
                            <Text fontSize="xs">💡 <strong>Fun fact:</strong> {currentEntry.funFact}</Text>
                          </Box>
                        )}
                        
                        {(currentEntry.synonyms?.length > 0 || currentEntry.antonyms?.length > 0 || currentEntry.relatedWords?.length > 0) && (
                          <>
                            <Divider />
                            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={2}>
                              {currentEntry.synonyms && currentEntry.synonyms.length > 0 && (
                                <Box>
                                  <Text fontSize="xs" fontWeight="bold" mb={1}>🔄 Similar:</Text>
                                  <Wrap spacing={1}>
                                    {currentEntry.synonyms.slice(0, 4).map((syn, i) => (
                                      <WrapItem key={i}>
                                        <Tag 
                                          size="sm"
                                          colorScheme="green" 
                                          cursor="pointer"
                                          borderRadius={isMinecraft ? '2px' : 'full'}
                                          onClick={() => {
                                            setSearchQuery(syn);
                                            handleSearch(syn);
                                          }}
                                        >
                                          {syn}
                                        </Tag>
                                      </WrapItem>
                                    ))}
                                  </Wrap>
                                </Box>
                              )}
                              
                              {currentEntry.antonyms && currentEntry.antonyms.length > 0 && (
                                <Box>
                                  <Text fontSize="xs" fontWeight="bold" mb={1}>↔️ Opposite:</Text>
                                  <Wrap spacing={1}>
                                    {currentEntry.antonyms.slice(0, 4).map((ant, i) => (
                                      <WrapItem key={i}>
                                        <Tag 
                                          size="sm"
                                          colorScheme="red" 
                                          cursor="pointer"
                                          borderRadius={isMinecraft ? '2px' : 'full'}
                                          onClick={() => {
                                            setSearchQuery(ant);
                                            handleSearch(ant);
                                          }}
                                        >
                                          {ant}
                                        </Tag>
                                      </WrapItem>
                                    ))}
                                  </Wrap>
                                </Box>
                              )}
                            </SimpleGrid>
                            
                            {currentEntry.relatedWords && currentEntry.relatedWords.length > 0 && (
                              <Box>
                                <Text fontSize="xs" fontWeight="bold" mb={1}>🔍 Explore:</Text>
                                <Wrap spacing={1}>
                                  {currentEntry.relatedWords.slice(0, 5).map((rel, i) => (
                                    <WrapItem key={i}>
                                      <Tag 
                                        size="sm"
                                        colorScheme="gray" 
                                        cursor="pointer"
                                        borderRadius={isMinecraft ? '2px' : 'full'}
                                        onClick={() => {
                                          setSearchQuery(rel);
                                          handleSearch(rel);
                                        }}
                                      >
                                        {rel}
                                      </Tag>
                                    </WrapItem>
                                  ))}
                                </Wrap>
                              </Box>
                            )}
                          </>
                        )}
                      </VStack>
                    </Box>
                  </Box>
                ) : (
                  <Box
                    bg={cardBg}
                    borderRadius={isMinecraft ? '4px' : 'xl'}
                    p={6}
                    textAlign="center"
                    boxShadow="sm"
                  >
                    <Text fontSize="3xl" mb={2}>🔍</Text>
                    <Text fontSize="sm" color="gray.600" fontWeight="medium">
                      Search for a word to see its definition!
                    </Text>
                    <Text fontSize="xs" color="gray.400" mt={1}>
                      Try "adventure", "curious", or "ecosystem"
                    </Text>
                  </Box>
                )}
              </TabPanel>

              {/* Browse Tab */}
              <TabPanel px={0} pt={3}>
                <VStack spacing={3} align="stretch">
                  <Box
                    bg={cardBg}
                    borderRadius={isMinecraft ? '4px' : 'xl'}
                    p={4}
                    boxShadow={isMinecraft ? `3px 3px 0px ${themeAccent}` : 'sm'}
                    border="1px solid"
                    borderColor={isMinecraft ? themeAccent : 'gray.100'}
                  >
                    <Text fontSize="sm" fontWeight="bold" mb={3}>
                      📚 Browse by Category
                    </Text>
                    
                    <SimpleGrid columns={{ base: 2, md: 4 }} spacing={2}>
                      {WORD_CATEGORIES.map((cat) => (
                        <Box 
                          key={cat.id}
                          bg={`${cat.color}.50`}
                          borderRadius={isMinecraft ? '4px' : 'lg'}
                          p={3}
                          textAlign="center"
                          cursor="pointer"
                          border="1px solid"
                          borderColor={`${cat.color}.200`}
                          _hover={{ 
                            transform: 'scale(1.02)', 
                            boxShadow: isMinecraft ? `2px 2px 0px ${cat.color}.400` : 'md' 
                          }}
                          transition="all 0.2s"
                          onClick={() => {
                            const words = CATEGORY_WORDS[cat.id];
                            if (words?.length > 0) {
                              const randomWord = words[Math.floor(Math.random() * words.length)];
                              setSearchQuery(randomWord);
                              handleSearch(randomWord);
                            }
                          }}
                        >
                          <Text fontSize="xl" mb={1}>{cat.emoji}</Text>
                          <Text fontSize="xs" fontWeight="bold" color={`${cat.color}.700`}>
                            {cat.name}
                          </Text>
                        </Box>
                      ))}
                    </SimpleGrid>
                  </Box>
                  
                  <Box
                    bg={cardBg}
                    borderRadius={isMinecraft ? '4px' : 'xl'}
                    p={4}
                    boxShadow="sm"
                  >
                    <Text fontSize="sm" fontWeight="bold" mb={2}>
                      ✨ Popular Words
                    </Text>
                    
                    <Wrap spacing={1}>
                      {Object.values(CATEGORY_WORDS).flat().slice(0, 16).map((word, i) => (
                        <WrapItem key={i}>
                          <Tag
                            size="sm"
                            colorScheme={themeColor}
                            variant="subtle"
                            cursor="pointer"
                            borderRadius={isMinecraft ? '2px' : 'full'}
                            _hover={{ bg: `${themeColor}.100` }}
                            onClick={() => {
                              setSearchQuery(word);
                              handleSearch(word);
                            }}
                          >
                            <TagLabel fontSize="xs">{word}</TagLabel>
                          </Tag>
                        </WrapItem>
                      ))}
                    </Wrap>
                  </Box>
                </VStack>
              </TabPanel>

              {/* My Words Tab */}
              <TabPanel px={0} pt={3}>
                <VStack spacing={3} align="stretch">
                  {/* Compact Stats */}
                  {stats && (
                    <SimpleGrid columns={4} spacing={2}>
                      <Box 
                        bg={cardBg} 
                        p={3} 
                        borderRadius={isMinecraft ? '4px' : 'lg'} 
                        boxShadow="sm"
                        textAlign="center"
                      >
                        <Text fontSize="lg" fontWeight="bold" color={themeAccent}>{stats.total_words}</Text>
                        <Text fontSize="xs" color="gray.500">Total</Text>
                      </Box>
                      <Box 
                        bg={cardBg} 
                        p={3} 
                        borderRadius={isMinecraft ? '4px' : 'lg'} 
                        boxShadow="sm"
                        textAlign="center"
                      >
                        <Text fontSize="lg" fontWeight="bold" color="orange.500">{stats.words_this_week}</Text>
                        <Text fontSize="xs" color="gray.500">Week</Text>
                      </Box>
                      <Box 
                        bg={cardBg} 
                        p={3} 
                        borderRadius={isMinecraft ? '4px' : 'lg'} 
                        boxShadow="sm"
                        textAlign="center"
                      >
                        <Text fontSize="lg" fontWeight="bold" color="green.500">{stats.words_today}</Text>
                        <Text fontSize="xs" color="gray.500">Today</Text>
                      </Box>
                      <Box 
                        bg={cardBg} 
                        p={3} 
                        borderRadius={isMinecraft ? '4px' : 'lg'} 
                        boxShadow="sm"
                        textAlign="center"
                      >
                        <Text fontSize="lg" fontWeight="bold" color="pink.500">{favorites.length}</Text>
                        <Text fontSize="xs" color="gray.500">Saved</Text>
                      </Box>
                    </SimpleGrid>
                  )}
                  
                  {/* Favorite Words */}
                  <Box
                    bg={cardBg}
                    borderRadius={isMinecraft ? '4px' : 'xl'}
                    p={4}
                    boxShadow={isMinecraft ? `3px 3px 0px ${themeAccent}` : 'sm'}
                    border="1px solid"
                    borderColor={isMinecraft ? themeAccent : 'gray.100'}
                  >
                    <Text fontSize="sm" fontWeight="bold" mb={2}>⭐ Favorites</Text>
                    {favorites.length > 0 ? (
                      <Wrap spacing={1}>
                        {favorites.map((word, i) => (
                          <WrapItem key={i}>
                            <Tag
                              size="sm"
                              colorScheme="pink"
                              cursor="pointer"
                              borderRadius={isMinecraft ? '2px' : 'full'}
                              onClick={() => {
                                setSearchQuery(word);
                                handleSearch(word);
                              }}
                            >
                              <TagLeftIcon as={FiStar} boxSize="10px" />
                              <TagLabel fontSize="xs">{word}</TagLabel>
                            </Tag>
                          </WrapItem>
                        ))}
                      </Wrap>
                    ) : (
                      <Text fontSize="xs" color="gray.500" textAlign="center">
                        Click ❤️ on words to save them here!
                      </Text>
                    )}
                  </Box>
                  
                  {/* Recent Lookups */}
                  <Box
                    bg={cardBg}
                    borderRadius={isMinecraft ? '4px' : 'xl'}
                    p={4}
                    boxShadow="sm"
                  >
                    <Text fontSize="sm" fontWeight="bold" mb={2}>🕐 Recent</Text>
                    {recentWords.length > 0 ? (
                      <VStack align="stretch" spacing={1}>
                        {recentWords.slice(0, 6).map((item, i) => (
                          <HStack 
                            key={i} 
                            justify="space-between"
                            p={2}
                            bg="gray.50"
                            borderRadius={isMinecraft ? '4px' : 'md'}
                            cursor="pointer"
                            _hover={{ bg: 'gray.100' }}
                            onClick={() => {
                              setSearchQuery(item.word);
                              handleSearch(item.word);
                            }}
                          >
                            <Text fontSize="sm" fontWeight="medium">{item.word}</Text>
                            <Badge colorScheme="gray" fontSize="xs" borderRadius={isMinecraft ? '2px' : 'full'}>
                              {item.lookup_count}x
                            </Badge>
                          </HStack>
                        ))}
                      </VStack>
                    ) : (
                      <Text fontSize="xs" color="gray.500" textAlign="center">
                        Start exploring words!
                      </Text>
                    )}
                  </Box>
                </VStack>
              </TabPanel>

              {/* Quiz Tab */}
              <TabPanel px={0} pt={3}>
                <Box
                  bg={cardBg}
                  borderRadius={isMinecraft ? '4px' : 'xl'}
                  p={6}
                  textAlign="center"
                  boxShadow={isMinecraft ? `3px 3px 0px ${themeAccent}` : 'sm'}
                  border="1px solid"
                  borderColor={isMinecraft ? themeAccent : 'gray.100'}
                >
                  <Text fontSize="3xl" mb={2}>🎮</Text>
                  <Text 
                    fontSize="md" 
                    fontWeight="bold" 
                    mb={2}
                    fontFamily={isMinecraft ? '"VT323", monospace' : 'inherit'}
                  >
                    Vocabulary Quiz
                  </Text>
                  <Text fontSize="xs" color="gray.500" mb={4}>
                    Test your word knowledge!
                  </Text>
                  
                  <HStack justify="center" spacing={6} mb={4}>
                    <Box textAlign="center">
                      <Text fontSize="xl" fontWeight="bold" color={themeAccent}>
                        {Math.min(favorites.length + recentWords.length, 10)}
                      </Text>
                      <Text fontSize="xs" color="gray.500">Words</Text>
                    </Box>
                    <Box textAlign="center">
                      <Text fontSize="xl" fontWeight="bold" color="orange.500">5</Text>
                      <Text fontSize="xs" color="gray.500">Questions</Text>
                    </Box>
                  </HStack>
                  
                  <Button
                    size="md"
                    colorScheme={themeColor}
                    leftIcon={<FiZap />}
                    onClick={startQuiz}
                    isLoading={loading}
                    isDisabled={favorites.length + recentWords.length < 3}
                    borderRadius={isMinecraft ? '4px' : 'full'}
                  >
                    Start Quiz!
                  </Button>
                  
                  {favorites.length + recentWords.length < 3 && (
                    <Text fontSize="xs" color="orange.500" mt={3}>
                      Look up 3+ words first!
                    </Text>
                  )}
                </Box>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </VStack>
        </Container>
      </Box>

      {/* Quiz Modal */}
      <Modal isOpen={isQuizOpen} onClose={resetQuiz} size="lg" closeOnOverlayClick={false}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {showQuizResult ? '🎉 Quiz Complete!' : `Question ${currentQuestionIndex + 1} of ${quizQuestions.length}`}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {showQuizResult ? (
              <VStack spacing={4} py={4}>
                <Text fontSize="6xl">
                  {quizScore === quizQuestions.length ? '🏆' : 
                   quizScore >= quizQuestions.length / 2 ? '⭐' : '📚'}
                </Text>
                <Heading size="lg">
                  {quizScore} / {quizQuestions.length} Correct!
                </Heading>
                <Text color="gray.600">
                  {quizScore === quizQuestions.length 
                    ? "Perfect score! You're a vocabulary champion!" 
                    : quizScore >= quizQuestions.length / 2
                    ? "Great job! Keep learning new words!"
                    : "Keep practicing! You'll get better!"}
                </Text>
                <Progress 
                  value={(quizScore / quizQuestions.length) * 100} 
                  colorScheme={quizScore === quizQuestions.length ? 'green' : 'blue'}
                  w="100%"
                  borderRadius="full"
                />
              </VStack>
            ) : quizQuestions.length > 0 && (
              <VStack spacing={4} align="stretch">
                <Text fontSize="lg" fontWeight="bold" textAlign="center">
                  What does "{quizQuestions[currentQuestionIndex]?.word}" mean?
                </Text>
                
                <RadioGroup value={selectedAnswer || ''}>
                  <Stack spacing={3}>
                    {quizQuestions[currentQuestionIndex]?.options.map((option, i) => {
                      const isCorrect = i === quizQuestions[currentQuestionIndex].correctIndex;
                      const isSelected = selectedAnswer === option;
                      const showResult = selectedAnswer !== null;
                      
                      return (
                        <Box
                          key={i}
                          p={3}
                          borderRadius="md"
                          border="2px solid"
                          borderColor={
                            showResult && isCorrect ? 'green.400' :
                            showResult && isSelected && !isCorrect ? 'red.400' :
                            'gray.200'
                          }
                          bg={
                            showResult && isCorrect ? 'green.50' :
                            showResult && isSelected && !isCorrect ? 'red.50' :
                            'white'
                          }
                          cursor={selectedAnswer ? 'default' : 'pointer'}
                          onClick={() => !selectedAnswer && handleQuizAnswer(option)}
                          _hover={!selectedAnswer ? { borderColor: themeAccent } : {}}
                        >
                          <HStack justify="space-between">
                            <Text>{option}</Text>
                            {showResult && isCorrect && <FiCheck color="green" />}
                            {showResult && isSelected && !isCorrect && <FiX color="red" />}
                          </HStack>
                        </Box>
                      );
                    })}
                  </Stack>
                </RadioGroup>
                
                <Progress 
                  value={((currentQuestionIndex + 1) / quizQuestions.length) * 100} 
                  colorScheme={themeColor}
                  size="sm"
                  borderRadius="full"
                />
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            {showQuizResult ? (
              <HStack spacing={2}>
                <Button variant="ghost" onClick={resetQuiz}>
                  Close
                </Button>
                <Button colorScheme={themeColor} leftIcon={<FiRefreshCw />} onClick={() => {
                  resetQuiz();
                  startQuiz();
                }}>
                  Try Again
                </Button>
              </HStack>
            ) : (
              <Text fontSize="sm" color="gray.500">
                Score: {quizScore} / {currentQuestionIndex + (selectedAnswer ? 1 : 0)}
              </Text>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </BackgroundContextMenu>
  );
}

export default function DictionaryPage() {
  return (
    <ChildDashboardLayout pageType="dictionary">
      <DictionaryPageContent />
    </ChildDashboardLayout>
  );
}
