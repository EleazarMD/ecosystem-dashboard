import React, { useState, useEffect, useMemo, useContext } from 'react';
import { useRightPanel } from '../../contexts/RightPanelContext';
import { PodcastStudioContext } from '../../contexts/PodcastStudioContext';
import ReactMarkdown from 'react-markdown';
import {
  Box,
  VStack,
  HStack,
  Text,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Button,
  Textarea,
  Icon,
  IconButton,
  useToast,
  Badge,
  Tooltip,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  PopoverArrow,
  PopoverHeader,
  UnorderedList,
  OrderedList,
  ListItem,
  Heading,
  Code,
  Spinner,
  Divider,
} from '@chakra-ui/react';
import { FiMessageSquare, FiEdit, FiMusic, FiHeadphones, FiBookmark, FiVolume2, FiLink, FiCopy, FiShare2, FiStopCircle, FiPlay, FiRefreshCw, FiExternalLink } from 'react-icons/fi';
import AIInputInterface from '../research/AIInputInterface';
import { useTTS } from '../../hooks/useTTS';
import AudioPlayer from './AudioPlayer';
import AudioMixer from './AudioMixer';
import AudioEffectsRack from './AudioEffectsRack';
import WaveformEditorEnhanced from './WaveformEditorEnhanced';
import PodcastPlaybackPanel from './PodcastPlaybackPanel';
import PodcastControlPanel from './PodcastControlPanel';
import { ErrorLogger } from '@/lib/error-logger';
import MultiStageProductionPanel from './MultiStageProductionPanel';
import StageOutputViewer from './StageOutputViewer';
import VoiceDesignStudio from './VoiceDesignStudio';
import VoiceConfigurationPanel from './VoiceConfigurationPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';


interface Citation {
  number: number;
  fullText: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  model?: string; // Track which model generated the response
}

interface ResearchMaterial {
  id: string;
  title: string;
  content?: string;
  wordCount: number;
  pageCount?: number;
  metadata?: {
    summary?: string;
    keyTopics?: string[];
    aiModel?: string;
    analyzedAt?: string;
  };
}

interface ConversationTurn {
  id: string;
  speaker: string;
  content: string;
  emotion: string;
  duration?: number;
}

interface PodcastHost {
  id: string;
  name: string;
  voiceName?: string;
  voiceId?: string;
  role?: string;
  gender?: 'male' | 'female';
  personality?: string | Record<string, any>;
}

interface ScriptGenerationTabsProps {
  selectedSourceCount: number;
  selectedMaterials?: ResearchMaterial[];
  onTabChange?: (tabIndex: number) => void;
  onReloadMaterials?: () => Promise<void>;
  onTitleGenerated?: (title: string) => void;
  defaultModel?: string;
  generatedScript?: ConversationTurn[];
  hosts?: PodcastHost[];
  selectedPodcastEpisode?: any | null;
  voiceAssignments?: any[]; // Current voice assignments from VoiceConfigurationPanel
  projectId?: string; // Project ID for database persistence
  selectedScriptSettings?: {
    ai_model?: string;
    ai_provider?: string;
    script_length?: string;
    generation_params?: any;
  } | null;
  onAudioDeleted?: () => void;
  onScriptSaved?: () => void;
  onAudioSaved?: () => void;
  selectedScriptId?: string | null;
}

