/**
 * Child Book Explorer Right Panel
 * 
 * Kid-friendly panel with book exploration features:
 * - Reading Buddy AI assistant for book discussions
 * - Vocabulary learning with flashcards
 * - Quiz mode for comprehension
 * - Book exploration tools
 */

import React, { useState, useEffect, useRef } from 'react';
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
  SimpleGrid,
  Badge,
  Progress,
  Collapse,
  useToast,
  InputGroup,
  InputRightElement,
  Card,
  CardBody,
  Tooltip,
} from '@chakra-ui/react';
import { 
  FiSend, 
  FiBookOpen, 
  FiRefreshCw, 
  FiZap, 
  FiStar, 
  FiHeart,
  FiAward,
  FiTarget,
  FiHelpCircle,
  FiCheck,
  FiX,
  FiChevronRight,
  FiVolume2,
  FiVolumeX,
} from 'react-icons/fi';
import { useChildTheme } from './ChildThemeProvider';
import { ChildMessageRenderer } from './ChildMessageRenderer';
import { ChildChatInput } from './ChildChatInput';

interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'question' | 'answer' | 'hint';
}

interface VocabWord {
  word: string;
  definition: string;
  example: string;
  mastered: boolean;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const READING_BUDDY_ACTIONS = [
  { emoji: '📖', text: 'Summarize this book', action: 'summarize' },
  { emoji: '👥', text: 'Tell me about characters', action: 'characters' },
  { emoji: '💡', text: 'What can I learn?', action: 'themes' },
  { emoji: '❓', text: 'I have a question', action: 'question' },
];

const EXPLORE_ACTIONS = [
  { emoji: '🔍', text: 'Find similar books', action: 'similar' },
  { emoji: '🎨', text: 'Draw a scene', action: 'draw' },
  { emoji: '✍️', text: 'Write about it', action: 'write' },
  { emoji: '🎭', text: 'Act it out', action: 'roleplay' },
];

interface ChildBookExplorerPanelProps {
  activeTab: string;
  selectedBook?: {
    id: string;
    title: string;
    author?: string;
  } | null;
  currentPage?: number;
  totalPages?: number;
  mode?: 'default' | 'page-reader';
  action?: string;
}

// Page-specific AI actions
const PAGE_READER_ACTIONS = [
  { emoji: '🔍', text: 'Explain this page', action: 'explain-page', color: 'blue' },
  { emoji: '📝', text: 'New words here', action: 'vocabulary-page', color: 'green' },
  { emoji: '❓', text: 'Quiz me on this', action: 'quiz-page', color: 'orange' },
  { emoji: '👥', text: "Who's on this page?", action: 'characters-page', color: 'pink' },
  { emoji: '🎭', text: 'What happens next?', action: 'predict', color: 'purple' },
  { emoji: '💭', text: 'How do they feel?', action: 'emotions', color: 'cyan' },
];

export default function ChildBookExplorerPanel({ 
  activeTab, 
  selectedBook,
  currentPage = 1,
  totalPages = 0,
  mode = 'default',
  action
}: ChildBookExplorerPanelProps) {
  const { colors, childExtras } = useChildTheme();
  const toast = useToast();
  
  // Reading Buddy state
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // TTS state
  const [currentlyPlaying, setCurrentlyPlaying] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Vocabulary state
  const [vocabWords, setVocabWords] = useState<VocabWord[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [showDefinition, setShowDefinition] = useState(false);
  const [vocabLoading, setVocabLoading] = useState(false);
  
  // Quiz state
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [quizLoading, setQuizLoading] = useState(false);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load initial welcome message
  useEffect(() => {
    if (activeTab === 'reading-buddy' && messages.length === 0) {
      let welcomeMessage: string;
      
      if (mode === 'page-reader' && selectedBook) {
        welcomeMessage = `📖 You're reading "${selectedBook.title}" - Page ${currentPage} of ${totalPages}!\n\nI'm here to help you understand this page. Try asking me:\n• "What's happening on this page?"\n• "Who are the characters here?"\n• "What does this word mean?"\n\nOr click one of the quick actions below! 🎉`;
      } else if (selectedBook) {
        welcomeMessage = `Hi there! 📚 I'm your Reading Buddy! I see you're exploring "${selectedBook.title}". What would you like to know about it?`;
      } else {
        welcomeMessage = "Hi there! 📚 I'm your Reading Buddy! Pick a book from your library and I'll help you explore it!";
      }
      
      setMessages([{ role: 'assistant', content: welcomeMessage }]);
    }
  }, [activeTab, selectedBook, mode]);

  // Update context when page changes in page-reader mode
  useEffect(() => {
    if (mode === 'page-reader' && selectedBook && messages.length > 0) {
      const pageUpdateMessage = `📄 Now on page ${currentPage} of ${totalPages}. What would you like to know about this page?`;
      // Only add if last message wasn't a page update
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.role === 'assistant' && !lastMessage.content.startsWith('📄 Now on page')) {
        setMessages(prev => [...prev, { role: 'assistant', content: pageUpdateMessage }]);
      }
    }
  }, [currentPage, mode]);

  // Load vocabulary when tab changes
  useEffect(() => {
    if (activeTab === 'vocabulary' && selectedBook && vocabWords.length === 0) {
      loadVocabulary();
    }
  }, [activeTab, selectedBook]);

  // Load quiz when tab changes
  useEffect(() => {
    if (activeTab === 'quiz' && selectedBook && quizQuestions.length === 0) {
      loadQuiz();
    }
  }, [activeTab, selectedBook]);

  const loadVocabulary = async () => {
    if (!selectedBook) return;
    setVocabLoading(true);
    try {
      const res = await fetch(`/api/child/books/${selectedBook.id}/explore?section=vocabulary`);
      if (res.ok) {
        const data = await res.json();
        setVocabWords((data.data || []).map((w: any) => ({
          word: w.word,
          definition: w.definition,
          example: w.example,
          mastered: false,
        })));
      }
    } catch (error) {
      console.error('Failed to load vocabulary:', error);
    } finally {
      setVocabLoading(false);
    }
  };

  const loadQuiz = async () => {
    if (!selectedBook) return;
    setQuizLoading(true);
    try {
      // Generate quiz questions from book data
      const res = await fetch(`/api/child/books/${selectedBook.id}/quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 5 }),
      });
      if (res.ok) {
        const data = await res.json();
        setQuizQuestions(data.questions || []);
      } else {
        // Fallback mock questions
        setQuizQuestions([
          {
            id: '1',
            question: 'What is the main theme of this book?',
            options: ['Friendship', 'Adventure', 'Mystery', 'Learning'],
            correctIndex: 0,
            explanation: 'The book focuses on the importance of friendship!',
          },
        ]);
      }
    } catch (error) {
      console.error('Failed to load quiz:', error);
    } finally {
      setQuizLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/child/services/book-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          bookId: selectedBook?.id,
          bookTitle: selectedBook?.title,
        }),
      });

      const data = await res.json();
      
      if (data.blocked) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: "Let's talk about something else! What would you like to know about the book? 📚" 
        }]);
      } else if (data.response) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Oops! I had trouble thinking. Can you ask me again? 🤔" 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // TTS Read Aloud function
  const handleReadAloud = async (messageIndex: number, text: string) => {
    // Stop current playback if any
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // If clicking the same message, just stop
    if (currentlyPlaying === messageIndex) {
      setCurrentlyPlaying(null);
      return;
    }

    setCurrentlyPlaying(messageIndex);

    try {
      const response = await fetch('/api/child/tts/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          sourceType: 'book-chat',
          sourceId: `book-msg-${messageIndex}`,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.audioUrl) {
          const audio = new Audio(data.audioUrl);
          audioRef.current = audio;
          audio.onended = () => {
            setCurrentlyPlaying(null);
            audioRef.current = null;
          };
          audio.onerror = () => {
            setCurrentlyPlaying(null);
            audioRef.current = null;
          };
          await audio.play();
        } else if (data.useBrowserTTS) {
          // Fallback to browser TTS
          const utterance = new SpeechSynthesisUtterance(data.text || text);
          utterance.rate = 0.9;
          utterance.onend = () => setCurrentlyPlaying(null);
          utterance.onerror = () => setCurrentlyPlaying(null);
          window.speechSynthesis.speak(utterance);
        }
      } else {
        // Fallback to browser TTS
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.onend = () => setCurrentlyPlaying(null);
        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.error('TTS error:', error);
      setCurrentlyPlaying(null);
    }
  };

  const handleQuickAction = async (actionType: string) => {
    if (!selectedBook) {
      toast({
        title: '📚 Pick a book first!',
        description: 'Select a book from your library to explore.',
        status: 'info',
        duration: 3000,
      });
      return;
    }

    // Page-specific actions for page-reader mode
    const pageActionMessages: Record<string, string> = {
      'explain-page': `What's happening on page ${currentPage} of "${selectedBook.title}"? Please explain the scene and what the characters are doing.`,
      'vocabulary-page': `What are some new or interesting words on page ${currentPage} of "${selectedBook.title}"? Help me learn them!`,
      'quiz-page': `Ask me a question about what I just read on page ${currentPage} of "${selectedBook.title}" to check if I understood it.`,
      'characters-page': `Who are the characters shown on page ${currentPage} of "${selectedBook.title}"? What are they doing?`,
      'predict': `Based on page ${currentPage} of "${selectedBook.title}", what do you think will happen next in the story?`,
      'emotions': `How do you think the characters are feeling on page ${currentPage} of "${selectedBook.title}"? What emotions can you see?`,
    };

    // General book actions
    const generalActionMessages: Record<string, string> = {
      summarize: `Can you give me a summary of "${selectedBook.title}"?`,
      characters: `Who are the main characters in "${selectedBook.title}"?`,
      themes: `What lessons can I learn from "${selectedBook.title}"?`,
      question: `I have a question about "${selectedBook.title}"...`,
      similar: `What books are similar to "${selectedBook.title}"?`,
      draw: `What scene from "${selectedBook.title}" should I draw?`,
      write: `Help me write something inspired by "${selectedBook.title}"`,
      roleplay: `Let's pretend to be characters from "${selectedBook.title}"!`,
    };

    const message = pageActionMessages[actionType] || generalActionMessages[actionType] || `Tell me about ${actionType}`;
    setInputMessage(message);
    
    // Auto-send for page actions
    if (pageActionMessages[actionType]) {
      setMessages(prev => [...prev, { role: 'user', content: message }]);
      setInputMessage('');
      await sendMessageToAI(message);
    }
  };

  const sendMessageToAI = async (message: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/child/services/book-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          bookId: selectedBook?.id,
          bookTitle: selectedBook?.title,
          currentPage: mode === 'page-reader' ? currentPage : undefined,
          totalPages: mode === 'page-reader' ? totalPages : undefined,
        }),
      });

      const data = await res.json();
      
      if (data.blocked) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: "Let's talk about something else! What would you like to know about the book? 📚" 
        }]);
      } else if (data.response) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Oops! I had trouble thinking. Can you ask me again? 🤔" 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVocabNext = () => {
    setShowDefinition(false);
    setCurrentWordIndex(prev => (prev + 1) % vocabWords.length);
  };

  const handleVocabMastered = () => {
    setVocabWords(prev => prev.map((w, i) => 
      i === currentWordIndex ? { ...w, mastered: true } : w
    ));
    handleVocabNext();
    toast({
      title: '⭐ Great job!',
      description: 'You learned a new word!',
      status: 'success',
      duration: 2000,
    });
  };

  const handleQuizAnswer = (index: number) => {
    setSelectedAnswer(index);
    setShowResult(true);
    if (index === quizQuestions[currentQuestionIndex]?.correctIndex) {
      setScore(prev => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    setSelectedAnswer(null);
    setShowResult(false);
    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // Quiz complete
      toast({
        title: '🎉 Quiz Complete!',
        description: `You got ${score + (selectedAnswer === quizQuestions[currentQuestionIndex]?.correctIndex ? 1 : 0)} out of ${quizQuestions.length} correct!`,
        status: 'success',
        duration: 5000,
      });
    }
  };

  const renderReadingBuddy = () => (
    <VStack h="full" spacing={3}>
      {/* Page Reader Mode Header */}
      {mode === 'page-reader' && selectedBook && (
        <Box w="full" bg="purple.50" p={3} borderRadius="lg" borderWidth="2px" borderColor="purple.200">
          <HStack justify="space-between" align="center">
            <VStack align="start" spacing={0}>
              <Text fontSize="xs" color="purple.600" fontWeight="bold">📖 Reading Mode</Text>
              <Text fontSize="sm" fontWeight="bold" color="purple.800" noOfLines={1}>
                {selectedBook.title}
              </Text>
            </VStack>
            <Badge colorScheme="purple" fontSize="md" px={3} py={1} borderRadius="full">
              Page {currentPage}/{totalPages}
            </Badge>
          </HStack>
        </Box>
      )}

      {/* Quick Actions - Show page-specific actions in page-reader mode */}
      <Box w="full">
        <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={2}>
          {mode === 'page-reader' ? '🎯 Page Actions' : 'Quick Actions'}
        </Text>
        <SimpleGrid columns={2} spacing={2}>
          {(mode === 'page-reader' ? PAGE_READER_ACTIONS : READING_BUDDY_ACTIONS).map((action) => (
            <Button
              key={action.action}
              size="sm"
              variant="outline"
              colorScheme={(action as any).color || 'purple'}
              leftIcon={<Text>{action.emoji}</Text>}
              onClick={() => handleQuickAction(action.action)}
              fontSize="xs"
              justifyContent="flex-start"
            >
              {action.text}
            </Button>
          ))}
        </SimpleGrid>
      </Box>

      <Divider />

      {/* Chat Messages */}
      <Box flex={1} w="full" overflowY="auto" px={1}>
        <VStack spacing={3} align="stretch">
          {messages.map((msg, i) => (
            <Box
              key={i}
              alignSelf={msg.role === 'user' ? 'flex-end' : 'flex-start'}
              maxW="90%"
            >
              <Box
                bg={msg.role === 'user' ? (colors?.primary || 'purple.500') : 'gray.50'}
                color={msg.role === 'user' ? 'white' : 'gray.800'}
                px={3}
                py={2}
                borderRadius="xl"
                borderBottomRightRadius={msg.role === 'user' ? 'sm' : 'xl'}
                borderBottomLeftRadius={msg.role === 'assistant' ? 'sm' : 'xl'}
                boxShadow="sm"
              >
                {msg.role === 'assistant' ? (
                  <ChildMessageRenderer content={msg.content} fontSize="sm" />
                ) : (
                  <Text fontSize="sm">{msg.content}</Text>
                )}
                
                {/* TTS Read Aloud Button for assistant messages */}
                {msg.role === 'assistant' && (
                  <HStack mt={2} spacing={1}>
                    <IconButton
                      icon={currentlyPlaying === i ? <FiVolumeX /> : <FiVolume2 />}
                      aria-label={currentlyPlaying === i ? 'Stop reading' : 'Read aloud'}
                      size="xs"
                      variant="ghost"
                      colorScheme={currentlyPlaying === i ? 'red' : 'purple'}
                      borderRadius="full"
                      onClick={() => handleReadAloud(i, msg.content)}
                    />
                    {currentlyPlaying === i && (
                      <Text fontSize="2xs" color="purple.500" fontWeight="medium">
                        🔊 Playing...
                      </Text>
                    )}
                  </HStack>
                )}
              </Box>
            </Box>
          ))}
          {isLoading && (
            <HStack alignSelf="flex-start" spacing={2} p={2}>
              <Spinner size="sm" color="purple.500" />
              <Text fontSize="sm" color="gray.500">Thinking...</Text>
            </HStack>
          )}
          <div ref={messagesEndRef} />
        </VStack>
      </Box>

      {/* Input - Compact with voice */}
      <ChildChatInput
        onSend={(message) => {
          setInputMessage('');
          setMessages(prev => [...prev, { role: 'user', content: message }]);
          setIsLoading(true);
          
          fetch('/api/child/services/book-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message,
              bookId: selectedBook?.id,
              bookTitle: selectedBook?.title,
            }),
          })
            .then(res => res.json())
            .then(data => {
              if (data.response) {
                setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
              }
            })
            .catch(() => {
              setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: "Oops! I had trouble thinking. Can you ask me again? 🤔" 
              }]);
            })
            .finally(() => setIsLoading(false));
        }}
        isLoading={isLoading}
        placeholder="Ask about the book or tap 🎤..."
        mode="compact"
        showVoiceInput={true}
        quickReplies={[
          { emoji: '📖', text: 'Summary', message: `Summarize "${selectedBook?.title || 'this book'}"` },
          { emoji: '👥', text: 'Characters', message: 'Who are the main characters?' },
          { emoji: '💡', text: 'Themes', message: 'What are the main themes?' },
          { emoji: '🤔', text: 'More', message: 'Tell me more about that!' },
        ]}
      />
    </VStack>
  );

  const renderVocabulary = () => {
    if (!selectedBook) {
      return (
        <VStack py={8} spacing={4}>
          <Text fontSize="3xl">📚</Text>
          <Text color="gray.500" textAlign="center">
            Pick a book to learn new words!
          </Text>
        </VStack>
      );
    }

    if (vocabLoading) {
      return (
        <VStack py={8}>
          <Spinner size="lg" color="purple.500" />
          <Text color="gray.500">Loading words...</Text>
        </VStack>
      );
    }

    if (vocabWords.length === 0) {
      return (
        <VStack py={8} spacing={4}>
          <Text fontSize="3xl">📝</Text>
          <Text color="gray.500" textAlign="center">
            No vocabulary words found for this book yet.
          </Text>
        </VStack>
      );
    }

    const currentWord = vocabWords[currentWordIndex];
    const masteredCount = vocabWords.filter(w => w.mastered).length;

    return (
      <VStack spacing={4}>
        {/* Progress */}
        <Box w="full">
          <HStack justify="space-between" mb={1}>
            <Text fontSize="xs" color="gray.500">Progress</Text>
            <Text fontSize="xs" fontWeight="bold" color="green.500">
              {masteredCount}/{vocabWords.length} mastered
            </Text>
          </HStack>
          <Progress 
            value={(masteredCount / vocabWords.length) * 100} 
            colorScheme="green" 
            borderRadius="full"
            size="sm"
          />
        </Box>

        {/* Flashcard */}
        <Card 
          w="full" 
          bg={showDefinition ? 'purple.50' : 'white'}
          cursor="pointer"
          onClick={() => setShowDefinition(!showDefinition)}
          transition="all 0.3s"
          _hover={{ shadow: 'lg' }}
        >
          <CardBody textAlign="center" py={8}>
            {!showDefinition ? (
              <VStack spacing={2}>
                <Text fontSize="2xl" fontWeight="bold" color="purple.600">
                  {currentWord.word}
                </Text>
                <Text fontSize="xs" color="gray.400">
                  Tap to see definition
                </Text>
              </VStack>
            ) : (
              <VStack spacing={3}>
                <Text fontSize="lg" fontWeight="bold" color="purple.600">
                  {currentWord.word}
                </Text>
                <Text fontSize="sm">{currentWord.definition}</Text>
                {currentWord.example && (
                  <Text fontSize="xs" fontStyle="italic" color="gray.500">
                    "{currentWord.example}"
                  </Text>
                )}
              </VStack>
            )}
          </CardBody>
        </Card>

        {/* Actions */}
        <HStack w="full" spacing={2}>
          <Button
            flex={1}
            leftIcon={<FiX />}
            colorScheme="gray"
            variant="outline"
            onClick={handleVocabNext}
          >
            Skip
          </Button>
          <Button
            flex={1}
            leftIcon={<FiCheck />}
            colorScheme="green"
            onClick={handleVocabMastered}
          >
            Got it!
          </Button>
        </HStack>

        <Text fontSize="xs" color="gray.400">
          Card {currentWordIndex + 1} of {vocabWords.length}
        </Text>
      </VStack>
    );
  };

  const renderQuiz = () => {
    if (!selectedBook) {
      return (
        <VStack py={8} spacing={4}>
          <Text fontSize="3xl">❓</Text>
          <Text color="gray.500" textAlign="center">
            Pick a book to take a quiz!
          </Text>
        </VStack>
      );
    }

    if (quizLoading) {
      return (
        <VStack py={8}>
          <Spinner size="lg" color="purple.500" />
          <Text color="gray.500">Creating quiz...</Text>
        </VStack>
      );
    }

    if (quizQuestions.length === 0) {
      return (
        <VStack py={8} spacing={4}>
          <Text fontSize="3xl">❓</Text>
          <Text color="gray.500" textAlign="center">
            No quiz available for this book yet.
          </Text>
          <Button colorScheme="purple" onClick={loadQuiz}>
            Generate Quiz
          </Button>
        </VStack>
      );
    }

    const currentQuestion = quizQuestions[currentQuestionIndex];

    return (
      <VStack spacing={4}>
        {/* Progress */}
        <Box w="full">
          <HStack justify="space-between" mb={1}>
            <Text fontSize="xs" color="gray.500">
              Question {currentQuestionIndex + 1} of {quizQuestions.length}
            </Text>
            <Badge colorScheme="purple">Score: {score}</Badge>
          </HStack>
          <Progress 
            value={((currentQuestionIndex + 1) / quizQuestions.length) * 100} 
            colorScheme="purple" 
            borderRadius="full"
            size="sm"
          />
        </Box>

        {/* Question */}
        <Card w="full" bg="purple.50">
          <CardBody>
            <Text fontWeight="bold" fontSize="md">
              {currentQuestion.question}
            </Text>
          </CardBody>
        </Card>

        {/* Options */}
        <VStack w="full" spacing={2}>
          {currentQuestion.options.map((option, i) => {
            let colorScheme = 'gray';
            if (showResult) {
              if (i === currentQuestion.correctIndex) colorScheme = 'green';
              else if (i === selectedAnswer) colorScheme = 'red';
            }
            
            return (
              <Button
                key={i}
                w="full"
                variant={selectedAnswer === i ? 'solid' : 'outline'}
                colorScheme={colorScheme}
                onClick={() => !showResult && handleQuizAnswer(i)}
                isDisabled={showResult}
                justifyContent="flex-start"
                textAlign="left"
                whiteSpace="normal"
                h="auto"
                py={3}
              >
                {option}
              </Button>
            );
          })}
        </VStack>

        {/* Result & Next */}
        {showResult && (
          <VStack w="full" spacing={2}>
            <Card 
              w="full" 
              bg={selectedAnswer === currentQuestion.correctIndex ? 'green.50' : 'orange.50'}
            >
              <CardBody>
                <Text fontSize="sm">
                  {selectedAnswer === currentQuestion.correctIndex 
                    ? '🎉 Correct!' 
                    : '💡 Not quite!'} {currentQuestion.explanation}
                </Text>
              </CardBody>
            </Card>
            <Button
              w="full"
              colorScheme="purple"
              rightIcon={<FiChevronRight />}
              onClick={handleNextQuestion}
            >
              {currentQuestionIndex < quizQuestions.length - 1 ? 'Next Question' : 'Finish Quiz'}
            </Button>
          </VStack>
        )}
      </VStack>
    );
  };

  const renderExplore = () => (
    <VStack spacing={4}>
      <Text fontSize="sm" color="gray.600" textAlign="center">
        {selectedBook 
          ? `Explore "${selectedBook.title}" in different ways!`
          : 'Pick a book to start exploring!'}
      </Text>

      <SimpleGrid columns={2} spacing={3} w="full">
        {EXPLORE_ACTIONS.map((action) => (
          <Card
            key={action.action}
            cursor="pointer"
            _hover={{ shadow: 'md', transform: 'scale(1.02)' }}
            transition="all 0.2s"
            onClick={() => handleQuickAction(action.action)}
          >
            <CardBody textAlign="center" py={4}>
              <Text fontSize="2xl" mb={1}>{action.emoji}</Text>
              <Text fontSize="sm" fontWeight="medium">{action.text}</Text>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>

      {selectedBook && (
        <>
          <Divider />
          <VStack w="full" spacing={2}>
            <Text fontSize="xs" fontWeight="bold" color="gray.500">
              Book Info
            </Text>
            <Card w="full" bg="gray.50">
              <CardBody>
                <VStack align="start" spacing={1}>
                  <Text fontWeight="bold">{selectedBook.title}</Text>
                  {selectedBook.author && (
                    <Text fontSize="sm" color="gray.500">by {selectedBook.author}</Text>
                  )}
                </VStack>
              </CardBody>
            </Card>
          </VStack>
        </>
      )}
    </VStack>
  );

  return (
    <Box h="full" p={4}>
      {activeTab === 'reading-buddy' && renderReadingBuddy()}
      {activeTab === 'vocabulary' && renderVocabulary()}
      {activeTab === 'quiz' && renderQuiz()}
      {activeTab === 'explore' && renderExplore()}
    </Box>
  );
}
