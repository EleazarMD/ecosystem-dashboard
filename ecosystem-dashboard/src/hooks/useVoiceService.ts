import { useState, useEffect, useCallback } from 'react';
import { useAdkVoiceService } from './useAdkVoiceService';

export interface VoiceSettings {
  provider: 'openai' | 'gemini';
  voice: string;
  speed: number;
  pitch: number;
}

const STORAGE_KEY = 'ai-homelab-voice-settings';

const DEFAULT_SETTINGS: VoiceSettings = {
  provider: 'gemini',
  voice: 'Puck',
  speed: 1.0,
  pitch: 1.0,
};

export const useVoiceService = (onTranscriptReceived?: (transcript: string) => void) => {
  // Load settings from localStorage
  const [settings, setSettings] = useState<VoiceSettings>(() => {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (error) {
      console.error('Failed to load voice settings:', error);
    }
    return DEFAULT_SETTINGS;
  });

  // Save settings to localStorage whenever they change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      console.log('💾 Voice settings saved:', settings);
    } catch (error) {
      console.error('Failed to save voice settings:', error);
    }
  }, [settings]);

  // Use the ADK voice service (supports both providers via backend)
  const voiceService = useAdkVoiceService(onTranscriptReceived);

  // Update settings
  const updateSettings = useCallback((updates: Partial<VoiceSettings>) => {
    setSettings(prev => ({
      ...prev,
      ...updates,
    }));
  }, []);

  // Switch provider
  const switchProvider = useCallback((provider: 'openai' | 'gemini') => {
    const defaultVoice = provider === 'gemini' ? 'Puck' : 'alloy';
    updateSettings({ 
      provider, 
      voice: defaultVoice 
    });
  }, [updateSettings]);

  // Preview voice with test message
  const previewVoice = useCallback(async () => {
    const testMessage = settings.provider === 'gemini'
      ? "Hello! I'm using Gemini TTS with Flash voices."
      : "Hello! I'm using OpenAI's text-to-speech service.";
    
    // Try to connect if not already connected
    if (!voiceService.isConnected) {
      console.log('🔌 Voice service not connected, attempting to connect...');
      try {
        await voiceService.connect();
        // Wait a moment for connection to establish
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error('❌ Failed to connect to voice service:', error);
        return false;
      }
    }
    
    // Check again after connection attempt
    if (voiceService.isConnected) {
      return voiceService.sendTTSRequest(
        testMessage, 
        settings.voice, 
        true,
        settings.provider,
        settings.speed,
        settings.pitch
      );
    } else {
      console.warn('⚠️ Voice service still not connected after connection attempt');
      return false;
    }
  }, [settings, voiceService]);

  // Enhanced sendTTSRequest that includes provider settings
  const sendTTSRequestWithSettings = useCallback((text: string, voice?: string) => {
    return voiceService.sendTTSRequest(
      text,
      voice || settings.voice,
      true,
      settings.provider,
      settings.speed,
      settings.pitch
    );
  }, [voiceService, settings]);

  return {
    ...voiceService,
    settings,
    updateSettings,
    switchProvider,
    previewVoice,
    activeProvider: settings.provider,
  };
};

export default useVoiceService;
