/**
 * Qwen3 TTS Hook - Voice cloning and synthesis for AI Homelab services
 * 
 * Provides access to pre-cloned voice profiles and on-demand voice synthesis
 * for use across Podcast Studio, Deep Research, Workspace, Daily News, etc.
 */

import { useState, useCallback, useRef } from 'react';
import { useToast } from '@chakra-ui/react';

// Voice profile types
export interface VoiceProfile {
  voice_id: string;
  name: string;
  description: string;
  gender: 'male' | 'female';
  accent: string;
  language: string;
  has_profile: boolean;
  profile_url: string | null;
}

export interface TTSOptions {
  voice_id?: string;
  language?: string;
  temperature?: number;
  top_p?: number;
}

// Service-specific voice recommendations
export const SERVICE_VOICE_DEFAULTS: Record<string, string> = {
  'podcast': 'american_female_warm',
  'podcast-host': 'american_female_warm',
  'podcast-expert': 'american_male_narrator',
  'daily-news': 'american_male_anchor',
  'deep-research': 'american_female_sophisticated',
  'workspace': 'american_female_confident',
  'read-aloud': 'american_male_narrator',
  'spanish-news': 'mexican_female_warm',
  'british-news': 'british_female_anchor',
};

// Voice categories for UI selection
export const VOICE_CATEGORIES = {
  'News & Broadcast': [
    'american_male_anchor',
    'british_female_anchor',
    'mexican_female_warm',
    'spanish_female_elegant',
  ],
  'Podcast & Conversation': [
    'american_female_warm',
    'american_male_narrator',
    'british_female_warm',
  ],
  'Professional & Business': [
    'american_male_executive',
    'american_female_confident',
    'american_female_sophisticated',
    'british_female_refined',
  ],
  'Spanish Language': [
    'mexican_female_warm',
    'mexican_female_passionate',
    'mexican_male_warm',
    'mexican_male_narrator',
    'mexican_male_professional',
    'spanish_female_elegant',
  ],
};

const QWEN_TTS_GATEWAY = '/api/ai-gateway/qwen-tts';

// Module-level audio cache — persists across re-renders and component instances
const audioCache = new Map<string, Blob>();

function cacheKey(text: string, voiceId: string): string {
  // Use first 100 chars + length + voice as key to avoid huge map keys
  return `${voiceId}::${text.length}::${text.substring(0, 100)}`;
}

export interface QwenTTSHook {
  // Playback
  speak: (text: string, options?: TTSOptions) => Promise<void>;
  speakWithProfile: (text: string, voiceId: string) => Promise<void>;
  playProfilePreview: (voiceId: string) => Promise<void>;
  stop: () => void;
  
  // State
  isSpeaking: boolean;
  isLoading: boolean;
  currentVoice: string | null;
  
  // Voice profiles
  voices: VoiceProfile[];
  loadVoices: () => Promise<void>;
  getVoiceForService: (service: string) => string;
  
  // Utilities
  downloadAudio: (text: string, voiceId: string, filename?: string) => Promise<void>;
}

