/**
 * After Effects Audio Reactive Loader
 * Loads and controls AE-exported Lottie animations with audio reactivity
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Box, Text } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import Lottie from 'lottie-react';

interface AEAudioReactiveLoaderProps {
  isActive: boolean;
  audioData?: Float32Array;
  isListening?: boolean;
  isSpeaking?: boolean;
  animationUrl?: string;
  position?: 'bottom-right' | 'center' | 'top-left' | 'floating';
  size?: 'small' | 'medium' | 'large';
}

// Audio analysis utilities
const analyzeAudioData = (audioData: Float32Array) => {
  if (!audioData || audioData.length === 0) {
    return {
      rms: 0,
      peak: 0,
      frequency: 0,
      bass: 0,
      mid: 0,
      treble: 0
    };
  }

  // RMS (overall volume)
  let sum = 0;
  let peak = 0;
  for (let i = 0; i < audioData.length; i++) {
    const sample = Math.abs(audioData[i]);
    sum += sample * sample;
    peak = Math.max(peak, sample);
  }
  const rms = Math.sqrt(sum / audioData.length);

  // Frequency analysis (simplified)
  const third = Math.floor(audioData.length / 3);
  let bass = 0, mid = 0, treble = 0;

  for (let i = 0; i < third; i++) {
    bass += Math.abs(audioData[i]);
  }
  for (let i = third; i < third * 2; i++) {
    mid += Math.abs(audioData[i]);
  }
  for (let i = third * 2; i < audioData.length; i++) {
    treble += Math.abs(audioData[i]);
  }

  return {
    rms: Math.min(rms * 5, 1),
    peak: Math.min(peak * 3, 1),
    frequency: rms > 0.1 ? (bass + mid + treble) / 3 : 0,
    bass: bass / third,
    mid: mid / third,
    treble: treble / third
  };
};

// Predefined AE animation styles
const AE_ANIMATION_STYLES = {
  'voice-orb': {
    name: 'Voice Orb',
    description: 'Pulsing orb that reacts to voice amplitude',
    url: '/animations/voice-orb.json'
  },
  'sound-waves': {
    name: 'Sound Waves',
    description: 'Animated waveforms that follow audio frequency',
    url: '/animations/sound-waves.json'
  },
  'particle-burst': {
    name: 'Particle Burst',
    description: 'Particle explosion effects triggered by audio peaks',
    url: '/animations/particle-burst.json'
  },
  'geometric-pulse': {
    name: 'Geometric Pulse',
    description: 'Geometric shapes that scale with audio levels',
    url: '/animations/geometric-pulse.json'
  },
  'neural-network': {
    name: 'Neural Network',
    description: 'Network visualization that pulses with voice activity',
    url: '/animations/neural-network.json'
  }
};

export const AEAudioReactiveLoader: React.FC<AEAudioReactiveLoaderProps> = ({
  isActive,
  audioData,
  isListening = false,
  isSpeaking = false,
  animationUrl,
  position = 'bottom-right',
  size = 'medium'
}) => {
  const lottieRef = useRef<any>(null);
  const [animationData, setAnimationData] = useState<any>(null);
  const [selectedStyle, setSelectedStyle] = useState('voice-orb');
  const [audioAnalysis, setAudioAnalysis] = useState({
    rms: 0, peak: 0, frequency: 0, bass: 0, mid: 0, treble: 0
  });
  const [sensitivity, setSensitivity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Load animation
  const loadAnimation = useCallback(async (url: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setAnimationData(data);
      } else {
        console.warn(`Animation not found: ${url}, using fallback`);
        // Use fallback procedural animation
        setAnimationData(createFallbackAnimation(selectedStyle));
      }
    } catch (error) {
      console.error('Failed to load animation:', error);
      setAnimationData(createFallbackAnimation(selectedStyle));
    } finally {
      setIsLoading(false);
    }
  }, [selectedStyle]);

  // Create fallback animation when AE files aren't available
  const createFallbackAnimation = (style: string) => {
    // Simplified Lottie structure for fallback
    return {
      v: "5.7.4",
      fr: 60,
      ip: 0,
      op: 120,
      w: 200,
      h: 200,
      nm: `Fallback_${style}`,
      layers: [{
        ddd: 0,
        ind: 1,
        ty: 4,
        nm: "AudioReactive",
        ks: {
          o: { a: 0, k: 80 },
          p: { a: 0, k: [100, 100, 0] },
          s: {
            a: 1, k: [
              { t: 0, s: [100, 100, 100] },
              { t: 60, s: [120, 120, 100] },
              { t: 120, s: [100, 100, 100] }
            ]
          }
        },
        shapes: [{
          ty: "gr",
          it: [{
            ty: "el",
            s: { a: 0, k: [60, 60] },
            p: { a: 0, k: [0, 0] }
          }, {
            ty: "fl",
            c: { a: 0, k: [0.3, 0.7, 1, 1] }
          }]
        }]
      }]
    };
  };

  // Load animation when style changes
  useEffect(() => {
    const url = animationUrl || AE_ANIMATION_STYLES[selectedStyle as keyof typeof AE_ANIMATION_STYLES]?.url;
    if (url) {
      loadAnimation(url);
    }
  }, [selectedStyle, animationUrl, loadAnimation]);

  // Analyze audio data
  useEffect(() => {
    if (audioData && isActive) {
      const analysis = analyzeAudioData(audioData);
      setAudioAnalysis(analysis);
    } else {
      setAudioAnalysis({ rms: 0, peak: 0, frequency: 0, bass: 0, mid: 0, treble: 0 });
    }
  }, [audioData, isActive]);

  // Control animation based on audio
  useEffect(() => {
    if (!lottieRef.current || !animationData) return;

    const animation = lottieRef.current;
    const { rms, peak } = audioAnalysis;

    if (isActive && (isListening || isSpeaking)) {
      // Map audio to animation properties
      const speed = 0.3 + (rms * sensitivity * 2);
      const direction = isSpeaking ? 1 : 1;

      animation.setSpeed(speed);
      animation.setDirection(direction);

      if (animation.isPaused) {
        animation.play();
      }
    } else {
      animation.pause();
    }
  }, [audioAnalysis, isListening, isSpeaking, isActive, sensitivity]);

  // Position and size styles
  const getPositionStyles = () => {
    const sizes = {
      small: { width: '80px', height: '80px' },
      medium: { width: '120px', height: '120px' },
      large: { width: '200px', height: '200px' }
    };

    const positions = {
      'bottom-right': { bottom: '20px', right: '20px' },
      'center': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
      'top-left': { top: '20px', left: '20px' },
      'floating': { bottom: '100px', right: '20px' }
    };

    return { ...sizes[size], ...positions[position] };
  };

  if (!isActive) return null;

  return (
    <>
      {/* Main Animation */}
      <Box
        position="fixed"
        zIndex={9998}
        opacity={isListening || isSpeaking ? 1 : 0.2}
        transition="all 0.3s ease"
        pointerEvents="none"
        {...getPositionStyles()}
      >
        {animationData && (
          <Lottie
            lottieRef={lottieRef}
            animationData={animationData}
            loop={true}
            autoplay={false}
            style={{
              width: '100%',
              height: '100%',
              filter: `
                brightness(${1 + audioAnalysis.rms * 0.5}) 
                saturate(${1 + audioAnalysis.peak * 0.3})
                hue-rotate(${audioAnalysis.frequency * 30}deg)
              `,
              transform: `scale(${1 + audioAnalysis.rms * 0.3 * sensitivity})`
            }}
          />
        )}

        {isLoading && (
          <Box
            position="absolute"
            top="50%"
            left="50%"
            transform="translate(-50%, -50%)"
            color="whiteAlpha.900"
            fontSize="xs"
          >
            Loading...
          </Box>
        )}
      </Box>

    </>
  );
};

export default AEAudioReactiveLoader;
