import { useState, useRef, useCallback, useEffect } from 'react';

interface VoiceServiceState {
  isConnected: boolean;
  isListening: boolean;
  interimTranscript: string;
  finalTranscript: string;
  error: string | null;
}

export const useAdkVoiceService = (onTranscriptReceived?: (transcript: string) => void) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMicrophoneMuted, setIsMicrophoneMuted] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ttsStreamText, setTtsStreamText] = useState('');
  const [ttsIsStreaming, setTtsIsStreaming] = useState(false);
  
  const ws = useRef<WebSocket | null>(null);
  const micStream = useRef<MediaStream | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const processor = useRef<ScriptProcessorNode | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const context = useRef<AudioContext | null>(null);
  const currentAudio = useRef<HTMLAudioElement | null>(null);
  const playbackMuted = useRef<boolean>(false);
  const speakingRef = useRef<boolean>(false);
  const processedTranscripts = useRef<Set<string>>(new Set());
  const audioBuffer = useRef<Int16Array>(new Int16Array(0));
  const bufferSize = useRef<number>(16000); // 1 second at 16kHz
  const lastSentTime = useRef<number>(0);
  const isMicrophoneMutedRef = useRef<boolean>(false);
  const audioResponseBuffer = useRef<string[] | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const shouldAutoReconnect = useRef(true);
  const keepAliveInterval = useRef<NodeJS.Timeout | null>(null);

  const startKeepAlive = useCallback(() => {
    // Clear any existing keepalive
    if (keepAliveInterval.current) {
      clearInterval(keepAliveInterval.current);
    }
    
    // Send ping every 25 seconds to prevent 30s timeout
    keepAliveInterval.current = setInterval(() => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: 'ping' }));
        // console.log('💓 Sent keepalive ping'); // Reduced logging
      }
    }, 25000);
  }, []);

  const stopKeepAlive = useCallback(() => {
    if (keepAliveInterval.current) {
      clearInterval(keepAliveInterval.current);
      keepAliveInterval.current = null;
    }
  }, []);

  const connect = useCallback(async (): Promise<boolean> => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      setIsConnected(true);
      return true;
    }

    // Close any existing connection first to prevent duplicates
    if (ws.current) {
      try {
        ws.current.close();
      } catch (e) {
        // Ignore close errors
      }
      ws.current = null;
    }

    // Re-enable auto-reconnect when manually connecting
    shouldAutoReconnect.current = true;
    
    try {
      const voiceUrl = process.env.NEXT_PUBLIC_ADK_VOICE_URL || 'ws://127.0.0.1:8770';
      console.log('🔌 Connecting to ADK Voice Service:', voiceUrl);
      
      ws.current = new WebSocket(voiceUrl);
      
      // Expose WebSocket to window for TTS response sending
      (window as any).adkVoiceWebSocket = ws.current;
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.log('❌ WebSocket connection timeout');
          setError('Voice service connection timeout. Please ensure ADK Voice Service is running.');
          setIsConnected(false);
          resolve(false);
        }, 10000); // Increased timeout to 10 seconds
        
        ws.current!.onerror = (error) => {
          clearTimeout(timeout);
          console.error('❌ WebSocket connection error:', error);
          setError('Voice service connection failed. Please check if ADK Voice Service is running.');
          setIsConnected(false);
          resolve(false);
        };

        ws.current!.onclose = (event) => {
          clearTimeout(timeout);
          console.log('🔌 WebSocket connection closed:', event.code, event.reason);
          setIsConnected(false);
          stopKeepAlive();
          resolve(false);
        };

        ws.current!.onopen = () => {
          clearTimeout(timeout);
          console.log('✅ ADK Voice Service connected');
          setIsConnected(true);
          setError(null);
          reconnectAttempts.current = 0;
          startKeepAlive();
          
          // Send initial handshake message with slight delay to avoid CONNECTING state
          setTimeout(() => {
            if (ws.current?.readyState === WebSocket.OPEN) {
              ws.current.send(JSON.stringify({
                type: 'connect',
                message: 'Client connected and ready'
              }));
              console.log('📤 Sent initial handshake message');
              
              // Don't auto-start conversation - let user initiate it
              // start_conversation will be sent when user clicks "Start Voice Conversation"
            }
          }, 50);
          
          resolve(true);
        };
        
        ws.current!.onerror = (error) => {
          clearTimeout(timeout);
          console.log('❌ ADK Voice Service connection failed:', error);
          setError('Failed to connect to voice service. Please start ADK Voice Service.');
          resolve(false);
        };
        
        ws.current!.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            // console.log('📨 Received from ADK Voice Service:', data); // Reduced logging
            
            if (data.type === 'transcript') {
              if (data.is_final) {
                console.log('📝 Final transcript:', data.data);
                setFinalTranscript(data.data || '');
                setInterimTranscript('');
              } else {
                // console.log('📝 Interim transcript:', data.data); // Reduced logging
                setInterimTranscript(data.data || '');
              }
            } else if (data.type === 'final_transcript') {
              console.log('📝 Complete conversation - Transcript:', data.transcript);
              setFinalTranscript(data.transcript || '');
              setInterimTranscript('');
              
              // Handle AI response audio if provided
              if (data.response_audio) {
                console.log('🔊 Playing AI response audio');
                playAudioFromBase64(data.response_audio);
              }
            } else if (data.type === 'response') {
              console.log('🤖 AI Response:', data.data);
              // Display AI response in chat or UI
            } else if (data.type === 'tts_audio') {
              console.log('🔊 Received TTS audio response', data.data ? `(${data.data.length} chars)` : '(no data)');
              if (data.data) {
                playAudioFromBase64(data.data);
                // Resume listening after TTS audio finishes playing
                setTimeout(() => {
                  if (!isListening && isConnected) {
                    console.log('🎤 Resuming voice listening after TTS');
                    startListening();
                  }
                }, 1000); // Small delay to ensure audio starts playing
              } else {
                console.error('❌ TTS audio data is empty');
              }
            } else if (data.type === 'tts_text_delta') {
              // Streaming caption text from OpenAI in sync with audio
              setTtsIsStreaming(true);
              setTtsStreamText((prev) => prev + (data.data || ''));
              speakingRef.current = true; // begin ducking on first delta
            } else if (data.type === 'tts_text_done') {
              setTtsIsStreaming(false);
              speakingRef.current = false; // stop ducking after text done (audio may also signal)
            } else if (data.type === 'audio_response') {
              console.log('🔊 Received audio response chunk');
              // Accumulate audio chunks for playback
              if (!audioResponseBuffer.current) {
                audioResponseBuffer.current = [];
              }
              audioResponseBuffer.current.push(data.data);
              speakingRef.current = true; // duck during audio stream
            } else if (data.type === 'audio_response_complete') {
              console.log('🔊 Audio response complete, playing accumulated audio');
              if (audioResponseBuffer.current && audioResponseBuffer.current.length > 0) {
                const combinedBase64 = audioResponseBuffer.current.join('');
                // Server now streams PCM16 base64 at 24000Hz
                const floatPcm = decodeBase64Pcm16ToFloat(combinedBase64);
                playFloatPcm(floatPcm, 24000);
                audioResponseBuffer.current = null;
              }
              // Schedule end of ducking slightly after playback begins
              setTimeout(()=>{ speakingRef.current = false; }, 500);
            } else if (data.type === 'transcript_for_dashai') {
              console.log('📝 Transcript for DashAI:', data.data);
              setFinalTranscript(data.data || '');
              setInterimTranscript('');
              // Clear any prior streaming captions on new user speech
              setTtsStreamText('');
              setTtsIsStreaming(false);
              
              // Send transcript to DashAI for processing
              if (data.data && onTranscriptReceived) {
                onTranscriptReceived(data.data);
              }
            } else if (data.type === 'speech_started') {
              console.log('🎤 Speech detection started');
            } else if (data.type === 'speech_stopped') {
              console.log('🛑 Speech detection stopped');
            } else if (data.type === 'audio') {
              console.log('🔊 Received audio response');
              playAudio(data.data);
            } else if (data.type === 'error') {
              console.error('❌ Voice service error:', data.message);
              setError(data.message);
            }
          } catch (e) {
            console.error('❌ Error parsing WebSocket message:', e);
          }
        };
        
        ws.current!.onclose = (event) => {
          console.log('🔌 ADK Voice Service disconnected. Code:', event.code, 'Reason:', event.reason);
          setIsConnected(false);
          setIsListening(false);
          
          // Clean up window reference
          if ((window as any).adkVoiceWebSocket === ws.current) {
            (window as any).adkVoiceWebSocket = null;
          }
          stopKeepAlive(); // Clean up keepalive when disconnected
          
          // Only auto-reconnect if enabled, it wasn't a normal closure, and we haven't exceeded attempts
          if (shouldAutoReconnect.current && event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
            const delay = Math.pow(2, reconnectAttempts.current) * 1000;
            console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
            reconnectAttempts.current++;
            setTimeout(() => connect(), delay);
          } else if (event.code === 1000) {
            console.log('🔌 Voice service closed normally, not reconnecting');
          } else if (!shouldAutoReconnect.current) {
            console.log('🔌 Auto-reconnect disabled, not reconnecting');
          } else {
            console.log('❌ Maximum reconnection attempts reached, stopping reconnection');
            setError('Voice service disconnected. Maximum reconnection attempts reached.');
          }
        };
      });
    } catch (error) {
      console.error('❌ Failed to connect to ADK Voice Service:', error);
      setError('Failed to initialize voice service connection.');
      return false;
    }
  }, []);

  const disconnect = useCallback(() => {
    // Disable auto-reconnect before closing
    shouldAutoReconnect.current = false;
    reconnectAttempts.current = 0;
    
    // Clean up keepalive
    stopKeepAlive();
    
    if (ws.current) {
      ws.current.close(1000, 'Manual disconnect'); // Normal closure
      ws.current = null;
    }
    
    // Clean up audio resources
    if (micStream.current) {
      micStream.current.getTracks().forEach(track => track.stop());
      micStream.current = null;
    }
    
    if (processor.current) {
      processor.current.disconnect();
      processor.current = null;
    }
    
    if (audioContext.current) {
      audioContext.current.close().catch(() => {});
      audioContext.current = null;
    }
    
    setIsConnected(false);
    setIsListening(false);
    setIsMicrophoneMuted(false); // Reset microphone mute state when disconnecting
    setError(null);
  }, [stopKeepAlive]);

  const toggleMicrophoneMute = useCallback(async () => {
    setIsMicrophoneMuted(prev => {
      const newMutedState = !prev;
      console.log('🎙️ Microphone', newMutedState ? 'muted' : 'unmuted');
      
      if (newMutedState) {
        // MUTE: Disable tracks without stopping them (keeps browser connection)
        if (micStream.current) {
          micStream.current.getAudioTracks().forEach(track => {
            console.log(`🎙️ Disabling audio track ${track.id} for mute (keeping connection)`);
            track.enabled = false;
          });
        }
      } else {
        // UNMUTE: Re-enable existing tracks
        if (micStream.current) {
          micStream.current.getAudioTracks().forEach(track => {
            console.log(`🎙️ Enabling audio track ${track.id} for unmute`);
            track.enabled = true;
          });
        } else {
          // If no stream exists, get new microphone access
          console.log('🎙️ No existing stream, requesting new microphone access for unmute...');
          navigator.mediaDevices.getUserMedia({ audio: true })
            .then(newStream => {
              console.log('🎙️ New microphone stream acquired for unmute');
              micStream.current = newStream;
              
              // Reconnect audio processing if we're still listening
              if (isListening && audioContext.current && processor.current) {
                const source = audioContext.current.createMediaStreamSource(newStream);
                source.connect(processor.current);
                console.log('🎙️ Audio processing reconnected after unmute');
              }
            })
            .catch(error => {
              console.error('❌ Failed to get microphone access for unmute:', error);
            });
        }
      }
      
      return newMutedState;
    });
  }, [isListening]);

  const startListening = useCallback(async () => {
    console.log('🎙️ startListening called, current isListening:', isListening);
    if (isListening) {
      console.log('Already listening, returning early');
      return;
    }

    // Only check connection, don't attempt to connect here
    // Connection should be handled by the calling component
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      console.log('❌ WebSocket not connected - cannot start listening');
      setError('Cannot start voice input: Voice service not connected');
      return;
    }

    try {
      console.log('🎤 Requesting microphone access...');
      const streamLocal = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      micStream.current = streamLocal;
      stream.current = streamLocal; // Store in ref for mute functionality
      console.log('✅ Microphone access granted');
      
      const context = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000
      });
      audioContext.current = context;
      
      if (context.state === 'suspended') {
        await context.resume();
      }
      
      const source = context.createMediaStreamSource(streamLocal);
      const scriptProcessor = context.createScriptProcessor(4096, 1, 1);
      processor.current = scriptProcessor;

      scriptProcessor.onaudioprocess = (e) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
          const inputBuffer = e.inputBuffer.getChannelData(0);
          
          // Apply audio gain amplification with ducking when TTS is speaking
          const baseGain = 3.0;
          const duckedGain = 0.6; // lower input while speaking to avoid feedback
          const gain = speakingRef.current ? duckedGain : baseGain;
          
          // Convert to 16-bit PCM with gain
          const pcmData = new Int16Array(inputBuffer.length);
          for (let i = 0; i < inputBuffer.length; i++) {
            let s = inputBuffer[i] * gain;
            s = Math.max(-1, Math.min(1, s)); // Clamp to prevent distortion
            pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }
          
          // Accumulate audio data in buffer
          const newBuffer = new Int16Array(audioBuffer.current.length + pcmData.length);
          newBuffer.set(audioBuffer.current, 0);
          newBuffer.set(pcmData, audioBuffer.current.length);
          audioBuffer.current = newBuffer;
          
          // Send buffered audio every 2 seconds or when buffer reaches 32KB (accumulate for better transcription)
          const now = Date.now();
          const bufferSizeThreshold = 16384; // 32KB in samples (16-bit samples)
          const shouldSend = ((now - lastSentTime.current > 2000) || (audioBuffer.current.length >= bufferSizeThreshold)) && (audioBuffer.current.length > 0);
          
          if (shouldSend) {
            // console.log(`📊 Sending audio buffer: ${audioBuffer.current.length} samples (${audioBuffer.current.byteLength} bytes)`); // Reduced logging
            
            // Convert to base64 for OpenAI Realtime API
            const buffer = audioBuffer.current.buffer.slice(
              audioBuffer.current.byteOffset,
              audioBuffer.current.byteOffset + audioBuffer.current.byteLength
            );
            
            const base64Audio = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(buffer))));
            
            // Send as JSON message for OpenAI Realtime API
            const audioMessage = {
              type: 'audio_data',
              data: base64Audio
            };
            
            ws.current.send(JSON.stringify(audioMessage));
            
            // Reset buffer and timestamp
            audioBuffer.current = new Int16Array(0);
            lastSentTime.current = now;
          }
        }
      };
      
      source.connect(scriptProcessor);
      scriptProcessor.connect(context.destination);
      
      setIsListening(true);
      setInterimTranscript('');
      setFinalTranscript('');
      console.log('✅ Voice input started - streaming to ADK Voice Service');
      
    } catch (error) {
      console.error('❌ Error starting voice input:', error);
      if (error instanceof Error && error.name === 'NotAllowedError') {
        setError('Microphone permission denied. Please allow microphone access.');
      } else {
        setError(`Failed to start voice input: ${error}`);
      }
      setIsListening(false);
    }
  }, [isListening, connect]);

  const stopListening = useCallback(() => {
    console.log('🛑 stopListening called, current isListening:', isListening);
    
    // Prevent multiple stop calls
    if (!isListening) {
      return;
    }
    
    // Stop audio processing
    if (processor.current) {
      processor.current.disconnect();
      processor.current = null;
    }
    
    if (micStream.current) {
      micStream.current.getTracks().forEach(track => track.stop());
      micStream.current = null;
    }
    
    if (audioContext.current) {
      audioContext.current.close().catch(() => {});
      audioContext.current = null;
    }
    
    setIsListening(false);
    setIsMicrophoneMuted(false); // Reset microphone mute state when stopping listening
    console.log('✅ Voice input stopped');
  }, [isListening]);

  const playAudio = useCallback((audioData: number[]) => {
    if (!audioContext.current) {
      console.log('Creating audio context for playback');
      audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    try {
      const buffer = audioContext.current.createBuffer(1, audioData.length, audioContext.current.sampleRate);
      const channelData = buffer.getChannelData(0);
      
      for (let i = 0; i < audioData.length; i++) {
        channelData[i] = audioData[i];
      }
      
      const source = audioContext.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.current.destination);
      source.start();
      
      console.log('🔊 Playing neural TTS audio response');
    } catch (error) {
      console.error('❌ Error playing PCM audio buffer:', error);
    }
  }, [isListening, stopListening]);

  // Decode base64 PCM16 (little-endian) to Float32Array [-1,1]
  const decodeBase64Pcm16ToFloat = useCallback((base64Pcm: string): Float32Array => {
    const binary = atob(base64Pcm);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    const view = new DataView(bytes.buffer);
    const sampleCount = Math.floor(bytes.byteLength / 2);
    const floats = new Float32Array(sampleCount);
    for (let i = 0; i < sampleCount; i++) {
      const s = view.getInt16(i * 2, true); // little-endian
      floats[i] = Math.max(-1, Math.min(1, s / 32768));
    }
    return floats;
  }, []);

  // Play a Float32Array at provided sampleRate
  const playFloatPcm = useCallback((floatData: Float32Array, sampleRate: number) => {
    if (!audioContext.current) {
      audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate });
    }
    const ctx = audioContext.current!;
    // If context sampleRate differs, browser will resample automatically
    try {
      const buffer = ctx.createBuffer(1, floatData.length, sampleRate);
      buffer.copyToChannel(floatData, 0, 0);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start();
      console.log('🔊 Playing PCM16 TTS audio response');
    } catch (err) {
      console.error('❌ Error playing Float PCM audio:', err);
    }
  }, []);

  // Play base64 (MP3) audio using HTML5 Audio element
  const playAudioFromBase64 = useCallback((base64Audio: string) => {
    try {
      // Decode base64 to binary
      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Stop and cleanup any current audio
      if (currentAudio.current) {
        try { currentAudio.current.pause(); } catch (e) {}
        try { currentAudio.current.src = ''; } catch (e) {}
        currentAudio.current = null;
      }

      // Create MP3 blob and play with HTML5 Audio
      const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audioEl = new Audio(audioUrl);
      currentAudio.current = audioEl;

      console.log('🔊 Created MP3 audio element');

      audioEl.onloadeddata = () => {
        console.log('🔊 MP3 audio loaded, starting playback');
        if (!playbackMuted.current) {
          audioEl.play().catch(err => {
            console.error('❌ Audio play failed:', err);
            URL.revokeObjectURL(audioUrl);
          });
        } else {
          console.log('🔈 Speaker muted - not playing audio');
        }
      };

      audioEl.onended = () => {
        console.log('🔇 Audio playback finished');
        URL.revokeObjectURL(audioUrl);
        // Do not auto-resume listening here to avoid feedback loops
        speakingRef.current = false;
      };

      audioEl.onerror = (err) => {
        console.error('❌ Audio playback error:', err);
        URL.revokeObjectURL(audioUrl);
      };

      audioEl.load();
    } catch (error) {
      console.error('❌ Error processing MP3 base64 audio:', error);
    }
  }, []);

  // Toggle speaker mute
  const toggleSpeakerMute = useCallback(() => {
    playbackMuted.current = !playbackMuted.current;
    console.log('🔈 Speaker', playbackMuted.current ? 'muted' : 'unmuted');
  }, []);

  // Stop conversation on server
  const stopConversation = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'stop_conversation' }));
      console.log('🛑 stop_conversation sent');
    }
  }, []);

  // Clear streaming caption state (used for UI fade-out control)
  const clearTtsStream = useCallback(() => {
    setTtsIsStreaming(false);
    setTtsStreamText('');
  }, []);

  // Cleanup on unmount and hot reload - prevent duplicates
  useEffect(() => {
    return () => {
      // Force cleanup on component unmount or hot reload
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
      if (micStream.current) {
        micStream.current.getTracks().forEach(track => track.stop());
        micStream.current = null;
      }
      if (audioContext.current) {
        audioContext.current.close().catch(() => {});
        audioContext.current = null;
      }
      if (processor.current) {
        processor.current.disconnect();
        processor.current = null;
      }
      stopKeepAlive();
      setIsConnected(false);
      setIsListening(false);
    };
  }, [stopKeepAlive]);

  // Send TTS request to voice service with provider and parameters
  const sendTTSRequest = useCallback((
    text: string, 
    voice: string = 'alloy', 
    useNeural: boolean = true,
    provider?: string,
    speed?: number,
    pitch?: number
  ) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      console.log('🎤 Sending TTS request to voice service');
      console.log('🔊 TTS Parameters:', { 
        text: text.substring(0, 50) + '...', 
        voice, 
        provider, 
        speed, 
        pitch 
      });
      
      // Stop listening before sending TTS request to prevent overlap
      if (isListening) {
        console.log('🛑 Stopping voice listening for TTS processing');
        stopListening();
      }
      
      ws.current.send(JSON.stringify({
        type: 'tts_request',
        text: text,
        voice: voice,
        provider: provider,
        speed: speed,
        pitch: pitch,
        use_neural: useNeural
      }));
      return true;
    }
    console.warn('⚠️ Cannot send TTS request - WebSocket not connected');
    return false;
  }, [isListening, stopListening]);

  return {
    isConnected,
    isListening,
    isMicrophoneMuted,
    interimTranscript,
    finalTranscript,
    error,
    ttsStreamText,
    ttsIsStreaming,
    connect,
    disconnect,
    startListening,
    stopListening,
    toggleMicrophoneMute,
    playAudio,
    sendTTSRequest,
    toggleSpeakerMute,
    stopConversation,
    clearTtsStream
  };
};
