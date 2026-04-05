/**
 * Child Chat Right Panel
 * 
 * Kid-friendly panel with:
 * - Character selection (fun AI personalities)
 * - Learning mode settings (subjects, difficulty)
 * - Topic starters and conversation ideas
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  Divider,
  SimpleGrid,
  Switch,
  FormControl,
  FormLabel,
  Select,
  Progress,
  Tooltip,
  Image,
  Spinner,
} from '@chakra-ui/react';
import { FiStar, FiBook, FiAward, FiZap } from 'react-icons/fi';

interface Character {
  id: string;
  name: string;
  emoji: string;
  description: string;
  personality: string;
  color: string;
  iconPath?: string;
}

interface LearningSettings {
  enabled: boolean;
  subject: string;
  difficulty: 'easy' | 'medium' | 'hard';
  encourageQuestions: boolean;
  // Bilingual Spanish learning
  spanishMode: boolean;
  spanishLevel: 'beginner' | 'intermediate' | 'advanced';
  spanishFocus: 'vocabulary' | 'grammar' | 'conversation' | 'all';
  // Read Aloud (TTS)
  readAloudEnabled: boolean;
  autoReadResponses: boolean;
  // Creative Mode - Image Generation from Chat
  creativeMode: boolean;
  creativeActivity: 'castle' | 'house' | 'cookie' | 'cake' | 'room' | 'spaceship' | 'robot' | 'garden' | 'custom';
}

interface TopicCategory {
  emoji: string;
  name: string;
  topics: string[];
}

// Characters will be loaded from the API
const DEFAULT_CHARACTERS: Character[] = [
  { 
    id: 'loading', 
    name: 'Loading...', 
    emoji: '⏳', 
    description: 'Loading characters...',
    personality: 'patient',
    color: 'gray'
  },
];

// Helper function to assign colors to characters
const getColorForCharacter = (characterName: string): string => {
  const colorMap: Record<string, string> = {
    'Steve': 'green',
    'Alex': 'orange',
    'Luna': 'purple',
    'Marina': 'blue',
    'Zara': 'purple',
    'Kai': 'green',
    'Pusheen': 'pink',
    'Stormy': 'blue',
    'Pip': 'orange',
    'Sloth': 'green',
    'Bo': 'blue',
    'Cheek': 'orange',
    'Cosmo': 'purple',
    'Pixel': 'teal',
  };
  return colorMap[characterName] || 'blue';
};

const SUBJECTS = [
  { value: 'general', label: '🌟 General Knowledge' },
  { value: 'math', label: '🔢 Math' },
  { value: 'science', label: '🔬 Science' },
  { value: 'reading', label: '📖 Reading & Writing' },
  { value: 'history', label: '🏛️ History' },
  { value: 'nature', label: '🌿 Nature & Animals' },
  { value: 'space', label: '🚀 Space & Astronomy' },
  { value: 'coding', label: '💻 Coding Basics' },
];

const TOPIC_CATEGORIES: TopicCategory[] = [
  {
    emoji: '🎮',
    name: 'Fun & Games',
    topics: [
      'Tell me a joke!',
      'Play a guessing game',
      'Tell me a riddle',
      'Would you rather...',
    ]
  },
  {
    emoji: '🌍',
    name: 'Learn Something',
    topics: [
      'Tell me about dinosaurs',
      'How do planes fly?',
      'Why is the sky blue?',
      'What are black holes?',
    ]
  },
  {
    emoji: '📚',
    name: 'Stories',
    topics: [
      'Tell me a bedtime story',
      'Make up an adventure',
      'A story about a dragon',
      'A mystery to solve',
    ]
  },
  {
    emoji: '🎨',
    name: 'Creative',
    topics: [
      'Help me write a poem',
      'Invent a new animal',
      'Create a superhero',
      'Design a video game',
    ]
  },
];

interface ChildChatPanelProps {
  activeTab: string;
  onCharacterChange?: (character: Character) => void;
  onLearningSettingsChange?: (settings: LearningSettings) => void;
  onTopicSelect?: (topic: string) => void;
}

// All available creative activities
const ALL_ACTIVITIES = [
  { value: 'castle', label: '🏰 Castle', theme: 'minecraft', ageMin: 4, ageMax: 12 },
  { value: 'house', label: '🏠 Dream House', theme: 'minecraft', ageMin: 6, ageMax: 12 },
  { value: 'cookie', label: '🍪 Cookies', theme: 'pusheen', ageMin: 4, ageMax: 8 },
  { value: 'cake', label: '🎂 Birthday Cake', theme: 'pusheen', ageMin: 4, ageMax: 10 },
  { value: 'room', label: '🛋️ Cozy Room', theme: 'pusheen', ageMin: 5, ageMax: 12 },
  { value: 'spaceship', label: '🚀 Spaceship', theme: 'minecraft', ageMin: 6, ageMax: 12 },
  { value: 'robot', label: '🤖 Robot', theme: 'minecraft', ageMin: 6, ageMax: 12 },
  { value: 'garden', label: '🌸 Flower Garden', theme: 'pusheen', ageMin: 4, ageMax: 10 },
];

// Helper to get age-appropriate creative activities with adaptive learning
const getCreativeActivities = (
  age?: number, 
  gender?: string,
  recentChoices?: string[], // Past activity choices for learning
  favoriteTheme?: string // Learned theme preference
) => {
  // Filter activities by age appropriateness
  const ageAppropriate = ALL_ACTIVITIES.filter(a => {
    if (!age) return true;
    return age >= a.ageMin && age <= a.ageMax;
  });
  
  // Score activities based on multiple factors
  const scoredActivities = ageAppropriate.map(activity => {
    let score = 0;
    
    // Gender preference (soft influence, not hard filter)
    if (gender === 'female' && activity.theme === 'pusheen') score += 2;
    if (gender === 'male' && activity.theme === 'minecraft') score += 2;
    
    // Favorite theme preference (learned from past choices)
    if (favoriteTheme === activity.theme) score += 3;
    
    // Recent choices: boost similar themes but penalize exact repeats for variety
    if (recentChoices && recentChoices.length > 0) {
      const lastChoice = recentChoices[recentChoices.length - 1];
      // Penalize exact repeat of last choice (encourage variety)
      if (activity.value === lastChoice) score -= 2;
      // But boost same theme (they like this style)
      const lastActivity = ALL_ACTIVITIES.find(a => a.value === lastChoice);
      if (lastActivity && lastActivity.theme === activity.theme) score += 1;
    }
    
    // Add some randomness for discovery (0-1 points)
    score += Math.random();
    
    return { ...activity, score };
  });
  
  // Sort by score descending
  scoredActivities.sort((a, b) => b.score - a.score);
  
  // Take top 5 and add "Surprise Me!" at the end
  const topActivities = scoredActivities.slice(0, 5).map(({ score, ageMin, ageMax, ...rest }) => rest);
  topActivities.push({ value: 'custom', label: '✨ Surprise Me!', theme: 'any' });
  
  return topActivities;
};

export function ChildChatPanel({ 
  activeTab,
  onCharacterChange,
  onLearningSettingsChange,
  onTopicSelect,
}: ChildChatPanelProps) {
  // Character state
  const [characters, setCharacters] = useState<Character[]>(DEFAULT_CHARACTERS);
  const [selectedCharacter, setSelectedCharacter] = useState<string>('');
  const [loadingCharacters, setLoadingCharacters] = useState(true);
  
  // Child profile for age/gender tailoring
  const [childProfile, setChildProfile] = useState<{ age?: number; gender?: string; favoriteTheme?: string }>({});
  
  // Recent creative activity choices for adaptive learning
  const [recentActivityChoices, setRecentActivityChoices] = useState<string[]>([]);
  
  // Learning settings state
  const [learningSettings, setLearningSettings] = useState<LearningSettings>({
    enabled: false,
    subject: 'general',
    difficulty: 'easy',
    encourageQuestions: true,
    spanishMode: false,
    spanishLevel: 'beginner',
    spanishFocus: 'all',
    readAloudEnabled: false,
    autoReadResponses: false,
    creativeMode: false,
    creativeActivity: 'castle',
  });

  // Stats
  const [chatStats, setChatStats] = useState({
    questionsAsked: 0,
    topicsExplored: 0,
    streak: 0,
  });
  
  // Get tailored creative activities with adaptive learning
  const creativeActivities = getCreativeActivities(
    childProfile.age, 
    childProfile.gender,
    recentActivityChoices,
    childProfile.favoriteTheme
  );

  // Load child profile for age/gender tailoring and recent activity choices
  useEffect(() => {
    const fetchChildProfile = async () => {
      try {
        const response = await fetch('/api/child/profile');
        if (response.ok) {
          const data = await response.json();
          setChildProfile({
            age: data.age,
            gender: data.gender,
            favoriteTheme: data.favoriteTheme,
          });
        }
      } catch (error) {
        console.error('Failed to load child profile:', error);
      }
    };
    fetchChildProfile();
    
    // Load recent activity choices from localStorage for adaptive learning
    const savedChoices = localStorage.getItem('childCreativeActivityChoices');
    if (savedChoices) {
      try {
        const choices = JSON.parse(savedChoices);
        setRecentActivityChoices(choices.slice(-10)); // Keep last 10 choices
      } catch (e) {}
    }
  }, []);

  // Load characters from API
  useEffect(() => {
    const fetchCharacters = async () => {
      try {
        const response = await fetch('/api/child/learning/recipes?type=available&category=child-education');
        if (response.ok) {
          const data = await response.json();
          const formattedCharacters: Character[] = data.recipes.map((recipe: any) => ({
            id: recipe.id,
            name: recipe.characterName || recipe.name,
            emoji: recipe.characterEmoji || '🤖',
            description: recipe.description || '',
            personality: recipe.characterPersonality || '',
            color: getColorForCharacter(recipe.characterName),
            iconPath: recipe.iconPath,
          }));
          setCharacters(formattedCharacters);
        }
      } catch (error) {
        console.error('Failed to load characters:', error);
      } finally {
        setLoadingCharacters(false);
      }
    };
    fetchCharacters();
  }, []);

  // Load settings from localStorage
  useEffect(() => {
    const savedCharacter = localStorage.getItem('childChatCharacter');
    const savedLearning = localStorage.getItem('childChatLearning');
    const savedStats = localStorage.getItem('childChatStats');
    
    if (savedCharacter) setSelectedCharacter(savedCharacter);
    if (savedLearning) {
      try {
        const parsed = JSON.parse(savedLearning);
        setLearningSettings(parsed);
        // Dispatch Read Aloud settings on mount so ChildChatWrapper knows the initial state
        if (parsed.readAloudEnabled) {
          window.dispatchEvent(new CustomEvent('child-read-aloud-change', { 
            detail: { enabled: parsed.readAloudEnabled, autoRead: parsed.autoReadResponses || false } 
          }));
        }
      } catch (e) {}
    }
    if (savedStats) {
      try {
        setChatStats(JSON.parse(savedStats));
      } catch (e) {}
    }
  }, []);

  // Handle character selection
  const handleCharacterSelect = (characterId: string) => {
    setSelectedCharacter(characterId);
    localStorage.setItem('childChatCharacter', characterId);
    const character = characters.find(c => c.id === characterId);
    if (character) {
      if (onCharacterChange) {
        onCharacterChange(character);
      }
      // Dispatch custom event for ChildChatWrapper to receive
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('child-chat-character-change', { 
          detail: { 
            id: character.id,
            name: character.name, 
            emoji: character.emoji,
            personality: character.personality,
            iconPath: character.iconPath,
          } 
        }));
      }
    }
  };

  // Handle learning settings change
  const updateLearningSettings = (key: keyof LearningSettings, value: any) => {
    const newSettings = { ...learningSettings, [key]: value };
    setLearningSettings(newSettings);
    localStorage.setItem('childChatLearning', JSON.stringify(newSettings));
    if (onLearningSettingsChange) {
      onLearningSettingsChange(newSettings);
    }
  };

  // Handle topic selection
  const handleTopicClick = (topic: string) => {
    if (onTopicSelect) {
      onTopicSelect(topic);
    }
    // Dispatch custom event for ChildChatWrapper to receive
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('child-chat-topic-select', { 
        detail: { topic } 
      }));
    }
  };

  // Render Characters tab
  const renderCharacters = () => {
    const currentCharacter = characters.find(c => c.id === selectedCharacter);
    
    return (
      <VStack spacing={3} align="stretch">
        <HStack>
          <Text fontSize="2xl">🎭</Text>
          <Box>
            <Text fontWeight="bold" fontSize="sm">Choose Your Friend</Text>
            <Text fontSize="xs" color="gray.500">Pick who to chat with!</Text>
          </Box>
        </HStack>

        {/* Current Character */}
        {currentCharacter && (
          <Box 
            p={3} 
            bg={`${currentCharacter.color}.50`} 
            borderRadius="lg"
            border="2px solid"
            borderColor={`${currentCharacter.color}.200`}
          >
            <HStack>
              {currentCharacter.iconPath ? (
                <Image 
                  src={currentCharacter.iconPath} 
                  alt={currentCharacter.name}
                  boxSize="48px"
                  objectFit="contain"
                  borderRadius="md"
                />
              ) : (
                <Text fontSize="3xl">{currentCharacter.emoji}</Text>
              )}
              <Box flex="1">
                <Text fontWeight="bold">{currentCharacter.name}</Text>
                <Text 
                  fontSize="xs" 
                  color="gray.600"
                  noOfLines={3}
                  title={currentCharacter.personality || currentCharacter.description}
                >
                  {currentCharacter.personality || currentCharacter.description}
                </Text>
              </Box>
              <Badge colorScheme={currentCharacter.color} ml="auto">Active</Badge>
            </HStack>
          </Box>
        )}

        <Divider />

        {/* Character Grid */}
        {loadingCharacters ? (
          <Box textAlign="center" py={8}>
            <Spinner size="lg" color="purple.500" />
            <Text fontSize="sm" color="gray.500" mt={2}>Loading friends...</Text>
          </Box>
        ) : characters.length === 0 ? (
          <Box textAlign="center" py={8}>
            <Text fontSize="2xl" mb={2}>🎭</Text>
            <Text fontSize="sm" fontWeight="medium">No characters available</Text>
            <Text fontSize="xs" color="gray.500">Check back soon!</Text>
          </Box>
        ) : (
          <SimpleGrid columns={2} spacing={2}>
            {characters.map((char) => (
              <Box
                key={char.id}
                p={2}
                bg={selectedCharacter === char.id ? `${char.color}.100` : 'gray.50'}
                borderRadius="md"
                border="2px solid"
                borderColor={selectedCharacter === char.id ? `${char.color}.400` : 'transparent'}
                cursor="pointer"
                onClick={() => handleCharacterSelect(char.id)}
                _hover={{ bg: `${char.color}.50` }}
                transition="all 0.2s"
              >
                <VStack spacing={1}>
                  {char.iconPath ? (
                    <Image 
                      src={char.iconPath} 
                      alt={char.name}
                      boxSize="40px"
                      objectFit="contain"
                      borderRadius="md"
                    />
                  ) : (
                    <Text fontSize="2xl">{char.emoji}</Text>
                  )}
                  <Text fontWeight="medium" fontSize="xs" textAlign="center">
                    {char.name}
                  </Text>
                </VStack>
              </Box>
            ))}
          </SimpleGrid>
        )}

        {/* Fun tip */}
        <Box mt={2} p={2} bg="yellow.50" borderRadius="lg">
          <Text fontSize="xs" color="yellow.800">
            💡 Each friend has a different personality! Try them all!
          </Text>
        </Box>
      </VStack>
    );
  };

  // Render Learning tab
  const renderLearning = () => (
    <VStack spacing={4} align="stretch">
      <HStack>
        <Text fontSize="2xl">📚</Text>
        <Box>
          <Text fontWeight="bold" fontSize="sm">Learning Mode</Text>
          <Text fontSize="xs" color="gray.500">Make chatting educational!</Text>
        </Box>
      </HStack>

      {/* Learning Mode Toggle */}
      <Box p={3} bg={learningSettings.enabled ? 'green.50' : 'gray.50'} borderRadius="lg">
        <FormControl display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <FormLabel fontSize="sm" mb={0} fontWeight="bold">
              🎓 Learning Mode
            </FormLabel>
            <Text fontSize="xs" color="gray.500">
              {learningSettings.enabled ? 'AI will teach while chatting!' : 'Just fun chatting'}
            </Text>
          </Box>
          <Switch
            colorScheme="green"
            size="lg"
            isChecked={learningSettings.enabled}
            onChange={(e) => updateLearningSettings('enabled', e.target.checked)}
          />
        </FormControl>
      </Box>

      {learningSettings.enabled && (
        <>
          <Divider />

          {/* Subject Selection */}
          <FormControl>
            <FormLabel fontSize="sm" fontWeight="bold">📖 Subject Focus</FormLabel>
            <Select
              size="sm"
              value={learningSettings.subject}
              onChange={(e) => updateLearningSettings('subject', e.target.value)}
            >
              {SUBJECTS.map((subject) => (
                <option key={subject.value} value={subject.value}>
                  {subject.label}
                </option>
              ))}
            </Select>
          </FormControl>

          {/* Difficulty */}
          <FormControl>
            <FormLabel fontSize="sm" fontWeight="bold">⭐ Difficulty</FormLabel>
            <SimpleGrid columns={3} spacing={2}>
              {(['easy', 'medium', 'hard'] as const).map((level) => (
                <Button
                  key={level}
                  size="sm"
                  variant={learningSettings.difficulty === level ? 'solid' : 'outline'}
                  colorScheme={
                    level === 'easy' ? 'green' : 
                    level === 'medium' ? 'yellow' : 'red'
                  }
                  onClick={() => updateLearningSettings('difficulty', level)}
                >
                  {level === 'easy' ? '🌱 Easy' : 
                   level === 'medium' ? '🌿 Medium' : '🌳 Hard'}
                </Button>
              ))}
            </SimpleGrid>
          </FormControl>

          {/* Encourage Questions */}
          <FormControl display="flex" alignItems="center" justifyContent="space-between">
            <Box>
              <FormLabel fontSize="sm" mb={0}>Ask me questions</FormLabel>
              <Text fontSize="2xs" color="gray.500">AI will quiz you sometimes</Text>
            </Box>
            <Switch
              colorScheme="purple"
              isChecked={learningSettings.encourageQuestions}
              onChange={(e) => updateLearningSettings('encourageQuestions', e.target.checked)}
            />
          </FormControl>
        </>
      )}

      <Divider />

      {/* 🇲🇽 Spanish Learning Mode - Bilingual Adventure! */}
      <Box 
        p={4} 
        bg={learningSettings.spanishMode ? 'orange.50' : 'gray.50'} 
        borderRadius="lg"
        border="2px solid"
        borderColor={learningSettings.spanishMode ? 'orange.300' : 'gray.200'}
      >
        <FormControl display="flex" alignItems="center" justifyContent="space-between" mb={learningSettings.spanishMode ? 3 : 0}>
          <Box>
            <HStack spacing={2}>
              <Text fontSize="lg">🇲🇽</Text>
              <FormLabel fontSize="sm" mb={0} fontWeight="bold">
                ¡Aprende Español!
              </FormLabel>
            </HStack>
            <Text fontSize="xs" color="gray.500">
              {learningSettings.spanishMode 
                ? '¡Modo español activado! 🎉' 
                : 'Learn Spanish while chatting with your Minecraft friends!'}
            </Text>
          </Box>
          <Switch
            colorScheme="orange"
            size="lg"
            isChecked={learningSettings.spanishMode}
            onChange={(e) => {
              updateLearningSettings('spanishMode', e.target.checked);
              // Dispatch event to notify chat
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('child-spanish-mode-change', { 
                  detail: { enabled: e.target.checked, level: learningSettings.spanishLevel, focus: learningSettings.spanishFocus } 
                }));
              }
            }}
          />
        </FormControl>

        {learningSettings.spanishMode && (
          <VStack spacing={3} align="stretch">
            {/* Spanish Level */}
            <FormControl>
              <FormLabel fontSize="xs" fontWeight="bold" color="orange.700">
                ⭐ Tu Nivel (Your Level)
              </FormLabel>
              <SimpleGrid columns={3} spacing={2}>
                {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
                  <Button
                    key={level}
                    size="xs"
                    variant={learningSettings.spanishLevel === level ? 'solid' : 'outline'}
                    colorScheme="orange"
                    onClick={() => updateLearningSettings('spanishLevel', level)}
                    fontSize="2xs"
                  >
                    {level === 'beginner' ? '🌱 Principiante' : 
                     level === 'intermediate' ? '🌿 Intermedio' : '🌳 Avanzado'}
                  </Button>
                ))}
              </SimpleGrid>
            </FormControl>

            {/* Learning Focus */}
            <FormControl>
              <FormLabel fontSize="xs" fontWeight="bold" color="orange.700">
                🎯 Enfoque (Focus)
              </FormLabel>
              <SimpleGrid columns={2} spacing={2}>
                {[
                  { value: 'vocabulary', label: '📚 Vocabulario', desc: 'New words' },
                  { value: 'grammar', label: '✏️ Gramática', desc: 'Sentence structure' },
                  { value: 'conversation', label: '💬 Conversación', desc: 'Speaking practice' },
                  { value: 'all', label: '🌟 Todo', desc: 'Mix it up!' },
                ].map((focus) => (
                  <Button
                    key={focus.value}
                    size="xs"
                    variant={learningSettings.spanishFocus === focus.value ? 'solid' : 'outline'}
                    colorScheme="orange"
                    onClick={() => updateLearningSettings('spanishFocus', focus.value as any)}
                    h="auto"
                    py={2}
                    flexDirection="column"
                  >
                    <Text fontSize="xs">{focus.label}</Text>
                    <Text fontSize="2xs" fontWeight="normal" opacity={0.8}>{focus.desc}</Text>
                  </Button>
                ))}
              </SimpleGrid>
            </FormControl>

            {/* Fun Spanish Tips */}
            <Box p={2} bg="white" borderRadius="md" border="1px dashed" borderColor="orange.200">
              <Text fontSize="2xs" fontWeight="bold" color="orange.600" mb={1}>
                💡 Tip del Día (Tip of the Day)
              </Text>
              <Text fontSize="2xs" color="gray.600">
                {learningSettings.spanishLevel === 'beginner' 
                  ? '"Hola" means "Hello" - try greeting Steve in Spanish! 👋'
                  : learningSettings.spanishLevel === 'intermediate'
                  ? 'Use "¿Cómo estás?" to ask "How are you?" 🤔'
                  : 'Try using subjunctive: "Espero que tengas un buen día" 🌟'}
              </Text>
            </Box>

            {/* Minecraft-themed Spanish phrases */}
            <Box p={2} bg="green.50" borderRadius="md">
              <Text fontSize="2xs" fontWeight="bold" color="green.700" mb={1}>
                ⛏️ Minecraft Español
              </Text>
              <VStack spacing={1} align="stretch">
                <HStack justify="space-between">
                  <Text fontSize="2xs">Diamond = </Text>
                  <Text fontSize="2xs" fontWeight="bold" color="blue.500">Diamante 💎</Text>
                </HStack>
                <HStack justify="space-between">
                  <Text fontSize="2xs">Creeper = </Text>
                  <Text fontSize="2xs" fontWeight="bold" color="green.500">Creeper 💚</Text>
                </HStack>
                <HStack justify="space-between">
                  <Text fontSize="2xs">Let's build! = </Text>
                  <Text fontSize="2xs" fontWeight="bold" color="orange.500">¡Vamos a construir! 🧱</Text>
                </HStack>
              </VStack>
            </Box>
          </VStack>
        )}
      </Box>

      <Divider />

      {/* 🔊 Read Aloud (TTS) Settings */}
      <Box 
        p={4} 
        bg={learningSettings.readAloudEnabled ? 'blue.50' : 'gray.50'} 
        borderRadius="lg"
        border="2px solid"
        borderColor={learningSettings.readAloudEnabled ? 'blue.300' : 'gray.200'}
      >
        <FormControl display="flex" alignItems="center" justifyContent="space-between" mb={learningSettings.readAloudEnabled ? 3 : 0}>
          <Box>
            <HStack spacing={2}>
              <Text fontSize="lg">🔊</Text>
              <FormLabel fontSize="sm" mb={0} fontWeight="bold">
                Read Aloud
              </FormLabel>
            </HStack>
            <Text fontSize="xs" color="gray.500">
              {learningSettings.readAloudEnabled 
                ? 'Click the speaker icon on messages to hear them!' 
                : 'Have messages read out loud to you'}
            </Text>
          </Box>
          <Switch
            colorScheme="blue"
            size="lg"
            isChecked={learningSettings.readAloudEnabled}
            onChange={(e) => {
              updateLearningSettings('readAloudEnabled', e.target.checked);
              // Dispatch event to notify chat
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('child-read-aloud-change', { 
                  detail: { enabled: e.target.checked, autoRead: learningSettings.autoReadResponses } 
                }));
              }
            }}
          />
        </FormControl>

        {learningSettings.readAloudEnabled && (
          <VStack spacing={3} align="stretch">
            {/* Auto-read responses */}
            <FormControl display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <FormLabel fontSize="xs" mb={0} fontWeight="medium">
                  🤖 Auto-read AI responses
                </FormLabel>
                <Text fontSize="2xs" color="gray.500">
                  Automatically read new messages
                </Text>
              </Box>
              <Switch
                colorScheme="blue"
                size="md"
                isChecked={learningSettings.autoReadResponses}
                onChange={(e) => {
                  updateLearningSettings('autoReadResponses', e.target.checked);
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('child-read-aloud-change', { 
                      detail: { enabled: learningSettings.readAloudEnabled, autoRead: e.target.checked } 
                    }));
                  }
                }}
              />
            </FormControl>

            {/* Voice info */}
            <Box p={2} bg="white" borderRadius="md" border="1px dashed" borderColor="blue.200">
              <Text fontSize="2xs" fontWeight="bold" color="blue.600" mb={1}>
                🎭 Character Voice
              </Text>
              <Text fontSize="2xs" color="gray.600">
                Your AI friend will read messages in their own special voice!
              </Text>
            </Box>
          </VStack>
        )}
      </Box>

      <Divider />

      {/* 🎨 Creative Mode - Image Generation from Chat */}
      <Box 
        p={4} 
        bg={learningSettings.creativeMode ? 'pink.50' : 'gray.50'} 
        borderRadius="lg"
        border="2px solid"
        borderColor={learningSettings.creativeMode ? 'pink.300' : 'gray.200'}
      >
        <FormControl display="flex" alignItems="center" justifyContent="space-between" mb={learningSettings.creativeMode ? 3 : 0}>
          <Box>
            <HStack spacing={2}>
              <Text fontSize="lg">🎨</Text>
              <FormLabel fontSize="sm" mb={0} fontWeight="bold">
                Creative Mode
              </FormLabel>
            </HStack>
            <Text fontSize="xs" color="gray.500">
              {learningSettings.creativeMode 
                ? 'Design something and generate an image!' 
                : 'Create art through conversation'}
            </Text>
          </Box>
          <Switch
            colorScheme="pink"
            size="lg"
            isChecked={learningSettings.creativeMode}
            onChange={(e) => {
              updateLearningSettings('creativeMode', e.target.checked);
              // Dispatch event to notify chat
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('child-creative-mode-change', { 
                  detail: { 
                    enabled: e.target.checked, 
                    activity: learningSettings.creativeActivity 
                  } 
                }));
              }
            }}
          />
        </FormControl>

        {learningSettings.creativeMode && (
          <VStack spacing={3} align="stretch">
            {/* Activity Selection */}
            <FormControl>
              <FormLabel fontSize="xs" fontWeight="bold" color="pink.700">
                🏗️ What do you want to create?
              </FormLabel>
              <SimpleGrid columns={2} spacing={2}>
                {creativeActivities.map((activity) => (
                  <Button
                    key={activity.value}
                    size="xs"
                    variant={learningSettings.creativeActivity === activity.value ? 'solid' : 'outline'}
                    colorScheme="pink"
                    onClick={() => {
                      updateLearningSettings('creativeActivity', activity.value as any);
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('child-creative-mode-change', { 
                          detail: { 
                            enabled: true, 
                            activity: activity.value 
                          } 
                        }));
                      }
                    }}
                    h="auto"
                    py={2}
                  >
                    {activity.label}
                  </Button>
                ))}
              </SimpleGrid>
            </FormControl>

            {/* How it works */}
            <Box p={2} bg="white" borderRadius="md" border="1px dashed" borderColor="pink.200">
              <Text fontSize="2xs" fontWeight="bold" color="pink.600" mb={1}>
                ✨ How it works
              </Text>
              <Text fontSize="2xs" color="gray.600">
                Your AI friend will ask you questions about your design - colors, style, 
                special features. When you're done, they'll create an image of your creation!
              </Text>
            </Box>

            {/* Start button */}
            <Button
              colorScheme="pink"
              size="sm"
              onClick={() => {
                // Send a message to start the creative activity - be explicit about what was chosen
                if (typeof window !== 'undefined') {
                  const activityNames: Record<string, string> = {
                    castle: 'Castle',
                    house: 'Dream House',
                    cookie: 'Cookies',
                    cake: 'Birthday Cake',
                    room: 'Cozy Room',
                    spaceship: 'Spaceship',
                    robot: 'Robot',
                    garden: 'Flower Garden',
                    custom: 'something amazing',
                  };
                  const activityName = activityNames[learningSettings.creativeActivity] || 'something';
                  
                  // Save activity choice for adaptive learning
                  const savedChoices = localStorage.getItem('childCreativeActivityChoices');
                  const choices = savedChoices ? JSON.parse(savedChoices) : [];
                  choices.push(learningSettings.creativeActivity);
                  localStorage.setItem('childCreativeActivityChoices', JSON.stringify(choices.slice(-20)));
                  
                  // This message tells the AI exactly what was selected so it can skip asking
                  const message = `I want to create a ${activityName}! What art style should we use?`;
                  window.dispatchEvent(new CustomEvent('child-chat-topic-select', { 
                    detail: { topic: message } 
                  }));
                }
              }}
            >
              🚀 Start Creating!
            </Button>
          </VStack>
        )}
      </Box>

      <Divider />

      {/* Learning Stats */}
      <Box p={3} bg="purple.50" borderRadius="lg">
        <Text fontWeight="bold" fontSize="xs" mb={2}>🏆 Your Progress</Text>
        <SimpleGrid columns={3} spacing={2}>
          <Box textAlign="center" p={2} bg="white" borderRadius="md">
            <Text fontSize="lg" fontWeight="bold" color="purple.500">
              {chatStats.questionsAsked}
            </Text>
            <Text fontSize="2xs" color="gray.500">Questions</Text>
          </Box>
          <Box textAlign="center" p={2} bg="white" borderRadius="md">
            <Text fontSize="lg" fontWeight="bold" color="blue.500">
              {chatStats.topicsExplored}
            </Text>
            <Text fontSize="2xs" color="gray.500">Topics</Text>
          </Box>
          <Box textAlign="center" p={2} bg="white" borderRadius="md">
            <Text fontSize="lg" fontWeight="bold" color="orange.500">
              {chatStats.streak}🔥
            </Text>
            <Text fontSize="2xs" color="gray.500">Streak</Text>
          </Box>
        </SimpleGrid>
      </Box>
    </VStack>
  );

  // Render Topics tab
  const renderTopics = () => (
    <VStack spacing={3} align="stretch">
      <HStack>
        <Text fontSize="2xl">💬</Text>
        <Box>
          <Text fontWeight="bold" fontSize="sm">Conversation Starters</Text>
          <Text fontSize="xs" color="gray.500">Not sure what to say? Try these!</Text>
        </Box>
      </HStack>

      {TOPIC_CATEGORIES.map((category) => (
        <Box key={category.name}>
          <HStack mb={2}>
            <Text fontSize="lg">{category.emoji}</Text>
            <Text fontWeight="bold" fontSize="sm">{category.name}</Text>
          </HStack>
          <VStack spacing={1} align="stretch">
            {category.topics.map((topic, idx) => (
              <Button
                key={idx}
                size="sm"
                variant="outline"
                justifyContent="flex-start"
                fontWeight="normal"
                fontSize="xs"
                h="auto"
                py={2}
                whiteSpace="normal"
                textAlign="left"
                onClick={() => handleTopicClick(topic)}
                _hover={{ bg: 'blue.50', borderColor: 'blue.300' }}
              >
                {topic}
              </Button>
            ))}
          </VStack>
        </Box>
      ))}

      {/* Random topic button */}
      <Button
        mt={2}
        colorScheme="purple"
        size="sm"
        leftIcon={<FiZap />}
        onClick={() => {
          const allTopics = TOPIC_CATEGORIES.flatMap(c => c.topics);
          const randomTopic = allTopics[Math.floor(Math.random() * allTopics.length)];
          handleTopicClick(randomTopic);
        }}
      >
        🎲 Surprise Me!
      </Button>
    </VStack>
  );

  return (
    <Box p={3} h="full" overflowY="auto">
      {activeTab === 'characters' && renderCharacters()}
      {activeTab === 'learning' && renderLearning()}
      {activeTab === 'topics' && renderTopics()}
    </Box>
  );
}

export default ChildChatPanel;
