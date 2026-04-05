/**
 * Polished AI Assistant Input Component
 * Features responsive controls, smooth animations, and sophisticated styling
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  HStack,
  VStack,
  Textarea,
  IconButton,
  Tooltip,
  Flex,
  Text,
  Fade,
  ScaleFade,
  Slide,
  useDisclosure,
} from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PaperAirplaneIcon,
  Cog6ToothIcon,
  ChatBubbleLeftRightIcon,
  StopIcon,
  MicrophoneIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
} from '@heroicons/react/24/outline';
import {
  MicrophoneIcon as MicrophoneSolid,
  ChatBubbleLeftRightIcon as ChatBubbleSolid,
  SpeakerXMarkIcon as MicrophoneMutedIcon,
} from '@heroicons/react/24/solid';
import { useSemanticToken } from '@/hooks/useSemanticToken';

const MotionBox = motion(Box);
const MotionHStack = motion(HStack);

interface AIAssistantInputPolishedProps {
  inputRef: React.RefObject<HTMLTextAreaElement>;
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  sendMessage: (message: string) => void;
  isVoiceListening: boolean;
  isAudioMuted: boolean;
  setIsAudioMuted: (muted: boolean) => void;
  isMicrophoneMuted?: boolean;
  onToggleMicrophoneMute?: () => void;
  isVoiceConnected: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
  onOpenSettings: () => void;
  isConversationActive: boolean;
  onToggleConversation: () => void;
}

export const AIAssistantInputPolished: React.FC<AIAssistantInputPolishedProps> = ({
  input,
  setInput,
  isLoading,
  sendMessage,
  isVoiceListening,
  inputRef,
  isAudioMuted,
  setIsAudioMuted,
  isMicrophoneMuted = false,
  onToggleMicrophoneMute,
  isVoiceConnected = false,
  onStartListening,
  onStopListening,
  onOpenSettings,
  isConversationActive = false,
  onToggleConversation,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Colors
  const bgGradient = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const focusBorderColor = 'blue.500';
  const shadowColor = '0 4px 12px rgba(0, 0, 0, 0.1)';
  const focusShadow = '0 0 0 3px rgba(66, 153, 225, 0.15)';
  const placeholderColor = useSemanticToken('text.tertiary');
  const textColor = useSemanticToken('text.primary');

  // Handle typing state
  useEffect(() => {
    if (input.length > 0) {
      setIsTyping(true);
      setShowControls(false);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        setShowControls(true);
      }, 1000); // Show controls 1s after stopping typing
    } else {
      setIsTyping(false);
      setShowControls(true);
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input);
  };


  return (
    <Box
      as="form"
      onSubmit={handleSubmit}
      position="relative"
      w="full"
      px={4}
      pb={4}
    >
      <Box
        bgGradient={bgGradient}
        borderRadius="2xl"
        border="1px solid"
        borderColor={isFocused ? focusBorderColor : borderColor}
        boxShadow={isFocused ? focusShadow : shadowColor}
        overflow="hidden"
        transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
        position="relative"
      >
          {/* Animated border gradient on focus */}
          {isFocused && (
            <MotionBox
              position="absolute"
              top={0}
              left={0}
              right={0}
              h="2px"
              bgGradient="linear(to-r, blue.400, purple.400, pink.400)"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.3 }}
            />
          )}

          <Flex align="flex-end" p={3}>
            {/* Textarea */}
            <Box flex={1} position="relative">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  isConversationActive
                    ? isVoiceListening 
                      ? "Listening..." 
                      : "Voice conversation active - click microphone to speak"
                    : "Ask me anything about your AI Homelab..."
                }
                variant="unstyled"
                size="sm"
                resize="none"
                minH="60px"
                maxH="300px"
                rows={3}
                color={textColor}
                fontSize="sm"
                lineHeight="tall"
                isDisabled={false}
                _placeholder={{ 
                  color: placeholderColor,
                  transition: 'color 0.2s',
                }}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                sx={{
                  '::-webkit-scrollbar': { 
                    width: '4px',
                  },
                  '::-webkit-scrollbar-track': {
                    bg: 'transparent',
                  },
                  '::-webkit-scrollbar-thumb': {
                    bg: 'gray.300',
                    borderRadius: 'full',
                  },
                }}
              />
              
              {/* Character count indicator */}
              <AnimatePresence>
                {input.length > 0 && (
                  <MotionBox
                    position="absolute"
                    bottom={0}
                    right={0}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 0.5, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                  >
                    <Text fontSize="xs" color={useSemanticToken('text.tertiary')}>
                      {input.length} / 4000
                    </Text>
                  </MotionBox>
                )}
              </AnimatePresence>
            </Box>

            {/* Controls Container - Fade only, no movement */}
            <HStack
              spacing={1}
              ml={3}
              opacity={showControls ? 1 : 0}
              transition="opacity 0.3s ease-in-out"
              pointerEvents={showControls ? "auto" : "none"}
            >
              {/* Settings Button */}
              <Tooltip label="Voice & Audio Settings" placement="top">
                <IconButton
                  aria-label="Settings"
                  icon={<Cog6ToothIcon width={18} />}
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    console.log('⚙️ Settings button clicked');
                    onOpenSettings?.();
                  }}
                  _hover={{ 
                    bg: 'gray.100', 
                    _dark: { bg: 'gray.700' },
                    transform: 'rotate(90deg)',
                  }}
                  transition="all 0.3s"
                />
              </Tooltip>


              {/* Audio Mute */}
              <Tooltip label={isAudioMuted ? "Unmute Audio" : "Mute Audio"} placement="top">
                <IconButton
                  aria-label="Toggle audio"
                  icon={isAudioMuted ? <SpeakerXMarkIcon width={18} /> : <SpeakerWaveIcon width={18} />}
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    console.log('🔊 Audio toggle clicked:', { isAudioMuted });
                    setIsAudioMuted(!isAudioMuted);
                  }}
                  color={isAudioMuted ? 'red.500' : 'gray.500'}
                  _hover={{ 
                    bg: isAudioMuted ? 'red.50' : 'gray.100',
                    _dark: { bg: isAudioMuted ? 'red.900' : 'gray.700' }
                  }}
                />
              </Tooltip>


              {/* Microphone Mute Toggle - Only show when voice is connected */}
              {isVoiceConnected && (
                <Tooltip label={isMicrophoneMuted ? "Unmute Microphone" : "Mute Microphone"} placement="top">
                  <IconButton
                    aria-label="Toggle microphone mute"
                    icon={
                      isMicrophoneMuted ? 
                        <MicrophoneMutedIcon width={20} /> : 
                        <MicrophoneIcon width={20} />
                    }
                    variant={isMicrophoneMuted ? "solid" : "ghost"}
                    colorScheme={isMicrophoneMuted ? "red" : "gray"}
                    size="sm"
                    onClick={() => {
                      console.log('🎤 Microphone mute toggle clicked:', { isMicrophoneMuted });
                      onToggleMicrophoneMute?.();
                    }}
                    isDisabled={!isVoiceConnected}
                    _hover={{ 
                      transform: 'scale(1.1)',
                    }}
                    transition="all 0.2s"
                  />
                </Tooltip>
              )}

              {/* Dynamic Send/Conversation Button */}
              {input.trim() ? (
                // Send message button when there's text
                <IconButton
                  aria-label="Send message"
                  icon={<PaperAirplaneIcon width={20} />}
                  colorScheme="blue"
                  variant="solid"
                  size="md"
                  type="submit"
                  isLoading={isLoading}
                  isDisabled={isLoading}
                  _hover={{ 
                    transform: 'translateY(-2px)',
                    boxShadow: 'lg',
                  }}
                  transition="all 0.2s"
                />
              ) : (
                // Stop conversation button when no text and conversation is active
                isConversationActive ? (
                  <Tooltip label="Stop Conversation" placement="top">
                    <IconButton
                      aria-label="Stop conversation"
                      icon={<StopIcon width={20} />}
                      colorScheme="red"
                      variant="solid"
                      size="md"
                      onClick={() => {
                        console.log('🛑 Stop conversation button clicked');
                        // Stop conversation
                        onToggleConversation?.();
                        // Also stop voice listening if active
                        if (isVoiceListening) {
                          onStopListening?.();
                        }
                      }}
                      _hover={{ 
                        transform: 'scale(1.05)',
                      }}
                      transition="all 0.2s"
                    />
                  </Tooltip>
                ) : (
                  // Start conversation button when no conversation is active
                  <Tooltip 
                    label={isVoiceConnected ? "Start Voice Conversation" : "Start Voice Conversation (will connect to voice service)"} 
                    placement="top"
                  >
                    <IconButton
                      aria-label="Start voice conversation"
                      icon={<ChatBubbleLeftRightIcon width={20} />}
                      colorScheme={isVoiceConnected ? "blue" : "purple"}
                      variant="outline"
                      size="md"
                      onClick={() => {
                        console.log('💬 Start conversation button clicked');
                        // Start conversation (will auto-connect if not connected)
                        onToggleConversation?.();
                        // Auto-start voice listening if already connected
                        if (isVoiceConnected) {
                          onStartListening?.();
                        }
                      }}
                      _hover={{ 
                        transform: 'scale(1.05)',
                      }}
                      transition="all 0.2s"
                    />
                  </Tooltip>
                )
              )}
            </HStack>
          </Flex>

          {/* Voice activity indicator */}
          <AnimatePresence>
            {isVoiceListening && (
              <MotionBox
                position="absolute"
                bottom={0}
                left={0}
                right={0}
                h="3px"
                bgGradient="linear(to-r, red.400, red.500, red.400)"
                initial={{ scaleX: 0 }}
                animate={{ 
                  scaleX: 1,
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                }}
                exit={{ scaleX: 0 }}
                transition={{
                  scaleX: { duration: 0.3 },
                  backgroundPosition: {
                    duration: 2,
                    repeat: Infinity,
                    ease: "linear"
                  }
                }}
                style={{ backgroundSize: '200% 100%' }}
              />
            )}
          </AnimatePresence>
        </Box>

      {/* Helper text */}
      <AnimatePresence>
        {isFocused && (
          <MotionBox
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            mt={2}
            px={2}
          >
            <Text fontSize="xs" color={useSemanticToken('text.tertiary')}>
              Press <Text as="span" fontWeight="bold">Enter</Text> to send, 
              <Text as="span" fontWeight="bold"> Shift+Enter</Text> for new line
            </Text>
          </MotionBox>
        )}
      </AnimatePresence>
    </Box>
  );
};
