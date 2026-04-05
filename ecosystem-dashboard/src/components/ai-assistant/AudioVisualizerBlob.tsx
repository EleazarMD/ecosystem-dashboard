/**
 * 3D Audio Visualizer Blob Component
 * Simplified version with transparent background and glow effects
 */

import React, { useRef, useEffect, useState } from 'react';
import { Box, VStack, HStack, Text, Slider, SliderTrack, SliderFilledTrack, SliderThumb, Button, Select, Switch, Divider } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
import { CopyShader } from 'three/examples/jsm/shaders/CopyShader';

// Import shaders as raw text
const perlinShader = `// Perlin noise implementation for GLSL
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
vec3 fade(vec3 t) { return t*t*t*(t*(t*6.0-15.0)+10.0); }
float cnoise(vec3 P) {
  vec3 Pi0 = floor(P);
  vec3 Pi1 = Pi0 + vec3(1.0);
  Pi0 = mod289(Pi0);
  Pi1 = mod289(Pi1);
  vec3 Pf0 = fract(P);
  vec3 Pf1 = Pf0 - vec3(1.0);
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.yy, Pi1.yy);
  vec4 iz0 = Pi0.zzzz;
  vec4 iz1 = Pi1.zzzz;
  vec4 ixy = permute(permute(ix) + iy);
  vec4 ixy0 = permute(ixy + iz0);
  vec4 ixy1 = permute(ixy + iz1);
  vec4 gx0 = ixy0 * (1.0 / 7.0);
  vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
  gx0 = fract(gx0);
  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0.0));
  gx0 -= sz0 * (step(0.0, gx0) - 0.5);
  gy0 -= sz0 * (step(0.0, gy0) - 0.5);
  vec4 gx1 = ixy1 * (1.0 / 7.0);
  vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
  gx1 = fract(gx1);
  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0.0));
  gx1 -= sz1 * (step(0.0, gx1) - 0.5);
  gy1 -= sz1 * (step(0.0, gy1) - 0.5);
  vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
  vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
  vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
  vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
  vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
  vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
  vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
  vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);
  vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
  g000 *= norm0.x;
  g010 *= norm0.y;
  g100 *= norm0.z;
  g110 *= norm0.w;
  vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
  g001 *= norm1.x;
  g011 *= norm1.y;
  g101 *= norm1.z;
  g111 *= norm1.w;
  float n000 = dot(g000, Pf0);
  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
  float n111 = dot(g111, Pf1);
  vec3 fade_xyz = fade(Pf0);
  vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
  float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
  return 2.2 * n_xyz;
}`;

const vertexShader = `varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

uniform float u_time;
uniform float u_frequency;
uniform float u_dynamism;
uniform float u_roughness;
uniform float u_animationSpeed;
uniform float u_glowIntensity;

void main() {
  vUv = uv;
  vNormal = normal;
  vPosition = position;
  
  // Multi-layer noise with proper roughness scaling
  float roughnessScale = u_roughness * 0.3; // Scale roughness to reasonable range
  float noise1 = cnoise(normal * roughnessScale + u_time * u_animationSpeed);
  float noise2 = cnoise(normal * roughnessScale * 2.0 + u_time * u_animationSpeed * 0.5) * 0.5;
  float noise3 = cnoise(normal * roughnessScale * 4.0 + u_time * u_animationSpeed * 0.25) * 0.25;
  
  // Apply dynamism with proper scaling
  float displacement = (noise1 + noise2 + noise3) * u_dynamism * 0.5;
  displacement += (u_frequency / 255.0) * u_dynamism * 0.5;
  
  vec3 newPosition = position + normal * displacement;
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}`;

