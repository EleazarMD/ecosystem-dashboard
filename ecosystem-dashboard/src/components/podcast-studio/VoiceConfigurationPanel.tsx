import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Select,
  FormControl,
  FormLabel,
  Badge,
  IconButton,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Divider,
  useToast,
  Collapse,
  useDisclosure,
  Code,
  Switch,
  Progress,
} from '@chakra-ui/react';
import { FiX, FiPlay, FiChevronDown, FiChevronUp, FiMic, FiHeadphones } from 'react-icons/fi';
import AudioPresetSelector from './AudioPresetSelector';
import SoundLibrarySelector from './SoundLibrarySelector';
import type { AudioPreset } from '@/lib/audio-presets';
import type { ProductionConfig } from '@/lib/sound-library';
import { DEFAULT_PRODUCTION_CONFIG } from '@/lib/sound-library';

interface ScriptSpeaker {
  id: string;
  name: string;
  role: string;
  gender?: 'male' | 'female';
  personality: string;
  lineCount: number;
}

interface VoiceAssignment {
  speakerId: string;
  voiceId: string;
  voiceName: string;
  voiceProvider: TTSProvider; // 'gemini' or 'openai'
  gender: 'male' | 'female' | 'neutral';
  accent: string;
  speakingRate: number;
  pitch: number;
}

interface ScriptMetadata {
  wordCount: number;
  dialogueCount: number;
  estimatedDuration: number;
  // Rich metadata from script generation backend
  podcastStyle?: string;
  audience?: string;
  language?: string;
  tone?: string;
  podcastFormat?: string;
  speakerProfiles?: Array<{ name: string; gender: string; role: string; personality: string }>;
}

interface AudioDirection {
  arcTemplate: string;
  baselineTone: string;
  language: string;
  phases: Array<{ phase: string; startTurn: number; endTurn: number; baseline: string }>;
  turnEmotions: Array<{ turnIndex: number; emotion: string; phase: string | null }>;
}

interface VoiceConfigurationPanelProps {
  scriptSpeakers: ScriptSpeaker[];
  onGenerate: (voiceAssignments: VoiceAssignment[], ttsModel?: string, productionConfig?: ProductionConfig) => void;
  onPreview?: (voiceAssignments: VoiceAssignment[]) => void; // For waveform preview
  isGenerating?: boolean;
  isGeneratingPreview?: boolean;
  selectedScriptId?: string | null;
  scriptMetadata?: ScriptMetadata | null;
  audioDirection?: AudioDirection | null;
  generatedScript?: any[]; // For waveform preview
  ttsModel?: string; // For waveform preview
  language?: string; // Script language (e.g., 'spanish', 'english')
  audioProgress?: {
    currentTurn: number;
    totalTurns: number;
    message: string;
    phase?: string;
    phaseDetail?: string;
    progress?: number; // 0-100 weighted
    estimatedTotalMs?: number;
    elapsedMs?: number;
  } | null;
}

import { GEMINI_VOICES, OPENAI_VOICES, ALL_VOICES, PROVIDER_INFO, type TTSProvider } from '../../types/tts-voices';
import { useSemanticToken } from '@/hooks/useSemanticToken';

// Qwen TTS Gateway
const QWEN_TTS_GATEWAY = '/api/ai-gateway/qwen-tts';

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

