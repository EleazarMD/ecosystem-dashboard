/**
 * Child Chat Input Component
 * 
 * A flexible, child-friendly input component with:
 * - Compact mode: Minimal bar that expands on focus
 * - Floating mode: Draggable mini input
 * - Voice input: Speech-to-text for hands-free input
 * - Quick reply chips: Common responses without typing
 * 
 * Optimized for iPad to minimize keyboard obstruction
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  HStack,
  VStack,
  Input,
  IconButton,
  Text,
  Button,
  Collapse,
  Fade,
  useToast,
  Tooltip,
  Badge,
  Wrap,
  WrapItem,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  PopoverArrow,
  PopoverCloseButton,
} from '@chakra-ui/react';
import { 
  FiSend, 
  FiMic, 
  FiMicOff, 
  FiMaximize2, 
  FiMinimize2,
  FiMove,
  FiX,
  FiMessageCircle,
} from 'react-icons/fi';
import { useChildTheme } from './ChildThemeProvider';

interface QuickReply {
  emoji: string;
  text: string;
  message: string;
}

interface ChildChatInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  quickReplies?: QuickReply[];
  mode?: 'compact' | 'floating' | 'standard';
  showVoiceInput?: boolean;
  disabled?: boolean;
  extraActions?: React.ReactNode;
  showQuickRepliesInline?: boolean; // Show quick replies as + button instead of chips
}

// Default quick replies for general chat
const DEFAULT_QUICK_REPLIES: QuickReply[] = [
  { emoji: '👋', text: 'Hi!', message: 'Hi! How are you?' },
  { emoji: '📖', text: 'Story', message: 'Tell me a story!' },
  { emoji: '❓', text: 'Question', message: 'I have a question...' },
  { emoji: '🎮', text: 'Fun', message: "Let's do something fun!" },
  { emoji: '📚', text: 'Learn', message: 'Teach me something new!' },
  { emoji: '🤔', text: 'More', message: 'Tell me more about that!' },
];

// Speech recognition types
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

export const ChildChatInput: React.FC<ChildChatInputProps> = ({
  onSend,
  isLoading = false,
  placeholder = 'Type your message...',
  quickReplies = DEFAULT_QUICK_REPLIES,
  mode = 'compact',
  showVoiceInput = true,
  disabled = false,
  extraActions,
  showQuickRepliesInline = false,
}) => {
  const { colors } = useChildTheme();
  const toast = useToast();
  
  // Input state
  const [inputValue, setInputValue] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const [showQuickRepliesPopover, setShowQuickRepliesPopover] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Voice input state
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef<any>(null);
  
  // Floating mode state
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && showVoiceInput) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let interim = '';
          let final = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              final += transcript;
            } else {
              interim += transcript;
            }
          }
          
          if (final) {
            setInputValue(prev => prev + (prev ? ' ' : '') + final);
            setInterimTranscript('');
          } else {
            setInterimTranscript(interim);
          }
        };
        
        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          
          if (event.error === 'not-allowed') {
            toast({
              title: '🎤 Microphone access needed',
              description: 'Please allow microphone access to use voice input.',
              status: 'warning',
              duration: 4000,
            });
          }
        };
        
        recognition.onend = () => {
          setIsListening(false);
        };
        
        recognitionRef.current = recognition;
      }
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [showVoiceInput, toast]);

  // Toggle voice input
  const toggleVoiceInput = useCallback(() => {
    if (!recognitionRef.current) {
      toast({
        title: '🎤 Voice input not available',
        description: 'Your browser does not support voice input.',
        status: 'info',
        duration: 3000,
      });
      return;
    }
    
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setIsExpanded(true);
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
      }
    }
  }, [isListening, toast]);

  // Handle send
  const handleSend = useCallback(() => {
    const message = inputValue.trim();
    if (!message || isLoading || disabled) return;
    
    onSend(message);
    setInputValue('');
    setInterimTranscript('');
    setIsExpanded(false);
    
    // Stop listening after send
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [inputValue, isLoading, disabled, onSend, isListening]);

  // Handle quick reply
  const handleQuickReply = useCallback((reply: QuickReply) => {
    if (isLoading || disabled) return;
    onSend(reply.message);
  }, [isLoading, disabled, onSend]);

  // Handle key press
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Floating mode drag handlers
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (mode !== 'floating') return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    setIsDragging(true);
    dragRef.current = {
      startX: clientX,
      startY: clientY,
      initialX: position.x,
      initialY: position.y,
    };
  }, [mode, position]);

  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging || !dragRef.current) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const deltaX = clientX - dragRef.current.startX;
    const deltaY = clientY - dragRef.current.startY;
    
    setPosition({
      x: Math.max(0, dragRef.current.initialX + deltaX),
      y: Math.max(0, dragRef.current.initialY + deltaY),
    });
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    dragRef.current = null;
  }, []);

  // Add/remove drag event listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove);
      window.addEventListener('touchend', handleDragEnd);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Render quick replies
  const renderQuickReplies = () => (
    <Wrap spacing={1} justify="center">
      {quickReplies.slice(0, 6).map((reply, index) => (
        <WrapItem key={index}>
          <Button
            size="xs"
            variant="outline"
            colorScheme="purple"
            leftIcon={<Text fontSize="xs">{reply.emoji}</Text>}
            onClick={() => handleQuickReply(reply)}
            isDisabled={isLoading || disabled}
            borderRadius="full"
            fontSize="2xs"
            px={2}
            h={6}
          >
            {reply.text}
          </Button>
        </WrapItem>
      ))}
    </Wrap>
  );

  // Render voice indicator
  const renderVoiceIndicator = () => (
    <Fade in={isListening}>
      <HStack 
        spacing={1} 
        bg="red.50" 
        px={2} 
        py={1} 
        borderRadius="full"
        border="1px solid"
        borderColor="red.200"
      >
        <Box
          w={2}
          h={2}
          bg="red.500"
          borderRadius="full"
          animation="pulse 1s infinite"
          sx={{
            '@keyframes pulse': {
              '0%, 100%': { opacity: 1 },
              '50%': { opacity: 0.5 },
            },
          }}
        />
        <Text fontSize="2xs" color="red.600" fontWeight="medium">
          Listening...
        </Text>
      </HStack>
    </Fade>
  );

  // Render input bar
  const renderInputBar = () => (
    <HStack 
      spacing={0} 
      w="full" 
      bg="white" 
      borderRadius="full" 
      border="2px solid"
      borderColor="gray.200"
      px={2}
      py={1}
      h="56px"
      _focusWithin={{
        borderColor: colors?.primary || 'purple.400',
        boxShadow: `0 0 0 1px ${colors?.primary || 'purple.400'}`,
      }}
    >
      {/* Quick actions button (+ icon) - only show if inline mode */}
      {showQuickRepliesInline && (
        <Popover
          isOpen={showQuickRepliesPopover}
          onClose={() => setShowQuickRepliesPopover(false)}
          placement="top-start"
          closeOnBlur={true}
        >
          <PopoverTrigger>
            <IconButton
              aria-label="Quick actions"
              icon={<Text fontSize="xl" fontWeight="bold">+</Text>}
              size="md"
              variant="ghost"
              colorScheme="purple"
              borderRadius="full"
              onClick={() => setShowQuickRepliesPopover(!showQuickRepliesPopover)}
              isDisabled={disabled}
              minW="40px"
            />
          </PopoverTrigger>
          <PopoverContent w="280px" borderRadius="xl" boxShadow="xl">
            <PopoverArrow />
            <PopoverCloseButton />
            <PopoverHeader fontWeight="bold" borderBottomWidth="1px">
              Quick Actions
            </PopoverHeader>
            <PopoverBody p={3}>
              <Wrap spacing={2}>
                {quickReplies.map((reply, index) => (
                  <WrapItem key={index}>
                    <Button
                      size="sm"
                      variant="outline"
                      colorScheme="purple"
                      leftIcon={<Text fontSize="sm">{reply.emoji}</Text>}
                      onClick={() => {
                        handleQuickReply(reply);
                        setShowQuickRepliesPopover(false);
                      }}
                      isDisabled={isLoading || disabled}
                      borderRadius="full"
                      fontSize="xs"
                    >
                      {reply.text}
                    </Button>
                  </WrapItem>
                ))}
              </Wrap>
            </PopoverBody>
          </PopoverContent>
        </Popover>
      )}
      
      {/* Voice input button */}
      {showVoiceInput && (
        <Tooltip label={isListening ? 'Stop listening' : 'Voice input'} placement="top">
          <IconButton
            aria-label={isListening ? 'Stop listening' : 'Voice input'}
            icon={isListening ? <FiMicOff /> : <FiMic />}
            size="md"
            variant={isListening ? 'solid' : 'ghost'}
            colorScheme={isListening ? 'red' : 'purple'}
            borderRadius="full"
            onClick={toggleVoiceInput}
            isDisabled={disabled}
            minW="40px"
          />
        </Tooltip>
      )}
      
      {/* Text input */}
      <Input
        ref={inputRef}
        value={inputValue + interimTranscript}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyPress={handleKeyPress}
        onFocus={() => setIsExpanded(true)}
        placeholder={isListening ? '🎤 Speak now...' : placeholder}
        size="md"
        border="none"
        bg="transparent"
        flex={1}
        isDisabled={disabled}
        px={2}
        _focus={{
          border: 'none',
          boxShadow: 'none',
        }}
      />
      
      {/* Send button */}
      <IconButton
        aria-label="Send"
        icon={<FiSend />}
        size="md"
        colorScheme="purple"
        borderRadius="full"
        onClick={handleSend}
        isLoading={isLoading}
        isDisabled={!inputValue.trim() || disabled}
        minW="40px"
      />
    </HStack>
  );

  // Compact mode
  if (mode === 'compact') {
    return (
      <VStack spacing={2} w="full">
        {/* Quick replies and extra actions - only show if NOT inline mode */}
        {!showQuickRepliesInline && (
          <Collapse in={showQuickReplies && !isExpanded} animateOpacity>
            <VStack spacing={2} w="full">
              <HStack spacing={2} justify="center" flexWrap="wrap">
                {renderQuickReplies()}
                {extraActions && (
                  <Box ml={1}>
                    {extraActions}
                  </Box>
                )}
              </HStack>
            </VStack>
          </Collapse>
        )}
        
        {/* Voice indicator */}
        {isListening && renderVoiceIndicator()}
        
        {/* Input bar */}
        <Box w="full">
          {renderInputBar()}
        </Box>
        
        {/* Toggle quick replies when expanded - only if NOT inline mode */}
        {!showQuickRepliesInline && isExpanded && (
          <Button
            size="xs"
            variant="ghost"
            colorScheme="gray"
            onClick={() => setShowQuickReplies(!showQuickReplies)}
            leftIcon={<FiMessageCircle size={12} />}
          >
            {showQuickReplies ? 'Hide' : 'Show'} quick replies
          </Button>
        )}
      </VStack>
    );
  }

  // Floating mode
  if (mode === 'floating') {
    return (
      <Box
        position="fixed"
        bottom={`${position.y}px`}
        right={`${position.x}px`}
        zIndex={1000}
        bg="white"
        borderRadius="2xl"
        boxShadow="xl"
        border="2px solid"
        borderColor={colors?.primary || 'purple.300'}
        p={2}
        minW={isExpanded ? '280px' : '60px'}
        maxW="320px"
        transition="all 0.2s"
      >
        {isExpanded ? (
          <VStack spacing={2}>
            {/* Header with drag handle and close */}
            <HStack w="full" justify="space-between">
              <HStack
                spacing={1}
                cursor="move"
                onMouseDown={handleDragStart}
                onTouchStart={handleDragStart}
                p={1}
              >
                <FiMove size={12} />
                <Text fontSize="2xs" color="gray.500">Drag to move</Text>
              </HStack>
              <IconButton
                aria-label="Minimize"
                icon={<FiMinimize2 />}
                size="xs"
                variant="ghost"
                onClick={() => setIsExpanded(false)}
              />
            </HStack>
            
            {/* Voice indicator */}
            {isListening && renderVoiceIndicator()}
            
            {/* Quick replies */}
            {renderQuickReplies()}
            
            {/* Input bar */}
            {renderInputBar()}
          </VStack>
        ) : (
          <HStack spacing={1}>
            <IconButton
              aria-label="Expand chat input"
              icon={<FiMaximize2 />}
              size="sm"
              colorScheme="purple"
              borderRadius="full"
              onClick={() => setIsExpanded(true)}
            />
            {showVoiceInput && (
              <IconButton
                aria-label="Voice input"
                icon={isListening ? <FiMicOff /> : <FiMic />}
                size="sm"
                variant={isListening ? 'solid' : 'outline'}
                colorScheme={isListening ? 'red' : 'purple'}
                borderRadius="full"
                onClick={toggleVoiceInput}
              />
            )}
          </HStack>
        )}
      </Box>
    );
  }

  // Standard mode (default)
  return (
    <VStack spacing={2} w="full">
      {/* Voice indicator */}
      {isListening && renderVoiceIndicator()}
      
      {/* Quick replies */}
      {renderQuickReplies()}
      
      {/* Input bar */}
      {renderInputBar()}
    </VStack>
  );
};

export default ChildChatInput;
