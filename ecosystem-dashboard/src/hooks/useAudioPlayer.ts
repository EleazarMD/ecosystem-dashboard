import { useRef, useCallback } from 'react';

/**
 * Hook to play PCM audio data from Gemini Live
 */
export const useAudioPlayer = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);

  /**
   * Initialize audio context
   */
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
    }
    return audioContextRef.current;
  }, []);

  /**
   * Play PCM audio buffer
   * @param audioData - Raw PCM audio bytes from Gemini (24kHz, 16-bit, mono)
   */
  const playAudio = useCallback(async (audioData: ArrayBuffer) => {
    const audioContext = initAudioContext();

    // Queue the audio
    audioQueueRef.current.push(audioData);

    // If already playing, the queue will be processed
    if (isPlayingRef.current) {
      return;
    }

    // Start playing queue
    isPlayingRef.current = true;

    while (audioQueueRef.current.length > 0) {
      const chunk = audioQueueRef.current.shift();
      if (!chunk) continue;

      try {
        // Convert PCM bytes to Float32Array
        const pcmData = new Int16Array(chunk);
        const floatData = new Float32Array(pcmData.length);
        
        for (let i = 0; i < pcmData.length; i++) {
          floatData[i] = pcmData[i] / 32768.0; // Convert to -1.0 to 1.0 range
        }

        // Create audio buffer
        const audioBuffer = audioContext.createBuffer(1, floatData.length, 24000);
        audioBuffer.getChannelData(0).set(floatData);

        // Create source and play
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        
        // Wait for this chunk to finish before playing next
        await new Promise<void>((resolve) => {
          source.onended = () => resolve();
          source.start();
        });

      } catch (error) {
        console.error('❌ Audio playback error:', error);
      }
    }

    isPlayingRef.current = false;
  }, [initAudioContext]);

  /**
   * Stop all audio playback
   */
  const stopAudio = useCallback(() => {
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  /**
   * Clear audio queue without stopping current playback
   */
  const clearQueue = useCallback(() => {
    audioQueueRef.current = [];
  }, []);

  return {
    playAudio,
    stopAudio,
    clearQueue,
  };
};
