import { useCallback, useRef } from 'react';

export type SoundType = 'click' | 'success' | 'error' | 'achievement' | 'streak' | 'complete';

const DEFAULT_VOLUME = 0.12;
const WIN_VOLUME = 0.10;
const ALERT_VOLUME = 0.08;

function createNoiseBuffer(ctx: AudioContext, duration: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * duration;
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  }
  return buffer;
}

export function useSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  const noiseRef = useRef<AudioBuffer | null>(null);

  const ensureContext = useCallback(async () => {
    if (typeof window === 'undefined') return null;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!ctxRef.current && Ctx) {
      ctxRef.current = new Ctx();
      noiseRef.current = createNoiseBuffer(ctxRef.current, 0.08);
    }
    if (ctxRef.current && ctxRef.current.state === 'suspended') {
      await ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  const playTone = useCallback(
    async ({
      frequency,
      duration,
      type = 'sine',
      volume = DEFAULT_VOLUME,
      when = 0,
    }: {
      frequency: number | [number, number];
      duration: number;
      type?: OscillatorType;
      volume?: number;
      when?: number;
    }) => {
      const ctx = await ensureContext();
      if (!ctx) return;

      const t = ctx.currentTime + when;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      if (Array.isArray(frequency)) {
        osc.frequency.setValueAtTime(frequency[0], t);
        osc.frequency.exponentialRampToValueAtTime(frequency[1], t + duration);
      } else {
        osc.frequency.setValueAtTime(frequency, t);
      }
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(volume, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + duration + 0.02);
    },
    [ensureContext],
  );

  const playNoise = useCallback(
    async (duration = 0.05, volume = DEFAULT_VOLUME * 0.6) => {
      const ctx = await ensureContext();
      if (!ctx || !noiseRef.current) return;
      const src = ctx.createBufferSource();
      src.buffer = noiseRef.current;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start();
      src.stop(ctx.currentTime + duration + 0.02);
    },
    [ensureContext],
  );

  const play = useCallback(
    async (type: SoundType) => {
      switch (type) {
        case 'click':
          await playNoise(0.04, DEFAULT_VOLUME * 0.5);
          await playTone({ frequency: 900, duration: 0.07, type: 'sine', volume: DEFAULT_VOLUME * 0.6 });
          break;
        case 'success':
          // Soft marimba-like chime: gentle attack, short sustain, harmonic sparkle
          await playTone({ frequency: 880, duration: 0.14, type: 'sine', volume: WIN_VOLUME, when: 0 });
          await playTone({ frequency: 1175, duration: 0.18, type: 'sine', volume: WIN_VOLUME * 0.75, when: 0.08 });
          break;
        case 'error':
          // Soft alert: a short, muted thud + low harmonic so it never feels harsh
          await playTone({ frequency: 160, duration: 0.18, type: 'triangle', volume: ALERT_VOLUME, when: 0 });
          await playNoise(0.05, ALERT_VOLUME * 0.6);
          break;
        case 'achievement':
          await playTone({ frequency: 523, duration: 0.15, type: 'sine', volume: DEFAULT_VOLUME });
          await playTone({ frequency: 659, duration: 0.15, type: 'sine', volume: DEFAULT_VOLUME, when: 0.12 });
          await playTone({ frequency: 784, duration: 0.3, type: 'sine', volume: DEFAULT_VOLUME, when: 0.24 });
          break;
        case 'streak':
          await playTone({ frequency: [523, 659], duration: 0.12, type: 'sine', volume: DEFAULT_VOLUME });
          await playTone({ frequency: [659, 784], duration: 0.12, type: 'sine', volume: DEFAULT_VOLUME, when: 0.1 });
          await playTone({ frequency: [784, 1047], duration: 0.3, type: 'sine', volume: DEFAULT_VOLUME, when: 0.2 });
          break;
        case 'complete':
          await playTone({ frequency: 523, duration: 0.12, type: 'sine', volume: DEFAULT_VOLUME });
          await playTone({ frequency: 659, duration: 0.12, type: 'sine', volume: DEFAULT_VOLUME, when: 0.1 });
          await playTone({ frequency: 784, duration: 0.12, type: 'sine', volume: DEFAULT_VOLUME, when: 0.2 });
          await playTone({ frequency: 1047, duration: 0.5, type: 'sine', volume: DEFAULT_VOLUME, when: 0.3 });
          break;
      }
    },
    [playTone, playNoise],
  );

  return { play };
}

export default useSound;
