import { useState, useCallback, useRef } from 'react';
import { useToast } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import { ErrorLogger } from '@/lib/error-logger';

interface TTSOptions {
  voice?: string;
  speed?: number;
  pitch?: number;
}

interface TTSHook {
  speak: (text: string, options?: TTSOptions) => Promise<void>;
  stop: () => void;
  isSpeaking: boolean;
  currentProvider: 'qwen' | 'browser' | null;
  pregenerate: (text: string, options?: TTSOptions) => Promise<void>;
  clearCache: () => void;
  isCached: (text: string, options?: TTSOptions) => boolean;
}

export const useTTS = (): TTSHook => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentProvider, setCurrentProvider] = useState<'qwen' | 'browser' | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCacheRef = useRef<Map<string, string>>(new Map()); // Cache: text -> audioUrl
  const toast = useToast();

  /**
   * Clean text for TTS by removing markdown and special characters
   */
  const cleanTextForTTS = (text: string): string => {
    let cleaned = text;
    
    // Remove citations - multiple patterns:
    cleaned = cleaned.replace(/\(Source\s+\d+,\s*"[^"]+"\)/gi, ''); // (Source 3, "Title")
    cleaned = cleaned.replace(/\([^)]*@[A-Z0-9]+[^)]*\)/g, ''); // (filename @HASH)
    cleaned = cleaned.replace(/\(Source\s+\d+\)/gi, ''); // (Source 3)
    
    // Remove markdown formatting
    cleaned = cleaned.replace(/\*\*\*(.+?)\*\*\*/g, '$1'); // Bold italic
    cleaned = cleaned.replace(/\*\*(.+?)\*\*/g, '$1'); // Bold
    cleaned = cleaned.replace(/\*(.+?)\*/g, '$1'); // Italic
    cleaned = cleaned.replace(/__(.+?)__/g, '$1'); // Underline
    cleaned = cleaned.replace(/_(.+?)_/g, '$1'); // Italic
    cleaned = cleaned.replace(/~~(.+?)~~/g, '$1'); // Strikethrough
    
    // Remove code blocks
    cleaned = cleaned.replace(/```[\s\S]*?```/g, 'code block');
    cleaned = cleaned.replace(/`([^`]+)`/g, '$1');
    
    // Remove links but keep text
    cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    
    // Remove headers
    cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');
    
    // Remove bullet points and list markers
    cleaned = cleaned.replace(/^\s*[-*+]\s+/gm, '');
    cleaned = cleaned.replace(/^\s*\d+\.\s+/gm, '');
    
    // Remove horizontal rules
    cleaned = cleaned.replace(/^[-*_]{3,}$/gm, '');
    
    // Remove HTML tags
    cleaned = cleaned.replace(/<[^>]+>/g, '');
    
    // Remove square brackets (often used for references like [1], [2])
    cleaned = cleaned.replace(/\[\d+\]/g, '');
    
    // Replace multiple newlines with a single space
    cleaned = cleaned.replace(/\n\s*\n/g, '. ');
    cleaned = cleaned.replace(/\n/g, ' ');
    
    // Remove extra spaces (especially after citation removal)
    cleaned = cleaned.replace(/\s+/g, ' ');
    cleaned = cleaned.replace(/\s+\./g, '.'); // Fix spacing before periods
    cleaned = cleaned.replace(/\s+,/g, ','); // Fix spacing before commas
    
    // Trim
    cleaned = cleaned.trim();
    
    return cleaned;
  };

  /**
   * Generate audio URL from text (for caching)
   */
  const generateAudioUrl = async (text: string, options: TTSOptions = {}): Promise<string> => {
    // Use local Qwen TTS API (local, free, private)
    const apiUrl = '/api/ai-gateway/qwen-tts';

    // Clean text before sending to TTS
    const cleanedText = cleanTextForTTS(text);
    console.log('🔊 Generating audio via local Qwen TTS API');
    console.log('📝 Original length:', text.length, '→ Cleaned length:', cleanedText.length);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: cleanedText,
        voice: options.voice || 'ryan', // Default Qwen voice
        mode: 'synthesize',
        language: 'Auto',
        temperature: 0.7,
        top_p: 0.9,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ TTS API error:', errorData);
      
      // Log to centralized error system
      await ErrorLogger.podcastStudio(
        'tts_generation_failed',
        `TTS API returned ${response.status}`,
        {
          statusCode: response.status,
          apiUrl,
          model: 'qwen-tts-local',
          voice: options.voice || 'ryan',
          textLength: cleanedText.length,
          error: errorData,
        }
      );
      
      throw new Error(`TTS API returned ${response.status}: ${errorData.error || 'Unknown error'}`);
    }

    // Check content type - handle both PCM and MP3
    const contentType = response.headers.get('Content-Type');
    console.log('📦 Received audio format:', contentType);
    
    const audioBlob = await response.blob();
    
    // If PCM, we need to convert to a playable format
    // For now, create object URL directly - browser will handle it
    return URL.createObjectURL(audioBlob);
  };

  /**
   * Play audio from URL
   */
  const playAudioUrl = async (audioUrl: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      // Set playback rate to normal (prevents speed-up issues)
      audio.playbackRate = 1.0;
      audio.preservesPitch = true; // Maintain pitch at different speeds

      audio.onended = () => {
        setIsSpeaking(false);
        setCurrentProvider(null);
        resolve();
      };

      audio.onerror = (error) => {
        setIsSpeaking(false);
        setCurrentProvider(null);
        reject(error);
      };

      audio.play().catch(reject);
    });
  };

  /**
   * Qwen TTS via local API (free, private, no API key required)
   */
  const qwenTTS = async (text: string, options: TTSOptions = {}): Promise<void> => {
    // Create cache key that includes voice settings
    const cacheKey = `${text}_${options.voice || 'ryan'}_${options.speed || 1.0}_${options.pitch || 0}`;
    const cachedAudioUrl = audioCacheRef.current.get(cacheKey);
    if (cachedAudioUrl) {
      console.log('✅ Using cached audio');
      await playAudioUrl(cachedAudioUrl);
      return;
    }

    const audioUrl = await generateAudioUrl(text, options);
    audioCacheRef.current.set(cacheKey, audioUrl);
    await playAudioUrl(audioUrl);
  };

  /**
   * Browser Web Speech API (Fallback)
   */
  const browserTTS = async (text: string, options: TTSOptions = {}): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!window.speechSynthesis) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      console.log('🔊 Using Browser TTS (fallback)');

      // Clean text before sending to TTS
      const cleanedText = cleanTextForTTS(text);
      const utterance = new SpeechSynthesisUtterance(cleanedText);
      utterance.rate = options.speed || 1.0;
      utterance.pitch = options.pitch || 1.0;

      // Try to find a good voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => 
        v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Microsoft'))
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onend = () => {
        setIsSpeaking(false);
        setCurrentProvider(null);
        resolve();
      };

      utterance.onerror = (error) => {
        setIsSpeaking(false);
        setCurrentProvider(null);
        reject(error);
      };

      window.speechSynthesis.speak(utterance);
    });
  };

  /**
   * Main speak function with fallback cascade
   */
  const speak = useCallback(async (text: string, options: TTSOptions = {}): Promise<void> => {
    if (isSpeaking) {
      stop();
    }

    // Log text length for debugging
    console.log(`🎙️ TTS: Speaking ${text.length} characters (full response, no truncation)`);

    setIsSpeaking(true);

    try {
      // Use local Qwen TTS (free, private, no API key required)
      setCurrentProvider('qwen');
      await qwenTTS(text, options);
      
      console.log('✅ Qwen TTS completed successfully');
    } catch (qwenError) {
      console.warn('⚠️ Qwen TTS failed, falling back to browser:', qwenError);
      
      try {
        // Fallback to browser TTS
        setCurrentProvider('browser');
        await browserTTS(text, options);
        
        toast({
          title: 'Using browser TTS',
          description: 'Qwen TTS unavailable, using browser fallback',
          status: 'info',
          duration: 3000,
          isClosable: true,
        });
      } catch (browserError) {
        console.error('❌ All TTS methods failed:', browserError);
        setIsSpeaking(false);
        setCurrentProvider(null);
        
        toast({
          title: 'TTS failed',
          description: 'Unable to play audio. Please check your settings.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        
        throw browserError;
      }
    }
  }, [isSpeaking, toast]);

  /**
   * Stop current speech
   */
  const stop = useCallback(() => {
    // Stop audio element if using Qwen TTS
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    // Stop browser TTS if using it
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }

    setIsSpeaking(false);
    setCurrentProvider(null);
  }, []);

  /**
   * Pregenerate audio in background (proactive caching)
   */
  const pregenerate = useCallback(async (text: string, options: TTSOptions = {}): Promise<void> => {
    // Create cache key that includes voice settings
    const cacheKey = `${text}_${options.voice || 'ryan'}_${options.speed || 1.0}_${options.pitch || 0}`;
    
    // Skip if already cached
    if (audioCacheRef.current.has(cacheKey)) {
      console.log('✅ Audio already cached for:', text.substring(0, 50) + '...');
      return;
    }

    try {
      const preview = text.length > 50 ? text.substring(0, 50) + '...' : text;
      console.log(`🎤 Pregenerating audio: ${text.length} chars - "${preview}"`);
      console.log('🎙️ Voice settings:', { voice: options.voice || 'ryan', speed: options.speed || 1.0, pitch: options.pitch || 0 });
      
      // Warn if text is very long (may take time to generate)
      if (text.length > 2000) {
        console.log(`⏳ Large response (${text.length} chars) - TTS generation may take 10-20 seconds...`);
      }
      
      const audioUrl = await generateAudioUrl(text, options);
      audioCacheRef.current.set(cacheKey, audioUrl);
      console.log(`✅ Audio pregenerated and cached (${text.length} chars) - ready for instant playback!`);
    } catch (error) {
      console.warn('⚠️ Pregeneration failed (will generate on-demand):', error);
    }
  }, [generateAudioUrl]);

  const clearCache = useCallback(() => {
    console.log('🗑️ Clearing TTS audio cache');
    // Revoke all cached blob URLs to free memory
    audioCacheRef.current.forEach((audioUrl) => {
      URL.revokeObjectURL(audioUrl);
    });
    audioCacheRef.current.clear();
  }, []);

  /**
   * Check if audio is cached for given text and options
   */
  const isCached = useCallback((text: string, options: TTSOptions = {}): boolean => {
    const cacheKey = `${text}_${options.voice || 'ryan'}_${options.speed || 1.0}_${options.pitch || 0}`;
    return audioCacheRef.current.has(cacheKey);
  }, []);

  return {
    speak,
    stop,
    isSpeaking,
    currentProvider,
    pregenerate,
    clearCache,
    isCached,
  };
};
