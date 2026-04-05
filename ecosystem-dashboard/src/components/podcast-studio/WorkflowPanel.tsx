import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  IconButton,
  Divider,
  Icon,
  Badge,
  Select,
  FormControl,
  FormLabel,
  Textarea,
  Switch,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Input,
  Progress,
} from '@chakra-ui/react';
import { FiPlay, FiDownload, FiFileText, FiChevronDown, FiUsers, FiMusic, FiClock, FiLayers, FiGlobe } from 'react-icons/fi';
import VoiceConfigurationPanel from './VoiceConfigurationPanel';
import AudioPlayer from './AudioPlayer';
import PresetSelector from './PresetSelector';
import type { PodcastPreset } from '@/lib/podcast-presets';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface WorkflowPanelProps {
  researchMaterials?: any[];
  onScriptGenerated?: (script: any) => void;
  projectId?: string;
  existingScript?: any[];  // Script already loaded in project
  existingSpeakers?: any[];  // Speakers from loaded script
  seriesContext?: {
    seriesName: string;
    seriesDescription?: string;
    episodeNumber?: number;
    episodeType?: string;
  };
}

export default function WorkflowPanel({ 
  researchMaterials = [], 
  onScriptGenerated,
  projectId,
  existingScript = [],
  existingSpeakers = [],
  seriesContext
}: WorkflowPanelProps) {
  // Use semantic tokens for theme compliance
  const bgColor = useSemanticToken('surface.base');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.tertiary');
  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const borderSubtle = useSemanticToken('border.subtle');
  const surfaceHover = useSemanticToken('surface.hover');

  // Multi-stage production is always enabled - no fast mode option
  // Duration is now controlled by the length/duration selector below

  // Script generation parameters
  const [language, setLanguage] = useState<'english' | 'spanish'>('english');
  const [spanishDialect, setSpanishDialect] = useState<'mexican' | 'castilian'>('mexican');
  const [length, setLength] = useState('comprehensive');
  const [tone, setTone] = useState('conversational');
  const [audience, setAudience] = useState('general');
  // Style is auto-derived from podcastFormat, no separate state needed
  const [emphasis, setEmphasis] = useState('');
  const [includeStories, setIncludeStories] = useState(true);
  const [includeExamples, setIncludeExamples] = useState(true);
  
  // MODEL SELECTION - Script Generation Only
  const [scriptModel, setScriptModel] = useState<'qwen3-32b' | 'gemini-2-5-pro' | 'gemini-2-5-flash'>('qwen3-32b');
  
  // ENHANCED DIALOGUE CONTROLS (NotebookLM-style)
  const [disfluencyLevel, setDisfluencyLevel] = useState<'none' | 'low' | 'medium' | 'high'>('high');
  const [emotionalIntensity, setEmotionalIntensity] = useState<'subdued' | 'natural' | 'expressive' | 'very-expressive'>('expressive');
  const [interruptionFrequency, setInterruptionFrequency] = useState<'none' | 'occasional' | 'frequent'>('frequent');
  const [includeProsodyMarkers, setIncludeProsodyMarkers] = useState(true);
  const [includeEmphasis, setIncludeEmphasis] = useState(true);
  
  // NARRATIVE CONTROL SETTINGS
  const [informationDensity, setInformationDensity] = useState<'light' | 'moderate' | 'dense' | 'maximum'>('moderate');
  const [pacing, setPacing] = useState<'slow-reflective' | 'measured' | 'dynamic' | 'rapid-fire'>('measured');
  const [speakerBalance, setSpeakerBalance] = useState<'equal' | 'host-led' | 'expert-led' | 'interviewer-guest'>('equal');
  const [humorLevel, setHumorLevel] = useState<'none' | 'dry-wit' | 'light' | 'frequent'>('light');
  const [tangentAllowance, setTangentAllowance] = useState<'strict' | 'minimal' | 'moderate' | 'exploratory'>('moderate');
  const [technicalDepth, setTechnicalDepth] = useState<'surface' | 'accessible' | 'detailed' | 'expert'>('accessible');
  const [debateIntensity, setDebateIntensity] = useState<'agreeable' | 'mild-challenge' | 'balanced-debate' | 'adversarial'>('mild-challenge');
  
  // Active preset tracking
  const [activePresetName, setActivePresetName] = useState<string | null>(null);
  
  // Clear preset indicator when user manually changes settings
  const handleManualChange = () => {
    if (activePresetName) {
      setActivePresetName(null);  // User modified preset
    }
  };

  // Participant configuration (Phase 1)
  const [participantCount, setParticipantCount] = useState(2);
  const [podcastFormat, setPodcastFormat] = useState('roundtable');  // Co-host discussion format
  const [participants, setParticipants] = useState([
    { name: 'Alex', role: 'co-host', gender: 'female', personality: 'Curious and enthusiastic, asks insightful questions' },
    { name: 'Jordan', role: 'co-host', gender: 'male', personality: 'Knowledgeable guide, explains concepts clearly' },
  ]);
  
  // Auto-derive style from podcast format
  const getStyleFromFormat = (format: string): string => {
    const styleMap: Record<string, string> = {
      'roundtable': 'co-host',
      'interview': 'interview',
      'panel': 'co-host',  // Moderator + experts can use co-host style
      'debate': 'debate',
      'solo': 'monologue',
      'deep-dive': 'co-host',
      'casual': 'co-host',
      'qa': 'interview',
      'custom': 'co-host',
    };
    return styleMap[format] || 'co-host';
  };
  
  const style = getStyleFromFormat(podcastFormat);

  // Update participants array when count changes
  const handleParticipantCountChange = (newCount: number) => {
    setParticipantCount(newCount);
    handleManualChange();  // Clear preset indicator
    const current = [...participants];
    
    if (newCount > current.length) {
      // Add new participants with default names
      const defaultNames = ['Alex', 'Jordan', 'Sam', 'Taylor', 'Morgan', 'Casey'];
      const defaultGenders = ['female', 'male', 'male', 'female', 'male', 'female'];
      for (let i = current.length; i < newCount; i++) {
        current.push({
          name: defaultNames[i] || `Speaker${i + 1}`,
          role: 'co-host',  // All new participants default to co-host
          gender: defaultGenders[i] || 'neutral',
          personality: 'Thoughtful contributor with unique perspective',
        });
      }
    } else {
      // Remove excess participants
      current.splice(newCount);
    }
    
    setParticipants(current);
  };

  const updateParticipant = (index: number, field: 'name' | 'role' | 'gender' | 'personality', value: string) => {
    const updated = [...participants];
    updated[index] = { ...updated[index], [field]: value };
    setParticipants(updated);
  };

  // Script and audio state
  const [hasScript, setHasScript] = useState(existingScript.length > 0);
  const [scriptSpeakers, setScriptSpeakers] = useState<any[]>(existingSpeakers);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  
  // Update script state when existingScript prop changes (e.g., after generation or project load)
  React.useEffect(() => {
    if (existingScript.length > 0) {
      setHasScript(true);
      setScriptSpeakers(existingSpeakers);
    }
  }, [existingScript, existingSpeakers]);
  
  // Progress tracking
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStep, setGenerationStep] = useState('');
  const [generationMessage, setGenerationMessage] = useState('');

  const handleGenerateScript = async () => {
    // Validate research materials
    if (!researchMaterials || researchMaterials.length === 0) {
      return;
    }

    // Set generating state immediately and keep it
    setIsGeneratingScript(true);
    setGenerationProgress(5);
    setGenerationStep('starting');
    setGenerationMessage('Preparing request...');
    
    try {
      console.log('🎙️ Starting script generation...');
      console.log('📚 Materials:', researchMaterials.length);
      console.log('📝 Materials data:', researchMaterials);
      console.log('👥 Participants:', participantCount);
      console.log('⚙️ Full preset config:', {
        participantCount,
        podcastFormat,
        participants,
        tone,
        audience,
        style,
      });

      const requestPayload = {
        researchMaterials,
        preset: {
          participantCount,
          podcastFormat,
          participants,
          length,  // ✅ FIX: Add length parameter
          tone,
          audience,
          style,
          emphasis,
          includeStories,
          includeExamples,
        },
        projectId,
        stream: true,
        seriesContext: seriesContext || null,  // Pass series context if available
      };
      
      console.log('📤 Sending request:', JSON.stringify(requestPayload, null, 2));

      // Use multi-stage professional production pipeline
      const response = await fetch('/api/podcast-studio/multi-stage-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          researchMaterials,
          preset: {
            // Participant configuration
            participantCount,
            podcastFormat,
            participants,
            // Script configuration
            language,
            spanishDialect: language === 'spanish' ? spanishDialect : undefined,
            length,
            tone,
            audience,
            style,
            emphasis,
            includeStories,
            includeExamples,
            // Natural dialogue quality
            disfluencyLevel,
            emotionalIntensity,
            interruptionFrequency,
            includeProsodyMarkers,
            includeEmphasis,
            // Narrative control
            informationDensity,
            pacing,
            speakerBalance,
            humorLevel,
            tangentAllowance,
            technicalDepth,
            debateIntensity,
          },
          productionConfig: {
            // Target duration derived from length preset
            // executive: 5 min (~750 words), essential: 10 min (~1500 words), 
            // comprehensive: 20 min (~3000 words), deep-dive: 30 min (~4500 words)
            targetDuration: length === 'executive' ? 5 : length === 'essential' ? 10 : length === 'comprehensive' ? 20 : length === 'deep-dive' ? 30 : 15,
            productionQuality: 'premium', // Always use premium (5 stages)
            enableDirectorNotes: true,
            enableVoiceDirection: true,
            // AI Model selection
            producerModel: 'gemini-2-5-pro', // Strategic thinking
            writerModel: scriptModel, // User's choice
            directorModel: 'gemini-2-5-flash', // Creative review
          },
          projectId,
          seriesContext: seriesContext || null,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Get jobId from 202 Accepted response
      const { jobId } = await response.json();
      console.log('📊 Job started:', jobId);

      // Poll for progress updates every second
      let result: any = null;
      let pollError: Error | null = null;
      let lastProgress = 0;
      let lastStage = '';
      
      // Use a Promise-based polling approach that properly handles errors
      await new Promise<void>((resolve, reject) => {
        const pollInterval = setInterval(async () => {
          try {
            const statusResponse = await fetch(`/api/podcast-studio/generation-status?jobId=${jobId}`);
            if (!statusResponse.ok) {
              clearInterval(pollInterval);
              const errorText = await statusResponse.text();
              console.error('❌ Status fetch failed:', statusResponse.status, errorText);
              reject(new Error(`Failed to fetch status: ${statusResponse.status}`));
              return;
            }

            const status = await statusResponse.json();
            
            // Update progress UI
            setGenerationProgress(status.progress);
            setGenerationMessage(status.message);
            
            // Only log when progress or stage changes
            if (status.progress !== lastProgress || status.currentStage !== lastStage) {
              console.log(`📊 ${status.currentStage} (${status.progress}%): ${status.message}`);
              lastProgress = status.progress;
              lastStage = status.currentStage;
            }

            // Check if complete or error
            if (status.status === 'complete') {
              clearInterval(pollInterval);
              result = status.result;
              setGenerationProgress(100);
              setGenerationMessage('✅ Production complete!');
              resolve();
            } else if (status.status === 'error') {
              clearInterval(pollInterval);
              // Log the full error details for debugging
              console.error('❌ Script generation error from server:', {
                error: status.error,
                message: status.message,
                stage: status.currentStage,
                stageOutputs: status.stageOutputs,
              });
              reject(new Error(status.error || status.message || 'Generation failed'));
            }
          } catch (err) {
            clearInterval(pollInterval);
            console.error('❌ Polling error:', err);
            reject(err);
          }
        }, 1000); // Poll every second
        
        // Timeout after 10 minutes
        setTimeout(() => {
          clearInterval(pollInterval);
          reject(new Error('Generation timeout (>10 minutes)'));
        }, 600000);
      });
      
      console.log('✅ Multi-stage generation complete:', result);
      console.log('📊 Stages completed:', result.stageResults?.length);
      console.log('📝 Final script lines:', result.finalScript?.length);

      if (result.success && result.finalScript) {
        // Extract speakers from the script, matching against preset participants for gender
        const speakersSet = new Set(result.finalScript.map((turn: any) => turn.speaker));
        const speakers = Array.from(speakersSet).map((name, index) => {
          const nameStr = name as string;
          // Match by name (case-insensitive) against the configured participants
          const matchedParticipant = participants.find(
            p => p.name?.toLowerCase() === nameStr.toLowerCase()
          );
          return {
            id: `speaker-${index + 1}`,
            name: nameStr,
            gender: (matchedParticipant?.gender as 'male' | 'female' | undefined),
            role: matchedParticipant?.role,
          };
        });

        console.log('✅ Script generated successfully!');
        console.log('📝 Dialogue exchanges:', result.finalScript.length);
        console.log('👥 Speakers:', speakers);
        
        // Update state with generated script
        setScriptSpeakers(speakers);
        setHasScript(true);
        setGenerationProgress(100);
        setGenerationMessage('✅ Professional script complete! (5-stage pipeline)');
        
        // Call callback if provided with formatted script data
        console.log('📤 onScriptGenerated callback check:', { 
          hasCallback: !!onScriptGenerated, 
          callbackType: typeof onScriptGenerated,
          dialogueLength: result.finalScript?.length 
        });
        if (onScriptGenerated) {
          console.log('📤 Calling onScriptGenerated callback');
          onScriptGenerated({
            dialogue: result.finalScript,
            speakers: speakers,
            metadata: {
              productionQuality: 'premium',
              stagesCompleted: result.stageResults?.length || 5,
              language: language,
              timestamp: new Date().toISOString()
            }
          });
          console.log('✅ onScriptGenerated callback completed');
        } else {
          console.warn('⚠️ onScriptGenerated callback is not defined!');
        }

        // Show completion briefly, then hide progress bar
        setTimeout(() => {
          console.log('⏰ Hiding progress bar after 2s');
          setIsGeneratingScript(false);
        }, 2000);
      } else {
        // No script received
        console.error('❌ No script received from multi-stage generation!');
        console.log('Multi-stage result:', result);
        setGenerationMessage('No script generated - check server logs');
        setTimeout(() => {
          setIsGeneratingScript(false);
        }, 3000);
      }

    } catch (error) {
      // Log full error details for debugging
      console.error('❌ Script generation failed:', error);
      console.error('❌ Error details:', {
        name: error instanceof Error ? error.name : 'unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      // Build user-friendly error message
      let errorMessage = 'Generation failed';
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = '⏱️ Generation timeout (>5 min) - Please try again or use shorter content.';
        } else {
          errorMessage = `❌ ${error.message}`;
        }
      }
      
      // Update UI with error state
      setGenerationMessage(errorMessage);
      setGenerationProgress(0);
      
      // Reset generating state immediately so button is re-enabled
      setIsGeneratingScript(false);
      
      // Clear error message after showing it
      setTimeout(() => {
        setGenerationMessage('');
      }, 8000); // Show error for 8 seconds so user can read it
    }
  };

  const handleGenerateAudio = async (voiceAssignments: any) => {
    setIsGeneratingAudio(true);
    
    try {
      console.log('🎵 Starting audio generation with voice assignments:', voiceAssignments);
      console.log('📄 Script:', existingScript);

      const response = await fetch('/api/podcast-studio/generate-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          script: existingScript,
          voiceAssignments: voiceAssignments,
          speakers: scriptSpeakers,
          projectId: projectId,
          language: language,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Audio generation failed');
      }

      // Get audio as blob
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // Get duration from header if available
      const duration = parseFloat(response.headers.get('X-Audio-Duration') || '0');
      
      console.log('✅ Audio generated successfully!', {
        size: audioBlob.size,
        duration: duration ? `${duration}s` : 'unknown'
      });

      // Store audio URL and duration for playback controls
      setGeneratedAudioUrl(audioUrl);
      setAudioDuration(duration);

      console.log('🎵 Audio ready for playback');

    } catch (error) {
      console.error('❌ Audio generation error:', error);
      alert(`Failed to generate audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const handleExportScript = () => {
    console.log('Export script');
  };

  // Load preset configuration
  const handleLoadPreset = (preset: PodcastPreset) => {
    const config = preset.config;
    
    // Update all configuration states
    setActivePresetName(preset.name);  // Track which preset is active
    setParticipantCount(config.participantCount);
    setPodcastFormat(config.podcastFormat);  // Style is auto-derived from this
    setParticipants(config.participants);
    setLength(config.length);
    setTone(config.tone);
    setAudience(config.audience);
    // Style is auto-derived from podcastFormat, no need to set it
    setEmphasis(config.emphasis || '');
    setIncludeStories(config.includeStories);
    setIncludeExamples(config.includeExamples);
    
    // Language settings
    if (config.language !== undefined) setLanguage(config.language);
    if (config.spanishDialect !== undefined) setSpanishDialect(config.spanishDialect);
    // Natural dialogue quality settings
    if (config.disfluencyLevel !== undefined) setDisfluencyLevel(config.disfluencyLevel);
    if (config.emotionalIntensity !== undefined) setEmotionalIntensity(config.emotionalIntensity);
    if (config.interruptionFrequency !== undefined) setInterruptionFrequency(config.interruptionFrequency);
    if (config.includeProsodyMarkers !== undefined) setIncludeProsodyMarkers(config.includeProsodyMarkers);
    if (config.includeEmphasis !== undefined) setIncludeEmphasis(config.includeEmphasis);
    // Narrative control settings
    if (config.informationDensity !== undefined) setInformationDensity(config.informationDensity);
    if (config.pacing !== undefined) setPacing(config.pacing);
    if (config.speakerBalance !== undefined) setSpeakerBalance(config.speakerBalance);
    if (config.humorLevel !== undefined) setHumorLevel(config.humorLevel);
    if (config.tangentAllowance !== undefined) setTangentAllowance(config.tangentAllowance);
    if (config.technicalDepth !== undefined) setTechnicalDepth(config.technicalDepth);
    if (config.debateIntensity !== undefined) setDebateIntensity(config.debateIntensity);
  };

  // Get current configuration for saving
  const getCurrentConfig = (): PodcastPreset['config'] => {
    return {
      participantCount,
      podcastFormat,
      participants,
      length,
      tone,
      audience,
      style,
      emphasis,
      includeStories,
      includeExamples,
      // Language settings
      language,
      spanishDialect: language === 'spanish' ? spanishDialect : undefined,
      // Natural dialogue quality settings
      disfluencyLevel,
      emotionalIntensity,
      interruptionFrequency,
      includeProsodyMarkers,
      includeEmphasis,
      // Narrative control settings
      informationDensity,
      pacing,
      speakerBalance,
      humorLevel,
      tangentAllowance,
      technicalDepth,
      debateIntensity,
    };
  };

  return (
    <VStack spacing={0} align="stretch" h="full" overflowY="auto" bg={bgColor}>
      {/* Preset Selector - At Top, Outside Script Controls */}
      <Box px={3} py={3} borderBottom="1px solid" borderColor={borderSubtle}>
        {/* Presets - Enhanced Card */}
        <Box
          p={5}
          bg={cardBg}
          borderRadius="xl"
          border="2px solid"
          borderColor="teal.500"
          transition="all 0.2s"
          _hover={{ transform: 'translateY(-2px)', shadow: 'md' }}
        >
          <VStack spacing={4} align="stretch">
            <HStack justify="space-between" align="flex-start" spacing={3}>
              <HStack spacing={2} flex={1} minW={0}>
                <Icon as={FiPlay} color="teal.500" flexShrink={0} />
                <Text fontSize="13px" fontWeight="600" color={textColor} flexShrink={0}>
                  Quick Start Presets
                </Text>
              </HStack>
              {activePresetName && (
                <Badge 
                  colorScheme="teal" 
                  fontSize="9px" 
                  px={2} 
                  py={1} 
                  maxW="200px"
                  flexShrink={0}
                >
                  <Text isTruncated>✓ {activePresetName}</Text>
                </Badge>
              )}
            </HStack>
            
            <PresetSelector
              currentConfig={getCurrentConfig()}
              onLoadPreset={handleLoadPreset}
            />
            
            {activePresetName && (
              <Box
                p={3}
                bg={surfaceHover}
                borderRadius="md"
                borderLeft="4px solid"
                borderColor="teal.500"
              >
                <HStack spacing={2} align="flex-start">
                  <Text fontSize="10px" fontWeight="500" color={textColor} lineHeight="1.5">
                    ✓ Using <Text as="span" fontWeight="600" isTruncated maxW="180px" display="inline-block">"{activePresetName}"</Text> preset • Modify settings below to customize
                  </Text>
                </HStack>
              </Box>
            )}
          </VStack>
        </Box>
      </Box>

      {/* AI Model Selection - At Top */}
      <Box px={3} pt={3}>
        <Box
          p={4}
          bg={cardBg}
          borderRadius="xl"
          border="2px solid"
          borderColor="purple.500"
          transition="all 0.2s"
          _hover={{ transform: 'translateY(-2px)', shadow: 'md' }}
        >
          <VStack spacing={3} align="stretch">
            <HStack justify="space-between" align="center">
              <Text fontSize="13px" fontWeight="600" color={textColor}>
                🤖 AI Model Selection
              </Text>
              <Badge colorScheme="purple" fontSize="9px" px={2} py={0.5}>
                WRITER STAGE ONLY
              </Badge>
            </HStack>
            
            <FormControl>
              <FormLabel fontSize="11px" mb={1} color={mutedColor}>Writer Model (Stage 2 of 5)</FormLabel>
              <Select
                value={scriptModel}
                onChange={(e) => {
                  setScriptModel(e.target.value as any);
                  handleManualChange();
                }}
                fontSize="13px"
                size="sm"
                borderRadius="lg"
              >
                <option value="qwen3-32b">🏠 Qwen3 32B - Local vLLM (Free)</option>
                <option value="gemini-2-5-pro">⭐ Gemini 2.5 Pro - Best Quality (~$0.02/script)</option>
                <option value="gemini-2-5-flash">⚡ Gemini 2.5 Flash - Fast & Cost-Efficient (~$0.001/script)</option>
              </Select>
              <Text fontSize="10px" color={mutedColor} mt={1}>
                {scriptModel === 'qwen3-32b' ?
                  'Local: Free, fast, runs on your own hardware with full privacy' :
                  scriptModel === 'gemini-2-5-pro' ? 
                  'Pro: Superior emotional depth, natural interruptions, rich character voices' : 
                  'Flash: Quick generation, good quality, 10x cheaper'}
              </Text>
            </FormControl>

            <Box
              p={2}
              bg={surfaceHover}
              borderRadius="md"
              fontSize="10px"
              color={textColor}
            >
              <Text fontWeight="600" mb={1}>Other stages use optimized models:</Text>
              <Text>• Stage 1 (Producer): Pro - Strategic thinking</Text>
              <Text>• Stage 3 (Director): Flash - Creative review</Text>
              <Text>• Stage 4 (Voice Director): Flash - Annotations</Text>
              <Text>• Stage 5 (Editor): Flash - Quality assurance</Text>
            </Box>
          </VStack>
        </Box>
      </Box>

      {/* Source Materials Banner - Matches Voice Config "SCRIPT SELECTED" style */}
      <Box px={3} pt={3}>
        {researchMaterials.length > 0 ? (
          <Box
            p={4}
            bg={cardBg}
            borderRadius="xl"
            borderWidth="2px"
            borderColor="green.500"
          >
            <HStack justify="space-between" mb={2}>
              <Text fontSize="11px" fontWeight="700" color="green.500">
                ✓ {researchMaterials.length} SOURCE{researchMaterials.length !== 1 ? 'S' : ''} SELECTED
              </Text>
              <Badge colorScheme="green" fontSize="9px">READY</Badge>
            </HStack>
            <HStack spacing={3} fontSize="13px" fontWeight="600" color={textColor} mb={researchMaterials.length > 0 ? 2 : 0}>
              <Text>{researchMaterials.reduce((sum, m) => sum + (m.wordCount || 0), 0).toLocaleString()} words</Text>
              <Text>•</Text>
              <Text>~{Math.ceil(researchMaterials.reduce((sum, m) => sum + (m.wordCount || 0), 0) / 250)} pages</Text>
            </HStack>
            <VStack align="stretch" spacing={1}>
              {researchMaterials.map((material, idx) => (
                <HStack
                  key={material.id}
                  spacing={2}
                  p={2}
                  bg={surfaceHover}
                  borderRadius="md"
                  borderLeft="3px solid"
                  borderLeftColor="green.400"
                >
                  <Icon as={FiFileText} color="green.500" boxSize={3} flexShrink={0} />
                  <VStack align="start" spacing={0} flex={1} minW={0}>
                    <Text fontSize="12px" fontWeight="600" color={textColor} noOfLines={1}>
                      {material.title || `Source ${idx + 1}`}
                    </Text>
                    <HStack spacing={2} fontSize="10px" color={mutedColor}>
                      <Text>{(material.wordCount || 0).toLocaleString()} words</Text>
                      {material.metadata?.keyTopics && material.metadata.keyTopics.length > 0 && (
                        <>
                          <Text>•</Text>
                          <Text noOfLines={1}>{material.metadata.keyTopics.slice(0, 3).join(', ')}</Text>
                        </>
                      )}
                    </HStack>
                  </VStack>
                </HStack>
              ))}
            </VStack>
          </Box>
        ) : (
          <Box
            p={4}
            bg={cardBg}
            borderRadius="xl"
            borderWidth="2px"
            borderColor="orange.500"
          >
            <HStack spacing={2} mb={2}>
              <Text fontSize="20px">📄</Text>
              <Text fontSize="12px" fontWeight="700" color="orange.500">
                NO SOURCES SELECTED
              </Text>
            </HStack>
            <Text fontSize="12px" color={mutedColor}>
              Select research materials from the left panel to generate a script
            </Text>
          </Box>
        )}
      </Box>

      {/* Compact Script Configuration */}
      <VStack spacing={3} align="stretch" px={3} pt={3} pb={24}>

        {/* Language Selection Card - First */}
        <Box
          p={4}
          bg={cardBg}
          borderRadius="xl"
          border="2px solid"
          borderColor="green.500"
          transition="all 0.2s"
          _hover={{ transform: 'translateY(-2px)', shadow: 'md' }}
        >
          <VStack spacing={3} align="stretch">
            <FormControl>
              <FormLabel fontSize="13px" fontWeight="600" color={textColor} mb={2}>
                <HStack spacing={2}>
                  <Icon as={FiGlobe} />
                  <Text>Podcast Language</Text>
                </HStack>
              </FormLabel>
              <Select 
                value={language} 
                onChange={(e) => {
                  setLanguage(e.target.value as 'english' | 'spanish');
                  handleManualChange();
                }}
                fontSize="14px"
                fontWeight="500"
                borderRadius="lg"
                bg={useSemanticToken('surface.elevated')}
                border="2px solid"
                borderColor="green.500"
                _hover={{ borderColor: 'green.400' }}
                _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px var(--chakra-colors-green-500)' }}
              >
                <option value="english">🇺🇸 English</option>
                <option value="spanish">🇪🇸 Español (Spanish)</option>
              </Select>
            </FormControl>
            
            {/* Spanish Dialect Selector - Only shown when Spanish is selected */}
            {language === 'spanish' && (
              <FormControl>
                <FormLabel fontSize="11px" mb={1} color={mutedColor}>Spanish Dialect</FormLabel>
                <Select
                  value={spanishDialect}
                  onChange={(e) => {
                    setSpanishDialect(e.target.value as 'mexican' | 'castilian');
                    handleManualChange();
                  }}
                  fontSize="13px"
                  size="sm"
                  borderRadius="lg"
                  bg={useSemanticToken('surface.elevated')}
                >
                  <option value="mexican">🇲🇽 Mexican Spanish - Latin American vocabulary</option>
                  <option value="castilian">🇪🇸 Castilian Spanish - European vocabulary</option>
                </Select>
                <Text fontSize="10px" color={mutedColor} mt={1}>
                  {spanishDialect === 'mexican' 
                    ? 'Uses "ustedes", Mexican expressions, avoids "vosotros"' 
                    : 'Uses "vosotros", Iberian expressions and vocabulary'}
                </Text>
              </FormControl>
            )}
          </VStack>
        </Box>
        
        {/* Participants - Enhanced Card */}
        <Box
          p={4}
          bg={cardBg}
          borderRadius="xl"
          border="2px solid"
          borderColor="orange.500"
          transition="all 0.2s"
          _hover={{ transform: 'translateY(-2px)', shadow: 'md' }}
        >
          <VStack spacing={3} align="stretch">
            <HStack justify="space-between">
              <HStack spacing={2}>
                <Icon as={FiUsers} color="orange.500" />
                <Text fontSize="13px" fontWeight="600" color={textColor}>
                  Participants
                </Text>
                <Badge colorScheme="orange" fontSize="10px">{participantCount} SPEAKERS</Badge>
              </HStack>
              <HStack spacing={1}>
                <IconButton
                  size="xs"
                  aria-label="Remove speaker"
                  icon={<Text fontWeight="bold">−</Text>}
                  onClick={() => handleParticipantCountChange(participantCount - 1)}
                  isDisabled={participantCount <= 2}
                  colorScheme="orange"
                  variant="outline"
                />
                <IconButton
                  size="xs"
                  aria-label="Add speaker"
                  icon={<Text fontWeight="bold">+</Text>}
                  onClick={() => handleParticipantCountChange(participantCount + 1)}
                  isDisabled={participantCount >= 6}
                  colorScheme="orange"
                  variant="outline"
                />
              </HStack>
            </HStack>
            
            <FormControl>
              <FormLabel fontSize="12px" mb={2} fontWeight="600" color={textColor}>
                Format
              </FormLabel>
              <Select
                value={podcastFormat}
                onChange={(e) => {
                  setPodcastFormat(e.target.value);
                  handleManualChange();
                }}
                fontSize="14px"
                fontWeight="500"
                borderRadius="lg"
                bg={useSemanticToken('surface.elevated')}
                border="2px solid"
                borderColor="orange.500"
                _hover={{ borderColor: 'orange.400' }}
                _focus={{ borderColor: 'orange.500', boxShadow: '0 0 0 1px var(--chakra-colors-orange-500)' }}
              >
                <option value="roundtable">🔄 Roundtable - Co-hosts discussing</option>
                <option value="interview">🎙️ Interview - Host(s) + Guest</option>
                <option value="panel">👥 Panel - Moderator + Experts</option>
                <option value="debate">⚔️ Debate - Opposing viewpoints</option>
                <option value="solo">📻 Solo - Single host narrating</option>
                <option value="deep-dive">📚 Deep Dive - Extended exploration</option>
                <option value="casual">💬 Casual Chat - Free-flowing conversation</option>
                <option value="qa">❓ Q&A - Answering questions</option>
                <option value="custom">⚙️ Custom - Mix roles as needed</option>
              </Select>
            </FormControl>

            {/* Collapsible Roles */}
            <Accordion allowToggle>
              <AccordionItem border="none">
                <AccordionButton 
                  px={0} 
                  py={2}
                  _hover={{ bg: surfaceHover }}
                  borderRadius="md"
                >
                  <HStack flex="1">
                    <Text fontSize="12px" fontWeight="600" color={textColor}>
                      ✏️ Edit Roles & Personalities
                    </Text>
                  </HStack>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel px={0} py={3}>
                  <VStack spacing={3}>
                    {participants.map((participant, index) => (
                      <Box
                        key={index}
                        w="full"
                        p={3}
                        bg={useSemanticToken('surface.elevated')}
                        borderRadius="md"
                        border="1px solid"
                        borderColor={borderSubtle}
                      >
                        <VStack spacing={2} align="stretch">
                          <HStack>
                            <Badge colorScheme="orange" fontSize="9px">
                              SPEAKER {index + 1}
                            </Badge>
                          </HStack>
                          <HStack spacing={2}>
                            <Input
                              size="sm"
                              fontSize="13px"
                              placeholder="Name (e.g., Alex)"
                              value={participant.name || ''}
                              onChange={(e) => {
                                updateParticipant(index, 'name', e.target.value);
                                handleManualChange();
                              }}
                              fontWeight="600"
                              flex="1"
                            />
                            <Select
                              size="sm"
                              fontSize="12px"
                              value={participant.gender || 'neutral'}
                              onChange={(e) => {
                                updateParticipant(index, 'gender', e.target.value);
                                handleManualChange();
                              }}
                              w="110px"
                            >
                              <option value="female">♀️ Female</option>
                              <option value="male">♂️ Male</option>
                              <option value="neutral">⚧ Neutral</option>
                            </Select>
                          </HStack>
                          <Select
                            size="sm"
                            fontSize="13px"
                            value={participant.role}
                            onChange={(e) => {
                              updateParticipant(index, 'role', e.target.value);
                              handleManualChange();
                            }}
                            fontWeight="500"
                          >
                            <option value="host">👤 Host</option>
                            <option value="co-host">🤝 Co-host</option>
                            <option value="expert">🎓 Expert</option>
                            <option value="guest">✨ Guest</option>
                            <option value="moderator">⚖️ Moderator</option>
                            <option value="panelist">💬 Panelist</option>
                          </Select>
                          <Input
                            size="sm"
                            fontSize="12px"
                            placeholder="Personality traits..."
                            value={participant.personality}
                            onChange={(e) => {
                              updateParticipant(index, 'personality', e.target.value);
                              handleManualChange();
                            }}
                          />
                        </VStack>
                      </Box>
                    ))}
                  </VStack>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
          </VStack>
        </Box>

        <Divider />

        {/* Core Settings - Enhanced Visual Cards */}
        <VStack spacing={3} align="stretch">
          {/* Length & Duration Card */}
          <Box
            p={4}
            bg={cardBg}
            borderRadius="xl"
            border="2px solid"
            borderColor="blue.500"
            transition="all 0.2s"
            _hover={{ transform: 'translateY(-2px)', shadow: 'md' }}
          >
            <FormControl>
              <FormLabel fontSize="13px" mb={2} fontWeight="600" color={textColor}>
                <HStack spacing={2}>
                  <Icon as={FiClock} />
                  <Text>Target Duration</Text>
                </HStack>
              </FormLabel>
              <Select 
                value={length} 
                onChange={(e) => setLength(e.target.value)}
                fontSize="14px"
                fontWeight="500"
                borderRadius="lg"
                bg={useSemanticToken('surface.elevated')}
                border="2px solid"
                borderColor="blue.500"
                _hover={{ borderColor: 'blue.400' }}
                _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)' }}
              >
                <option value="executive">🎯 Executive (3-5 min) - Key insights only</option>
                <option value="essential">⚡ Essential (5-7 min) - Essential information</option>
                <option value="comprehensive">📝 Comprehensive (10-15 min) - Full coverage</option>
                <option value="deep-dive">📚 Deep Dive (20-30 min) - In-depth exploration</option>
              </Select>
            </FormControl>
          </Box>

          {/* Advanced Script Options - Collapsible */}
          <Box
            p={4}
            bg={cardBg}
            borderRadius="xl"
            border="2px solid"
            borderColor="cyan.500"
            transition="all 0.2s"
          >
            <Accordion allowToggle>
              <AccordionItem border="none">
                <AccordionButton px={0} py={1} _hover={{ bg: 'transparent' }}>
                  <HStack flex="1" spacing={2}>
                    <Icon as={FiLayers} color="cyan.500" />
                    <Text fontSize="13px" fontWeight="600" color={textColor}>
                      Advanced Script Options
                    </Text>
                    <Badge colorScheme="cyan" fontSize="9px">12 CONTROLS</Badge>
                  </HStack>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel px={0} pt={3} pb={0}>
                  <VStack spacing={4} align="stretch">
                    {/* Natural Dialogue Quality Section */}
                    <Box p={3} bg={surfaceHover} borderRadius="md" borderLeft="3px solid" borderLeftColor="green.400">
                      <Text fontSize="12px" fontWeight="600" color={textColor} mb={2}>
                        🎭 Natural Dialogue Quality
                      </Text>
                      <VStack spacing={2} align="stretch">
                        <FormControl>
                          <FormLabel fontSize="10px" mb={1} color={mutedColor}>Disfluencies</FormLabel>
                          <Select value={disfluencyLevel} onChange={(e) => { setDisfluencyLevel(e.target.value as any); handleManualChange(); }} fontSize="12px" size="xs" borderRadius="md">
                            <option value="none">None</option>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High (NotebookLM-style)</option>
                          </Select>
                        </FormControl>
                        <FormControl>
                          <FormLabel fontSize="10px" mb={1} color={mutedColor}>Emotional Intensity</FormLabel>
                          <Select value={emotionalIntensity} onChange={(e) => { setEmotionalIntensity(e.target.value as any); handleManualChange(); }} fontSize="12px" size="xs" borderRadius="md">
                            <option value="subdued">Subdued</option>
                            <option value="natural">Natural</option>
                            <option value="expressive">Expressive</option>
                            <option value="very-expressive">Very Expressive</option>
                          </Select>
                        </FormControl>
                        <FormControl>
                          <FormLabel fontSize="10px" mb={1} color={mutedColor}>Interruptions</FormLabel>
                          <Select value={interruptionFrequency} onChange={(e) => { setInterruptionFrequency(e.target.value as any); handleManualChange(); }} fontSize="12px" size="xs" borderRadius="md">
                            <option value="none">None</option>
                            <option value="occasional">Occasional</option>
                            <option value="frequent">Frequent</option>
                          </Select>
                        </FormControl>
                        <HStack spacing={4}>
                          <FormControl display="flex" alignItems="center">
                            <FormLabel fontSize="10px" mb={0} mr={2}>Prosody</FormLabel>
                            <Switch size="sm" isChecked={includeProsodyMarkers} onChange={(e) => { setIncludeProsodyMarkers(e.target.checked); handleManualChange(); }} />
                          </FormControl>
                          <FormControl display="flex" alignItems="center">
                            <FormLabel fontSize="10px" mb={0} mr={2}>Emphasis</FormLabel>
                            <Switch size="sm" isChecked={includeEmphasis} onChange={(e) => { setIncludeEmphasis(e.target.checked); handleManualChange(); }} />
                          </FormControl>
                        </HStack>
                      </VStack>
                    </Box>

                    {/* Narrative Control Section */}
                    <Box p={3} bg={surfaceHover} borderRadius="md" borderLeft="3px solid" borderLeftColor="purple.400">
                      <Text fontSize="12px" fontWeight="600" color={textColor} mb={2}>
                        🎛️ Narrative Control
                      </Text>
                      <VStack spacing={2} align="stretch">
                        <HStack spacing={2}>
                          <FormControl flex={1}>
                            <FormLabel fontSize="10px" mb={1} color={mutedColor}>Info Density</FormLabel>
                            <Select value={informationDensity} onChange={(e) => { setInformationDensity(e.target.value as any); handleManualChange(); }} fontSize="11px" size="xs" borderRadius="md">
                              <option value="light">Light</option>
                              <option value="moderate">Moderate</option>
                              <option value="dense">Dense</option>
                              <option value="maximum">Maximum</option>
                            </Select>
                          </FormControl>
                          <FormControl flex={1}>
                            <FormLabel fontSize="10px" mb={1} color={mutedColor}>Pacing</FormLabel>
                            <Select value={pacing} onChange={(e) => { setPacing(e.target.value as any); handleManualChange(); }} fontSize="11px" size="xs" borderRadius="md">
                              <option value="slow-reflective">Slow</option>
                              <option value="measured">Measured</option>
                              <option value="dynamic">Dynamic</option>
                              <option value="rapid-fire">Rapid</option>
                            </Select>
                          </FormControl>
                        </HStack>
                        <HStack spacing={2}>
                          <FormControl flex={1}>
                            <FormLabel fontSize="10px" mb={1} color={mutedColor}>Speaker Balance</FormLabel>
                            <Select value={speakerBalance} onChange={(e) => { setSpeakerBalance(e.target.value as any); handleManualChange(); }} fontSize="11px" size="xs" borderRadius="md">
                              <option value="equal">Equal</option>
                              <option value="host-led">Host-Led</option>
                              <option value="expert-led">Expert-Led</option>
                              <option value="interviewer-guest">Q&A</option>
                            </Select>
                          </FormControl>
                          <FormControl flex={1}>
                            <FormLabel fontSize="10px" mb={1} color={mutedColor}>Technical Depth</FormLabel>
                            <Select value={technicalDepth} onChange={(e) => { setTechnicalDepth(e.target.value as any); handleManualChange(); }} fontSize="11px" size="xs" borderRadius="md">
                              <option value="surface">Surface</option>
                              <option value="accessible">Accessible</option>
                              <option value="detailed">Detailed</option>
                              <option value="expert">Expert</option>
                            </Select>
                          </FormControl>
                        </HStack>
                        <HStack spacing={2}>
                          <FormControl flex={1}>
                            <FormLabel fontSize="10px" mb={1} color={mutedColor}>Debate</FormLabel>
                            <Select value={debateIntensity} onChange={(e) => { setDebateIntensity(e.target.value as any); handleManualChange(); }} fontSize="11px" size="xs" borderRadius="md">
                              <option value="agreeable">Agreeable</option>
                              <option value="mild-challenge">Mild</option>
                              <option value="balanced-debate">Balanced</option>
                              <option value="adversarial">Adversarial</option>
                            </Select>
                          </FormControl>
                          <FormControl flex={1}>
                            <FormLabel fontSize="10px" mb={1} color={mutedColor}>Humor</FormLabel>
                            <Select value={humorLevel} onChange={(e) => { setHumorLevel(e.target.value as any); handleManualChange(); }} fontSize="11px" size="xs" borderRadius="md">
                              <option value="none">None</option>
                              <option value="dry-wit">Dry Wit</option>
                              <option value="light">Light</option>
                              <option value="frequent">Frequent</option>
                            </Select>
                          </FormControl>
                        </HStack>
                        <FormControl>
                          <FormLabel fontSize="10px" mb={1} color={mutedColor}>Tangent Allowance</FormLabel>
                          <Select value={tangentAllowance} onChange={(e) => { setTangentAllowance(e.target.value as any); handleManualChange(); }} fontSize="11px" size="xs" borderRadius="md">
                            <option value="strict">Strict - Stay on topic</option>
                            <option value="minimal">Minimal - Brief asides</option>
                            <option value="moderate">Moderate - Natural tangents</option>
                            <option value="exploratory">Exploratory - Follow curiosity</option>
                          </Select>
                        </FormControl>
                      </VStack>
                    </Box>
                  </VStack>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
          </Box>

          {/* Tone & Audience Card */}
          <Box
            p={4}
            bg={cardBg}
            borderRadius="xl"
            border="2px solid"
            borderColor="purple.500"
            transition="all 0.2s"
            _hover={{ transform: 'translateY(-2px)', shadow: 'md' }}
          >
            <VStack spacing={3} align="stretch">
              <FormControl>
                <FormLabel fontSize="13px" mb={2} fontWeight="600" color={textColor}>
                  <HStack spacing={2}>
                    <Text>🎨</Text>
                    <Text>Tone & Style</Text>
                  </HStack>
                </FormLabel>
                <Select 
                  value={tone} 
                  onChange={(e) => setTone(e.target.value)}
                  fontSize="14px"
                  fontWeight="500"
                  borderRadius="lg"
                  bg={cardBg}
                  border="2px solid"
                  borderColor="purple.500"
                  _hover={{ borderColor: 'purple.400' }}
                  _focus={{ borderColor: 'purple.500', boxShadow: '0 0 0 1px var(--chakra-colors-purple-500)' }}
                >
                  <option value="conversational">💬 Conversational</option>
                  <option value="professional">👔 Professional</option>
                  <option value="educational">🎓 Educational</option>
                  <option value="entertaining">🎭 Entertaining</option>
                  <option value="provocative">🔥 Provocative</option>
                  <option value="reflective">🧘 Reflective</option>
                  <option value="energetic">⚡ Energetic</option>
                  <option value="humorous">😄 Humorous</option>
                  <option value="analytical">🔬 Analytical</option>
                  <option value="narrative">📖 Narrative/Storytelling</option>
                  <option value="inspirational">💡 Inspirational</option>
                  <option value="skeptical">🤔 Skeptical/Investigative</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel fontSize="13px" mb={2} fontWeight="600" color={textColor}>
                  <HStack spacing={2}>
                    <Text>👥</Text>
                    <Text>Target Audience</Text>
                  </HStack>
                </FormLabel>
                <Select 
                  value={audience} 
                  onChange={(e) => setAudience(e.target.value)}
                  fontSize="14px"
                  fontWeight="500"
                  borderRadius="lg"
                  bg={cardBg}
                  border="2px solid"
                  borderColor="purple.500"
                  _hover={{ borderColor: 'purple.400' }}
                  _focus={{ borderColor: 'purple.500', boxShadow: '0 0 0 1px var(--chakra-colors-purple-500)' }}
                >
                  <option value="general">🌐 General Public</option>
                  <option value="professionals">💼 Professionals</option>
                  <option value="executives">👔 Executives</option>
                  <option value="students">🎓 Students</option>
                  <option value="beginners">🌱 Beginners</option>
                  <option value="technical">🔧 Technical/Developers</option>
                  <option value="creatives">🎨 Creatives</option>
                  <option value="enthusiasts">🏠 Hobbyists/Enthusiasts</option>
                  <option value="experts">🧠 Domain Experts</option>
                </Select>
              </FormControl>

              {/* Style indicator */}
              <Box
                p={3}
                bg={surfaceHover}
                borderRadius="md"
                borderLeft="4px solid"
                borderColor="purple.500"
              >
                <HStack justify="space-between">
                  <Text fontSize="12px" fontWeight="600" color={textColor}>
                    💬 Format
                  </Text>
                  <Badge colorScheme="purple" fontSize="11px" fontWeight="600">
                    {style}
                  </Badge>
                </HStack>
              </Box>
            </VStack>
          </Box>
        </VStack>

        {/* Advanced Options - Enhanced Card */}
        <Box
          p={4}
          bg={useSemanticToken('surface.base')}
          borderRadius="xl"
          border="2px solid"
          borderColor={useSemanticToken('border.default')}
          transition="all 0.2s"
          _hover={{ transform: 'translateY(-2px)', shadow: 'md' }}
        >
          <Accordion allowToggle>
            <AccordionItem border="none">
              <AccordionButton 
                px={0} 
                py={2}
                _hover={{ bg: surfaceHover }}
                borderRadius="md"
              >
                <HStack flex="1">
                  <Icon as={FiChevronDown} color={mutedColor} />
                  <Text fontSize="13px" fontWeight="600" color={textColor}>
                    ⚙️ Advanced Options
                  </Text>
                </HStack>
                <AccordionIcon />
              </AccordionButton>
              <AccordionPanel px={0} py={3}>
                <VStack spacing={3} align="stretch">
                  <FormControl>
                    <FormLabel fontSize="12px" mb={2} fontWeight="600" color={textColor}>
                      🎯 Focus (optional)
                    </FormLabel>
                    <Textarea
                      fontSize="13px"
                      borderRadius="lg"
                      placeholder="e.g., 'Focus on practical applications'"
                      value={emphasis}
                      onChange={(e) => setEmphasis(e.target.value)}
                      rows={3}
                      bg={cardBg}
                      border="2px solid"
                      borderColor={borderColor}
                      _hover={{ borderColor: borderSubtle }}
                      _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)' }}
                    />
                  </FormControl>

                  <Box
                    p={3}
                    bg={cardBg}
                    borderRadius="lg"
                    border="1px solid"
                    borderColor={borderColor}
                  >
                    <VStack spacing={3}>
                      <HStack justify="space-between" w="full">
                        <HStack spacing={2}>
                          <Text fontSize="13px" fontWeight="500" color={textColor}>📚 Include stories</Text>
                        </HStack>
                        <Switch 
                          size="md" 
                          colorScheme="green"
                          isChecked={includeStories} 
                          onChange={(e) => setIncludeStories(e.target.checked)} 
                        />
                      </HStack>
                      <HStack justify="space-between" w="full">
                        <HStack spacing={2}>
                          <Text fontSize="13px" fontWeight="500" color={textColor}>💡 Include examples</Text>
                        </HStack>
                        <Switch 
                          size="md" 
                          colorScheme="green"
                          isChecked={includeExamples} 
                          onChange={(e) => setIncludeExamples(e.target.checked)} 
                        />
                      </HStack>
                    </VStack>
                  </Box>
                </VStack>
              </AccordionPanel>
            </AccordionItem>
          </Accordion>
        </Box>

        {/* Progress Bar - Always rendered, controlled by visibility */}
        <Box 
          p={3} 
          bg={cardBg}
          borderRadius="md"
          border="1px solid"
          borderColor="green.500"
          display={isGeneratingScript ? 'block' : 'none'}
          transition="all 0.2s"
        >
          <HStack justify="space-between" mb={2}>
            <Text fontSize="13px" fontWeight="600" color={textColor}>
              {generationMessage || 'Processing...'}
            </Text>
            <Text fontSize="13px" fontWeight="700" color="green.500">
              {generationProgress}%
            </Text>
          </HStack>
          <Progress 
            value={generationProgress} 
            size="md" 
            colorScheme="green"
            borderRadius="full"
            hasStripe
            isAnimated
          />
        </Box>

        {/* Generate Button with Enhanced Visual Feedback */}
        <VStack spacing={3} w="full">
          {/* Compact Source Summary near Generate Button */}
          <HStack
            w="full"
            p={2}
            bg={cardBg}
            borderRadius="lg"
            border="1px solid"
            borderColor={researchMaterials.length > 0 ? 'green.500' : 'orange.500'}
            justify="center"
            spacing={2}
          >
            <Icon as={FiFileText} color={researchMaterials.length > 0 ? 'green.500' : 'orange.500'} boxSize={3} />
            <Text fontSize="12px" fontWeight="600" color={textColor}>
              {researchMaterials.length > 0
                ? `${researchMaterials.length} source${researchMaterials.length !== 1 ? 's' : ''} • ${researchMaterials.reduce((sum, m) => sum + (m.wordCount || 0), 0).toLocaleString()} words`
                : 'No sources selected'}
            </Text>
          </HStack>

          {/* Primary Generate Button */}
          <Button
            colorScheme="blue"
            size="lg"
            w="full"
            onClick={handleGenerateScript}
            leftIcon={<Icon as={FiFileText} boxSize={5} />}
            isLoading={isGeneratingScript}
            loadingText="Generating..."
            isDisabled={isGeneratingScript || researchMaterials.length === 0}
            borderRadius="xl"
            fontSize="15px"
            fontWeight="700"
            h="56px"
            boxShadow="lg"
            _hover={{
              transform: 'translateY(-2px)',
              boxShadow: 'xl',
            }}
            _active={{
              transform: 'translateY(0)',
            }}
            transition="all 0.2s"
            bgGradient="linear(to-r, blue.400, blue.600)"
            _disabled={{
              opacity: 0.6,
              cursor: 'not-allowed',
              transform: 'none',
            }}
          >
            {hasScript ? '🔄 Regenerate Professional Script' : '🎬 Generate Professional Script (5-Stage)'}
          </Button>
        </VStack>
      </VStack>

    </VStack>
  );
}
