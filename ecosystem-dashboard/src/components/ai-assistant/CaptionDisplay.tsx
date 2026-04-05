/**
 * Caption Display Component
 * Shows TTS captions and streaming status
 */

import React, { useEffect, useRef, useState, ReactNode } from 'react';
import {
  Box,
  HStack,
  Text,
  VStack,
} from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { motion } from 'framer-motion';

interface CaptionDisplayProps {
  captionsVisible: boolean;
  ttsStreamText: string;
  ttsIsStreaming: boolean;
  isVoiceListening: boolean;
  isMicrophoneMuted: boolean;
  persistentCaptions?: boolean;
  children?: ReactNode;
}

export const CaptionDisplay: React.FC<CaptionDisplayProps> = ({
  captionsVisible,
  ttsStreamText,
  ttsIsStreaming,
  isVoiceListening,
  isMicrophoneMuted,
  persistentCaptions = false,
  children,
}) => {
  const [captionNodes, setCaptionNodes] = useState<ReactNode[]>([]);
  const prevLenRef = useRef(0);
  
  const bg = useSemanticToken('glass.background');
  const borderColor = useSemanticToken('border.default');
  const statusTextColor = useSemanticToken('text.secondary');

  // Build animated caption nodes for partial fade-in per word
  useEffect(() => {
    // Reset when cleared
    if (!ttsStreamText) {
      setCaptionNodes([]);
      prevLenRef.current = 0;
      return;
    }

    const words = ttsStreamText.split(' ');
    const prevWords = prevLenRef.current;

    // Only add new words if we got more words
    if (words.length <= prevWords) return;

    const newNodes = words.slice(prevWords).map((word, idx) => (
      <motion.span
        key={prevWords + idx}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: idx * 0.05 }}
        style={{ marginRight: '0.25em' }}
      >
        {word}
      </motion.span>
    ));

    prevLenRef.current = words.length;
    setCaptionNodes((prev) => [...prev, ...newNodes]);
  }, [ttsStreamText]);

  if (!captionsVisible && !ttsStreamText) return null;

  return (
    <Box
      position="absolute"
      bottom="20px"
      left="20px"
      right="20px"
      bg={bg}
      borderRadius="lg"
      backdropFilter="blur(6px)"
      border="1px solid"
      borderColor={borderColor}
      p={3}
      pt={2}
      pointerEvents="auto"
      display={(captionsVisible || ttsStreamText) ? 'block' : 'none'}
      opacity={captionsVisible ? 1 : 0}
      transition="opacity 0.6s ease"
    >
      {/* Status row */}
      <HStack justify="space-between" align="center" mb={1} px={1} opacity={0.8}>
        <HStack spacing={2}>
          <Box 
            w="6px" 
            h="6px" 
            borderRadius="full" 
            bg={ttsIsStreaming || captionsVisible ? 'purple.400' : (isVoiceListening ? 'green.400' : 'gray.400')} 
          />
          <Text fontSize="xs" color={statusTextColor}>
            {isMicrophoneMuted ? 'Mic muted' : 
             (ttsIsStreaming || captionsVisible ? 'Speaking…' : 
              (isVoiceListening ? 'Listening…' : 'Idle'))}
          </Text>
        </HStack>
        
        {/* Optional actions */}
        {children}
      </HStack>

      {/* Captions */}
      {ttsStreamText && (
        <VStack align="start" spacing={0} px={2}>
          <Text fontSize="sm" fontWeight="medium" lineHeight="tall" color={statusTextColor}>
            {captionNodes}
          </Text>
        </VStack>
      )}
    </Box>
  );
};
