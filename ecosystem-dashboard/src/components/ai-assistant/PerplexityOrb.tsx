/**
 * Perplexity-style Voice Orb Component
 * A sphere of shifting dots that respond to voice and touch
 * Particles scatter and reform dynamically
 */

import React, { useRef, useEffect, useState } from 'react';
import { Box } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import * as THREE from 'three';

interface PerplexityOrbProps {
  isListening?: boolean;
  isSpeaking?: boolean;
  audioLevel?: number;
  width?: number;
  height?: number;
  particleCount?: number;
  color?: { r: number; g: number; b: number };
}

export const PerplexityOrb: React.FC<PerplexityOrbProps> = ({
  isListening = false,
  isSpeaking = false,
  audioLevel = 0,
  width = 300,
  height = 300,
  particleCount = 200,
  color = { r: 0.4, g: 0.6, b: 1.0 },
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const clockRef = useRef<THREE.Clock | null>(null);
  
  // Particle animation parameters
  const [scatterAmount, setScatterAmount] = useState(0);
  const [rotationSpeed, setRotationSpeed] = useState(0.001);

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

    // Create particle system
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const originalPositions = new Float32Array(particleCount * 3);
    
    // Initialize particles in a sphere formation
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const radius = 1.5 + Math.random() * 0.3;
      
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);
      
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      
      // Store original positions for animation
      originalPositions[i * 3] = x;
      originalPositions[i * 3 + 1] = y;
      originalPositions[i * 3 + 2] = z;
      
      // Color with slight variation
      colors[i * 3] = color.r + Math.random() * 0.1;
      colors[i * 3 + 1] = color.g + Math.random() * 0.1;
      colors[i * 3 + 2] = color.b + Math.random() * 0.1;
      
      // Random sizes
      sizes[i] = Math.random() * 4 + 2;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('originalPosition', new THREE.BufferAttribute(originalPositions, 3));
    
    // Custom shader material for particles
    const vertexShader = `
      attribute float size;
      attribute vec3 originalPosition;
      varying vec3 vColor;
      
      uniform float u_time;
      uniform float u_scatter;
      uniform float u_audioLevel;
      uniform vec2 u_mouse;
      
      void main() {
        vColor = color;
        
        // Base position with scatter effect
        vec3 pos = position;
        
        // Audio reactive displacement
        float audioInfluence = u_audioLevel * 0.01;
        pos += normalize(originalPosition) * audioInfluence;
        
        // Mouse interaction - particles move away from cursor
        vec3 mousePos = vec3(u_mouse.x * 3.0, -u_mouse.y * 3.0, 0.0);
        vec3 toMouse = pos - mousePos;
        float mouseDistance = length(toMouse);
        if (mouseDistance < 2.0) {
          pos += normalize(toMouse) * (2.0 - mouseDistance) * 0.5;
        }
        
        // Scatter animation
        pos += normalize(originalPosition) * u_scatter * (sin(u_time + float(gl_VertexID) * 0.1) * 0.5 + 0.5);
        
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        
        // Size attenuation
        gl_PointSize = size * (300.0 / -mvPosition.z);
      }
    `;
    
    const fragmentShader = `
      varying vec3 vColor;
      
      void main() {
        // Circular point with soft edges
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);
        
        if (dist > 0.5) discard;
        
        float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
        gl_FragColor = vec4(vColor, alpha * 0.9);
      }
    `;
    
    const material = new THREE.ShaderMaterial({
      uniforms: {
        u_time: { value: 0 },
        u_scatter: { value: 0 },
        u_audioLevel: { value: 0 },
        u_mouse: { value: new THREE.Vector2() },
      },
      vertexShader,
      fragmentShader,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    
    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
    particlesRef.current = particles;
    sceneRef.current = scene;
    
    clockRef.current = new THREE.Clock();
    
    // Mouse interaction
    const handleMouseMove = (event: MouseEvent) => {
      const rect = mountRef.current?.getBoundingClientRect();
      if (rect) {
        mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      }
    };
    
    const handleTouch = () => {
      // Scatter particles on touch/click
      setScatterAmount(1.5);
      setTimeout(() => setScatterAmount(0), 500);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    renderer.domElement.addEventListener('click', handleTouch);
    renderer.domElement.addEventListener('touchstart', handleTouch);
    
    // Animation loop
    const animate = () => {
      if (!clockRef.current || !particlesRef.current) return;
      
      const time = clockRef.current.getElapsedTime();
      const material = particlesRef.current.material as THREE.ShaderMaterial;
      
      // Update uniforms
      material.uniforms.u_time.value = time;
      material.uniforms.u_scatter.value = scatterAmount * Math.sin(time * 5);
      material.uniforms.u_audioLevel.value = audioLevel;
      material.uniforms.u_mouse.value.set(mouseRef.current.x, mouseRef.current.y);
      
      // Rotate particle system
      particlesRef.current.rotation.y += rotationSpeed;
      particlesRef.current.rotation.x += rotationSpeed * 0.5;
      
      // Pulsing effect when listening/speaking
      if (isListening || isSpeaking) {
        const pulse = 1 + Math.sin(time * 3) * 0.1;
        particlesRef.current.scale.setScalar(pulse);
      } else {
        particlesRef.current.scale.setScalar(1);
      }
      
      renderer.render(scene, camera);
      animationIdRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      renderer.domElement.removeEventListener('click', handleTouch);
      renderer.domElement.removeEventListener('touchstart', handleTouch);
      
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [width, height, particleCount, color, audioLevel, isListening, isSpeaking, scatterAmount]);

  // Update rotation speed based on activity
  useEffect(() => {
    if (isListening) {
      setRotationSpeed(0.003);
    } else if (isSpeaking) {
      setRotationSpeed(0.005);
    } else {
      setRotationSpeed(0.001);
    }
  }, [isListening, isSpeaking]);

  return (
    <Box 
      ref={mountRef}
      width={`${width}px`}
      height={`${height}px`}
      position="relative"
      cursor="pointer"
      style={{ touchAction: 'none' }}
    />
  );
};
