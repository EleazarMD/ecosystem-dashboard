import React, { useEffect } from 'react';
import {
  VStack,
  HStack,
  Text,
  Select,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Switch,
  FormControl,
  FormLabel,
  Textarea,
  Box,
  Badge,
  Spinner,
  Button,
  ButtonGroup,
  Tooltip,
} from '@chakra-ui/react';
import { usePodcastStudio, PodcastStudioContext } from '@/contexts/PodcastStudioContext';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  getAllProfiles, 
  applyProfile, 
  getActiveProfileId, 
  setActiveProfile,
  type ChatSettingsProfile 
} from '@/lib/chat-settings-profiles';

interface ChatSettingsPanelProps {
  minCharsForPregeneration?: number;
  onPregenerationThresholdChange?: (value: number) => void;
  ttsVoice?: string;
  onTTSVoiceChange?: (voice: string) => void;
  ttsSpeed?: number;
  onTTSSpeedChange?: (speed: number) => void;
  ttsPitch?: number;
  onTTSPitchChange?: (pitch: number) => void;
}

export default function ChatSettingsPanel({ 
  minCharsForPregeneration = 200, 
  onPregenerationThresholdChange,
  ttsVoice = 'Puck',
  onTTSVoiceChange,
  ttsSpeed = 1.0,
  onTTSSpeedChange,
  ttsPitch = 0,
  onTTSPitchChange,
}: ChatSettingsPanelProps = {}) {
  // Use centralized context (coordinated with AI Gateway and Model Registry)
  // Check if context is available using useContext directly (safer than throwing error)
  const context = React.useContext(PodcastStudioContext);
  
  // Local state fallback when context is not available
  const [localModels, setLocalModels] = React.useState<any[]>([]);
  const [localIsLoading, setLocalIsLoading] = React.useState(true);
  const [localChatModel, setLocalChatModel] = React.useState('qwen3-32b');
  const [localAnalysisModel, setLocalAnalysisModel] = React.useState('qwen3-32b');
  const [localTemperature, setLocalTemperature] = React.useState(0.7);
  const [localMaxTokens, setLocalMaxTokens] = React.useState(2000);
  const [localSystemPrompt, setLocalSystemPrompt] = React.useState('You are a helpful podcast research assistant.');

  // Fetch models if context not available
  useEffect(() => {
    if (!context) {
      const fetchModels = async () => {
        try {
          const response = await fetch('/api/gateway/models');
          if (response.ok) {
            const data = await response.json();
            const models = data.models || [];
            setLocalModels(models);
            
            // Set default model to qwen3-32b if available
            const qwenModel = models.find((m: any) => m.id === 'qwen3-32b' || m.name?.includes('qwen3-32b'));
            if (qwenModel) {
              setLocalChatModel(qwenModel.id);
            }
          } else {
            // Fallback: provide hardcoded models list
            setLocalModels([
              { id: 'qwen3-32b', name: 'Qwen3 32B', provider: 'ollama' },
              { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'google' },
              { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'google' },
            ]);
          }
        } catch (error) {
          console.error('Failed to fetch models:', error);
          // Fallback: provide hardcoded models list
          setLocalModels([
            { id: 'qwen3-32b', name: 'Qwen3 32B', provider: 'ollama' },
            { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'google' },
            { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'google' },
          ]);
        } finally {
          setLocalIsLoading(false);
        }
      };
      fetchModels();
    }
  }, [context]);

  // Use context values if available, otherwise use local state
  const availableModels = context?.availableModels || localModels;
  const isLoadingModels = context?.isLoadingModels ?? localIsLoading;
  const chatModel = context?.chatModel || localChatModel;
  const setChatModel = context?.setChatModel || setLocalChatModel;
  const analysisModel = context?.analysisModel || localAnalysisModel;
  const setAnalysisModel = context?.setAnalysisModel || setLocalAnalysisModel;
  const temperature = context?.temperature ?? localTemperature;
  const setTemperature = context?.setTemperature || setLocalTemperature;
  const maxTokens = context?.maxTokens ?? localMaxTokens;
  const setMaxTokens = context?.setMaxTokens || setLocalMaxTokens;
  const systemPrompt = context?.systemPrompt || localSystemPrompt;
  const setSystemPrompt = context?.setSystemPrompt || setLocalSystemPrompt;
  // Context size tracking for auto-switch indicator
  const contextSizeChars = context?.contextSizeChars ?? 0;
  const isLargeContext = context?.isLargeContext ?? false;

  const [useSystemPrompt, setUseSystemPrompt] = React.useState(true);
  const [enableSourceAnalysis, setEnableSourceAnalysis] = React.useState(true);
  const [selectedProfileId, setSelectedProfileId] = React.useState<string | null>(getActiveProfileId());

  const bgColor = useSemanticToken('surface.base');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.tertiary');
  const borderColor = useSemanticToken('border.default');
  const cardBg = useSemanticToken('surface.elevated');
  const surfaceHover = useSemanticToken('surface.hover');

  const allProfiles = getAllProfiles();

  const handleProfileChange = (profileId: string) => {
    const profile = allProfiles.find(p => p.id === profileId);
    if (profile) {
      applyProfile(profile, {
        setChatModel,
        setAnalysisModel,
        setTemperature,
        setMaxTokens,
        setSystemPrompt,
      });
      setSelectedProfileId(profileId);
      setActiveProfile(profileId);
    }
  };

  return (
    <VStack spacing={0} align="stretch" h="full" overflowY="auto" bg={bgColor}>
      {/* Header */}
      <HStack justify="space-between" px={4} py={3}>
        <Text 
          fontSize="14px" 
          fontWeight="500" 
          color={textColor}
          fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
        >
          Chat Settings
        </Text>
        <Badge colorScheme="blue" fontSize="11px">
          AI Configuration
        </Badge>
      </HStack>

      {/* Settings Profiles */}
      <Box px={4} pb={4}>
        <Box
          p={4}
          bg={cardBg}
          borderRadius="xl"
          boxShadow="md"
          border="1px solid"
          borderColor={borderColor}
        >
          <VStack spacing={3} align="stretch">
            <HStack justify="space-between">
              <HStack spacing={2}>
                <Text fontSize="12px" fontWeight="600" color={textColor}>
                  ⚙️ Settings Profile
                </Text>
                <Badge colorScheme="purple" fontSize="10px">Quick Apply</Badge>
              </HStack>
            </HStack>

            <Select
              value={selectedProfileId || ''}
              onChange={(e) => handleProfileChange(e.target.value)}
              fontSize="13px"
              size="sm"
            >
              <option value="" disabled>Select a profile...</option>
              {allProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.icon} {profile.name}
                </option>
              ))}
            </Select>

            {selectedProfileId && (() => {
              const activeProfile = allProfiles.find(p => p.id === selectedProfileId);
              return activeProfile ? (
                <Text fontSize="10px" color={mutedColor} fontStyle="italic">
                  {activeProfile.description}
                </Text>
              ) : null;
            })()}
          </VStack>
        </Box>
      </Box>

      {/* LLM Selection */}
      <Box px={4} py={4}>
        <Box
          p={4}
          bg={cardBg}
          border="2px solid"
          borderColor="cyan.500"
          borderRadius="2xl"
          boxShadow="lg"
          position="relative"
          overflow="hidden"
          transition="all 0.3s ease"
          _hover={{
            transform: 'translateY(-2px)',
            boxShadow: '2xl',
          }}
          _before={{
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bg: surfaceHover,
            zIndex: 0,
          }}
        >
          <VStack align="stretch" spacing={3} position="relative" zIndex={1}>
            <HStack spacing={2}>
              <Box w="8px" h="8px" borderRadius="full" bg="cyan.400" />
              <Text 
                fontSize="13px" 
                fontWeight="600" 
                color={textColor}
                fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
              >
                🤖 Language Model
              </Text>
            </HStack>
            
            <Select
              value={chatModel}
              onChange={(e) => setChatModel(e.target.value)}
              size="sm"
              fontSize="13px"
              fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
              borderRadius="xl"
              bg={useSemanticToken('surface.elevated')}
              border="none"
              fontWeight="500"
              isDisabled={isLoadingModels}
              _hover={{ bg: surfaceHover }}
              _focus={{ 
                boxShadow: '0 0 0 3px rgba(66, 153, 225, 0.3)',
                bg: useSemanticToken('surface.elevated'),
              }}
            >
              {isLoadingModels ? (
                <option>Loading models...</option>
              ) : availableModels.length === 0 ? (
                <option>No models available</option>
              ) : (
                <>
                  {availableModels.filter(m => m.provider === 'ollama').length > 0 && (
                    <optgroup label="🔓 Open Source (Ollama - Local)">
                      {availableModels
                        .filter(m => m.provider === 'ollama')
                        .map(m => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                    </optgroup>
                  )}
                  
                  {availableModels.filter(m => m.provider === 'openai').length > 0 && (
                    <optgroup label="🔒 OpenAI (API Key Required)">
                      {availableModels
                        .filter(m => m.provider === 'openai')
                        .map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </optgroup>
                  )}
                  
                  {availableModels.filter(m => m.provider === 'anthropic').length > 0 && (
                    <optgroup label="🔒 Anthropic (API Key Required)">
                      {availableModels
                        .filter(m => m.provider === 'anthropic')
                        .map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </optgroup>
                  )}
                  
                  {availableModels.filter(m => m.provider === 'google').length > 0 && (
                    <optgroup label="🔒 Google Gemini (API Key Required)">
                      {availableModels
                        .filter(m => m.provider === 'google')
                        .map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </optgroup>
                  )}
                </>
              )}
            </Select>
            
            {/* Context size indicator */}
            {contextSizeChars > 0 && (
              <Text fontSize="10px" color={isLargeContext ? 'orange.500' : mutedColor} fontWeight="500">
                📊 Context: {Math.round(contextSizeChars / 1000)}K chars
                {isLargeContext && ' (exceeds Qwen limit)'}
              </Text>
            )}
            
            <HStack spacing={2} flexWrap="wrap">
              <Badge fontSize="10px" px={2.5} py={0.5} borderRadius="full" colorScheme="cyan" fontWeight="600">
                AI Powered
              </Badge>
              {/* Auto-switch indicator when context exceeds Qwen limit */}
              {isLargeContext && chatModel.includes('qwen') ? (
                <Tooltip 
                  label={`Context size (${Math.round(contextSizeChars / 1000)}K chars) exceeds Qwen's 32K token limit. Auto-switching to Gemini 2.0 Flash (1M token context) for this request.`}
                  placement="top"
                >
                  <Badge fontSize="10px" px={2.5} py={0.5} borderRadius="full" colorScheme="orange" fontWeight="600">
                    ⚡ Gemini Flash Active
                  </Badge>
                </Tooltip>
              ) : (
                <Badge fontSize="10px" px={2.5} py={0.5} borderRadius="full" colorScheme="blue" fontWeight="600">
                  Research Mode
                </Badge>
              )}
            </HStack>
          </VStack>
        </Box>
      </Box>

      {/* Source Material Analysis Model */}
      <Box px={4} py={4}>
        <Box
          p={4}
          bg={cardBg}
          border="2px solid"
          borderColor="green.500"
          borderRadius="2xl"
          boxShadow="lg"
          position="relative"
          overflow="hidden"
          transition="all 0.3s ease"
          _hover={{
            transform: 'translateY(-2px)',
            boxShadow: '2xl',
          }}
          _before={{
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bg: surfaceHover,
            zIndex: 0,
          }}
        >
          <VStack align="stretch" spacing={3} position="relative" zIndex={1}>
            <HStack justify="space-between">
              <HStack spacing={2}>
                <Box w="8px" h="8px" borderRadius="full" bg="green.400" />
                <Text 
                  fontSize="13px" 
                  fontWeight="600" 
                  color={textColor}
                  fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
                >
                  📄 Source Analysis Model
                </Text>
              </HStack>
              <Switch
                size="sm"
                isChecked={enableSourceAnalysis}
                onChange={(e) => setEnableSourceAnalysis(e.target.checked)}
                colorScheme="green"
              />
            </HStack>
            
            <Text fontSize="11px" color={mutedColor}>
              AI model used to analyze PDFs, documents, and extract insights from research materials
            </Text>
            
            <Select
              value={analysisModel}
              onChange={(e) => setAnalysisModel(e.target.value)}
              size="sm"
              fontSize="13px"
              fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
              borderRadius="xl"
              bg={useSemanticToken('surface.elevated')}
              border="none"
              fontWeight="500"
              isDisabled={!enableSourceAnalysis || isLoadingModels}
              _hover={{ bg: surfaceHover }}
              _focus={{ 
                boxShadow: '0 0 0 3px rgba(72, 187, 120, 0.3)',
                bg: useSemanticToken('surface.elevated'),
              }}
            >
              {isLoadingModels ? (
                <option>Loading models...</option>
              ) : availableModels.length === 0 ? (
                <option>No models available</option>
              ) : (
                <>
                  {availableModels.filter(m => m.provider === 'ollama').length > 0 && (
                    <optgroup label="🔓 Open Source (Ollama - Recommended for Privacy)">
                      {availableModels
                        .filter(m => m.provider === 'ollama')
                        .map(m => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                    </optgroup>
                  )}
                  
                  {availableModels.filter(m => m.provider === 'openai').length > 0 && (
                    <optgroup label="🔒 OpenAI (Premium Quality)">
                      {availableModels
                        .filter(m => m.provider === 'openai')
                        .map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </optgroup>
                  )}
                  
                  {availableModels.filter(m => m.provider === 'anthropic').length > 0 && (
                    <optgroup label="🔒 Anthropic (Premium Quality)">
                      {availableModels
                        .filter(m => m.provider === 'anthropic')
                        .map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </optgroup>
                  )}
                  
                  {availableModels.filter(m => m.provider === 'google').length > 0 && (
                    <optgroup label="🔒 Google Gemini (Multimodal & Document Analysis)">
                      {availableModels
                        .filter(m => m.provider === 'google')
                        .map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </optgroup>
                  )}
                </>
              )}
            </Select>
            
            <HStack spacing={2}>
              <Badge fontSize="10px" px={2.5} py={0.5} borderRadius="full" colorScheme="green" fontWeight="600">
                Document Analysis
              </Badge>
              <Badge fontSize="10px" px={2.5} py={0.5} borderRadius="full" colorScheme="purple" fontWeight="600">
                Batch Processing
              </Badge>
            </HStack>
          </VStack>
        </Box>
      </Box>

      {/* Temperature */}
      <Box px={4} pb={4}>
        <Box
          p={4}
          bg={cardBg}
          borderRadius="xl"
          boxShadow="md"
          border="1px solid"
          borderColor={useSemanticToken('border.default')}
          transition="all 0.2s ease"
          _hover={{ boxShadow: 'lg' }}
        >
          <FormControl>
          <FormLabel 
            fontSize="12px" 
            color={mutedColor}
            mb={3}
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
          >
            🌡️ Temperature: {temperature}
          </FormLabel>

          {/* Quick Presets */}
          <VStack spacing={2} align="stretch" mb={3}>
            <ButtonGroup size="sm" spacing={2} w="full">
              <Tooltip label="Factual, consistent responses - ideal for news & research" placement="top">
                <Button 
                  flex="1" 
                  variant={temperature === 0.3 ? "solid" : "outline"}
                  colorScheme={temperature === 0.3 ? "blue" : "gray"}
                  onClick={() => setTemperature(0.3)}
                  fontSize="11px"
                >
                  🎯 Factual
                </Button>
              </Tooltip>
              <Tooltip label="Balanced creativity and accuracy - best for most podcasts" placement="top">
                <Button 
                  flex="1" 
                  variant={temperature === 0.7 ? "solid" : "outline"}
                  colorScheme={temperature === 0.7 ? "blue" : "gray"}
                  onClick={() => setTemperature(0.7)}
                  fontSize="11px"
                >
                  💬 Balanced
                </Button>
              </Tooltip>
              <Tooltip label="Highly creative and varied - great for storytelling" placement="top">
                <Button 
                  flex="1" 
                  variant={temperature === 0.9 ? "solid" : "outline"}
                  colorScheme={temperature === 0.9 ? "blue" : "gray"}
                  onClick={() => setTemperature(0.9)}
                  fontSize="11px"
                >
                  🎨 Creative
                </Button>
              </Tooltip>
            </ButtonGroup>
            <Text fontSize="10px" color={mutedColor} textAlign="center" fontStyle="italic">
              {temperature === 0.3 && "Precise, factual responses"}
              {temperature === 0.7 && "Natural conversation balance"}
              {temperature === 0.9 && "Imaginative storytelling mode"}
              {temperature !== 0.3 && temperature !== 0.7 && temperature !== 0.9 && "Custom temperature setting"}
            </Text>
          </VStack>

          {/* Fine-tune Slider */}
          <Slider
            value={temperature}
            onChange={setTemperature}
            min={0}
            max={2}
            step={0.1}
          >
            <SliderTrack bg={borderColor}>
              <SliderFilledTrack bg="blue.400" />
            </SliderTrack>
            <SliderThumb boxSize={4} />
          </Slider>
          <HStack justify="space-between" mt={1}>
            <Text 
              fontSize="11px" 
              color={mutedColor}
              fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
            >
              Precise
            </Text>
            <Text 
              fontSize="11px" 
              color={mutedColor}
              fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
            >
              Creative
            </Text>
          </HStack>
          </FormControl>
        </Box>
      </Box>

      {/* Max Tokens */}
      <Box px={4} pb={4}>
        <Box
          p={4}
          bg={cardBg}
          borderRadius="xl"
          boxShadow="md"
          border="1px solid"
          borderColor={useSemanticToken('border.default')}
          transition="all 0.2s ease"
          _hover={{ boxShadow: 'lg' }}
        >
          <FormControl>
          <FormLabel 
            fontSize="12px" 
            color={mutedColor}
            mb={2}
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
          >
            📏 Max Tokens: {maxTokens}
          </FormLabel>
          <Slider
            value={maxTokens}
            onChange={setMaxTokens}
            min={500}
            max={4000}
            step={100}
          >
            <SliderTrack bg={borderColor}>
              <SliderFilledTrack bg="blue.400" />
            </SliderTrack>
            <SliderThumb boxSize={4} />
          </Slider>
          <HStack justify="space-between" mt={1}>
            <Text 
              fontSize="11px" 
              color={mutedColor}
              fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
            >
              500
            </Text>
            <Text 
              fontSize="11px" 
              color={mutedColor}
              fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
            >
              4000
            </Text>
          </HStack>
          </FormControl>
        </Box>
      </Box>

      {/* System Prompt */}
      <Box px={4} pb={4}>
        <Box
          p={4}
          bg={cardBg}
          borderRadius="xl"
          boxShadow="md"
          border="1px solid"
          borderColor={useSemanticToken('border.default')}
          transition="all 0.2s ease"
          _hover={{ boxShadow: 'lg' }}
        >
          <FormControl>
          <HStack justify="space-between" mb={2}>
            <FormLabel 
              fontSize="12px" 
              color={mutedColor} 
              mb={0}
              fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
            >
              System Prompt
            </FormLabel>
            <Switch
              size="sm"
              isChecked={useSystemPrompt}
              onChange={(e) => setUseSystemPrompt(e.target.checked)}
            />
          </HStack>
          <Textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Enter system prompt..."
            size="sm"
            rows={4}
            isDisabled={!useSystemPrompt}
            fontSize="13px"
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
            borderRadius="xl"
            _focus={{ 
              boxShadow: '0 0 0 3px rgba(66, 153, 225, 0.3)',
            }}
          />
          </FormControl>
        </Box>
      </Box>

      {/* Text-to-Speech Settings */}
      <Box px={4} pb={4}>
        <Box
          p={4}
          bg={cardBg}
          border="2px solid"
          borderColor="orange.500"
          borderRadius="2xl"
          boxShadow="lg"
          position="relative"
          overflow="hidden"
          transition="all 0.3s ease"
          _hover={{
            transform: 'translateY(-2px)',
            boxShadow: '2xl',
          }}
          _before={{
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bg: surfaceHover,
            zIndex: 0,
          }}
        >
          <VStack align="stretch" spacing={3} position="relative" zIndex={1}>
            <HStack spacing={2}>
              <Box w="8px" h="8px" borderRadius="full" bg="orange.400" />
              <Text 
                fontSize="13px" 
                fontWeight="600" 
                color={textColor}
                fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
              >
                🔊 Read Aloud Voice
              </Text>
            </HStack>
            
            <Text fontSize="11px" color={mutedColor}>
              Choose voice for Read Aloud feature (🔊 button in chat)
            </Text>
            
            <Select
              value={ttsVoice}
              onChange={(e) => onTTSVoiceChange?.(e.target.value)}
              size="sm"
              fontSize="13px"
              fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
              borderRadius="8px"
              bg={useSemanticToken('surface.elevated')}
              sx={{
                bg: useSemanticToken('surface.elevated'),
              }}
            >
              <optgroup label="🔓 Qwen TTS (Local - Free & Private)">
                <option value="ryan">Ryan (Default - Natural)</option>
                <option value="sarah">Sarah (Warm)</option>
                <option value="alex">Alex (Professional)</option>
                <option value="emma">Emma (Friendly)</option>
                <option value="david">David (Deep)</option>
                <option value="sophia">Sophia (Clear)</option>
              </optgroup>
            </Select>

            {/* Speed Control */}
            <FormControl>
              <HStack justify="space-between" mb={1}>
                <FormLabel 
                  fontSize="11px" 
                  color={mutedColor} 
                  mb={0}
                  fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
                >
                  Speed
                </FormLabel>
                <Text fontSize="11px" color={mutedColor}>{ttsSpeed.toFixed(1)}x</Text>
              </HStack>
              <Slider 
                value={ttsSpeed}
                onChange={(val) => onTTSSpeedChange?.(val)}
                min={0.5} 
                max={2.0} 
                step={0.1}
                colorScheme="orange"
              >
                <SliderTrack bg={useSemanticToken('border.default')}>
                  <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb boxSize={4} />
              </Slider>
              <HStack justify="space-between" mt={1}>
                <Text fontSize="10px" color={mutedColor}>0.5x Slow</Text>
                <Text fontSize="10px" color={mutedColor}>2.0x Fast</Text>
              </HStack>
            </FormControl>

            {/* Pitch Control */}
            <FormControl>
              <HStack justify="space-between" mb={1}>
                <FormLabel 
                  fontSize="11px" 
                  color={mutedColor} 
                  mb={0}
                  fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
                >
                  Pitch
                </FormLabel>
                <Text fontSize="11px" color={mutedColor}>{ttsPitch > 0 ? '+' : ''}{ttsPitch}</Text>
              </HStack>
              <Slider 
                value={ttsPitch}
                onChange={(val) => onTTSPitchChange?.(val)}
                min={-10} 
                max={10} 
                step={1}
                colorScheme="orange"
              >
                <SliderTrack bg={useSemanticToken('border.default')}>
                  <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb boxSize={4} />
              </Slider>
              <HStack justify="space-between" mt={1}>
                <Text fontSize="10px" color={mutedColor}>-10 Lower</Text>
                <Text fontSize="10px" color={mutedColor}>+10 Higher</Text>
              </HStack>
            </FormControl>

            {/* Audio Pregeneration Threshold */}
            <Box 
              pt={3} 
              mt={3} 
              borderTop="1px solid" 
              borderColor={useSemanticToken('border.default')}
            >
              <FormControl>
                <HStack justify="space-between" mb={1}>
                  <FormLabel 
                    fontSize="11px" 
                    color={mutedColor} 
                    mb={0}
                    fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
                  >
                    🎤 Auto-Generate Audio For
                  </FormLabel>
                  <Badge colorScheme="cyan" fontSize="9px" px={2} py={0.5}>
                    {minCharsForPregeneration} chars
                  </Badge>
                </HStack>
                <Text fontSize="10px" color={mutedColor} mb={2}>
                  Responses longer than this will have audio pre-generated for instant playback
                </Text>
                <Slider 
                  value={minCharsForPregeneration}
                  onChange={onPregenerationThresholdChange}
                  min={0} 
                  max={1000} 
                  step={50}
                  colorScheme="orange"
                >
                  <SliderTrack bg={useSemanticToken('border.default')}>
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb boxSize={4} />
                </Slider>
                <HStack justify="space-between" mt={1}>
                  <Text fontSize="10px" color={mutedColor}>
                    {minCharsForPregeneration === 0 ? 'Always' : 'Never'}
                  </Text>
                  <Text fontSize="10px" color={mutedColor}>
                    {minCharsForPregeneration < 200 ? 'Short' : minCharsForPregeneration < 500 ? 'Medium' : 'Long Only'}
                  </Text>
                </HStack>
              </FormControl>
            </Box>
          </VStack>
        </Box>
      </Box>

      {/* Info Box */}
      <Box
        mx={4}
        mb={4}
        p={4}
        bg={cardBg}
        borderRadius="xl"
        borderLeft="4px solid"
        borderLeftColor="blue.400"
      >
        <VStack align="stretch" spacing={2}>
          <Text 
            fontSize="12px" 
            color={textColor}
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
            fontWeight="600"
          >
            💡 Settings Guide
          </Text>
          <Text fontSize="11px" color={mutedColor}>
            <strong>Chat Model:</strong> Handles conversational responses to your questions
          </Text>
          <Text fontSize="11px" color={mutedColor}>
            <strong>Analysis Model:</strong> Extracts insights from PDFs and documents
          </Text>
          <Text fontSize="11px" color={mutedColor}>
            <strong>Read Aloud:</strong> Click 🔊 on messages to hear them with Gemini TTS
          </Text>
        </VStack>
      </Box>
    </VStack>
  );
}
