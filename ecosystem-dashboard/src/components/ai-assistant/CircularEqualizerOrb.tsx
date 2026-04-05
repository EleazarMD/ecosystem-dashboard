import React, { useRef, useEffect } from 'react';
import { Box } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';

interface CircularEqualizerOrbProps {
  isListening?: boolean;
  isSpeaking?: boolean;
  audioLevel?: number;
  width?: number;
  height?: number;
  segmentCount?: number;
}

export const CircularEqualizerOrb: React.FC<CircularEqualizerOrbProps> = ({
  isListening = false,
  isSpeaking = false,
  audioLevel = 0,
  width = 300,
  height = 300,
  segmentCount = 60,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const barsRef = useRef<number[]>(new Array(segmentCount).fill(0));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.35;

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Update bars with audio simulation
      for (let i = 0; i < segmentCount; i++) {
        if (isListening || isSpeaking) {
          barsRef.current[i] = Math.random() * (audioLevel + 50) + 10;
        } else {
          barsRef.current[i] *= 0.95;
        }
      }

      // Draw equalizer bars
      for (let i = 0; i < segmentCount; i++) {
        const angle = (i / segmentCount) * Math.PI * 2;
        const barHeight = barsRef.current[i];
        
        const x1 = centerX + Math.cos(angle) * radius;
        const y1 = centerY + Math.sin(angle) * radius;
        const x2 = centerX + Math.cos(angle) * (radius + barHeight);
        const y2 = centerY + Math.sin(angle) * (radius + barHeight);

        const hue = (i / segmentCount) * 360;
        ctx.strokeStyle = `hsl(${hue}, 80%, 60%)`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [width, height, segmentCount, isListening, isSpeaking, audioLevel]);

  return (
    <Box 
      width={`${width}px`}
      height={`${height}px`}
      position="relative"
      bg="black"
      borderRadius="50%"
      overflow="hidden"
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
        }}
      />
    </Box>
  );
};