const fragmentShader = `varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

uniform vec3 u_color;
uniform float u_time;
uniform float u_frequency;
uniform float u_hueMix;
uniform float u_glowIntensity;

float fresnel(vec3 viewDirection, vec3 normal, float power) {
  return pow(1.0 - abs(dot(viewDirection, normal)), power);
}

vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
  vec3 viewDirection = normalize(cameraPosition - vPosition);
  
  // Softer fresnel for depth without washing out colors
  float fresnelIntensity = fresnel(viewDirection, vNormal, 2.5);
  float rimLight = fresnel(viewDirection, vNormal, 1.2);
  
  // Start with rich base color
  vec3 baseColor = u_color * 1.5; // Boost saturation
  
  // Dynamic gradient with multiple color zones
  vec3 hsvColor = rgb2hsv(baseColor);
  float hueShift = sin(vPosition.y * 3.0 + u_time * 0.2) * 0.15; // Vertical gradient
  hsvColor.x += hueShift + u_time * 0.05 + (u_frequency / 255.0) * 0.1;
  hsvColor.y = min(1.0, hsvColor.y * 1.2); // Boost saturation
  vec3 dynamicColor = hsv2rgb(hsvColor);
  
  // Multi-layered color mixing for depth
  vec3 finalColor = mix(baseColor, dynamicColor, u_hueMix);
  
  // Add depth with darker core and colored highlights
  vec3 coreColor = finalColor * (0.3 + fresnelIntensity * 0.5); // Darker core for 3D depth
  vec3 highlightColor = mix(finalColor, finalColor * (1.5 + u_glowIntensity * 0.5), rimLight); // Glow-controlled highlights
  
  finalColor = mix(coreColor, highlightColor, 0.7);
  
  // Frequency and glow reactive brightness
  finalColor += finalColor * (u_frequency / 255.0) * 0.3;
  finalColor *= (0.8 + u_glowIntensity * 0.4); // Apply glow intensity
  
  // Ensure colors aren't washed out
  finalColor = clamp(finalColor, 0.0, 2.0);
  
  // Alpha with better depth perception
  float alpha = mix(0.6, 0.95, fresnelIntensity * 0.7);
  
  gl_FragColor = vec4(finalColor, alpha);
}`;
import { BlobControls, VISUALIZER_PRESETS, ShapeType } from './visualizer.config';
import { PerplexityOrb } from './PerplexityOrb';
import { CircularVoiceOrb } from './CircularVoiceOrb';
import { CircularEqualizerOrb } from './CircularEqualizerOrb';
import { NebulaSphereVisualizer } from './NebulaSphereVisualizer';

interface AudioVisualizerBlobProps {
  isListening?: boolean;
  isSpeaking?: boolean;
  audioStream?: MediaStream;
  width?: number;
  height?: number;
  showControls?: boolean;
  // Allow external UI to override visual controls (color, size, roughness, etc.)
  controlsOverride?: Partial<BlobControls>;
}

