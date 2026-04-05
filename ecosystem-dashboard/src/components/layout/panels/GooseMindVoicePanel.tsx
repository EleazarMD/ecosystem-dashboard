/**
 * GooseMind Voice Panel - Redesigned
 * 
 * Fullscreen voice-first experience with:
 * - Always-on listening with echo cancellation
 * - Visible text transcript and response
 * - Conversation history
 * - Visual orb animation
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  IconButton,
  Flex,
  useToast,
  Spinner,
} from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { FiMic, FiMicOff, FiVolume2, FiVolumeX, FiTrash2, FiX } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useRightPanel } from '@/contexts/RightPanelContext';

// Use HTTPS via Tailscale - always use secure connection
const GOOSEMIND_API = 'https://rtx-workstation.tailb64e64.ts.net:8031';

type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

interface ConversationTurn {
  role: 'user' | 'assistant';
  text: string;
}

const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

// Animations
const pulseRing = keyframes`
  0% { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(1.8); opacity: 0; }
`;

const breathe = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
`;

const listeningPulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
  50% { box-shadow: 0 0 20px 8px rgba(59, 130, 246, 0.2); }
`;

const speakingWave = keyframes`
  0%, 100% { transform: scale(1); }
  25% { transform: scale(1.02) rotate(1deg); }
  75% { transform: scale(0.98) rotate(-1deg); }
`;

function getSupportedMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const types = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus'];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
}

function triggerHaptic(style: 'light' | 'medium' | 'heavy' = 'medium') {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(style === 'light' ? 10 : style === 'medium' ? 25 : 50);
  }
}

// Clean markdown formatting from text for display
function cleanTextForDisplay(text: string): string {
  if (!text) return text;
  // Remove markdown bold/italic
  let cleaned = text.replace(/\*\*([^*]+)\*\*/g, '$1');
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');
  cleaned = cleaned.replace(/__([^_]+)__/g, '$1');
  cleaned = cleaned.replace(/_([^_]+)_/g, '$1');
  // Remove markdown headers
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');
  // Remove markdown links
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  // Remove inline code
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1');
  // Remove code blocks
  cleaned = cleaned.replace(/```[\s\S]*?```/g, '');
  // Clean up extra whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  return cleaned.trim();
}

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

