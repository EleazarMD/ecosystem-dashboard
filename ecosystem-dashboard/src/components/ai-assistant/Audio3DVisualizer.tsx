import React, { useRef, useEffect } from 'react';
import { Box } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import * as THREE from 'three';

interface Audio3DVisualizerProps {
  isListening?: boolean;
  isSpeaking?: boolean;
  audioLevel?: number;
  width?: number;
  height?: number;
}

export const Audio3DVisualizer: React.FC<Audio3DVisualizerProps> = ({
  isListening = false,
  isSpeaking = false,
  audioLevel = 0,
  width = 300,
  height = 300,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sphereRef = useRef<THREE.Mesh | null>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    mountRef.current.appendChild(renderer.domElement);
    camera.position.z = 3;

    // Create sphere with more segments for smooth deformation
    const geometry = new THREE.IcosahedronGeometry(1, 3);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      wireframe: true,
      transparent: true,
      opacity: 0.8
    });

    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);
    sphereRef.current = sphere;

    // Store original positions
    const originalPositions = geometry.attributes.position.array.slice();
    let time = 0;

    const animate = () => {
      time += 0.016;
      
      if (sphereRef.current) {
        const positions = geometry.attributes.position.array;
        
        // Create wave-like deformation
        for (let i = 0; i < positions.length; i += 3) {
          const x = originalPositions[i];
          const y = originalPositions[i + 1];
          const z = originalPositions[i + 2];
          
          // Calculate wave displacement
          const distance = Math.sqrt(x * x + y * y + z * z);
          const wave1 = Math.sin(time * 2 + distance * 5) * 0.1;
          const wave2 = Math.sin(time * 3 + distance * 3) * 0.05;
          
          // Audio reactivity
          const audioMultiplier = (isListening || isSpeaking) ? 
            1 + (audioLevel / 100) + Math.random() * 0.3 : 0.5;
          
          const displacement = (wave1 + wave2) * audioMultiplier;
          
          positions[i] = x * (1 + displacement);
          positions[i + 1] = y * (1 + displacement);
          positions[i + 2] = z * (1 + displacement);
        }
        
        geometry.attributes.position.needsUpdate = true;
        
        // Color cycling
        const hue = (time * 50) % 360;
        material.color.setHSL(hue / 360, 0.8, 0.6);
        
        // Rotation
        sphereRef.current.rotation.y += 0.01;
        sphereRef.current.rotation.x += 0.005;
      }
      
      renderer.render(scene, camera);
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [width, height, isListening, isSpeaking, audioLevel]);

  return (
    <Box 
      width={`${width}px`}
      height={`${height}px`}
      bg="black"
      borderRadius="50%"
      overflow="hidden"
    >
      <div ref={mountRef} />
    </Box>
  );
};
