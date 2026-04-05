/**
 * Modern Streaming Text Display Component
 * Clean, elegant text streaming with smooth animations
 */

import React, { useEffect, useState, useRef } from 'react';
import { Box, Text } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import { motion, AnimatePresence } from 'framer-motion';

interface StreamingTextProps {
  text: string;
  isStreaming: boolean;
  speed?: 'slow' | 'normal' | 'fast';
  onComplete?: () => void;
}

export const StreamingText: React.FC<StreamingTextProps> = ({
  text,
  isStreaming,
  speed = 'normal',
  onComplete
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [showCursor, setShowCursor] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const indexRef = useRef(0);

  // Speed settings
  const speedMap = {
    slow: 80,
    normal: 40,
    fast: 20
  };

  // Colors
  const textColor = useSemanticToken('text.primary');
  const cursorColor = 'blue.500';

  useEffect(() => {
    if (!isStreaming || !text) {
      setDisplayedText(text);
      setShowCursor(false);
      indexRef.current = 0;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Reset for new streaming
    setDisplayedText('');
    setShowCursor(true);
    indexRef.current = 0;

    // Start streaming
    intervalRef.current = setInterval(() => {
      if (indexRef.current < text.length) {
        setDisplayedText(text.slice(0, indexRef.current + 1));
        indexRef.current++;
      } else {
        setShowCursor(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        onComplete?.();
      }
    }, speedMap[speed]);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [text, isStreaming, speed, onComplete]);

  if (!text && !displayedText) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <Box
        p={4}
        bg={useSemanticToken('surface.elevated')}
        borderRadius="xl"
        border="1px solid"
        borderColor={useSemanticToken('border.default')}
        shadow="sm"
        position="relative"
      >
        <Text
          fontSize="md"
          lineHeight="1.6"
          color={textColor}
          whiteSpace="pre-wrap"
        >
          {displayedText}
          <AnimatePresence>
            {showCursor && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                style={{
                  display: 'inline-block',
                  width: '2px',
                  height: '1.2em',
                  backgroundColor: cursorColor,
                  marginLeft: '2px',
                  verticalAlign: 'text-bottom'
                }}
              />
            )}
          </AnimatePresence>
        </Text>
      </Box>
    </motion.div>
  );
};

// Modern Caption Component for voice responses
export const StreamingCaptions: React.FC<{
  text: string;
  isVisible: boolean;
  position?: 'bottom' | 'side';
}> = ({ text, isVisible, position = 'bottom' }) => {
  const [displayedText, setDisplayedText] = useState('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const indexRef = useRef(0);

  useEffect(() => {
    if (!isVisible || !text) {
      setDisplayedText('');
      indexRef.current = 0;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Reset and start streaming
    setDisplayedText('');
    indexRef.current = 0;

    intervalRef.current = setInterval(() => {
      if (indexRef.current < text.length) {
        setDisplayedText(text.slice(0, indexRef.current + 1));
        indexRef.current++;
      } else {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    }, 25); // Fast typing for captions

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [text, isVisible]);

  if (!isVisible || !text) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        style={{
          position: 'absolute',
          bottom: position === 'bottom' ? '24px' : 'auto',
          right: position === 'side' ? '24px' : 'auto',
          left: position === 'bottom' ? '50%' : 'auto',
          transform: position === 'bottom' ? 'translateX(-50%)' : 'none',
          maxWidth: position === 'bottom' ? '85%' : '320px',
          zIndex: 10,
        }}
      >
        <Box
          bg={useSemanticToken('glass.background')}
          color="whiteAlpha.900"
          px={4}
          py={3}
          borderRadius="xl"
          backdropFilter="blur(12px)"
          border="1px solid"
          borderColor={useSemanticToken('border.subtle')}
          shadow="xl"
        >
          <Text
            fontSize="sm"
            fontWeight="medium"
            lineHeight="1.4"
          >
            {displayedText}
            {displayedText.length < text.length && (
              <motion.span
                animate={{ opacity: [0, 1, 0] }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                style={{
                  display: 'inline-block',
                  width: '2px',
                  height: '0.9em',
                  backgroundColor: 'white',
                  marginLeft: '2px',
                  verticalAlign: 'text-bottom'
                }}
              />
            )}
          </Text>
        </Box>
      </motion.div>
    </AnimatePresence>
  );
};
