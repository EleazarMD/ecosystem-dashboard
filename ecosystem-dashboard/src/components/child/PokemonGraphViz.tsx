/**
 * PokemonGraphViz — Interactive 3D force-directed graph visualization (WebGL)
 *
 * Uses react-force-graph-3d + three.js to show a Pokemon's knowledge graph
 * neighborhood: the Pokemon node at center, connected to its Types, Abilities,
 * Moves, Species, and Evolution chain — all with labeled edges.
 *
 * Kids can drag nodes, rotate/zoom/pan, hover to see edge labels, and click
 * nodes to see details. A flat 2D toggle is available for simpler viewing.
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Box, VStack, HStack, Text, Spinner, Button, useDisclosure, Collapse, Wrap, WrapItem } from '@chakra-ui/react';
import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons';
import dynamic from 'next/dynamic';
import * as THREE from 'three';
import {
  pokedexClient,
  getTypeColor,
  getTypeEmoji,
  kidEdgeLabel,
  titleCase,
  PokemonDetail,
  PokemonMove,
  EvolutionNode,
} from '@/lib/pokedex-client';

// react-force-graph-3d must be dynamically imported (uses WebGL + window).
// We wrap it in forwardRef because next/dynamic does not forward refs.
const ForceGraph3DRaw = dynamic(() => import('react-force-graph-3d'), {
  ssr: false,
  loading: () => (
    <VStack justify="center" h="400px">
      <Spinner color="purple.400" />
      <Text fontSize="sm" color="gray.400">Loading 3D graph engine...</Text>
    </VStack>
  ),
}) as any;

const ForceGraph3D = React.forwardRef<any, any>((props, ref) => (
  <ForceGraph3DRaw {...props} ref={ref} />
));
ForceGraph3D.displayName = 'ForceGraph3D';

// Image cache for node sprites. We load images once and create Three.js
// textures from them when building node objects for the WebGL renderer.
const spriteCache = new Map<string, HTMLImageElement>();

// Cache for text label sprites — avoids recreating canvas+texture on every render.
// Keyed by `${text}|${color}|${bg}`.
const textSpriteCache = new Map<string, THREE.Sprite>();

// ─── Types ────────────────────────────────────────────────────────────────

interface GraphNode {
  id: string;
  label: string;
  type: 'pokemon' | 'type' | 'ability' | 'move' | 'species' | 'evolution';
  color: string;
  emoji: string;
  sprite?: string;
  val: number;
  x?: number;
  y?: number;
  z?: number;
  vx?: number;
  vy?: number;
  vz?: number;
  fx?: number;
  fy?: number;
  fz?: number;
}

interface GraphLink {
  source: string;
  target: string;
  label: string;
  color: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

interface PokemonGraphVizProps {
  pokemon?: PokemonDetail;
  height?: number;
  demo?: boolean;
}

// ─── Demo graph data (works offline) ─────────────────────────────────────

const DEMO_POKEMON: PokemonDetail = {
  id: 25,
  name: 'pikachu',
  pokedex_number: 25,
  height: 4,
  weight: 60,
  base_experience: 112,
  sprite_front: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
  sprite_back: '',
  sprite_shiny: '',
  sprite_dream_world: '',
  official_artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
  anime_artwork: null,
  cries: '',
  types: ['electric'],
  abilities: [
    { id: 9, name: 'static', is_hidden: false },
    { id: 31, name: 'lightning-rod', is_hidden: true },
  ],
  stats: [
    { stat: 'hp', base_value: 35 },
    { stat: 'attack', base_value: 55 },
    { stat: 'defense', base_value: 40 },
    { stat: 'special-attack', base_value: 50 },
    { stat: 'special-defense', base_value: 50 },
    { stat: 'speed', base_value: 90 },
  ],
  species: {
    id: 25,
    name: 'pikachu',
    genus: 'Mouse Pokemon',
    is_legendary: false,
    is_mythical: false,
    is_baby: false,
    capture_rate: 190,
    color: 'yellow',
    shape: 'quadruped',
    habitat: 'forest',
    description: 'Pikachu that can generate powerful electricity have cheek sacs that are extra soft and super stretchy.',
    growth_rate: 'medium',
  },
};

const DEMO_EVOLUTION: EvolutionNode[] = [
  {
    species_id: 172,
    species_name: 'pichu',
    pokemon_id: 172,
    pokemon_name: 'pichu',
    sprite_front: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/172.png',
    artwork: '',
    anime_artwork: null,
    evolve_trigger: 'level-up',
    evolve_conditions: 'high friendship',
    evolve_min_level: null,
    evolve_item: null,
    evolves_to_id: 25,
    evolves_to_name: 'pikachu',
  },
  {
    species_id: 25,
    species_name: 'pikachu',
    pokemon_id: 25,
    pokemon_name: 'pikachu',
    sprite_front: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
    artwork: '',
    anime_artwork: null,
    evolve_trigger: 'use-item',
    evolve_conditions: 'thunder stone',
    evolve_min_level: null,
    evolve_item: 'thunder-stone',
    evolves_to_id: 26,
    evolves_to_name: 'raichu',
  },
  {
    species_id: 26,
    species_name: 'raichu',
    pokemon_id: 26,
    pokemon_name: 'raichu',
    sprite_front: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/26.png',
    artwork: '',
    anime_artwork: null,
    evolve_trigger: '',
    evolve_conditions: '',
    evolve_min_level: null,
    evolve_item: null,
    evolves_to_id: null,
    evolves_to_name: null,
  },
];

const DEMO_MOVES: PokemonMove[] = [
  { id: 1, name: 'thunder-shock', type: 'electric', power: 40, pp: 30, accuracy: 100, damage_class: 'special', effect: 'An electric shock attack.', level: 1, learn_method: 'level-up' },
  { id: 2, name: 'quick-attack', type: 'normal', power: 40, pp: 30, accuracy: 100, damage_class: 'physical', effect: 'A fast attack.', level: 1, learn_method: 'level-up' },
  { id: 3, name: 'thunderbolt', type: 'electric', power: 90, pp: 15, accuracy: 100, damage_class: 'special', effect: 'A strong electric blast.', level: 26, learn_method: 'level-up' },
  { id: 4, name: 'iron-tail', type: 'steel', power: 100, pp: 15, accuracy: 75, damage_class: 'physical', effect: 'Slams the foe with a hard tail.', level: null, learn_method: 'machine' },
  { id: 5, name: 'electro-ball', type: 'electric', power: null, pp: 10, accuracy: 100, damage_class: 'special', effect: 'The faster the user, the stronger the attack.', level: 18, learn_method: 'level-up' },
  { id: 6, name: 'thunder', type: 'electric', power: 110, pp: 10, accuracy: 70, damage_class: 'special', effect: 'A wicked thunderbolt.', level: 50, learn_method: 'level-up' },
  { id: 7, name: 'agility', type: 'psychic', power: null, pp: 30, accuracy: null, damage_class: 'status', effect: 'Sharply raises Speed.', level: 24, learn_method: 'level-up' },
  { id: 8, name: 'spark', type: 'electric', power: 65, pp: 20, accuracy: 100, damage_class: 'physical', effect: 'An electric charge attack.', level: 12, learn_method: 'level-up' },
  { id: 9, name: 'double-team', type: 'normal', power: null, pp: 15, accuracy: null, damage_class: 'status', effect: 'Creates illusory copies.', level: null, learn_method: 'machine' },
  { id: 10, name: 'slam', type: 'normal', power: 80, pp: 20, accuracy: 75, damage_class: 'physical', effect: 'Slams the foe with a long tail.', level: 37, learn_method: 'level-up' },
  { id: 11, name: 'wild-charge', type: 'electric', power: 90, pp: 15, accuracy: 100, damage_class: 'physical', effect: 'An electrical tackle.', level: null, learn_method: 'machine' },
  { id: 12, name: 'play-nice', type: 'normal', power: null, pp: 20, accuracy: null, damage_class: 'status', effect: 'Lowers the target\'s Attack.', level: 1, learn_method: 'level-up' },
  { id: 13, name: 'wish', type: 'normal', power: null, pp: 10, accuracy: null, damage_class: 'status', effect: 'Heals the user later.', level: null, learn_method: 'egg' },
  { id: 14, name: 'volt-tackle', type: 'electric', power: 120, pp: 15, accuracy: 100, damage_class: 'physical', effect: 'A powerful tackle.', level: null, learn_method: 'egg' },
  { id: 15, name: 'fake-out', type: 'normal', power: 40, pp: 10, accuracy: 100, damage_class: 'physical', effect: 'Hits first and flinches.', level: null, learn_method: 'egg' },
];

// ─── Node styling ─────────────────────────────────────────────────────────

const NODE_STYLES: Record<string, { color: string; emoji: string; size: number }> = {
  pokemon: { color: '#fbbf24', emoji: '🔴', size: 30 },
  type: { color: '#4facfe', emoji: '⚡', size: 20 },
  ability: { color: '#43e97b', emoji: '✨', size: 16 },
  move: { color: '#f5576c', emoji: '⚔️', size: 14 },
  species: { color: '#a78bfa', emoji: '🧬', size: 18 },
  evolution: { color: '#f093fb', emoji: '🧬', size: 22 },
};

const EDGE_COLORS: Record<string, string> = {
  HAS_TYPE: '#4facfe',
  HAS_ABILITY: '#43e97b',
  CAN_LEARN: '#f5576c',
  BELONGS_TO: '#a78bfa',
  EVOLVES_INTO: '#f093fb',
};

// ─── Three.js helpers ─────────────────────────────────────────────────────

/** Create a billboard text sprite that always faces the camera (cached). */
function createTextSprite(text: string, opts?: { color?: string; bg?: string }): THREE.Sprite {
  const color = opts?.color ?? '#ffffff';
  const bg = opts?.bg ?? 'rgba(0,0,0,0.7)';
  const cacheKey = `${text}|${color}|${bg}`;
  const cached = textSpriteCache.get(cacheKey);
  if (cached) return cached.clone();

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const fontSize = 48;
  ctx.font = `bold ${fontSize}px sans-serif`;
  const metrics = ctx.measureText(text);
  const padX = 16;
  const padY = 10;
  canvas.width = Math.ceil(metrics.width + padX * 2);
  canvas.height = fontSize + padY * 2;
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(0, 0, canvas.width, canvas.height, 14);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  const scale = 0.012;
  sprite.scale.set(canvas.width * scale, canvas.height * scale, 1);
  textSpriteCache.set(cacheKey, sprite);
  return sprite.clone();
}

