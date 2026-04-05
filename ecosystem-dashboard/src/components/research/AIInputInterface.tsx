import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  VStack,
  HStack,
  Textarea,
  IconButton,
  Button,
  Text,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Badge,
  Tooltip,
  Icon,
  Spinner,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  PopoverArrow,
  Radio,
  RadioGroup,
  Stack,
} from '@chakra-ui/react';
import { FiX } from 'react-icons/fi';
import {
  BeakerIcon as BeakerIconOutline,
  PaperClipIcon,
  MicrophoneIcon,
  PlusIcon,
  PhotoIcon,
  GlobeAltIcon as GlobeAltIconOutline,
} from '@heroicons/react/24/outline';
import {
  BeakerIcon as BeakerIconSolid,
  GlobeAltIcon as GlobeAltIconSolid,
} from '@heroicons/react/24/solid';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useGeminiLive } from '../../hooks/useGeminiLive';
import AttachmentMenu from '../shared/AttachmentMenu';
import { PerplexityToolSelector, type PerplexityTool } from '../workspace/PerplexityToolSelector';

interface AIInputInterfaceProps {
  onSubmit: (query: string, mode: 'deep' | 'conversational', model: string, webSearch?: boolean) => void;
  isLoading?: boolean;
  defaultModel?: string;
  selectedProjectId?: number | null;
  onFileUpload?: (file: File) => void;
  projectName?: string;
  onViewFiles?: () => void;
  onModelChange?: (model: string) => void;
  visualInfographicEnabled?: boolean;
  pendingAttachments?: File[];
  onRemoveAttachment?: (index: number) => void;
  onWebSearchChange?: (enabled: boolean) => void; // Generic callback for web search state changes
  onUseGooseChange?: (enabled: boolean) => void; // Callback for Goose AI mode toggle
  useGoose?: boolean; // Current Goose mode state from parent
  agencyMode?: 'autonomous' | 'manual' | 'smart' | 'chat'; // Current agency level
  onAgencyModeChange?: (mode: 'autonomous' | 'manual' | 'smart' | 'chat') => void; // Callback for agency mode change
  selectedPerplexityTool?: PerplexityTool; // Current Perplexity tool selection
  onPerplexityToolSelect?: (tool: PerplexityTool) => void; // Callback for Perplexity tool selection
  onDeepResearchRecipe?: () => void; // Callback to load Deep Research Perplexity recipe
  onWebSearchRecipe?: () => void; // Callback to load Web Search Perplexity recipe
  isDeepResearchActive?: boolean; // External control for Deep Research mode - overrides local state
  compact?: boolean; // Compact mode for follow-up input bar
  perplexitySearchModel?: string; // Current Perplexity Sonar model (sonar, sonar-pro, sonar-reasoning, sonar-reasoning-pro)
  onPerplexitySearchModelChange?: (model: string) => void; // Callback when user picks a Sonar model via long-press
}

