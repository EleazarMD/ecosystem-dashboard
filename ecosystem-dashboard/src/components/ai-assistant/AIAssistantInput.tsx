import React, { useState } from 'react';
import {
  Box,
  HStack,
  VStack,
  Textarea,
  IconButton,
  Tooltip,
  Flex,
  Select,
  Badge,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Text,
  Divider,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  PopoverArrow,
  PopoverCloseButton,
  Switch,
  Wrap,
  WrapItem,
} from '@chakra-ui/react';
import {
  MicrophoneIcon,
  PaperAirplaneIcon,
  StopIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { MicrophoneIcon as MicrophoneSolid } from '@heroicons/react/24/solid';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface AIAssistantInputProps {
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  sendMessage: (message: string) => void;
  isVoiceListening: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  isAudioMuted: boolean;
  setIsAudioMuted: (muted: boolean) => void;
  isMicrophoneMuted?: boolean;
  onToggleMicrophoneMute?: () => void;
  isConversationActive: boolean;
  setIsConversationActive: (active: boolean) => void;
  isVoiceConnected?: boolean;
  audioLevel?: number;
  visualizerControls?: VisualizerControls;
  onUpdateVisualizerControls?: (patch: Partial<VisualizerControls>) => void;
  voiceEnabled?: boolean;
  setVoiceEnabled?: (enabled: boolean) => void;
  voiceError?: any;
  onStartListening?: () => void;
  onStopListening?: () => void;
  showVoiceVisualizer?: boolean;
  setShowVoiceVisualizer?: (show: boolean) => void;
}

// Controls mapped 1:1 to AudioVisualizerBlob controlsOverride
type ShapeType = 'icosahedron' | 'torus' | 'torusKnot' | 'octahedron' | 'dodecahedron' | 'tetrahedron' | 'sphere' | 'cube' | 'cone' | 'cylinder' | 'perplexityOrb';

interface VisualizerControls {
  color: { r: number; g: number; b: number };
  size: number;
  dynamism: number;
  roughness: number;
  glowIntensity: number;
  animationSpeed: number;
  hueMix?: number;
  shape?: ShapeType;
  wireframe?: boolean;
}

// One-click visualizer presets with dramatic visual differences
const VISUALIZER_PRESETS: Record<string, VisualizerControls> = {
  // Aurora: bright cyan-blue with intense glow and smooth movement
  Aurora: {
    color: { r: 0.1, g: 0.8, b: 1.0 },
    size: 4.0,
    dynamism: 3.0,
    roughness: 1.5,
    glowIntensity: 1.8,
    animationSpeed: 0.8,
    hueMix: 0.4,
  },
  // NeoMint: vibrant green with high energy
  NeoMint: {
    color: { r: 0.2, g: 1.0, b: 0.6 },
    size: 3.5,
    dynamism: 2.5,
    roughness: 2.2,
    glowIntensity: 1.4,
    animationSpeed: 1.1,
    hueMix: 0.3,
  },
  // Deep Ocean: dark blue with subtle glow and slow movement
  DeepOcean: {
    color: { r: 0.05, g: 0.3, b: 0.9 },
    size: 3.8,
    dynamism: 1.8,
    roughness: 4.0,
    glowIntensity: 0.8,
    animationSpeed: 0.5,
    hueMix: 0.1,
  },
  // Sunset: warm orange/red with high glow
  Sunset: {
    color: { r: 1.0, g: 0.4, b: 0.1 },
    size: 3.6,
    dynamism: 2.8,
    roughness: 2.0,
    glowIntensity: 1.6,
    animationSpeed: 1.4,
    hueMix: 0.5,
  },
  // Cyberpunk: electric magenta with maximum glow and chaotic movement
  Cyberpunk: {
    color: { r: 1.0, g: 0.1, b: 0.8 },
    size: 3.2,
    dynamism: 4.0,
    roughness: 3.5,
    glowIntensity: 2.2,
    animationSpeed: 1.8,
    hueMix: 0.6,
  },
};

export const AIAssistantInput: React.FC<AIAssistantInputProps> = ({
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
  isConversationActive,
  setIsConversationActive,
  isVoiceConnected = false,
  audioLevel = 0,
  visualizerControls,
  onUpdateVisualizerControls,
  // Additional props from ModernAIAssistant
  voiceEnabled = false,
  setVoiceEnabled,
  voiceError,
  onStartListening,
  onStopListening,
  showVoiceVisualizer = false,
  setShowVoiceVisualizer,
}) => {
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('alloy');
  const [speechRate, setSpeechRate] = useState(1.0);
  const [micSensitivity, setMicSensitivity] = useState(0.5);

  const surfaceBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const focusBorderColor = 'blue.500';
  const placeholderColor = useSemanticToken('text.tertiary');
  const controlsBg = useSemanticToken('surface.base');
  const inputBg = useSemanticToken('surface.elevated');
  const menuBg = useSemanticToken('surface.elevated');
  const visualizerBg = useSemanticToken('border.default');

  const handleSubmit = () => {
    if (!input.trim()) return;
    sendMessage(input);
  };

  const onVoiceToggle = () => {
    if (isVoiceListening && onStopListening) {
      onStopListening();
    } else if (!isVoiceListening && onStartListening) {
      onStartListening();
    }
  };

  const voiceOptions = [
    { value: 'alloy', label: 'Alloy (Neutral)' },
    { value: 'echo', label: 'Echo (Male)' },
    { value: 'fable', label: 'Fable (British)' },
    { value: 'onyx', label: 'Onyx (Deep)' },
    { value: 'nova', label: 'Nova (Young)' },
    { value: 'shimmer', label: 'Shimmer (Soft)' },
  ];

  return (
    <Box p={5} bg={surfaceBg}>
      <VStack spacing={3} align="stretch">

        {/* Main Input */}
        <form onSubmit={handleSubmit}>
        <Flex
          align="center"
          bg={inputBg}
          border="1px solid"
          borderColor={borderColor}
          borderRadius="2xl"
          p={3}
          pl={4}
          transition="all 0.2s ease-in-out"
          _focusWithin={{
            borderColor: focusBorderColor,
            boxShadow: `0 0 0 1px ${focusBorderColor}`,
          }}
        >
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything about your AI Homelab..."
            variant="unstyled"
            size="md"
            resize="none"
            minH="80px"
            maxH="200px"
            rows={3}
            _placeholder={{ color: placeholderColor }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            sx={{
              '::-webkit-scrollbar': { display: 'none' },
              msOverflowStyle: 'none',
              scrollbarWidth: 'none',
            }}
          />

          <HStack spacing={2} ml={2}>
            {/* Advanced Controls Toggle */}
            {(isVoiceConnected || isConversationActive) && (
              <Popover isOpen={showAdvancedControls} onClose={() => setShowAdvancedControls(false)} placement="bottom-end" closeOnBlur>
                <PopoverTrigger>
                  <Tooltip label="Voice & Audio Settings">
                    <IconButton
                      aria-label="Advanced controls"
                      icon={<Cog6ToothIcon width={16} />}
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAdvancedControls(!showAdvancedControls)}
                      color={showAdvancedControls ? 'blue.500' : 'gray.500'}
                    />
                  </Tooltip>
                </PopoverTrigger>
                <PopoverContent w="420px" maxW="90vw" borderRadius="xl" boxShadow="lg" bg={controlsBg} borderColor={borderColor}>
                  <PopoverArrow bg={controlsBg} />
                  <PopoverCloseButton />
                  <PopoverBody p={4}>
                    <HStack spacing={6} align="flex-start">
                      {/* Left Column: Voice Settings */}
                      <VStack spacing={4} align="stretch" flex={1}>
                        <Text fontSize="md" fontWeight="semibold">Voice</Text>
                        <Box>
                          <Text fontSize="sm" mb={2}>Model</Text>
                          <Select size="sm" value={selectedVoice} onChange={(e) => setSelectedVoice(e.target.value)} bg={menuBg} borderColor={borderColor} borderRadius="md">
                            {voiceOptions.map(v => (
                              <option key={v.value} value={v.value}>{v.label}</option>
                            ))}
                          </Select>
                        </Box>
                        <Box>
                          <HStack justify="space-between">
                            <Text fontSize="sm">Rate</Text>
                            <Text fontSize="sm" color={useSemanticToken('text.secondary')}>{speechRate.toFixed(1)}x</Text>
                          </HStack>
                          <Slider value={speechRate} onChange={setSpeechRate} min={0.6} max={1.6} step={0.1} colorScheme="blue" mt={1}>
                            <SliderTrack h="6px" borderRadius="full"><SliderFilledTrack /></SliderTrack>
                            <SliderThumb boxSize={4} />
                          </Slider>
                        </Box>
                        
                        {isVoiceListening && (
                          <Box pt={2}>
                            <Text fontSize="sm" mb={1}>Mic Level</Text>
                            <Box bg={visualizerBg} borderRadius="md" h="8px" overflow="hidden">
                              <Box
                                bg="green.400"
                                h="100%"
                                width={`${Math.min(audioLevel * 100, 100)}%`}
                                transition="width 0.1s ease-out"
                              />
                            </Box>
                          </Box>
                        )}
                      </VStack>

                      <Divider orientation="vertical" h="auto" />

                      {/* Right Column: Visualizer Settings */}
                      <VStack spacing={4} align="stretch" flex={1.5}>
                        <Text fontSize="md" fontWeight="semibold">Visualizer</Text>
                        {onUpdateVisualizerControls && visualizerControls && (
                          <>
                            <Box>
                              <Text fontSize="sm" mb={2}>Shape</Text>
                              <Select
                                size="sm"
                                value={visualizerControls.shape || 'icosahedron'}
                                onChange={(e) => onUpdateVisualizerControls({ shape: e.target.value as ShapeType })}
                              >
                                <option value="icosahedron">Icosahedron</option>
                                <option value="sphere">Sphere</option>
                                <option value="torus">Torus</option>
                                <option value="torusKnot">Torus Knot</option>
                                <option value="octahedron">Octahedron</option>
                                <option value="dodecahedron">Dodecahedron</option>
                                <option value="tetrahedron">Tetrahedron</option>
                                <option value="cube">Cube</option>
                                <option value="cone">Cone</option>
                                <option value="cylinder">Cylinder</option>
                                <option value="perplexityOrb">Perplexity Orb</option>
                              </Select>
                            </Box>

                            <Box>
                              <Text fontSize="sm" mb={2}>Theme</Text>
                              <Wrap spacing={2}>
                                {Object.keys(VISUALIZER_PRESETS).map((name) => (
                                  <WrapItem key={name}>
                                    <Badge
                                      as="button"
                                      onClick={() => onUpdateVisualizerControls!(VISUALIZER_PRESETS[name])}
                                      colorScheme="gray"
                                      variant="solid"
                                      px={2.5}
                                      py={1.5}
                                      borderRadius="md"
                                      cursor="pointer"
                                      opacity={0.7}
                                      _hover={{ opacity: 1, transform: 'translateY(-1px)' }}
                                      transition="all 0.2s"
                                      textTransform="uppercase"
                                      fontSize="xs"
                                      fontWeight="bold"
                                    >
                                      {name}
                                    </Badge>
                                  </WrapItem>
                                ))}
                              </Wrap>
                            </Box>

                            <HStack>
                              <Text fontSize="sm">Wireframe:</Text>
                              <Switch
                                size="sm"
                                isChecked={visualizerControls.wireframe || false}
                                onChange={(e) => onUpdateVisualizerControls({ wireframe: e.target.checked })}
                              />
                            </HStack>

                            <VStack spacing={2} align="stretch">
                              {[ 
                                { label: 'Size', value: visualizerControls.size, min: 2, max: 8, step: 0.5, color: 'blue', onChange: (v: number) => onUpdateVisualizerControls({ size: v }) },
                                { label: 'Roughness', value: visualizerControls.roughness, min: 1, max: 10, step: 0.5, color: 'purple', onChange: (v: number) => onUpdateVisualizerControls({ roughness: v }) },
                                { label: 'Dynamism', value: visualizerControls.dynamism, min: 0, max: 2, step: 0.1, color: 'teal', onChange: (v: number) => onUpdateVisualizerControls({ dynamism: v }) },
                                { label: 'Glow', value: visualizerControls.glowIntensity, min: 0.2, max: 3, step: 0.1, color: 'pink', onChange: (v: number) => onUpdateVisualizerControls({ glowIntensity: v }) },
                                { label: 'Speed', value: visualizerControls.animationSpeed || 1, min: 0.1, max: 3, step: 0.1, color: 'orange', onChange: (v: number) => onUpdateVisualizerControls({ animationSpeed: v }) },
                              ].map(control => (
                                <Box key={control.label}>
                                  <HStack justify="space-between">
                                    <Text fontSize="sm">{control.label}</Text>
                                    <Text fontSize="sm" color={useSemanticToken('text.secondary')}>{control.value.toFixed(1)}</Text>
                                  </HStack>
                                  <Slider value={control.value} onChange={control.onChange} min={control.min} max={control.max} step={control.step} colorScheme={control.color} mt={1}>
                                    <SliderTrack h="6px" borderRadius="full"><SliderFilledTrack /></SliderTrack>
                                    <SliderThumb boxSize={4} />
                                  </Slider>
                                </Box>
                              ))}
                            </VStack>
                          </>
                        )}
                      </VStack>
                    </HStack>
                  </PopoverBody>
                </PopoverContent>
              </Popover>
            )}

            {/* Audio Mute Toggle */}
          {(isConversationActive || !isAudioMuted) && (
            <Tooltip label={isAudioMuted ? 'Unmute Audio' : 'Mute Audio'}>
              <IconButton
                aria-label="Toggle audio"
                icon={isAudioMuted ? <SpeakerXMarkIcon width={18} /> : <SpeakerWaveIcon width={18} />}
                variant="ghost"
                size="sm"
                onClick={() => setIsAudioMuted(!isAudioMuted)}
                color={isAudioMuted ? 'red.500' : 'green.500'}
              />
            </Tooltip>
          )}
            
            {/* Microphone Mute Toggle */}
            {onToggleMicrophoneMute && (
              <Tooltip label={isMicrophoneMuted ? 'Unmute Microphone' : 'Mute Microphone'}>
                <IconButton
                  aria-label="Toggle microphone"
                  icon={
                    isMicrophoneMuted ? (
                      <Box position="relative">
                        <MicrophoneIcon width={20} />
                        <Box 
                          position="absolute" 
                          top="50%" 
                          left="50%" 
                          transform="translate(-50%, -50%) rotate(45deg)" 
                          w="20px" 
                          h="2px" 
                          bg="red.500" 
                        />
                      </Box>
                    ) : (
                      <MicrophoneIcon width={20} />
                    )
                  }
                  variant="ghost"
                  size="sm"
                  onClick={onToggleMicrophoneMute}
                  color={isMicrophoneMuted ? 'red.500' : 'gray.500'}
                />
              </Tooltip>
            )}
            
            {/* Voice Input Toggle */}
            <Tooltip label={isVoiceListening ? 'Stop Listening' : 'Start Voice Input'}>
              <IconButton
                aria-label="Voice input"
                icon={isVoiceListening ? <MicrophoneSolid width={20} /> : <MicrophoneIcon width={20} />}
                variant="ghost"
                size="sm"
                onClick={onVoiceToggle}
                color={isVoiceListening ? 'red.500' : (isVoiceConnected ? 'green.500' : 'gray.500')}
                bg={isVoiceListening ? 'red.50' : 'transparent'}
                _hover={{ bg: isVoiceListening ? 'red.100' : 'gray.100' }}
                _dark={{ 
                  bg: isVoiceListening ? 'red.900' : 'transparent',
                  _hover: { bg: isVoiceListening ? 'red.800' : 'gray.800' }
                }}
              />
            </Tooltip>
            
            {/* Send Button */}
            <IconButton
              aria-label="Send message"
              icon={<PaperAirplaneIcon width={20} />}
              colorScheme="blue"
              isRound
              type="submit"
              isLoading={isLoading}
              isDisabled={!input.trim()}
            />
          </HStack>
        </Flex>
        </form>
      </VStack>
    </Box>
  );
};
