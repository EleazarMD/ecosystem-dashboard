/**
 * Perplexity-Style Centered Input
 * Starts centered on empty screen, slides down when content appears
 * Uses Framer Motion for smooth animations
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, VStack, HStack, Text, IconButton, Textarea } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import { FiSend, FiPaperclip, FiZap } from 'react-icons/fi';
import { PerplexityMode } from '../common/PerplexityEnhancedInput';

interface PerplexityCenteredInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onAttach?: () => void;
  placeholder?: string;
  isLoading?: boolean;
  isEmpty?: boolean;  // Whether conversation is empty (controls centering)
  perplexityMode?: PerplexityMode | null;
  disabled?: boolean;
}

export const PerplexityCenteredInput: React.FC<PerplexityCenteredInputProps> = ({
  value,
  onChange,
  onSubmit,
  onAttach,
  placeholder = "Ask anything. Type @ for mentions and / for shortcuts...",
  isLoading = false,
  isEmpty = true,
  perplexityMode = null,
  disabled = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isLoading && !disabled) {
        onSubmit();
      }
    }
  };

  // Perplexity mode colors
  const getModeColor = () => {
    if (!perplexityMode) return 'gray.400';
    const colors: Record<PerplexityMode, string> = {
      fast: 'blue.400',
      research: 'purple.400',
      reason: 'amber.400',
      search: 'green.400'
    };
    return colors[perplexityMode] || 'gray.400';
  };

  const getModeIcon = () => {
    if (!perplexityMode) return null;
    const icons: Record<PerplexityMode, string> = {
      fast: '⚡',
      research: '📚',
      reason: '🧠',
      search: '🔍'
    };
    return icons[perplexityMode];
  };

  // Variants for Framer Motion animations
  const containerVariants = {
    centered: {
      position: 'fixed' as const,
      top: '50%',
      left: '50%',
      x: '-50%',
      y: '-50%',
      width: '75%',  // 25% smaller than original
      maxWidth: '600px',
      transition: {
        type: 'spring',
        damping: 25,
        stiffness: 200,
      }
    },
    bottom: {
      position: 'fixed' as const,
      bottom: '24px',
      left: '50%',
      x: '-50%',
      y: 0,
      top: 'auto',
      width: '75%',  // 25% smaller
      maxWidth: '600px',
      transition: {
        type: 'spring',
        damping: 25,
        stiffness: 200,
      }
    }
  };

  const inputVariants = {
    centered: {
      scale: 1,
      transition: {
        type: 'spring',
        damping: 20,
        stiffness: 200,
      }
    },
    bottom: {
      scale: 0.95,
      transition: {
        type: 'spring',
        damping: 20,
        stiffness: 200,
      }
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="centered"
      animate={isEmpty ? 'centered' : 'bottom'}
      style={{ zIndex: 10 }}
    >
      <motion.div variants={inputVariants}>
        <Box
          bg={useSemanticToken('surface.elevated')}
          borderRadius="2xl"
          boxShadow={isFocused ? 'lg' : 'md'}
          border="1px solid"
          borderColor={isFocused ? getModeColor() : useSemanticToken('border.subtle')}
          transition="all 0.2s"
          _hover={{
            boxShadow: 'lg',
            borderColor: getModeColor()
          }}
        >
          {/* Perplexity Mode Indicator */}
          {perplexityMode && (
            <Box
              px={4}
              pt={3}
              pb={1}
            >
              <HStack spacing={2}>
                <Text fontSize="xs" color={getModeColor()}>
                  {getModeIcon()}
                </Text>
                <Text fontSize="xs" fontWeight="medium" color={getModeColor()}>
                  {perplexityMode.charAt(0).toUpperCase() + perplexityMode.slice(1)} Mode
                </Text>
              </HStack>
            </Box>
          )}

          {/* Input Area */}
          <HStack align="end" spacing={2} p={3}>
            {/* Attach Button */}
            {onAttach && (
              <IconButton
                icon={<FiPaperclip />}
                aria-label="Attach file"
                variant="ghost"
                size="sm"
                onClick={onAttach}
                isDisabled={disabled}
                bg={useSemanticToken('surface.elevated')}
                color={useSemanticToken('icon.primary')}
                _hover={{ bg: useSemanticToken('surface.hover') }}
              />
            )}

            {/* Textarea */}
            <Textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholder}
              minH="48px"
              maxH="200px"
              resize="none"
              border="none"
              _focus={{
                boxShadow: 'none',
                border: 'none'
              }}
              fontSize="md"
              disabled={disabled || isLoading}
              sx={{
                '&::-webkit-scrollbar': {
                  width: '4px',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: useSemanticToken('border.default'),
                  borderRadius: '2px',
                },
              }}
            />

            {/* Send Button */}
            <IconButton
              icon={<FiSend />}
              aria-label="Send message"
              colorScheme={value.trim() ? 'blue' : 'gray'}
              variant={value.trim() ? 'solid' : 'ghost'}
              size="sm"
              onClick={onSubmit}
              isDisabled={!value.trim() || isLoading || disabled}
              isLoading={isLoading}
              _hover={{
                transform: value.trim() ? 'translateY(-2px)' : 'none',
                boxShadow: value.trim() ? 'md' : 'none'
              }}
              transition="all 0.2s"
            />
          </HStack>

          {/* Hint Text (only when empty and centered) */}
          <AnimatePresence>
            {isEmpty && !value && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Box px={4} pb={3}>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')} textAlign="center">
                    Press <kbd style={{ padding: '2px 6px', background: '#f3f4f6', borderRadius: '4px', fontSize: '11px' }}>Enter</kbd> to send, <kbd style={{ padding: '2px 6px', background: '#f3f4f6', borderRadius: '4px', fontSize: '11px' }}>Shift + Enter</kbd> for new line
                  </Text>
                </Box>
              </motion.div>
            )}
          </AnimatePresence>
        </Box>

        {/* Empty State Suggestions (only when centered and empty) */}
        <AnimatePresence>
          {isEmpty && !value && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: 0.2 }}
            >
              <VStack spacing={2} mt={4}>
                <Text fontSize="sm" color={useSemanticToken('text.secondary')} fontWeight="medium">
                  Try asking about:
                </Text>
                <HStack spacing={2} flexWrap="wrap" justify="center">
                  {[
                    '2025 tech trends',
                    'Latest AI news',
                    'Code a React component',
                    'Explain quantum computing'
                  ].map((suggestion) => (
                    <Box
                      key={suggestion}
                      as="button"
                      px={3}
                      py={1.5}
                      bg={useSemanticToken('surface.base')}
                      borderRadius="full"
                      fontSize="xs"
                      color={useSemanticToken('text.primary')}
                      border="1px solid"
                      borderColor={useSemanticToken('border.default')}
                      onClick={() => onChange(suggestion)}
                      _hover={{
                        bg: useSemanticToken('surface.hover'),
                        borderColor: useSemanticToken('border.strong'),
                        transform: 'translateY(-1px)',
                      }}
                      transition="all 0.2s"
                    >
                      {suggestion}
                    </Box>
                  ))}
                </HStack>
              </VStack>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};
