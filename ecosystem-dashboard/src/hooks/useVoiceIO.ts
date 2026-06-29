/**
 * useVoiceIO — Voice input/output hook for child tutor.
 *
 * - STT: Records audio via MediaRecorder, sends to /api/child/stt/transcribe (Parakeet)
 * - TTS: Sends text to /api/child/tts/speak (Qwen TTS), plays returned audio
 *
 * Usage:
 *   const { state, startListening, stopListening, speak, stopSpeaking, isMuted, toggleMute } = useVoiceIO();
 */

import { useState, useRef, useCallback, useEffect } from 'react';

export type VoiceIOState = 'idle' | 'recording' | 'transcribing' | 'speaking';

interface UseVoiceIOOptions {
  onTranscript?: (text: string) => void;
  voiceId?: string;
  autoSpeak?: boolean;
}

export function useVoiceIO(opts: UseVoiceIOOptions = {}) {
  const { onTranscript, voiceId, autoSpeak = false } = opts;
  const [state, setState] = useState<VoiceIOState>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  const voiceIdRef = useRef(voiceId);
  const isMutedRef = useRef(isMuted);
  const autoSpeakRef = useRef(autoSpeak);

  onTranscriptRef.current = onTranscript;
  voiceIdRef.current = voiceId;
  isMutedRef.current = isMuted;
  autoSpeakRef.current = autoSpeak;

  // ── STT: Recording ──────────────────────────────────────────────────────

  const startListening = useCallback(async () => {
    if (state !== 'idle') return;
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });

      audioStreamRef.current = stream;
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
        audioStreamRef.current = null;

        if (audioChunksRef.current.length === 0) {
          setState('idle');
          return;
        }

        setState('transcribing');

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();

        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];

          try {
            const response = await fetch('/api/child/stt/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audio_base64: base64Audio,
                mimeType: 'audio/webm',
              }),
            });

            if (!response.ok) {
              throw new Error(`STT API returned ${response.status}`);
            }

            const result = await response.json();
            const transcript = result.transcript || '';

            if (transcript && onTranscriptRef.current) {
              onTranscriptRef.current(transcript);
            }
          } catch (err) {
            console.error('[useVoiceIO] STT error:', err);
            setError(err instanceof Error ? err.message : 'Transcription failed');
          } finally {
            setState('idle');
          }
        };

        reader.readAsDataURL(audioBlob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100);
      setState('recording');
    } catch (err) {
      console.error('[useVoiceIO] Microphone access denied:', err);
      setError('Microphone access denied');
      setState('idle');
    }
  }, [state]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, [state]);

  // ── TTS: Speak ──────────────────────────────────────────────────────────

  const speak = useCallback(async (text: string) => {
    if (!text.trim() || isMutedRef.current) return;

    // Stop any current playback
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }

    setState('speaking');
    setError(null);

    try {
      const response = await fetch('/api/child/tts/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voiceId: voiceIdRef.current,
          sourceType: 'companion',
        }),
      });

      if (!response.ok) {
        throw new Error(`TTS API returned ${response.status}`);
      }

      const data = await response.json();

      // If service unavailable, fall back to browser TTS
      if (data.useBrowserTTS || !data.audioUrl) {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 0.95;
          utterance.onend = () => setState('idle');
          utterance.onerror = () => setState('idle');
          window.speechSynthesis.speak(utterance);
          return;
        }
        setState('idle');
        return;
      }

      // Play the audio
      const audio = new Audio(data.audioUrl);
      audioElementRef.current = audio;

      audio.onended = () => {
        setState('idle');
        audioElementRef.current = null;
      };

      audio.onerror = () => {
        console.error('[useVoiceIO] Audio playback error');
        setState('idle');
        audioElementRef.current = null;
      };

      await audio.play();
    } catch (err) {
      console.error('[useVoiceIO] TTS error:', err);
      setError(err instanceof Error ? err.message : 'TTS failed');
      setState('idle');
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setState('idle');
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      isMutedRef.current = next;
      if (next && audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
        setState('idle');
      }
      return next;
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    state,
    isMuted,
    error,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    toggleMute,
  };
}
