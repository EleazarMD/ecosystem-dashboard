export type ShapeType = 'icosahedron' | 'sphere' | 'octahedron' | 'tetrahedron' | 'dodecahedron' | 'box' | 'cone' | 'cylinder' | 'torus' | 'torusKnot' | 'perplexityOrb' | 'circularOrb';

export interface BlobControls {
  color: { r: number; g: number; b: number };
  size: number;
  dynamism: number;
  roughness: number;
  glowIntensity: number;
  animationSpeed: number;
  hueMix?: number; // 0..1 how much to mix dynamic hue vs base color
  shape?: ShapeType;
  wireframe?: boolean;
  metalness?: number; // 0..1 for reflectivity
  subdivision?: number; // geometry detail level
  rotationSpeed?: { x: number; y: number; z: number };
  position?: { x: number; y: number; z: number };
}

// Futuristic agentic visualizer presets with rich colors
export const VISUALIZER_PRESETS: Record<string, BlobControls> = {
  Aurora: {
    color: { r: 0.2, g: 0.9, b: 1.0 },  // Bright cyan-aqua
    size: 4.5,
    dynamism: 0.5,
    roughness: 3.5,
    glowIntensity: 1.8,
    animationSpeed: 0.6,
    hueMix: 0.4,
    shape: 'icosahedron',
    wireframe: false,
    metalness: 0.3,
    subdivision: 25,
    rotationSpeed: { x: 0.005, y: 0.002, z: 0 },
    position: { x: 0, y: 0, z: 0 },
  },
  PerplexityStyle: {
    color: { r: 0.4, g: 0.6, b: 1.0 },  // Perplexity blue
    size: 4.0,
    dynamism: 0.3,
    roughness: 2.0,
    glowIntensity: 1.5,
    animationSpeed: 0.5,
    hueMix: 0.2,
    shape: 'perplexityOrb',
    wireframe: false,
    metalness: 0.1,
    subdivision: 200, // particle count
    rotationSpeed: { x: 0.001, y: 0.001, z: 0 },
    position: { x: 0, y: 0, z: 0 },
  },
  NeoMint: {
    color: { r: 0.1, g: 1.0, b: 0.5 },  // Vibrant mint green
    size: 4.2,
    dynamism: 0.6,
    roughness: 4.0,
    glowIntensity: 2.0,
    animationSpeed: 0.5,
    hueMix: 0.35,
  },
  DataStream: {
    color: { r: 0.4, g: 0.6, b: 1.0 },  // Rich electric blue
    size: 4.8,
    dynamism: 0.7,
    roughness: 5.0,
    glowIntensity: 1.6,
    animationSpeed: 0.8,
    hueMix: 0.5,
  },
  Sunset: {
    color: { r: 1.0, g: 0.2, b: 0.4 },  // Deep magenta-red
    size: 4.0,
    dynamism: 0.4,
    roughness: 3.0,
    glowIntensity: 2.2,
    animationSpeed: 0.4,
    hueMix: 0.6,
  },
  CyberPunk: {
    color: { r: 0.9, g: 0.0, b: 0.9 },  // Vivid purple-magenta
    size: 4.3,
    dynamism: 0.8,
    roughness: 4.5,
    glowIntensity: 2.0,
    animationSpeed: 1.0,
    hueMix: 0.7,
  },
  CircularRing: {
    color: { r: 0.4, g: 0.6, b: 1.0 },  // Blue to pink gradient
    size: 4.0,
    dynamism: 0.5,
    roughness: 2.0,
    glowIntensity: 2.5,
    animationSpeed: 0.5,
    hueMix: 0.3,
    shape: 'circularOrb',
    wireframe: false,
    metalness: 0.2,
    subdivision: 60, // segment count
    rotationSpeed: { x: 0, y: 0, z: 0.005 },
    position: { x: 0, y: 0, z: 0 },
  },
};
