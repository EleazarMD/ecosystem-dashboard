/**
 * OpenAI Realtime API Text Streaming Hook
 * Handles real-time transcription and response text streaming
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface OpenAIRealtimeTextState {
  // Transcription
  inputTranscript: string;
  isTranscribing: boolean;
  
  // Response
  responseText: string;
  isResponseStreaming: boolean;
  
  // Connection
  isConnected: boolean;
  error: string | null;
}

interface OpenAITextEvent {
  type: 'transcript' | 'response_text' | 'response_complete' | 'error';
  data: any;
}

export const useOpenAIRealtimeText = () => {
  const [state, setState] = useState<OpenAIRealtimeTextState>({
    inputTranscript: '',
    isTranscribing: false,
    responseText: '',
    isResponseStreaming: false,
    isConnected: false,
    error: null
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Connect to voice service WebSocket
  const connect = useCallback(async () => {
    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        return; // Already connected
      }

      console.log('🔌 Connecting to OpenAI Realtime Text Service...');
      
      const ws = new WebSocket('ws://127.0.0.1:8770');
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ Connected to OpenAI Realtime Text Service');
        setState(prev => ({ ...prev, isConnected: true, error: null }));
        reconnectAttempts.current = 0;

        // Send initial configuration for text streaming
        ws.send(JSON.stringify({
          type: 'configure_text_streaming',
          config: {
            enable_transcription_events: true,
            enable_response_text_events: true,
            language_detection: true
          }
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleRealtimeTextEvent(message);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('🔌 OpenAI Realtime Text Service disconnected:', event.code);
        setState(prev => ({ ...prev, isConnected: false }));
        
        // Attempt reconnection if not intentional
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
          console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setState(prev => ({ ...prev, error: 'Connection error' }));
      };

    } catch (error) {
      console.error('❌ Failed to connect to OpenAI Realtime Text Service:', error);
      setState(prev => ({ ...prev, error: 'Failed to connect' }));
    }
  }, []);

  // Handle incoming text events from OpenAI Realtime API
  const handleRealtimeTextEvent = useCallback((event: OpenAITextEvent) => {
    switch (event.type) {
      case 'transcript':
        // Real-time transcription from user speech
        setState(prev => ({
          ...prev,
          inputTranscript: event.data.text || '',
          isTranscribing: event.data.is_final === false
        }));
        break;

      case 'response_text':
        // Streaming AI response text
        setState(prev => ({
          ...prev,
          responseText: prev.responseText + (event.data.delta || ''),
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

      case 'error':
        console.error('❌ OpenAI Realtime API error:', event.data);
        setState(prev => ({
          ...prev,
          error: event.data.message || 'Unknown error'
        }));
        break;

      default:
        console.log('📨 Unknown event type:', event.type);
    }
  }, []);

  // Send DashAI response to OpenAI for TTS
  const sendResponseForTTS = useCallback((text: string, voice: string = 'alloy') => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'tts_request',
        text: text,
        voice: voice,
        use_realtime_api: true // Use OpenAI Realtime API for TTS
      }));
    }
  }, []);

  // Clear current response text
  const clearResponseText = useCallback(() => {
    setState(prev => ({
      ...prev,
      responseText: '',
      isResponseStreaming: false
    }));
  }, []);

  // Clear current transcript
  const clearTranscript = useCallback(() => {
    setState(prev => ({
      ...prev,
      inputTranscript: '',
      isTranscribing: false
    }));
  }, []);

  // Disconnect
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000); // Normal closure
      wsRef.current = null;
    }
    
    setState(prev => ({ ...prev, isConnected: false }));
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    // State
    inputTranscript: state.inputTranscript,
    isTranscribing: state.isTranscribing,
    responseText: state.responseText,
    isResponseStreaming: state.isResponseStreaming,
    isConnected: state.isConnected,
    error: state.error,
    
    // Actions
    connect,
    disconnect,
    sendResponseForTTS,
    clearResponseText,
    clearTranscript
  };
};

export default useOpenAIRealtimeText;
