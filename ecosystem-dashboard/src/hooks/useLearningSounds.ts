/**
 * useLearningSounds — WebAudio-synthesized sound effects for the learning experience.
 *
 * No audio files needed — all sounds are generated procedurally using the
 * Web Audio API. This keeps the bundle tiny and avoids network latency.
 *
 * Sounds:
 * - correct:    bright ascending arpeggio (C-E-G) — answer is right
 * - tryAgain:   gentle descending two-note (G-C) — wrong answer, encouraging
 * - levelUp:    fanfare (C-E-G-C up an octave) — level/step complete
 * - celebrate:  sparkly arpeggio (C-E-G-B-C) — path complete / big win
 * - click:      short pop — button click / card selection
 * - whoosh:     filtered noise sweep — card transition
 * - reveal:     soft chime — hint or example reveal
 *
 * Respects prefers-reduced-motion (disables sounds when reduced motion is
 * preferred, matching accessibility best practices).
 */

import { useRef, useCallback, useEffect } from 'react';

type SoundName = 'correct' | 'tryAgain' | 'levelUp' | 'celebrate' | 'click' | 'whoosh' | 'reveal';

interface UseLearningSoundsReturn {
  play: (sound: SoundName) => void;
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

const STORAGE_KEY = 'learning-sounds-enabled';

export function useLearningSounds(): UseLearningSoundsReturn {
  const ctxRef = useRef<AudioContext | null>(null);
  const enabledRef = useRef<boolean>(true);

  // Initialize enabled state from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      enabledRef.current = stored === 'true';
    }
    // Respect prefers-reduced-motion
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      enabledRef.current = false;
    }
  }, []);

  const getCtx = useCallback((): AudioContext | null => {
    if (typeof window === 'undefined') return null;
    if (!ctxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return null;
      ctxRef.current = new AudioCtx();
    }
    // Resume if suspended (browsers require user gesture)
    if (ctxRef.current.state === 'suspended') {
      void ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  const playTone = useCallback(
    (
      ctx: AudioContext,
      freq: number,
      startTime: number,
      duration: number,
      type: OscillatorType = 'sine',
      gain: number = 0.15,
    ) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = type;
      osc.frequency.value = freq;

      // ADSR envelope: attack → sustain → release
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.01); // 10ms attack
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    },
    [],
  );

  const playArpeggio = useCallback(
    (
      ctx: AudioContext,
      notes: number[],
      noteDuration: number,
      type: OscillatorType = 'sine',
      gain: number = 0.12,
    ) => {
      const now = ctx.currentTime;
      notes.forEach((freq, i) => {
        playTone(ctx, freq, now + i * noteDuration, noteDuration * 1.5, type, gain);
      });
    },
    [playTone],
  );

  const playWhoosh = useCallback((ctx: AudioContext) => {
    const now = ctx.currentTime;
    const duration = 0.3;

    // White noise via buffer
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize); // fade out
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // Bandpass filter sweep
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + duration);
    filter.Q.value = 2;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.08, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + duration);
  }, []);

  const play = useCallback(
    (sound: SoundName) => {
      if (!enabledRef.current) return;
      const ctx = getCtx();
      if (!ctx) return;

      switch (sound) {
        case 'correct':
          // Bright ascending C-E-G arpeggio
          playArpeggio(ctx, [523.25, 659.25, 783.99], 0.08, 'sine', 0.12);
          break;

        case 'tryAgain':
          // Gentle descending G-C (encouraging, not harsh)
          playArpeggio(ctx, [392.0, 261.63], 0.12, 'triangle', 0.1);
          break;

        case 'levelUp':
          // Fanfare: C-E-G-C (up an octave)
          playArpeggio(ctx, [523.25, 659.25, 783.99, 1046.5], 0.1, 'square', 0.08);
          break;

        case 'celebrate':
          // Sparkly: C-E-G-B-C (major 7 arpeggio up)
          playArpeggio(ctx, [523.25, 659.25, 783.99, 987.77, 1046.5], 0.09, 'sine', 0.1);
          // Add a second wave with slight delay for shimmer
          setTimeout(() => {
            const ctx2 = getCtx();
            if (ctx2) playArpeggio(ctx2, [1046.5, 1318.5, 1568.0], 0.07, 'sine', 0.06);
          }, 180);
          break;

        case 'click':
          // Short pop
          playTone(ctx, 800, ctx.currentTime, 0.05, 'sine', 0.08);
          break;

        case 'whoosh':
          playWhoosh(ctx);
          break;

        case 'reveal':
          // Soft chime — two notes
          playArpeggio(ctx, [659.25, 880.0], 0.1, 'sine', 0.08);
          break;
      }
    },
    [getCtx, playArpeggio, playTone, playWhoosh],
  );

  const setEnabled = useCallback((enabled: boolean) => {
    enabledRef.current = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(enabled));
    }
  }, []);

  return { play, enabled: enabledRef.current, setEnabled };
}