export default function GooseMindVoicePanel() {
  const toast = useToast();
  const { setIsOpen } = useRightPanel();
  const bgPrimary = useSemanticToken('surface.primary');
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');

  const [state, setState] = useState<VoiceState>('idle');
  const [conversation, setConversation] = useState<ConversationTurn[]>([]);
  const [currentStatus, setCurrentStatus] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false); // Speaker mute
  const [isMicMuted, setIsMicMuted] = useState(false); // Microphone mute for interruptions
  const [isSecure, setIsSecure] = useState(true);
  const [liveTranscript, setLiveTranscript] = useState(''); // Real-time caption
  const [isButtonPressed, setIsButtonPressed] = useState(false); // Instant visual feedback
  const [userWaveform, setUserWaveform] = useState<number[]>(new Array(64).fill(0));
  const [agentWaveform, setAgentWaveform] = useState<number[]>(new Array(64).fill(0));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const agentAnalyserRef = useRef<AnalyserNode | null>(null);
  const conversationEndRef = useRef<HTMLDivElement | null>(null);
  const isPlayingRef = useRef(false);
  const isListeningRef = useRef(false); // Ref to track listening state for callbacks
  const audioUnlockedRef = useRef(false);
  const reusableAudioRef = useRef<HTMLAudioElement | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const waveformAnimationRef = useRef<number | null>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isTogglingRef = useRef(false); // Prevent rapid toggle clicks
  const touchHandledRef = useRef(false); // Prevent click after touch
  const contextPreloadedRef = useRef(false); // Track if context has been preloaded
  const sessionIdRef = useRef<string | null>(null); // Track voice session ID

  // Generate contextual greeting when panel mounts
  // Only greet once per browser session (not per panel open)
  useEffect(() => {
    // Check if we've already greeted in this browser session
    const sessionGreeted = sessionStorage.getItem('goosemind_voice_greeted');
    const sessionId = sessionStorage.getItem('goosemind_voice_session_id');
    
    if (sessionGreeted && sessionId) {
      // Restore session - don't re-greet
      sessionIdRef.current = sessionId;
      console.log('[Voice] Restored session, skipping greeting:', sessionId);
      contextPreloadedRef.current = true;
      return;
    }
    
    if (!contextPreloadedRef.current) {
      contextPreloadedRef.current = true;
      
      // Generate new session ID
      const newSessionId = `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionIdRef.current = newSessionId;
      sessionStorage.setItem('goosemind_voice_session_id', newSessionId);
      
      console.log('[Voice] New session, fetching contextual greeting:', newSessionId);
      
      fetch(`${GOOSEMIND_API}/voice/greeting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'eleazar',
          tts_provider: 'chatterbox'
        }),
      })
        .then(res => res.json())
        .then(async (data) => {
          console.log('[Voice] Greeting received:', data.greeting);
          
          // Mark session as greeted
          sessionStorage.setItem('goosemind_voice_greeted', 'true');
          
          // Add greeting to conversation
          if (data.greeting) {
            setConversation([{ role: 'assistant', text: data.greeting }]);
          }
          
          // Play greeting audio if available and not muted
          if (data.audio_base64 && !isMuted) {
            try {
              // Resume audio context if suspended
              if (audioContextRef.current?.state === 'suspended') {
                await audioContextRef.current.resume();
              }
              
              // Decode and play
              const audioBytes = Uint8Array.from(atob(data.audio_base64), c => c.charCodeAt(0));
              const audioBlob = new Blob([audioBytes], { type: 'audio/wav' });
              const audioUrl = URL.createObjectURL(audioBlob);
              
              const audio = reusableAudioRef.current || new Audio();
              audio.src = audioUrl;
              
              setState('speaking');
              setCurrentStatus('');
              
              audio.onended = () => {
                URL.revokeObjectURL(audioUrl);
                setState('idle');
                triggerHaptic('light');
              };
              
              audio.onerror = () => {
                URL.revokeObjectURL(audioUrl);
                setState('idle');
              };
              
              await audio.play();
            } catch (err) {
              console.warn('[Voice] Greeting audio playback failed:', err);
              setState('idle');
            }
          }
        })
        .catch(err => {
          console.warn('[Voice] Greeting fetch failed:', err);
        });
    }
  }, [isMuted]);

  // Scroll to bottom when conversation or live transcript updates
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation, currentStatus, liveTranscript]);

  // Initialize audio context and check secure context
  useEffect(() => {
    const secure = window.isSecureContext || window.location.protocol === 'https:';
    setIsSecure(secure);
    
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    // Create reusable audio element for iOS
    if (!reusableAudioRef.current) {
      const audio = new Audio();
      audio.setAttribute('playsinline', 'true');
      audio.setAttribute('webkit-playsinline', 'true');
      reusableAudioRef.current = audio;
    }

    // Initialize Web Speech API for real-time captioning
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = '';
        let final = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            final += result[0].transcript;
          } else {
            interim += result[0].transcript;
          }
        }
        
        // Show live caption immediately
        setLiveTranscript(interim || final);
      };
      
      recognition.onerror = (e: any) => {
        console.log('[Speech] Recognition error:', e.error);
        if (e.error !== 'no-speech' && e.error !== 'aborted') {
          // Restart on recoverable errors
          try { recognition.start(); } catch {}
        }
      };
      
      recognition.onend = () => {
        // Auto-restart if still listening - use ref to avoid stale closure
        if (isListeningRef.current && !isPlayingRef.current) {
          try { recognition.start(); } catch {}
        }
      };
      
      speechRecognitionRef.current = recognition;
    }
    
    return () => {
      // Cleanup on unmount - stop all audio/mic activity
      if (speechRecognitionRef.current) {
        try { speechRecognitionRef.current.stop(); } catch {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (mediaRecorderRef.current?.state === 'recording') {
        try { mediaRecorderRef.current.stop(); } catch {}
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
      }
      if (reusableAudioRef.current) {
        reusableAudioRef.current.pause();
      }
    };
  }, []);

  // Smoothed waveform values for animation
  const smoothedValuesRef = useRef<number[]>(new Array(48).fill(0));
  
  // Waveform animation effect
  useEffect(() => {
    const canvas = waveformCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const animate = () => {
      const width = canvas.width;
      const height = canvas.height;
      const barCount = 48; // Fewer, wider bars for cleaner look
      const gap = 3;
      const barWidth = (width - (barCount - 1) * gap) / barCount;
      const centerY = height / 2;
      const smoothing = 0.15; // Smoothing factor for animation
      
      // Clear canvas with fade effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(0, 0, width, height);
      
      // Get frequency data from user's microphone
      if (analyserRef.current && state === 'listening') {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Use full spectrum - map each bar to a range of frequencies
        const usableLength = Math.floor(dataArray.length * 0.75); // Use 75% of spectrum (skip ultra-high)
        for (let i = 0; i < barCount; i++) {
          // Calculate the range of frequency bins for this bar
          const startBin = Math.floor((i / barCount) * usableLength);
          const endBin = Math.floor(((i + 1) / barCount) * usableLength);
          
          // Average the values in this range
          let sum = 0;
          for (let j = startBin; j < endBin; j++) {
            sum += dataArray[j];
          }
          const rawValue = (sum / Math.max(1, endBin - startBin)) / 255;
          
          // Smooth the value
          smoothedValuesRef.current[i] = smoothedValuesRef.current[i] * (1 - smoothing) + rawValue * smoothing;
          const value = smoothedValuesRef.current[i];
          const barHeight = Math.max(2, value * (height / 2) * 0.85);
          
          // User waveform - blue gradient, going UP from center
          const gradient = ctx.createLinearGradient(0, centerY - barHeight, 0, centerY);
          gradient.addColorStop(0, `rgba(99, 179, 237, ${0.9 * value + 0.3})`);
          gradient.addColorStop(0.5, `rgba(59, 130, 246, ${0.8 * value + 0.2})`);
          gradient.addColorStop(1, 'rgba(59, 130, 246, 0.1)');
          ctx.fillStyle = gradient;
          
          // Draw rounded bar
          const x = i * (barWidth + gap);
          const radius = Math.min(barWidth / 2, 3);
          ctx.beginPath();
          ctx.roundRect(x, centerY - barHeight, barWidth, barHeight, [radius, radius, 0, 0]);
          ctx.fill();
        }
      }
      
      // Get frequency data from agent's audio
      if (agentAnalyserRef.current && state === 'speaking') {
        const dataArray = new Uint8Array(agentAnalyserRef.current.frequencyBinCount);
        agentAnalyserRef.current.getByteFrequencyData(dataArray);
        
        // Use full spectrum - map each bar to a range of frequencies
        const usableLength = Math.floor(dataArray.length * 0.75); // Use 75% of spectrum (skip ultra-high)
        for (let i = 0; i < barCount; i++) {
          // Calculate the range of frequency bins for this bar
          const startBin = Math.floor((i / barCount) * usableLength);
          const endBin = Math.floor(((i + 1) / barCount) * usableLength);
          
          // Average the values in this range
          let sum = 0;
          for (let j = startBin; j < endBin; j++) {
            sum += dataArray[j];
          }
          const rawValue = (sum / Math.max(1, endBin - startBin)) / 255;
          
          smoothedValuesRef.current[i] = smoothedValuesRef.current[i] * (1 - smoothing) + rawValue * smoothing;
          const value = smoothedValuesRef.current[i];
          const barHeight = Math.max(2, value * (height / 2) * 0.85);
          
          // Agent waveform - green gradient, going DOWN from center
          const gradient = ctx.createLinearGradient(0, centerY, 0, centerY + barHeight);
          gradient.addColorStop(0, 'rgba(16, 185, 129, 0.1)');
          gradient.addColorStop(0.5, `rgba(16, 185, 129, ${0.8 * value + 0.2})`);
          gradient.addColorStop(1, `rgba(52, 211, 153, ${0.9 * value + 0.3})`);
          ctx.fillStyle = gradient;
          
          // Draw rounded bar
          const x = i * (barWidth + gap);
          const radius = Math.min(barWidth / 2, 3);
          ctx.beginPath();
          ctx.roundRect(x, centerY, barWidth, barHeight, [0, 0, radius, radius]);
          ctx.fill();
        }
      }
      
      // Idle state - show subtle ambient bars
      if (state === 'idle' || state === 'processing') {
        const time = Date.now() / 1000;
        for (let i = 0; i < barCount; i++) {
          const wave = Math.sin(time * 2 + i * 0.3) * 0.5 + 0.5;
          const barHeight = 2 + wave * 4;
          
          ctx.fillStyle = `rgba(255, 255, 255, ${0.05 + wave * 0.05})`;
          const x = i * (barWidth + gap);
          ctx.fillRect(x, centerY - barHeight / 2, barWidth, barHeight);
        }
      }
      
      // Draw subtle center line
      const lineGradient = ctx.createLinearGradient(0, 0, width, 0);
      lineGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
      lineGradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.08)');
      lineGradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.08)');
      lineGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.strokeStyle = lineGradient;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();
      
      waveformAnimationRef.current = requestAnimationFrame(animate);
    };
    
    // Always animate for ambient effect
    animate();
    
    return () => {
      if (waveformAnimationRef.current) {
        cancelAnimationFrame(waveformAnimationRef.current);
      }
    };
  }, [state]);
  
  // Unlock audio on iOS - must be called during user gesture
  const unlockAudioForIOS = useCallback(async () => {
    if (audioUnlockedRef.current) return;
    
    try {
      // Resume audio context
      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      // Play silent audio to unlock playback
      if (reusableAudioRef.current) {
        // Use a tiny silent WAV
        reusableAudioRef.current.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
        await reusableAudioRef.current.play();
        reusableAudioRef.current.pause();
        reusableAudioRef.current.currentTime = 0;
      }
      
      audioUnlockedRef.current = true;
      console.log('[Voice] Audio unlocked for iOS');
    } catch (e) {
      console.warn('[Voice] Audio unlock failed:', e);
    }
  }, []);

  const startListening = useCallback(async () => {
    // Check if mic is ACTUALLY running (not just what ref says)
    const isMicActuallyActive = !!streamRef.current && streamRef.current.getTracks().some(t => t.readyState === 'live');
    
    if (isMicActuallyActive) {
      console.log('[Voice] Mic already active, ignoring duplicate start');
      return;
    }
    
    // Clean up any stale state SYNCHRONOUSLY before async operations
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    
    // INSTANT state change - before ANY async operations
    setIsListening(true);
    isListeningRef.current = true;
    setState('listening');
    setCurrentStatus('Initializing...');
    triggerHaptic('medium');
    console.log('[Voice] startListening called, initializing mic...');

    if (!isSecure) {
      toast({
        title: 'HTTPS Required',
        description: 'Voice requires a secure connection.',
        status: 'error',
        duration: 3000,
      });
      setState('idle');
      setIsListening(false);
      isListeningRef.current = false;
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      toast({ title: 'Microphone not supported', status: 'error', duration: 3000 });
      setState('idle');
      setIsListening(false);
      isListeningRef.current = false;
      return;
    }

    try {
      // iOS FIX: Call getUserMedia FIRST, directly in the gesture chain
      // Audio unlock can happen after - getUserMedia is the critical one
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      streamRef.current = stream;
      
      // iOS FIX: Create AudioContext here if needed (must be in user gesture)
      // and resume it immediately - this is critical for waveform visualization
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.log('[Voice] Created AudioContext in user gesture');
      }
      
      // Resume audio context - MUST happen in user gesture on iOS
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
        console.log('[Voice] AudioContext resumed, state:', audioContextRef.current.state);
      }
      
      // Setup audio analysis for waveform visualization
      try {
        const source = audioContextRef.current.createMediaStreamSource(stream);
        const analyser = audioContextRef.current.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;
        console.log('[Voice] Analyser created successfully');
      } catch (e) {
        console.warn('[Voice] Failed to create analyser:', e);
      }
      
      // Now unlock audio for iOS playback (non-blocking)
      unlockAudioForIOS().catch(() => {});

      setLiveTranscript('');
      setCurrentStatus('Listening...');
      console.log('[Voice] Microphone activated successfully, tracks:', stream.getTracks().map(t => ({ kind: t.kind, state: t.readyState })));
      console.log('[Voice] State should be "listening", analyser:', !!analyserRef.current, 'audioContext state:', audioContextRef.current?.state);
      
      // Start real-time speech recognition for captions
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.start();
        } catch (e) {
          console.log('[Speech] Recognition already started');
        }
      }
      
      // Start audio recording for backend processing
      startRecordingChunk();
      
    } catch (error: any) {
      console.error('Failed to start listening:', error);
      // Reset state on error - MUST reset both state AND ref
      setState('idle');
      setIsListening(false);
      isListeningRef.current = false;
      
      const errorName = error?.name || '';
      const isPermissionDenied = errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError';
      
      toast({
        title: isPermissionDenied ? 'Microphone Permission Denied' : 'Microphone Error',
        description: isIOS 
          ? 'Tap the ᴬA in Safari address bar → Website Settings → Microphone → Allow'
          : isPermissionDenied 
            ? 'Please allow microphone access in your browser settings'
            : `Error: ${error?.message || 'Unknown error'}`,
        status: 'error',
        duration: 8000,
        isClosable: true,
      });
    }
  }, [isSecure, toast]);

  const startRecordingChunk = useCallback(() => {
    if (!streamRef.current) {
      console.log('[Voice] startRecordingChunk: No stream available');
      return;
    }
    if (isPlayingRef.current) {
      console.log('[Voice] startRecordingChunk: Audio is playing, skipping');
      return;
    }
    
    console.log('[Voice] Starting recording chunk...');
    const mimeType = getSupportedMimeType();
    const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
    
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(streamRef.current, options);
    } catch (e) {
      recorder = new MediaRecorder(streamRef.current);
    }

    audioChunksRef.current = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    recorder.onstop = async () => {
      // Check ref, not state, to avoid stale closure
      if (!isListeningRef.current) {
        console.log('[Voice] Recorder stopped but not listening anymore, ignoring');
        return;
      }
      
      if (audioChunksRef.current.length > 0 && !isPlayingRef.current) {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
        // Only process if blob has meaningful size (not just silence)
        if (audioBlob.size > 1000) {
          await processAudio(audioBlob);
        } else {
          // Continue listening - use ref
          if (isListeningRef.current && !isPlayingRef.current) {
            setState('listening');
            setCurrentStatus('Listening...');
            setTimeout(() => startRecordingChunk(), 100);
          }
        }
      }
    };

    mediaRecorderRef.current = recorder;
    recorder.start(isIOS ? 250 : 100);

    // Auto-stop after silence detection
    detectSilenceAndStop(recorder);
  }, [isListening]);

  const detectSilenceAndStop = (recorder: MediaRecorder) => {
    if (!analyserRef.current) {
      // iOS FALLBACK: Use shorter timeout (2.5s) when analyser unavailable
      // This happens when AudioContext couldn't be created/resumed
      console.log('[VAD] No analyser available, using time-based fallback');
      silenceTimeoutRef.current = setTimeout(() => {
        if (recorder.state === 'recording') {
          console.log('[VAD] Fallback timeout - stopping recording');
          recorder.stop();
        }
      }, 2500); // Reduced from 5000ms for faster response
      return;
    }

    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let silenceStart: number | null = null;
    let hasSpoken = false;
    const recordingStartTime = Date.now(); // Track when recording started
    let peakVolume = 0;

    const checkAudio = () => {
      if (recorder.state !== 'recording') return;

      analyser.getByteFrequencyData(dataArray);
      
      // Calculate RMS (root mean square) for better volume detection
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / dataArray.length);
      
      // Track peak volume for adaptive threshold
      if (rms > peakVolume) peakVolume = rms;
      
      // Dynamic threshold: use 20% of peak or minimum of 8
      const speechThreshold = Math.max(8, peakVolume * 0.2);
      const silenceThreshold = Math.max(5, peakVolume * 0.1);

      // Speech detected
      if (rms > speechThreshold) {
        if (!hasSpoken) {
          hasSpoken = true;
          console.log('[VAD] Speech started, rms:', rms.toFixed(1), 'threshold:', speechThreshold.toFixed(1));
        }
        silenceStart = null;
      } 
      // Silence after speech (or low volume that counts as silence)
      else if (hasSpoken) {
        if (!silenceStart) {
          silenceStart = Date.now();
          console.log('[VAD] Silence started, rms:', rms.toFixed(1), 'threshold:', silenceThreshold.toFixed(1));
        } else {
          const silenceDuration = Date.now() - silenceStart;
          // FASTER: 800ms silence threshold (was 1200ms)
          const requiredSilence = 800;
          
          if (silenceDuration > requiredSilence) {
            console.log('[VAD] End of speech detected after', silenceDuration, 'ms silence');
            recorder.stop();
            return;
          }
        }
      }
      // No speech yet - check for timeout to avoid waiting forever
      else {
        const waitTime = Date.now() - recordingStartTime;
        // If no speech detected after 3 seconds, stop and process anyway
        if (waitTime > 3000) {
          console.log('[VAD] No speech detected after 3s, stopping');
          recorder.stop();
          return;
        }
      }

      requestAnimationFrame(checkAudio);
    };

    // Start checking immediately
    checkAudio();

    // Absolute max time: 15 seconds (was 30)
    silenceTimeoutRef.current = setTimeout(() => {
      if (recorder.state === 'recording') {
        console.log('[VAD] Max recording time reached (15s)');
        recorder.stop();
      }
    }, 15000);
  };

  const processAudio = async (audioBlob: Blob) => {
    setState('processing');
    setCurrentStatus('Processing...');
    console.log('[Voice] Processing audio, blob size:', audioBlob.size);

    try {
      const reader = new FileReader();
      const base64Audio = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      // Build conversation history for multi-turn context (exclude current turn being processed)
      const conversationHistory = conversation.map(turn => ({
        role: turn.role,
        text: turn.text
      }));
      
      console.log('[Voice] Sending to API:', GOOSEMIND_API, 'with', conversationHistory.length, 'history turns');
      const response = await fetch(`${GOOSEMIND_API}/voice/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio_base64: base64Audio,
          user_id: 'eleazar',
          tts_provider: 'chatterbox',
          conversation_history: conversationHistory,
        }),
      });

      if (!response.ok) throw new Error(`Voice chat failed: ${response.status}`);

      const result = await response.json();
      console.log('[Voice] API response:', { transcript: result.transcript, hasAudio: !!result.audio_base64, ignored: result.ignored });
      
      // If ignored (too short/filler), silently continue listening
      if (result.ignored) {
        console.log('[Voice] Short/filler audio ignored, continuing to listen');
        setLiveTranscript('');
        setState('listening');
        if (isListeningRef.current) {
          if (speechRecognitionRef.current) {
            try { speechRecognitionRef.current.start(); } catch {}
          }
          setTimeout(() => startRecordingChunk(), 100);
        }
        return;
      }
      
      if (result.transcript && result.transcript.trim() && result.response) {
        // Clear live transcript - we now have the final result
        setLiveTranscript('');
        
        // Add user message immediately
        setConversation(prev => [...prev, { role: 'user', text: result.transcript }]);
        triggerHaptic('light');

        // Add assistant response - will be streamed
        const fullResponse = result.response;
        setConversation(prev => [...prev, { role: 'assistant', text: '' }]);
        
        // Start audio playback IMMEDIATELY (don't wait for text streaming)
        // This runs in parallel with text streaming
        if (result.audio_base64 && !isMuted) {
          if (speechRecognitionRef.current) {
            try { speechRecognitionRef.current.stop(); } catch {}
          }
          // Don't await - let it play while text streams
          playAudioResponse(result.audio_base64);
        }
        
        // Stream text character by character (runs in parallel with audio)
        let charIndex = 0;
        const streamInterval = setInterval(() => {
          if (charIndex < fullResponse.length) {
            const charsToAdd = Math.min(2, fullResponse.length - charIndex); // 2 chars at a time for smoother streaming
            setConversation(prev => {
              const updated = [...prev];
              const lastIdx = updated.length - 1;
              if (updated[lastIdx]?.role === 'assistant') {
                updated[lastIdx] = { 
                  ...updated[lastIdx], 
                  text: fullResponse.substring(0, charIndex + charsToAdd) 
                };
              }
              return updated;
            });
            charIndex += charsToAdd;
          } else {
            clearInterval(streamInterval);
          }
        }, 20); // 20ms per update for smoother animation

        // If muted, go back to listening after text finishes
        if (!result.audio_base64 || isMuted) {
          setState('listening');
          if (speechRecognitionRef.current && isListeningRef.current) {
            try { speechRecognitionRef.current.start(); } catch {}
          }
          if (isListeningRef.current) setTimeout(() => startRecordingChunk(), 300);
        }
      } else {
        // No meaningful response, continue listening
        setState('listening');
        if (isListeningRef.current) setTimeout(() => startRecordingChunk(), 100);
      }

    } catch (error) {
      console.error('Voice chat error:', error);
      setCurrentStatus('Error - tap to retry');
      setState('idle');
      setIsListening(false);
      isListeningRef.current = false;
    }
  };

  const playAudioResponse = async (base64Audio: string) => {
    isPlayingRef.current = true;
    setState('speaking');
    setCurrentStatus('Speaking...');
    triggerHaptic('light');

    try {
      const audioData = atob(base64Audio);
      const audioArray = new Uint8Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        audioArray[i] = audioData.charCodeAt(i);
      }

      const audioBlob = new Blob([audioArray], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(audioBlob);

      // Use the pre-created reusable audio element for iOS compatibility
      const audio = reusableAudioRef.current || new Audio();
      audioElementRef.current = audio;
      
      // Resume audio context if suspended
      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      // Connect audio to analyser for waveform visualization
      if (audioContextRef.current && !agentAnalyserRef.current) {
        try {
          const source = audioContextRef.current.createMediaElementSource(audio);
          const analyser = audioContextRef.current.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          analyser.connect(audioContextRef.current.destination);
          agentAnalyserRef.current = analyser;
        } catch (e) {
          // Audio element might already be connected
          console.log('[Voice] Agent analyser already connected');
        }
      }

      // Set up event handlers before setting src
      const cleanup = () => {
        URL.revokeObjectURL(audioUrl);
      };

      audio.onended = () => {
        console.log('[Voice] Audio playback ended, isListeningRef:', isListeningRef.current);
        isPlayingRef.current = false;
        cleanup();
        triggerHaptic('light');
        
        // Resume listening and speech recognition after speaking
        // Use ref instead of state to avoid stale closure
        if (isListeningRef.current) {
          setState('listening');
          setCurrentStatus('Listening...');
          if (speechRecognitionRef.current) {
            try { speechRecognitionRef.current.start(); } catch {}
          }
          setTimeout(() => startRecordingChunk(), 300);
        } else {
          setState('idle');
          setCurrentStatus('');
        }
      };

      audio.onerror = (e) => {
        console.error('Audio playback error event:', e);
        isPlayingRef.current = false;
        cleanup();
        
        if (isListeningRef.current) {
          setState('listening');
          setCurrentStatus('Listening...');
          if (speechRecognitionRef.current) {
            try { speechRecognitionRef.current.start(); } catch {}
          }
          startRecordingChunk();
        } else {
          setState('idle');
        }
      };

      // Set source and play
      audio.src = audioUrl;
      audio.load();
      
      console.log('[Voice] Playing audio response...');
      await audio.play();

    } catch (error: any) {
      console.error('Audio playback error:', error);
      isPlayingRef.current = false;
      setState('listening');
      setCurrentStatus('Listening...');
      
      // Show toast for playback errors on iOS
      if (isIOS && error?.name === 'NotAllowedError') {
        toast({
          title: 'Audio Playback Blocked',
          description: 'Tap the orb again to enable audio playback',
          status: 'warning',
          duration: 5000,
        });
      }
      
      if (isListeningRef.current) startRecordingChunk();
    }
  };

  const stopListening = useCallback(() => {
    console.log('[Voice] stopListening called - stopping all audio/mic activity');
    console.log('[Voice] Current state - isListening:', isListeningRef.current, 'stream:', !!streamRef.current);
    
    // Update both state and ref FIRST - prevents any callbacks from restarting
    setIsListening(false);
    isListeningRef.current = false;
    setState('idle');
    setCurrentStatus('');
    setLiveTranscript('');
    
    // Stop speech recognition IMMEDIATELY
    if (speechRecognitionRef.current) {
      try { speechRecognitionRef.current.abort(); } catch {}
      try { speechRecognitionRef.current.stop(); } catch {}
    }
    
    // Clear all timeouts
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    
    // Stop media recorder BEFORE stopping tracks (iOS requirement)
    if (mediaRecorderRef.current) {
      const recorder = mediaRecorderRef.current;
      mediaRecorderRef.current = null; // Clear ref first to prevent callbacks
      if (recorder.state === 'recording') {
        try { recorder.stop(); } catch {}
      }
    }
    
    // iOS FIX: Stop all microphone tracks MORE AGGRESSIVELY
    // Must stop each track individually AND set enabled=false
    if (streamRef.current) {
      const tracks = streamRef.current.getTracks();
      console.log('[Voice] Stopping', tracks.length, 'tracks');
      tracks.forEach(track => {
        console.log('[Voice] Stopping track:', track.kind, track.label, 'state:', track.readyState);
        track.enabled = false; // Disable first (iOS needs this)
        track.stop(); // Then stop
      });
      streamRef.current = null;
    }

    // Stop any playing audio
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
      audioElementRef.current.src = ''; // Clear source on iOS
    }
    
    if (reusableAudioRef.current) {
      reusableAudioRef.current.pause();
      reusableAudioRef.current.currentTime = 0;
    }
    
    isPlayingRef.current = false;
    
    // Clear analyser refs - disconnect from audio context
    if (analyserRef.current) {
      try { analyserRef.current.disconnect(); } catch {}
      analyserRef.current = null;
    }
    
    triggerHaptic('light');
    console.log('[Voice] All audio/mic activity stopped');
  }, []);

  // Interrupt - stop audio immediately but keep listening
  const interruptSpeaking = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
    }
    isPlayingRef.current = false;
    triggerHaptic('medium');
    
    if (isListening) {
      setState('listening');
      setCurrentStatus('Listening...');
      setTimeout(() => startRecordingChunk(), 200);
    } else {
      setState('idle');
      setCurrentStatus('');
    }
  }, [isListening]);

  const clearConversation = () => {
    setConversation([]);
    // Clear session so next greeting will be fresh
    sessionStorage.removeItem('goosemind_voice_greeted');
    sessionStorage.removeItem('goosemind_voice_session_id');
    sessionIdRef.current = null;
    contextPreloadedRef.current = false;
    triggerHaptic('light');
  };

  // Unified mic toggle handler with debounce to prevent race conditions
  const handleMicToggle = useCallback(() => {
    // Debounce - prevent rapid clicks
    if (isTogglingRef.current) {
      console.log('[Voice] Toggle debounced, ignoring');
      return;
    }
    isTogglingRef.current = true;
    setTimeout(() => { isTogglingRef.current = false; }, 400);
    
    // Check actual mic state from stream tracks
    const isMicActuallyActive = !!streamRef.current && 
      streamRef.current.getTracks().some(t => t.readyState === 'live');
    
    console.log('[Voice] handleMicToggle - state:', state, 'isListeningRef:', isListeningRef.current, 'isMicActuallyActive:', isMicActuallyActive, 'isPlaying:', isPlayingRef.current);
    
    if (state === 'speaking') {
      console.log('[Voice] Interrupting speech...');
      interruptSpeaking();
    } else if (state === 'processing') {
      // Don't interrupt processing
      console.log('[Voice] Processing, ignoring toggle');
    } else if (isMicActuallyActive || isListeningRef.current) {
      // Mic is running or we think it is, stop it
      console.log('[Voice] Stopping mic...');
      stopListening();
    } else {
      // Mic is not running, start it
      console.log('[Voice] Starting mic...');
      startListening();
    }
  }, [state, interruptSpeaking, stopListening, startListening]);

  const getOrbGradient = () => {
    switch (state) {
      case 'listening': return 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)';
      case 'processing': return 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)';
      case 'speaking': return 'linear-gradient(135deg, #10B981 0%, #3B82F6 100%)';
      default: return 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)';
    }
  };

  const getOrbAnimation = () => {
    switch (state) {
      case 'listening': return `${listeningPulse} 2s ease-in-out infinite`;
      case 'speaking': return `${speakingWave} 0.5s ease-in-out infinite`;
      case 'processing': return `${breathe} 1s ease-in-out infinite`;
      default: return `${breathe} 3s ease-in-out infinite`;
    }
  };

  return (
    <Flex
      direction="column"
      h="100%"
      w="100%"
      bg="#000"
      overflow="hidden"
      position="relative"
      sx={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}
    >
      {/* Close button */}
      <Box 
        position="absolute" 
        top="max(16px, env(safe-area-inset-top, 16px))" 
        right="16px" 
        zIndex={10}
      >
        <IconButton
          aria-label="Close"
          icon={<FiX size={18} />}
          size="sm"
          variant="ghost"
          bg="whiteAlpha.50"
          color="whiteAlpha.600"
          border="1px solid"
          borderColor="whiteAlpha.100"
          onTouchStart={(e) => e.preventDefault()}
          onTouchEnd={(e) => {
            e.preventDefault();
            e.stopPropagation();
            stopListening();
            setIsOpen(false);
          }}
          onClick={(e) => {
            if (e.detail === 0) return; // Triggered by touch, ignore
            stopListening();
            setIsOpen(false);
          }}
          _hover={{ bg: 'whiteAlpha.100', color: 'whiteAlpha.800' }}
          _active={{ bg: 'whiteAlpha.150', transform: 'scale(0.95)' }}
          borderRadius="full"
          sx={{ touchAction: 'manipulation' }}
        />
      </Box>

      {/* Conversation Area - TOP section, scrollable */}
      <Box
        flex={1}
        w="100%"
        overflowY="auto"
        overflowX="hidden"
        pt="max(60px, calc(env(safe-area-inset-top, 0px) + 50px))"
        pb={4}
        px={5}
        sx={{ 
          WebkitOverflowScrolling: 'touch',
          '&::-webkit-scrollbar': { display: 'none' },
          scrollbarWidth: 'none',
        }}
      >
        <VStack spacing={6} align="stretch" w="100%">
          {conversation.length === 0 && !liveTranscript && state === 'idle' && (
            <Text 
              fontSize="clamp(18px, 6vw, 24px)" 
              color="whiteAlpha.400" 
              textAlign="center"
              py={8}
            >
              Tap to start speaking
            </Text>
          )}

          {/* Show only the latest exchange for clean voice UI */}
          {conversation.length > 0 && (
            <>
              {/* Latest user message - subtle, smaller */}
              {conversation.filter(t => t.role === 'user').slice(-1).map((turn, i) => (
                <Text
                  key={`user-${i}`}
                  fontSize="clamp(14px, 4vw, 16px)"
                  color="whiteAlpha.500"
                  textAlign="center"
                  fontStyle="italic"
                >
                  "{cleanTextForDisplay(turn.text)}"
                </Text>
              ))}
              
              {/* Latest assistant response - large, prominent, streaming */}
              {conversation.filter(t => t.role === 'assistant').slice(-1).map((turn, i) => (
                <Text
                  key={`assistant-${i}`}
                  fontSize="clamp(20px, 6vw, 28px)"
                  lineHeight="1.6"
                  color="white"
                  textAlign="center"
                  fontWeight="400"
                  letterSpacing="0.01em"
                  px={2}
                >
                  {cleanTextForDisplay(turn.text)}
                  {state === 'speaking' && (
                    <Box 
                      as="span" 
                      display="inline-block"
                      w="3px"
                      h="1em"
                      bg="green.400"
                      ml={2}
                      animation={`${breathe} 0.5s ease-in-out infinite`}
                      verticalAlign="text-bottom"
                      borderRadius="full"
                    />
                  )}
                </Text>
              ))}
            </>
          )}
          
          {/* Live transcript - shows as user speaks */}
          {liveTranscript && (
            <Text 
              fontSize="clamp(18px, 5vw, 22px)" 
              lineHeight="1.6"
              color="blue.300"
              textAlign="center"
              fontWeight="400"
              letterSpacing="0.01em"
            >
              {liveTranscript}
              <Box 
                as="span" 
                display="inline-block"
                w="3px"
                h="1em"
                bg="blue.400"
                ml={2}
                animation={`${breathe} 0.5s ease-in-out infinite`}
                verticalAlign="text-bottom"
                borderRadius="full"
              />
            </Text>
          )}
          
          {/* Processing indicator */}
          {state === 'processing' && !liveTranscript && (
            <HStack spacing={3} justify="center" opacity={0.7}>
              <Spinner size="md" color="white" thickness="2px" speed="0.6s" />
              <Text fontSize="clamp(16px, 5vw, 20px)" color="white">
                {currentStatus || 'Thinking...'}
              </Text>
            </HStack>
          )}
          
          <div ref={conversationEndRef} />
        </VStack>
      </Box>

      {/* Bottom section - Waveform, Orb and controls */}
      <VStack 
        spacing={4} 
        pb="max(20px, calc(env(safe-area-inset-bottom, 0px) + 16px))"
        pt={4}
        flexShrink={0}
      >
        {/* Audio Waveform Visualization */}
        <Box 
          w="100%" 
          maxW="340px" 
          h="70px" 
          position="relative"
          opacity={(state === 'listening' || state === 'speaking') ? 1 : 0.5}
          transition="opacity 0.4s ease"
          mx="auto"
        >
          <canvas
            ref={waveformCanvasRef}
            width={400}
            height={80}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '16px',
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          />
          {/* Waveform legend */}
          <HStack 
            position="absolute" 
            bottom={-5} 
            left={0}
            right={0}
            justify="center"
            spacing={5}
            fontSize="9px"
            color="whiteAlpha.400"
            letterSpacing="0.5px"
          >
            <HStack spacing={1.5}>
              <Box w={1.5} h={1.5} bg="blue.400" borderRadius="full" boxShadow="0 0 4px rgba(59, 130, 246, 0.5)" />
              <Text>You</Text>
            </HStack>
            <HStack spacing={1.5}>
              <Box w={1.5} h={1.5} bg="green.400" borderRadius="full" boxShadow="0 0 4px rgba(16, 185, 129, 0.5)" />
              <Text>Agent</Text>
            </HStack>
          </HStack>
        </Box>

        {/* Status text */}
        <Text 
          fontSize="clamp(11px, 2.5vw, 13px)" 
          fontWeight="500"
          color="whiteAlpha.400"
          letterSpacing="1.5px"
          textTransform="uppercase"
        >
          {state === 'idle' && 'TAP TO SPEAK'}
          {state === 'listening' && 'LISTENING...'}
          {state === 'processing' && 'PROCESSING'}
          {state === 'speaking' && 'TAP TO STOP'}
        </Text>

        {/* Orb container */}
        <Box position="relative">
          {/* Glow effect */}
          <Box
            position="absolute"
            top="50%"
            left="50%"
            transform="translate(-50%, -50%)"
            w="160px"
            h="160px"
            borderRadius="full"
            bg={state === 'listening' ? 'rgba(59, 130, 246, 0.3)' : 
                state === 'speaking' ? 'rgba(16, 185, 129, 0.3)' : 
                state === 'processing' ? 'rgba(245, 158, 11, 0.2)' : 
                'transparent'}
            filter="blur(30px)"
            transition="all 0.3s ease"
            pointerEvents="none"
          />

          {/* Pulse ring */}
          {(state === 'listening' || state === 'speaking') && (
            <Box
              position="absolute"
              top="50%"
              left="50%"
              transform="translate(-50%, -50%)"
              w="100px"
              h="100px"
              borderRadius="full"
              border="2px solid"
              borderColor={state === 'listening' ? 'blue.400' : 'green.400'}
              opacity={0.5}
              animation={`${pulseRing} 1.5s ease-out infinite`}
              pointerEvents="none"
            />
          )}

          {/* Main Orb Button - SIMPLIFIED RELIABLE CLICK */}
          <Box
            as="button"
            w="72px"
            h="72px"
            borderRadius="full"
            bg={getOrbGradient()}
            display="flex"
            alignItems="center"
            justifyContent="center"
            cursor="pointer"
            transform={isButtonPressed ? 'scale(0.92)' : 'scale(1)'}
            border="2px solid"
            borderColor={state === 'idle' ? 'whiteAlpha.200' : 'transparent'}
            boxShadow={
              state === 'listening' ? '0 0 50px rgba(59, 130, 246, 0.6), inset 0 0 20px rgba(255,255,255,0.1)' :
              state === 'speaking' ? '0 0 50px rgba(16, 185, 129, 0.6), inset 0 0 20px rgba(255,255,255,0.1)' :
              state === 'processing' ? '0 0 40px rgba(245, 158, 11, 0.5), inset 0 0 15px rgba(255,255,255,0.1)' :
              '0 4px 20px rgba(0, 0, 0, 0.5), inset 0 0 10px rgba(255,255,255,0.05)'
            }
            _active={{ transform: 'scale(0.85)' }}
            onTouchStart={(e) => {
              e.preventDefault();
              setIsButtonPressed(true);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsButtonPressed(false);
              touchHandledRef.current = true;
              setTimeout(() => { touchHandledRef.current = false; }, 300);
              handleMicToggle();
            }}
            onClick={(e) => {
              // Skip if touch already handled this
              if (touchHandledRef.current) {
                console.log('[Voice] Click ignored - touch already handled');
                return;
              }
              handleMicToggle();
            }}
            transition="transform 0.08s ease, box-shadow 0.2s ease"
            sx={{
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation',
              userSelect: 'none',
              WebkitUserSelect: 'none',
            }}
          >
            {state === 'speaking' ? (
              <Box w="20px" h="20px" bg="whiteAlpha.900" borderRadius="3px" />
            ) : (
              <FiMic size={26} color="rgba(255,255,255,0.9)" />
            )}
          </Box>
        </Box>

        {/* Bottom controls */}
        <HStack spacing={6} pt={2}>
          {/* Mic mute - for background interruptions */}
          <IconButton
            aria-label={isMicMuted ? 'Unmute Mic' : 'Mute Mic'}
            icon={isMicMuted ? <FiMicOff size={18} /> : <FiMic size={18} />}
            size="sm"
            variant="ghost"
            color={isMicMuted ? 'orange.400' : 'whiteAlpha.500'}
            bg={isMicMuted ? 'orange.900' : 'whiteAlpha.50'}
            onClick={() => {
              const newMuted = !isMicMuted;
              setIsMicMuted(newMuted);
              // Actually mute/unmute the mic tracks
              if (streamRef.current) {
                streamRef.current.getAudioTracks().forEach(track => {
                  track.enabled = !newMuted;
                  console.log('[Voice] Mic track enabled:', !newMuted);
                });
              }
              triggerHaptic('light');
            }}
            _hover={{ bg: isMicMuted ? 'orange.800' : 'whiteAlpha.100', color: isMicMuted ? 'orange.300' : 'whiteAlpha.700' }}
            _active={{ bg: 'whiteAlpha.150', transform: 'scale(0.95)' }}
            borderRadius="full"
            border="1px solid"
            borderColor={isMicMuted ? 'orange.600' : 'whiteAlpha.100'}
          />
          {/* Speaker mute */}
          <IconButton
            aria-label={isMuted ? 'Unmute Speaker' : 'Mute Speaker'}
            icon={isMuted ? <FiVolumeX size={18} /> : <FiVolume2 size={18} />}
            size="sm"
            variant="ghost"
            color={isMuted ? 'red.400' : 'whiteAlpha.500'}
            bg="whiteAlpha.50"
            onClick={() => {
              setIsMuted(!isMuted);
              triggerHaptic('light');
            }}
            _hover={{ bg: 'whiteAlpha.100', color: 'whiteAlpha.700' }}
            _active={{ bg: 'whiteAlpha.150', transform: 'scale(0.95)' }}
            borderRadius="full"
            border="1px solid"
            borderColor="whiteAlpha.100"
          />
          {/* Clear conversation */}
          <IconButton
            aria-label="Clear"
            icon={<FiTrash2 size={18} />}
            size="sm"
            variant="ghost"
            color="whiteAlpha.500"
            bg="whiteAlpha.50"
            onClick={clearConversation}
            isDisabled={conversation.length === 0}
            _hover={{ bg: 'whiteAlpha.100', color: 'whiteAlpha.700' }}
            _active={{ bg: 'whiteAlpha.150', transform: 'scale(0.95)' }}
            _disabled={{ opacity: 0.2, cursor: 'default', bg: 'transparent' }}
            borderRadius="full"
            border="1px solid"
            borderColor="whiteAlpha.100"
          />
        </HStack>
      </VStack>
    </Flex>
  );
}
