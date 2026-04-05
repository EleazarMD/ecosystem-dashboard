/**
 * Circular Voice Orb Component
 * Audio-reactive equalizer visualization with circular bars
 * Responds to voice input with frequency-based animation
 */

import React, { useRef, useEffect, useState } from 'react';
import { Box } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import * as THREE from 'three';

interface CircularVoiceOrbProps {
  isListening?: boolean;
  isSpeaking?: boolean;
  audioLevel?: number;
  width?: number;
  height?: number;
  segmentCount?: number;
  color?: { r: number; g: number; b: number };
}

export const CircularVoiceOrb: React.FC<CircularVoiceOrbProps> = ({
  isListening = false,
  isSpeaking = false,
  audioLevel = 0,
  width = 300,
  height = 300,
  segmentCount = 60,
  color = { r: 0.4, g: 0.6, b: 1.0 },
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const equalizerRef = useRef<THREE.Group | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const clockRef = useRef<THREE.Clock | null>(null);
  const audioDataRef = useRef<Float32Array>(new Float32Array(segmentCount));
  
  // Animation parameters
  const [pulseIntensity, setPulseIntensity] = useState(0);
  const [rotationSpeed, setRotationSpeed] = useState(0.005);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    
    // Camera setup
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 5;
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      premultipliedAlpha: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create ring group
    const ringGroup = new THREE.Group();
    scene.add(ringGroup);
    ringRef.current = ringGroup;

    // Create main ring with gradient shader
    const ringGeometry = new THREE.RingGeometry(1.8, 2.2, 64);
    
    const ringVertexShader = `
      varying vec2 vUv;
      varying vec3 vPosition;
      
      void main() {
        vUv = uv;
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
    
    const ringFragmentShader = `
      uniform float u_time;
      uniform float u_audioLevel;
      uniform vec3 u_color;
      varying vec2 vUv;
      varying vec3 vPosition;
      
      void main() {
        // Create radial gradient
        vec2 center = vec2(0.5, 0.5);
        float dist = distance(vUv, center);
        
        // Gradient from blue to pink
        vec3 color1 = vec3(0.2, 0.4, 1.0); // Blue
        vec3 color2 = vec3(1.0, 0.2, 0.6); // Pink
        
        // Mix colors based on angle
        float angle = atan(vUv.y - 0.5, vUv.x - 0.5);
        float normalizedAngle = (angle + 3.14159) / (2.0 * 3.14159);
        vec3 gradientColor = mix(color1, color2, normalizedAngle);
        
        // Add audio reactivity
        float audioInfluence = u_audioLevel * 0.01;
        gradientColor += gradientColor * audioInfluence;
        
        // Glow effect
        float glow = 1.0 - smoothstep(0.0, 0.3, abs(dist - 0.3));
        
        // Pulsing effect
        float pulse = 1.0 + sin(u_time * 3.0) * 0.2;
        
        gl_FragColor = vec4(gradientColor * glow * pulse, glow * 0.8);
      }
    `;

    const ringMaterial = new THREE.ShaderMaterial({
      uniforms: {
        u_time: { value: 0 },
        u_audioLevel: { value: 0 },
        u_color: { value: new THREE.Color(color.r, color.g, color.b) },
      },
      vertexShader: ringVertexShader,
      fragmentShader: ringFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
    });

    const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
    ringGroup.add(ringMesh);

    // Create animated segments around the ring
    const segments: THREE.Mesh[] = [];
    for (let i = 0; i < segmentCount; i++) {
      const angle = (i / segmentCount) * Math.PI * 2;
      const segmentGeometry = new THREE.PlaneGeometry(0.1, 0.3);
      
      const segmentVertexShader = `
        uniform float u_time;
        uniform float u_index;
        uniform float u_audioLevel;
        varying vec2 vUv;
        
        void main() {
          vUv = uv;
          
          // Audio reactive scaling
          float audioScale = 1.0 + (u_audioLevel * 0.02);
          vec3 pos = position * audioScale;
          
          // Wave animation
          float wave = sin(u_time * 2.0 + u_index * 0.5) * 0.1;
          pos.y += wave;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `;
      
      const segmentFragmentShader = `
        uniform float u_time;
        uniform float u_index;
        uniform float u_audioLevel;
        varying vec2 vUv;
        
        void main() {
          // Gradient from center to edge
          float alpha = 1.0 - length(vUv - vec2(0.5));
          
          // Color cycling
          float hue = u_time * 0.5 + u_index * 0.1;
          vec3 color = vec3(
            0.5 + 0.5 * cos(hue),
            0.5 + 0.5 * cos(hue + 2.094),
            0.5 + 0.5 * cos(hue + 4.188)
          );
          
          // Audio reactivity
          float audioGlow = 1.0 + u_audioLevel * 0.05;
          
          gl_FragColor = vec4(color * audioGlow, alpha * 0.7);
        }
      `;

      const segmentMaterial = new THREE.ShaderMaterial({
        uniforms: {
          u_time: { value: 0 },
          u_index: { value: i },
          u_audioLevel: { value: 0 },
        },
        vertexShader: segmentVertexShader,
        fragmentShader: segmentFragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
      });

      const segmentMesh = new THREE.Mesh(segmentGeometry, segmentMaterial);
      
      // Position segments around the ring
      const radius = 2.5;
      segmentMesh.position.x = Math.cos(angle) * radius;
      segmentMesh.position.y = Math.sin(angle) * radius;
      segmentMesh.lookAt(0, 0, 0);
      
      segments.push(segmentMesh);
      ringGroup.add(segmentMesh);
    }

    sceneRef.current = scene;
    clockRef.current = new THREE.Clock();
    
    // Animation loop
    const animate = () => {
      if (!clockRef.current || !ringRef.current) return;
      
      const time = clockRef.current.getElapsedTime();
      
      // Update ring material
      const ringMat = ringMesh.material as THREE.ShaderMaterial;
      ringMat.uniforms.u_time.value = time;
      ringMat.uniforms.u_audioLevel.value = audioLevel;
      
      // Update segments
      segments.forEach((segment, index) => {
        const segmentMat = segment.material as THREE.ShaderMaterial;
        segmentMat.uniforms.u_time.value = time;
        segmentMat.uniforms.u_audioLevel.value = audioLevel;
        
        // Hide/show segments based on audio level and listening state
        const shouldShow = isListening || isSpeaking || 
          (audioLevel > 10 && Math.sin(time * 5 + index * 0.3) > -0.5);
        segment.visible = shouldShow;
      });
      
      // Rotate the entire ring
      ringRef.current.rotation.z += rotationSpeed;
      
      // Pulsing effect when active
      if (isListening || isSpeaking) {
        const pulse = 1 + Math.sin(time * 4) * 0.15;
        ringRef.current.scale.setScalar(pulse);
      } else {
        ringRef.current.scale.setScalar(1);
      }
      
      renderer.render(scene, camera);
      animationIdRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      
      // Cleanup
      segments.forEach(segment => {
        segment.geometry.dispose();
        (segment.material as THREE.Material).dispose();
      });
      ringGeometry.dispose();
      ringMaterial.dispose();
      renderer.dispose();
    };
  }, [width, height, segmentCount, color, audioLevel, isListening, isSpeaking]);

  // Update animation parameters based on state
  useEffect(() => {
    if (isListening) {
      setRotationSpeed(0.01);
      setPulseIntensity(0.3);
    } else if (isSpeaking) {
      setRotationSpeed(0.015);
      setPulseIntensity(0.5);
    } else {
      setRotationSpeed(0.005);
      setPulseIntensity(0.1);
    }
  }, [isListening, isSpeaking]);

  return (
    <Box 
      ref={mountRef}
      width={`${width}px`}
      height={`${height}px`}
      position="relative"
      bg="black"
      borderRadius="50%"
      overflow="hidden"
    />
  );
};
