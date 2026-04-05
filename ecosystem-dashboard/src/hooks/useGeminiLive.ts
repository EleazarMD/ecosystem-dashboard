import { useState, useRef, useCallback } from 'react';
import { useToast } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';

interface GeminiLiveOptions {
  agentId?: string;
  systemInstruction?: string;
  onTranscript?: (text: string) => void;
  onAudioResponse?: (audioData: ArrayBuffer) => void;
}

interface GeminiLiveHook {
  isConnected: boolean;
  isRecording: boolean;
  startLiveSession: () => Promise<void>;
  stopLiveSession: () => void;
  sendAudio: (audioData: ArrayBuffer) => void;
}

export const useGeminiLive = (options: GeminiLiveOptions = {}): GeminiLiveHook => {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const toast = useToast();

  // Check if we're in browser environment
  const isBrowser = typeof window !== 'undefined';

  const {
    agentId = 'workspace-ai',
    systemInstruction = 'You are a helpful AI assistant. Provide clear, concise responses.',
    onTranscript,
    onAudioResponse,
  } = options;

  /**
   * Connect to Goose API Server Gemini Live endpoint
   */
  const connectWebSocket = useCallback(async (): Promise<WebSocket> => {
    if (!isBrowser) {
      throw new Error('WebSocket only available in browser');
    }

    // Connect to Goose API Server backend (NOT directly to Google)
    const wsUrl = `ws://localhost:9001/api/gemini-live/ws/${agentId}`;

    const ws = new WebSocket(wsUrl);

    return new Promise((resolve, reject) => {
      ws.onopen = () => {
        console.log('✅ Gemini Live: WebSocket connected');
        
        // Send connect message to Goose API Server
        ws.send(JSON.stringify({
          type: 'connect',
          system_instruction: systemInstruction
        }));

        setIsConnected(true);
        resolve(ws);
      };

      ws.onerror = (error) => {
        console.error('❌ Gemini Live: WebSocket error:', error);
        reject(error);
      };

      ws.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📨 Gemini Live: Received message:', message.type);

          // Handle different message types from Goose API Server
          switch (message.type) {
            case 'connected':
              console.log('✅ Gemini Live: Session connected');
              break;

            case 'audio':
              // Decode base64 audio data
              console.log('🔊 Gemini Live: Received audio chunk');
              const audioBytes = Uint8Array.from(atob(message.data), c => c.charCodeAt(0));
              onAudioResponse?.(audioBytes.buffer);
              break;

            case 'transcription':
              console.log('📝 Gemini Live: Transcript:', message.text);
              onTranscript?.(message.text);
              break;

            case 'error':
              console.error('❌ Gemini Live: Server error:', message.message);
              toast({
                title: 'Gemini Live Error',
                description: message.message,
                status: 'error',
                duration: 5000,
              });
              break;

            case 'disconnected':
              console.log('🔌 Gemini Live: Server disconnected');
              setIsConnected(false);
              break;

            default:
              console.log('ℹ️ Gemini Live: Unknown message type:', message.type);
          }

        } catch (error) {
          console.error('❌ Gemini Live: Message parse error:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('🔌 Gemini Live: WebSocket closed:', event.reason);
        setIsConnected(false);
        setIsRecording(false);
      };
    });
  }, [isBrowser, agentId, systemInstruction, onTranscript, onAudioResponse, toast]);

  /**
   * Start microphone recording and streaming
   */
  const startMicrophoneStreaming = useCallback(async (ws: WebSocket) => {
    if (!isBrowser || !navigator.mediaDevices) {
      throw new Error('Media devices not available');
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      // Create AudioContext for processing
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      source.connect(processor);
      processor.connect(audioContext.destination);

      processor.onaudioprocess = (e) => {
        if (!isConnected || !ws || ws.readyState !== WebSocket.OPEN) {
          return;
        }

        const inputData = e.inputBuffer.getChannelData(0);
        
        // Convert Float32Array to Int16Array (PCM 16-bit)
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Convert to base64
        const base64Audio = btoa(
          String.fromCharCode.apply(null, Array.from(new Uint8Array(pcmData.buffer)))
        );

        // Send to Goose API Server backend
        ws.send(JSON.stringify({
          type: 'audio',
          data: base64Audio
        }));
      };

      setIsRecording(true);
      console.log('🎤 Gemini Live: Microphone streaming started');

      // Store for cleanup
      mediaRecorderRef.current = { stream, processor } as any;

    } catch (error) {
      console.error('❌ Gemini Live: Microphone error:', error);
      toast({
        title: 'Microphone Access Denied',
        description: 'Please allow microphone access to use voice input.',
        status: 'error',
        duration: 5000,
      });
      throw error;
    }
  }, [isBrowser, isConnected, toast]);

  /**
   * Start live session
   */
  const startLiveSession = useCallback(async () => {
    try {
      console.log('🚀 Gemini Live: Starting session...');
      
      const ws = await connectWebSocket();
      wsRef.current = ws;

      // Wait a moment for setup to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      await startMicrophoneStreaming(ws);

      toast({
        title: 'Voice Chat Active',
        description: 'Speak now - Gemini is listening!',
        status: 'success',
        duration: 3000,
      });

    } catch (error) {
      console.error('❌ Gemini Live: Start session error:', error);
      toast({
        title: 'Connection Failed',
        description: 'Unable to start voice chat. Check your API key.',
        status: 'error',
        duration: 5000,
      });
    }
  }, [connectWebSocket, startMicrophoneStreaming, toast]);

  /**
   * Stop live session
   */
  const stopLiveSession = useCallback(() => {
    console.log('🛑 Gemini Live: Stopping session...');

    // Stop microphone
    if (mediaRecorderRef.current) {
      const { stream, processor } = mediaRecorderRef.current as any;
      stream?.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      processor?.disconnect();
      mediaRecorderRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Send disconnect message before closing
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'disconnect' }));
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsRecording(false);
    setIsConnected(false);

    toast({
      title: 'Voice Chat Ended',
      status: 'info',
      duration: 2000,
    });
  }, [toast]);

  /**
   * Send audio data manually (for file upload)
   */
  const sendAudio = useCallback((audioData: ArrayBuffer) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('❌ Gemini Live: WebSocket not connected');
      return;
    }

    const base64Audio = btoa(
      String.fromCharCode.apply(null, Array.from(new Uint8Array(audioData)))
    );

    wsRef.current.send(JSON.stringify({
      type: 'audio',
      data: base64Audio
    }));

    console.log('📤 Gemini Live: Sent audio data');
  }, []);

  return {
    isConnected,
    isRecording,
    startLiveSession,
    stopLiveSession,
    sendAudio,
  };
};