export default function VoiceConfigurationPanel({
  scriptSpeakers,
  onGenerate,
  onPreview,
  isGenerating = false,
  isGeneratingPreview = false,
  selectedScriptId,
  scriptMetadata,
  generatedScript,
  ttsModel,
  language,
  audioProgress,
  audioDirection,
}: VoiceConfigurationPanelProps) {
  // Use semantic tokens for theme compliance
  const bgColor = useSemanticToken('surface.elevated');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.tertiary');
  const borderColor = useSemanticToken('border.default');
  const surfaceHover = useSemanticToken('surface.hover');
  const toast = useToast();
  
  // Collapsible sections
  const { isOpen: isAdvancedOpen, onToggle: toggleAdvanced } = useDisclosure();
  
  // Debug: Log when scriptMetadata changes
  useEffect(() => {
    console.log('🎵 Voice Configuration Panel - Script Metadata:', {
      selectedScriptId,
      scriptMetadata,
      hasSpeakers: scriptSpeakers.length > 0,
    });
  }, [selectedScriptId, scriptMetadata, scriptSpeakers]);
  
  // Initialize voice assignments with smart defaults (only on mount)
  // Production music configuration
  const [productionConfig, setProductionConfig] = useState<ProductionConfig>(DEFAULT_PRODUCTION_CONFIG);
  
  // TTS Model selection (Qwen TTS)
  const [selectedTTSModel, setSelectedTTSModel] = useState<string>(ttsModel || 'gemini-2.5-flash-preview-tts');
  
  // Library voices from Qwen TTS
  const [libraryVoices, setLibraryVoices] = useState<Record<string, LibraryVoice>>({});
  
  // Fetch library voices on mount
  useEffect(() => {
    const fetchLibraryVoices = async () => {
      try {
        const res = await fetch(`${QWEN_TTS_GATEWAY}?action=library-voices`);
        if (res.ok) {
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await res.json();
            setLibraryVoices(data.voices || {});
          } else {
            console.warn('Library voices API returned non-JSON response');
          }
        }
      } catch (e) {
        console.warn('Library voices not available:', e);
      }
    };
    fetchLibraryVoices();
  }, []);
  
  // Default Qwen library voices for initial assignment - language-specific
  const DEFAULT_QWEN_VOICES_ENGLISH = [
    { id: 'american_male_refined', name: 'American Male (Refined)', gender: 'male', accent: 'American', language: 'english' },
    { id: 'american_female_warm', name: 'American Female (Warm)', gender: 'female', accent: 'American', language: 'english' },
    { id: 'american_male_warm', name: 'American Male (Warm)', gender: 'male', accent: 'American', language: 'english' },
    { id: 'american_female_professional', name: 'American Female (Professional)', gender: 'female', accent: 'American', language: 'english' },
  ];
  
  const DEFAULT_QWEN_VOICES_SPANISH = [
    { id: 'mexican_male_warm', name: 'Mexican Male (Warm)', gender: 'male', accent: 'Mexican', language: 'spanish' },
    { id: 'mexican_female_warm', name: 'Mexican Female (Warm)', gender: 'female', accent: 'Mexican', language: 'spanish' },
    { id: 'mexican_male_professional', name: 'Mexican Male (Professional)', gender: 'male', accent: 'Mexican', language: 'spanish' },
    { id: 'spanish_female_elegant', name: 'Spanish Female (Elegant)', gender: 'female', accent: 'Spanish', language: 'spanish' },
  ];
  
  // Default Gemini voices for Spanish content (all Gemini voices are multilingual)
  const DEFAULT_GEMINI_VOICES_SPANISH = [
    { id: 'Charon', name: 'Charon ⭐ DEEP', gender: 'male', accent: 'multilingual (Spanish)' },
    { id: 'Aoede', name: 'Aoede ⭐', gender: 'female', accent: 'multilingual (Spanish)' },
    { id: 'Puck', name: 'Puck ⭐', gender: 'male', accent: 'multilingual (Spanish)' },
    { id: 'Zephyr', name: 'Zephyr ⭐', gender: 'female', accent: 'multilingual (Spanish)' },
  ];
  
  const DEFAULT_GEMINI_VOICES_ENGLISH = [
    { id: 'Charon', name: 'Charon ⭐ DEEP', gender: 'male', accent: 'american' },
    { id: 'Aoede', name: 'Aoede ⭐', gender: 'female', accent: 'american' },
    { id: 'Puck', name: 'Puck ⭐', gender: 'male', accent: 'american' },
    { id: 'Kore', name: 'Kore ⭐', gender: 'female', accent: 'american' },
  ];

  // Select voices based on script language
  const isSpanish = language === 'spanish' || language === 'es';
  const DEFAULT_QWEN_VOICES = isSpanish ? DEFAULT_QWEN_VOICES_SPANISH : DEFAULT_QWEN_VOICES_ENGLISH;
  const DEFAULT_GEMINI_VOICES = isSpanish ? DEFAULT_GEMINI_VOICES_SPANISH : DEFAULT_GEMINI_VOICES_ENGLISH;

  // Gender-aware voice picker: selects a voice matching the speaker's gender
  // Tracks how many male/female voices have been assigned to rotate through options
  const pickVoiceByGender = (
    voices: { id: string; name: string; gender: string; accent: string }[],
    speakerGender: 'male' | 'female' | undefined,
    genderCounters: { male: number; female: number },
    fallbackIdx: number
  ) => {
    if (!speakerGender) {
      // No gender specified — fall back to index cycling
      return voices[fallbackIdx % voices.length];
    }
    const matching = voices.filter(v => v.gender === speakerGender);
    if (matching.length === 0) {
      return voices[fallbackIdx % voices.length];
    }
    const counter = genderCounters[speakerGender];
    genderCounters[speakerGender]++;
    return matching[counter % matching.length];
  };

  const [voiceAssignments, setVoiceAssignments] = useState<VoiceAssignment[]>(() => {
    const counters = { male: 0, female: 0 };
    // Use Gemini voices if default model is Gemini (which it now is)
    const initialModel = ttsModel || 'gemini-2.5-flash-preview-tts';
    const isGeminiDefault = initialModel.startsWith('gemini-');
    const voices = isGeminiDefault ? DEFAULT_GEMINI_VOICES : DEFAULT_QWEN_VOICES;
    const provider: TTSProvider = isGeminiDefault ? 'gemini' : 'qwen';
    
    return scriptSpeakers.map((speaker, idx) => {
      const voice = pickVoiceByGender(voices, speaker.gender, counters, idx);
      return {
        speakerId: speaker.id,
        voiceName: voice.name,
        voiceId: voice.id,
        voiceProvider: provider,
        gender: voice.gender as 'male' | 'female' | 'neutral',
        accent: voice.accent,
        speakingRate: 1.1,  // Slightly faster than default for more natural podcast pacing
        pitch: 0.0,
      };
    });
  });

  // Re-assign voices when language changes
  const prevLanguageRef = React.useRef<string>(language || 'english');
  useEffect(() => {
    const currentLang = language || 'english';
    if (currentLang !== prevLanguageRef.current) {
      prevLanguageRef.current = currentLang;
      const langIsSpanish = currentLang === 'spanish' || currentLang === 'es';
      const isGemini = selectedTTSModel?.startsWith('gemini-');
      
      if (isGemini) {
        const voices = langIsSpanish ? DEFAULT_GEMINI_VOICES_SPANISH : DEFAULT_GEMINI_VOICES_ENGLISH;
        const counters = { male: 0, female: 0 };
        setVoiceAssignments(prev =>
          prev.map((assignment, idx) => {
            const speakerGender = scriptSpeakers[idx]?.gender;
            const voice = pickVoiceByGender(voices, speakerGender, counters, idx);
            return {
              ...assignment,
              voiceName: voice.name,
              voiceId: voice.id,
              voiceProvider: 'gemini' as TTSProvider,
              gender: voice.gender as 'male' | 'female' | 'neutral',
              accent: voice.accent,
            };
          })
        );
      } else {
        const voices = langIsSpanish ? DEFAULT_QWEN_VOICES_SPANISH : DEFAULT_QWEN_VOICES_ENGLISH;
        const counters = { male: 0, female: 0 };
        setVoiceAssignments(prev =>
          prev.map((assignment, idx) => {
            const speakerGender = scriptSpeakers[idx]?.gender;
            const voice = pickVoiceByGender(voices, speakerGender, counters, idx);
            return {
              ...assignment,
              voiceName: voice.name,
              voiceId: voice.id,
              voiceProvider: 'qwen' as TTSProvider,
              gender: voice.gender as 'male' | 'female' | 'neutral',
              accent: voice.accent,
            };
          })
        );
      }
    }
  }, [language, selectedTTSModel]);

  // Re-assign voices when TTS model changes between Gemini and Qwen
  const prevTTSModelRef = React.useRef<string>(selectedTTSModel);
  useEffect(() => {
    const wasGemini = prevTTSModelRef.current?.startsWith('gemini-');
    const isGemini = selectedTTSModel?.startsWith('gemini-');
    
    if (wasGemini !== isGemini) {
      prevTTSModelRef.current = selectedTTSModel;
      
      if (isGemini) {
        // Switching TO Gemini — assign default Gemini voice names (language + gender aware)
        const langIsSpanish = (language || 'english') === 'spanish' || language === 'es';
        const defaultGeminiVoices = langIsSpanish ? DEFAULT_GEMINI_VOICES_SPANISH : DEFAULT_GEMINI_VOICES_ENGLISH;
        const counters = { male: 0, female: 0 };
        setVoiceAssignments(prev =>
          prev.map((assignment, idx) => {
            const speakerGender = scriptSpeakers[idx]?.gender;
            const voice = pickVoiceByGender(defaultGeminiVoices, speakerGender, counters, idx);
            return {
              ...assignment,
              voiceName: voice.name,
              voiceId: voice.id,
              voiceProvider: 'gemini' as TTSProvider,
              gender: voice.gender as 'male' | 'female' | 'neutral',
              accent: voice.accent,
            };
          })
        );
      } else {
        // Switching TO Qwen — assign default library voices (language + gender aware)
        const langIsSpanish = (language || 'english') === 'spanish' || language === 'es';
        const voices = langIsSpanish ? DEFAULT_QWEN_VOICES_SPANISH : DEFAULT_QWEN_VOICES_ENGLISH;
        const counters = { male: 0, female: 0 };
        setVoiceAssignments(prev =>
          prev.map((assignment, idx) => {
            const speakerGender = scriptSpeakers[idx]?.gender;
            const voice = pickVoiceByGender(voices, speakerGender, counters, idx);
            return {
              ...assignment,
              voiceName: voice.name,
              voiceId: voice.id,
              voiceProvider: 'qwen' as TTSProvider,
              gender: voice.gender as 'male' | 'female' | 'neutral',
              accent: voice.accent,
            };
          })
        );
      }
    } else {
      prevTTSModelRef.current = selectedTTSModel;
    }
  }, [selectedTTSModel]);

  // Track previous speaker IDs to detect actual changes
  const prevSpeakerIdsRef = React.useRef<string>('');
  const isInitializedRef = React.useRef(false);
  
  // Sync voice assignments ONLY when speakers are added/removed, preserving user settings
  useEffect(() => {
    // Create a stable key from speaker IDs and their genders
    const currentSpeakerKey = scriptSpeakers.map(s => `${s.id}:${s.gender || 'unknown'}`).sort().join(',');
    
    // Skip if nothing changed
    if (currentSpeakerKey === prevSpeakerIdsRef.current && isInitializedRef.current) {
      return;
    }
    
    // Check if this is the first time we have actual speakers with gender info
    const hasRealSpeakers = scriptSpeakers.length > 0 && scriptSpeakers.some(s => s.gender);
    const wasEmpty = !prevSpeakerIdsRef.current || prevSpeakerIdsRef.current === '';
    
    console.log('🎤 Speakers update:', {
      old: prevSpeakerIdsRef.current,
      new: currentSpeakerKey,
      hasRealSpeakers,
      wasEmpty,
      initialized: isInitializedRef.current
    });
    
    prevSpeakerIdsRef.current = currentSpeakerKey;
    isInitializedRef.current = true;
    
    // Determine which voice set to use based on current TTS model and language
    const isGemini = selectedTTSModel?.startsWith('gemini-');
    const langIsSpanish = (language || 'english') === 'spanish' || language === 'es';
    
    setVoiceAssignments((prev) => {
      // For first real assignment or when speakers change, assign fresh gender-matched voices
      const counters = { male: 0, female: 0 };
      
      return scriptSpeakers.map((speaker, idx) => {
        // Check if we have existing settings for this exact speaker
        const existing = prev.find(a => a.speakerId === speaker.id);
        
        // Only preserve if speaker ID matches AND the voice gender matches the speaker gender
        // This ensures we don't keep wrong-gender voices from initial empty state
        if (existing && (!speaker.gender || existing.gender === speaker.gender)) {
          return existing;
        }
        
        // Assign a new gender-matched voice
        if (isGemini) {
          const voices = langIsSpanish ? DEFAULT_GEMINI_VOICES_SPANISH : DEFAULT_GEMINI_VOICES_ENGLISH;
          const voice = pickVoiceByGender(voices, speaker.gender, counters, idx);
          return {
            speakerId: speaker.id,
            voiceName: voice.name,
            voiceId: voice.id,
            voiceProvider: 'gemini' as TTSProvider,
            gender: voice.gender as 'male' | 'female' | 'neutral',
            accent: voice.accent,
            speakingRate: existing?.speakingRate ?? 1.1,
            pitch: existing?.pitch ?? 0.0,
          };
        } else {
          const voices = langIsSpanish ? DEFAULT_QWEN_VOICES_SPANISH : DEFAULT_QWEN_VOICES_ENGLISH;
          const voice = pickVoiceByGender(voices, speaker.gender, counters, idx);
          return {
            speakerId: speaker.id,
            voiceName: voice.name,
            voiceId: voice.id,
            voiceProvider: 'qwen' as TTSProvider,
            gender: voice.gender as 'male' | 'female' | 'neutral',
            accent: voice.accent,
            speakingRate: existing?.speakingRate ?? 1.1,
            pitch: existing?.pitch ?? 0.0,
          };
        }
      });
    });
  }, [scriptSpeakers, selectedTTSModel, language]);

  // Debug: Log whenever voice assignments change
  useEffect(() => {
    console.log('🎤 Voice assignments updated:', voiceAssignments.map(a => ({
      speaker: a.speakerId.substring(0, 8),
      voice: a.voiceName,
      rate: a.speakingRate,
      pitch: a.pitch
    })));
  }, [voiceAssignments]);

  // Voice preview state
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [audioCache, setAudioCache] = useState<Map<string, HTMLAudioElement>>(new Map());
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const updateVoiceAssignment = (
    speakerId: string,
    field: keyof VoiceAssignment,
    value: any
  ) => {
    console.log(`🎚️ Updating ${field} for speaker ${speakerId}:`, value);
    setVoiceAssignments((prev) =>
      prev.map((assignment) =>
        assignment.speakerId === speakerId
          ? { ...assignment, [field]: value }
          : assignment
      )
    );
  };

  const handleVoiceChange = (speakerId: string, voiceId: string) => {
    const isGeminiModel = selectedTTSModel?.startsWith('gemini-');
    
    // When Gemini model is selected, look up from GEMINI_VOICES
    if (isGeminiModel) {
      const geminiVoice = GEMINI_VOICES.find(v => v.id === voiceId);
      if (geminiVoice) {
        console.log(`🎤 Changing voice for speaker ${speakerId} to Gemini voice ${geminiVoice.name}`);
        setVoiceAssignments((prev) =>
          prev.map((assignment) =>
            assignment.speakerId === speakerId
              ? {
                  ...assignment,
                  voiceId: geminiVoice.id,
                  voiceName: geminiVoice.name,
                  voiceProvider: 'gemini' as TTSProvider,
                  gender: geminiVoice.gender as 'male' | 'female' | 'neutral',
                  accent: geminiVoice.accent,
                  speakingRate: assignment.speakingRate,
                  pitch: assignment.pitch,
                }
              : assignment
          )
        );
        return;
      }
    }
    
    // Check library voices (Qwen)
    const libraryVoice = libraryVoices[voiceId];
    if (libraryVoice) {
      console.log(`🎤 Changing voice for speaker ${speakerId} to library voice ${libraryVoice.name}`);
      setVoiceAssignments((prev) =>
        prev.map((assignment) =>
          assignment.speakerId === speakerId
            ? {
                ...assignment,
                voiceId: voiceId,
                voiceName: libraryVoice.name,
                voiceProvider: 'qwen' as TTSProvider,
                gender: libraryVoice.gender as 'male' | 'female' | 'neutral',
                accent: libraryVoice.accent,
                speakingRate: assignment.speakingRate,
                pitch: assignment.pitch,
              }
            : assignment
        )
      );
      return;
    }
    
    // Fallback to ALL_VOICES
    const voice = ALL_VOICES.find((v) => v.id === voiceId);
    if (voice) {
      console.log(`🎤 Changing voice for speaker ${speakerId} to ${voice.name}`);
      setVoiceAssignments((prev) =>
        prev.map((assignment) =>
          assignment.speakerId === speakerId
            ? {
                ...assignment,
                voiceId: voice.id,
                voiceName: voice.name,
                voiceProvider: voice.provider,
                gender: voice.gender as 'male' | 'female' | 'neutral',
                accent: voice.accent,
                speakingRate: assignment.speakingRate,
                pitch: assignment.pitch,
              }
            : assignment
        )
      );
    }
  };

  const handleGenerate = () => {
    onGenerate(voiceAssignments, selectedTTSModel, productionConfig);
  };

  const handlePreview = () => {
    if (onPreview) {
      onPreview(voiceAssignments);
    }
  };

  const handleLoadAudioPreset = (preset: AudioPreset) => {
    // Map preset voice profiles to current speakers
    const updatedAssignments = voiceAssignments.map((assignment, idx) => {
      const presetProfile = preset.config.voiceProfiles[idx];
      if (presetProfile) {
        // Find matching voice from available voices
        const matchingVoice = ALL_VOICES.find(
          (v) => v.name === presetProfile.voiceName
        );
        
        if (matchingVoice) {
          return {
            ...assignment,
            voiceId: matchingVoice.id,
            voiceName: matchingVoice.name,
            voiceProvider: matchingVoice.provider,
            gender: matchingVoice.gender as 'male' | 'female' | 'neutral',
            accent: matchingVoice.accent,
            speakingRate: presetProfile.speakingRate,
            pitch: presetProfile.pitch,
          };
        }
      }
      return assignment;
    });
    
    setVoiceAssignments(updatedAssignments);
  };

  const getSpeakerColor = (idx: number) => {
    const colors = ['pink', 'blue', 'purple', 'green', 'orange', 'teal'];
    return colors[idx % colors.length];
  };

  const handlePreviewVoice = async (speakerId: string) => {
    const assignment = voiceAssignments.find((va) => va.speakerId === speakerId);
    
    if (!assignment) return;

    // Stop current playback if clicking the same voice
    if (playingVoice === speakerId) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingVoice(null);
      return;
    }

    // Show loading state
    setPlayingVoice(speakerId); // Add comment: Set playingVoice to speakerId to show loading state

    try {
      // Create cache key based on voice settings
      const cacheKey = `${assignment.voiceId}-${assignment.speakingRate}-${assignment.pitch}`;
      
      // Check cache first
      let audio = audioCache.get(cacheKey);
      
      if (!audio) {
        // Generate preview text based on speaker
        const speaker = scriptSpeakers.find((s) => s.id === speakerId);
        const previewText = speaker ? 
          `Hello, I'm ${speaker.name}. This is a sample of my voice for the podcast.` :
          `Hello! This is a high-quality voice preview using OpenAI TTS.`;

        console.log(`🎵 Generating TTS preview for ${assignment.voiceId} via ${assignment.voiceProvider}...`);

        // Call unified TTS API with provider selection
        const response = await fetch('/api/podcast-studio/voice-preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: previewText,
            voiceName: assignment.voiceId,
            voiceProvider: assignment.voiceProvider,
            speakingRate: assignment.speakingRate,
            pitch: assignment.pitch,
            ttsModel: selectedTTSModel,
          }),
        });

        if (!response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            console.error('❌ Voice preview error:', errorData);
            throw new Error(errorData.message || 'Failed to generate voice preview');
          } else {
            throw new Error(`Voice preview API error: ${response.status} ${response.statusText}`);
          }
        }

        // Create audio element from MP3 response
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        audio = new Audio(audioUrl);
        
        console.log('✅ Voice preview generated successfully');
        
        // Cache the audio
        const newCache = new Map(audioCache);
        newCache.set(cacheKey, audio);
        setAudioCache(newCache);
      } else {
        console.log('🎯 Using cached voice preview');
      }

      audioRef.current = audio;
      
      // Play and handle completion
      audio.onended = () => {
        setPlayingVoice(null);
        audioRef.current = null;
      };
      
      await audio.play();
    } catch (error) {
      console.error('Voice preview error:', error);
      setPlayingVoice(null);
      
      // Show error to user
      toast({
        title: 'Voice preview failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <VStack spacing={3} align="stretch">
      {/* Script Selection Status Banner */}
      {scriptMetadata ? (
        // Script is selected - Show details
        <Box
          p={4}
          bg={bgColor}
          borderRadius="xl"
          borderWidth="2px"
          borderColor="green.500"
        >
          <HStack justify="space-between" mb={2}>
            <Text fontSize="11px" fontWeight="700" color="green.500">
              ✓ SCRIPT SELECTED FOR AUDIO
            </Text>
            <Badge colorScheme="green" fontSize="9px">READY</Badge>
          </HStack>
          <HStack spacing={3} fontSize="13px" fontWeight="600" color={textColor}>
            <Text>{scriptMetadata.wordCount} words</Text>
            <Text>•</Text>
            <Text>{scriptMetadata.dialogueCount} exchanges</Text>
            <Text>•</Text>
            <Text>~{scriptMetadata.estimatedDuration} min</Text>
          </HStack>
          {/* Rich metadata badges */}
          {(scriptMetadata.podcastStyle || scriptMetadata.audience || scriptMetadata.language) && (
            <HStack spacing={2} mt={2} flexWrap="wrap">
              {scriptMetadata.podcastStyle && (
                <Badge colorScheme="purple" fontSize="9px" px={2}>
                  🎨 {scriptMetadata.podcastStyle}
                </Badge>
              )}
              {scriptMetadata.audience && scriptMetadata.audience !== 'general' && (
                <Badge colorScheme={scriptMetadata.audience === 'children' ? 'orange' : 'blue'} fontSize="9px" px={2}>
                  👥 {scriptMetadata.audience}
                </Badge>
              )}
              {scriptMetadata.language && (
                <Badge colorScheme="teal" fontSize="9px" px={2}>
                  🌐 {scriptMetadata.language}
                </Badge>
              )}
              {scriptMetadata.podcastFormat && (
                <Badge colorScheme="gray" fontSize="9px" px={2}>
                  📋 {scriptMetadata.podcastFormat}
                </Badge>
              )}
            </HStack>
          )}
          {/* Speaker profiles from script generation */}
          {scriptMetadata.speakerProfiles && scriptMetadata.speakerProfiles.length > 0 && (
            <VStack spacing={1} mt={2} align="stretch">
              {scriptMetadata.speakerProfiles.map((sp, idx) => (
                <HStack key={idx} spacing={2} fontSize="10px">
                  <Badge
                    colorScheme={sp.gender === 'female' ? 'pink' : sp.gender === 'male' ? 'blue' : 'gray'}
                    fontSize="8px"
                    px={1}
                  >
                    {sp.gender === 'female' ? '♀' : sp.gender === 'male' ? '♂' : '⚬'}
                  </Badge>
                  <Text fontWeight="600" color={textColor}>{sp.name}</Text>
                  <Text color={mutedColor}>— {sp.role}</Text>
                </HStack>
              ))}
            </VStack>
          )}
          {/* Emotional arc phases */}
          {audioDirection && audioDirection.phases && audioDirection.phases.length > 0 && (
            <Box mt={2}>
              <Text fontSize="9px" fontWeight="600" color={mutedColor} mb={1}>🎭 Emotional Arc</Text>
              <HStack spacing={0} h="6px" borderRadius="full" overflow="hidden">
                {audioDirection.phases.map((phase, idx) => {
                  const colors = ['purple.300', 'blue.300', 'green.300', 'orange.400', 'pink.300'];
                  const width = ((phase.endTurn - phase.startTurn) / (audioDirection.phases[audioDirection.phases.length - 1]?.endTurn || 1)) * 100;
                  return (
                    <Box
                      key={idx}
                      h="full"
                      w={`${width}%`}
                      bg={colors[idx % colors.length]}
                      title={`${phase.phase} (turns ${phase.startTurn}-${phase.endTurn}): ${phase.baseline}`}
                    />
                  );
                })}
              </HStack>
              <HStack spacing={1} mt={1} flexWrap="wrap">
                {audioDirection.phases.map((phase, idx) => {
                  const colors = ['purple', 'blue', 'green', 'orange', 'pink'];
                  return (
                    <Badge key={idx} colorScheme={colors[idx % colors.length]} fontSize="7px" px={1} variant="subtle">
                      {phase.phase}
                    </Badge>
                  );
                })}
              </HStack>
            </Box>
          )}
        </Box>
      ) : (
        // No script selected - Show instruction
        <Box
          p={4}
          bg={bgColor}
          borderRadius="xl"
          borderWidth="2px"
          borderColor="orange.500"
        >
          <HStack spacing={2} mb={2}>
            <Text fontSize="20px">📜</Text>
            <Text fontSize="12px" fontWeight="700" color="orange.500">
              NO SCRIPT SELECTED
            </Text>
          </HStack>
          <Text fontSize="12px" color={mutedColor}>
            Select a script from the left panel by clicking <Badge colorScheme="purple" fontSize="10px">Select for Audio</Badge>
          </Text>
        </Box>
      )}

      {/* TTS Model Selection - At Top */}
      <Box
        p={4}
        bg={bgColor}
        borderRadius="xl"
        border="2px solid"
        borderColor="purple.500"
      >
        <FormControl>
          <FormLabel fontSize="11px" fontWeight="600" mb={2} color={textColor}>
            🤖 Audio Generation Model
          </FormLabel>
          <Select
            value={selectedTTSModel}
            onChange={(e) => setSelectedTTSModel(e.target.value)}
            fontSize="13px"
            size="sm"
            borderRadius="lg"
            bg={bgColor}
          >
            <optgroup label="☁️ Cloud TTS (Gemini)">
              <option value="gemini-2.5-flash-preview-tts">⚡ Gemini 2.5 Flash TTS - Fast & Natural (Cloud)</option>
              <option value="gemini-2.5-pro-preview-tts">⭐ Gemini 2.5 Pro TTS - Premium Quality (Cloud)</option>
            </optgroup>
            <optgroup label="🖥️ Local TTS (Qwen3)">
              <option value="qwen-tts-base">🎙️ Qwen3 TTS Base - Cloned Library Voices (Local GPU)</option>
              <option value="qwen-tts-voice-design">🎨 Qwen3 TTS Voice Design - Custom Voices (Local GPU)</option>
              <option value="qwen-tts-custom-voice">🎭 Qwen3 TTS Custom Voice - Reference Audio (Local GPU)</option>
            </optgroup>
          </Select>
          <Text fontSize="10px" color={mutedColor} mt={2}>
            {selectedTTSModel?.startsWith('gemini-') ?
              `Gemini TTS (${selectedTTSModel?.includes('pro') ? 'Pro' : 'Flash'}): 30 built-in voices via Gemini API. ~$0.01–0.04 per 10-min podcast.` :
              selectedTTSModel === 'qwen-tts-base' ? 
              'Qwen3 Base: High-quality synthesis using pre-cloned library voices. Fast and reliable.' : 
              selectedTTSModel === 'qwen-tts-voice-design' ?
              'Voice Design: Create custom voices with natural language descriptions.' :
              'Custom Voice: Use cloned voices from reference audio samples.'}
          </Text>
        </FormControl>
      </Box>

      {/* Quick Start Presets - Cyan */}
      <Box
        p={4}
        bg={bgColor}
        borderRadius="xl"
        borderWidth="2px"
        borderColor="cyan.500"
      >
        <HStack justify="space-between" mb={3}>
          <HStack spacing={2}>
            <FiPlay />
            <Text fontSize="14px" fontWeight="700" color={textColor}>
              Quick Start Presets
            </Text>
          </HStack>
        </HStack>
        
        {/* Audio Preset Selector */}
        <AudioPresetSelector
          scriptSpeakers={scriptSpeakers}
          onLoadPreset={handleLoadAudioPreset}
        />
      </Box>

      {/* Voice Settings - Orange */}
      <Box
        p={4}
        bg={bgColor}
        borderRadius="xl"
        borderWidth="2px"
        borderColor="orange.500"
      >
        <HStack justify="space-between" mb={2}>
          <HStack spacing={2}>
            <FiMic />
            <Text fontSize="14px" fontWeight="700" color={textColor}>
              Voice Settings
            </Text>
          </HStack>
          <Badge colorScheme="orange" fontSize="10px" px={2}>
            {scriptSpeakers.length} SPEAKERS
          </Badge>
        </HStack>
        <Text fontSize="12px" color={mutedColor} mb={3}>
          Configure voice for each speaker
        </Text>

        {/* Production Music */}
        <SoundLibrarySelector
          value={productionConfig}
          onChange={setProductionConfig}
        />
        
        <Divider my={3} />

        {/* Voice Assignments */}
        <VStack spacing={2} align="stretch">
          {scriptSpeakers.map((speaker, idx) => {
            const assignment = voiceAssignments.find(
              (a) => a.speakerId === speaker.id
            );
            const speakerColor = getSpeakerColor(idx);

            return (
              <Box
                key={speaker.id}
                p={3}
                bg={useSemanticToken('surface.elevated')}
                borderRadius="md"
                borderWidth="1px"
                borderColor={useSemanticToken('border.default')}
              >
              {/* Speaker Info */}
              <HStack justify="space-between" mb={2}>
                <HStack spacing={2}>
                  <Box
                    w="8px"
                    h="8px"
                    borderRadius="full"
                    bg={`${speakerColor}.500`}
                  />
                  <VStack align="start" spacing={0}>
                    <Text fontSize="11px" fontWeight="600" color={textColor}>
                      🎙️ {speaker.name}
                    </Text>
                    <HStack spacing={2}>
                      <Badge fontSize="9px" colorScheme={speakerColor}>
                        {speaker.role}
                      </Badge>
                      <Text fontSize="9px" color={mutedColor}>
                        {speaker.lineCount} lines
                      </Text>
                    </HStack>
                  </VStack>
                </HStack>
              </HStack>

              <Text fontSize="10px" color={mutedColor} mb={3} fontStyle="italic">
                {speaker.personality}
              </Text>

              {/* Voice Selection */}
              <FormControl size="sm" mb={3}>
                <FormLabel fontSize="10px" mb={1}>
                  Select Voice
                </FormLabel>
                <Select
                  size="sm"
                  fontSize="11px"
                  value={assignment?.voiceId}
                  onChange={(e) => handleVoiceChange(speaker.id, e.target.value)}
                  borderRadius="md"
                >
                  {/* Gemini TTS Voices (when Gemini model selected) */}
                  {selectedTTSModel?.startsWith('gemini-') && (
                    <>
                      {/* Spanish-recommended voices shown first when Spanish is selected */}
                      {isSpanish && (
                        <>
                          <optgroup label="🇲🇽 Recommended Male (Spanish)">
                            {GEMINI_VOICES.filter(v => v.gender === 'male' && ['Charon', 'Puck', 'Algenib', 'Algieba', 'Orus'].includes(v.id))
                              .filter((v, i, arr) => arr.findIndex(x => x.id === v.id) === i)
                              .map((voice, idx) => (
                              <option key={`${speaker.id}-gemini-es-male-${voice.id}-${idx}`} value={voice.id}>
                                {voice.name} — {voice.personality} (Multilingual)
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="🇲🇽 Recommended Female (Spanish)">
                            {GEMINI_VOICES.filter(v => v.gender === 'female' && ['Aoede', 'Zephyr', 'Kore', 'Despina', 'Leda'].includes(v.id))
                              .filter((v, i, arr) => arr.findIndex(x => x.id === v.id) === i)
                              .map((voice, idx) => (
                              <option key={`${speaker.id}-gemini-es-fem-${voice.id}-${idx}`} value={voice.id}>
                                {voice.name} — {voice.personality} (Multilingual)
                              </option>
                            ))}
                          </optgroup>
                        </>
                      )}
                      <optgroup label={isSpanish ? "🔵 All Male Voices" : "⭐ Priority Male (Deep)"}>
                        {GEMINI_VOICES.filter(v => v.gender === 'male' && (isSpanish || v.characteristics?.includes('deep')))
                          .filter((v, i, arr) => arr.findIndex(x => x.id === v.id) === i)
                          .map((voice, idx) => (
                          <option key={`${speaker.id}-gemini-deep-${voice.id}-${idx}`} value={voice.id}>
                            {voice.name} — {voice.personality}
                          </option>
                        ))}
                      </optgroup>
                      {!isSpanish && (
                        <optgroup label="🔵 Other Male">
                          {GEMINI_VOICES.filter(v => v.gender === 'male' && !v.characteristics?.includes('deep'))
                            .filter((v, i, arr) => arr.findIndex(x => x.id === v.id) === i)
                            .map((voice, idx) => (
                            <option key={`${speaker.id}-gemini-male-${voice.id}-${idx}`} value={voice.id}>
                              {voice.name} — {voice.personality}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      <optgroup label={isSpanish ? "🔵 All Female Voices" : "⭐ Priority Female"}>
                        {GEMINI_VOICES.filter(v => v.gender === 'female' && (isSpanish || v.name.includes('⭐')))
                          .filter((v, i, arr) => arr.findIndex(x => x.id === v.id) === i)
                          .map((voice, idx) => (
                          <option key={`${speaker.id}-gemini-fpri-${voice.id}-${idx}`} value={voice.id}>
                            {voice.name} — {voice.personality}
                          </option>
                        ))}
                      </optgroup>
                      {!isSpanish && (
                        <optgroup label="🔵 Other Female">
                          {GEMINI_VOICES.filter(v => v.gender === 'female' && !v.name.includes('⭐'))
                            .filter((v, i, arr) => arr.findIndex(x => x.id === v.id) === i)
                            .map((voice, idx) => (
                            <option key={`${speaker.id}-gemini-fem-${voice.id}-${idx}`} value={voice.id}>
                              {voice.name} — {voice.personality}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </>
                  )}

                  {/* Qwen Library Voices (when Qwen model selected) */}
                  {!selectedTTSModel?.startsWith('gemini-') && Object.keys(libraryVoices).length > 0 && (
                    <>
                      <optgroup label="🎙️ American Male">
                        {Object.entries(libraryVoices)
                          .filter(([_, v]) => v.gender === 'male' && v.accent.includes('American'))
                          .map(([id, voice]) => (
                            <option key={`${speaker.id}-lib-${id}`} value={id}>
                              {voice.name} - {voice.style}
                            </option>
                          ))}
                      </optgroup>
                      <optgroup label="🎙️ American Female">
                        {Object.entries(libraryVoices)
                          .filter(([_, v]) => v.gender === 'female' && v.accent.includes('American'))
                          .map(([id, voice]) => (
                            <option key={`${speaker.id}-lib-${id}`} value={id}>
                              {voice.name} - {voice.style}
                            </option>
                          ))}
                      </optgroup>
                      <optgroup label="🎙️ British Female">
                        {Object.entries(libraryVoices)
                          .filter(([_, v]) => v.gender === 'female' && v.accent.includes('British'))
                          .map(([id, voice]) => (
                            <option key={`${speaker.id}-lib-${id}`} value={id}>
                              {voice.name} - {voice.style}
                            </option>
                          ))}
                      </optgroup>
                      <optgroup label="🎙️ Spanish/Mexican">
                        {Object.entries(libraryVoices)
                          .filter(([_, v]) => v.accent.includes('Mexican') || v.accent.includes('Castilian'))
                          .map(([id, voice]) => (
                            <option key={`${speaker.id}-lib-${id}`} value={id}>
                              {voice.name} - {voice.style}
                            </option>
                          ))}
                      </optgroup>
                    </>
                  )}
                  
                  {/* Fallback: Gemini Voices if library not loaded and Qwen selected */}
                  {!selectedTTSModel?.startsWith('gemini-') && Object.keys(libraryVoices).length === 0 && (
                    <optgroup label="🔵 Gemini TTS">
                      {GEMINI_VOICES.map((voice, idx) => (
                        <option key={`${speaker.id}-gemini-${voice.id}-${idx}`} value={voice.id}>
                          {voice.id} - {voice.personality}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </Select>
              </FormControl>

              {/* Voice Characteristics */}
              <HStack spacing={2} mb={2}>
                <Badge
                  colorScheme={
                    assignment?.gender === 'male'
                      ? 'blue'
                      : assignment?.gender === 'female'
                      ? 'pink'
                      : 'purple'
                  }
                  fontSize="9px"
                  textTransform="uppercase"
                >
                  {assignment?.gender}
                </Badge>
                <Badge colorScheme="gray" fontSize="9px" textTransform="uppercase">
                  {assignment?.accent}
                </Badge>
                <Badge 
                  colorScheme={selectedTTSModel?.startsWith('gemini-') ? 'blue' : libraryVoices[assignment?.voiceId || ''] ? 'purple' : 'green'}
                  fontSize="9px"
                  textTransform="uppercase"
                >
                  {selectedTTSModel?.startsWith('gemini-') ? '🔵 GEMINI' : libraryVoices[assignment?.voiceId || ''] ? '🎙️ LIBRARY' : '🖥️ QWEN'}
                </Badge>
              </HStack>

              {/* Advanced Settings */}
              <VStack spacing={2} align="stretch">
                <FormControl size="sm">
                  <HStack justify="space-between" mb={1}>
                    <FormLabel fontSize="10px" mb={0}>
                      Speaking Rate
                    </FormLabel>
                    <Text fontSize="10px" color={mutedColor}>
                      {assignment?.speakingRate.toFixed(1)}x
                    </Text>
                  </HStack>
                  <Slider
                    min={0.5}
                    max={2.0}
                    step={0.1}
                    value={assignment?.speakingRate || 1.0}
                    onChange={(value) =>
                      updateVoiceAssignment(speaker.id, 'speakingRate', value)
                    }
                    size="sm"
                  >
                    <SliderTrack bg={useSemanticToken('surface.elevated')}>
                      <SliderFilledTrack bg={`${speakerColor}.400`} />
                    </SliderTrack>
                    <SliderThumb boxSize={3} />
                  </Slider>
                </FormControl>

                <FormControl size="sm">
                  <HStack justify="space-between" mb={1}>
                    <FormLabel fontSize="10px" mb={0}>
                      Pitch
                    </FormLabel>
                    <Text fontSize="10px" color={mutedColor}>
                      {assignment?.pitch > 0 ? '+' : ''}
                      {assignment?.pitch.toFixed(1)}
                    </Text>
                  </HStack>
                  <Slider
                    min={-1.0}
                    max={1.0}
                    step={0.1}
                    value={assignment?.pitch || 0.0}
                    onChange={(value) =>
                      updateVoiceAssignment(speaker.id, 'pitch', value)
                    }
                    size="sm"
                  >
                    <SliderTrack bg={useSemanticToken('surface.elevated')}>
                      <SliderFilledTrack bg={`${speakerColor}.400`} />
                    </SliderTrack>
                    <SliderThumb boxSize={3} />
                  </Slider>
                </FormControl>
              </VStack>

              {/* Preview Button */}
              <Button
                size="xs"
                variant="ghost"
                leftIcon={<FiPlay />}
                mt={2}
                fontSize="10px"
                colorScheme={speakerColor}
                onClick={() => handlePreviewVoice(speaker.id)}
                isLoading={playingVoice === speaker.id}
                loadingText="Playing..."
              >
                {playingVoice === speaker.id ? 'Stop' : 'Preview Voice'}
              </Button>
            </Box>
          );
        })}
      </VStack>
    </Box>

      {/* Preview and Generate Buttons */}
      {onPreview && generatedScript && generatedScript.length > 0 && (
        <Button
          colorScheme="purple"
          size="sm"
          w="full"
          onClick={handlePreview}
          isLoading={isGeneratingPreview}
          loadingText="Generating Preview..."
          borderRadius="xl"
          fontWeight="600"
          fontSize="12px"
          leftIcon={<FiHeadphones />}
        >
          🎧 Generate Waveform Preview
        </Button>
      )}

      {/* Advanced Overlap Settings */}
      <Box
        p={4}
        bg={bgColor}
        borderRadius="xl"
        border="1px solid"
        borderColor={borderColor}
      >
        <Text fontSize="13px" fontWeight="600" color={textColor} mb={3}>
          🎛️ Advanced Overlap Settings
        </Text>
        
        <VStack spacing={3} align="stretch">
          {/* Auto-trim silence toggle */}
          <FormControl display="flex" alignItems="center" justifyContent="space-between">
            <FormLabel fontSize="11px" mb={0} color={textColor} htmlFor="trim-silence">
              ✂️ Auto-Trim Silence
            </FormLabel>
            <Switch
              id="trim-silence"
              size="sm"
              isChecked={productionConfig.trimSilence ?? true}
              onChange={(e) => setProductionConfig(prev => ({ ...prev, trimSilence: e.target.checked }))}
              colorScheme="green"
            />
          </FormControl>
          <Text fontSize="9px" color={mutedColor} mt={-2}>
            Trims trailing silence from each TTS clip for tighter pacing
          </Text>

          {/* Min/Max gap */}
          <FormControl>
            <HStack justify="space-between" mb={1}>
              <FormLabel fontSize="11px" mb={0} color={textColor}>Min Gap</FormLabel>
              <Text fontSize="10px" color={mutedColor}>{productionConfig.minGapMs ?? 80}ms</Text>
            </HStack>
            <Slider
              min={0}
              max={300}
              step={10}
              value={productionConfig.minGapMs ?? 80}
              onChange={(val) => setProductionConfig(prev => ({ ...prev, minGapMs: val }))}
              size="sm"
            >
              <SliderTrack bg={useSemanticToken('surface.elevated')}>
                <SliderFilledTrack bg="green.400" />
              </SliderTrack>
              <SliderThumb boxSize={3} />
            </Slider>
          </FormControl>

          <FormControl>
            <HStack justify="space-between" mb={1}>
              <FormLabel fontSize="11px" mb={0} color={textColor}>Max Gap</FormLabel>
              <Text fontSize="10px" color={mutedColor}>{productionConfig.maxGapMs ?? 500}ms</Text>
            </HStack>
            <Slider
              min={200}
              max={1000}
              step={50}
              value={productionConfig.maxGapMs ?? 500}
              onChange={(val) => setProductionConfig(prev => ({ ...prev, maxGapMs: val }))}
              size="sm"
            >
              <SliderTrack bg={useSemanticToken('surface.elevated')}>
                <SliderFilledTrack bg="green.400" />
              </SliderTrack>
              <SliderThumb boxSize={3} />
            </Slider>
          </FormControl>

          <FormControl>
            <FormLabel fontSize="11px" mb={1} color={textColor}>Overlap Duration</FormLabel>
            <Select
              fontSize="13px"
              size="sm"
              borderRadius="lg"
              bg={bgColor}
              value={productionConfig.overlapDuration ?? 'none'}
              onChange={(e) => setProductionConfig(prev => ({ ...prev, overlapDuration: e.target.value as any }))}
            >
              <option value="none">None - Clean cuts between speakers</option>
              <option value="short">Short (0.3s) - Quick interjections</option>
              <option value="medium">Medium (0.5s) - Natural overlaps</option>
              <option value="long">Long (0.8s) - Extended backchannels</option>
            </Select>
          </FormControl>

          <FormControl>
            <HStack justify="space-between" mb={1}>
              <FormLabel fontSize="11px" mb={0} color={textColor}>
                Overlap Voice Volume
              </FormLabel>
              <Text fontSize="10px" color={mutedColor}>{Math.round((productionConfig.overlapVolumeRatio ?? 0.7) * 100)}%</Text>
            </HStack>
            <Slider
              min={0.3}
              max={1.0}
              step={0.05}
              value={productionConfig.overlapVolumeRatio ?? 0.7}
              onChange={(val) => setProductionConfig(prev => ({ ...prev, overlapVolumeRatio: val }))}
              size="sm"
              isDisabled={productionConfig.overlapDuration === 'none'}
            >
              <SliderTrack bg={useSemanticToken('surface.elevated')}>
                <SliderFilledTrack bg="blue.400" />
              </SliderTrack>
              <SliderThumb boxSize={3} />
            </Slider>
          </FormControl>

          <FormControl>
            <FormLabel fontSize="11px" mb={1} color={textColor}>Backchannel Frequency</FormLabel>
            <Select
              fontSize="13px"
              size="sm"
              borderRadius="lg"
              bg={bgColor}
              value={productionConfig.backchannelFrequency ?? 'moderate'}
              onChange={(e) => setProductionConfig(prev => ({ ...prev, backchannelFrequency: e.target.value as any }))}
            >
              <option value="minimal">Minimal (5-10) - Subtle affirmations</option>
              <option value="moderate">Moderate (10-20) - Natural flow</option>
              <option value="frequent">Frequent (20-30) - Very interactive</option>
            </Select>
          </FormControl>
        </VStack>
      </Box>

      {/* Audio Generation Progress Bar */}
      {isGenerating && audioProgress && (() => {
        const weightedProgress = audioProgress.progress ?? Math.round((audioProgress.currentTurn / audioProgress.totalTurns) * 80);
        const elapsedMs = audioProgress.elapsedMs || 0;
        const elapsedSec = Math.floor(elapsedMs / 1000);
        const elapsedMin = Math.floor(elapsedSec / 60);
        const elapsedRemSec = elapsedSec % 60;
        const elapsedStr = elapsedMin > 0 ? `${elapsedMin}m ${elapsedRemSec}s` : `${elapsedSec}s`;
        // ETA: use weighted progress to estimate remaining time
        const etaMs = weightedProgress > 5 ? Math.round((elapsedMs / weightedProgress) * (100 - weightedProgress)) : (audioProgress.estimatedTotalMs || 0);
        const etaSec = Math.max(0, Math.floor(etaMs / 1000));
        const etaMin = Math.floor(etaSec / 60);
        const etaRemSec = etaSec % 60;
        const etaStr = etaMin > 0 ? `~${etaMin}m ${etaRemSec}s` : `~${etaSec}s`;
        const phaseColors: Record<string, string> = {
          initializing: 'gray',
          tts: 'blue',
          assembly: 'purple',
          mixing: 'orange',
          saving: 'green',
          complete: 'green',
          error: 'red',
        };
        const phaseLabels: Record<string, string> = {
          initializing: 'Initializing',
          tts: 'TTS Generation',
          assembly: 'Assembly',
          mixing: 'Mixing',
          saving: 'Saving',
          complete: 'Complete',
        };
        const phase = audioProgress.phase || 'tts';
        const phaseColor = phaseColors[phase] || 'blue';
        const phaseLabel = phaseLabels[phase] || phase;
        return (
          <Box
            p={3}
            bg={bgColor}
            borderRadius="md"
            border="1px solid"
            borderColor={`${phaseColor}.500`}
          >
            <HStack justify="space-between" mb={1}>
              <HStack spacing={2}>
                <Badge colorScheme={phaseColor} fontSize="8px" px={1.5}>
                  {phaseLabel}
                </Badge>
                <Text fontSize="11px" fontWeight="500" color={textColor} noOfLines={1}>
                  {audioProgress.phaseDetail || `${audioProgress.currentTurn}/${audioProgress.totalTurns} turns`}
                </Text>
              </HStack>
              <Text fontSize="12px" fontWeight="700" color={`${phaseColor}.500`}>
                {weightedProgress}%
              </Text>
            </HStack>
            <Progress
              value={weightedProgress}
              size="md"
              colorScheme={phaseColor}
              borderRadius="full"
              hasStripe
              isAnimated
            />
            <HStack justify="space-between" mt={1}>
              <Text fontSize="10px" color={mutedColor}>
                ⏱ {elapsedStr} elapsed
              </Text>
              <Text fontSize="10px" color={mutedColor}>
                {weightedProgress < 100 ? `${etaStr} remaining` : 'Done!'}
              </Text>
            </HStack>
          </Box>
        );
      })()}

      {/* Generate Audio Button - Blue */}
      <Button
        colorScheme="blue"
        size="md"
        w="full"
        onClick={handleGenerate}
        isLoading={isGenerating}
        loadingText={audioProgress ? `${audioProgress.progress ?? 0}% — ${audioProgress.phaseDetail || `Turn ${audioProgress.currentTurn}/${audioProgress.totalTurns}`}` : "Generating Audio..."}
        borderRadius="xl"
        fontWeight="600"
        fontSize="13px"
        leftIcon={<FiPlay />}
      >
        🎵 Generate Audio with Selected Voices
      </Button>

      {/* Info */}
      <Box
        p={3}
        bg={bgColor}
        borderRadius="md"
        borderLeft="3px solid"
        borderLeftColor="blue.500"
      >
        <Text fontSize="10px" color={textColor}>
          💡 <strong>Tip:</strong> Each speaker's voice can be customized independently.
          Adjust speaking rate and pitch to create unique personalities!
        </Text>
      </Box>
    </VStack>
  );
}
