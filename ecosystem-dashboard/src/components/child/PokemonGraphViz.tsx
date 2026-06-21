/**
 * PokemonGraphViz — Interactive force-directed graph visualization
 *
 * Uses react-force-graph-2d to show a Pokemon's knowledge graph neighborhood:
 * the Pokemon node at center, connected to its Types, Abilities, Moves,
 * Species, and Evolution chain — all with labeled edges.
 *
 * Kids can drag nodes, zoom/pan, hover to see edge labels, and click
 * nodes to see details.
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Box, VStack, HStack, Text, Spinner, Badge, Button, useDisclosure, Collapse } from '@chakra-ui/react';
import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons';
import dynamic from 'next/dynamic';
import {
  pokedexClient,
  getTypeColor,
  getTypeEmoji,
  PokemonDetail,
  PokemonMove,
  EvolutionNode,
} from '@/lib/pokedex-client';

// react-force-graph-2d must be dynamically imported (uses canvas + window)
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => (
    <VStack justify="center" h="400px">
      <Spinner color="purple.400" />
      <Text fontSize="sm" color="gray.400">Loading graph engine...</Text>
    </VStack>
  ),
});

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
  vx?: number;
  vy?: number;
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
  pokemon: PokemonDetail;
  height?: number;
}

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

// ─── Component ────────────────────────────────────────────────────────────

export function PokemonGraphViz({ pokemon, height = 450 }: PokemonGraphVizProps) {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [moves, setMoves] = useState<PokemonMove[]>([]);
  const [evolution, setEvolution] = useState<EvolutionNode[]>([]);
  const fgRef = useRef<any>(null);
  const { isOpen: showHelp, onToggle: toggleHelp } = useDisclosure({ defaultIsOpen: true });

  // Fetch neighborhood data
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

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
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [pokemon]);

  // Center on the Pokemon node after data loads
  useEffect(() => {
    if (fgRef.current && graphData.nodes.length > 0 && !loading) {
      const pokemonNode = graphData.nodes.find((n) => n.type === 'pokemon');
      if (pokemonNode) {
        setTimeout(() => {
          fgRef.current?.centerAt(0, 0, 500);
          fgRef.current?.zoom(1.5, 500);
        }, 300);
      }
    }
  }, [graphData, loading]);

  // ─── Node renderer ──────────────────────────────────────────────────────

  const nodeCanvasObject = useCallback((node: any, ctx: any, globalScale: number) => {
    const n = node as GraphNode;
    const style = NODE_STYLES[n.type] || NODE_STYLES.pokemon;
    const radius = style.size;
    const isHovered = hoveredNode?.id === n.id;
    const isSelected = selectedNode?.id === n.id;

    // Draw glow for hovered/selected
    if (isHovered || isSelected) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, radius + 6, 0, 2 * Math.PI);
      ctx.fillStyle = isSelected ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.15)';
      ctx.fill();
    }

    // Draw node circle
    ctx.beginPath();
    ctx.arc(n.x, n.y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = n.color;
    ctx.fill();

    // Draw border
    ctx.strokeStyle = isSelected ? '#a78bfa' : isHovered ? '#ffffff' : 'rgba(255,255,255,0.3)';
    ctx.lineWidth = isSelected ? 3 : isHovered ? 2 : 1;
    ctx.stroke();

    // Draw emoji inside
    ctx.font = `${Math.floor(radius * 0.9)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(n.emoji, n.x, n.y);

    // Draw label below node when zoomed in enough or hovered
    if (globalScale > 1.2 || isHovered || isSelected) {
      const fontSize = Math.max(10, 12 / globalScale);
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = isHovered || isSelected ? '#ffffff' : 'rgba(255,255,255,0.7)';
      ctx.fillText(n.label, n.x, n.y + radius + 4);
    }
  }, [hoveredNode, selectedNode]);

  // ─── Link renderer ──────────────────────────────────────────────────────

  const linkCanvasObject = useCallback((link: any, ctx: any, globalScale: number) => {
    const l = link as GraphLink;
    const source = l.source as any;
    const target = l.target as any;

    // Draw line
    ctx.beginPath();
    ctx.moveTo(source.x, source.y);
    ctx.lineTo(target.x, target.y);
    ctx.strokeStyle = l.color;
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Draw label on link when zoomed in or a connected node is hovered
    if (globalScale > 1.5) {
      const midX = (source.x + target.x) / 2;
      const midY = (source.y + target.y) / 2;
      const fontSize = Math.max(8, 9 / globalScale);
      ctx.font = `${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillText(l.label, midX, midY);
    }
  }, []);

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

  // ─── Legend ─────────────────────────────────────────────────────────────

  const legendItems = useMemo(() => [
    { label: 'Pokemon', color: NODE_STYLES.pokemon.color, emoji: NODE_STYLES.pokemon.emoji },
    { label: 'Type', color: NODE_STYLES.type.color, emoji: NODE_STYLES.type.emoji },
    { label: 'Ability', color: NODE_STYLES.ability.color, emoji: NODE_STYLES.ability.emoji },
    { label: 'Move', color: NODE_STYLES.move.color, emoji: NODE_STYLES.move.emoji },
    { label: 'Species', color: NODE_STYLES.species.color, emoji: NODE_STYLES.species.emoji },
    { label: 'Evolution', color: NODE_STYLES.evolution.color, emoji: NODE_STYLES.evolution.emoji },
  ], []);

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
      {/* Help / Legend bar */}
      <HStack justify="space-between" flexWrap="wrap" spacing={2}>
        <HStack spacing={2} flexWrap="wrap">
          {legendItems.map((item) => (
            <HStack key={item.label} spacing={1}>
              <Box
                w="12px"
                h="12px"
                borderRadius="full"
                bg={item.color}
                border="1px solid whiteAlpha.400"
              />
              <Text fontSize="xs" color="gray.400">{item.emoji} {item.label}</Text>
            </HStack>
          ))}
        </HStack>
        <Button size="xs" variant="ghost" onClick={toggleHelp} rightIcon={showHelp ? <ChevronUpIcon /> : <ChevronDownIcon />}>
          {showHelp ? 'Hide tips' : 'Show tips'}
        </Button>
      </HStack>

      <Collapse in={showHelp}>
        <Box bg="rgba(102,126,234,0.1)" borderRadius="md" p={3} border="1px solid" borderColor="rgba(102,126,234,0.3)">
          <Text fontSize="xs" color="gray.300">
            🖱️ <strong>Drag</strong> nodes to move them · <strong>Scroll</strong> to zoom · <strong>Click</strong> a node to see details · <strong>Hover</strong> to highlight
          </Text>
        </Box>
      </Collapse>

      {/* Selected node info */}
      {selectedNode && (
        <Box bg="rgba(168,85,247,0.15)" borderRadius="md" p={3} border="1px solid" borderColor="purple.400">
          <HStack spacing={2}>
            <Text fontSize="lg">{selectedNode.emoji}</Text>
            <Box>
              <Text fontWeight="semibold" fontSize="sm">{selectedNode.label}</Text>
              <Text fontSize="xs" color="purple.300" textTransform="capitalize">{selectedNode.type} node</Text>
            </Box>
          </HStack>
        </Box>
      )}

      {/* Graph canvas */}
      <Box
        borderRadius="xl"
        overflow="hidden"
        border="1px solid"
        borderColor="whiteAlpha.200"
        bg="rgba(0,0,0,0.4)"
        position="relative"
      >
        <ForceGraph2D
          ref={fgRef}
          graphData={graphData}
          nodeCanvasObject={nodeCanvasObject}
          linkCanvasObject={linkCanvasObject}
          onNodeHover={handleNodeHover}
          onNodeClick={handleNodeClick}
          onBackgroundClick={handleBackgroundClick}
          nodeRelSize={1}
          linkWidth={1.5}
          linkDirectionalArrowLength={4}
          linkDirectionalArrowRelPos={1}
          cooldownTicks={100}
          width={800}
          height={height}
          d3AlphaDecay={0.03}
          d3VelocityDecay={0.3}
          enableNodeDrag={true}
          enableZoomInteraction={true}
          enablePanInteraction={true}
          minZoom={0.5}
          maxZoom={5}
        />
      </Box>

      {/* Stats */}
      <HStack spacing={3} fontSize="xs" color="gray.400">
        <Text>{graphData.nodes.length} nodes</Text>
        <Text>·</Text>
        <Text>{graphData.links.length} edges</Text>
        <Text>·</Text>
        <Text>{moves.length} moves loaded</Text>
        {evolution.length > 0 && (
          <>
            <Text>·</Text>
            <Text>{evolution.length} evolution stages</Text>
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

  const addNode = (node: GraphNode) => {
    if (!nodeIds.has(node.id)) {
      nodeIds.add(node.id);
      nodes.push(node);
    }
  };

  const addLink = (source: string, target: string, label: string) => {
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
    sprite: pokemon.sprite_front,
    val: NODE_STYLES.pokemon.size,
  });

  // Type nodes + edges
  for (const typeName of pokemon.types) {
    const typeId = `type-${typeName}`;
    addNode({
      id: typeId,
      label: typeName,
      type: 'type',
      color: getTypeColor(typeName),
      emoji: getTypeEmoji(typeName),
      val: NODE_STYLES.type.size,
    });
    addLink(pokemonId, typeId, 'HAS_TYPE');
  }

  // Ability nodes + edges
  for (const ability of pokemon.abilities) {
    const abilityId = `ability-${ability.id}`;
    addNode({
      id: abilityId,
      label: ability.name,
      type: 'ability',
      color: NODE_STYLES.ability.color,
      emoji: NODE_STYLES.ability.emoji,
      val: NODE_STYLES.ability.size,
    });
    addLink(pokemonId, abilityId, 'HAS_ABILITY');
  }

  // Species node + edge
  if (pokemon.species) {
    const speciesId = `species-${pokemon.species.id}`;
    addNode({
      id: speciesId,
      label: pokemon.species.name,
      type: 'species',
      color: NODE_STYLES.species.color,
      emoji: NODE_STYLES.species.emoji,
      val: NODE_STYLES.species.size,
    });
    addLink(pokemonId, speciesId, 'BELONGS_TO');

    // Evolution chain nodes + edges
    for (const evo of evolution) {
      const evoNodeId = `evo-${evo.species_id}`;
      if (evo.species_id !== pokemon.species?.id) {
        addNode({
          id: evoNodeId,
          label: evo.species_name,
          type: 'evolution',
          color: NODE_STYLES.evolution.color,
          emoji: NODE_STYLES.evolution.emoji,
          sprite: evo.sprite_front || undefined,
          val: NODE_STYLES.evolution.size,
        });
      }
      // Add evolution edges
      if (evo.evolves_to_id && evo.evolves_to_name) {
        const fromId = `evo-${evo.species_id}`;
        const toId = `evo-${evo.evolves_to_id}`;
        // Ensure both nodes exist
        if (!nodeIds.has(fromId)) {
          addNode({
            id: fromId,
            label: evo.species_name,
            type: 'evolution',
            color: NODE_STYLES.evolution.color,
            emoji: NODE_STYLES.evolution.emoji,
            sprite: evo.sprite_front || undefined,
            val: NODE_STYLES.evolution.size,
          });
        }
        if (!nodeIds.has(toId)) {
          addNode({
            id: toId,
            label: evo.evolves_to_name,
            type: 'evolution',
            color: NODE_STYLES.evolution.color,
            emoji: NODE_STYLES.evolution.emoji,
            val: NODE_STYLES.evolution.size,
          });
        }
        addLink(fromId, toId, 'EVOLVES_INTO');
      }
    }
  }

  // Move nodes + edges (limit to first 15 to keep graph readable)
  const moveLimit = Math.min(moves.length, 15);
  for (let i = 0; i < moveLimit; i++) {
    const move = moves[i];
    const moveId = `move-${move.id}`;
    addNode({
      id: moveId,
      label: move.name,
      type: 'move',
      color: getTypeColor(move.type),
      emoji: '⚔️',
      val: NODE_STYLES.move.size,
    });
    addLink(pokemonId, moveId, 'CAN_LEARN');
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
    addLink(pokemonId, summaryId, 'CAN_LEARN');
  }

  return { nodes, links };
}