export default function AIInputInterface({
  onSubmit,
  isLoading = false,
  defaultModel = 'Claude Sonnet 4.5',
  selectedProjectId,
  onFileUpload,
  projectName,
  onViewFiles,
  onModelChange,
  visualInfographicEnabled = false,
  pendingAttachments = [],
  onRemoveAttachment,
  onWebSearchChange,
  onUseGooseChange,
  useGoose = false,
  agencyMode = 'autonomous',
  onAgencyModeChange,
  selectedPerplexityTool,
  onPerplexityToolSelect,
  onDeepResearchRecipe,
  onWebSearchRecipe,
  isDeepResearchActive = false,
  compact = false,
  perplexitySearchModel = 'sonar-pro',
  onPerplexitySearchModelChange,
}: AIInputInterfaceProps) {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'deep' | 'conversational'>('conversational');
  const [model, setModel] = useState(defaultModel);
  const [showDeepResearchBadge, setShowDeepResearchBadge] = useState(false);
  const [webSearch, setWebSearch] = useState(true);
  const [isAgencyMenuOpen, setIsAgencyMenuOpen] = useState(false);
  const [isSonarMenuOpen, setIsSonarMenuOpen] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const sonarLongPressTimer = useRef<NodeJS.Timeout | null>(null);

  // Computed: Effective mode - parent can override local state during Deep Research workflow
  const effectiveMode = isDeepResearchActive ? 'deep' : mode;

  // Sync visual badge when parent overrides mode
  useEffect(() => {
    if (isDeepResearchActive) {
      setShowDeepResearchBadge(true);
      setMode('deep');
    }
  }, [isDeepResearchActive]);

  // Removed fake "smartness" detection - no regex pattern matching pretending to be AI

  // Reload agencyMode from database when popup opens (only once per open)
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (isAgencyMenuOpen && !hasLoadedRef.current) {
      hasLoadedRef.current = true;

      const loadAgencyMode = async () => {
        try {
          const response = await fetch('/api/goose/settings/workspace-ai');
          if (response.ok) {
            const data = await response.json();
            if (data.agencyMode && data.agencyMode !== agencyMode && onAgencyModeChange) {
              onAgencyModeChange(data.agencyMode);
              console.log('[ResearchInput] 📥 Reloaded agencyMode from database:', data.agencyMode);
            }
          }
        } catch (error) {
          console.error('[ResearchInput] Error loading agencyMode:', error);
        }
      };

      loadAgencyMode();
    } else if (!isAgencyMenuOpen) {
      // Reset flag when popup closes
      hasLoadedRef.current = false;
    }
  }, [isAgencyMenuOpen, agencyMode, onAgencyModeChange]);

  // Gemini Live voice integration
  const { isConnected, isRecording, startLiveSession, stopLiveSession } = useGeminiLive({
    systemInstruction: 'You are a helpful research assistant. Provide clear, informative responses.',
    onTranscript: (text) => {
      // Append voice transcript to query
      setQuery(prev => prev ? `${prev} ${text}` : text);
    },
    onAudioResponse: (audioData) => {
      // Play audio response
      try {
        const audioBlob = new Blob([Uint8Array.from(atob(audioData), c => c.charCodeAt(0))], { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
      } catch (error) {
        console.error('Audio playback error:', error);
      }
    }
  });

  // Update model when defaultModel prop changes (from settings panel)
  useEffect(() => {
    if (defaultModel && defaultModel !== model) {
      setModel(defaultModel);
      onModelChange?.(defaultModel);
    }
  }, [defaultModel, model, onModelChange]);

  // Pre-compute ALL color values to avoid conditional hook calls - Enhanced for crisp, vibrant UI
  const bgColor = useSemanticToken('surface.elevated');
  const glassBg = useSemanticToken('glass.background');
  const borderColor = useSemanticToken('border.default');
  const hoverBorder = useSemanticToken('border.strong');
  const hoverBg = useSemanticToken('surface.hover');
  const textColor = useSemanticToken('text.primary');
  const secondaryTextColor = useSemanticToken('text.secondary');
  const activeIconColor = useSemanticToken('icon.primary');
  const badgeBg = useSemanticToken('interactive.surface');
  const badgeColor = useSemanticToken('text.primary');
  const buttonActiveBg = useSemanticToken('interactive.secondaryHover');
  const popoverBg = useSemanticToken('surface.elevated');
  const popoverBorder = useSemanticToken('border.default');
  const popoverArrowBg = useSemanticToken('surface.elevated');
  const agencyTextColor = useSemanticToken('text.secondary');
  const agencyBorderColor = useSemanticToken('border.default');
  const agencyActiveBg = useSemanticToken('status.successSubtle');
  const selectedBorderColor = useSemanticToken('status.success');
  const mutedColor = useSemanticToken('text.tertiary');

  // Glassmorphism shadows
  const boxShadow = useSemanticToken('glass.shadow');
  const hoverBoxShadow = useSemanticToken('glass.shadowHover');
  const focusBorderColor = useSemanticToken('interactive.primary');
  const focusBoxShadow = useSemanticToken('glass.shadowHover');
  const voiceButtonHoverBg = useSemanticToken('surface.hover');
  
  // Submit button colors (used conditionally in JSX)
  const interactivePrimary = useSemanticToken('interactive.primary');
  const interactivePrimaryHover = useSemanticToken('interactive.primaryHover');
  const textInverse = useSemanticToken('text.inverse');

  const handleSubmit = () => {
    if (query.trim()) {
      onSubmit(query, mode, model, webSearch);
      setQuery(''); // Clear input after sending
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <VStack spacing={2.5} w="full" maxW="3xl" mx="auto">
      {/* ChatGPT-style Project Indicator */}
      {selectedProjectId && projectName && onViewFiles && (
        <HStack
          w="full"
          spacing={2}
          px={1}
          py={1}
        >
          <HStack
            flex={1}
            spacing={2}
            px={3}
            py={2}
            bg={bgColor}
            borderRadius="xl"
            borderWidth="1px"
            borderColor={borderColor}
            cursor="pointer"
            onClick={onViewFiles}
            _hover={{
              bg: hoverBg,
              borderColor: useSemanticToken('interactive.primary')
            }}
            transition="all 0.2s"
          >
            <Box
              w={6}
              h={6}
              bg={useSemanticToken('surface.base')}
              borderRadius="md"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Text fontSize="xs">📁</Text>
            </Box>
            <Text fontSize="sm" fontWeight="500" color={textColor} noOfLines={1}>
              {projectName}
            </Text>
            <Badge
              fontSize="xs"
              bg={badgeBg}
              color={badgeColor}
              borderRadius="full"
              px={2}
            >
              RAG
            </Badge>
          </HStack>
        </HStack>
      )}

      {/* Input box with embedded tools - Clean glassmorphic with better contrast */}
      <Box
        w="full"
        bg={useSemanticToken('surface.elevated')}
        backdropFilter="blur(8px) saturate(120%)"
        borderRadius={compact ? '2xl' : '3xl'}
        px={compact ? 3 : 6}
        py={compact ? 1.5 : 3}
        border="1px solid"
        borderColor={useSemanticToken('border.subtle')}
        _hover={{
          bg: useSemanticToken('surface.hover'),
          borderColor: useSemanticToken('border.default'),
        }}
        _focusWithin={{
          bg: useSemanticToken('surface.base'),
          borderColor: useSemanticToken('interactive.primary'),
        }}
        transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
        sx={{
          WebkitBackdropFilter: 'blur(8px) saturate(120%)',
        }}
      >
        <VStack spacing={1.5} align="stretch">
          {/* Show badges if features are active */}
          {(showDeepResearchBadge && effectiveMode === 'deep') || webSearch || model === 'gpt-image-1' || (effectiveMode === 'deep' && visualInfographicEnabled) ? (
            <HStack mb={0.5} spacing={1.5}>
              {model === 'gpt-image-1' && effectiveMode !== 'deep' && (
                <Badge
                  fontSize="2xs"
                  display="flex"
                  alignItems="center"
                  gap={1}
                  colorScheme="purple"
                  variant="subtle"
                  px={2}
                  py={0.5}
                >
                  🎨 Standalone Image
                </Badge>
              )}
              {showDeepResearchBadge && effectiveMode === 'deep' && !visualInfographicEnabled && (
                <Badge
                  fontSize="2xs"
                  display="flex"
                  alignItems="center"
                  gap={1}
                  bg={badgeBg}
                  color={badgeColor}
                  px={2}
                  py={0.5}
                >
                  🧪 Deep Research
                </Badge>
              )}
              {effectiveMode === 'deep' && visualInfographicEnabled && (
                <Badge
                  fontSize="2xs"
                  display="flex"
                  alignItems="center"
                  gap={1}
                  colorScheme="purple"
                  variant="subtle"
                  px={2}
                  py={0.5}
                >
                  🧪🎨 Research + Images
                </Badge>
              )}
              {webSearch && (
                <Badge
                  fontSize="2xs"
                  display="flex"
                  alignItems="center"
                  gap={1}
                  bg={badgeBg}
                  color={badgeColor}
                  borderRadius="full"
                  px={2}
                  py={0.5}
                >
                  <GlobeAltIconOutline width={10} height={10} />
                  Web Search
                </Badge>
              )}
            </HStack>
          ) : null}

          {/* Attached Files Display */}
          {pendingAttachments.length > 0 && (
            <HStack spacing={1.5} flexWrap="wrap" pt={1}>
              {pendingAttachments.map((file, index) => (
                <Badge
                  key={index}
                  fontSize="2xs"
                  display="flex"
                  alignItems="center"
                  gap={1.5}
                  colorScheme="blue"
                  variant="subtle"
                  px={2}
                  py={0.5}
                  borderRadius="full"
                >
                  <Text>📎 {file.name}</Text>
                  {onRemoveAttachment && (
                    <IconButton
                      aria-label="Remove attachment"
                      icon={<Icon as={FiX} boxSize={2.5} />}
                      size="2xs"
                      variant="ghost"
                      colorScheme="blue"
                      onClick={() => onRemoveAttachment(index)}
                      minW="auto"
                      h="auto"
                      p={0}
                    />
                  )}
                </Badge>
              ))}
            </HStack>
          )}

          {/* Text input - multi-line textarea with Perplexity visual feedback */}
          <Box position="relative" flex={1}>
            <Textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                model === 'gpt-image-1' && effectiveMode !== 'deep'
                  ? "🎨 Describe your medical visualization (e.g., 'A detailed infographic showing CRP levels...')"
                  : effectiveMode === 'deep' && visualInfographicEnabled
                    ? "🧪🎨 Ask a research question - images will auto-generate from results"
                    : effectiveMode === 'deep'
                      ? "🧪 Ask a deep research question"
                      : "Ask anything"
              }
              size="md"
              variant="unstyled"
              fontSize="md"
              minH={compact ? '36px' : '80px'}
              maxH={compact ? '120px' : '300px'}
              resize="none"
              rows={compact ? 1 : 3}
              color={textColor}
              _placeholder={{ color: mutedColor }}
              isDisabled={isLoading}
              borderRadius="2xl"
              px={2}
              sx={{
                '&::-webkit-scrollbar': {
                  width: '4px',
                },
                '&::-webkit-scrollbar-track': {
                  background: 'transparent',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: mutedColor,
                  borderRadius: '2px',
                },
              }}
            />
          </Box>

          {/* Tools bar at bottom */}
          <HStack spacing={0.5} justify="space-between">
            {/* Left side - Tools menu */}
            <HStack spacing={0.5}>
              {/* ChatGPT-style Attachment Menu - Always available */}
              <AttachmentMenu
                onFileSelect={onFileUpload || (() => { })}
                disabled={isLoading}
                showDeepResearch={false}
                onDeepResearchClick={() => { }}
              />

              {/* Goose AI Mode Toggle with Long-Press Agency Menu */}
              <Popover
                isOpen={isAgencyMenuOpen}
                onClose={() => setIsAgencyMenuOpen(false)}
                placement="top"
                closeOnBlur={true}
              >
                <PopoverTrigger>
                  <Box>
                    <Tooltip
                      label={useGoose ? '📊 Atlas Analyst' : 'Web Search'}
                      hasArrow
                      bg={useSemanticToken('surface.elevated')}
                      color={useSemanticToken('text.primary')}
                      fontSize="xs"
                      py={1}
                      px={2}
                      borderRadius="md"
                      isDisabled={isAgencyMenuOpen}
                      openDelay={500}
                      closeDelay={100}
                    >
                      <Box
                        as="button"
                        onClick={() => {
                          const newGooseState = !useGoose;
                          onUseGooseChange?.(newGooseState);
                        }}
                        onMouseDown={() => {
                          if (useGoose) {
                            longPressTimer.current = setTimeout(() => {
                              setIsAgencyMenuOpen(true);
                            }, 500); // 500ms long press
                          }
                        }}
                        onMouseUp={() => {
                          if (longPressTimer.current) {
                            clearTimeout(longPressTimer.current);
                            longPressTimer.current = null;
                          }
                        }}
                        onMouseLeave={() => {
                          if (longPressTimer.current) {
                            clearTimeout(longPressTimer.current);
                            longPressTimer.current = null;
                          }
                        }}
                        onTouchStart={() => {
                          if (useGoose) {
                            longPressTimer.current = setTimeout(() => {
                              setIsAgencyMenuOpen(true);
                            }, 500);
                          }
                        }}
                        onTouchEnd={() => {
                          if (longPressTimer.current) {
                            clearTimeout(longPressTimer.current);
                            longPressTimer.current = null;
                          }
                        }}
                        disabled={isLoading}
                        cursor={isLoading ? 'not-allowed' : 'pointer'}
                        w="32px"
                        h="32px"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        borderRadius="md"
                        bg={useGoose ? buttonActiveBg : 'transparent'}
                        _hover={{ bg: buttonActiveBg }}
                        transition="all 0.2s"
                        opacity={isLoading ? 0.4 : 1}
                      >
                        <Text
                          fontSize="lg"
                          pointerEvents="none"
                          opacity={useGoose ? 1 : 0.4}
                          transition="opacity 0.2s"
                        >📊</Text>
                      </Box>
                    </Tooltip>
                  </Box>
                </PopoverTrigger>
                <PopoverContent w="320px" bg={popoverBg} borderColor={popoverBorder}>
                  <PopoverArrow bg={popoverArrowBg} />
                  <PopoverBody p={4}>
                    <VStack align="stretch" spacing={3}>
                      <Box>
                        <Text fontSize="sm" fontWeight="bold" mb={1}>Agency Level</Text>
                        <Text fontSize="xs" color={agencyTextColor}>Control how autonomously Goose can execute actions</Text>
                      </Box>
                      <RadioGroup value={agencyMode} onChange={(value) => {
                        onAgencyModeChange?.(value as any);
                        setIsAgencyMenuOpen(false);
                      }}>
                        <Stack spacing={2}>
                          <Box
                            p={3}
                            borderWidth="1px"
                            borderRadius="md"
                            borderColor={agencyMode === 'autonomous' ? useSemanticToken('status.success') : agencyBorderColor}
                            bg={agencyMode === 'autonomous' ? agencyActiveBg : 'transparent'}
                            cursor="pointer"
                            onClick={() => {
                              onAgencyModeChange?.('autonomous');
                              setIsAgencyMenuOpen(false);
                            }}
                          >
                            <HStack justify="space-between">
                              <HStack spacing={2}>
                                <Text fontSize="lg">⚡</Text>
                                <Box>
                                  <Text fontSize="sm" fontWeight="semibold">Autonomous</Text>
                                  <Text fontSize="xs" color={agencyTextColor}>Full file modification capabilities</Text>
                                </Box>
                              </HStack>
                              <Radio value="autonomous" />
                            </HStack>
                          </Box>
                          <Box
                            p={3}
                            borderWidth="1px"
                            borderRadius="md"
                            borderColor={agencyMode === 'manual' ? useSemanticToken('status.success') : agencyBorderColor}
                            bg={agencyMode === 'manual' ? agencyActiveBg : 'transparent'}
                            cursor="pointer"
                            onClick={() => {
                              onAgencyModeChange?.('manual');
                              setIsAgencyMenuOpen(false);
                            }}
                          >
                            <HStack justify="space-between">
                              <HStack spacing={2}>
                                <Text fontSize="lg">✓</Text>
                                <Box>
                                  <Text fontSize="sm" fontWeight="semibold">Manual</Text>
                                  <Text fontSize="xs" color={agencyTextColor}>All tools require approval</Text>
                                </Box>
                              </HStack>
                              <Radio value="manual" />
                            </HStack>
                          </Box>
                          <Box
                            p={3}
                            borderWidth="1px"
                            borderRadius="md"
                            borderColor={agencyMode === 'smart' ? useSemanticToken('status.success') : agencyBorderColor}
                            bg={agencyMode === 'smart' ? agencyActiveBg : 'transparent'}
                            cursor="pointer"
                            onClick={() => {
                              onAgencyModeChange?.('smart');
                              setIsAgencyMenuOpen(false);
                            }}
                          >
                            <HStack justify="space-between">
                              <HStack spacing={2}>
                                <Text fontSize="lg">⚙️</Text>
                                <Box>
                                  <Text fontSize="sm" fontWeight="semibold">Smart</Text>
                                  <Text fontSize="xs" color={agencyTextColor}>Intelligently determine which actions need approval</Text>
                                </Box>
                              </HStack>
                              <Radio value="smart" />
                            </HStack>
                          </Box>
                          <Box
                            p={3}
                            borderWidth="1px"
                            borderRadius="md"
                            borderColor={agencyMode === 'chat' ? useSemanticToken('status.success') : agencyBorderColor}
                            bg={agencyMode === 'chat' ? agencyActiveBg : 'transparent'}
                            cursor="pointer"
                            onClick={() => {
                              onAgencyModeChange?.('chat');
                              setIsAgencyMenuOpen(false);
                            }}
                          >
                            <HStack justify="space-between">
                              <HStack spacing={2}>
                                <Text fontSize="lg">💬</Text>
                                <Box>
                                  <Text fontSize="sm" fontWeight="semibold">Chat only</Text>
                                  <Text fontSize="xs" color={agencyTextColor}>No tool usage, just conversation</Text>
                                </Box>
                              </HStack>
                              <Radio value="chat" />
                            </HStack>
                          </Box>
                        </Stack>
                      </RadioGroup>
                    </VStack>
                  </PopoverBody>
                </PopoverContent>
              </Popover>

              {/* Perplexity Tool Selector - Only show when Goose is enabled */}
              {useGoose && (
                <>
                  <Box w="1px" h="24px" bg={borderColor} mx={1} />
                  <PerplexityToolSelector
                    selectedTool={selectedPerplexityTool || null}
                    onToolSelect={onPerplexityToolSelect}
                    isDisabled={isLoading}
                  />
                </>
              )}

              {/* Deep Research Toggle - Disabled when O1 Pro is selected (it's an extended reasoning model, not deep research) */}
              <Tooltip
                label={
                  isDeepResearchActive
                    ? 'Deep Research Active'
                    : effectiveMode === 'deep'
                      ? 'Deep Research Mode'
                      : 'Enable Deep Research'
                }
                hasArrow
                bg={useSemanticToken('surface.elevated')}
                color={useSemanticToken('text.primary')}
                fontSize="xs"
                py={1}
                px={2}
                borderRadius="md"
                openDelay={500}
                closeDelay={100}
              >
                <IconButton
                  aria-label="Deep research"
                  icon={
                    effectiveMode === 'deep' ? (
                      <BeakerIconSolid width={20} height={20} />
                    ) : (
                      <BeakerIconOutline width={20} height={20} />
                    )
                  }
                  size="sm"
                  variant="ghost"
                  color={effectiveMode === 'deep' ? activeIconColor : mutedColor}
                  bg={effectiveMode === 'deep' ? buttonActiveBg : 'transparent'}
                  onClick={() => {
                    // Prevent deep research when O1 Pro is selected
                    if (defaultModel === 'o1-pro') {
                      return;
                    }

                    // Prevent toggling off during active Deep Research workflow
                    if (isDeepResearchActive) {
                      return;
                    }

                    // Toggle mode state
                    const newMode = mode === 'deep' ? 'conversational' : 'deep';
                    setMode(newMode);
                    setShowDeepResearchBadge(newMode === 'deep');

                    // When enabling deep research, automatically enable web search
                    if (newMode === 'deep' && !webSearch) {
                      setWebSearch(true);
                      onWebSearchChange?.(true);
                    }
                    
                    // When disabling deep research, optionally disable web search
                    if (newMode === 'conversational' && webSearch) {
                      setWebSearch(false);
                      onWebSearchChange?.(false);
                    }
                  }}
                  _hover={{ bg: isDeepResearchActive ? buttonActiveBg : buttonActiveBg }}
                  _active={{ bg: buttonActiveBg }}
                  isDisabled={isLoading || defaultModel === 'o1-pro'}
                  cursor={isDeepResearchActive ? 'not-allowed' : 'pointer'}
                  opacity={defaultModel === 'o1-pro' ? 0.4 : 1}
                  transition="all 0.2s"
                  sx={{
                    '& svg': {
                      stroke: effectiveMode === 'deep' ? activeIconColor : mutedColor,
                      fill: effectiveMode === 'deep' ? activeIconColor : 'none',
                      transition: 'all 0.2s',
                    },
                  }}
                />
              </Tooltip>

              {/* Web Search Toggle with Long-Press Sonar Model Menu */}
              <Popover
                isOpen={isSonarMenuOpen}
                onClose={() => setIsSonarMenuOpen(false)}
                placement="top"
                closeOnBlur={true}
              >
                <PopoverTrigger>
                  <Box>
                    <Tooltip
                      label={
                        webSearch
                          ? `Web Search (${perplexitySearchModel}) — long-press to change model`
                          : 'Enable Web Search'
                      }
                      hasArrow
                      bg={useSemanticToken('surface.elevated')}
                      color={useSemanticToken('text.primary')}
                      fontSize="xs"
                      py={1}
                      px={2}
                      borderRadius="md"
                      isDisabled={isSonarMenuOpen}
                      openDelay={500}
                      closeDelay={100}
                    >
                      <Box
                        as="button"
                        onClick={() => {
                          if (effectiveMode === 'deep') return;
                          const newWebSearchState = !webSearch;
                          setWebSearch(newWebSearchState);
                          onWebSearchChange?.(newWebSearchState);
                          if (useGoose && onWebSearchRecipe && newWebSearchState) {
                            onWebSearchRecipe();
                          }
                        }}
                        onMouseDown={() => {
                          sonarLongPressTimer.current = setTimeout(() => {
                            setIsSonarMenuOpen(true);
                          }, 500);
                        }}
                        onMouseUp={() => {
                          if (sonarLongPressTimer.current) {
                            clearTimeout(sonarLongPressTimer.current);
                            sonarLongPressTimer.current = null;
                          }
                        }}
                        onMouseLeave={() => {
                          if (sonarLongPressTimer.current) {
                            clearTimeout(sonarLongPressTimer.current);
                            sonarLongPressTimer.current = null;
                          }
                        }}
                        onTouchStart={() => {
                          sonarLongPressTimer.current = setTimeout(() => {
                            setIsSonarMenuOpen(true);
                          }, 500);
                        }}
                        onTouchEnd={() => {
                          if (sonarLongPressTimer.current) {
                            clearTimeout(sonarLongPressTimer.current);
                            sonarLongPressTimer.current = null;
                          }
                        }}
                        disabled={isLoading}
                        cursor={effectiveMode === 'deep' ? 'not-allowed' : isLoading ? 'not-allowed' : 'pointer'}
                        w="32px"
                        h="32px"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        borderRadius="md"
                        bg={(effectiveMode === 'deep' || webSearch) ? buttonActiveBg : 'transparent'}
                        _hover={{ bg: buttonActiveBg }}
                        transition="all 0.2s"
                        opacity={isLoading ? 0.4 : effectiveMode === 'deep' ? 0.6 : 1}
                        color={(effectiveMode === 'deep' || webSearch) ? activeIconColor : mutedColor}
                        sx={{
                          '& svg': {
                            stroke: (effectiveMode === 'deep' || webSearch) ? activeIconColor : mutedColor,
                            fill: (effectiveMode === 'deep' || webSearch) ? activeIconColor : 'none',
                            transition: 'all 0.2s',
                          },
                        }}
                      >
                        {(effectiveMode === 'deep' || webSearch) ? (
                          <GlobeAltIconSolid width={20} height={20} />
                        ) : (
                          <GlobeAltIconOutline width={20} height={20} />
                        )}
                      </Box>
                    </Tooltip>
                  </Box>
                </PopoverTrigger>
                <PopoverContent w="320px" bg={popoverBg} borderColor={popoverBorder}>
                  <PopoverArrow bg={popoverArrowBg} />
                  <PopoverBody p={4}>
                    <VStack align="stretch" spacing={3}>
                      <Box>
                        <Text fontSize="sm" fontWeight="bold" mb={1}>Perplexity Sonar Model</Text>
                        <Text fontSize="xs" color={agencyTextColor}>Choose the Sonar model for web search queries</Text>
                      </Box>
                      <RadioGroup value={perplexitySearchModel} onChange={(value) => {
                        onPerplexitySearchModelChange?.(value);
                        setIsSonarMenuOpen(false);
                      }}>
                        <Stack spacing={2}>
                          {[
                            { value: 'sonar', emoji: '⚡', label: 'Sonar', desc: 'Fast lightweight search — $1/M tokens' },
                            { value: 'sonar-pro', emoji: '🔍', label: 'Sonar Pro', desc: 'Deep multi-step search — $3/M tokens' },
                            { value: 'sonar-reasoning', emoji: '🧠', label: 'Sonar Reasoning', desc: 'R1-based reasoning + search — $1/M tokens' },
                            { value: 'sonar-reasoning-pro', emoji: '💎', label: 'Sonar Reasoning Pro', desc: 'Advanced reasoning + search — $2/M tokens' },
                          ].map((m) => (
                            <Box
                              key={m.value}
                              p={3}
                              borderWidth="1px"
                              borderRadius="md"
                              borderColor={perplexitySearchModel === m.value ? selectedBorderColor : agencyBorderColor}
                              bg={perplexitySearchModel === m.value ? agencyActiveBg : 'transparent'}
                              cursor="pointer"
                              onClick={() => {
                                onPerplexitySearchModelChange?.(m.value);
                                setIsSonarMenuOpen(false);
                              }}
                            >
                              <HStack justify="space-between">
                                <HStack spacing={2}>
                                  <Text fontSize="lg">{m.emoji}</Text>
                                  <Box>
                                    <Text fontSize="sm" fontWeight="semibold">{m.label}</Text>
                                    <Text fontSize="xs" color={agencyTextColor}>{m.desc}</Text>
                                  </Box>
                                </HStack>
                                <Radio value={m.value} />
                              </HStack>
                            </Box>
                          ))}
                        </Stack>
                      </RadioGroup>
                    </VStack>
                  </PopoverBody>
                </PopoverContent>
              </Popover>
            </HStack>

            {/* Right side - Voice and submit */}
            <HStack spacing={0}>
              <Tooltip
                label={
                  isRecording
                    ? '🎙️ Voice Active - Click to stop'
                    : isConnected
                      ? '⏹️ Stop voice session'
                      : '🎤 Start voice conversation with Gemini Live'
                }
                openDelay={500}
                closeDelay={100}
              >
                <IconButton
                  aria-label="Voice input"
                  icon={
                    isRecording ? (
                      <Spinner size="sm" color="red.500" />
                    ) : (
                      <MicrophoneIcon width={20} height={20} />
                    )
                  }
                  size="sm"
                  variant="ghost"
                  color={isRecording ? useSemanticToken('status.error') : isConnected ? textColor : mutedColor}
                  onClick={() => {
                    if (isConnected || isRecording) {
                      stopLiveSession();
                    } else {
                      startLiveSession();
                    }
                  }}
                  _hover={{
                    bg: isRecording ? useSemanticToken('status.errorSubtle') : voiceButtonHoverBg,
                    color: isRecording ? useSemanticToken('status.error') : textColor
                  }}
                  animation={isRecording ? 'pulse 2s infinite' : undefined}
                />
              </Tooltip>

              <IconButton
                aria-label="Submit"
                icon={
                  <Box
                    as="span"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    w={5}
                    h={5}
                    borderRadius="sm"
                    bg={query.trim() ? interactivePrimary : 'transparent'}
                    color={query.trim() ? textInverse : mutedColor}
                    border="1px solid"
                    borderColor={query.trim() ? interactivePrimary : mutedColor}
                    fontSize="xs"
                    transition="all 0.2s"
                    _hover={{
                      bg: query.trim() ? interactivePrimaryHover : 'transparent',
                      borderColor: query.trim() ? interactivePrimaryHover : textColor
                    }}
                  >
                    ■
                  </Box>
                }
                size="sm"
                variant="unstyled"
                onClick={handleSubmit}
                isDisabled={!query.trim() || isLoading}
                isLoading={isLoading}
              />
            </HStack>
          </HStack>
        </VStack>
      </Box>

      {/* Helper text */}
      {effectiveMode === 'deep' ? (
        <Text fontSize="xs" color={mutedColor} textAlign="center">
          🔎 Deep Research: Comprehensive research with citations
        </Text>
      ) : webSearch ? (
        <Text fontSize="xs" color={mutedColor} textAlign="center">
          🌐 Web Search ({perplexitySearchModel}) — long-press 🌐 to change model
        </Text>
      ) : null}
    </VStack>
  );
}
