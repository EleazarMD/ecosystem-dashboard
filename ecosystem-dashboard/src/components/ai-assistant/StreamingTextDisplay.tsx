/**
 * Streaming Text Display - Clean floating text without background overlays
 * Features dynamic sentence-by-sentence streaming with fade-out effects
 */

import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, VStack } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import { motion, AnimatePresence } from 'framer-motion';

interface StreamingTextDisplayProps {
  isVisible: boolean;
  streamingText: string;
  isStreaming: boolean;
  onSentenceComplete?: (sentence: string) => void;
}

interface Sentence {
  id: string;
  text: string;
  isComplete: boolean;
  timestamp: number;
}

const MotionBox = motion(Box);
const MotionText = motion(Text);

export const StreamingTextDisplay: React.FC<StreamingTextDisplayProps> = ({
  isVisible,
  streamingText,
  isStreaming,
  onSentenceComplete
}) => {
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [currentSentence, setCurrentSentence] = useState('');
  const lastProcessedLength = useRef(0);
  const sentenceTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Process streaming text into sentences
  useEffect(() => {
    if (!streamingText) {
      setSentences([]);
      setCurrentSentence('');
      lastProcessedLength.current = 0;
      return;
    }

    const newText = streamingText.slice(lastProcessedLength.current);
    if (!newText) return;

    // Detect sentence endings (., !, ?, or line breaks)
    const sentenceRegex = /[.!?]\s+|[\n\r]+/g;
    const fullText = currentSentence + newText;

    let lastIndex = 0;
    let match;
    const newSentences: Sentence[] = [];

    while ((match = sentenceRegex.exec(fullText)) !== null) {
      const sentenceText = fullText.slice(lastIndex, match.index + match[0].length).trim();
      if (sentenceText) {
        const sentenceId = `sentence-${Date.now()}-${Math.random()}`;
        newSentences.push({
          id: sentenceId,
          text: sentenceText,
          isComplete: true,
          timestamp: Date.now()
        });
        onSentenceComplete?.(sentenceText);
      }
      lastIndex = match.index + match[0].length;
    }

    // Update sentences and current incomplete sentence
    if (newSentences.length > 0) {
      setSentences(prev => [...prev, ...newSentences]);
      setCurrentSentence(fullText.slice(lastIndex));

      // Set fade-out timers for completed sentences
      newSentences.forEach(sentence => {
        const timeout = setTimeout(() => {
          setSentences(prev => prev.filter(s => s.id !== sentence.id));
          sentenceTimeouts.current.delete(sentence.id);
        }, 4000); // Fade out after 4 seconds

        sentenceTimeouts.current.set(sentence.id, timeout);
      });
    } else {
      setCurrentSentence(fullText);
    }

    lastProcessedLength.current = streamingText.length;
  }, [streamingText, currentSentence, onSentenceComplete]);

  // Clear timeouts on unmount
  useEffect(() => {
    return () => {
      sentenceTimeouts.current.forEach(timeout => clearTimeout(timeout));
      sentenceTimeouts.current.clear();
    };
  }, []);

  // Clear everything when not visible
  useEffect(() => {
    if (!isVisible) {
      setSentences([]);
      setCurrentSentence('');
      lastProcessedLength.current = 0;
      sentenceTimeouts.current.forEach(timeout => clearTimeout(timeout));
      sentenceTimeouts.current.clear();
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <MotionBox
      position="fixed"
      top="50%"
      left="50%"
      transform="translate(-50%, -50%)"
      zIndex={9999}
      pointerEvents="none"
      maxWidth="80vw"
      maxHeight="60vh"
      overflow="hidden"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
    >
      <VStack spacing={2} align="center">
        {/* Completed sentences with fade-out animation */}
        <AnimatePresence>
          {sentences.map((sentence) => (
            <MotionText
              key={sentence.id}
              fontSize={{ base: "lg", md: "xl", lg: "2xl" }}
              fontWeight="medium"
              color="whiteAlpha.900"
              textAlign="center"
              textShadow="2px 2px 4px rgba(0,0,0,0.8)"
              lineHeight="1.4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              transition={{ duration: 0.5 }}
            >
              {sentence.text}
            </MotionText>
          ))}
        </AnimatePresence>

        {/* Current streaming sentence */}
        {currentSentence && (
          <MotionText
            fontSize={{ base: "lg", md: "xl", lg: "2xl" }}
            fontWeight="medium"
            color="whiteAlpha.900"
            textAlign="center"
            textShadow="2px 2px 4px rgba(0,0,0,0.8)"
            lineHeight="1.4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {currentSentence}
            {isStreaming && (
              <MotionBox
                as="span"
                display="inline-block"
                w="2px"
                h="1.2em"
                bg={useSemanticToken('surface.elevated')}
                ml={1}
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
            )}
          </MotionText>
        )}
      </VStack>
    </MotionBox>
  );
};

export default StreamingTextDisplay;