export const AudioVisualizerBlob: React.FC<AudioVisualizerBlobProps> = React.memo(({
  isListening = false,
  isSpeaking = false,
  audioStream,
  width = 300,
  height = 300,
  showControls = false,
  controlsOverride
}) => {
  // Removed excessive console.log to prevent performance issues
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const uniformsRef = useRef<any>(null);
  const clockRef = useRef<THREE.Clock | null>(null);
  const bloomComposerRef = useRef<EffectComposer | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationIdRef = useRef<number | null>(null);

  const [controls, setControls] = useState<BlobControls>({
    ...VISUALIZER_PRESETS.CyberPunk,  // Use vivid CyberPunk preset
  });
  
  const [cameraAngle, setCameraAngle] = useState({ x: 0, y: 0, distance: 5 });

  // Merge external overrides with internal controls
  const effectiveControls: BlobControls = {
    ...controls,
    ...(controlsOverride || {}) as BlobControls,
  };

  const [bloomParams, setBloomParams] = useState({
    threshold: 0.05, // Lower threshold for more subtle glow
    strength: 1.2,   // Increased strength for more prominent glow
    radius: 0.85,    // Wider radius for softer edges
    exposure: 1.2    // Increased exposure for better bloom visibility
  });

  const [audioLevel, setAudioLevel] = useState(0);
  const audioLevelRef = useRef(0);

  useEffect(() => {
    if (!mountRef.current) return;

    console.log('Initializing Three.js scene with container:', mountRef.current);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = cameraAngle.distance;
    camera.position.x = Math.sin(cameraAngle.x) * cameraAngle.distance;
    camera.position.y = Math.sin(cameraAngle.y) * cameraAngle.distance * 0.5;
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
      logarithmicDepthBuffer: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    renderer.autoClear = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    console.log('Renderer created and attached to DOM');

    // Create geometry based on shape type
    const shapeType = effectiveControls.shape || 'icosahedron';
    const subdivision = effectiveControls.subdivision || 25;
    const baseSize = 2.2;
    
    let geometry: THREE.BufferGeometry;
    switch (shapeType) {
      case 'sphere':
        geometry = new THREE.SphereGeometry(baseSize, subdivision * 2, subdivision);
        break;
      case 'torus':
        geometry = new THREE.TorusGeometry(baseSize, baseSize * 0.4, subdivision, subdivision * 2);
        break;
      case 'torusKnot':
        geometry = new THREE.TorusKnotGeometry(baseSize * 0.7, baseSize * 0.2, subdivision * 4, subdivision, 2, 3);
        break;
      case 'octahedron':
        geometry = new THREE.OctahedronGeometry(baseSize, Math.floor(subdivision / 5));
        break;
      case 'dodecahedron':
        geometry = new THREE.DodecahedronGeometry(baseSize, Math.floor(subdivision / 5));
        break;
      case 'tetrahedron':
        geometry = new THREE.TetrahedronGeometry(baseSize * 1.2, Math.floor(subdivision / 5));
        break;
      case 'box':
        geometry = new THREE.BoxGeometry(baseSize * 1.5, baseSize * 1.5, baseSize * 1.5, subdivision, subdivision, subdivision);
        break;
      case 'cone':
        geometry = new THREE.ConeGeometry(baseSize, baseSize * 2, subdivision * 2);
        break;
      case 'cylinder':
        geometry = new THREE.CylinderGeometry(baseSize, baseSize, baseSize * 2, subdivision * 2);
        break;
      case 'icosahedron':
      default:
        geometry = new THREE.IcosahedronGeometry(baseSize, Math.floor(subdivision / 5));
        break;
    }
    
    // Create shader material with displacement and glow
    const uniforms = {
      u_time: { value: 0.0 },
      u_frequency: { value: 0.0 },
      u_color: { value: new THREE.Color(effectiveControls.color.r, effectiveControls.color.g, effectiveControls.color.b) },
      u_dynamism: { value: effectiveControls.dynamism },
      u_roughness: { value: effectiveControls.roughness },
      u_animationSpeed: { value: effectiveControls.animationSpeed },
      u_resolution: { value: new THREE.Vector2(width, height) },
      u_hueMix: { value: effectiveControls.hueMix ?? 0.2 },
      u_glowIntensity: { value: effectiveControls.glowIntensity }
    };
    uniformsRef.current = uniforms;
    
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `${perlinShader}\n${vertexShader}`,
      fragmentShader: `${perlinShader}\n${fragmentShader}`,
      transparent: true,
      blending: THREE.NormalBlending,  // Better color preservation
      depthWrite: !effectiveControls.wireframe,
      side: THREE.DoubleSide,
      wireframe: effectiveControls.wireframe || false,
      opacity: 1.0
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    
    // Apply position if specified
    const pos = effectiveControls.position || { x: 0, y: 0, z: 0 };
    mesh.position.set(pos.x, pos.y, pos.z);
    
    scene.add(mesh);
    meshRef.current = mesh;
    console.log('Mesh created and added to scene:', mesh);
    
    // More dramatic lighting for better 3D appearance
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3); // Darker ambient
    scene.add(ambientLight);
    
    // Key light from top-right
    const keyLight = new THREE.DirectionalLight(effectiveControls.color.r > 0.5 ? 0xffaaff : 0xaaffff, 0.8);
    keyLight.position.set(5, 10, 5);
    scene.add(keyLight);
    
    // Fill light from left
    const fillLight = new THREE.PointLight(0x8080ff, 0.5, 100);
    fillLight.position.set(-10, 0, 5);
    scene.add(fillLight);
    
    // Rim light from behind for depth
    const rimLight = new THREE.PointLight(0xff80ff, 0.3, 100);
    rimLight.position.set(0, -5, -10);
    scene.add(rimLight);
    
    // Skip bloom compositor to maintain transparency
    // The glow effect will be handled by the shader itself


    clockRef.current = new THREE.Clock();
    sceneRef.current = scene;


    const handleResize = () => {
      const w = mountRef.current?.clientWidth || width;
      const h = mountRef.current?.clientHeight || height;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      if (bloomComposerRef.current) {
        bloomComposerRef.current.setSize(w, h);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [width, height]);
  
  // Update camera position when angle changes
  useEffect(() => {
    if (cameraRef.current) {
      cameraRef.current.position.x = Math.sin(cameraAngle.x) * cameraAngle.distance;
      cameraRef.current.position.y = Math.sin(cameraAngle.y) * cameraAngle.distance * 0.5;
      cameraRef.current.position.z = Math.cos(cameraAngle.x) * cameraAngle.distance;
      cameraRef.current.lookAt(0, 0, 0);
    }
  }, [cameraAngle]);

  // Setup audio analysis (uses provided stream or falls back to microphone when listening)

  useEffect(() => {
    let cancelled = false;

    const setupWithStream = async (stream: MediaStream) => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.85; // smooth levels to avoid jitter
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        if (cancelled) return;
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
      } catch (error) {
        console.error('Error setting up audio analysis:', error);
      }
    };

    const ensureMic = async () => {
      if (micStreamRef.current) {
        await setupWithStream(micStreamRef.current);
        return;
      }
      try {
        const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) return;
        micStreamRef.current = mic;
        await setupWithStream(mic);
      } catch (err) {
        console.warn('Microphone access denied or unavailable:', err);
      }
    };

    // Priority: external audioStream, else microphone when listening
    if (audioStream) {
      setupWithStream(audioStream);
    } else if (isListening) {
      ensureMic();
    }

    return () => {
      cancelled = true;
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      // Stop mic tracks if we created them
      if (!audioStream && micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(t => t.stop());
        micStreamRef.current = null;
      }
      analyserRef.current = null;
    };
  }, [audioStream, isListening]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      if (!meshRef.current || !clockRef.current) return;

      // Update time
      if (uniformsRef.current && uniformsRef.current.u_time) {
        uniformsRef.current.u_time.value = clockRef.current.getElapsedTime();
      }

      // Update audio frequency
      let frequency = 0;
      if (analyserRef.current) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        frequency = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        audioLevelRef.current = frequency;
        // Only update state occasionally to avoid too many renders
        if (Math.random() < 0.1) {  // Update ~10% of frames
          setAudioLevel(frequency);
        }
      }

      // Subtle pulsing effect
      const time = clockRef.current.getElapsedTime();
      const pulse = 1 + Math.sin(time * 2) * 0.05;
      meshRef.current.scale.setScalar(pulse);

      // Rotation with customizable speed
      const rotSpeed = effectiveControls.rotationSpeed || { x: 0.005, y: 0.002, z: 0 };
      meshRef.current.rotation.x += rotSpeed.x;
      meshRef.current.rotation.y += rotSpeed.y;
      meshRef.current.rotation.z += rotSpeed.z;
      

      // Update frequency uniform
      if (uniformsRef.current && uniformsRef.current.u_frequency) {
        let targetFreq = audioLevelRef.current;
        if (isListening) {
          targetFreq = Math.max(audioLevelRef.current, 25 + Math.sin(clockRef.current.getElapsedTime() * 3) * 15);
        } else if (isSpeaking) {
          targetFreq = Math.max(audioLevelRef.current, 35 + Math.sin(clockRef.current.getElapsedTime() * 5) * 20);
        }
        uniformsRef.current.u_frequency.value = targetFreq;
      }
      
      // Direct render without bloom to preserve transparency
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.clear();
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }

      animationIdRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [isListening, isSpeaking]);

  // Update shader uniforms when controls change
  useEffect(() => {
    if (!uniformsRef.current) return;
    
    const effectiveValues = controlsOverride || controls;
    
    if (uniformsRef.current.u_color) {
      uniformsRef.current.u_color.value.setRGB(effectiveValues.color.r, effectiveValues.color.g, effectiveValues.color.b);
    }
    if (uniformsRef.current.u_dynamism) {
      uniformsRef.current.u_dynamism.value = effectiveValues.dynamism;
    }
    if (uniformsRef.current.u_roughness) {
      uniformsRef.current.u_roughness.value = effectiveValues.roughness;
    }
    if (uniformsRef.current.u_animationSpeed) {
      uniformsRef.current.u_animationSpeed.value = effectiveValues.animationSpeed;
    }
    if (uniformsRef.current.u_hueMix) {
      uniformsRef.current.u_hueMix.value = effectiveValues.hueMix ?? 0.2;
    }
    if (uniformsRef.current.u_glowIntensity) {
      uniformsRef.current.u_glowIntensity.value = effectiveValues.glowIntensity;
    }
    
    // Recreate geometry when shape or size changes
    if (meshRef.current && meshRef.current.geometry) {
      meshRef.current.geometry.dispose();
      
      const shapeType = effectiveValues.shape || 'icosahedron';
      const subdivision = effectiveValues.subdivision || 25;
      const baseSize = effectiveValues.size * 0.5;
      
      let newGeometry: THREE.BufferGeometry;
      switch (shapeType) {
        case 'sphere':
          newGeometry = new THREE.SphereGeometry(baseSize, subdivision * 2, subdivision);
          break;
        case 'torus':
          newGeometry = new THREE.TorusGeometry(baseSize, baseSize * 0.4, subdivision, subdivision * 2);
          break;
        case 'torusKnot':
          newGeometry = new THREE.TorusKnotGeometry(baseSize * 0.7, baseSize * 0.2, subdivision * 4, subdivision, 2, 3);
          break;
        case 'octahedron':
          newGeometry = new THREE.OctahedronGeometry(baseSize, Math.floor(subdivision / 5));
          break;
        case 'dodecahedron':
          newGeometry = new THREE.DodecahedronGeometry(baseSize, Math.floor(subdivision / 5));
          break;
        case 'tetrahedron':
          newGeometry = new THREE.TetrahedronGeometry(baseSize * 1.2, Math.floor(subdivision / 5));
          break;
        case 'box':
          newGeometry = new THREE.BoxGeometry(baseSize * 1.5, baseSize * 1.5, baseSize * 1.5, subdivision, subdivision, subdivision);
          break;
        case 'cone':
          newGeometry = new THREE.ConeGeometry(baseSize, baseSize * 2, subdivision * 2);
          break;
        case 'cylinder':
          newGeometry = new THREE.CylinderGeometry(baseSize, baseSize, baseSize * 2, subdivision * 2);
          break;
        case 'icosahedron':
        default:
          newGeometry = new THREE.IcosahedronGeometry(baseSize, Math.floor(subdivision / 5));
          break;
      }
      
      meshRef.current.geometry = newGeometry;
    }
    
    // Update wireframe mode
    if (meshRef.current && meshRef.current.material) {
      const mat = meshRef.current.material as THREE.ShaderMaterial;
      mat.wireframe = effectiveValues.wireframe || false;
    }
    
    // Update position
    if (meshRef.current && effectiveValues.position) {
      meshRef.current.position.set(
        effectiveValues.position.x,
        effectiveValues.position.y,
        effectiveValues.position.z
      );
    }
    
    // Update material opacity based on glow intensity
    if (meshRef.current && meshRef.current.material) {
      const mat = meshRef.current.material as THREE.ShaderMaterial;
      mat.opacity = 0.5 + (effectiveValues.glowIntensity * 0.2);
    }
  }, [controls, controlsOverride]);

  const updateControl = (key: keyof BlobControls, value: any) => {
    setControls(prev => ({ ...prev, [key]: value }));
  };

  const updateColorControl = (channel: 'r' | 'g' | 'b', value: number) => {
    setControls(prev => ({
      ...prev,
      color: { ...prev.color, [channel]: value }
    }));
  };
  
  const applyPreset = (presetName: string) => {
    const preset = VISUALIZER_PRESETS[presetName];
    if (preset) {
      setControls(preset);
    }
  };

  // If Perplexity Orb is selected, use the dedicated component
  if ((effectiveControls.shape || controls.shape) === 'perplexityOrb') {
    return (
      <Box position="relative" width={`${width}px`} height={`${height}px`}>
        <PerplexityOrb
          isListening={isListening}
          isSpeaking={isSpeaking}
          audioLevel={audioLevel}
          width={width}
          height={height}
          particleCount={effectiveControls.subdivision || 200}
          color={effectiveControls.color}
        />
        {showControls && (
          // Show minimal controls for Perplexity Orb
          <VStack spacing={2} position="absolute" top="0" right="0" p={2} bg={useSemanticToken('surface.base')} borderRadius="md">
            <Text fontSize="sm">Perplexity Orb Active</Text>
            <Button size="sm" onClick={() => updateControl('shape', 'icosahedron')}>
              Switch to 3D Shape
            </Button>
          </VStack>
        )}
      </Box>
    );
  }

  // If Circular Orb is selected, use the 3D visualizer
  if ((effectiveControls.shape || controls.shape) === 'circularOrb') {
    return (
      <Box position="relative" width={`${width}px`} height={`${height}px`}>
        <NebulaSphereVisualizer
          isListening={isListening}
          isSpeaking={isSpeaking}
          audioLevel={audioLevel}
          width={width}
          height={height}
        />
        {showControls && (
          // Show minimal controls for Circular Orb
          <VStack spacing={2} position="absolute" top="0" right="0" p={2} bg={useSemanticToken('surface.base')} borderRadius="md">
            <Text fontSize="sm">3D Audio Visualizer Active</Text>
            <Button size="sm" onClick={() => updateControl('shape', 'icosahedron')}>
              Switch to 3D Shape
            </Button>
          </VStack>
        )}
      </Box>
    );
  }
  
  return (
    <Box position="relative" width={`${width}px`} height={`${height}px`}>
      {/* 3D Blob Container */}
      <Box
        ref={mountRef}
        width="100%"
        height="100%"
        position="absolute"
        top="0"
        left="0"
        bg="transparent"
        zIndex={1}
      />

      {/* Status Indicators removed for clean visualizer */}

      {/* Controls */}
      {showControls && (
        <VStack spacing={4} p={4} bg={useSemanticToken('surface.base')} borderRadius="lg" position="absolute" top="0" right="0" zIndex={10} maxW="320px" maxH="90vh" overflowY="auto">
          <Text fontWeight="bold">Visualizer Controls</Text>
          
          {/* Shape Selection */}
          <VStack spacing={2} align="stretch" w="full">
            <Text fontSize="sm" fontWeight="semibold">Shape</Text>
            <Select
              value={controls.shape || 'icosahedron'}
              onChange={(e) => updateControl('shape', e.target.value as ShapeType)}
              size="sm"
            >
              <option value="icosahedron">Icosahedron</option>
              <option value="sphere">Sphere</option>
              <option value="torus">Torus (Donut)</option>
              <option value="torusKnot">Torus Knot</option>
              <option value="octahedron">Octahedron</option>
              <option value="dodecahedron">Dodecahedron</option>
              <option value="tetrahedron">Tetrahedron</option>
              <option value="cube">Cube</option>
              <option value="cone">Cone</option>
              <option value="cylinder">Cylinder</option>
              <option value="perplexityOrb">Perplexity Orb</option>
            </Select>
            
            <HStack>
              <Text fontSize="sm">Wireframe:</Text>
              <Switch
                isChecked={controls.wireframe || false}
                onChange={(e) => updateControl('wireframe', e.target.checked)}
                size="sm"
              />
            </HStack>
          </VStack>
          
          <Divider />
          
          {/* Preset Buttons */}
          <VStack spacing={2} align="stretch" w="full">
            <Text fontSize="sm" fontWeight="semibold">Theme Presets</Text>
            <HStack wrap="wrap" spacing={2}>
              {Object.keys(VISUALIZER_PRESETS).map((preset) => (
                <Button
                  key={preset}
                  size="sm"
                  onClick={() => applyPreset(preset)}
                  colorScheme={preset === 'Aurora' ? 'cyan' : preset === 'NeoMint' ? 'green' : preset === 'DataStream' ? 'blue' : preset === 'Sunset' ? 'pink' : 'purple'}
                  variant="outline"
                >
                  {preset}
                </Button>
              ))}
            </HStack>
          </VStack>
          
          {/* Color Controls */}
          <VStack spacing={2} align="stretch">
            <Text fontSize="sm" fontWeight="semibold">Color</Text>
            <HStack>
              <Text fontSize="xs" w="20px">R:</Text>
              <Slider
                value={controls.color.r}
                onChange={(value) => updateColorControl('r', value)}
                min={0}
                max={1}
                step={0.1}
                flex={1}
              >
                <SliderTrack bg="red.100">
                  <SliderFilledTrack bg="red.400" />
                </SliderTrack>
                <SliderThumb />
              </Slider>
            </HStack>
            <HStack>
              <Text fontSize="xs" w="20px">G:</Text>
              <Slider
                value={controls.color.g}
                onChange={(value) => updateColorControl('g', value)}
                min={0}
                max={1}
                step={0.1}
                flex={1}
              >
                <SliderTrack bg="green.100">
                  <SliderFilledTrack bg="green.400" />
                </SliderTrack>
                <SliderThumb />
              </Slider>
            </HStack>
            <HStack>
              <Text fontSize="xs" w="20px">B:</Text>
              <Slider
                value={controls.color.b}
                onChange={(value) => updateColorControl('b', value)}
                min={0}
                max={1}
                step={0.1}
                flex={1}
              >
                <SliderTrack bg="blue.100">
                  <SliderFilledTrack bg="blue.400" />
                </SliderTrack>
                <SliderThumb />
              </Slider>
            </HStack>
          </VStack>

          {/* Camera Controls */}
          <VStack spacing={2} align="stretch">
            <Text fontSize="sm" fontWeight="semibold">Camera View</Text>
            <HStack>
              <Text fontSize="xs" w="80px">Angle X:</Text>
              <Slider
                value={cameraAngle.x}
                onChange={(value) => setCameraAngle(prev => ({ ...prev, x: value }))}
                min={-Math.PI}
                max={Math.PI}
                step={0.1}
                flex={1}
              >
                <SliderTrack>
                  <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb />
              </Slider>
            </HStack>
            <HStack>
              <Text fontSize="xs" w="80px">Angle Y:</Text>
              <Slider
                value={cameraAngle.y}
                onChange={(value) => setCameraAngle(prev => ({ ...prev, y: value }))}
                min={-Math.PI / 2}
                max={Math.PI / 2}
                step={0.1}
                flex={1}
              >
                <SliderTrack>
                  <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb />
              </Slider>
            </HStack>
            <HStack>
              <Text fontSize="xs" w="80px">Distance:</Text>
              <Slider
                value={cameraAngle.distance}
                onChange={(value) => setCameraAngle(prev => ({ ...prev, distance: value }))}
                min={3}
                max={10}
                step={0.2}
                flex={1}
              >
                <SliderTrack>
                  <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb />
              </Slider>
            </HStack>
          </VStack>

          {/* Other Controls */}
          <VStack spacing={2} align="stretch">
            <HStack>
              <Text fontSize="sm" w="80px">Size:</Text>
              <Slider
                value={controls.size}
                onChange={(value) => updateControl('size', value)}
                min={2}
                max={8}
                step={0.5}
                flex={1}
              >
                <SliderTrack>
                  <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb />
              </Slider>
            </HStack>
            
            <HStack>
              <Text fontSize="sm" w="80px">Dynamism:</Text>
              <Slider
                value={controls.dynamism}
                onChange={(value) => updateControl('dynamism', value)}
                min={0.0}
                max={2.0}
                step={0.1}
                flex={1}
              >
                <SliderTrack>
                  <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb />
              </Slider>
              <Text fontSize="xs" w="40px">{controls.dynamism.toFixed(2)}</Text>
            </HStack>
            
            <HStack>
              <Text fontSize="sm" w="80px">Roughness:</Text>
              <Slider
                value={controls.roughness}
                onChange={(value) => updateControl('roughness', value)}
                min={1}
                max={10}
                step={0.5}
                flex={1}
              >
                <SliderTrack>
                  <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb />
              </Slider>
              <Text fontSize="xs" w="40px">{controls.roughness.toFixed(1)}</Text>
            </HStack>
            
            <HStack>
              <Text fontSize="sm" w="80px">Glow:</Text>
              <Slider
                value={controls.glowIntensity}
                onChange={(value) => updateControl('glowIntensity', value)}
                min={0.2}
                max={3.0}
                step={0.1}
                flex={1}
              >
                <SliderTrack>
                  <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb />
              </Slider>
              <Text fontSize="xs" w="40px">{controls.glowIntensity.toFixed(1)}</Text>
            </HStack>
            
            <HStack>
              <Text fontSize="sm" w="80px">Speed:</Text>
              <Slider
                value={controls.animationSpeed}
                onChange={(value) => updateControl('animationSpeed', value)}
                min={0.1}
                max={3}
                step={0.1}
                flex={1}
              >
                <SliderTrack>
                  <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb />
              </Slider>
              <Text fontSize="xs" w="40px">{controls.animationSpeed.toFixed(1)}</Text>
            </HStack>
            
            <HStack>
              <Text fontSize="sm" w="80px">Size:</Text>
              <Slider
                value={controls.size}
                onChange={(value) => updateControl('size', value)}
                min={2}
                max={8}
                step={0.2}
                flex={1}
              >
                <SliderTrack>
                  <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb />
              </Slider>
              <Text fontSize="xs" w="40px">{controls.size.toFixed(1)}</Text>
            </HStack>
            
            <HStack>
              <Text fontSize="sm" w="80px">Detail:</Text>
              <Slider
                value={controls.subdivision || 25}
                onChange={(value) => updateControl('subdivision', value)}
                min={5}
                max={50}
                step={5}
                flex={1}
              >
                <SliderTrack>
                  <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb />
              </Slider>
              <Text fontSize="xs" w="40px">{controls.subdivision || 25}</Text>
            </HStack>
          </VStack>
          
          <Divider />
          
          {/* Position Controls */}
          <VStack spacing={2} align="stretch">
            <Text fontSize="sm" fontWeight="semibold">Position</Text>
            <HStack>
              <Text fontSize="xs" w="20px">X:</Text>
              <Slider
                value={controls.position?.x || 0}
                onChange={(value) => updateControl('position', { ...controls.position || { x: 0, y: 0, z: 0 }, x: value })}
                min={-5}
                max={5}
                step={0.1}
                flex={1}
              >
                <SliderTrack>
                  <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb />
              </Slider>
            </HStack>
            <HStack>
              <Text fontSize="xs" w="20px">Y:</Text>
              <Slider
                value={controls.position?.y || 0}
                onChange={(value) => updateControl('position', { ...controls.position || { x: 0, y: 0, z: 0 }, y: value })}
                min={-5}
                max={5}
                step={0.1}
                flex={1}
              >
                <SliderTrack>
                  <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb />
              </Slider>
            </HStack>
            <HStack>
              <Text fontSize="xs" w="20px">Z:</Text>
              <Slider
                value={controls.position?.z || 0}
                onChange={(value) => updateControl('position', { ...controls.position || { x: 0, y: 0, z: 0 }, z: value })}
                min={-5}
                max={5}
                step={0.1}
                flex={1}
              >
                <SliderTrack>
                  <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb />
              </Slider>
            </HStack>
          </VStack>
          
          <Divider />
          
          {/* Rotation Speed Controls */}
          <VStack spacing={2} align="stretch">
            <Text fontSize="sm" fontWeight="semibold">Rotation Speed</Text>
            <HStack>
              <Text fontSize="xs" w="20px">X:</Text>
              <Slider
                value={controls.rotationSpeed?.x || 0.005}
                onChange={(value) => updateControl('rotationSpeed', { ...controls.rotationSpeed || { x: 0.005, y: 0.002, z: 0 }, x: value })}
                min={-0.02}
                max={0.02}
                step={0.001}
                flex={1}
              >
                <SliderTrack>
                  <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb />
              </Slider>
            </HStack>
            <HStack>
              <Text fontSize="xs" w="20px">Y:</Text>
              <Slider
                value={controls.rotationSpeed?.y || 0.002}
                onChange={(value) => updateControl('rotationSpeed', { ...controls.rotationSpeed || { x: 0.005, y: 0.002, z: 0 }, y: value })}
                min={-0.02}
                max={0.02}
                step={0.001}
                flex={1}
              >
                <SliderTrack>
                  <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb />
              </Slider>
            </HStack>
            <HStack>
              <Text fontSize="xs" w="20px">Z:</Text>
              <Slider
                value={controls.rotationSpeed?.z || 0}
                onChange={(value) => updateControl('rotationSpeed', { ...controls.rotationSpeed || { x: 0.005, y: 0.002, z: 0 }, z: value })}
                min={-0.02}
                max={0.02}
                step={0.001}
                flex={1}
              >
                <SliderTrack>
                  <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb />
              </Slider>
            </HStack>
          </VStack>
        </VStack>
      )}
    </Box>
  );
});

AudioVisualizerBlob.displayName = 'AudioVisualizerBlob';

export default AudioVisualizerBlob;