export default function ScriptGenerationTabs({ selectedSourceCount, selectedMaterials = [], onTabChange, onReloadMaterials, onTitleGenerated, defaultModel = 'gemini-2-5-flash', generatedScript: initialScript = [], hosts = [], selectedPodcastEpisode = null, voiceAssignments = [], projectId, selectedScriptSettings, onAudioDeleted, onScriptSaved, onAudioSaved, selectedScriptId }: ScriptGenerationTabsProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [script, setScript] = useState('');
  
  // Local state for generated script (initialized from prop, updated by generation)
  const [localGeneratedScript, setLocalGeneratedScript] = useState<ConversationTurn[]>(initialScript);
  const [scriptLanguage, setScriptLanguage] = useState<string>(
    selectedScriptSettings?.generation_params?.language || 'english'
  );
  // Rich metadata from script generation — drives audio controls downstream
  const [scriptAudioDirection, setScriptAudioDirection] = useState<any>(null);
  const [scriptMetadataState, setScriptMetadataState] = useState<any>(null);
  
  // Sync language when selectedScriptSettings changes (loading existing script)
  useEffect(() => {
    if (selectedScriptSettings?.generation_params?.language) {
      setScriptLanguage(selectedScriptSettings.generation_params.language);
    }
  }, [selectedScriptSettings]);
  
  // Sync language from selected podcast episode (e.g. loaded from library)
  useEffect(() => {
    if (selectedPodcastEpisode?.language && selectedPodcastEpisode.language !== 'english') {
      setScriptLanguage(selectedPodcastEpisode.language);
    }
  }, [selectedPodcastEpisode?.language]);
  
  // Memoize the serialized script to detect actual content changes
  const initialScriptKey = useMemo(() => JSON.stringify(initialScript), [initialScript]);
  
  // Sync local state when initialScript prop changes (e.g., when user selects a different script)
  useEffect(() => {
    console.log('📜 ScriptGenerationTabs useEffect - initialScript changed');
    console.log('📜 initialScript.length:', initialScript.length);
    console.log('📜 localGeneratedScript.length:', localGeneratedScript.length);
    // Always sync when prop changes, even if it's empty (to clear local state)
    console.log('📜 Syncing script from prop:', initialScript.length, 'turns');
    if (initialScript.length > 0) {
      console.log('📜 First turn:', initialScript[0]);
    }
    setLocalGeneratedScript(initialScript);
  }, [initialScriptKey]);
  
  // Use local script if available, otherwise fall back to prop
  const generatedScript = localGeneratedScript.length > 0 ? localGeneratedScript : initialScript;
  
  // Debug: Log the final script being used
  console.log('🎬 ScriptGenerationTabs render - generatedScript.length:', generatedScript.length);

  // Podcast playback control state
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [transcriptSettings, setTranscriptSettings] = useState({
    fontSize: 'md' as 'sm' | 'md' | 'lg',
    autoScroll: true,
    showTimestamps: true,
  });
  // Quality tags for playback review (turn index → tag)
  const [qualityTags, setQualityTags] = useState<Record<number, string | null>>({});
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Access right panel context
  const { setCustomData, setActiveTab: setRightPanelTab } = useRightPanel();
  
  // Access PodcastStudioContext to update context size for auto-switch indicator
  const podcastStudioContext = useContext(PodcastStudioContext);
  
  // Calculate and update context size when selectedMaterials change
  useEffect(() => {
    if (podcastStudioContext?.setContextSizeChars && selectedMaterials) {
      // Calculate total character count from all selected materials
      const totalChars = selectedMaterials.reduce((total, material) => {
        const contentLength = (material.content?.length || 0) + 
                             (material.metadata?.summary?.length || 0) +
                             (material.title?.length || 0);
        return total + contentLength;
      }, 0);
      
      podcastStudioContext.setContextSizeChars(totalChars);
      
      // Log for debugging
      if (totalChars > 0) {
        const QWEN_LIMIT = 32000 * 4; // ~128K chars
        console.log(`📊 Context size updated: ${Math.round(totalChars / 1000)}K chars (Qwen limit: ${Math.round(QWEN_LIMIT / 1000)}K)`);
        if (totalChars > QWEN_LIMIT) {
          console.log(`⚡ Large context detected - will auto-switch to Gemini Flash`);
        }
      }
    }
  }, [selectedMaterials, podcastStudioContext?.setContextSizeChars]);
  
  const [hoveredMessageIndex, setHoveredMessageIndex] = useState<number | null>(null);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [speakingMessageIndex, setSpeakingMessageIndex] = useState<number | null>(null);
  const [minCharsForPregeneration, setMinCharsForPregeneration] = useState(200); // User-adjustable threshold
  const [ttsVoice, setTtsVoice] = useState('ryan'); // Qwen TTS voice (local, free, private)
  const [ttsSpeed, setTtsSpeed] = useState(1.0);
  const [ttsPitch, setTtsPitch] = useState(0);

  // Audio generation state
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [audioProgress, setAudioProgress] = useState<{
    currentTurn: number;
    totalTurns: number;
    message: string;
    phase?: string;
    phaseDetail?: string;
    progress?: number; // 0-100 weighted
    estimatedTotalMs?: number;
    elapsedMs?: number;
  } | null>(null);

  // Preview state
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewMode, setPreviewMode] = useState<'none' | 'raw' | 'optimized'>('none');
  const [previewTurns, setPreviewTurns] = useState(3);
  const [transitionPause, setTransitionPause] = useState(250);
  const [isRegeneratingSummary, setIsRegeneratingSummary] = useState(false);

  // Podcast context state (combined title + summary)
  const [podcastContext, setPodcastContext] = useState<{
    title: string;
    combinedSummary: string;
    keyThemes: string[];
    talkingPoints: string[];
    fromCache?: boolean;
  } | null>(null);
  const [isGeneratingContext, setIsGeneratingContext] = useState(false);

  // Multi-stage production state
  const [stageResults, setStageResults] = useState<any[]>([]);
  const [currentStage, setCurrentStage] = useState<string | null>(null);
  const [selectedStageForReview, setSelectedStageForReview] = useState<string | null>(null);
  const [productionConfig, setProductionConfig] = useState({
    mode: 'single-pass' as 'single-pass' | 'multi-stage',
    targetDuration: 15,
    productionQuality: 'standard' as 'draft' | 'standard' | 'premium',
    enableDirectorNotes: true,
    enableVoiceDirection: true,
  });

  const toast = useToast();
  const { speak, stop, isSpeaking, currentProvider, pregenerate, isCached } = useTTS();
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Extract unique speakers from generated script
  const scriptSpeakers = React.useMemo(() => {
    const speakerNames = Array.from(new Set(generatedScript.map(turn => turn.speaker)));
    return speakerNames.map((name, index) => {
      const matchedHost = hosts.find(h => h.name === name);
      // Gender comes from user-provided data, not hardcoded name lists
      // Priority: backend speakerProfiles (from script generation) > host participant config
      const backendProfile = scriptMetadataState?.speakerProfiles?.find(
        (sp: any) => sp.name?.toLowerCase() === name.toLowerCase()
      );
      const backendGender = backendProfile?.gender as 'male' | 'female' | undefined;
      const hostGender = (matchedHost as any)?.gender as 'male' | 'female' | undefined;
      const inferredGender = backendGender || hostGender;
      return {
        id: `speaker-${index + 1}`,
        name,
        role: backendProfile?.role || matchedHost?.voiceName || 'host',
        gender: inferredGender,
        personality: backendProfile?.personality || 'conversational',
        lineCount: generatedScript.filter(turn => turn.speaker === name).length
      };
    });
  }, [generatedScript, hosts, scriptMetadataState]);

  // Auto-detect script language from content
  const detectedLanguage = React.useMemo(() => {
    if (generatedScript.length === 0) return 'english';
    const sampleText = generatedScript.slice(0, 5).map(t => t.content).join(' ').toLowerCase();
    const spanishIndicators = ['¿', '¡', ' el ', ' la ', ' los ', ' las ', ' que ', ' por ', ' para ', ' con ', ' una ', ' del ', ' es ', ' en '];
    const spanishScore = spanishIndicators.filter(w => sampleText.includes(w)).length;
    return spanishScore >= 3 ? 'spanish' : 'english';
  }, [generatedScript]);

  // Audio mixer tracks state - sync with scriptSpeakers
  const [mixerTracks, setMixerTracks] = React.useState(() =>
    scriptSpeakers.map((speaker, index) => ({
      id: speaker.id,
      name: speaker.name,
      volume: -12, // dB
      muted: false,
      solo: false,
      pan: 0,
      color: ['blue', 'purple', 'green', 'orange'][index % 4]
    }))
  );

  // Update mixer tracks when scriptSpeakers changes
  React.useEffect(() => {
    setMixerTracks(scriptSpeakers.map((speaker, index) => ({
      id: speaker.id,
      name: speaker.name,
      volume: -12, // dB
      muted: false,
      solo: false,
      pan: 0,
      color: ['blue', 'purple', 'green', 'orange'][index % 4]
    })));
  }, [scriptSpeakers]);

  // Memoize transcript to prevent infinite re-renders
  const memoizedTranscript = useMemo(() => {
    const scriptToUse = selectedPodcastEpisode?.script || generatedScript;
    let cumulativeTime = 0;
    return scriptToUse.map((turn) => {
      const startTime = cumulativeTime;
      const turnDuration = turn.duration || 0;
      const endTime = cumulativeTime + turnDuration;
      cumulativeTime = endTime;

      return {
        speaker: turn.speaker,
        content: turn.content,
        startTime,
        endTime,
      };
    });
  }, [selectedPodcastEpisode?.script, generatedScript]);

  // Audio effects settings state
  const [effectsSettings, setEffectsSettings] = React.useState({
    noiseGate: {
      enabled: true,
      threshold: -40,
    },
    eq: {
      enabled: true,
      lowCut: 80,
      midBoost: 2.0,
      highShelf: 1.5,
    },
    compressor: {
      enabled: true,
      threshold: -18,
      ratio: 3,
      attack: 10,
      release: 100,
    },
    limiter: {
      enabled: true,
      ceiling: -1.0,
    },
    normalize: false,
  });

  // Update mixer tracks when speakers change
  React.useEffect(() => {
    if (scriptSpeakers.length > 0) {
      setMixerTracks(scriptSpeakers.map((speaker, index) => ({
        id: speaker.id,
        name: speaker.name,
        volume: -12,
        muted: false,
        solo: false,
        pan: 0,
        color: ['blue', 'purple', 'green', 'orange'][index % 4]
      })));
    }
  }, [scriptSpeakers]);

  const handleTrackChange = (trackId: string, changes: any) => {
    setMixerTracks(tracks =>
      tracks.map(track =>
        track.id === trackId ? { ...track, ...changes } : track
      )
    );
  };

  const handleApplyEffectsPreset = (presetId: string) => {
    const presets: any = {
      'clean-voice': {
        noiseGate: { enabled: true, threshold: -35 },
        eq: { enabled: true, lowCut: 80, midBoost: 1.0, highShelf: 0.5 },
        compressor: { enabled: true, threshold: -20, ratio: 2, attack: 15, release: 150 },
        limiter: { enabled: true, ceiling: -1.0 },
      },
      'radio-ready': {
        noiseGate: { enabled: true, threshold: -40 },
        eq: { enabled: true, lowCut: 100, midBoost: 3.0, highShelf: 2.0 },
        compressor: { enabled: true, threshold: -16, ratio: 4, attack: 8, release: 80 },
        limiter: { enabled: true, ceiling: -0.5 },
      },
      'podcast-standard': {
        noiseGate: { enabled: true, threshold: -38 },
        eq: { enabled: true, lowCut: 85, midBoost: 2.0, highShelf: 1.5 },
        compressor: { enabled: true, threshold: -18, ratio: 3, attack: 10, release: 100 },
        limiter: { enabled: true, ceiling: -1.0 },
      },
      'loud-and-clear': {
        noiseGate: { enabled: true, threshold: -42 },
        eq: { enabled: true, lowCut: 90, midBoost: 4.0, highShelf: 3.0 },
        compressor: { enabled: true, threshold: -15, ratio: 5, attack: 5, release: 60 },
        limiter: { enabled: true, ceiling: -0.3 },
      },
    };

    if (presets[presetId]) {
      setEffectsSettings(presets[presetId]);
      toast({
        title: 'Preset Applied',
        description: `Applied "${presetId}" audio processing preset`,
        status: 'success',
        duration: 2000,
      });
    }
  };

  // Generate podcast context (title + combined summary) once when materials change
  const generatePodcastContext = async (materials: ResearchMaterial[], forceRegenerate = false) => {
    if (materials.length === 0) {
      setPodcastContext(null);
      return;
    }

    setIsGeneratingContext(true);

    try {
      console.log('🎯 Generating podcast context for', materials.length, 'materials', forceRegenerate ? '(force regenerate)' : '');
      console.log('📦 Materials data:', materials.map(m => ({ id: m.id, hasContent: !!m.content, hasSummary: !!m.metadata?.summary })));

      const response = await fetch('/api/podcast-studio/generate-podcast-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materials, forceRegenerate }),
      });

      if (!response.ok) {
        // Try to get error details, but don't fail if response isn't JSON
        let errorMessage = `Server error (${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;

          // Determine error type
          const errorType = errorMessage.toLowerCase().includes('connection')
            ? 'ai_gateway_connection'
            : errorMessage.toLowerCase().includes('request')
              ? 'ai_gateway_request'
              : 'podcast_context_generation';

          // Log to centralized error system
          await ErrorLogger.podcastStudio(errorType, errorMessage, {
            statusCode: response.status,
            troubleshooting: errorData.troubleshooting,
            details: errorData.details,
            rawResponse: errorData.rawResponse,
          });
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          // Use generic error message if we can't parse the response
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();

      setPodcastContext({
        title: data.title,
        combinedSummary: data.combinedSummary,
        keyThemes: data.keyThemes || [],
        talkingPoints: data.talkingPoints || [],
        fromCache: data.fromCache || false,
      });

      // Pass the generated title to parent component
      if (onTitleGenerated && data.title) {
        onTitleGenerated(data.title);
      }

      toast({
        title: data.fromCache ? '📦 Using cached context' : '✅ Podcast context generated',
        description: data.fromCache ? `Loaded from cache: "${data.title}"` : `Title: "${data.title}"`,
        status: 'success',
        duration: 3000,
      });

    } catch (error) {
      console.error('❌ Podcast context generation error:', error);
      toast({
        title: '❌ Failed to generate context',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsGeneratingContext(false);
    }
  };

  // Auto-generate podcast context when selected materials change (only once per selection)
  // DISABLED: Causing issues with "No JSON Found" error
  // React.useEffect(() => {
  //   // Only generate if we have materials and haven't generated yet for this selection
  //   if (selectedMaterials.length > 0 && !isGeneratingContext) {
  //     const materialIds = selectedMaterials.map(m => m.id).sort().join(',');
  //     const currentIds = podcastContext ? 'existing' : '';
  //     
  //     // Generate if materials changed
  //     if (materialIds !== currentIds) {
  //       generatePodcastContext(selectedMaterials);
  //     }
  //   }
  // }, [selectedMaterials.map(m => m.id).join(',')]); // Only re-run when material IDs change

  // Handle multi-stage production generation
  const handleMultiStageGeneration = async (config: any) => {
    if (!selectedMaterials || selectedMaterials.length === 0) {
      toast({
        title: 'No research materials',
        description: 'Please select research materials first',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    // For single-pass mode, you could call existing generation logic here
    // For now, we'll handle both modes through the multi-stage endpoint

    setIsGeneratingAudio(true); // Reuse existing loading state
    setStageResults([]);
    setCurrentStage(null);

    try {
      console.log('🎬 Starting production pipeline...', config.mode);

      const response = await fetch('/api/podcast-studio/multi-stage-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          researchMaterials: selectedMaterials,
          preset: {
            participantCount: hosts.length || 2,
            participants: hosts.length > 0
              ? hosts.map(h => ({
                  name: h.name,
                  role: (h as any).role || 'host',
                  gender: (h as any).gender || 'male',
                  personality: typeof h.personality === 'string' 
                    ? h.personality 
                    : (h.personality as any)?.communicationStyle || 'Conversational',
                }))
              : [
                  { role: 'host', gender: 'female', personality: 'Curious and engaging' },
                  { role: 'expert', gender: 'male', personality: 'Knowledgeable and passionate' }
                ],
            tone: 'conversational yet substantive',
            audience: 'general audience',
          },
          productionConfig: {
            targetDuration: config.targetDuration,
            productionQuality: config.productionQuality,
            enableDirectorNotes: config.enableDirectorNotes,
            enableVoiceDirection: config.enableVoiceDirection,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Generation failed: ${response.status}`);
      }

      const data = await response.json();

      console.log('✅ Production complete!', data);

      setStageResults(data.stageResults || []);
      setCurrentStage(null);
      
      // Capture rich metadata and audio direction for downstream audio generation
      if (data.metadata) {
        setScriptMetadataState(data.metadata);
        console.log('📋 Script metadata captured:', data.metadata.podcastStyle, data.metadata.language, data.metadata.audience);
      }
      if (data.audioDirection) {
        setScriptAudioDirection(data.audioDirection);
        console.log('🎼 Audio direction captured:', data.audioDirection.arcTemplate, `${data.audioDirection.phases?.length || 0} phases`);
      }

      toast({
        title: 'Production Complete!',
        description: `Script generated with ${data.stageResults?.length || 0} stages`,
        status: 'success',
        duration: 5000,
      });

    } catch (error) {
      console.error('❌ Multi-stage generation error:', error);
      toast({
        title: 'Production Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  // Handle audio generation (async with polling)
  const handleGenerateAudio = async (voiceAssignments: any, ttsModel?: string, productionConfig?: any) => {
    setIsGeneratingAudio(true);

    try {
      console.log('🎵 Starting async audio generation with voice assignments:', voiceAssignments);
      console.log('📄 Script:', generatedScript);

      // Start the audio generation job
      const response = await fetch('/api/podcast-studio/generate-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          script: generatedScript,
          voiceAssignments: voiceAssignments,
          speakers: scriptSpeakers,
          projectId,
          language: scriptLanguage || detectedLanguage,
          productionConfig,
          ttsModel,
          audioDirection: scriptAudioDirection,
          scriptMetadata: scriptMetadataState,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Audio generation failed: ${response.status}`);
      }

      // Get job ID from 202 Accepted response
      const { jobId, totalTurns } = await response.json();
      console.log('📊 Audio job started:', jobId, `(${totalTurns} turns)`);

      // Poll for completion
      const result = await new Promise<any>((resolve, reject) => {
        const pollInterval = setInterval(async () => {
          try {
            const statusResponse = await fetch(`/api/podcast-studio/audio-generation-status?jobId=${jobId}`);
            if (!statusResponse.ok) {
              clearInterval(pollInterval);
              const errorText = await statusResponse.text();
              console.error('❌ Audio status fetch failed:', statusResponse.status, errorText);
              reject(new Error(`Failed to fetch audio status: ${statusResponse.status}`));
              return;
            }

            const status = await statusResponse.json();
            console.log(`🎵 Audio progress: ${status.currentTurn}/${status.totalTurns} (${status.progress}%)`);
            
            // Update progress state for UI
            setAudioProgress({
              currentTurn: status.currentTurn || 0,
              totalTurns: status.totalTurns || totalTurns,
              message: status.message || `🎙️ Generating turn ${status.currentTurn}/${status.totalTurns}`,
              phase: status.phase,
              phaseDetail: status.phaseDetail,
              progress: status.progress,
              estimatedTotalMs: status.estimatedTotalMs,
              elapsedMs: status.elapsedMs,
            });

            if (status.status === 'complete') {
              clearInterval(pollInterval);
              setAudioProgress(null);
              resolve(status.result);
            } else if (status.status === 'error') {
              clearInterval(pollInterval);
              setAudioProgress(null);
              console.error('❌ Audio generation error from server:', status.error);
              reject(new Error(status.error || 'Audio generation failed'));
            }
          } catch (err) {
            clearInterval(pollInterval);
            console.error('❌ Audio polling error:', err);
            reject(err);
          }
        }, 2000); // Poll every 2 seconds

        // Timeout after 30 minutes (audio can take a while for long scripts)
        setTimeout(() => {
          clearInterval(pollInterval);
          reject(new Error('Audio generation timeout (>30 minutes)'));
        }, 1800000);
      });

      console.log('✅ Audio generated successfully!', {
        audioUrl: result.audioUrl,
        duration: result.duration ? `${result.duration}s` : 'unknown',
        fileSize: result.fileSize,
      });

      // Store audio URL and duration for playback controls
      setGeneratedAudioUrl(result.audioUrl);
      setAudioDuration(result.duration || 0);

      // Trigger sidebar refresh so the new audio appears in the podcast library
      onAudioSaved?.();

      toast({
        title: 'Audio Generated',
        description: `Successfully generated ${Math.ceil((result.duration || 0) / 60)} minutes of audio`,
        status: 'success',
        duration: 5000,
      });

    } catch (error) {
      console.error('❌ Audio generation error:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      // Refresh sidebar so the failed record is visible in the podcast library
      onAudioSaved?.();
      toast({
        title: 'Audio Generation Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 8000,
      });
    } finally {
      setIsGeneratingAudio(false);
      setAudioProgress(null);
    }
  };

  // Handle preview generation
  const handleGeneratePreview = async (voiceAssignments: any) => {
    console.log('🔵 handleGeneratePreview called, isGeneratingPreview:', isGeneratingPreview);

    // Prevent multiple simultaneous calls
    if (isGeneratingPreview) {
      console.warn('⚠️ Preview generation already in progress, blocking call');
      return;
    }

    console.log('🟢 Starting preview generation...');
    setIsGeneratingPreview(true);

    try {
      console.log(`🎬 Generating preview for ${previewTurns} turns...`);

      // Validate data before sending
      if (!generatedScript || generatedScript.length === 0) {
        throw new Error('No script to preview');
      }
      if (!voiceAssignments || voiceAssignments.length === 0) {
        throw new Error('No voice assignments configured');
      }

      console.log('📋 Request data:', {
        scriptLength: generatedScript.length,
        voiceAssignmentsCount: voiceAssignments.length,
        speakersCount: scriptSpeakers.length,
        ttsModel: 'gemini-2.5-pro-preview-tts',
        previewTurns,
        transitionPauseMs: transitionPause
      });

      console.log('📡 Sending preview request...');
      const response = await fetch('/api/podcast-studio/preview-waveform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: generatedScript,
          voiceAssignments,
          speakers: scriptSpeakers,
          ttsModel: 'gemini-2.5-pro-preview-tts',
          previewTurns,
          transitionPauseMs: transitionPause
        })
      });

      console.log('📡 Preview response received:', response.status);

      if (!response.ok) {
        let errorMessage = `Server error: ${response.status}`;
        try {
          const errorText = await response.text();
          console.error('❌ Preview API error response:', errorText.substring(0, 500));

          // Try to parse as JSON
          try {
            const errorData = JSON.parse(errorText);
            if (typeof errorData.error === 'string') {
              errorMessage = errorData.error;
            } else if (typeof errorData.message === 'string') {
              errorMessage = errorData.message;
            }
          } catch {
            // Not JSON, use text directly if it's short
            if (errorText.length < 100) {
              errorMessage = errorText;
            }
          }
        } catch (readError) {
          console.error('❌ Could not read error response:', String(readError));
        }
        throw new Error(String(errorMessage));
      }

      const data = await response.json();
      console.log('✅ Preview data received:', {
        hasPreview: !!data.preview,
        hasRawAudio: !!data.preview?.rawAudio,
        hasOptimizedAudio: !!data.preview?.optimizedAudio,
        rawDuration: data.preview?.rawAudio?.duration,
        optimizedDuration: data.preview?.optimizedAudio?.duration
      });

      if (!data.preview || !data.preview.rawAudio) {
        throw new Error('Invalid preview data received from server');
      }

      setPreviewData(data.preview);

      // Load raw audio by default
      const rawBlob = base64ToBlob(data.preview.rawAudio.data, 'audio/wav');
      const rawUrl = URL.createObjectURL(rawBlob);

      console.log('🎵 Setting preview audio:', {
        blobSize: rawBlob.size,
        audioUrl: rawUrl.substring(0, 50) + '...',
        duration: data.preview.rawAudio.duration
      });

      setGeneratedAudioUrl(rawUrl);
      setAudioDuration(data.preview.rawAudio.duration);
      setPreviewMode('raw');

      toast({
        title: 'Preview Generated',
        description: `${previewTurns} turns previewed - ${data.preview.timeSaved.toFixed(1)}s saved`,
        status: 'success',
        duration: 5000,
      });

    } catch (error) {
      // Safe error logging - avoid circular references
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorName = error instanceof Error ? error.name : 'Unknown';

      console.error('❌ Preview generation error:', {
        name: errorName,
        message: errorMsg,
        isAbortError: errorName === 'AbortError',
        fullError: error
      });

      // Show toast for all errors except expected aborts
      if (errorName === 'AbortError' && errorMsg.includes('timeout')) {
        // Expected timeout - show specific message
        toast({
          title: 'Preview Timeout',
          description: 'Preview generation took too long. Try reducing the number of preview turns.',
          status: 'warning',
          duration: 6000,
          isClosable: true,
        });
      } else if (errorName !== 'AbortError') {
        // Real error - show error message
        toast({
          title: 'Preview Failed',
          description: errorMsg,
          status: 'error',
          duration: 8000,
          isClosable: true,
        });
      } else {
        // Unexpected abort - log but don't show toast
        console.warn('⚠️ Unexpected abort - this might indicate a problem');
      }
    } finally {
      console.log('🔴 Preview generation finished, resetting isGeneratingPreview to false');
      setIsGeneratingPreview(false);
    }
  };

  // Toggle between raw and optimized preview
  const loadPreviewAudio = (mode: 'raw' | 'optimized') => {
    if (!previewData) return;

    console.log(`🎵 Loading ${mode} preview audio...`);

    const audioData = mode === 'raw' ? previewData.rawAudio : previewData.optimizedAudio;
    const blob = base64ToBlob(audioData.data, 'audio/wav');
    const url = URL.createObjectURL(blob);

    console.log('📦 Created audio URL:', url.substring(0, 50));

    setGeneratedAudioUrl(url);
    setAudioDuration(audioData.duration);
    setPreviewMode(mode);

    // Immediately switch right panel to audio controls
    console.log('🎛️ Immediately switching to audio controls');
    setCustomData({
      type: 'podcast-controls',
      episode: {
        id: 'preview',
        title: `Preview (${mode})`,
        audioUrl: url,
        duration: audioData.duration,
        metadata: {
          mode,
          timeSaved: previewData?.timeSaved || 0
        }
      },
      playbackSpeed,
      transcriptSettings,
      onPlaybackSpeedChange: setPlaybackSpeed,
      onTranscriptSettingsChange: setTranscriptSettings,
    });
    setRightPanelTab('audio');
  };

  // Helper to convert base64 to Blob
  const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  };

  // Extract thinking content from response (remove <think> tags)
  const extractThinking = (text: string): { thinking: string; content: string } => {
    const thinkMatch = text.match(/<think>([\s\S]*?)<\/think>/i);
    if (thinkMatch) {
      const thinking = thinkMatch[1].trim();
      const content = text.replace(/<think>[\s\S]*?<\/think>/i, '').trim();
      return { thinking, content };
    }
    return { thinking: '', content: text };
  };

  // Convert inline citations to footnotes
  const processCitations = (text: string): { content: string; citations: Citation[] } => {
    const citations: Citation[] = [];
    let citationNumber = 1;

    // Match multiple citation patterns:
    // 1. (Source X, "Title") - Common source format
    // 2. (filename @HASH, keyword) - Hash-based citations
    // 3. (Source X) - Simple source references
    const citationPatterns = [
      /\(Source\s+\d+,\s*"[^"]+"\)/gi,  // (Source 3, "Title")
      /\([^)]*@[A-Z0-9]+[^)]*\)/g,      // (filename @HASH)
      /\(Source\s+\d+\)/gi,              // (Source 3)
    ];

    let processedContent = text;

    // Process each pattern
    citationPatterns.forEach(pattern => {
      processedContent = processedContent.replace(pattern, (match) => {
        // Check if we already added this citation
        const existingCitation = citations.find(c => c.fullText === match.slice(1, -1));
        if (existingCitation) {
          return `[${existingCitation.number}]`;
        }

        citations.push({
          number: citationNumber,
          fullText: match.slice(1, -1), // Remove parentheses
        });
        return `[${citationNumber++}]`;
      });
    });

    return { content: processedContent, citations };
  };

  // Auto-scroll to bottom when new messages arrive or loading state changes
  React.useEffect(() => {
    // Use setTimeout to ensure DOM has updated before scrolling
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages, isLoading]);

  // TTS settings are now passed via props from page level

  const tabTitles = [
    { title: 'AI Assistant', subtitle: `Chat with your ${selectedSourceCount} selected source${selectedSourceCount !== 1 ? 's' : ''}` },
    { title: 'Script Editor', subtitle: 'Review and edit the generated podcast script' },
    { title: 'Podcast Audio', subtitle: 'Listen, download, and share your podcast' },
  ];

  const handleTabChange = (index: number) => {
    console.log('🔄 handleTabChange called with index:', index);
    console.log('🔄 Current activeTabIndex:', activeTabIndex);
    setActiveTabIndex(index);
    console.log('🔄 Calling parent onTabChange');
    onTabChange?.(index);
  };

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const surfaceBase = useSemanticToken('surface.base');
  const glassBackground = useSemanticToken('glass.background');
  const glassBlur = useSemanticToken('glass.blur');
  const glassBorder = useSemanticToken('glass.border');
  const surfaceRaised = useSemanticToken('surface.raised');
  const borderAccent = useSemanticToken('border.accent');
  const surfaceHover = useSemanticToken('surface.hover');
  const surfaceHighlight = useSemanticToken('surface.highlight');
  const surfaceSunken = useSemanticToken('surface.sunken');
  const borderSubtle = useSemanticToken('border.subtle');

  const handleChatSubmit = async (query: string, mode: string, model: string) => {
    const userMessage: Message = {
      role: 'user',
      content: query,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Build context from selected materials
      const context = selectedMaterials.length > 0
        ? selectedMaterials.map(m => `
### ${m.title} (${m.wordCount} words, ${m.pageCount || 'N/A'} pages)

${m.content || 'Content not available'}
`).join('\n---\n')
        : 'No sources selected.';

      // Call Next.js API route which proxies to local vLLM (same pattern as summary/context)
      // Build conversation history with context
      const conversationMessages = [
        {
          role: 'system',
          content: `You are a helpful research assistant analyzing documents for podcast creation. Answer questions based on the provided source materials. Be accurate, concise, and cite specific information from the sources when relevant.

# Source Materials

${context}`
        },
        // Include all previous messages for context
        ...messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        // Add current user message
        {
          role: 'user',
          content: query
        }
      ];

      const response = await fetch('/api/podcast-studio/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'qwen3-32b',
          messages: conversationMessages,
          temperature: 0.3,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        throw new Error(`vLLM returned ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.choices[0].message.content,
        timestamp: new Date(),
        model: model, // Track which model was used
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Pregenerate audio in background for longer responses (ready for instant playback when user clicks)
      const charCount = assistantMessage.content.length;
      const shouldPregenerate = charCount >= minCharsForPregeneration;

      console.log(`📊 Pregeneration check: ${charCount} chars vs ${minCharsForPregeneration} threshold = ${shouldPregenerate ? 'YES' : 'NO'}`);

      if (shouldPregenerate) {
        console.log(`🎤 STARTING audio pregeneration (${charCount} chars)`);
        pregenerate(assistantMessage.content, { voice: ttsVoice, speed: ttsSpeed, pitch: ttsPitch })
          .then(() => {
            console.log(`✅ Audio pregeneration COMPLETE for response (${charCount} chars) - ready for instant playback!`);
          })
          .catch((error) => {
            console.error('❌ Audio pregeneration FAILED:', error);
            console.error('Error details:', error.message || error);
            // Silently fail - audio will be generated on-demand if pregeneration fails
          });
      } else {
        console.log(`⏭️ SKIPPING pregeneration: ${charCount} chars < ${minCharsForPregeneration} threshold (will generate on-demand when clicked)`);
      }

    } catch (error) {
      console.error('Chat error:', error);

      const errorMessage: Message = {
        role: 'assistant',
        content: `Sorry, I encountered an error processing your request: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);

      toast({
        title: 'Chat Error',
        description: 'Failed to get response from AI. Please check your connection and try again.',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinMessage = (message: Message, index: number) => {
    // TODO: Integrate with NotesPanel/SourcesPanel
    console.log('Pinning message:', message);

    toast({
      title: 'Saved to Notes',
      description: 'AI response saved as a note and added to sources.',
      status: 'success',
      duration: 3000,
      isClosable: true,
      position: 'top-right',
    });
  };

  // Debug preview data changes
  useEffect(() => {
    console.log('🔍 Preview state changed:', {
      hasPreviewData: !!previewData,
      previewMode,
      hasAudioUrl: !!generatedAudioUrl,
      audioDuration
    });
  }, [previewData, previewMode, generatedAudioUrl, audioDuration]);

  // Update right panel based on active tab and preview state
  // Sync right panel tab with center tab on mount and tab change
  useEffect(() => {
    console.log('🔄 Right panel update triggered:', {
      activeTabIndex,
      previewMode,
      hasAudioUrl: !!generatedAudioUrl,
      audioDuration
    });

    // Tab indices: 0=Chat, 1=Script, 2=Voice Design, 3=Generate Audio, 4=Audio Player
    // Each main tab shows only relevant right panel tabs via visibleTabs
    if (activeTabIndex === 0) {
      // Chat with Sources - show LLM config, source metadata, and AI assistant
      setCustomData({
        type: 'llm-config',
        visibleTabs: ['llm-config', 'source-info', 'ai-assistant'],
        researchMaterials: selectedMaterials,
      });
      setRightPanelTab('llm-config');
    } else if (activeTabIndex === 1) {
      // Podcast Script - show workflow panel for script generation + voice config when script exists
      setCustomData({
        type: 'podcast-workflow',
        visibleTabs: generatedScript.length > 0 ? ['workflow', 'voices', 'notes'] : ['workflow', 'voices', 'notes', 'insights'],
        researchMaterials: selectedMaterials,
        projectId, // Pass projectId for database persistence
        // Voice configuration props
        generatedScript,
        scriptSpeakers,
        voiceAssignments,
        onGenerate: handleGenerateAudio,
        isGenerating: isGeneratingAudio,
        audioProgress,
        selectedScriptId: selectedScriptId || (generatedScript.length > 0 ? 'local-script' : null),
        scriptMetadata: generatedScript.length > 0 ? {
          wordCount: scriptMetadataState?.wordCount || generatedScript.reduce((sum, t) => sum + (t.content?.split(/\s+/).length || 0), 0),
          dialogueCount: scriptMetadataState?.turnCount || generatedScript.length,
          estimatedDuration: Math.round((scriptMetadataState?.wordCount || generatedScript.reduce((sum, t) => sum + (t.content?.split(/\s+/).length || 0), 0)) / 150),
          // Rich metadata from backend (when available)
          podcastStyle: scriptMetadataState?.podcastStyle,
          audience: scriptMetadataState?.audience,
          language: scriptMetadataState?.language,
          tone: scriptMetadataState?.tone,
          podcastFormat: scriptMetadataState?.podcastFormat,
          speakerProfiles: scriptMetadataState?.speakerProfiles,
        } : null,
        audioDirection: scriptAudioDirection,
        onVoiceAssignmentsChange: (assignments: any[]) => {
          // Handle voice assignment updates if needed
          console.log('Voice assignments updated:', assignments);
        },
        onScriptGenerated: (scriptData: any) => {
          console.log('📝 Script generated, updating local state:', scriptData);
          if (scriptData?.dialogue && Array.isArray(scriptData.dialogue)) {
            // Convert to ConversationTurn format
            const turns: ConversationTurn[] = scriptData.dialogue.map((turn: any) => ({
              id: turn.id || `turn-${Date.now()}-${Math.random()}`,
              speaker: turn.speaker,
              content: turn.content,
              emotion: turn.emotion || 'neutral',
              duration: turn.duration,
            }));
            setLocalGeneratedScript(turns);
            // Capture language from script metadata
            if (scriptData.metadata?.language) {
              setScriptLanguage(scriptData.metadata.language);
            }
            console.log(`✅ Stored ${turns.length} dialogue turns (lang: ${scriptData.metadata?.language || 'unknown'})`);
          }
        },
        existingScript: generatedScript,
        existingSpeakers: scriptSpeakers,
        language: scriptLanguage || detectedLanguage,
      });
      setRightPanelTab(generatedScript.length > 0 ? 'voices' : 'workflow');
    } else if (activeTabIndex === 2) {
      // Podcast Audio tab - show podcast playback controls + review tab
      if (selectedPodcastEpisode || generatedAudioUrl) {
        setCustomData({
          type: 'playback-review',
          visibleTabs: ['audio', 'review'],
          // Podcast controls props
          episode: selectedPodcastEpisode || {
            id: 'generated',
            title: 'Generated Podcast',
            audioUrl: generatedAudioUrl,
            duration: audioDuration,
          },
          playbackSpeed,
          transcriptSettings,
          onPlaybackSpeedChange: setPlaybackSpeed,
          onTranscriptSettingsChange: setTranscriptSettings,
          // Review panel / Turn Editor props
          transcript: memoizedTranscript,
          qualityTags,
          activeSegmentIndex,
          isPlaying: isPlayingAudio,
          // Production metadata for re-recording
          ttsProvider: selectedPodcastEpisode?.ttsProvider,
          ttsModel: selectedPodcastEpisode?.ttsModel,
          language: scriptLanguage || detectedLanguage,
          speakers: scriptSpeakers.map(s => ({
            name: s.name,
            gender: s.gender,
            voiceId: s.id,
            voiceName: s.role,
          })),
          episodeId: selectedPodcastEpisode?.id,
          onQualityTagChange: (index: number, tag: string | null) => {
            setQualityTags(prev => {
              const next = { ...prev };
              if (tag === null) {
                delete next[index];
              } else {
                next[index] = tag;
              }
              return next;
            });
          },
          onSeekToSegment: (index: number) => {
            // Will be handled by PodcastPlaybackPanel via ref
            setActiveSegmentIndex(index);
          },
        });
        setRightPanelTab('review');
      } else {
        // No podcast selected - show empty state or library
        setCustomData({
          type: 'podcast-library',
          visibleTabs: [],
        });
      }
    } else if (activeTabIndex === 3) {
      // Generate Audio tab - show audio controls OR workflow based on preview state
      if (previewMode !== 'none' && generatedAudioUrl) {
        console.log('✅ Setting audio controls for preview');
        const customDataPayload = {
          type: 'podcast-controls',
          visibleTabs: ['audio', 'workflow'],
          episode: {
            id: 'preview',
            title: `Preview (${previewMode})`,
            audioUrl: generatedAudioUrl,
            duration: audioDuration,
            metadata: {
              mode: previewMode,
              timeSaved: previewData?.timeSaved || 0
            }
          },
          playbackSpeed,
          transcriptSettings,
          onPlaybackSpeedChange: setPlaybackSpeed,
          onTranscriptSettingsChange: setTranscriptSettings,
        };
        console.log('📦 Custom data payload:', customDataPayload);
        setCustomData(customDataPayload);
        setRightPanelTab('audio');
      } else {
        // No preview yet - show workflow panel for production settings
        setCustomData({
          type: 'multi-stage-production',
          visibleTabs: ['workflow', 'audio'],
          onGenerate: handleGenerateAudio,
          isGenerating: isGeneratingAudio,
          audioProgress,
          stageResults,
          currentStage,
          onStageSelect: setSelectedStageForReview,
        });
        setRightPanelTab('workflow');
      }
    } else if (activeTabIndex === 4) {
      // Audio Player tab - show playback controls and export
      setCustomData({
        type: 'podcast-controls',
        visibleTabs: ['audio', 'export'],
        episode: selectedPodcastEpisode,
        playbackSpeed,
        transcriptSettings,
        onPlaybackSpeedChange: setPlaybackSpeed,
        onTranscriptSettingsChange: setTranscriptSettings,
      });
      setRightPanelTab('audio');
    }
    // Depend on tab index and preview state to update right panel
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabIndex, previewMode, generatedAudioUrl, audioDuration, stageResults, currentStage, isGeneratingAudio, selectedMaterials, generatedScript, scriptSpeakers, qualityTags, activeSegmentIndex, isPlayingAudio]);

  return (
    <Tabs
      variant="unstyled"
      h="full"
      display="flex"
      flexDirection="column"
      index={activeTabIndex}
      onChange={handleTabChange}
    >
      {/* Single-line header with title on left, tabs on right */}
      <HStack
        justify="space-between"
        px={0}
        py={3}
        borderBottom="1px solid"
        borderColor={borderColor}
        flexShrink={0}
      >
        <VStack align="start" spacing={0} minW="0" flex="1">
          <Text fontSize="md" fontWeight="bold" color={textColor} isTruncated>
            {tabTitles[activeTabIndex].title}
          </Text>
          <Text fontSize="xs" color={mutedColor} isTruncated>
            {tabTitles[activeTabIndex].subtitle}
          </Text>
        </VStack>

        <TabList border="none" gap={2}>
          <Tab
            fontSize="xs"
            py={2}
            px={3}
            borderRadius="md"
            bg={glassBackground}
            backdropFilter={`blur(${glassBlur})`}
            border="1px solid"
            borderColor={glassBorder}
            color={mutedColor}
            _selected={{
              color: textColor,
              bg: surfaceRaised,
              borderColor: borderAccent,
              boxShadow: 'md'
            }}
            _hover={{
              bg: surfaceHover,
              color: textColor,
              borderColor: borderColor
            }}
          >
            <HStack spacing={1.5}>
              <Icon as={FiMessageSquare} boxSize={3.5} />
              <Text>AI Assistant</Text>
            </HStack>
          </Tab>
          <Tab
            fontSize="xs"
            py={2}
            px={3}
            borderRadius="md"
            bg={glassBackground}
            backdropFilter={`blur(${glassBlur})`}
            border="1px solid"
            borderColor={glassBorder}
            color={mutedColor}
            _selected={{
              color: textColor,
              bg: surfaceRaised,
              borderColor: borderAccent,
              boxShadow: 'md'
            }}
            _hover={{
              bg: surfaceHover,
              color: textColor,
              borderColor: borderColor
            }}
          >
            <HStack spacing={1.5}>
              <Icon as={FiEdit} boxSize={3.5} />
              <Text>Script Editor</Text>
            </HStack>
          </Tab>
          <Tab
            fontSize="xs"
            py={2}
            px={3}
            borderRadius="md"
            bg={glassBackground}
            backdropFilter={`blur(${glassBlur})`}
            border="1px solid"
            borderColor={glassBorder}
            color={mutedColor}
            _selected={{
              color: textColor,
              bg: surfaceRaised,
              borderColor: borderAccent,
              boxShadow: 'md'
            }}
            _hover={{
              bg: surfaceHover,
              color: textColor,
              borderColor: borderColor
            }}
          >
            <HStack spacing={1.5}>
              <Icon as={FiHeadphones} boxSize={3.5} />
              <Text>Podcast Audio</Text>
            </HStack>
          </Tab>
        </TabList>
      </HStack>

      <Box flex={1} overflow="hidden" h="full">
        {/* AI Assistant Tab - Index 0 */}
        <Box h="full" display={activeTabIndex === 0 ? "flex" : "none"} flexDirection="column" p={0} overflow="hidden">
          <VStack h="full" spacing={0} align="stretch" overflow="hidden">
            {/* Messages */}
            <Box flex={1} overflowY="auto" py={4} px={0}>
              {/* Auto-Summary of All Sources - NotebookLM Style */}
              {selectedMaterials && selectedMaterials.length > 0 && (
                <Box
                  mb={6}
                  bg={bgColor}
                  border="1px solid"
                  borderColor={borderColor}
                  borderRadius="24px"
                  p={6}
                  boxShadow="sm"
                >
                  <HStack spacing={3} mb={4}>
                    <Box w="32px" h="32px" bg="blue.500" borderRadius="full" display="flex" alignItems="center" justifyContent="center">
                      <Text fontSize="16px">📚</Text>
                    </Box>
                    <VStack align="start" spacing={0}>
                      <Text fontSize="md" fontWeight="bold" color={textColor}>
                        Your Sources ({selectedMaterials.length})
                      </Text>
                      <Text fontSize="xs" color={mutedColor}>
                        Auto-generated summary
                      </Text>
                    </VStack>
                  </HStack>

                  {/* Combined podcast context - generated once for all sources */}
                  <Box mb={4}>
                    {isGeneratingContext ? (
                      <VStack spacing={3} py={4}>
                        <Spinner size="md" color="blue.500" />
                        <Text fontSize="sm" color={mutedColor}>Generating podcast context...</Text>
                      </VStack>
                    ) : podcastContext ? (
                      <VStack align="stretch" spacing={4}>
                        {/* Combined Summary */}
                        <Box>
                          <Text color={textColor} fontSize="sm" lineHeight="1.8">
                            {podcastContext.combinedSummary}
                          </Text>
                        </Box>

                        {/* Key Themes */}
                        {podcastContext.keyThemes.length > 0 && (
                          <HStack spacing={2} flexWrap="wrap">
                            {podcastContext.keyThemes.map((theme, i) => (
                              <Badge key={i} colorScheme="blue" fontSize="10px" px={2} py={0.5} borderRadius="full">
                                {theme}
                              </Badge>
                            ))}
                          </HStack>
                        )}

                        {/* Talking Points */}
                        {podcastContext.talkingPoints.length > 0 && (
                          <Box>
                            <Text fontSize="xs" fontWeight="600" color={mutedColor} mb={2}>
                              💡 Key Discussion Points:
                            </Text>
                            <VStack align="stretch" spacing={1.5}>
                              {podcastContext.talkingPoints.map((point, i) => (
                                <HStack key={i} spacing={2} align="start">
                                  <Badge colorScheme="blue" fontSize="9px" minW="20px" textAlign="center">{i + 1}</Badge>
                                  <Text fontSize="xs" color={textColor} lineHeight="1.6">{point}</Text>
                                </HStack>
                              ))}
                            </VStack>
                          </Box>
                        )}
                      </VStack>
                    ) : (
                      <Text color={mutedColor} fontSize="sm" fontStyle="italic">
                        Select sources to generate podcast context...
                      </Text>
                    )}
                  </Box>

                  <Text fontSize="xs" color={mutedColor} fontStyle="italic" mb={4}>
                    💡 Ask me questions about these sources, or I can help generate insights for your podcast.
                  </Text>

                  {/* Action Buttons */}
                  <HStack spacing={2} pt={3} borderTop="1px solid" borderColor={borderColor}>
                    <Tooltip label={podcastContext?.fromCache ? "Force Regenerate (currently using cached summary)" : "Regenerate podcast context"}>
                      <IconButton
                        aria-label="Regenerate podcast context"
                        icon={isGeneratingContext ? <Spinner size="xs" /> : <FiRefreshCw />}
                        size="sm"
                        variant="ghost"
                        colorScheme={podcastContext?.fromCache ? "orange" : "blue"}
                        isDisabled={isGeneratingContext || selectedMaterials.length === 0}
                        onClick={() => generatePodcastContext(selectedMaterials, true)}
                      />
                    </Tooltip>
                    <Tooltip label={speakingMessageIndex === -1 && isSpeaking ? "Stop reading" : "Read aloud"}>
                      <IconButton
                        aria-label="Read aloud"
                        icon={speakingMessageIndex === -1 && isSpeaking ? <FiStopCircle /> : <FiVolume2 />}
                        size="sm"
                        variant="ghost"
                        colorScheme="blue"
                        onClick={async () => {
                          if (speakingMessageIndex === -1 && isSpeaking) {
                            stop();
                            setSpeakingMessageIndex(null);
                          } else {
                            setSpeakingMessageIndex(-1);
                            // Read the full podcast context summary if available, otherwise fall back to individual summaries
                            let summaryText = '';
                            if (podcastContext?.combinedSummary) {
                              summaryText = podcastContext.combinedSummary;
                              if (podcastContext.keyThemes?.length > 0) {
                                summaryText += `. Key themes: ${podcastContext.keyThemes.join(', ')}`;
                              }
                            } else {
                              summaryText = selectedMaterials.map((m, idx) =>
                                `Source ${idx + 1}: ${m.title}. ${m.metadata?.summary || 'Document ready for analysis'}`
                              ).join('. ');
                            }
                            try {
                              await speak(summaryText, { voice: ttsVoice, speed: ttsSpeed, pitch: ttsPitch });
                              setSpeakingMessageIndex(null);
                            } catch (error) {
                              toast({
                                title: 'Unable to play audio',
                                description: 'TTS generation failed',
                                status: 'error',
                                duration: 3000,
                              });
                              setSpeakingMessageIndex(null);
                            }
                          }
                        }}
                      />
                    </Tooltip>
                  </HStack>
                </Box>
              )}

              {messages.length === 0 ? (
                <VStack spacing={3} pt={2} align="stretch" maxW="2xl" mx="auto">
                  {/* Empty State Header */}
                  <VStack spacing={2}>
                    <Icon as={FiMessageSquare} boxSize={8} color={mutedColor} />
                    <Text fontSize="md" fontWeight="medium" color={textColor}>
                      {selectedSourceCount === 0 ? '🚀 Quick Start' : 'What would you like to know?'}
                    </Text>
                    <Text fontSize="xs" color={mutedColor} textAlign="center" maxW="md">
                      {selectedSourceCount === 0
                        ? 'Get started by adding research materials to your podcast project'
                        : `Ask questions about your ${selectedSourceCount} selected source${selectedSourceCount !== 1 ? 's' : ''} to explore themes and extract key insights`
                      }
                    </Text>
                  </VStack>

                  {/* No Sources: Quick Start Guide */}
                  {selectedSourceCount === 0 && (
                    <Box
                      p={3}
                      bg={surfaceHighlight}
                      borderRadius="lg"
                      border="2px dashed"
                      borderColor={borderAccent}
                    >
                      <VStack spacing={2} align="stretch">
                        <HStack spacing={2}>
                          <Badge colorScheme="blue" fontSize="9px" px={1.5} py={0.5}>STEP 1</Badge>
                          <Text fontSize="xs" fontWeight="600" color={textColor}>Add Research Sources</Text>
                        </HStack>
                        <Text fontSize="10px" color={mutedColor} pl={6}>
                          Upload PDFs, documents, or add URLs from the left panel to build your podcast research base
                        </Text>

                        <HStack spacing={2}>
                          <Badge colorScheme="purple" fontSize="9px" px={1.5} py={0.5}>STEP 2</Badge>
                          <Text fontSize="xs" fontWeight="600" color={textColor}>Chat with AI Assistant</Text>
                        </HStack>
                        <Text fontSize="10px" color={mutedColor} pl={6}>
                          Ask questions, explore themes, and extract key insights before generating your script
                        </Text>

                        <HStack spacing={2}>
                          <Badge colorScheme="green" fontSize="9px" px={1.5} py={0.5}>STEP 3</Badge>
                          <Text fontSize="xs" fontWeight="600" color={textColor}>Generate Podcast</Text>
                        </HStack>
                        <Text fontSize="10px" color={mutedColor} pl={6}>
                          Use the "Generate" button to create professional podcast scripts and audio
                        </Text>
                      </VStack>
                    </Box>
                  )}
                </VStack>
              ) : (
                <Box
                  bg={surfaceSunken}
                  border="1px solid"
                  borderColor={borderSubtle}
                  borderRadius="16px"
                  p={5}
                  boxShadow="sm"
                >
                  <VStack spacing={4} align="stretch">
                    {messages.map((msg, idx) => {
                      // Extract thinking content and process citations for assistant messages
                      const { thinking, content: contentWithoutThinking } = msg.role === 'assistant'
                        ? extractThinking(msg.content)
                        : { thinking: '', content: msg.content };
                      
                      const { content: processedContent, citations } = msg.role === 'assistant'
                        ? processCitations(contentWithoutThinking)
                        : { content: contentWithoutThinking, citations: [] };

                      return (
                        <Box
                          key={idx}
                          alignSelf={msg.role === 'user' ? 'flex-end' : 'flex-start'}
                          maxW="75%"
                          position="relative"
                          onMouseEnter={() => setHoveredMessageIndex(idx)}
                          onMouseLeave={() => setHoveredMessageIndex(null)}
                        >

                          <Box
                            bg={msg.role === 'user' ? 'blue.500' : bgColor}
                            color={msg.role === 'user' ? 'white' : textColor}
                            p={3}
                            borderRadius="xl"
                            boxShadow="md"
                            border="1px solid"
                            borderColor={msg.role === 'user' ? 'blue.500' : borderColor}
                            transition="all 0.2s ease"
                            _hover={{ boxShadow: 'lg' }}
                          >
                            {msg.role === 'user' ? (
                              <Text fontSize="sm" whiteSpace="pre-wrap" lineHeight="1.6">
                                {msg.content}
                              </Text>
                            ) : (
                              <VStack align="stretch" spacing={2}>
                                <Box
                                  fontSize="sm"
                                  lineHeight="1.7"
                                  className="markdown-content"
                                  sx={{
                                    '& p': { marginBottom: '0.5rem' },
                                    '& ul, & ol': { marginLeft: '1.5rem', marginBottom: '0.5rem' },
                                    '& li': { marginBottom: '0.25rem' },
                                    '& strong': { fontWeight: 'bold' },
                                    '& em': { fontStyle: 'italic' },
                                    '& code': { background: 'gray.100', padding: '0.125rem 0.25rem', borderRadius: 'sm' },
                                    '& pre': { background: 'gray.100', padding: '0.5rem', borderRadius: 'md', marginY: '0.5rem', overflowX: 'auto' },
                                    '& h1, & h2, & h3': { fontWeight: 'bold', marginTop: '0.75rem', marginBottom: '0.5rem' },
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                  }}
                                >
                                  <ReactMarkdown
                                    components={{
                                      p: ({ children }) => <Text mb={2} whiteSpace="pre-wrap">{children}</Text>,
                                      strong: ({ children }) => <Text as="strong" fontWeight="bold">{children}</Text>,
                                      em: ({ children }) => <Text as="em" fontStyle="italic">{children}</Text>,
                                      h1: ({ children }) => <Heading size="md" mb={2} mt={3}>{children}</Heading>,
                                      h2: ({ children }) => <Heading size="sm" mb={2} mt={3}>{children}</Heading>,
                                      h3: ({ children }) => <Heading size="xs" mb={2} mt={2}>{children}</Heading>,
                                      ul: ({ children }) => <UnorderedList mb={2} ml={4} spacing={1}>{children}</UnorderedList>,
                                      ol: ({ children }) => <OrderedList mb={2} ml={4} spacing={1}>{children}</OrderedList>,
                                      li: ({ children }) => <ListItem>{children}</ListItem>,
                                      code: ({ children, inline }: any) =>
                                        inline ? (
                                          <Code px={1} py={0.5} fontSize="0.9em" bg={surfaceBase}>{children}</Code>
                                        ) : (
                                          <Code display="block" p={2} my={2} borderRadius="md" fontSize="0.9em" overflowX="auto" whiteSpace="pre">{children}</Code>
                                        ),
                                      blockquote: ({ children }) => (
                                        <Box
                                          borderLeftWidth="3px"
                                          borderLeftColor="blue.500"
                                          pl={4}
                                          py={2}
                                          my={2}
                                          fontStyle="italic"
                                        >
                                          {children}
                                        </Box>
                                      ),
                                      br: () => <Box as="br" />,
                                    }}
                                  >
                                    {processedContent}
                                  </ReactMarkdown>
                                </Box>

                                {/* Enhanced Citations Section */}
                                {citations.length > 0 && (
                                  <Box
                                    mt={4}
                                    p={3}
                                    bg={bgColor}
                                    borderRadius="lg"
                                    border="1px solid"
                                    borderColor={borderColor}
                                  >
                                    <HStack spacing={2} mb={2}>
                                      <Badge colorScheme="blue" fontSize="9px">
                                        {citations.length} Source{citations.length !== 1 ? 's' : ''}
                                      </Badge>
                                      <Text fontSize="10px" fontWeight="600" color={textColor}>
                                        Sources Referenced:
                                      </Text>
                                    </HStack>

                                    <VStack spacing={1.5} align="stretch">
                                      {citations.map((citation) => (
                                        <Popover key={citation.number} trigger="hover" placement="top">
                                          <PopoverTrigger>
                                            <HStack
                                              px={2}
                                              py={1.5}
                                              bg={bgColor}
                                              borderRadius="md"
                                              cursor="pointer"
                                              transition="all 0.2s"
                                              _hover={{
                                                boxShadow: 'sm',
                                                transform: 'translateX(2px)',
                                                borderColor: 'blue.400'
                                              }}
                                              border="1px solid"
                                              borderColor={borderColor}
                                            >
                                              <Badge
                                                colorScheme="blue"
                                                fontSize="9px"
                                                px={1.5}
                                                borderRadius="full"
                                              >
                                                [{citation.number}]
                                              </Badge>
                                              <Text
                                                fontSize="10px"
                                                color={textColor}
                                                noOfLines={1}
                                                flex="1"
                                              >
                                                {citation.fullText}
                                              </Text>
                                              <Icon
                                                as={FiExternalLink}
                                                boxSize={3}
                                                color={mutedColor}
                                              />
                                            </HStack>
                                          </PopoverTrigger>
                                          <PopoverContent
                                            maxW="450px"
                                            bg={bgColor}
                                            borderColor={borderColor}
                                          >
                                            <PopoverArrow />
                                            <PopoverHeader fontWeight="600" fontSize="xs">
                                              Source Citation [{citation.number}]
                                            </PopoverHeader>
                                            <PopoverBody>
                                              <VStack align="stretch" spacing={2}>
                                                <Text fontSize="xs" color={textColor}>
                                                  {citation.fullText}
                                                </Text>
                                                <Divider />
                                                <Text fontSize="10px" color={mutedColor} fontStyle="italic">
                                                  Click to view full source (if available)
                                                </Text>
                                              </VStack>
                                            </PopoverBody>
                                          </PopoverContent>
                                        </Popover>
                                      ))}
                                    </VStack>
                                  </Box>
                                )}
                              </VStack>
                            )}
                          </Box>

                          {msg.role === 'assistant' && (
                            <VStack align="stretch" mt={3} spacing={2}>
                              <Divider />
                              <HStack justify="space-between">
                                <HStack spacing={1}>
                                  <Tooltip label="Pin to Notes" openDelay={500} closeDelay={100}>
                                    <IconButton
                                      aria-label="Pin to notes"
                                      icon={<FiBookmark />}
                                      size="xs"
                                      variant="ghost"
                                      onClick={() => handlePinMessage(msg, idx)}
                                    />
                                  </Tooltip>
                                  <Tooltip
                                    label={
                                      speakingMessageIndex === idx
                                        ? 'Stop Reading'
                                        : isCached(processedContent, { voice: ttsVoice, speed: ttsSpeed, pitch: ttsPitch })
                                          ? '🔊 Ready - Click to Play (Instant)'
                                          : 'Read Aloud (TTS - will generate)'
                                    }
                                    openDelay={500}
                                    closeDelay={100}
                                  >
                                    <Box position="relative" display="inline-block">
                                      <IconButton
                                        aria-label="Read aloud"
                                        icon={
                                          speakingMessageIndex === idx ? (
                                            isSpeaking ? <Spinner size="xs" /> : <FiStopCircle />
                                          ) : (
                                            <FiVolume2 />
                                          )
                                        }
                                        size="xs"
                                        variant="ghost"
                                        colorScheme={speakingMessageIndex === idx ? 'green' : 'gray'}
                                        onClick={async () => {
                                          if (speakingMessageIndex === idx) {
                                            // Stop if currently speaking this message
                                            stop();
                                            setSpeakingMessageIndex(null);
                                          } else {
                                            // Start speaking
                                            setSpeakingMessageIndex(idx);

                                            try {
                                              // Use content without thinking tags for TTS
                                              await speak(processedContent, { voice: ttsVoice, speed: ttsSpeed, pitch: ttsPitch });
                                            } catch (error) {
                                              toast({
                                                title: 'Unable to play audio',
                                                description: 'TTS service unavailable',
                                                status: 'error',
                                                duration: 3000,
                                              });
                                            } finally {
                                              setSpeakingMessageIndex(null);
                                            }
                                          }
                                        }}
                                      />
                                      {/* Green check badge when audio is ready */}
                                      {!isSpeaking && isCached(processedContent, { voice: ttsVoice, speed: ttsSpeed, pitch: ttsPitch }) && (
                                        <Badge
                                          position="absolute"
                                          top="-4px"
                                          right="-4px"
                                          bg="green.500"
                                          color="whiteAlpha.900"
                                          borderRadius="full"
                                          boxSize="12px"
                                          display="flex"
                                          alignItems="center"
                                          justifyContent="center"
                                          fontSize="8px"
                                          fontWeight="bold"
                                          border="2px solid white"
                                        >
                                          ✓
                                        </Badge>
                                      )}
                                    </Box>
                                  </Tooltip>
                                  <Tooltip label="Connect with Sources" openDelay={500} closeDelay={100}>
                                    <IconButton
                                      aria-label="Connect with sources"
                                      icon={<FiLink />}
                                      size="xs"
                                      variant="ghost"
                                      onClick={() => {
                                        toast({
                                          title: 'Coming soon',
                                          description: 'Source linking will be available soon',
                                          status: 'info',
                                          duration: 3000,
                                        });
                                      }}
                                    />
                                  </Tooltip>
                                  <Tooltip label="Copy to Clipboard" openDelay={500} closeDelay={100}>
                                    <IconButton
                                      aria-label="Copy to clipboard"
                                      icon={<FiCopy />}
                                      size="xs"
                                      variant="ghost"
                                      onClick={() => {
                                        navigator.clipboard.writeText(msg.content);
                                        toast({
                                          title: 'Copied!',
                                          description: 'Response copied to clipboard',
                                          status: 'success',
                                          duration: 2000,
                                        });
                                      }}
                                    />
                                  </Tooltip>
                                </HStack>
                                <HStack spacing={2}>
                                  {msg.model && (
                                    <Badge colorScheme="purple" fontSize="9px" px={2} py={0.5}>
                                      {msg.model}
                                    </Badge>
                                  )}
                                  <Text fontSize="10px" color={mutedColor}>
                                    {msg.timestamp.toLocaleTimeString()}
                                  </Text>
                                </HStack>
                              </HStack>
                            </VStack>
                          )}
                        </Box>
                      );
                    })}

                    {/* Typing Indicator */}
                    {isLoading && (
                      <Box
                        alignSelf="flex-start"
                        maxW="75%"
                      >
                        <Box
                          bg={bgColor}
                          p={3}
                          borderRadius="xl"
                          boxShadow="md"
                          border="1px solid"
                          borderColor={borderColor}
                        >
                          <HStack spacing={1.5}>
                            <Box
                              w="8px"
                              h="8px"
                              borderRadius="full"
                              bg="blue.400"
                              animation="bounce 1.4s infinite ease-in-out"
                              sx={{
                                '@keyframes bounce': {
                                  '0%, 80%, 100%': { transform: 'scale(0)' },
                                  '40%': { transform: 'scale(1)' },
                                },
                              }}
                            />
                            <Box
                              w="8px"
                              h="8px"
                              borderRadius="full"
                              bg="blue.400"
                              animation="bounce 1.4s infinite ease-in-out"
                              sx={{
                                animationDelay: '0.2s',
                                '@keyframes bounce': {
                                  '0%, 80%, 100%': { transform: 'scale(0)' },
                                  '40%': { transform: 'scale(1)' },
                                },
                              }}
                            />
                            <Box
                              w="8px"
                              h="8px"
                              borderRadius="full"
                              bg="blue.400"
                              animation="bounce 1.4s infinite ease-in-out"
                              sx={{
                                animationDelay: '0.4s',
                                '@keyframes bounce': {
                                  '0%, 80%, 100%': { transform: 'scale(0)' },
                                  '40%': { transform: 'scale(1)' },
                                },
                              }}
                            />
                          </HStack>
                        </Box>
                      </Box>
                    )}

                    {/* Scroll anchor */}
                    <div ref={messagesEndRef} />
                  </VStack>
                </Box>
              )}
            </Box>

            {/* Input — stable pb prevents clipping when tool badges toggle */}
            <Box pt={1} pb={3} px={0} flexShrink={0}>
              <AIInputInterface
                onSubmit={handleChatSubmit}
                isLoading={isLoading}
                defaultModel={defaultModel}
                compact={true}
              />
            </Box>
          </VStack>
        </Box>

        {/* Script Editor Tab - Index 1 */}
        <Box h="full" p={0} display={activeTabIndex === 1 ? "flex" : "none"} flexDirection="column">
          {/* Stage Review Section */}
          {selectedStageForReview && stageResults.length > 0 && (
            <Box mb={4} p={4}>
              <HStack mb={3} justify="space-between">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedStageForReview(null)}
                >
                  ← Back to Script
                </Button>

                <Badge colorScheme="purple" fontSize="sm">
                  Reviewing: {selectedStageForReview}
                </Badge>
              </HStack>

              <StageOutputViewer
                stage={selectedStageForReview}
                output={stageResults.find(r => r.stage === selectedStageForReview)?.output}
                metadata={stageResults.find(r => r.stage === selectedStageForReview)?.metadata}
              />
            </Box>
          )}

          {!selectedStageForReview && generatedScript.length > 0 ? (
            <VStack h="full" spacing={0} align="stretch">
              {/* Scrollable script content */}
              <Box flex="1" overflowY="auto" py={4} px={4}>
                <VStack spacing={4} align="stretch">

                  {/* ── Script Metadata Card ─────────────────────────── */}
                  {(() => {
                    const meta = scriptMetadataState;
                    const params = selectedScriptSettings?.generation_params;
                    const preset = params?.preset;
                    const totalWords = generatedScript.reduce((sum, t) => sum + (t.content?.split(/\s+/).length || 0), 0);
                    const estMinutes = (() => {
                      let secs = 0;
                      generatedScript.forEach((turn, idx) => {
                        const w = turn.content.split(' ').length;
                        secs += w * 0.4;
                        secs += (turn.content.match(/\[(pause|pausa|silencio|beat)\]/gi) || []).length * 1.5;
                        secs += (turn.content.match(/\[(laughs|sighs|chuckles|ríe|suspira|risas)\]/gi) || []).length * 2;
                        if (idx > 0) secs += 0.5;
                      });
                      return Math.max(1, Math.round(secs / 60));
                    })();
                    const lang = meta?.language || params?.language || scriptLanguage;
                    const style = meta?.podcastStyle || preset?.podcastStyle;
                    const format = meta?.podcastFormat || preset?.podcastFormat;
                    const tone = meta?.tone || preset?.tone;
                    const audience = meta?.audience || preset?.audience;
                    const model = selectedScriptSettings?.ai_model;
                    const length = selectedScriptSettings?.script_length || preset?.length;

                    return (
                      <Box
                        p={3}
                        bg={bgColor}
                        borderRadius="lg"
                        border="1px solid"
                        borderColor={borderColor}
                        mb={1}
                      >
                        {/* Quick stats row */}
                        <HStack spacing={4} mb={2} fontSize="xs" fontWeight="600">
                          <HStack spacing={1}>
                            <Text color="blue.500">{generatedScript.length}</Text>
                            <Text color={mutedColor}>exchanges</Text>
                          </HStack>
                          <HStack spacing={1}>
                            <Text color="purple.500">{totalWords.toLocaleString()}</Text>
                            <Text color={mutedColor}>words</Text>
                          </HStack>
                          <HStack spacing={1}>
                            <Text color="green.500">~{estMinutes}</Text>
                            <Text color={mutedColor}>min</Text>
                          </HStack>
                          <HStack spacing={1}>
                            <Text color="orange.500">{scriptSpeakers.length}</Text>
                            <Text color={mutedColor}>speakers</Text>
                          </HStack>
                        </HStack>

                        {/* Metadata badges */}
                        <HStack spacing={1.5} flexWrap="wrap">
                          {lang && (
                            <Badge colorScheme="teal" fontSize="8px" px={1.5} variant="subtle">
                              {lang === 'spanish' ? '🇪🇸 Spanish' : lang === 'english' ? '🇺🇸 English' : lang}
                            </Badge>
                          )}
                          {length && (
                            <Badge colorScheme="purple" fontSize="8px" px={1.5} variant="subtle">
                              {length}
                            </Badge>
                          )}
                          {style && (
                            <Badge colorScheme="pink" fontSize="8px" px={1.5} variant="subtle">
                              🎨 {style}
                            </Badge>
                          )}
                          {format && (
                            <Badge colorScheme="gray" fontSize="8px" px={1.5} variant="subtle">
                              📋 {format}
                            </Badge>
                          )}
                          {tone && (
                            <Badge colorScheme="blue" fontSize="8px" px={1.5} variant="outline">
                              {tone}
                            </Badge>
                          )}
                          {audience && audience !== 'general' && (
                            <Badge colorScheme="orange" fontSize="8px" px={1.5} variant="subtle">
                              👥 {audience}
                            </Badge>
                          )}
                          {model && (
                            <Badge colorScheme="gray" fontSize="8px" px={1.5} variant="outline">
                              {model.replace('gemini-', '').replace('-preview', '').substring(0, 14)}
                            </Badge>
                          )}
                        </HStack>

                        {/* Speaker profiles with gender */}
                        {scriptSpeakers.length > 0 && (
                          <HStack spacing={3} mt={2} fontSize="xs">
                            {scriptSpeakers.map((sp, idx) => (
                              <HStack key={idx} spacing={1}>
                                <Badge
                                  colorScheme={sp.gender === 'female' ? 'pink' : sp.gender === 'male' ? 'blue' : 'gray'}
                                  fontSize="7px"
                                  px={1}
                                  variant="solid"
                                >
                                  {sp.gender === 'female' ? '♀' : sp.gender === 'male' ? '♂' : '⚬'}
                                </Badge>
                                <Text fontWeight="600" color={textColor}>{sp.name}</Text>
                                {sp.role && <Text color={mutedColor}>({sp.role})</Text>}
                              </HStack>
                            ))}
                          </HStack>
                        )}
                      </Box>
                    );
                  })()}

                  {generatedScript.map((turn, index) => (
                    <Box
                      key={turn.id}
                      p={4}
                      bg={bgColor}
                      borderLeft="3px solid"
                      borderLeftColor={turn.speaker === hosts[0]?.name ? 'blue.400' : 'purple.400'}
                      borderRadius="md"
                      boxShadow="sm"
                    >
                      <VStack align="stretch" spacing={2}>
                        <HStack justify="space-between">
                          <HStack>
                            <Badge colorScheme="gray" fontSize="xs">#{index + 1}</Badge>
                            <Text fontWeight="bold" fontSize="sm">{turn.speaker}</Text>
                          </HStack>
                          {turn.duration && (
                            <Text fontSize="xs" color={mutedColor}>~{turn.duration}s</Text>
                          )}
                        </HStack>
                        <Text fontSize="sm" lineHeight="tall">{turn.content}</Text>
                      </VStack>
                    </Box>
                  ))}
                </VStack>
              </Box>

              {/* Sticky Stats Bar at Bottom */}
              <Box
                borderTop="2px solid"
                borderColor={borderColor}
                bg={bgColor}
                p={4}
                flexShrink={0}
              >
                {/* Metadata context badges */}
                {scriptMetadataState && (scriptMetadataState.podcastStyle || scriptMetadataState.language) && (
                  <HStack spacing={2} mb={3} flexWrap="wrap">
                    {scriptMetadataState.podcastStyle && (
                      <Badge colorScheme="purple" fontSize="9px" px={2}>
                        🎨 {scriptMetadataState.podcastStyle}
                      </Badge>
                    )}
                    {scriptMetadataState.language && (
                      <Badge colorScheme="teal" fontSize="9px" px={2}>
                        🌐 {scriptMetadataState.language}
                      </Badge>
                    )}
                    {scriptMetadataState.audience && scriptMetadataState.audience !== 'general' && (
                      <Badge colorScheme="orange" fontSize="9px" px={2}>
                        👥 {scriptMetadataState.audience}
                      </Badge>
                    )}
                    {scriptMetadataState.podcastFormat && (
                      <Badge colorScheme="gray" fontSize="9px" px={2}>
                        📋 {scriptMetadataState.podcastFormat}
                      </Badge>
                    )}
                    {scriptMetadataState.tone && (
                      <Badge colorScheme="blue" fontSize="9px" px={2} variant="outline">
                        {scriptMetadataState.tone}
                      </Badge>
                    )}
                  </HStack>
                )}
                <HStack spacing={8} justify="space-between" flexWrap="wrap">
                  <VStack align="start" spacing={1}>
                    <Text fontSize="xs" color={mutedColor} fontWeight="medium">DIALOGUE COUNT</Text>
                    <HStack>
                      <Text fontSize="2xl" fontWeight="bold" color="blue.500">
                        {generatedScript.length}
                      </Text>
                      <Text fontSize="sm" color={mutedColor}>exchanges</Text>
                    </HStack>
                  </VStack>

                  <VStack align="start" spacing={1}>
                    <Text fontSize="xs" color={mutedColor} fontWeight="medium">TOTAL WORDS</Text>
                    <HStack>
                      <Text fontSize="2xl" fontWeight="bold" color="purple.500">
                        {generatedScript.reduce((sum, turn) => sum + turn.content.split(' ').length, 0).toLocaleString()}
                      </Text>
                      <Text fontSize="sm" color={mutedColor}>words</Text>
                    </HStack>
                  </VStack>

                  <VStack align="start" spacing={1}>
                    <Text fontSize="xs" color={mutedColor} fontWeight="medium">EST. DURATION</Text>
                    <HStack>
                      <Text fontSize="2xl" fontWeight="bold" color="green.500">
                        {(() => {
                          // Calculate duration accounting for speech, pauses, emotions, and transitions
                          let totalSeconds = 0;
                          generatedScript.forEach((turn, idx) => {
                            const words = turn.content.split(' ').length;
                            // Base speaking time: ~150 words per minute = 0.4 sec per word
                            totalSeconds += words * 0.4;
                            // Count pause markers [pause], [pausa], ...
                            const pauseCount = (turn.content.match(/\[(pause|pausa|silencio|beat)\]/gi) || []).length;
                            totalSeconds += pauseCount * 1.5; // 1.5 sec per pause
                            // Count emotion/gesture markers [laughs], [sighs], etc.
                            const gestureCount = (turn.content.match(/\[(laughs|sighs|chuckles|ríe|suspira|risas)\]/gi) || []).length;
                            totalSeconds += gestureCount * 2; // 2 sec per gesture
                            // Speaker transition pause (except first turn)
                            if (idx > 0) totalSeconds += 0.5;
                          });
                          return Math.max(1, Math.round(totalSeconds / 60));
                        })()}
                      </Text>
                      <Text fontSize="sm" color={mutedColor}>minutes</Text>
                    </HStack>
                  </VStack>

                  <VStack align="start" spacing={1}>
                    <Text fontSize="xs" color={mutedColor} fontWeight="medium">SPEAKERS</Text>
                    <HStack>
                      <Text fontSize="2xl" fontWeight="bold" color="orange.500">
                        {hosts.length}
                      </Text>
                      <Text fontSize="sm" color={mutedColor}>participants</Text>
                    </HStack>
                  </VStack>

                  <VStack align="start" spacing={1}>
                    <Text fontSize="xs" color={mutedColor} fontWeight="medium">AVG PER EXCHANGE</Text>
                    <HStack>
                      <Text fontSize="2xl" fontWeight="bold" color="teal.500">
                        {Math.round(generatedScript.reduce((sum, turn) => sum + turn.content.split(' ').length, 0) / generatedScript.length)}
                      </Text>
                      <Text fontSize="sm" color={mutedColor}>words</Text>
                    </HStack>
                  </VStack>
                </HStack>
              </Box>
            </VStack>
          ) : (
            <VStack h="full" spacing={4} justify="center" align="center" p={4}>
              <Icon as={FiEdit} boxSize={12} color={mutedColor} />
              <Text fontSize="lg" fontWeight="medium" color={textColor}>
                No script generated yet
              </Text>
              <Text fontSize="sm" color={mutedColor} textAlign="center" maxW="md">
                Use the Workflow panel on the right to generate your podcast script with Gemini
              </Text>
            </VStack>
          )}
        </Box>


        {/* Podcast Audio Tab - Index 2 (changed from 4 for 3-tab structure) */}
        <Box h="full" p={0} display={activeTabIndex === 2 ? "flex" : "none"} flexDirection="column">
          {selectedPodcastEpisode ? (
            <PodcastPlaybackPanel
              episode={selectedPodcastEpisode}
              transcript={memoizedTranscript}
              initialQualityTags={qualityTags as any}
              onQualityTagsChange={(tags) => setQualityTags(tags as any)}
              onActiveSegmentChange={(index) => setActiveSegmentIndex(index)}
              onPlayingChange={(playing) => setIsPlayingAudio(playing)}
              onControlsUpdate={(data) => {
                setPlaybackSpeed(data.playbackSpeed);
                setTranscriptSettings(data.transcriptSettings);
              }}
            />
          ) : (
            <VStack h="full" spacing={4} justify="center" align="center" p={4}>
              <Icon as={FiHeadphones} boxSize={12} color={mutedColor} />
              <Text fontSize="lg" fontWeight="medium" color={textColor}>
                No Podcast Available
              </Text>
              <Text fontSize="sm" color={mutedColor} textAlign="center" maxW="md">
                Generate audio from your script using the Audio Generation tab, or select a podcast from your library.
              </Text>
            </VStack>
          )}
        </Box>
      </Box>
    </Tabs>
  );
}
