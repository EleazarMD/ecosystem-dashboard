import { useCallback, useRef } from 'react';

export const useAudioPlayback = () => {
  const audioContext = useRef<AudioContext | null>(null);
  const playbackMuted = useRef<boolean>(false);

  const playAudio = useCallback((audioData: number[]) => {
    // PCM samples playback path
    if (playbackMuted.current) {
      console.log('🔇 Speaker muted - skipping PCM playback');
      return;
    }

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
      console.log('🔊 Playing neural TTS audio response (PCM)');
    } catch (error) {
      console.error('❌ Error playing PCM audio:', error);
    }
  }, []);

  const playAudioFromBase64 = useCallback((base64Audio: string) => {
    // MP3 base64 playback path
    if (playbackMuted.current) {
      console.log('🔇 Speaker muted - skipping MP3 playback');
      return;
    }

    try {
      // Convert base64 to bytes
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Create MP3 blob and play with HTML5 Audio
      const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.onloadeddata = () => {
        console.log('🔊 MP3 audio loaded, starting playback');
        audio.play().catch(err => {
          console.error('❌ Audio play failed:', err);
          URL.revokeObjectURL(audioUrl);
        });
      };

      audio.onended = () => {
        console.log('🔇 Audio playback finished');
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = (err) => {
        console.error('❌ Audio playback error:', err);
        URL.revokeObjectURL(audioUrl);
      };

      audio.load();
    } catch (error) {
      console.error('❌ Error processing MP3 audio:', error);
    }
  }, []);

  const toggleSpeakerMute = useCallback(() => {
    playbackMuted.current = !playbackMuted.current;
    console.log('🔈 Speaker', playbackMuted.current ? 'muted' : 'unmuted');
    return playbackMuted.current;
  }, []);

  const cleanup = useCallback(() => {
    if (audioContext.current) {
      audioContext.current.close().catch(() => {});
      audioContext.current = null;
    }
  }, []);

  return {
    playAudio,
    playAudioFromBase64,
    toggleSpeakerMute,
    cleanup,
    isSpeakerMuted: () => playbackMuted.current
  };
};
