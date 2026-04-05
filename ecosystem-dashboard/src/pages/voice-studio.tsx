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
  Divider,
  Avatar,
  Card,
  CardBody,
  CardHeader,
  Heading,
  SimpleGrid,
  Progress,
  Tooltip,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  FormControl,
  FormLabel,
  Switch,
  Icon,
  Flex,
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
  EllipsisVerticalIcon,
  DocumentDuplicateIcon,
  ShareIcon,
  PencilIcon,
  ClipboardDocumentIcon,
} from '@heroicons/react/24/outline';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useRightPanel } from '@/contexts/RightPanelContext';

// Types
interface PresetVoice {
  language: string;
  gender: string;
  description: string;
  name?: string;
  accent?: string;
  style?: string;
  tone?: string;
  use_cases?: string[];
  best_for?: string[];
  source?: string;
  gemini_voice?: string;
}

interface VoiceProfile {
  id: string;
  name: string;
  description: string;
  language: string;
  type: 'cloned' | 'designed' | 'preset';
  created_at: string;
  reference_audio_path?: string;
  design_instruct?: string;
  tags?: string[];
  usageCount?: number;
  lastUsed?: string;
}

interface ServiceIntegration {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
  voiceProfileId?: string;
}

const QWEN_TTS_GATEWAY = '/api/ai-gateway/qwen-tts';

const SUPPORTED_LANGUAGES = [
  'Auto', 'English', 'Chinese', 'Japanese', 'Korean', 
  'French', 'German', 'Spanish', 'Italian', 'Russian', 'Portuguese'
];

const SERVICE_INTEGRATIONS: ServiceIntegration[] = [
  { id: 'podcast-studio', name: 'Podcast Studio', icon: '🎙️', enabled: true },
  { id: 'ai-research', name: 'AI Research', icon: '🔬', enabled: true },
  { id: 'email-agent', name: 'Email Agent', icon: '📧', enabled: false },
  { id: 'calendar', name: 'Calendar', icon: '📅', enabled: false },
  { id: 'notifications', name: 'Notifications', icon: '🔔', enabled: false },
  { id: 'family-hub', name: 'Family Hub', icon: '👨‍👩‍👧‍👦', enabled: false },
];

