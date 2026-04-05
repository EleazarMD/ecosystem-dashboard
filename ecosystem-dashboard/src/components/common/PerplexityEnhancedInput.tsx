/**
 * Perplexity Enhanced Input Component
 * 
 * Reusable input component with intelligent Perplexity mode detection
 * and visual feedback. Can be used across all agents (workspace, page, dashboard).
 * 
 * Features:
 * - Automatic query analysis and mode detection
 * - Multi-cue visual feedback (text color, border glow, badge, helper text)
 * - Icon highlighting with pulse animation
 * - Time and cost estimates
 * - Manual mode override support
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Textarea,
  HStack,
  Text,
  Badge,
  IconButton,
  Tooltip,
} from '@chakra-ui/react';
import { FiZap, FiSearch, FiTarget, FiGlobe } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useSemanticToken } from '@/hooks/useSemanticToken';

export type PerplexityMode = 'fast' | 'research' | 'reason' | 'search' | null;

interface PerplexityEnhancedInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  isPerplexityEnabled?: boolean;
  onModeChange?: (mode: PerplexityMode) => void;
  manualMode?: PerplexityMode; // Allow manual override
  minHeight?: string;
  maxHeight?: string;
  isDisabled?: boolean;
}

interface ModeConfig {
  name: string;
  icon: React.ElementType;
  color: string;
  borderColor: string;
  glowColor: string;
  description: string;
  estimatedTime: string;
  estimatedCost: string;
  helperText: string;
}

const MODE_CONFIGS: Record<'fast' | 'research' | 'reason' | 'search', ModeConfig> = {
  fast: {
    name: 'FAST',
    icon: FiZap,
    color: '#3B82F6',
    borderColor: '#3B82F6',
    glowColor: 'rgba(59, 130, 246, 0.3)',
    description: 'Quick factual answers with citations',
    estimatedTime: '~2s',
    estimatedCost: '$0.001',
    helperText: '⚡ Getting quick answer...'
  },
  research: {
    name: 'RESEARCH',
    icon: FiSearch,
    color: '#8B5CF6',
    borderColor: '#8B5CF6',
    glowColor: 'rgba(139, 92, 246, 0.3)',
    description: 'Deep comprehensive analysis',
    estimatedTime: '~15s',
    estimatedCost: '$0.015',
    helperText: '🔬 Preparing deep research...'
  },
  reason: {
    name: 'REASON',
    icon: FiTarget,
    color: '#F59E0B',
    borderColor: '#F59E0B',
    glowColor: 'rgba(245, 158, 11, 0.3)',
    description: 'Systematic reasoning & decision support',
    estimatedTime: '~10s',
    estimatedCost: '$0.010',
    helperText: '💡 Analyzing options...'
  },
  search: {
    name: 'SEARCH',
    icon: FiGlobe,
    color: '#10B981',
    borderColor: '#10B981',
    glowColor: 'rgba(16, 185, 129, 0.3)',
    description: 'Raw search results for custom analysis',
    estimatedTime: '~3s',
    estimatedCost: '$0.002',
    helperText: '🌐 Gathering sources...'
  }
};

/**
 * Analyze query intent and detect appropriate Perplexity mode
 */
function analyzeQueryIntent(query: string): PerplexityMode {
  if (!query || query.trim().length < 10) return null;

  const lower = query.toLowerCase();

  // Research indicators
  if (/(research|analyze|comprehensive|deep dive|explain in detail|investigate|study|examine)/i.test(query)) {
    return 'research';
  }

  // Reasoning/decision indicators
  if (/(should i|compare|pros and cons|decide|which is better|evaluate|recommend|versus|vs\.|or\s)/i.test(query)) {
    return 'reason';
  }

  // Source gathering indicators
  if (/(find sources|search for|what do experts say|latest articles|recent news|gather information)/i.test(query)) {
    return 'search';
  }

  // Fast factual (default for simple queries)
  if (/(what is|who is|when did|where is|how many|define|explain|current|weather|temperature)/i.test(query)) {
    return 'fast';
  }

  // Default to fast for general queries
  return 'fast';
}