/** Create a circular image sprite from a loaded HTMLImageElement. */
function createImageSprite(img: HTMLImageElement, diameter: number): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = diameter;
  canvas.height = diameter;
  const ctx = canvas.getContext('2d')!;
  const r = diameter / 2;
  ctx.beginPath();
  ctx.arc(r, r, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(img, 0, 0, diameter, diameter);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  const scale = 0.012;
  sprite.scale.set(diameter * scale, diameter * scale, 1);
  return sprite;
}

/** Create a colored sphere mesh. */
function createColoredSphere(radius: number, color: string): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(radius, 24, 24);
  const material = new THREE.MeshBasicMaterial({ color });
  return new THREE.Mesh(geometry, material);
}

// ─── Component ────────────────────────────────────────────────────────────

// ─── Guided tour steps ───────────────────────────────────────────────────

const TOUR_STEPS: { title: string; body: string; emoji: string }[] = [
  {
    emoji: '🌐',
    title: 'Welcome to the Friend Web!',
    body: 'This is a 3D map of everything connected to your Pokemon. Each ball is a thing, and each line shows how they are connected. Let us explore together!',
  },
  {
    emoji: '🔴',
    title: 'The Big Ball in the Middle',
    body: 'The big golden ball in the center is your Pokemon! All the other balls are connected to it because they are its friends — its types, powers, moves, and family.',
  },
  {
    emoji: '⚡',
    title: 'Type Balls (Blue)',
    body: 'The blue balls show what type your Pokemon is. Like Fire, Water, or Electric! The line says "is type" because it connects the Pokemon to its type.',
  },
  {
    emoji: '✨',
    title: 'Power Balls (Green)',
    body: 'The green balls are special powers your Pokemon has. These powers work automatically in battle! The line says "has power".',
  },
  {
    emoji: '⚔️',
    title: 'Move Balls (Red)',
    body: 'The red balls are moves your Pokemon can learn. Moves are attacks like Thunder Shock or Quick Attack! The line says "can learn".',
  },
  {
    emoji: '🧬',
    title: 'Family Balls (Purple)',
    body: 'The purple balls show your Pokemon\'s family. They show who your Pokemon evolves from and evolves into! The line says "evolves into".',
  },
  {
    emoji: '🎮',
    title: 'Your Turn to Explore!',
    body: 'Now you can explore on your own! Drag balls to move them, spin the scene by right-dragging, scroll to zoom, and click any ball to learn about it. Try the filter buttons to hide or show different types of balls!',
  },
];