export default function VoiceStudioPage() {
  // State
  const [activeTab, setActiveTab] = useState(0);
  const [presetVoices, setPresetVoices] = useState<Record<string, PresetVoice>>({});
  const [libraryVoices, setLibraryVoices] = useState<string[]>([]);
  const [voiceProfiles, setVoiceProfiles] = useState<VoiceProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [serviceStatus, setServiceStatus] = useState<'loading' | 'healthy' | 'error'>('loading');
  const [selectedProfile, setSelectedProfile] = useState<VoiceProfile | null>(null);
  
  // Voice Design State
  const [designText, setDesignText] = useState('Hello, welcome to the AI Homelab ecosystem. I am your custom voice assistant.');
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
  
  // Save Voice Modal
  const { isOpen: isSaveOpen, onOpen: onSaveOpen, onClose: onSaveClose } = useDisclosure();
  const [newVoiceName, setNewVoiceName] = useState('');
  const [newVoiceDescription, setNewVoiceDescription] = useState('');
  const [newVoiceTags, setNewVoiceTags] = useState('');
  const [saveType, setSaveType] = useState<'designed' | 'cloned'>('designed');
  
  // Audio
  const audioRef = useRef<HTMLAudioElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  const toast = useToast();
  const { setContext, setCustomData } = useRightPanel();
  
  // Colors
  const bgColor = useSemanticToken('surface.base');
  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const accentColor = useSemanticToken('interactive.primary');

  // Set context on mount
  useEffect(() => {
    setContext('voice-studio');
  }, [setContext]);

  // Update right panel with selected profile
  useEffect(() => {
    setCustomData({
      selectedProfile,
      voiceProfiles,
      serviceIntegrations: SERVICE_INTEGRATIONS,
      onProfileSelect: setSelectedProfile,
    });
  }, [selectedProfile, voiceProfiles, setCustomData]);

  // Fetch service status and voices
  useEffect(() => {
    fetchServiceStatus();
    fetchPresetVoices();
    fetchVoiceProfiles();
  }, []);

  const fetchServiceStatus = async () => {
    try {
      const res = await fetch(`${QWEN_TTS_GATEWAY}?action=health`);
      if (res.ok) {
        const data = await res.json();
        // Accept 'healthy' or 'partial' (base model loaded) as connected
        setServiceStatus(data.status === 'healthy' || data.status === 'partial' ? 'healthy' : 'loading');
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
        // Store library voices list (Gemini TTS samples for direct preview)
        setLibraryVoices(data.library_voices || []);
      }
    } catch (e) {
      console.error('Failed to fetch preset voices:', e);
    }
  };

  const fetchVoiceProfiles = async () => {
    try {
      const res = await fetch(`${QWEN_TTS_GATEWAY}?action=voices`);
      if (res.ok) {
        const data = await res.json();
        setVoiceProfiles(data.voices || []);
      }
    } catch (e) {
      console.error('Failed to fetch voice profiles:', e);
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

      // Voice clone requires FormData - use direct API for now
      // TODO: Add voice-clone support to gateway
      const res = await fetch(`/api/ai-gateway/qwen-tts-clone`, {
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

  // Play pre-cloned Qwen3 voice demo (instant playback from pre-generated samples)
  const handlePresetPreview = async (speaker: string) => {
    setIsLoading(true);
    try {
      const speakerKey = speaker.toLowerCase().replace(/-/g, '_').replace(/ /g, '_');
      
      // Use pre-generated Qwen3 demo samples (instant playback)
      const res = await fetch(`${QWEN_TTS_GATEWAY}?action=library-demo&voice_id=${speakerKey}`);

      if (!res.ok) throw new Error('Demo not found');
      
      const audioBlob = await res.blob();
      await playAudio(audioBlob);
      toast({ 
        title: '🟣 Qwen3 Clone', 
        description: 'Playing pre-generated Qwen3 voice clone',
        status: 'info', 
        duration: 3000,
        isClosable: true,
      });
    } catch (e) {
      toast({ title: 'Failed to play Qwen3 demo', status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // Play original Gemini TTS sample (for comparison)
  const handleGeminiPreview = async (speaker: string) => {
    setIsLoading(true);
    try {
      const speakerKey = speaker.toLowerCase().replace(/-/g, '_').replace(/ /g, '_');
      
      // Use original Gemini TTS sample
      const res = await fetch(`${QWEN_TTS_GATEWAY}?action=library-preview&voice_id=${speakerKey}`);

      if (!res.ok) throw new Error('Sample not found');
      
      const audioBlob = await res.blob();
      await playAudio(audioBlob);
      toast({ 
        title: '🟢 Original Gemini', 
        description: 'Playing original reference audio from Google',
        status: 'success', 
        duration: 3000,
        isClosable: true,
      });
    } catch (e) {
      toast({ title: 'Failed to play Gemini sample', status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // Generate new speech with a voice profile (on-demand cloning)
  const handleGenerateSpeech = async (speaker: string, text: string) => {
    setIsLoading(true);
    try {
      const speakerKey = speaker.toLowerCase().replace(/-/g, '_').replace(/ /g, '_');
      
      const res = await fetch(QWEN_TTS_GATEWAY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          mode: 'clone-from-library',
          voice_id: speakerKey,
          language: presetVoices[speaker]?.language || 'Auto',
          temperature,
          top_p: topP,
        }),
      });

      if (!res.ok) throw new Error('Voice cloning failed');
      
      const audioBlob = await res.blob();
      await playAudio(audioBlob);
      toast({ title: 'Speech generated with Qwen3', status: 'success', duration: 2000 });
    } catch (e) {
      toast({ title: 'Failed to generate speech', status: 'error' });
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

  // Save voice profile
  const handleSaveVoice = async () => {
    if (!newVoiceName.trim()) {
      toast({ title: 'Please enter a voice name', status: 'warning' });
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', newVoiceName);
      formData.append('description', newVoiceDescription || (saveType === 'designed' ? designInstruct : 'Cloned voice'));
      formData.append('language', saveType === 'designed' ? designLanguage : cloneLanguage);
      formData.append('design_instruct', saveType === 'designed' ? designInstruct : '');
      formData.append('tags', newVoiceTags);
      
      if (saveType === 'cloned' && referenceAudio) {
        formData.append('reference_audio', referenceAudio);
      }

      // Save voice requires FormData - use direct API for now
      // TODO: Add voice save support to gateway
      const res = await fetch(`/api/ai-gateway/qwen-tts-voices`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Failed to save voice');
      
      toast({ title: 'Voice profile saved', status: 'success' });
      setNewVoiceName('');
      setNewVoiceDescription('');
      setNewVoiceTags('');
      onSaveClose();
      fetchVoiceProfiles();
    } catch (e) {
      toast({ title: 'Failed to save voice', status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // Delete voice profile
  const handleDeleteVoice = async (voiceId: string) => {
    try {
      const res = await fetch(`/api/ai-gateway/qwen-tts-voices?id=${voiceId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast({ title: 'Voice deleted', status: 'success' });
        if (selectedProfile?.id === voiceId) {
          setSelectedProfile(null);
        }
        fetchVoiceProfiles();
      }
    } catch (e) {
      toast({ title: 'Failed to delete voice', status: 'error' });
    }
  };

  // Preview saved voice
  const handlePreviewSavedVoice = async (profile: VoiceProfile) => {
    setIsLoading(true);
    try {
      const res = await fetch(QWEN_TTS_GATEWAY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'Hello, this is a preview of my saved voice profile.',
          mode: 'synthesize',
          voice: profile.id,
          language: profile.language,
          temperature,
          top_p: topP,
        }),
      });

      if (!res.ok) throw new Error('Preview failed');
      
      const audioBlob = await res.blob();
      await playAudio(audioBlob);
    } catch (e) {
      toast({ title: 'Failed to preview voice', status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <Box h="calc(100vh - 64px)" overflow="hidden" display="flex" flexDirection="column">
        <audio ref={audioRef} hidden />
        
        {/* Header */}
        <Box px={6} py={4} borderBottom="1px solid" borderColor={borderColor} bg={cardBg}>
          <HStack justify="space-between">
            <HStack spacing={4}>
              <Box p={2} bg="purple.500" borderRadius="lg">
                <SpeakerWaveIcon className="w-6 h-6" style={{ color: 'white' }} />
              </Box>
              <VStack align="start" spacing={0}>
                <HStack>
                  <Heading size="md" color={textPrimary}>Voice Design Studio</Heading>
                  <Badge colorScheme="purple">Qwen3-TTS</Badge>
                </HStack>
                <Text fontSize="sm" color={textSecondary}>
                  Create and manage voice profiles for your homelab services
                </Text>
              </VStack>
            </HStack>
            <HStack spacing={3}>
              <Badge 
                colorScheme={serviceStatus === 'healthy' ? 'green' : serviceStatus === 'loading' ? 'yellow' : 'red'}
                px={3}
                py={1}
                borderRadius="full"
              >
                {serviceStatus === 'healthy' ? '● Connected' : serviceStatus === 'loading' ? '○ Connecting...' : '● Offline'}
              </Badge>
              <Button
                leftIcon={<PlusIcon className="w-4 h-4" />}
                colorScheme="purple"
                size="sm"
                onClick={() => {
                  setSaveType('designed');
                  onSaveOpen();
                }}
              >
                New Profile
              </Button>
            </HStack>
          </HStack>
        </Box>

        {/* Main Content with Sidebar */}
        <Flex flex={1} overflow="hidden">
          {/* Left Sidebar Navigation */}
          <Box
            w="220px"
            minW="220px"
            bg={cardBg}
            borderRight="1px solid"
            borderColor={borderColor}
            py={4}
            display="flex"
            flexDirection="column"
          >
            <VStack align="stretch" spacing={1} px={3}>
              {/* Voice Design */}
              <HStack
                px={3}
                py={2}
                borderRadius="lg"
                cursor="pointer"
                bg={activeTab === 0 ? accentColor : 'transparent'}
                color={activeTab === 0 ? 'white' : textPrimary}
                _hover={{ bg: activeTab === 0 ? accentColor : borderColor }}
                onClick={() => setActiveTab(0)}
                transition="all 0.2s"
              >
                <Icon as={SparklesIcon} boxSize={5} />
                <Text fontSize="sm" fontWeight="500">Voice Design</Text>
              </HStack>

              {/* Voice Clone */}
              <HStack
                px={3}
                py={2}
                borderRadius="lg"
                cursor="pointer"
                bg={activeTab === 1 ? accentColor : 'transparent'}
                color={activeTab === 1 ? 'white' : textPrimary}
                _hover={{ bg: activeTab === 1 ? accentColor : borderColor }}
                onClick={() => setActiveTab(1)}
                transition="all 0.2s"
              >
                <Icon as={MicrophoneIcon} boxSize={5} />
                <Text fontSize="sm" fontWeight="500">Voice Clone</Text>
              </HStack>

              {/* My Voice Library */}
              <HStack
                px={3}
                py={2}
                borderRadius="lg"
                cursor="pointer"
                bg={activeTab === 2 ? accentColor : 'transparent'}
                color={activeTab === 2 ? 'white' : textPrimary}
                _hover={{ bg: activeTab === 2 ? accentColor : borderColor }}
                onClick={() => setActiveTab(2)}
                transition="all 0.2s"
              >
                <Icon as={UserCircleIcon} boxSize={5} />
                <Text fontSize="sm" fontWeight="500">My Voice Library</Text>
              </HStack>

              <Divider my={2} />

              {/* My Profiles */}
              <HStack
                px={3}
                py={2}
                borderRadius="lg"
                cursor="pointer"
                bg={activeTab === 3 ? accentColor : 'transparent'}
                color={activeTab === 3 ? 'white' : textPrimary}
                _hover={{ bg: activeTab === 3 ? accentColor : borderColor }}
                onClick={() => setActiveTab(3)}
                transition="all 0.2s"
                justify="space-between"
              >
                <HStack>
                  <Icon as={SpeakerWaveIcon} boxSize={5} />
                  <Text fontSize="sm" fontWeight="500">My Profiles</Text>
                </HStack>
                <Badge colorScheme="purple" size="sm">{voiceProfiles.length}</Badge>
              </HStack>
            </VStack>

            {/* Sidebar Footer */}
            <Box mt="auto" px={3} pt={4} borderTop="1px solid" borderColor={borderColor}>
              <VStack align="stretch" spacing={2}>
                <HStack justify="space-between" px={2}>
                  <Text fontSize="xs" color={textSecondary}>Service Status</Text>
                  <Badge 
                    colorScheme={serviceStatus === 'healthy' ? 'green' : serviceStatus === 'loading' ? 'yellow' : 'red'}
                    size="sm"
                  >
                    {serviceStatus === 'healthy' ? 'Online' : serviceStatus === 'loading' ? 'Connecting' : 'Offline'}
                  </Badge>
                </HStack>
                <Button
                  size="sm"
                  leftIcon={<PlusIcon className="w-4 h-4" />}
                  colorScheme="purple"
                  w="full"
                  onClick={() => {
                    setSaveType('designed');
                    onSaveOpen();
                  }}
                >
                  New Profile
                </Button>
              </VStack>
            </Box>
          </Box>

          {/* Main Content Area */}
          <Box flex={1} overflow="auto" p={6}>
            {/* Voice Design Content */}
            {activeTab === 0 && (
                <Grid templateColumns="1fr 1fr" gap={6} h="full">
                  <GridItem>
                    <Card bg={cardBg} h="full">
                      <CardHeader pb={2}>
                        <Heading size="sm">Voice Description</Heading>
                        <Text fontSize="xs" color={textSecondary}>
                          Describe the voice characteristics you want to create
                        </Text>
                      </CardHeader>
                      <CardBody>
                        <VStack align="stretch" spacing={4}>
                          <Textarea
                            value={designInstruct}
                            onChange={(e) => setDesignInstruct(e.target.value)}
                            placeholder="Describe the voice (e.g., 'Warm, professional female voice with clear enunciation and a slight British accent')"
                            rows={4}
                            bg={bgColor}
                          />
                          
                          <FormControl>
                            <FormLabel fontSize="sm">Sample Text</FormLabel>
                            <Textarea
                              value={designText}
                              onChange={(e) => setDesignText(e.target.value)}
                              placeholder="Enter text to synthesize..."
                              rows={3}
                              bg={bgColor}
                            />
                          </FormControl>

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

                          <Divider />

                          <Button
                            leftIcon={<ArrowDownTrayIcon className="w-4 h-4" />}
                            onClick={() => {
                              setSaveType('designed');
                              onSaveOpen();
                            }}
                            variant="outline"
                          >
                            Save as Profile
                          </Button>
                        </VStack>
                      </CardBody>
                    </Card>
                  </GridItem>

                  <GridItem>
                    <Card bg={cardBg} h="full">
                      <CardHeader pb={2}>
                        <Heading size="sm">Generation Settings</Heading>
                      </CardHeader>
                      <CardBody>
                        <VStack align="stretch" spacing={6}>
                          <Box>
                            <HStack justify="space-between" mb={2}>
                              <Text fontSize="sm" color={textSecondary}>Temperature</Text>
                              <Badge>{temperature.toFixed(2)}</Badge>
                            </HStack>
                            <Slider value={temperature} onChange={setTemperature} min={0} max={2} step={0.1}>
                              <SliderTrack><SliderFilledTrack bg={accentColor} /></SliderTrack>
                              <SliderThumb />
                            </Slider>
                            <Text fontSize="xs" color={textSecondary} mt={1}>
                              Higher = more expressive, Lower = more consistent
                            </Text>
                          </Box>

                          <Box>
                            <HStack justify="space-between" mb={2}>
                              <Text fontSize="sm" color={textSecondary}>Top P</Text>
                              <Badge>{topP.toFixed(2)}</Badge>
                            </HStack>
                            <Slider value={topP} onChange={setTopP} min={0} max={1} step={0.05}>
                              <SliderTrack><SliderFilledTrack bg={accentColor} /></SliderTrack>
                              <SliderThumb />
                            </Slider>
                          </Box>

                          <Divider />

                          <Box>
                            <Heading size="xs" mb={3}>Quick Templates</Heading>
                            <SimpleGrid columns={2} spacing={2}>
                              {[
                                { label: 'Professional', desc: 'Clear, authoritative, and professional tone' },
                                { label: 'Friendly', desc: 'Warm, approachable, and conversational' },
                                { label: 'Narrator', desc: 'Deep, engaging storytelling voice' },
                                { label: 'Assistant', desc: 'Helpful, patient, and informative' },
                              ].map((template) => (
                                <Button
                                  key={template.label}
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setDesignInstruct(template.desc)}
                                >
                                  {template.label}
                                </Button>
                              ))}
                            </SimpleGrid>
                          </Box>
                        </VStack>
                      </CardBody>
                    </Card>
                  </GridItem>
                </Grid>
            )}

            {/* Voice Clone Content */}
            {activeTab === 1 && (
              <Grid templateColumns="1fr 1fr" gap={6} h="full">
                  <GridItem>
                    <Card bg={cardBg} h="full">
                      <CardHeader pb={2}>
                        <Heading size="sm">Reference Audio</Heading>
                        <Text fontSize="xs" color={textSecondary}>
                          Upload a 3+ second audio sample of the voice to clone
                        </Text>
                      </CardHeader>
                      <CardBody>
                        <VStack align="stretch" spacing={4}>
                          <HStack>
                            <Button
                              as="label"
                              leftIcon={<ArrowUpTrayIcon className="w-4 h-4" />}
                              cursor="pointer"
                              flex={1}
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
                              flex={1}
                            >
                              {isRecording ? 'Stop Recording' : 'Record'}
                            </Button>
                          </HStack>

                          {referenceAudio && (
                            <HStack bg={bgColor} p={3} borderRadius="md" border="1px solid" borderColor="green.500">
                              <CheckCircleIcon className="w-5 h-5" style={{ color: 'green' }} />
                              <Text fontSize="sm" color={textPrimary} flex={1}>{referenceAudio.name}</Text>
                              <IconButton
                                aria-label="Remove"
                                icon={<TrashIcon className="w-4 h-4" />}
                                size="xs"
                                variant="ghost"
                                onClick={() => setReferenceAudio(null)}
                              />
                            </HStack>
                          )}

                          <FormControl>
                            <FormLabel fontSize="sm">Reference Transcript (Optional)</FormLabel>
                            <Textarea
                              value={cloneRefText}
                              onChange={(e) => setCloneRefText(e.target.value)}
                              placeholder="What is said in the reference audio..."
                              rows={2}
                              bg={bgColor}
                            />
                          </FormControl>
                        </VStack>
                      </CardBody>
                    </Card>
                  </GridItem>

                  <GridItem>
                    <Card bg={cardBg} h="full">
                      <CardHeader pb={2}>
                        <Heading size="sm">Text to Synthesize</Heading>
                      </CardHeader>
                      <CardBody>
                        <VStack align="stretch" spacing={4}>
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

                          <Button
                            leftIcon={<ArrowDownTrayIcon className="w-4 h-4" />}
                            onClick={() => {
                              setSaveType('cloned');
                              onSaveOpen();
                            }}
                            variant="outline"
                            isDisabled={!referenceAudio}
                          >
                            Save as Profile
                          </Button>
                        </VStack>
                      </CardBody>
                    </Card>
                  </GridItem>
                </Grid>
            )}

            {/* My Voice Library Content */}
            {activeTab === 2 && (
              Object.keys(presetVoices).length === 0 ? (
                  <Card bg={cardBg}>
                    <CardBody>
                      <VStack py={12} spacing={4}>
                        <Spinner size="lg" color="purple.500" />
                        <Text fontSize="lg" fontWeight="medium" color={textPrimary}>
                          {serviceStatus === 'loading' ? 'Connecting to Qwen TTS...' : 
                           serviceStatus === 'error' ? 'Qwen TTS service unavailable' : 
                           'Loading voice library...'}
                        </Text>
                        <Text color={textSecondary} textAlign="center" maxW="md">
                          {serviceStatus === 'error' 
                            ? 'Please ensure the Qwen TTS service is running on port 4200.'
                            : 'Fetching your custom voice library from the TTS service.'}
                        </Text>
                      </VStack>
                    </CardBody>
                  </Card>
                ) : (
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                  {Object.entries(presetVoices)
                    .filter(([_, info]) => info.language === 'English' || info.language === 'Spanish')
                    .filter(([speaker]) => libraryVoices.includes(speaker))
                    .map(([speaker, info]) => {
                      const isLibrary = libraryVoices.includes(speaker);
                      return (
                        <Card
                          key={speaker}
                          bg={cardBg}
                          _hover={{ borderColor: accentColor, shadow: 'md' }}
                          transition="all 0.2s"
                          border="2px solid"
                          borderColor={selectedProfile?.id === speaker ? accentColor : 'transparent'}
                        >
                          <CardBody>
                            <VStack align="start" spacing={3}>
                              {/* Header */}
                              <HStack justify="space-between" w="full">
                                <HStack spacing={2}>
                                  <Avatar size="sm" name={info.name || speaker} bg={info.gender === 'female' ? 'pink.500' : 'blue.500'} />
                                  <VStack align="start" spacing={0}>
                                    <Text fontWeight="bold" color={textPrimary} fontSize="sm">
                                      {info.name || speaker.replace(/_/g, ' ')}
                                    </Text>
                                    <Text fontSize="xs" color={textSecondary}>
                                      {info.accent || info.language}
                                    </Text>
                                  </VStack>
                                </HStack>
                                <VStack spacing={1} align="end">
                                  <Badge colorScheme={info.gender === 'female' ? 'pink' : 'blue'} size="sm">
                                    {info.gender?.toUpperCase()}
                                  </Badge>
                                  <Badge colorScheme="purple" size="sm" variant="subtle">QWEN3</Badge>
                                </VStack>
                              </HStack>
                              
                              {/* Description */}
                              <Text fontSize="xs" color={textSecondary} noOfLines={2}>
                                {info.description}
                              </Text>
                              
                              {/* Tone */}
                              {info.tone && (
                                <Text fontSize="xs" color={textSecondary}>
                                  <Text as="span" fontWeight="semibold" color={textPrimary}>Tone:</Text> {info.tone}
                                </Text>
                              )}
                              
                              {/* Use Cases */}
                              {info.use_cases && info.use_cases.length > 0 && (
                                <HStack spacing={1} flexWrap="wrap">
                                  {info.use_cases.slice(0, 3).map((useCase: string, idx: number) => (
                                    <Badge key={idx} size="sm" variant="outline" colorScheme="purple" fontSize="2xs">
                                      {useCase}
                                    </Badge>
                                  ))}
                                </HStack>
                              )}
                              
                              {/* Footer with actions */}
                              <VStack w="full" spacing={2} pt={2} borderTop="1px" borderColor={borderColor}>
                                <HStack w="full" justify="space-between">
                                  <Badge colorScheme={info.language === 'Spanish' ? 'orange' : 'gray'} size="sm">
                                    {info.language}
                                  </Badge>
                                  <Button
                                    size="xs"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedProfile({
                                        id: speaker,
                                        name: info.name || speaker,
                                        description: info.description,
                                        language: info.language,
                                        type: 'preset',
                                        created_at: '',
                                      });
                                      toast({ title: `Selected ${info.name || speaker}`, status: 'success', duration: 2000 });
                                    }}
                                  >
                                    Select
                                  </Button>
                                </HStack>
                                <HStack w="full" spacing={2}>
                                  <Tooltip label="Play original Gemini TTS sample">
                                    <Button
                                      size="xs"
                                      flex={1}
                                      colorScheme="green"
                                      variant="outline"
                                      leftIcon={<Icon as={PlayIcon} boxSize={3} />}
                                      onClick={() => handleGeminiPreview(speaker)}
                                      isDisabled={isLoading}
                                    >
                                      Gemini
                                    </Button>
                                  </Tooltip>
                                  <Tooltip label="Play Qwen3 cloned voice">
                                    <Button
                                      size="xs"
                                      flex={1}
                                      colorScheme="purple"
                                      variant="solid"
                                      leftIcon={isLoading ? <Spinner size="xs" /> : <Icon as={PlayIcon} boxSize={3} />}
                                      onClick={() => handlePresetPreview(speaker)}
                                      isDisabled={isLoading}
                                    >
                                      Qwen3
                                    </Button>
                                  </Tooltip>
                                </HStack>
                              </VStack>
                            </VStack>
                          </CardBody>
                        </Card>
                      );
                    })}
                </SimpleGrid>
              )
            )}

            {/* My Profiles Content */}
            {activeTab === 3 && (
              voiceProfiles.length === 0 ? (
                  <Card bg={cardBg}>
                    <CardBody>
                      <VStack py={12} spacing={4}>
                        <Box p={4} bg="purple.100" borderRadius="full">
                          <UserCircleIcon className="w-12 h-12" style={{ color: 'purple' }} />
                        </Box>
                        <Text fontSize="lg" fontWeight="medium" color={textPrimary}>
                          No voice profiles yet
                        </Text>
                        <Text color={textSecondary} textAlign="center" maxW="md">
                          Create your first voice profile using Voice Design or Voice Clone, then use it across all your homelab services.
                        </Text>
                        <Button
                          colorScheme="purple"
                          leftIcon={<PlusIcon className="w-4 h-4" />}
                          onClick={() => setActiveTab(0)}
                        >
                          Create Voice Profile
                        </Button>
                      </VStack>
                    </CardBody>
                  </Card>
                ) : (
                  <SimpleGrid columns={3} spacing={4}>
                    {voiceProfiles.map((profile) => (
                      <Card
                        key={profile.id}
                        bg={cardBg}
                        cursor="pointer"
                        onClick={() => setSelectedProfile(profile)}
                        _hover={{ borderColor: accentColor }}
                        transition="all 0.2s"
                        border="2px solid"
                        borderColor={selectedProfile?.id === profile.id ? accentColor : 'transparent'}
                      >
                        <CardBody>
                          <VStack align="start" spacing={3}>
                            <HStack justify="space-between" w="full">
                              <Avatar size="sm" name={profile.name} bg="purple.500" />
                              <Menu>
                                <MenuButton
                                  as={IconButton}
                                  icon={<EllipsisVerticalIcon className="w-4 h-4" />}
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <MenuList>
                                  <MenuItem icon={<PlayIcon className="w-4 h-4" />} onClick={(e) => {
                                    e.stopPropagation();
                                    handlePreviewSavedVoice(profile);
                                  }}>
                                    Preview
                                  </MenuItem>
                                  <MenuItem icon={<DocumentDuplicateIcon className="w-4 h-4" />}>
                                    Duplicate
                                  </MenuItem>
                                  <MenuItem icon={<ShareIcon className="w-4 h-4" />}>
                                    Export
                                  </MenuItem>
                                  <MenuItem 
                                    icon={<TrashIcon className="w-4 h-4" />} 
                                    color="red.500"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteVoice(profile.id);
                                    }}
                                  >
                                    Delete
                                  </MenuItem>
                                </MenuList>
                              </Menu>
                            </HStack>
                            <Box>
                              <Text fontWeight="bold" color={textPrimary}>{profile.name}</Text>
                              <Text fontSize="xs" color={textSecondary} noOfLines={2}>
                                {profile.description}
                              </Text>
                            </Box>
                            <HStack flexWrap="wrap" gap={1}>
                              <Badge size="sm">{profile.language}</Badge>
                              <Badge size="sm" colorScheme="purple">{profile.type}</Badge>
                            </HStack>
                            {profile.tags && profile.tags.length > 0 && (
                              <HStack flexWrap="wrap" gap={1}>
                                {profile.tags.slice(0, 3).map((tag, i) => (
                                  <Badge key={i} size="sm" variant="outline">{tag}</Badge>
                                ))}
                              </HStack>
                            )}
                          </VStack>
                        </CardBody>
                      </Card>
                    ))}
                  </SimpleGrid>
              )
            )}
          </Box>
        </Flex>

        {/* Save Voice Modal */}
        <Modal isOpen={isSaveOpen} onClose={onSaveClose}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Save Voice Profile</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Profile Name</FormLabel>
                  <Input
                    value={newVoiceName}
                    onChange={(e) => setNewVoiceName(e.target.value)}
                    placeholder="e.g., Professional Narrator"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Description</FormLabel>
                  <Textarea
                    value={newVoiceDescription}
                    onChange={(e) => setNewVoiceDescription(e.target.value)}
                    placeholder="Describe this voice profile..."
                    rows={3}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Tags (comma separated)</FormLabel>
                  <Input
                    value={newVoiceTags}
                    onChange={(e) => setNewVoiceTags(e.target.value)}
                    placeholder="e.g., podcast, narrator, professional"
                  />
                </FormControl>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onSaveClose}>
                Cancel
              </Button>
              <Button
                colorScheme="purple"
                onClick={handleSaveVoice}
                isLoading={isLoading}
                isDisabled={!newVoiceName.trim()}
              >
                Save Profile
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Box>
    </DashboardLayout>
  );
}