export const PerplexityEnhancedInput: React.FC<PerplexityEnhancedInputProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = 'Ask anything...',
  isPerplexityEnabled = false,
  onModeChange,
  manualMode,
  minHeight = '80px',
  maxHeight = '400px',
  isDisabled = false,
}) => {
  const [detectedMode, setDetectedMode] = useState<PerplexityMode>(null);
  const [activeMode, setActiveMode] = useState<PerplexityMode>(null);

  // Color mode values
  const bgColor = useSemanticToken('surface.elevated');
  const placeholderColor = useSemanticToken('text.tertiary');
  const disabledBg = useSemanticToken('surface.base');

  // Debounced query analysis
  useEffect(() => {
    if (!isPerplexityEnabled) {
      setDetectedMode(null);
      setActiveMode(null);
      return;
    }

    const timer = setTimeout(() => {
      const mode = analyzeQueryIntent(value);
      setDetectedMode(mode);

      // If no manual override, use detected mode
      if (!manualMode) {
        setActiveMode(mode);
        onModeChange?.(mode);
      }
    }, 300); // Wait 300ms after user stops typing

    return () => clearTimeout(timer);
  }, [value, isPerplexityEnabled, manualMode, onModeChange]);

  // Handle manual mode override
  useEffect(() => {
    if (manualMode) {
      setActiveMode(manualMode);
      onModeChange?.(manualMode);
    }
  }, [manualMode, onModeChange]);

  // Get current mode config
  const modeConfig = activeMode ? MODE_CONFIGS[activeMode] : null;

  // Handle key press (Enter to submit)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit?.();
    }
  };

  return (
    <Box position="relative" width="100%">
      {/* Main Input Area */}
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        minHeight={minHeight}
        maxHeight={maxHeight}
        resize="vertical"
        isDisabled={isDisabled}
        bg={isDisabled ? disabledBg : bgColor}
        borderWidth="2px"
        borderRadius="lg"
        fontSize="md"
        lineHeight="1.6"
        transition="all 0.3s ease"
        _placeholder={{
          color: placeholderColor
        }}
        // Dynamic styling based on detected mode
        style={modeConfig ? {
          color: modeConfig.color,
          borderColor: modeConfig.borderColor,
          boxShadow: `0 0 0 2px ${modeConfig.glowColor}`,
        } : {}}
        _focus={modeConfig ? {
          borderColor: modeConfig.borderColor,
          boxShadow: `0 0 0 3px ${modeConfig.glowColor}`,
        } : {}}
      />

      {/* Mode Badge (Top Right) */}
      <AnimatePresence>
        {modeConfig && isPerplexityEnabled && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute',
              top: '8px',
              right: '12px',
              pointerEvents: 'none'
            }}
          >
            <Badge
              colorScheme={
                activeMode === 'fast' ? 'blue' :
                  activeMode === 'research' ? 'purple' :
                    activeMode === 'reason' ? 'orange' :
                      'green'
              }
              px={2}
              py={1}
              borderRadius="md"
              fontSize="xs"
              fontWeight="bold"
            >
              {modeConfig.name}
            </Badge>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Helper Text with Time/Cost (Bottom) */}
      <AnimatePresence>
        {modeConfig && isPerplexityEnabled && value.length > 10 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <HStack
              mt={2}
              spacing={3}
              fontSize="xs"
              color={modeConfig.color}
              alignItems="center"
            >
              <Text fontWeight="medium">{modeConfig.helperText}</Text>
              <Text opacity={0.7}>•</Text>
              <Text opacity={0.7}>{modeConfig.estimatedTime}</Text>
              <Text opacity={0.7}>•</Text>
              <Text opacity={0.7}>{modeConfig.estimatedCost}</Text>
            </HStack>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
};

import { PerplexicaModeSelector, AIMode } from '../workspace/PerplexicaModeSelector';

/**
 * Mode Selector Icons (Optional companion component)
 * Use this below the input to allow manual mode selection
 */
interface ModeSelectorProps {
  selectedMode: PerplexityMode;
  onModeSelect: (mode: PerplexityMode) => void;
  detectedMode?: PerplexityMode;
}

export const PerplexityModeSelector: React.FC<ModeSelectorProps> = ({
  selectedMode,
  onModeSelect,
  detectedMode,
}) => {
  // Map PerplexityMode to AIMode
  const mapMode = (mode: PerplexityMode): AIMode => {
    switch (mode) {
      case 'fast': return 'quick';
      case 'research': return 'research';
      case 'reason': return 'context'; // Mapping reason to context for now
      case 'search': return 'search';
      default: return 'quick';
    }
  };

  // Map AIMode back to PerplexityMode
  const mapToPerplexityMode = (mode: AIMode): PerplexityMode => {
    switch (mode) {
      case 'quick': return 'fast';
      case 'research': return 'research';
      case 'context': return 'reason';
      case 'search': return 'search';
      case 'code': return 'reason'; // Default code to reason
      default: return 'fast';
    }
  };

  return (
    <PerplexicaModeSelector
      selectedMode={mapMode(selectedMode)}
      onModeChange={(mode) => onModeSelect(mapToPerplexityMode(mode))}
      compact
    />
  );
};