// ─── Node types for filtering ─────────────────────────────────────────────

type NodeType = 'pokemon' | 'type' | 'ability' | 'move' | 'species' | 'evolution';

const ALL_NODE_TYPES: NodeType[] = ['pokemon', 'type', 'ability', 'move', 'species', 'evolution'];

const KID_TYPE_LABELS: Record<string, string> = {
  pokemon: 'Pokemon',
  type: 'Type',
  ability: 'Power',
  move: 'Move',
  species: 'Family',
  evolution: 'Evolution',
};

// ─── Component ────────────────────────────────────────────────────────────

export function PokemonGraphViz({ pokemon: pokemonProp, height = 450, demo = false }: PokemonGraphVizProps) {
  const pokemon = pokemonProp || (demo ? DEMO_POKEMON : null);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [moves, setMoves] = useState<PokemonMove[]>([]);
  const [evolution, setEvolution] = useState<EvolutionNode[]>([]);
  const [isDemo, setIsDemo] = useState(demo);
  const [spriteTick, setSpriteTick] = useState(0);
  const [graphWidth, setGraphWidth] = useState(800);
  const fgRef = useRef<any>(null);
  const graphContainerRef = useRef<HTMLDivElement>(null);
  const { isOpen: showHelp, onToggle: toggleHelp } = useDisclosure({ defaultIsOpen: true });

  // Filter state — which node types are visible
  const [activeFilters, setActiveFilters] = useState<Set<NodeType>>(new Set(ALL_NODE_TYPES));

  // Guided tour state (-1 = not started, 0..N = step index)
  const [tourStep, setTourStep] = useState(-1);

  // Edge label visibility toggle (off by default for performance — hover shows labels)
  const [showEdgeLabels, setShowEdgeLabels] = useState(false);

  // Node label visibility toggle
  const [showNodeLabels, setShowNodeLabels] = useState(true);

  // Filtered graph data based on active filters
  const filteredGraphData = useMemo(() => {
    if (activeFilters.size === ALL_NODE_TYPES.length) return graphData;
    const visibleNodes = graphData.nodes.filter((n) => activeFilters.has(n.type as NodeType));
    const visibleIds = new Set(visibleNodes.map((n) => n.id));
    const visibleLinks = graphData.links.filter(
      (l) => visibleIds.has(l.source as string) && visibleIds.has(l.target as string),
    );
    return { nodes: visibleNodes, links: visibleLinks };
  }, [graphData, activeFilters]);

  const toggleFilter = useCallback((type: NodeType) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      // Always keep pokemon visible
      if (type === 'pokemon') return next;
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  const resetFilters = useCallback(() => {
    setActiveFilters(new Set(ALL_NODE_TYPES));
  }, []);

  // Load a sprite image into the cache and trigger a redraw when ready.
  const loadSprite = useCallback((url: string) => {
    if (!url) return;
    if (spriteCache.has(url)) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      spriteCache.set(url, img);
      setSpriteTick((t) => t + 1);
    };
    img.onerror = () => {
      // Keep a placeholder so we don't retry continuously.
      spriteCache.set(url, img);
    };
    img.src = url;
  }, []);

  // Pre-load sprites for all nodes that have them.
  useEffect(() => {
    graphData.nodes.forEach((n) => {
      if (n.sprite) loadSprite(n.sprite);
    });
  }, [graphData, loadSprite]);

  // Measure container width responsively
  useEffect(() => {
    const updateWidth = () => {
      const el = graphContainerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setGraphWidth(Math.max(320, Math.floor(rect.width)));
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Fetch neighborhood data
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    if (!pokemon) {
      setGraphData({ nodes: [], links: [] });
      setMoves([]);
      setEvolution([]);
      setIsDemo(true);
      setLoading(false);
      return;
    }

    if (demo) {
      setMoves(DEMO_MOVES);
      setEvolution(DEMO_EVOLUTION);
      setGraphData(buildGraphData(DEMO_POKEMON, DEMO_MOVES, DEMO_EVOLUTION));
      setIsDemo(true);
      setLoading(false);
      return;
    }

    Promise.all([
      pokedexClient.pokemonMoves(pokemon.id).catch(() => [] as PokemonMove[]),
      pokemon.species
        ? pokedexClient.evolutionChain(pokemon.species.id).catch(() => [] as EvolutionNode[])
        : Promise.resolve([] as EvolutionNode[]),
    ]).then(([movesData, evoData]) => {
      if (cancelled) return;
      setMoves(movesData);
      setEvolution(evoData);
      setGraphData(buildGraphData(pokemon, movesData, evoData));
      setIsDemo(false);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [pokemon, demo]);

  // ─── Camera controls ────────────────────────────────────────────────────

  // Safe camera positioning — uses cameraPosition if available (animated),
  // otherwise falls back to direct camera + controls manipulation.
  const safeCameraPosition = useCallback((pos: { x: number; y: number; z: number }, lookAt: { x: number; y: number; z: number } | null, ms: number) => {
    const fg = fgRef.current;
    if (!fg) return;
    if (typeof fg.cameraPosition === 'function') {
      fg.cameraPosition(pos, lookAt, ms);
    } else {
      // Fallback: manipulate Three.js camera + OrbitControls directly
      const camera = typeof fg.camera === 'function' ? fg.camera() : null;
      const controls = typeof fg.controls === 'function' ? fg.controls() : null;
      if (camera) {
        camera.position.set(pos.x, pos.y, pos.z);
        if (lookAt) {
          camera.lookAt(lookAt.x, lookAt.y, lookAt.z);
          if (controls) {
            controls.target.set(lookAt.x, lookAt.y, lookAt.z);
            controls.update();
          }
        }
      }
    }
  }, []);

  const handleZoomIn = useCallback(() => {
    const fg = fgRef.current;
    if (!fg) return;
    const camera = typeof fg.camera === 'function' ? fg.camera() : null;
    if (camera) {
      safeCameraPosition({ x: camera.position.x, y: camera.position.y, z: camera.position.z * 0.6 }, null, 400);
    }
  }, [safeCameraPosition]);

  const handleZoomOut = useCallback(() => {
    const fg = fgRef.current;
    if (!fg) return;
    const camera = typeof fg.camera === 'function' ? fg.camera() : null;
    if (camera) {
      safeCameraPosition({ x: camera.position.x, y: camera.position.y, z: camera.position.z * 1.5 }, null, 400);
    }
  }, [safeCameraPosition]);

  const handleResetView = useCallback(() => {
    if (graphData.nodes.length === 0) return;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const n of graphData.nodes) {
      const x = n.x ?? 0, y = n.y ?? 0, z = n.z ?? 0;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, cz = (minZ + maxZ) / 2;
    const range = Math.max(maxX - minX, maxY - minY, maxZ - minZ, 50);
    safeCameraPosition({ x: cx, y: cy, z: cz + range * 2.2 }, { x: cx, y: cy, z: cz }, 600);
  }, [graphData, safeCameraPosition]);

  const handleFitToGraph = useCallback(() => {
    if (filteredGraphData.nodes.length === 0) return;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const n of filteredGraphData.nodes) {
      const x = n.x ?? 0, y = n.y ?? 0, z = n.z ?? 0;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, cz = (minZ + maxZ) / 2;
    const range = Math.max(maxX - minX, maxY - minY, maxZ - minZ, 100);
    safeCameraPosition({ x: cx, y: cy, z: cz + range * 1.8 }, { x: cx, y: cy, z: cz }, 600);
  }, [filteredGraphData, safeCameraPosition]);

  // Center camera on the graph after data loads — auto-fit to graph bounds
  useEffect(() => {
    if (fgRef.current && graphData.nodes.length > 0 && !loading) {
      setTimeout(() => {
        const fg = fgRef.current;
        if (!fg) return;
        // Auto-fit camera to graph bounds so everything is visible and sized right
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
        for (const n of graphData.nodes) {
          const x = n.x ?? 0, y = n.y ?? 0, z = n.z ?? 0;
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
          if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
        }
        const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, cz = (minZ + maxZ) / 2;
        const range = Math.max(maxX - minX, maxY - minY, maxZ - minZ, 50);
        const camDist = range * 2.2; // closer fit
        safeCameraPosition({ x: cx, y: cy, z: cz + camDist }, { x: cx, y: cy, z: cz }, 600);
        // Enable panning with left-mouse for kids (default is right-mouse only)
        const controls = typeof fg.controls === 'function' ? fg.controls() : null;
        if (controls) {
          controls.enablePan = true;
          // Make left-click pan instead of rotate (more intuitive for kids)
          controls.mouseButtons = {
            LEFT: THREE.MOUSE.PAN,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.ROTATE,
          };
          // Touch: one-finger pan, two-finger rotate+zoom
          controls.touches = {
            ONE: THREE.TOUCH.PAN,
            TWO: THREE.TOUCH.DOLLY_ROTATE,
          };
        }
      }, 400);
    }
  }, [graphData, loading, safeCameraPosition]);

  // ─── Tour controls ──────────────────────────────────────────────────────

  const startTour = useCallback(() => setTourStep(0), []);
  const closeTour = useCallback(() => setTourStep(-1), []);
  const nextTourStep = useCallback(() => {
    setTourStep((s) => (s < TOUR_STEPS.length - 1 ? s + 1 : -1));
  }, []);
  const prevTourStep = useCallback(() => {
    setTourStep((s) => Math.max(0, s - 1));
  }, []);

  // ─── Node renderer (Three.js) ───────────────────────────────────────────

  const nodeThreeObject = useCallback((node: any) => {
    const n = node as GraphNode;
    const style = NODE_STYLES[n.type] || NODE_STYLES.pokemon;
    const radius = style.size / 6; // Scale for 3D space
    const isHovered = hoveredNode?.id === n.id;
    const isSelected = selectedNode?.id === n.id;

    const group = new THREE.Group();

    // Glow sphere for hovered/selected
    if (isHovered || isSelected) {
      const glowGeom = new THREE.SphereGeometry(radius * 1.4, 24, 24);
      const glowMat = new THREE.MeshBasicMaterial({
        color: isSelected ? 0xa78bfa : 0xffffff,
        transparent: true,
        opacity: 0.25,
      });
      group.add(new THREE.Mesh(glowGeom, glowMat));
    }

    // Node body: image sprite for Pokemon/evolution, colored sphere otherwise
    const sprite = n.sprite ? spriteCache.get(n.sprite) : undefined;
    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      const imgSprite = createImageSprite(sprite, style.size * 2);
      group.add(imgSprite);
    } else {
      group.add(createColoredSphere(radius, n.color));
    }

    // Always-visible text label below the node (toggleable)
    if (showNodeLabels) {
      const labelColor = isHovered || isSelected ? '#ffffff' : 'rgba(255,255,255,0.9)';
      const labelBg = isSelected ? 'rgba(168,85,247,0.8)' : isHovered ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.65)';
      const labelSprite = createTextSprite(n.label, { color: labelColor, bg: labelBg });
      labelSprite.position.y = -(radius + 3);
      group.add(labelSprite);
    }

    return group;
  }, [hoveredNode, selectedNode, spriteTick, showNodeLabels]);

  // ─── Link rendering (built-in 3D) ───────────────────────────────────────

  const linkColorCb = useCallback((link: any) => {
    return (link as GraphLink).color || '#888888';
  }, []);

  const linkWidthCb = useCallback((link: any) => {
    const l = link as GraphLink;
    const source = l.source as any;
    const target = l.target as any;
    const isActive = hoveredNode?.id === source.id || hoveredNode?.id === target.id
      || selectedNode?.id === source.id || selectedNode?.id === target.id;
    return isActive ? 2.5 : 1.2;
  }, [hoveredNode, selectedNode]);

  const linkLabelCb = useCallback((link: any) => {
    const l = link as GraphLink;
    return `
      <div style="background: rgba(0,0,0,0.9); padding: 6px 12px; border-radius: 8px; font-family: system-ui; border-left: 3px solid ${l.color};">
        <div style="color: #fff; font-size: 12px; font-weight: bold;">${l.label}</div>
      </div>
    `;
  }, []);

  const linkParticleWidthCb = useCallback((link: any) => {
    const l = link as GraphLink;
    const source = l.source as any;
    const target = l.target as any;
    const isActive = hoveredNode?.id === source.id || hoveredNode?.id === target.id
      || selectedNode?.id === source.id || selectedNode?.id === target.id;
    return isActive ? 3 : 1.5;
  }, [hoveredNode, selectedNode]);

  // 3D edge label — a text sprite positioned at the link midpoint
  const linkThreeObject = useCallback((link: any) => {
    if (!showEdgeLabels) return null;
    const l = link as GraphLink;
    const source = l.source as any;
    const target = l.target as any;
    const isActive = hoveredNode?.id === source.id || hoveredNode?.id === target.id
      || selectedNode?.id === source.id || selectedNode?.id === target.id;
    const labelColor = isActive ? '#ffffff' : 'rgba(255,255,255,0.7)';
    const labelBg = isActive ? l.color : 'rgba(0,0,0,0.5)';
    const sprite = createTextSprite(l.label, { color: labelColor, bg: labelBg });
    return sprite;
  }, [hoveredNode, selectedNode, showEdgeLabels]);

  const linkPositionObject = useCallback((link: any, _prevObj: any) => {
    if (!showEdgeLabels) return;
    const l = link as GraphLink;
    const source = l.source as any;
    const target = l.target as any;
    const obj = _prevObj as THREE.Sprite;
    if (obj && source && target) {
      obj.position.set(
        (source.x + target.x) / 2,
        (source.y + target.y) / 2,
        (source.z + target.z) / 2,
      );
    }
  }, [showEdgeLabels]);

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handleNodeHover = useCallback((node: any) => {
    setHoveredNode(node as GraphNode | null);
  }, []);

  const handleNodeClick = useCallback((node: any) => {
    setSelectedNode(node as GraphNode);
  }, []);

  const handleBackgroundClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // ─── Render ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <VStack justify="center" h={height}>
        <Spinner color="purple.400" size="lg" />
        <Text fontSize="sm" color="gray.400">Building the graph...</Text>
      </VStack>
    );
  }

  return (
    <VStack spacing={3} align="stretch" w="full">
      {isDemo && (
        <Box bg="orange.900" borderRadius="md" p={3} border="1px solid" borderColor="orange.600">
          <HStack spacing={2}>
            <Text fontSize="lg">📡</Text>
            <Box>
              <Text fontSize="sm" fontWeight="semibold" color="orange.100">
                Offline demo mode
              </Text>
              <Text fontSize="xs" color="orange.200">
                The Pokedex graph service is not connected. Showing a demo graph so you can still explore!
              </Text>
            </Box>
          </HStack>
        </Box>
      )}

      {/* Compact toolbar: filters, labels, tips, tour, reset */}
      <HStack spacing={2} align="start" flexWrap="wrap" rowGap={1}>
        <HStack spacing={1} flexWrap="wrap" rowGap={1}>
          {ALL_NODE_TYPES.map((nt) => {
            const style = NODE_STYLES[nt];
            const isActive = activeFilters.has(nt);
            const isPokemon = nt === 'pokemon';
            return (
              <Box
                key={nt}
                as="button"
                onClick={() => toggleFilter(nt)}
                px={2}
                py={0.5}
                borderRadius="full"
                border="1px solid"
                borderColor={isActive ? style.color : 'whiteAlpha.200'}
                bg={isActive ? `${style.color}22` : 'transparent'}
                opacity={isActive ? 1 : 0.4}
                cursor={isPokemon ? 'default' : 'pointer'}
                _hover={isPokemon ? {} : { opacity: 0.7 }}
                transition="all 0.15s"
              >
                <HStack spacing={1}>
                  <Box w="8px" h="8px" borderRadius="full" bg={style.color} />
                  <Text fontSize="xs" color={isActive ? 'gray.200' : 'gray.500'}>
                    {style.emoji} {KID_TYPE_LABELS[nt]}
                  </Text>
                </HStack>
              </Box>
            );
          })}
        </HStack>
        <HStack spacing={1} flexWrap="wrap" rowGap={1}>
          <Button size="xs" variant="ghost" onClick={toggleHelp} rightIcon={showHelp ? <ChevronUpIcon /> : <ChevronDownIcon />} fontSize="xs">
            {showHelp ? 'Hide' : 'Tips'}
          </Button>
          <Button size="xs" variant="ghost" onClick={() => setShowNodeLabels((v) => !v)} fontSize="xs">
            {showNodeLabels ? '🏷️ Labels' : '🏷️ Names'}
          </Button>
          <Button size="xs" variant="ghost" onClick={() => setShowEdgeLabels((v) => !v)} fontSize="xs">
            {showEdgeLabels ? '🏷️ Edge Tags On' : '🏷️ Edge Tags Off'}
          </Button>
          <Button size="xs" variant="ghost" onClick={resetFilters} fontSize="xs">↺ Reset</Button>
          <Button size="xs" variant="solid" colorScheme="purple" onClick={startTour}>
            🎓 Tour
          </Button>
        </HStack>
      </HStack>

      <Collapse in={showHelp}>
        <Box bg="rgba(102,126,234,0.1)" borderRadius="md" p={2} border="1px solid" borderColor="rgba(102,126,234,0.3)">
          <Text fontSize="xs" color="gray.300">
            🖱️ <strong>Left-drag</strong> to pan · <strong>Right-drag</strong> to rotate · <strong>Scroll</strong> to zoom · <strong>Click</strong> a ball for details
          </Text>
        </Box>
      </Collapse>

      {/* Guided Tour Overlay */}
      {tourStep >= 0 && (
        <Box
          position="absolute"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
          zIndex={20}
          maxW="400px"
          w="90%"
          bg="rgba(20,20,40,0.95)"
          borderRadius="xl"
          border="2px solid"
          borderColor="purple.400"
          p={5}
          boxShadow="0 0 40px rgba(168,85,247,0.4)"
        >
          <VStack spacing={3} align="stretch">
            <HStack justify="space-between">
              <Text fontSize="2xl">{TOUR_STEPS[tourStep].emoji}</Text>
              <HStack spacing={1}>
                {TOUR_STEPS.map((_, i) => (
                  <Box
                    key={i}
                    w="8px"
                    h="8px"
                    borderRadius="full"
                    bg={i === tourStep ? 'purple.400' : i < tourStep ? 'purple.600' : 'whiteAlpha.300'}
                  />
                ))}
              </HStack>
              <Button size="xs" variant="ghost" onClick={closeTour} fontSize="xs">✕</Button>
            </HStack>
            <Text fontWeight="bold" fontSize="md" color="white">{TOUR_STEPS[tourStep].title}</Text>
            <Text fontSize="sm" color="gray.300" lineHeight={1.5}>{TOUR_STEPS[tourStep].body}</Text>
            <HStack justify="space-between" pt={1}>
              <Button size="xs" variant="ghost" onClick={prevTourStep} isDisabled={tourStep === 0}>
                ← Back
              </Button>
              <Text fontSize="xs" color="gray.500">Step {tourStep + 1} of {TOUR_STEPS.length}</Text>
              <Button size="xs" variant="solid" colorScheme="purple" onClick={nextTourStep}>
                {tourStep === TOUR_STEPS.length - 1 ? 'Done! 🎉' : 'Next →'}
              </Button>
            </HStack>
          </VStack>
        </Box>
      )}

      {/* Graph canvas with camera controls overlay and floating node card */}
      <Box
        ref={graphContainerRef}
        borderRadius="xl"
        overflow="hidden"
        border="1px solid"
        borderColor="whiteAlpha.200"
        bg="rgba(0,0,0,0.4)"
        position="relative"
        w="full"
      >
        <ForceGraph3D
          ref={fgRef}
          graphData={filteredGraphData}
          nodeThreeObject={nodeThreeObject}
          nodeThreeObjectExtend={false}
          nodeLabel={(node: any) => {
            const n = node as GraphNode;
            const typeLabel = KID_TYPE_LABELS[n.type] || n.type;
            return `
              <div style="background: rgba(0,0,0,0.9); padding: 8px 14px; border-radius: 10px; font-family: system-ui; border-left: 3px solid ${n.color};">
                <div style="font-weight: bold; color: #fff; font-size: 13px;">${n.emoji} ${n.label}</div>
                <div style="color: ${n.color}; font-size: 11px; text-transform: capitalize; margin-top: 2px;">${typeLabel}</div>
              </div>
            `;
          }}
          linkColor={linkColorCb}
          linkWidth={linkWidthCb}
          linkLabel={linkLabelCb}
          linkThreeObject={linkThreeObject}
          linkThreeObjectExtend={false}
          linkPositionUpdate={linkPositionObject}
          linkDirectionalParticles={2}
          linkDirectionalParticleWidth={linkParticleWidthCb}
          linkDirectionalParticleSpeed={0.006}
          linkDirectionalParticleColor={(link: any) => (link as GraphLink).color}
          linkDirectionalArrowLength={4}
          linkDirectionalArrowRelPos={0.8}
          onNodeHover={handleNodeHover}
          onNodeClick={handleNodeClick}
          onBackgroundClick={handleBackgroundClick}
          backgroundColor="rgba(0,0,0,0.4)"
          cooldownTicks={100}
          width={graphWidth}
          height={height}
          d3AlphaDecay={0.03}
          d3VelocityDecay={0.3}
          enableNodeDrag={true}
          enableNavigationControls={true}
          showNavInfo={false}
        />

        {/* Camera control buttons (overlay) */}
        <VStack
          position="absolute"
          top={2}
          right={2}
          spacing={1}
          zIndex={10}
        >
          <Box
            as="button"
            onClick={handleZoomIn}
            w="32px"
            h="32px"
            borderRadius="md"
            bg="rgba(0,0,0,0.6)"
            border="1px solid whiteAlpha.300"
            color="white"
            fontSize="lg"
            cursor="pointer"
            _hover={{ bg: 'rgba(168,85,247,0.4)' }}
            title="Zoom in"
          >+</Box>
          <Box
            as="button"
            onClick={handleZoomOut}
            w="32px"
            h="32px"
            borderRadius="md"
            bg="rgba(0,0,0,0.6)"
            border="1px solid whiteAlpha.300"
            color="white"
            fontSize="lg"
            cursor="pointer"
            _hover={{ bg: 'rgba(168,85,247,0.4)' }}
            title="Zoom out"
          >−</Box>
          <Box
            as="button"
            onClick={handleResetView}
            w="32px"
            h="32px"
            borderRadius="md"
            bg="rgba(0,0,0,0.6)"
            border="1px solid whiteAlpha.300"
            color="white"
            fontSize="sm"
            cursor="pointer"
            _hover={{ bg: 'rgba(168,85,247,0.4)' }}
            title="Reset view"
          >⟲</Box>
          <Box
            as="button"
            onClick={handleFitToGraph}
            w="32px"
            h="32px"
            borderRadius="md"
            bg="rgba(0,0,0,0.6)"
            border="1px solid whiteAlpha.300"
            color="white"
            fontSize="sm"
            cursor="pointer"
            _hover={{ bg: 'rgba(168,85,247,0.4)' }}
            title="Fit to graph"
          >⤢</Box>
        </VStack>

        {/* Selected node info (floating, compact) */}
        {selectedNode && (
          <Box
            position="absolute"
            bottom={2}
            left={2}
            maxW="220px"
            zIndex={10}
            bg="rgba(20,20,40,0.92)"
            borderRadius="md"
            p={2}
            border="1px solid"
            borderColor="purple.400"
            backdropFilter="blur(4px)"
          >
            <HStack spacing={2} align="start">
              <Text fontSize="xl" lineHeight={1}>{selectedNode.emoji}</Text>
              <Box flex={1} minW={0}>
                <Text fontWeight="semibold" fontSize="xs" isTruncated>{selectedNode.label}</Text>
                <Text fontSize="xs" color="purple.300" textTransform="capitalize">
                  {KID_TYPE_LABELS[selectedNode.type] || selectedNode.type}
                </Text>
                {(() => {
                  const connected = graphData.links.filter(
                    (l) => l.source === selectedNode.id || l.target === selectedNode.id
                  );
                  if (connected.length === 0) return null;
                  return (
                    <Wrap spacing={1} mt={1}>
                      {connected.slice(0, 4).map((l, i) => (
                        <WrapItem key={i}>
                          <Box w="5px" h="5px" borderRadius="full" bg={l.color} display="inline-block" mr={1} />
                          <Text fontSize="10px" color="gray.300" display="inline">{l.label}</Text>
                        </WrapItem>
                      ))}
                      {connected.length > 4 && (
                        <WrapItem><Text fontSize="10px" color="gray.500">+{connected.length - 4}</Text></WrapItem>
                      )}
                    </Wrap>
                  );
                })()}
              </Box>
            </HStack>
          </Box>
        )}

      </Box>

      {/* Stats */}
      <HStack spacing={3} fontSize="xs" color="gray.400" flexWrap="wrap">
        <Text>{filteredGraphData.nodes.length} of {graphData.nodes.length} balls</Text>
        <Text>·</Text>
        <Text>{filteredGraphData.links.length} of {graphData.links.length} strings</Text>
        <Text>·</Text>
        <Text>{moves.length} moves loaded</Text>
        {evolution.length > 0 && (
          <>
            <Text>·</Text>
            <Text>{evolution.length} evolution stages</Text>
          </>
        )}
        {activeFilters.size < ALL_NODE_TYPES.length && (
          <>
            <Text>·</Text>
            <Text color="orange.300">Filtering: {ALL_NODE_TYPES.length - activeFilters.size} hidden</Text>
          </>
        )}
      </HStack>
    </VStack>
  );
}

