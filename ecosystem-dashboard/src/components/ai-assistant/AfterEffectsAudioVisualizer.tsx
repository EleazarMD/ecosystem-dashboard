/**
 * After Effects-Style Audio Reactive Visualizer
 * Uses Lottie animations with real-time audio data binding
 */

import React, { useRef, useEffect, useState } from 'react';
import { Box } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import Lottie from 'lottie-react';

interface AfterEffectsAudioVisualizerProps {
  isActive: boolean;
  audioData?: Float32Array;
  isListening?: boolean;
  isSpeaking?: boolean;
  style?: 'orb' | 'waveform' | 'particle' | 'geometric';
}

// Mock Lottie animation data - replace with actual AE export
const createAudioReactiveLottie = (style: string) => ({
  v: "5.7.4",
  fr: 60,
  ip: 0,
  op: 180,
  w: 400,
  h: 400,
  nm: `AudioReactive_${style}`,
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: "AudioOrb",
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 1, k: [
          { i: { x: [0.833], y: [0.833] }, o: { x: [0.167], y: [0.167] }, t: 0, s: [0] },
          { t: 179, s: [360] }
        ]},
        p: { a: 0, k: [200, 200, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 1, k: [
          { i: { x: [0.833], y: [0.833] }, o: { x: [0.167], y: [0.167] }, t: 0, s: [100, 100, 100] },
          { t: 179, s: [150, 150, 100] }
        ]}
      },
      ao: 0,
      shapes: [
        {
          ty: "gr",
          it: [
            {
              d: 1,
              ty: "el",
              s: { a: 0, k: [100, 100] },
              p: { a: 0, k: [0, 0] }
            },
            {
              ty: "fl",
              c: { a: 0, k: [0.2, 0.6, 1, 1] },
              o: { a: 0, k: 100 }
            }
          ]
        }
      ],
      ip: 0,
      op: 180,
      st: 0
    }
  ]
});

export const AfterEffectsAudioVisualizer: React.FC<AfterEffectsAudioVisualizerProps> = ({
  isActive,
  audioData,
  isListening = false,
  isSpeaking = false,
  style = 'orb'
}) => {
  const lottieRef = useRef<any>(null);
  const [animationData, setAnimationData] = useState(null);
  const [audioLevel, setAudioLevel] = useState(0);

  // Load animation based on style
  useEffect(() => {
    const loadAnimation = async () => {
      try {
        // In production, load actual AE-exported Lottie files
        // const response = await fetch(`/animations/voice-${style}.json`);
        // const data = await response.json();
        
        // For now, use procedural animation
        const data = createAudioReactiveLottie(style);
        setAnimationData(data as any);
      } catch (error) {
        console.error('Failed to load animation:', error);
      }
    };

    loadAnimation();
  }, [style]);

  // Process audio data for reactivity
  useEffect(() => {
    if (!audioData || !isActive) {
      setAudioLevel(0);
      return;
    }

    // Calculate RMS (Root Mean Square) for audio level
    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
      sum += audioData[i] * audioData[i];
    }
    const rms = Math.sqrt(sum / audioData.length);
    const level = Math.min(rms * 10, 1); // Normalize and amplify
    
    setAudioLevel(level);
  }, [audioData, isActive]);

  // Control animation based on audio level
  useEffect(() => {
    if (!lottieRef.current || !isActive) return;

    const animation = lottieRef.current;
    
    if (isListening || isSpeaking) {
      // Map audio level to animation properties
      const speed = 0.5 + (audioLevel * 2); // 0.5x to 2.5x speed
      const direction = isSpeaking ? 1 : -1;
      
      animation.setSpeed(speed);
      animation.setDirection(direction);
      
      if (animation.isPaused) {
        animation.play();
      }
    } else {
      animation.pause();
    }
  }, [audioLevel, isListening, isSpeaking, isActive]);

  if (!animationData || !isActive) {
    return null;
  }

  return (
    <Box
      position="fixed"
      bottom="20px"
      right="20px"
      width="120px"
      height="120px"
      zIndex={9998}
      opacity={isListening || isSpeaking ? 1 : 0.3}
      transition="opacity 0.3s ease"
      pointerEvents="none"
    >
      <Lottie
        lottieRef={lottieRef}
        animationData={animationData}
        loop={true}
        autoplay={false}
        style={{
          width: '100%',
          height: '100%',
          filter: `brightness(${1 + audioLevel}) saturate(${1 + audioLevel * 0.5})`,
          transform: `scale(${1 + audioLevel * 0.2})`
        }}
      />
      
      {/* Audio level indicator */}
      <Box
        position="absolute"
        bottom="-5px"
        left="50%"
        transform="translateX(-50%)"
        width="80px"
        height="2px"
        bg={useSemanticToken('glass.background')}
        borderRadius="1px"
        overflow="hidden"
      >
        <Box
          width={`${audioLevel * 100}%`}
          height="100%"
          bg={isListening ? "blue.400" : isSpeaking ? "green.400" : "gray.400"}
          transition="width 0.1s ease, background-color 0.3s ease"
        />
      </Box>
    </Box>
  );
};

export default AfterEffectsAudioVisualizer;
