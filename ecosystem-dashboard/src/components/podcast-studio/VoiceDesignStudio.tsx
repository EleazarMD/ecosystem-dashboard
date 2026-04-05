'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Input,
  Textarea,
  Select,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Badge,
  IconButton,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Grid,
  GridItem,
  Spinner,
  useToast,
  Collapse,
  Divider,
  Avatar,
  Tooltip,
  Progress,
} from '@chakra-ui/react';
import {
  MicrophoneIcon,
  PlayIcon,
  StopIcon,
  ArrowUpTrayIcon,
  SparklesIcon,
  UserCircleIcon,
  SpeakerWaveIcon,
  TrashIcon,
  PlusIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { useSemanticToken } from '@/hooks/useSemanticToken';

// Types
interface PresetVoice {
  language: string;
  gender: string;
  description: string;
}

interface CustomVoice {
  id: string;
  name: string;
  description: string;
  language: string;
  type: 'cloned' | 'designed' | 'preset';
  created_at: string;
  reference_audio_path?: string;
  design_instruct?: string;
}

interface LibraryVoice {
  language: string;
  gender: string;
  name: string;
  description: string;
  accent: string;
  style: string;
  tone: string;
  use_cases: string[];
  best_for: string[];
  source: string;
  gemini_voice: string;
}

interface VoiceDesignStudioProps {
  onVoiceSelect?: (voiceId: string, voiceName: string) => void;
  selectedVoiceId?: string;
}

const QWEN_TTS_API = process.env.NEXT_PUBLIC_QWEN_TTS_API || 'http://localhost:4200';
const QWEN_TTS_GATEWAY = '/api/ai-gateway/qwen-tts';

const SUPPORTED_LANGUAGES = [
  'Auto', 'English', 'Chinese', 'Japanese', 'Korean', 
  'French', 'German', 'Spanish', 'Italian', 'Russian', 'Portuguese'
];

export default function VoiceDesignStudio({ onVoiceSelect, selectedVoiceId }: VoiceDesignStudioProps) {
  // State
  const [activeTab, setActiveTab] = useState(0);
  const [presetVoices, setPresetVoices] = useState<Record<string, PresetVoice>>({});
  const [customVoices, setCustomVoices] = useState<CustomVoice[]>([]);
  const [libraryVoices, setLibraryVoices] = useState<Record<string, LibraryVoice>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [serviceStatus, setServiceStatus] = useState<'loading' | 'healthy' | 'error'>('loading');
  
  // Voice Design State
  const [designText, setDesignText] = useState('Hello, welcome to our podcast. Today we will discuss exciting topics.');
  const [designInstruct, setDesignInstruct] = useState('Speak in a warm, professional tone with clear enunciation.');
  const [designLanguage, setDesignLanguage] = useState('English');
  const [temperature, setTemperature] = useState(0.7);
  const [topP, setTopP] = useState(0.9);
  
  // Voice Clone State
  const [cloneText, setCloneText] = useState('This is a test of the cloned voice.');
  const [cloneRefText, setCloneRefText] = useState('');
  const [cloneLanguage, setCloneLanguage] = useState('English');
  const [referenceAudio, setReferenceAudio] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  
  // Custom Voice Save State
  const [newVoiceName, setNewVoiceName] = useState('');
  const [newVoiceDescription, setNewVoiceDescription] = useState('');
  const [showAllGeminiVoices, setShowAllGeminiVoices] = useState(false);
  
  // Audio
  const audioRef = useRef<HTMLAudioElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  const toast = useToast();
  
  // Colors
  const bgColor = useSemanticToken('surface.base');
  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const accentColor = useSemanticToken('accent.primary');

  // Fetch service status and preset voices
  useEffect(() => {
    fetchServiceStatus();
    fetchPresetVoices();
    fetchCustomVoices();
    fetchLibraryVoices();
  }, []);

  const fetchServiceStatus = async () => {
    try {
      const res = await fetch(`${QWEN_TTS_GATEWAY}?action=health`);
      if (res.ok) {
        const data = await res.json();
        setServiceStatus(data.status === 'healthy' ? 'healthy' : 'loading');
      } else {
        setServiceStatus('error');
      }
    } catch {
      setServiceStatus('error');
    }
  };

  const fetchPresetVoices = async () => {
    try {
      const res = await fetch(`${QWEN_TTS_GATEWAY}?action=preset-voices`);
      if (res.ok) {
        const data = await res.json();
        setPresetVoices(data.presets || {});
      }
    } catch (e) {
      console.error('Failed to fetch preset voices:', e);
    }
  };

  const fetchCustomVoices = async () => {
    try {
      const res = await fetch(`${QWEN_TTS_GATEWAY}?action=voices`);
      if (res.ok) {
        const data = await res.json();
        setCustomVoices(data.voices || []);
      }
    } catch (e) {
      console.error('Failed to fetch custom voices:', e);
    }
  };

  const fetchLibraryVoices = async () => {
    try {
      const res = await fetch(`${QWEN_TTS_GATEWAY}?action=library-voices`);
      if (res.ok) {
        const data = await res.json();
        setLibraryVoices(data.voices || {});
      }
    } catch (e) {
      console.error('Failed to fetch library voices:', e);
    }
  };

  // Play audio from blob
  const playAudio = async (audioBlob: Blob) => {
    if (audioRef.current) {
      const url = URL.createObjectURL(audioBlob);
      audioRef.current.src = url;
      audioRef.current.play();
      setIsPlaying(true);
      audioRef.current.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(url);
      };
    }
  };

  // Generate voice design preview
  const handleVoiceDesignPreview = async () => {
    if (!designText.trim() || !designInstruct.trim()) {
      toast({ title: 'Please enter text and voice description', status: 'warning' });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(QWEN_TTS_GATEWAY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: designText,
          mode: 'voice-design',
          voice_description: designInstruct,
          language: designLanguage,
          temperature,
          top_p: topP,
        }),
      });

      if (!res.ok) throw new Error('Voice design failed');
      
      const audioBlob = await res.blob();
      await playAudio(audioBlob);
      toast({ title: 'Voice generated successfully', status: 'success' });
    } catch (e) {
      toast({ title: 'Failed to generate voice', status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // Generate voice clone preview
  const handleVoiceClonePreview = async () => {
    if (!cloneText.trim() || !referenceAudio) {
      toast({ title: 'Please enter text and upload reference audio', status: 'warning' });
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('text', cloneText);
      formData.append('language', cloneLanguage);
      formData.append('ref_text', cloneRefText);
      formData.append('temperature', temperature.toString());
      formData.append('top_p', topP.toString());
      formData.append('reference_audio', referenceAudio);

      const res = await fetch('/api/ai-gateway/qwen-tts-clone', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Voice clone failed');
      
      const audioBlob = await res.blob();
      await playAudio(audioBlob);
      toast({ title: 'Voice cloned successfully', status: 'success' });
    } catch (e) {
      toast({ title: 'Failed to clone voice', status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // Generate preset voice preview
  const handlePresetPreview = async (speaker: string) => {
    setIsLoading(true);
    try {
      // Convert speaker name to lowercase with underscores to match backend
      const speakerKey = speaker.toLowerCase().replace(/-/g, '_').replace(/ /g, '_');
      const res = await fetch(QWEN_TTS_GATEWAY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'Hello, this is a preview of my voice. I hope you like how I sound.',
          mode: 'custom-voice',
          speaker: speakerKey,
          language: presetVoices[speaker]?.language || 'Auto',
          temperature,
          top_p: topP,
        }),
      });

      if (!res.ok) throw new Error('Preset voice failed');
      
      const audioBlob = await res.blob();
      await playAudio(audioBlob);
    } catch (e) {
      toast({ title: 'Failed to preview voice', status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // Record reference audio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
        const file = new File([blob], 'recording.wav', { type: 'audio/wav' });
        setReferenceAudio(file);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (e) {
      toast({ title: 'Failed to access microphone', status: 'error' });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Save custom voice
  const handleSaveVoice = async (type: 'designed' | 'cloned') => {
    if (!newVoiceName.trim()) {
      toast({ title: 'Please enter a voice name', status: 'warning' });
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', newVoiceName);
      formData.append('description', newVoiceDescription || (type === 'designed' ? designInstruct : 'Cloned voice'));
      formData.append('language', type === 'designed' ? designLanguage : cloneLanguage);
      formData.append('design_instruct', type === 'designed' ? designInstruct : '');
      
      if (type === 'cloned' && referenceAudio) {
        formData.append('reference_audio', referenceAudio);
      }

      const res = await fetch(`${QWEN_TTS_API}/api/voices`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Failed to save voice');
      
      toast({ title: 'Voice saved to library', status: 'success' });
      setNewVoiceName('');
      setNewVoiceDescription('');
      fetchCustomVoices();
    } catch (e) {
      toast({ title: 'Failed to save voice', status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // Delete custom voice
  const handleDeleteVoice = async (voiceId: string) => {
    try {
      const res = await fetch(`${QWEN_TTS_API}/api/voices/${voiceId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast({ title: 'Voice deleted', status: 'success' });
        fetchCustomVoices();
      }
    } catch (e) {
      toast({ title: 'Failed to delete voice', status: 'error' });
    }
  };

  return (
    <Box bg={bgColor} h="full" overflow="auto" p={4}>
      <audio ref={audioRef} hidden />
      
      {/* Header */}
      <HStack justify="space-between" mb={4}>
        <HStack>
          <SparklesIcon className="w-6 h-6" style={{ color: accentColor }} />
          <Text fontSize="xl" fontWeight="bold" color={textPrimary}>
            Voice Design Studio
          </Text>
          <Badge colorScheme={serviceStatus === 'healthy' ? 'green' : serviceStatus === 'loading' ? 'yellow' : 'red'}>
            {serviceStatus === 'healthy' ? 'Qwen3-TTS Ready' : serviceStatus === 'loading' ? 'Loading...' : 'Offline'}
          </Badge>
        </HStack>
      </HStack>

      <Tabs index={activeTab} onChange={setActiveTab} variant="soft-rounded" colorScheme="purple">
        <TabList mb={4}>
          <Tab>🎨 Voice Design</Tab>
          <Tab>🎤 Voice Clone</Tab>
          <Tab>👥 Preset Voices</Tab>
          <Tab>📚 My Voices</Tab>
        </TabList>

        <TabPanels>
          {/* Voice Design Tab */}
          <TabPanel p={0}>
            <Grid templateColumns="1fr 1fr" gap={4}>
              <GridItem>
                <VStack align="stretch" spacing={4} bg={cardBg} p={4} borderRadius="lg" border="1px solid" borderColor={borderColor}>
                  <Text fontWeight="semibold" color={textPrimary}>Voice Description</Text>
                  <Textarea
                    value={designInstruct}
                    onChange={(e) => setDesignInstruct(e.target.value)}
                    placeholder="Describe the voice characteristics (e.g., 'Warm, professional female voice with clear enunciation and a slight British accent')"
                    rows={4}
                    bg={bgColor}
                  />
                  
                  <Text fontWeight="semibold" color={textPrimary}>Sample Text</Text>
                  <Textarea
                    value={designText}
                    onChange={(e) => setDesignText(e.target.value)}
                    placeholder="Enter text to synthesize..."
                    rows={3}
                    bg={bgColor}
                  />

                  <HStack>
                    <Select value={designLanguage} onChange={(e) => setDesignLanguage(e.target.value)} bg={bgColor} w="150px">
                      {SUPPORTED_LANGUAGES.map(lang => (
                        <option key={lang} value={lang}>{lang}</option>
                      ))}
                    </Select>
                    <Button
                      colorScheme="purple"
                      leftIcon={isLoading ? <Spinner size="sm" /> : <SparklesIcon className="w-4 h-4" />}
                      onClick={handleVoiceDesignPreview}
                      isDisabled={isLoading || serviceStatus !== 'healthy'}
                      flex={1}
                    >
                      Generate Preview
                    </Button>
                  </HStack>
                </VStack>
              </GridItem>

              <GridItem>
                <VStack align="stretch" spacing={4} bg={cardBg} p={4} borderRadius="lg" border="1px solid" borderColor={borderColor}>
                  <Text fontWeight="semibold" color={textPrimary}>Generation Settings</Text>
                  
                  <Box>
                    <HStack justify="space-between" mb={2}>
                      <Text fontSize="sm" color={textSecondary}>Temperature: {temperature.toFixed(2)}</Text>
                    </HStack>
                    <Slider value={temperature} onChange={setTemperature} min={0} max={2} step={0.1}>
                      <SliderTrack><SliderFilledTrack bg={accentColor} /></SliderTrack>
                      <SliderThumb />
                    </Slider>
                  </Box>

                  <Box>
                    <HStack justify="space-between" mb={2}>
                      <Text fontSize="sm" color={textSecondary}>Top P: {topP.toFixed(2)}</Text>
                    </HStack>
                    <Slider value={topP} onChange={setTopP} min={0} max={1} step={0.05}>
                      <SliderTrack><SliderFilledTrack bg={accentColor} /></SliderTrack>
                      <SliderThumb />
                    </Slider>
                  </Box>

                  <Divider />

                  <Text fontWeight="semibold" color={textPrimary}>Save to Library</Text>
                  <Input
                    value={newVoiceName}
                    onChange={(e) => setNewVoiceName(e.target.value)}
                    placeholder="Voice name..."
                    bg={bgColor}
                  />
                  <Button
                    leftIcon={<ArrowDownTrayIcon className="w-4 h-4" />}
                    onClick={() => handleSaveVoice('designed')}
                    isDisabled={!newVoiceName.trim() || isLoading}
                  >
                    Save Voice
                  </Button>
                </VStack>
              </GridItem>
            </Grid>
          </TabPanel>

          {/* Voice Clone Tab */}
          <TabPanel p={0}>
            <Grid templateColumns="1fr 1fr" gap={4}>
              <GridItem>
                <VStack align="stretch" spacing={4} bg={cardBg} p={4} borderRadius="lg" border="1px solid" borderColor={borderColor}>
                  <Text fontWeight="semibold" color={textPrimary}>Reference Audio</Text>
                  <Text fontSize="sm" color={textSecondary}>
                    Upload a 3+ second audio sample of the voice you want to clone
                  </Text>
                  
                  <HStack>
                    <Button
                      as="label"
                      leftIcon={<ArrowUpTrayIcon className="w-4 h-4" />}
                      cursor="pointer"
                    >
                      Upload Audio
                      <input
                        type="file"
                        accept="audio/*"
                        hidden
                        onChange={(e) => setReferenceAudio(e.target.files?.[0] || null)}
                      />
                    </Button>
                    <Button
                      leftIcon={isRecording ? <StopIcon className="w-4 h-4" /> : <MicrophoneIcon className="w-4 h-4" />}
                      colorScheme={isRecording ? 'red' : 'gray'}
                      onClick={isRecording ? stopRecording : startRecording}
                    >
                      {isRecording ? 'Stop' : 'Record'}
                    </Button>
                  </HStack>

                  {referenceAudio && (
                    <HStack bg={bgColor} p={2} borderRadius="md">
                      <CheckCircleIcon className="w-5 h-5" style={{ color: 'green' }} />
                      <Text fontSize="sm" color={textPrimary}>{referenceAudio.name}</Text>
                    </HStack>
                  )}

                  <Text fontWeight="semibold" color={textPrimary}>Reference Transcript (Optional)</Text>
                  <Textarea
                    value={cloneRefText}
                    onChange={(e) => setCloneRefText(e.target.value)}
                    placeholder="What is said in the reference audio..."
                    rows={2}
                    bg={bgColor}
                  />
                </VStack>
              </GridItem>

              <GridItem>
                <VStack align="stretch" spacing={4} bg={cardBg} p={4} borderRadius="lg" border="1px solid" borderColor={borderColor}>
                  <Text fontWeight="semibold" color={textPrimary}>Text to Synthesize</Text>
                  <Textarea
                    value={cloneText}
                    onChange={(e) => setCloneText(e.target.value)}
                    placeholder="Enter text to speak with the cloned voice..."
                    rows={4}
                    bg={bgColor}
                  />

                  <HStack>
                    <Select value={cloneLanguage} onChange={(e) => setCloneLanguage(e.target.value)} bg={bgColor} w="150px">
                      {SUPPORTED_LANGUAGES.map(lang => (
                        <option key={lang} value={lang}>{lang}</option>
                      ))}
                    </Select>
                    <Button
                      colorScheme="purple"
                      leftIcon={isLoading ? <Spinner size="sm" /> : <MicrophoneIcon className="w-4 h-4" />}
                      onClick={handleVoiceClonePreview}
                      isDisabled={isLoading || !referenceAudio || serviceStatus !== 'healthy'}
                      flex={1}
                    >
                      Clone & Preview
                    </Button>
                  </HStack>

                  <Divider />

                  <Text fontWeight="semibold" color={textPrimary}>Save to Library</Text>
                  <Input
                    value={newVoiceName}
                    onChange={(e) => setNewVoiceName(e.target.value)}
                    placeholder="Voice name..."
                    bg={bgColor}
                  />
                  <Button
                    leftIcon={<ArrowDownTrayIcon className="w-4 h-4" />}
                    onClick={() => handleSaveVoice('cloned')}
                    isDisabled={!newVoiceName.trim() || !referenceAudio || isLoading}
                  >
                    Save Cloned Voice
                  </Button>
                </VStack>
              </GridItem>
            </Grid>
          </TabPanel>

          {/* Preset Voices Tab */}
          <TabPanel p={0}>
            <Grid templateColumns="repeat(3, 1fr)" gap={4}>
              {Object.entries(presetVoices)
                .filter(([_, info]) => info.language === 'English' || info.language === 'Spanish')
                .map(([speaker, info]) => (
                <GridItem key={speaker}>
                  <Box
                    bg={cardBg}
                    p={4}
                    borderRadius="lg"
                    border="2px solid"
                    borderColor={selectedVoiceId === speaker ? accentColor : borderColor}
                    cursor="pointer"
                    onClick={() => onVoiceSelect?.(speaker, speaker)}
                    _hover={{ borderColor: accentColor }}
                    transition="all 0.2s"
                  >
                    <HStack justify="space-between" mb={2}>
                      <Avatar size="sm" name={speaker} bg={accentColor} />
                      <Badge colorScheme={info.gender === 'female' ? 'pink' : 'blue'}>
                        {info.gender}
                      </Badge>
                    </HStack>
                    <Text fontWeight="bold" color={textPrimary} textTransform="capitalize">
                      {speaker.replace('_', ' ')}
                    </Text>
                    <Text fontSize="sm" color={textSecondary} noOfLines={2}>
                      {info.description}
                    </Text>
                    <HStack mt={2}>
                      <Badge size="sm">{info.language}</Badge>
                      <IconButton
                        aria-label="Preview"
                        icon={isLoading ? <Spinner size="xs" /> : <PlayIcon className="w-4 h-4" />}
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePresetPreview(speaker);
                        }}
                        isDisabled={isLoading}
                      />
                    </HStack>
                  </Box>
                </GridItem>
              ))}
            </Grid>
          </TabPanel>

          {/* My Voices Tab */}
          <TabPanel p={0}>
            <VStack align="stretch" spacing={6}>
              {/* Qwen Library Voices Section (Gemini-cloned) */}
              <Box>
                <HStack mb={3}>
                  <Text fontWeight="bold" color={textPrimary} fontSize="lg">🎙️ Voice Library</Text>
                  <Badge colorScheme="purple">{Object.keys(libraryVoices).length} voices</Badge>
                </HStack>
                {Object.keys(libraryVoices).length === 0 ? (
                  <Box textAlign="center" py={6} bg={cardBg} borderRadius="lg" border="1px dashed" borderColor={borderColor}>
                    <Spinner size="sm" mr={2} />
                    <Text color={textSecondary} display="inline">Loading library voices...</Text>
                  </Box>
                ) : (
                  <>
                    <Grid templateColumns="repeat(3, 1fr)" gap={4}>
                      {Object.entries(libraryVoices).slice(0, showAllGeminiVoices ? undefined : 12).map(([voiceId, voice]) => (
                        <GridItem key={voiceId}>
                          <Box
                            bg={cardBg}
                            p={4}
                            borderRadius="lg"
                            border="2px solid"
                            borderColor={selectedVoiceId === voiceId ? accentColor : borderColor}
                            cursor="pointer"
                            onClick={() => onVoiceSelect?.(voiceId, voice.name)}
                            _hover={{ borderColor: accentColor }}
                            transition="all 0.2s"
                          >
                            <HStack justify="space-between" mb={2}>
                              <Avatar size="sm" name={voice.name} bg={voice.gender === 'female' ? 'pink.500' : 'blue.500'} />
                              <Badge colorScheme={voice.gender === 'female' ? 'pink' : 'blue'} fontSize="xs">
                                {voice.gender}
                              </Badge>
                            </HStack>
                            <Text fontWeight="bold" color={textPrimary} fontSize="sm">{voice.name}</Text>
                            <Text fontSize="xs" color={textSecondary} noOfLines={2}>
                              {voice.description}
                            </Text>
                            <HStack mt={2} flexWrap="wrap" gap={1}>
                              <Badge size="sm" colorScheme="purple">{voice.accent}</Badge>
                              <Badge size="sm" variant="outline" fontSize="9px">{voice.style}</Badge>
                            </HStack>
                          </Box>
                        </GridItem>
                      ))}
                    </Grid>
                    {Object.keys(libraryVoices).length > 12 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        mt={2}
                        onClick={() => setShowAllGeminiVoices(!showAllGeminiVoices)}
                      >
                        {showAllGeminiVoices ? 'Show Less' : `Show All ${Object.keys(libraryVoices).length} Voices`}
                      </Button>
                    )}
                  </>
                )}
              </Box>

              {/* Custom Qwen Voices Section */}
              <Box>
                <HStack mb={3}>
                  <Text fontWeight="bold" color={textPrimary} fontSize="lg">🎨 Custom Qwen Voices</Text>
                  <Badge colorScheme="purple">{customVoices.length} voices</Badge>
                </HStack>
                {customVoices.length === 0 ? (
                  <Box textAlign="center" py={6} bg={cardBg} borderRadius="lg" border="1px dashed" borderColor={borderColor}>
                    <Text color={textSecondary}>No custom voices yet. Create one using Voice Design or Voice Clone!</Text>
                  </Box>
                ) : (
                  <Grid templateColumns="repeat(3, 1fr)" gap={4}>
                    {customVoices.map((voice) => (
                      <GridItem key={voice.id}>
                        <Box
                          bg={cardBg}
                          p={4}
                          borderRadius="lg"
                          border="2px solid"
                          borderColor={selectedVoiceId === voice.id ? accentColor : borderColor}
                          cursor="pointer"
                          onClick={() => onVoiceSelect?.(voice.id, voice.name)}
                          _hover={{ borderColor: accentColor }}
                        >
                          <HStack justify="space-between" mb={2}>
                            <Avatar size="sm" name={voice.name} bg="purple.500" />
                            <IconButton
                              aria-label="Delete"
                              icon={<TrashIcon className="w-4 h-4" />}
                              size="xs"
                              colorScheme="red"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteVoice(voice.id);
                              }}
                            />
                          </HStack>
                          <Text fontWeight="bold" color={textPrimary}>{voice.name}</Text>
                          <Text fontSize="sm" color={textSecondary} noOfLines={2}>
                            {voice.description}
                          </Text>
                          <HStack mt={2}>
                            <Badge size="sm">{voice.language}</Badge>
                            <Badge size="sm" colorScheme="purple">{voice.type}</Badge>
                          </HStack>
                        </Box>
                      </GridItem>
                    ))}
                  </Grid>
                )}
              </Box>
            </VStack>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
}
