/**
 * Child Dictionary Right Panel
 * 
 * Cross-activity integration panel for dictionary:
 * - Create Note: Save words to workspace
 * - Ask Character: Send words to chat characters
 * - My Collection: Enhanced favorites with study tools
 * - Word Games: Interactive vocabulary practice
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Input,
  IconButton,
  Divider,
  Spinner,
  Badge,
  Progress,
  Tooltip,
  useToast,
  InputGroup,
  InputRightElement,
  Wrap,
  WrapItem,
  Tag,
  TagLabel,
  Textarea,
  Select,
  Radio,
  RadioGroup,
  Stack,
} from '@chakra-ui/react';
import { 
  FiSend, 
  FiStar, 
  FiBook,
  FiZap,
  FiVolume2,
  FiSearch,
  FiClock,
  FiHeart,
  FiEdit,
  FiMessageCircle,
  FiCheck,
  FiX,
  FiPlay,
  FiShuffle,
} from 'react-icons/fi';
import { useChildTheme } from './ChildThemeProvider';
import { useRightPanel } from '@/contexts/RightPanelContext';
import { useRouter } from 'next/router';

interface DictionaryEntry {
  word: string;
  definition: string;
  partOfSpeech?: string;
  examples?: string[];
  synonyms?: string[];
}

interface Character {
  id: string;
  name: string;
  emoji: string;
  description: string;
}

const CHARACTERS: Character[] = [
  { id: 'steve', name: 'Steve', emoji: '⛏️', description: 'Minecraft builder' },
  { id: 'alex', name: 'Alex', emoji: '🗡️', description: 'Minecraft explorer' },
  { id: 'pusheen', name: 'Pusheen', emoji: '🐱', description: 'Cute cat friend' },
];

export default function ChildDictionaryPanel() {
  const { colors, themeId, childExtras } = useChildTheme();
  const { activeTab, customData } = useRightPanel();
  const toast = useToast();
  const router = useRouter();
  
  // Current word from main page
  const currentWord = (customData as any)?.currentWord as DictionaryEntry | undefined;
  
  const [loading, setLoading] = useState(false);
  const [recentWords, setRecentWords] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  
  // Create Note state
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  
  // Ask Character state
  const [selectedCharacter, setSelectedCharacter] = useState('steve');
  const [characterMessage, setCharacterMessage] = useState('');
  
  // Word Games state
  const [gameMode, setGameMode] = useState<'match' | 'fill' | 'quiz'>('match');
  const [gameScore, setGameScore] = useState(0);
  
  // Theme detection
  const isMinecraft = themeId?.includes('minecraft') || childExtras?.themeName === 'minecraft';
  const themeColor = isMinecraft ? 'green' : 'pink';
  const themeAccent = colors?.primary || `${themeColor}.500`;
  
  // Fetch user's words on mount
  useEffect(() => {
    fetchUserWords();
  }, []);
  
  const fetchUserWords = async () => {
    try {
      const res = await fetch('/api/child/dictionary?action=stats');
      if (res.ok) {
        const data = await res.json();
        setRecentWords(data.recentWords?.map((w: any) => w.word) || []);
        setFavorites(data.favorites?.map((f: any) => f.word) || []);
      }
    } catch (error) {
      console.error('[DictionaryPanel] Failed to fetch words:', error);
    }
  };
  
  // Auto-populate note when word changes
  useEffect(() => {
    if (currentWord) {
      setNoteTitle(`Word: ${currentWord.word}`);
      setNoteContent(
        `**${currentWord.word}** (${currentWord.partOfSpeech || 'word'})\n\n` +
        `Definition: ${currentWord.definition}\n\n` +
        (currentWord.examples?.length ? `Examples:\n${currentWord.examples.map(ex => `- ${ex}`).join('\n')}\n\n` : '') +
        (currentWord.synonyms?.length ? `Similar words: ${currentWord.synonyms.join(', ')}` : '')
      );
      setCharacterMessage(`Can you explain the word "${currentWord.word}" to me?`);
    }
  }, [currentWord]);
  
  const handleWordClick = (word: string) => {
    window.dispatchEvent(new CustomEvent('dictionary-search', { 
      detail: { word } 
    }));
  };
  
  const handleCreateNote = async () => {
    if (!noteTitle.trim() || !noteContent.trim()) {
      toast({
        title: 'Missing info',
        description: 'Please add a title and content!',
        status: 'warning',
        duration: 3000,
      });
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch('/api/workspace/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: noteTitle,
          content: noteContent,
          tags: ['dictionary', 'vocabulary'],
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        toast({
          title: 'Note created! 📝',
          description: 'Opening in workspace...',
          status: 'success',
          duration: 2000,
        });
        setTimeout(() => {
          router.push(`/child/workspace?page=${data.pageId}`);
        }, 500);
      } else {
        throw new Error('Failed to create note');
      }
    } catch (error) {
      console.error('[DictionaryPanel] Create note error:', error);
      toast({
        title: 'Oops!',
        description: 'Could not create note. Try again!',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleAskCharacter = () => {
    if (!characterMessage.trim()) {
      toast({
        title: 'Write a message!',
        description: 'What do you want to ask?',
        status: 'warning',
        duration: 3000,
      });
      return;
    }
    
    // Navigate to chat with pre-filled message
    router.push(`/child/chat?character=${selectedCharacter}&message=${encodeURIComponent(characterMessage)}`);
  };
  
  const handleSpeak = (word: string) => {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.rate = 0.8;
    window.speechSynthesis.speak(utterance);
  };
  
  const handleStartQuiz = () => {
    window.dispatchEvent(new CustomEvent('dictionary-start-quiz'));
  };
  
  const handleToggleFavorite = async (word: string) => {
    try {
      const isFavorite = favorites.includes(word);
      const res = await fetch('/api/child/dictionary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isFavorite ? 'unfavorite' : 'favorite',
          word,
        }),
      });
      
      if (res.ok) {
        setFavorites(prev => 
          isFavorite ? prev.filter(w => w !== word) : [...prev, word]
        );
        toast({
          title: isFavorite ? 'Removed from favorites' : 'Added to favorites! ⭐',
          status: 'success',
          duration: 2000,
        });
      }
    } catch (error) {
      console.error('[DictionaryPanel] Toggle favorite error:', error);
    }
  };

  // Render based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'create-note':
        return (
          <VStack spacing={3} align="stretch" h="100%">
            <Box 
              bg={isMinecraft ? 'green.50' : 'pink.50'} 
              p={3} 
              borderRadius={isMinecraft ? '4px' : 'lg'}
              border="1px solid"
              borderColor={isMinecraft ? 'green.200' : 'pink.200'}
            >
              <HStack mb={2}>
                <Text fontSize="lg">📝</Text>
                <Text fontSize="sm" fontWeight="bold">Create Note</Text>
              </HStack>
              <Text fontSize="xs" color="gray.600">
                Save this word to your workspace! You can add your own notes and examples.
              </Text>
            </Box>
            
            {currentWord ? (
              <>
                <Divider />
                
                <Box>
                  <Text fontSize="xs" fontWeight="bold" mb={2} color="gray.600">
                    Title
                  </Text>
                  <Input
                    size="sm"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    placeholder="Note title..."
                    borderRadius={isMinecraft ? '4px' : 'md'}
                    fontSize="xs"
                  />
                </Box>
                
                <Box flex={1}>
                  <Text fontSize="xs" fontWeight="bold" mb={2} color="gray.600">
                    Content
                  </Text>
                  <Textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Add your notes..."
                    size="sm"
                    fontSize="xs"
                    borderRadius={isMinecraft ? '4px' : 'md'}
                    minH="150px"
                    resize="vertical"
                  />
                </Box>
                
                <Button
                  colorScheme={themeColor}
                  size="sm"
                  leftIcon={<FiEdit />}
                  onClick={handleCreateNote}
                  isLoading={loading}
                  borderRadius={isMinecraft ? '4px' : 'full'}
                >
                  Save to Workspace
                </Button>
              </>
            ) : (
              <Box textAlign="center" py={6}>
                <Text fontSize="2xl" mb={2}>🔍</Text>
                <Text fontSize="xs" color="gray.500">
                  Search for a word first!
                </Text>
              </Box>
            )}
          </VStack>
        );
      
      case 'ask-character':
        return (
          <VStack spacing={3} align="stretch" h="100%">
            <Box 
              bg={isMinecraft ? 'green.50' : 'pink.50'} 
              p={3} 
              borderRadius={isMinecraft ? '4px' : 'lg'}
              border="1px solid"
              borderColor={isMinecraft ? 'green.200' : 'pink.200'}
            >
              <HStack mb={2}>
                <Text fontSize="lg">💬</Text>
                <Text fontSize="sm" fontWeight="bold">Ask Character</Text>
              </HStack>
              <Text fontSize="xs" color="gray.600">
                Ask your favorite character to explain this word in their own way!
              </Text>
            </Box>
            
            {currentWord ? (
              <>
                <Divider />
                
                <Box>
                  <Text fontSize="xs" fontWeight="bold" mb={2} color="gray.600">
                    Choose Character
                  </Text>
                  <RadioGroup value={selectedCharacter} onChange={setSelectedCharacter}>
                    <Stack spacing={2}>
                      {CHARACTERS.map((char) => (
                        <Radio 
                          key={char.id} 
                          value={char.id}
                          size="sm"
                          colorScheme={themeColor}
                        >
                          <HStack spacing={2}>
                            <Text fontSize="md">{char.emoji}</Text>
                            <Box>
                              <Text fontSize="xs" fontWeight="bold">{char.name}</Text>
                              <Text fontSize="xs" color="gray.500">{char.description}</Text>
                            </Box>
                          </HStack>
                        </Radio>
                      ))}
                    </Stack>
                  </RadioGroup>
                </Box>
                
                <Divider />
                
                <Box flex={1}>
                  <Text fontSize="xs" fontWeight="bold" mb={2} color="gray.600">
                    Your Message
                  </Text>
                  <Textarea
                    value={characterMessage}
                    onChange={(e) => setCharacterMessage(e.target.value)}
                    placeholder="What do you want to ask?"
                    size="sm"
                    fontSize="xs"
                    borderRadius={isMinecraft ? '4px' : 'md'}
                    minH="100px"
                    resize="vertical"
                  />
                </Box>
                
                <Button
                  colorScheme={themeColor}
                  size="sm"
                  leftIcon={<FiMessageCircle />}
                  onClick={handleAskCharacter}
                  borderRadius={isMinecraft ? '4px' : 'full'}
                >
                  Ask {CHARACTERS.find(c => c.id === selectedCharacter)?.name}
                </Button>
              </>
            ) : (
              <Box textAlign="center" py={6}>
                <Text fontSize="2xl" mb={2}>🔍</Text>
                <Text fontSize="xs" color="gray.500">
                  Search for a word first!
                </Text>
              </Box>
            )}
          </VStack>
        );
        
      case 'my-collection':
        return (
          <VStack spacing={3} align="stretch">
            <Box 
              bg={isMinecraft ? 'green.50' : 'pink.50'} 
              p={3} 
              borderRadius={isMinecraft ? '4px' : 'lg'}
              border="1px solid"
              borderColor={isMinecraft ? 'green.200' : 'pink.200'}
            >
              <HStack mb={2}>
                <Text fontSize="lg">📚</Text>
                <Text fontSize="sm" fontWeight="bold">My Collection</Text>
              </HStack>
              <Text fontSize="xs" color="gray.600">
                Your saved words and study tools
              </Text>
            </Box>
            
            <Divider />
            
            {/* Favorites */}
            <Box>
              <HStack justify="space-between" mb={2}>
                <Text fontSize="xs" fontWeight="bold" color="gray.600">
                  ⭐ Favorites
                </Text>
                <Badge colorScheme="pink" fontSize="xs">{favorites.length}</Badge>
              </HStack>
              {favorites.length > 0 ? (
                <VStack align="stretch" spacing={1}>
                  {favorites.slice(0, 8).map((word, i) => (
                    <HStack 
                      key={i}
                      justify="space-between"
                      p={2}
                      bg="pink.50"
                      borderRadius={isMinecraft ? '4px' : 'md'}
                      cursor="pointer"
                      _hover={{ bg: 'pink.100' }}
                      onClick={() => handleWordClick(word)}
                    >
                      <Text fontSize="xs" fontWeight="medium">{word}</Text>
                      <HStack spacing={1}>
                        <IconButton
                          icon={<FiVolume2 />}
                          aria-label="Speak"
                          size="xs"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSpeak(word);
                          }}
                        />
                        <IconButton
                          icon={<FiHeart />}
                          aria-label="Unfavorite"
                          size="xs"
                          variant="ghost"
                          color="pink.500"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(word);
                          }}
                        />
                      </HStack>
                    </HStack>
                  ))}
                </VStack>
              ) : (
                <Text fontSize="xs" color="gray.400" textAlign="center" py={3}>
                  No favorites yet! Click the ❤️ on words to save them.
                </Text>
              )}
            </Box>
            
            <Divider />
            
            {/* Recent Words */}
            <Box>
              <HStack justify="space-between" mb={2}>
                <Text fontSize="xs" fontWeight="bold" color="gray.600">
                  🕐 Recent
                </Text>
                <Badge colorScheme="gray" fontSize="xs">{recentWords.length}</Badge>
              </HStack>
              {recentWords.length > 0 ? (
                <VStack align="stretch" spacing={1}>
                  {recentWords.slice(0, 6).map((word, i) => (
                    <HStack 
                      key={i}
                      justify="space-between"
                      p={2}
                      bg="gray.50"
                      borderRadius={isMinecraft ? '4px' : 'md'}
                      cursor="pointer"
                      _hover={{ bg: 'gray.100' }}
                      onClick={() => handleWordClick(word)}
                    >
                      <Text fontSize="xs" fontWeight="medium">{word}</Text>
                      <IconButton
                        icon={<FiVolume2 />}
                        aria-label="Speak"
                        size="xs"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSpeak(word);
                        }}
                      />
                    </HStack>
                  ))}
                </VStack>
              ) : (
                <Text fontSize="xs" color="gray.400" textAlign="center" py={3}>
                  Start exploring words!
                </Text>
              )}
            </Box>
            
            {(favorites.length > 0 || recentWords.length > 0) && (
              <>
                <Divider />
                <Button
                  size="sm"
                  variant="outline"
                  colorScheme={themeColor}
                  leftIcon={<FiZap />}
                  onClick={handleStartQuiz}
                  borderRadius={isMinecraft ? '4px' : 'full'}
                >
                  Practice These Words
                </Button>
              </>
            )}
          </VStack>
        );
        
      case 'word-games':
        return (
          <VStack spacing={3} align="stretch">
            <Box 
              bg={isMinecraft ? 'green.50' : 'pink.50'} 
              p={3} 
              borderRadius={isMinecraft ? '4px' : 'lg'}
              border="1px solid"
              borderColor={isMinecraft ? 'green.200' : 'pink.200'}
            >
              <HStack mb={2}>
                <Text fontSize="lg">🎮</Text>
                <Text fontSize="sm" fontWeight="bold">Word Games</Text>
              </HStack>
              <Text fontSize="xs" color="gray.600">
                Practice vocabulary with fun games!
              </Text>
            </Box>
            
            <Divider />
            
            {/* Game Mode Selection */}
            <Box>
              <Text fontSize="xs" fontWeight="bold" mb={2} color="gray.600">
                Choose a Game
              </Text>
              <VStack spacing={2} align="stretch">
                <Button
                  size="sm"
                  variant={gameMode === 'match' ? 'solid' : 'outline'}
                  colorScheme={themeColor}
                  leftIcon={<Text fontSize="sm">🎯</Text>}
                  onClick={() => setGameMode('match')}
                  borderRadius={isMinecraft ? '4px' : 'md'}
                  justifyContent="flex-start"
                >
                  <Box textAlign="left" flex={1}>
                    <Text fontSize="xs" fontWeight="bold">Match Game</Text>
                    <Text fontSize="xs" color="gray.500">Match words to definitions</Text>
                  </Box>
                </Button>
                
                <Button
                  size="sm"
                  variant={gameMode === 'fill' ? 'solid' : 'outline'}
                  colorScheme={themeColor}
                  leftIcon={<Text fontSize="sm">✏️</Text>}
                  onClick={() => setGameMode('fill')}
                  borderRadius={isMinecraft ? '4px' : 'md'}
                  justifyContent="flex-start"
                >
                  <Box textAlign="left" flex={1}>
                    <Text fontSize="xs" fontWeight="bold">Fill the Blank</Text>
                    <Text fontSize="xs" color="gray.500">Complete sentences</Text>
                  </Box>
                </Button>
                
                <Button
                  size="sm"
                  variant={gameMode === 'quiz' ? 'solid' : 'outline'}
                  colorScheme={themeColor}
                  leftIcon={<Text fontSize="sm">❓</Text>}
                  onClick={() => setGameMode('quiz')}
                  borderRadius={isMinecraft ? '4px' : 'md'}
                  justifyContent="flex-start"
                >
                  <Box textAlign="left" flex={1}>
                    <Text fontSize="xs" fontWeight="bold">Quick Quiz</Text>
                    <Text fontSize="xs" color="gray.500">Multiple choice</Text>
                  </Box>
                </Button>
              </VStack>
            </Box>
            
            <Divider />
            
            {/* Stats */}
            <Box 
              bg="blue.50" 
              p={3} 
              borderRadius={isMinecraft ? '4px' : 'lg'}
              border="1px solid"
              borderColor="blue.200"
            >
              <Text fontSize="xs" fontWeight="bold" mb={2}>
                📊 Your Stats
              </Text>
              <VStack spacing={1} align="stretch">
                <HStack justify="space-between">
                  <Text fontSize="xs">Words Available</Text>
                  <Badge colorScheme={themeColor}>{favorites.length + recentWords.length}</Badge>
                </HStack>
                <HStack justify="space-between">
                  <Text fontSize="xs">High Score</Text>
                  <Badge colorScheme="orange">{gameScore}</Badge>
                </HStack>
              </VStack>
            </Box>
            
            <Button
              colorScheme={themeColor}
              size="sm"
              leftIcon={<FiPlay />}
              onClick={handleStartQuiz}
              isDisabled={favorites.length + recentWords.length < 3}
              borderRadius={isMinecraft ? '4px' : 'full'}
            >
              Start Game!
            </Button>
            
            {favorites.length + recentWords.length < 3 && (
              <Text fontSize="xs" color="orange.500" textAlign="center">
                Learn 3+ words first to play!
              </Text>
            )}
          </VStack>
        );
        
      default:
        return (
          <VStack spacing={3} align="center" py={4}>
            <Text fontSize="2xl">📖</Text>
            <Text fontSize="sm" color="gray.500">
              Select a tab to get started!
            </Text>
          </VStack>
        );
    }
  };

  return (
    <Box p={3} h="100%" overflow="auto">
      {renderContent()}
    </Box>
  );
}