export const useQwenTTS = (): QwenTTSHook => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentVoice, setCurrentVoice] = useState<string | null>(null);
  const [voices, setVoices] = useState<VoiceProfile[]>([]);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const toast = useToast();

  /**
   * Load available voice profiles from the backend
   */
  const loadVoices = useCallback(async () => {
    try {
      const res = await fetch(`${QWEN_TTS_GATEWAY}?action=voice-profiles`);
      if (res.ok) {
        const data = await res.json();
        setVoices(data.profiles || []);
      }
    } catch (e) {
      console.error('Failed to load voice profiles:', e);
    }
  }, []);

  /**
   * Play audio from blob
   */
  const playAudio = useCallback(async (audioBlob: Blob): Promise<void> => {
    return new Promise((resolve, reject) => {
      console.log('[QwenTTS] playAudio called, blob size:', audioBlob.size, 'type:', audioBlob.type);
      // Ensure blob has correct MIME type for WAV
      const typedBlob = audioBlob.type ? audioBlob : new Blob([audioBlob], { type: 'audio/wav' });
      const url = URL.createObjectURL(typedBlob);
      console.log('[QwenTTS] Created object URL:', url);
      const audio = new Audio(url);
      audioRef.current = audio;
      
      audio.onended = () => {
        console.log('[QwenTTS] Playback ended');
        setIsSpeaking(false);
        setCurrentVoice(null);
        URL.revokeObjectURL(url);
        resolve();
      };
      
      audio.onerror = (error) => {
        console.error('[QwenTTS] Audio playback error:', error, audio.error);
        setIsSpeaking(false);
        setCurrentVoice(null);
        URL.revokeObjectURL(url);
        reject(error);
      };
      
      audio.play()
        .then(() => console.log('[QwenTTS] Playback started successfully'))
        .catch((err) => {
          console.error('[QwenTTS] audio.play() rejected:', err);
          reject(err);
        });
    });
  }, []);

  /**
   * Stop current playback
   */
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsSpeaking(false);
    setCurrentVoice(null);
  }, []);

  /**
   * Play pre-generated voice profile preview (instant)
   */
  const playProfilePreview = useCallback(async (voiceId: string) => {
    if (isSpeaking) stop();
    
    setIsLoading(true);
    setCurrentVoice(voiceId);
    
    try {
      const res = await fetch(`${QWEN_TTS_GATEWAY}?action=profile-preview&voice_id=${voiceId}`);
      
      if (!res.ok) throw new Error('Profile not found');
      
      const audioBlob = await res.blob();
      setIsSpeaking(true);
      setIsLoading(false);
      await playAudio(audioBlob);
      
    } catch (e) {
      setIsLoading(false);
      setCurrentVoice(null);
      toast({ title: 'Failed to play voice preview', status: 'error' });
      throw e;
    }
  }, [isSpeaking, stop, playAudio, toast]);

  /**
   * Generate and speak text with a specific voice profile (on-demand cloning)
   */
  const speakWithProfile = useCallback(async (text: string, voiceId: string) => {
    console.log('[QwenTTS] speakWithProfile called, voice:', voiceId, 'text length:', text.length);
    if (isSpeaking) stop();
    
    setIsLoading(true);
    setCurrentVoice(voiceId);
    
    try {
      const key = cacheKey(text, voiceId);
      let audioBlob = audioCache.get(key);
      
      if (audioBlob) {
        console.log('[QwenTTS] Cache hit, blob size:', audioBlob.size);
      } else {
        console.log('[QwenTTS] Cache miss, fetching from:', QWEN_TTS_GATEWAY);
        const res = await fetch(QWEN_TTS_GATEWAY, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            mode: 'synthesize',
            language: 'English',
            temperature: 0.4,
            top_p: 0.85,
          }),
        });
        
        console.log('[QwenTTS] Response status:', res.status, 'content-type:', res.headers.get('content-type'));
        if (!res.ok) {
          const errText = await res.text();
          console.error('[QwenTTS] API error response:', errText);
          throw new Error(`Voice synthesis failed (${res.status}): ${errText}`);
        }
        
        audioBlob = await res.blob();
        console.log('[QwenTTS] Got audio blob, size:', audioBlob.size, 'type:', audioBlob.type);
        audioCache.set(key, audioBlob);
      }
      
      setIsSpeaking(true);
      setIsLoading(false);
      await playAudio(audioBlob);
      
    } catch (e) {
      console.error('[QwenTTS] speakWithProfile error:', e);
      setIsLoading(false);
      setCurrentVoice(null);
      toast({ title: 'Failed to generate speech', status: 'error' });
      throw e;
    }
  }, [isSpeaking, stop, playAudio, toast]);

  /**
   * Main speak function with optional voice selection
   */
  const speak = useCallback(async (text: string, options: TTSOptions = {}) => {
    const voiceId = options.voice_id || SERVICE_VOICE_DEFAULTS['workspace'];
    await speakWithProfile(text, voiceId);
  }, [speakWithProfile]);

  /**
   * Get recommended voice for a specific service
   */
  const getVoiceForService = useCallback((service: string): string => {
    return SERVICE_VOICE_DEFAULTS[service] || SERVICE_VOICE_DEFAULTS['workspace'];
  }, []);

  /**
   * Download generated audio as a file
   */
  const downloadAudio = useCallback(async (text: string, voiceId: string, filename?: string) => {
    setIsLoading(true);
    
    try {
      const key = cacheKey(text, voiceId);
      let audioBlob = audioCache.get(key);
      
      if (!audioBlob) {
        const res = await fetch(QWEN_TTS_GATEWAY, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            mode: 'synthesize',
            language: 'English',
            temperature: 0.4,
            top_p: 0.85,
          }),
        });
        
        if (!res.ok) throw new Error('Voice synthesis failed');
        
        audioBlob = await res.blob();
        audioCache.set(key, audioBlob);
      }
      const url = URL.createObjectURL(audioBlob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `${voiceId}_${Date.now()}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({ title: 'Audio downloaded', status: 'success', duration: 2000 });
      
    } catch (e) {
      toast({ title: 'Failed to download audio', status: 'error' });
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return {
    speak,
    speakWithProfile,
    playProfilePreview,
    stop,
    isSpeaking,
    isLoading,
    currentVoice,
    voices,
    loadVoices,
    getVoiceForService,
    downloadAudio,
  };
};

export default useQwenTTS;