// ─── Graph builder ────────────────────────────────────────────────────────

function buildGraphData(
  pokemon: PokemonDetail,
  moves: PokemonMove[],
  evolution: EvolutionNode[],
): GraphData {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const nodeIds = new Set<string>();
  const linkKeys = new Set<string>();

  const addNode = (node: GraphNode) => {
    if (!nodeIds.has(node.id)) {
      nodeIds.add(node.id);
      nodes.push(node);
    }
  };

  const addLink = (source: string, target: string, label: string) => {
    // Guard against self-loops and duplicate edges
    if (source === target) return;
    const linkKey = `${source}|${target}|${label}`;
    if (linkKeys.has(linkKey)) return;
    linkKeys.add(linkKey);
    links.push({
      source,
      target,
      label,
      color: EDGE_COLORS[label] || '#888888',
    });
  };

  // Central Pokemon node
  const pokemonId = `pokemon-${pokemon.id}`;
  addNode({
    id: pokemonId,
    label: pokemon.name,
    type: 'pokemon',
    color: NODE_STYLES.pokemon.color,
    emoji: NODE_STYLES.pokemon.emoji,
    sprite: pokemon.anime_artwork || pokemon.official_artwork || pokemon.sprite_front,
    val: NODE_STYLES.pokemon.size,
  });

  // Type nodes + edges
  for (const typeName of pokemon.types) {
    const typeId = `type-${typeName}`;
    addNode({
      id: typeId,
      label: titleCase(typeName),
      type: 'type',
      color: getTypeColor(typeName),
      emoji: getTypeEmoji(typeName),
      val: NODE_STYLES.type.size,
    });
    addLink(pokemonId, typeId, kidEdgeLabel('HAS_TYPE'));
  }

  // Ability nodes + edges
  for (const ability of pokemon.abilities) {
    const abilityId = `ability-${ability.id}`;
    addNode({
      id: abilityId,
      label: titleCase(ability.name),
      type: 'ability',
      color: NODE_STYLES.ability.color,
      emoji: NODE_STYLES.ability.emoji,
      val: NODE_STYLES.ability.size,
    });
    addLink(pokemonId, abilityId, kidEdgeLabel('HAS_ABILITY'));
  }

  // Species node + edge
  if (pokemon.species) {
    const speciesId = `species-${pokemon.species.id}`;
    addNode({
      id: speciesId,
      label: titleCase(pokemon.species.name),
      type: 'species',
      color: NODE_STYLES.species.color,
      emoji: NODE_STYLES.species.emoji,
      val: NODE_STYLES.species.size,
    });
    addLink(pokemonId, speciesId, kidEdgeLabel('BELONGS_TO'));

    // Evolution chain — two-pass: first create all nodes (with sprites),
    // then create all edges. This ensures every species gets its sprite
    // even if it first appears as an evolution target in a prior row.
    for (const evo of evolution) {
      if (evo.species_id === pokemon.species?.id) continue;
      const evoNodeId = `evo-${evo.species_id}`;
      addNode({
        id: evoNodeId,
        label: titleCase(evo.species_name),
        type: 'evolution',
        color: NODE_STYLES.evolution.color,
        emoji: NODE_STYLES.evolution.emoji,
        sprite: evo.anime_artwork || evo.artwork || evo.sprite_front || undefined,
        val: NODE_STYLES.evolution.size,
      });
    }
    // Also ensure target species that don't have their own row get a node
    for (const evo of evolution) {
      if (!evo.evolves_to_id || !evo.evolves_to_name) continue;
      if (evo.evolves_to_id === pokemon.species?.id) continue;
      const toId = `evo-${evo.evolves_to_id}`;
      if (!nodeIds.has(toId)) {
        addNode({
          id: toId,
          label: titleCase(evo.evolves_to_name),
          type: 'evolution',
          color: NODE_STYLES.evolution.color,
          emoji: NODE_STYLES.evolution.emoji,
          val: NODE_STYLES.evolution.size,
        });
      }
    }
    // Now create all evolution edges
    for (const evo of evolution) {
      if (!evo.evolves_to_id || !evo.evolves_to_name) continue;
      const fromId = evo.species_id === pokemon.species?.id
        ? pokemonId
        : `evo-${evo.species_id}`;
      const toId = evo.evolves_to_id === pokemon.species?.id
        ? pokemonId
        : `evo-${evo.evolves_to_id}`;
      addLink(fromId, toId, kidEdgeLabel('EVOLVES_INTO'));
    }
  }

  // Move nodes + edges (limit to first 15 to keep graph readable)
  const moveLimit = Math.min(moves.length, 15);
  for (let i = 0; i < moveLimit; i++) {
    const move = moves[i];
    const moveId = `move-${move.id}`;
    addNode({
      id: moveId,
      label: titleCase(move.name),
      type: 'move',
      color: getTypeColor(move.type),
      emoji: '⚔️',
      val: NODE_STYLES.move.size,
    });
    addLink(pokemonId, moveId, kidEdgeLabel('CAN_LEARN'));
  }

  if (moves.length > moveLimit) {
    // Add a summary node for remaining moves
    const summaryId = `moves-extra-${pokemon.id}`;
    addNode({
      id: summaryId,
      label: `+${moves.length - moveLimit} more`,
      type: 'move',
      color: 'rgba(245,87,108,0.5)',
      emoji: '…',
      val: 10,
    });
    addLink(pokemonId, summaryId, kidEdgeLabel('CAN_LEARN'));
  }

  return { nodes, links };
}
