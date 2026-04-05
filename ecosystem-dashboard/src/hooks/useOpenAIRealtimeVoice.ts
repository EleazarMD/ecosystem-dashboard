/**
 * Complete OpenAI Realtime API Voice Integration
 * Handles microphone input, speech detection, transcription, and TTS
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface OpenAIRealtimeVoiceState {
  // Connection
  isConnected: boolean;
  error: string | null;
  
  // Audio Input
  isListening: boolean;
  inputTranscript: string;
  isTranscribing: boolean;
  
  // Audio Output
  responseText: string;
  isResponseStreaming: boolean;
  
  // Microphone
  isMicrophoneMuted: boolean;
}

export const useOpenAIRealtimeVoice = () => {
  const [state, setState] = useState<OpenAIRealtimeVoiceState>({
    isConnected: false,
    error: null,
    isListening: false,
    inputTranscript: '',
    isTranscribing: false,
    responseText: '',
    isResponseStreaming: false,
    isMicrophoneMuted: false
  });

  const wsRef = useRef<WebSocket | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Connect to OpenAI Realtime API via voice service
  const connect = useCallback(async () => {
    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        return; // Already connected
      }

      console.log('🔌 Connecting to OpenAI Realtime Voice Service...');
      
      const ws = new WebSocket('ws://127.0.0.1:8770');
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ Connected to OpenAI Realtime Voice Service');
        setState(prev => ({ ...prev, isConnected: true, error: null }));
        reconnectAttempts.current = 0;

        // Send initial handshake
        ws.send(JSON.stringify({
          type: 'handshake',
          data: { client: 'dashboard-voice-assistant' }
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleVoiceServiceMessage(message);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('🔌 OpenAI Realtime Voice Service disconnected:', event.code);
        setState(prev => ({ ...prev, isConnected: false }));
        
        // Don't auto-reconnect on server error (1011) - indicates backend issue
        if (event.code === 1011) {
          console.error('❌ Server error (1011) - Backend cannot connect to OpenAI. Check API key and service logs.');
          setState(prev => ({ ...prev, error: 'Backend service error. Check OpenAI API key.' }));
          return;
        }
        
        // Attempt reconnection only for network issues, not server errors
        if (event.code !== 1000 && event.code !== 1011 && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
          console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          console.error('❌ Max reconnection attempts reached. Please check the service.');
          setState(prev => ({ ...prev, error: 'Connection failed after multiple attempts' }));
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setState(prev => ({ ...prev, error: 'Connection error' }));
      };

    } catch (error) {
      console.error('❌ Failed to connect to OpenAI Realtime Voice Service:', error);
      setState(prev => ({ ...prev, error: 'Failed to connect' }));
    }
  }, []);

  // Handle messages from voice service
  const handleVoiceServiceMessage = useCallback((message: any) => {
    const { type, data } = message;

    switch (type) {
      case 'transcript':
        // Real-time transcription from OpenAI
        setState(prev => ({
          ...prev,
          inputTranscript: data.text || '',
          isTranscribing: !data.is_final
        }));
        break;

      case 'response_text':
        // Streaming AI response text
        setState(prev => ({
          ...prev,
          responseText: prev.responseText + (data.delta || ''),
          isResponseStreaming: true
        }));
        break;

      case 'response_complete':
        // AI response completed
        setState(prev => ({
          ...prev,
          isResponseStreaming: false
        }));
        break;

      case 'speech_started':
        console.log('🎤 Speech started');
        setState(prev => ({ ...prev, isListening: true, isTranscribing: true }));
        break;

      case 'speech_stopped':
        console.log('🛑 Speech stopped');
        setState(prev => ({ ...prev, isListening: false, isTranscribing: false }));
        break;

      case 'transcript_for_dashai':
        console.log('📝 Transcript sent to DashAI:', data.text);
        break;

      case 'error':
        console.error('❌ Voice service error:', data);
        setState(prev => ({ ...prev, error: data.message || 'Unknown error' }));
        break;

      case 'pong':
        // Heartbeat response - ignore
        break;

      case 'tts_audio':
        // TTS audio response from OpenAI (MP3 format)
        console.log('🔊 Received TTS audio from OpenAI');
        if (data.audio) {
          try {
            // Create audio element and play MP3 directly
            const audio = new Audio(`data:audio/mp3;base64,${data.audio}`);
            audio.play().then(() => {
              console.log('✅ Playing TTS audio');
            }).catch(error => {
              console.error('❌ Error playing TTS audio:', error);
            });
          } catch (error) {
            console.error('❌ Error creating audio element:', error);
          }
        }
        break;

      default:
        console.log('📨 Unknown voice service event:', type);
    }
  }, []);

  // Start listening (request microphone access and start audio processing)
  const startListening = useCallback(async () => {
    try {
      console.log('🎤 Requesting microphone access...');
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000  // OpenAI Whisper standard: 16kHz
        }
      });

      micStreamRef.current = stream;
      console.log('✅ Microphone access granted');

      // Set up audio processing
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (wsRef.current?.readyState === WebSocket.OPEN && !state.isMicrophoneMuted) {
          const inputBuffer = e.inputBuffer.getChannelData(0);
          
          // Convert to 16-bit PCM
          const pcmData = new Int16Array(inputBuffer.length);
          for (let i = 0; i < inputBuffer.length; i++) {
            const sample = Math.max(-1, Math.min(1, inputBuffer[i]));
            pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
          }

          // Send audio data to voice service
          wsRef.current.send(JSON.stringify({
            type: 'audio_data',
            data: Array.from(pcmData)
          }));
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      // Note: isListening should be controlled by speech detection, not microphone access
      console.log('✅ Voice input started - streaming to OpenAI Realtime API');

    } catch (error) {
      console.error('❌ Failed to start listening:', error);
      setState(prev => ({ ...prev, error: 'Microphone access denied' }));
    }
  }, [state.isMicrophoneMuted]);

  // Stop listening
  const stopListening = useCallback(() => {
    console.log('🛑 Stopping voice input...');

    // Stop audio processing
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Stop microphone stream
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }

    setState(prev => ({ ...prev, isTranscribing: false }));
    console.log('✅ Voice input stopped');
  }, []);

  // Toggle microphone mute (stops NEW audio input, keeps processing active)
  const toggleMicrophoneMute = useCallback(() => {
    setState(prev => {
      const newMutedState = !prev.isMicrophoneMuted;
      console.log('🎙️ Microphone', newMutedState ? 'muted' : 'unmuted');
      
      // Note: We don't disable tracks, just stop processing new audio
      // This allows AI responses and TTS to continue playing
      
      return { ...prev, isMicrophoneMuted: newMutedState };
    });
  }, []);

  // Send response to OpenAI for TTS
  const sendResponseForTTS = useCallback((text: string, voice: string = 'alloy') => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'tts_request',
        text: text,
        voice: voice
      }));
      return true;
    }
    return false;
  }, []);

  // Clear response text
  const clearResponseText = useCallback(() => {
    setState(prev => ({
      ...prev,
      responseText: '',
      isResponseStreaming: false
    }));
  }, []);

  // Clear transcript
  const clearTranscript = useCallback(() => {
    setState(prev => ({
      ...prev,
      inputTranscript: '',
      isTranscribing: false
    }));
  }, []);

  // Disconnect
  const disconnect = useCallback(() => {
    stopListening();
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000); // Normal closure
      wsRef.current = null;
    }
    
    setState(prev => ({ ...prev, isConnected: false }));
  }, [stopListening]);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    // Connection state
    isConnected: state.isConnected,
    error: state.error,
    
    // Audio input
    isListening: state.isListening,
    inputTranscript: state.inputTranscript,
    isTranscribing: state.isTranscribing,
    finalTranscript: state.inputTranscript, // Alias for compatibility
    
    // Audio output
    responseText: state.responseText,
    isResponseStreaming: state.isResponseStreaming,
    ttsStreamText: state.responseText, // Alias for compatibility
    ttsIsStreaming: state.isResponseStreaming, // Alias for compatibility
    
    // Microphone
    isMicrophoneMuted: state.isMicrophoneMuted,
    
    // Actions
    connect,
    disconnect,
    startListening,
    stopListening,
    toggleMicrophoneMute,
    sendResponseForTTS,
    sendTTSRequest: sendResponseForTTS, // Alias for compatibility
    clearResponseText,
    clearTranscript,
    clearTtsStream: clearResponseText // Alias for compatibility
  };
};

export default useOpenAIRealtimeVoice;
