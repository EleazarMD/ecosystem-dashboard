/**
 * Document Graph 3D Visualization
 * 
 * GPU-accelerated 3D force-directed graph for PDF/document knowledge graphs.
 * Visualizes concepts, topics, chapters, entities, and their relationships.
 * 
 * Features:
 * - Interactive 3D navigation (rotate, zoom, pan)
 * - Node clustering by document/chapter
 * - Concept and entity relationship visualization
 * - Click-to-focus on topics
 * - Real-time graph updates
 * 
 * @module components/workspace/DocumentGraph3D
 */

import React, { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  ButtonGroup,
  Badge,
  Spinner,
  Center,
  useColorModeValue,
  Tooltip,
  IconButton,
  Select,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  Switch,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputLeftElement,
} from '@chakra-ui/react';
import {
  FiRefreshCw,
  FiZoomIn,
  FiZoomOut,
  FiMaximize2,
  FiBox,
  FiSliders,
  FiBook,
  FiHash,
  FiUsers,
  FiSearch,
  FiLayers,
  FiTarget,
} from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

// Dynamic import for SSR compatibility
const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), {
  ssr: false,
  loading: () => (
    <Center h="100%">
      <VStack>
        <Spinner size="xl" color="blue.500" thickness="4px" />
        <Text color="gray.400">Initializing WebGL...</Text>
      </VStack>
    </Center>
  ),
});

// Node types for document graph
type NodeType = 'document' | 'chapter' | 'concept' | 'entity' | 'topic' | 'person' | 'organization' | 'location' | 'page' | 'chunk' | 'text' | 'table' | 'section' | 'insight' | 'example' | 'definition' | 'technique';

interface GraphNode {
  id: string;
  name: string;
  type: NodeType;
  document_id?: string;
  document_name?: string;
  chapter?: string;
  page?: number;
  description?: string;
  frequency?: number;
  connections?: number;
  val?: number;
  color?: string;
  fx?: number;
  fy?: number;
  fz?: number;
  x?: number;
  y?: number;
  z?: number;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  weight?: number;
  type?: string;
  label?: string;
  color?: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  stats?: {
    total_nodes: number;
    total_links: number;
    documents?: number;
    concepts?: number;
    entities?: number;
  };
}

interface DocumentGraph3DProps {
  workspaceId?: string;
  documentId?: string;
  height?: string | number;
  onNodeSelect?: (node: GraphNode) => void;
  onGraphLoaded?: (data: GraphData) => void;
}

// Node type colors
const NODE_COLORS: Record<NodeType, string> = {
  document: '#3b82f6',    // Blue
  chapter: '#8b5cf6',     // Purple
  concept: '#10b981',     // Green
  entity: '#f59e0b',      // Amber
  topic: '#ec4899',       // Pink
  person: '#6366f1',      // Indigo
  organization: '#14b8a6', // Teal
  location: '#f97316',    // Orange
  page: '#8b5cf6',        // Purple
  chunk: '#10b981',       // Green
  text: '#06b6d4',        // Cyan
  table: '#f59e0b',       // Amber
  section: '#ec4899',     // Pink
  insight: '#fbbf24',     // Yellow
  example: '#06b6d4',     // Cyan
  definition: '#6366f1',  // Indigo
  technique: '#14b8a6',   // Teal
};

// Node type icons (for labels)
const NODE_ICONS: Record<NodeType, string> = {
  document: '📄',
  chapter: '📑',
  concept: '💡',
  entity: '🔷',
  topic: '🏷️',
  person: '👤',
  page: '📃',
  chunk: '📝',
  text: '📝',
  table: '📊',
  section: '📑',
  organization: '🏢',
  location: '📍',
  insight: '💫',
  example: '📌',
  definition: '📖',
  technique: '🔧',
};

export default function DocumentGraph3D({
  workspaceId = 'default',
  documentId,
  height = '600px',
  onNodeSelect,
  onGraphLoaded,
}: DocumentGraph3DProps) {
  const fgRef = useRef<any>(null);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [fullGraphData, setFullGraphData] = useState<GraphData>({ nodes: [], links: [] }); // Store full graph for navigation
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<NodeType | 'all'>('all');
  
  // Graph mode: semantic (concepts/topics) vs structural (pages/chunks)
  const [graphMode, setGraphMode] = useState<'semantic' | 'structural'>('semantic');
  const [detailLevel, setDetailLevel] = useState<'documents' | 'pages' | 'chunks'>('pages');
  
  // Drill-down navigation state
  const [viewStack, setViewStack] = useState<Array<{ node: GraphNode; depth: number }>>([]);
  const [currentDepth, setCurrentDepth] = useState(0);
  const [focusedNode, setFocusedNode] = useState<GraphNode | null>(null);
  
  // Visual settings
  const [showParticles, setShowParticles] = useState(true);
  const [nodeSize, setNodeSize] = useState(1);
  const [linkOpacity, setLinkOpacity] = useState(0.6);
  const [showLabels, setShowLabels] = useState(true);
  const [showLinkLabels, setShowLinkLabels] = useState(true);
  
  // Colors
  const bgColor = useSemanticToken('surface.base');
  const textColor = useSemanticToken('text.primary');
  const borderColor = useSemanticToken('border.default');

  // Fetch graph data based on mode
  const fetchGraph = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      let url: string;
      
      if (graphMode === 'semantic') {
        // Use semantic graph API for concepts, topics, insights
        url = `/api/workspace-ai/pdf/graph-semantic?workspace_id=${workspaceId}${documentId ? `&document_name=${documentId}` : ''}`;
      } else {
        // Use detailed graph API for structural exploration
        url = `/api/workspace-ai/pdf/graph-detailed?workspace_id=${workspaceId}&detail_level=${detailLevel}&max_nodes=300${documentId ? `&document_name=${documentId}` : ''}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch graph: ${response.statusText}`);
      }
      
      const data = await response.json();
      setGraphData(data);
      setFullGraphData(data); // Store full graph for drill-down navigation
      setFocusedNode(null);
      setViewStack([]);
      setCurrentDepth(0);
      onGraphLoaded?.(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load graph');
      console.error('Graph fetch error:', err);
      
      // Generate sample data for demo
      setGraphData(generateSampleData());
    } finally {
      setLoading(false);
    }
  }, [workspaceId, documentId, graphMode, detailLevel]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  // Generate sample data for demonstration
  const generateSampleData = (): GraphData => {
    const nodes: GraphNode[] = [
      // Documents
      { id: 'doc1', name: 'AI Engineering', type: 'document', val: 30, color: NODE_COLORS.document },
      
      // Chapters
      { id: 'ch1', name: 'Introduction to AI', type: 'chapter', document_id: 'doc1', val: 20, color: NODE_COLORS.chapter },
      { id: 'ch2', name: 'Machine Learning Fundamentals', type: 'chapter', document_id: 'doc1', val: 20, color: NODE_COLORS.chapter },
      { id: 'ch3', name: 'Deep Learning', type: 'chapter', document_id: 'doc1', val: 20, color: NODE_COLORS.chapter },
      { id: 'ch4', name: 'LLM Applications', type: 'chapter', document_id: 'doc1', val: 20, color: NODE_COLORS.chapter },
      
      // Concepts
      { id: 'c1', name: 'Neural Networks', type: 'concept', frequency: 45, val: 15, color: NODE_COLORS.concept },
      { id: 'c2', name: 'Transformers', type: 'concept', frequency: 38, val: 14, color: NODE_COLORS.concept },
      { id: 'c3', name: 'Attention Mechanism', type: 'concept', frequency: 32, val: 12, color: NODE_COLORS.concept },
      { id: 'c4', name: 'Fine-tuning', type: 'concept', frequency: 28, val: 11, color: NODE_COLORS.concept },
      { id: 'c5', name: 'Embeddings', type: 'concept', frequency: 35, val: 13, color: NODE_COLORS.concept },
      { id: 'c6', name: 'RAG', type: 'concept', frequency: 25, val: 10, color: NODE_COLORS.concept },
      { id: 'c7', name: 'Prompt Engineering', type: 'concept', frequency: 30, val: 12, color: NODE_COLORS.concept },
      { id: 'c8', name: 'Vector Databases', type: 'concept', frequency: 22, val: 9, color: NODE_COLORS.concept },
      
      // Topics
      { id: 't1', name: 'Model Training', type: 'topic', val: 10, color: NODE_COLORS.topic },
      { id: 't2', name: 'Inference Optimization', type: 'topic', val: 10, color: NODE_COLORS.topic },
      { id: 't3', name: 'Data Pipelines', type: 'topic', val: 10, color: NODE_COLORS.topic },
      
      // Entities (People)
      { id: 'p1', name: 'Chip Huyen', type: 'person', val: 12, color: NODE_COLORS.person },
      { id: 'p2', name: 'Andrej Karpathy', type: 'person', val: 8, color: NODE_COLORS.person },
      
      // Organizations
      { id: 'o1', name: 'OpenAI', type: 'organization', val: 10, color: NODE_COLORS.organization },
      { id: 'o2', name: 'Google', type: 'organization', val: 10, color: NODE_COLORS.organization },
      { id: 'o3', name: 'NVIDIA', type: 'organization', val: 8, color: NODE_COLORS.organization },
    ];

    const links: GraphLink[] = [
      // Document to chapters
      { source: 'doc1', target: 'ch1', type: 'contains', weight: 3 },
      { source: 'doc1', target: 'ch2', type: 'contains', weight: 3 },
      { source: 'doc1', target: 'ch3', type: 'contains', weight: 3 },
      { source: 'doc1', target: 'ch4', type: 'contains', weight: 3 },
      
      // Chapters to concepts
      { source: 'ch2', target: 'c1', type: 'discusses', weight: 2 },
      { source: 'ch3', target: 'c1', type: 'discusses', weight: 3 },
      { source: 'ch3', target: 'c2', type: 'discusses', weight: 3 },
      { source: 'ch3', target: 'c3', type: 'discusses', weight: 2 },
      { source: 'ch4', target: 'c4', type: 'discusses', weight: 2 },
      { source: 'ch4', target: 'c5', type: 'discusses', weight: 2 },
      { source: 'ch4', target: 'c6', type: 'discusses', weight: 3 },
      { source: 'ch4', target: 'c7', type: 'discusses', weight: 2 },
      { source: 'ch4', target: 'c8', type: 'discusses', weight: 2 },
      
      // Concept relationships
      { source: 'c2', target: 'c3', type: 'related', weight: 3, label: 'uses' },
      { source: 'c1', target: 'c5', type: 'related', weight: 2, label: 'produces' },
      { source: 'c6', target: 'c8', type: 'related', weight: 3, label: 'requires' },
      { source: 'c6', target: 'c5', type: 'related', weight: 2, label: 'uses' },
      { source: 'c4', target: 'c2', type: 'related', weight: 2, label: 'applied to' },
      
      // Topics to concepts
      { source: 't1', target: 'c1', type: 'includes', weight: 1 },
      { source: 't1', target: 'c4', type: 'includes', weight: 1 },
      { source: 't2', target: 'c2', type: 'includes', weight: 1 },
      { source: 't3', target: 'c6', type: 'includes', weight: 1 },
      
      // People to concepts
      { source: 'p1', target: 'c6', type: 'authored', weight: 2 },
      { source: 'p1', target: 'c7', type: 'authored', weight: 2 },
      { source: 'p2', target: 'c1', type: 'contributed', weight: 2 },
      
      // Organizations to concepts
      { source: 'o1', target: 'c2', type: 'developed', weight: 3 },
      { source: 'o1', target: 'c7', type: 'developed', weight: 2 },
      { source: 'o2', target: 'c2', type: 'developed', weight: 3 },
      { source: 'o3', target: 'c8', type: 'developed', weight: 2 },
      
      // Author connection
      { source: 'p1', target: 'doc1', type: 'authored', weight: 4 },
    ];

    return {
      nodes,
      links,
      stats: {
        total_nodes: nodes.length,
        total_links: links.length,
        documents: 1,
        concepts: 8,
        entities: 5,
      },
    };
  };

  // Filter nodes based on search and type
  const filteredData = useMemo(() => {
    let nodes = graphData.nodes;
    let links = graphData.links;

    // Filter by type
    if (filterType !== 'all') {
      nodes = nodes.filter(n => n.type === filterType);
      const nodeIds = new Set(nodes.map(n => n.id));
      links = links.filter(l => {
        const sourceId = typeof l.source === 'string' ? l.source : l.source.id;
        const targetId = typeof l.target === 'string' ? l.target : l.target.id;
        return nodeIds.has(sourceId) && nodeIds.has(targetId);
      });
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      nodes = nodes.filter(n => n.name.toLowerCase().includes(query));
      const nodeIds = new Set(nodes.map(n => n.id));
      links = links.filter(l => {
        const sourceId = typeof l.source === 'string' ? l.source : l.source.id;
        const targetId = typeof l.target === 'string' ? l.target : l.target.id;
        return nodeIds.has(sourceId) || nodeIds.has(targetId);
      });
    }

    return { nodes, links };
  }, [graphData, filterType, searchQuery]);

  // Extract sub-graph for a node (node + its immediate neighbors)
  const getSubGraph = useCallback((centerNode: GraphNode, sourceData: GraphData): GraphData => {
    const neighborIds = new Set<string>();
    neighborIds.add(centerNode.id);
    
    // Find all directly connected nodes
    sourceData.links.forEach(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      
      if (sourceId === centerNode.id) {
        neighborIds.add(targetId);
      } else if (targetId === centerNode.id) {
        neighborIds.add(sourceId);
      }
    });
    
    // Also find second-degree connections for richer sub-graphs
    const firstDegreeIds = new Set(neighborIds);
    sourceData.links.forEach(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      
      if (firstDegreeIds.has(sourceId) || firstDegreeIds.has(targetId)) {
        neighborIds.add(sourceId);
        neighborIds.add(targetId);
      }
    });
    
    // Filter nodes and links
    const subNodes = sourceData.nodes
      .filter(n => neighborIds.has(n.id))
      .map(n => ({
        ...n,
        // Make center node larger
        val: n.id === centerNode.id ? (n.val || 5) * 2 : n.val,
      }));
    
    const subLinks = sourceData.links.filter(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      return neighborIds.has(sourceId) && neighborIds.has(targetId);
    });
    
    return {
      nodes: subNodes,
      links: subLinks,
      stats: {
        total_nodes: subNodes.length,
        total_links: subLinks.length,
      },
    };
  }, []);

  // Drill down into a node's sub-graph (works recursively from full graph)
  const drillDown = useCallback((node: GraphNode) => {
    // Always extract from full graph to get complete neighborhood
    const subGraph = getSubGraph(node, fullGraphData);
    
    // Only drill down if there are connections to show
    if (subGraph.nodes.length > 1) {
      // Push current state to stack
      setViewStack(prev => [...prev, { node, depth: currentDepth + 1 }]);
      setCurrentDepth(prev => prev + 1);
      setFocusedNode(node);
      setGraphData(subGraph);
      setSelectedNode(node); // Also select the node for the tutor panel
      onNodeSelect?.(node); // Notify parent for Graph Tutor panel
      
      // Reset camera to center on new sub-graph
      setTimeout(() => {
        if (fgRef.current && typeof fgRef.current.zoomToFit === 'function') {
          fgRef.current.zoomToFit(500, 50);
        }
      }, 100);
    }
  }, [fullGraphData, currentDepth, getSubGraph, onNodeSelect]);

  // Navigate back up to parent view
  const drillUp = useCallback(() => {
    if (viewStack.length === 0) {
      // Return to full graph
      setGraphData(fullGraphData);
      setFocusedNode(null);
      setCurrentDepth(0);
    } else if (viewStack.length === 1) {
      // Return to full graph
      setViewStack([]);
      setGraphData(fullGraphData);
      setFocusedNode(null);
      setCurrentDepth(0);
    } else {
      // Go back one level
      const newStack = viewStack.slice(0, -1);
      const parentView = newStack[newStack.length - 1];
      setViewStack(newStack);
      setCurrentDepth(parentView.depth);
      setFocusedNode(parentView.node);
      
      // Regenerate sub-graph for parent
      const parentSubGraph = getSubGraph(parentView.node, fullGraphData);
      setGraphData(parentSubGraph);
    }
    
    // Reset camera
    setTimeout(() => {
      if (fgRef.current && typeof fgRef.current.zoomToFit === 'function') {
        fgRef.current.zoomToFit(500, 50);
      }
    }, 100);
  }, [viewStack, fullGraphData, getSubGraph]);

  // Node click handler - double-click to drill down
  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(node);
    onNodeSelect?.(node);
    
    // Zoom to node (with safety check for method availability)
    if (fgRef.current && typeof fgRef.current.cameraPosition === 'function') {
      const distance = 150;
      const distRatio = 1 + distance / Math.hypot(node.x || 0, node.y || 0, node.z || 0);
      
      fgRef.current.cameraPosition(
        {
          x: (node.x || 0) * distRatio,
          y: (node.y || 0) * distRatio,
          z: (node.z || 0) * distRatio,
        },
        node,
        2000
      );
    }
  }, [onNodeSelect]);

  // Double-click to drill down into node's sub-graph
  const handleNodeDoubleClick = useCallback((node: GraphNode) => {
    drillDown(node);
  }, [drillDown]);

  // Reset view - return to full graph
  const handleResetView = useCallback(() => {
    setSelectedNode(null);
    setSearchQuery('');
    setFilterType('all');
    
    // Reset drill-down state
    setGraphData(fullGraphData);
    setFocusedNode(null);
    setViewStack([]);
    setCurrentDepth(0);
    
    if (fgRef.current && typeof fgRef.current.cameraPosition === 'function') {
      fgRef.current.cameraPosition({ x: 0, y: 0, z: 500 }, { x: 0, y: 0, z: 0 }, 1000);
    }
  }, [fullGraphData]);

  // Zoom controls
  const handleZoom = useCallback((direction: 'in' | 'out') => {
    if (fgRef.current && typeof fgRef.current.cameraPosition === 'function' && typeof fgRef.current.camera === 'function') {
      const camera = fgRef.current.camera();
      const currentZ = camera.position.z;
      const newZ = direction === 'in' ? currentZ * 0.7 : currentZ * 1.4;
      fgRef.current.cameraPosition({ z: newZ }, null, 500);
    }
  }, []);

  // Node size calculation
  const nodeVal = useCallback((node: GraphNode) => {
    return Math.sqrt(node.val || 5) * nodeSize * 2;
  }, [nodeSize]);

  // Node color
  const nodeColor = useCallback((node: GraphNode) => {
    if (selectedNode?.id === node.id) return '#ffffff';
    return node.color || NODE_COLORS[node.type] || '#6366f1';
  }, [selectedNode]);

  // Link styling
  const linkColor = useCallback((link: GraphLink) => {
    return link.color || 'rgba(100, 100, 100, 0.4)';
  }, []);

  const linkWidth = useCallback((link: GraphLink) => {
    return Math.sqrt(link.weight || 1) * 0.5;
  }, []);

  // Node label (for tooltip on hover)
  const nodeLabel = useCallback((node: GraphNode) => {
    const icon = NODE_ICONS[node.type] || '•';
    return `${icon} ${node.name}`;
  }, []);

  // Link label (for tooltip on hover)
  const linkLabel = useCallback((link: GraphLink) => {
    if (!showLinkLabels) return '';
    return link.label || link.type || '';
  }, [showLinkLabels]);

  // Create 3D text sprite for node labels
  const nodeThreeObject = useCallback((node: GraphNode) => {
    if (!showLabels) return undefined;
    
    // Create canvas for text
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    
    const label = node.name.length > 20 ? node.name.slice(0, 18) + '...' : node.name;
    const fontSize = 24;
    canvas.width = 256;
    canvas.height = 64;
    
    // Draw background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.roundRect(0, 0, canvas.width, canvas.height, 8);
    ctx.fill();
    
    // Draw text
    ctx.font = `${fontSize}px Arial, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, canvas.width / 2, canvas.height / 2);
    
    // Create sprite
    const THREE = require('three');
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ 
      map: texture,
      transparent: true,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(40, 10, 1);
    sprite.position.y = 12; // Position above node
    
    // Create group with sphere and label
    const group = new THREE.Group();
    
    // Add sphere
    const sphereGeometry = new THREE.SphereGeometry(Math.sqrt(node.val || 5) * nodeSize);
    const sphereMaterial = new THREE.MeshLambertMaterial({
      color: node.color || NODE_COLORS[node.type] || '#6366f1',
      transparent: true,
      opacity: 0.9,
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    
    // Highlight selected node
    if (selectedNode?.id === node.id) {
      sphereMaterial.emissive = new THREE.Color('#ffffff');
      sphereMaterial.emissiveIntensity = 0.3;
    }
    
    group.add(sphere);
    group.add(sprite);
    
    return group;
  }, [showLabels, nodeSize, selectedNode]);

  if (error && graphData.nodes.length === 0) {
    return (
      <Center h={height} bg={bgColor} borderRadius="xl">
        <VStack spacing={4}>
          <Text color="red.400">{error}</Text>
          <Button onClick={fetchGraph} leftIcon={<FiRefreshCw />} colorScheme="blue" size="sm">
            Retry
          </Button>
        </VStack>
      </Center>
    );
  }

  // Glass effect styles
  const glassStyle = {
    bg: 'rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 'lg',
  };

  return (
    <Box position="relative" h={height} bg="#0a0a0a" borderRadius="xl" overflow="hidden">
      {/* ===== FLOATING CONTROLS - Bottom Left ===== */}
      <VStack
        position="absolute"
        bottom={4}
        left={4}
        zIndex={15}
        spacing={2}
        align="flex-start"
      >
        {/* Graph Mode Toggle */}
        <HStack
          spacing={1}
          bg="rgba(0,0,0,0.7)"
          backdropFilter="blur(12px)"
          border="1px solid rgba(255,255,255,0.1)"
          borderRadius="lg"
          p={1}
        >
          <Button
            size="xs"
            h="26px"
            px={3}
            fontSize="xs"
            color={graphMode === 'semantic' ? 'white' : 'whiteAlpha.500'}
            bg={graphMode === 'semantic' ? 'blue.500' : 'transparent'}
            onClick={() => setGraphMode('semantic')}
            _hover={{ bg: graphMode === 'semantic' ? 'blue.600' : 'whiteAlpha.100' }}
          >
            🧠 Semantic
          </Button>
          <Button
            size="xs"
            h="26px"
            px={3}
            fontSize="xs"
            color={graphMode === 'structural' ? 'white' : 'whiteAlpha.500'}
            bg={graphMode === 'structural' ? 'blue.500' : 'transparent'}
            onClick={() => setGraphMode('structural')}
            _hover={{ bg: graphMode === 'structural' ? 'blue.600' : 'whiteAlpha.100' }}
          >
            📄 Structure
          </Button>
        </HStack>

        {/* Filter & Search */}
        <HStack
          spacing={2}
          bg="rgba(0,0,0,0.7)"
          backdropFilter="blur(12px)"
          border="1px solid rgba(255,255,255,0.1)"
          borderRadius="lg"
          p={2}
        >
          <InputGroup size="xs" w="140px">
            <InputLeftElement pointerEvents="none" h="24px">
              <FiSearch color="rgba(255,255,255,0.4)" size={10} />
            </InputLeftElement>
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              bg="rgba(255,255,255,0.05)"
              border="1px solid rgba(255,255,255,0.1)"
              borderRadius="md"
              color="white"
              fontSize="xs"
              h="24px"
              pl={7}
              _placeholder={{ color: 'rgba(255,255,255,0.3)' }}
              _focus={{ borderColor: 'blue.400', boxShadow: 'none' }}
            />
          </InputGroup>
          <Select
            size="xs"
            w="100px"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as NodeType | 'all')}
            bg="rgba(255,255,255,0.05)"
            border="1px solid rgba(255,255,255,0.1)"
            borderRadius="md"
            color="white"
            fontSize="xs"
            h="24px"
            sx={{ option: { bg: '#1a1a1a', color: 'white' } }}
          >
            <option value="all">All</option>
            <option value="concept">Concepts</option>
            <option value="topic">Topics</option>
            <option value="technique">Techniques</option>
          </Select>
        </HStack>

        {/* Drill-down breadcrumb */}
        {focusedNode && (
          <HStack
            spacing={2}
            bg="rgba(59,130,246,0.2)"
            border="1px solid rgba(59,130,246,0.4)"
            borderRadius="lg"
            px={3}
            py={1.5}
          >
            <Button
              size="xs"
              variant="ghost"
              color="blue.200"
              leftIcon={<FiLayers size={10} />}
              onClick={drillUp}
              _hover={{ bg: 'rgba(59,130,246,0.3)' }}
              h="22px"
              fontSize="xs"
            >
              ← Back
            </Button>
            <Box w="1px" h="12px" bg="blue.400" opacity={0.4} />
            <Badge colorScheme="blue" fontSize="9px" variant="solid">
              {focusedNode.name.slice(0, 20)}{focusedNode.name.length > 20 ? '...' : ''}
            </Badge>
            {viewStack.length > 1 && (
              <Button
                size="xs"
                variant="ghost"
                color="blue.200"
                onClick={handleResetView}
                _hover={{ bg: 'rgba(59,130,246,0.3)' }}
                h="22px"
                fontSize="xs"
              >
                Reset
              </Button>
            )}
          </HStack>
        )}
      </VStack>

      {/* ===== FLOATING CONTROLS - Bottom Right ===== */}
      <VStack
        position="absolute"
        bottom={4}
        right={4}
        zIndex={15}
        spacing={2}
        align="flex-end"
      >
        {/* View Controls */}
        <HStack
          spacing={1}
          bg="rgba(0,0,0,0.7)"
          backdropFilter="blur(12px)"
          border="1px solid rgba(255,255,255,0.1)"
          borderRadius="lg"
          p={1}
        >
          <Tooltip label="Zoom In" fontSize="xs">
            <IconButton
              aria-label="Zoom in"
              icon={<FiZoomIn size={12} />}
              onClick={() => handleZoom('in')}
              size="xs"
              variant="ghost"
              color="whiteAlpha.700"
              _hover={{ bg: 'whiteAlpha.200', color: 'white' }}
            />
          </Tooltip>
          <Tooltip label="Zoom Out" fontSize="xs">
            <IconButton
              aria-label="Zoom out"
              icon={<FiZoomOut size={12} />}
              onClick={() => handleZoom('out')}
              size="xs"
              variant="ghost"
              color="whiteAlpha.700"
              _hover={{ bg: 'whiteAlpha.200', color: 'white' }}
            />
          </Tooltip>
          <Tooltip label="Reset View" fontSize="xs">
            <IconButton
              aria-label="Reset view"
              icon={<FiMaximize2 size={12} />}
              onClick={handleResetView}
              size="xs"
              variant="ghost"
              color="whiteAlpha.700"
              _hover={{ bg: 'whiteAlpha.200', color: 'white' }}
            />
          </Tooltip>
          <Tooltip label="Refresh" fontSize="xs">
            <IconButton
              aria-label="Refresh"
              icon={<FiRefreshCw size={12} />}
              onClick={fetchGraph}
              isLoading={loading}
              size="xs"
              variant="ghost"
              color="whiteAlpha.700"
              _hover={{ bg: 'whiteAlpha.200', color: 'white' }}
            />
          </Tooltip>
          <Box w="1px" h="14px" bg="whiteAlpha.200" />
          <Popover placement="top-end">
            <PopoverTrigger>
              <IconButton
                aria-label="Settings"
                icon={<FiSliders size={12} />}
                size="xs"
                variant="ghost"
                color="whiteAlpha.700"
                _hover={{ bg: 'whiteAlpha.200', color: 'white' }}
              />
            </PopoverTrigger>
            <PopoverContent bg="rgba(20,20,20,0.95)" backdropFilter="blur(12px)" border="1px solid rgba(255,255,255,0.15)" w="180px">
              <PopoverBody p={3}>
                <VStack spacing={2} align="stretch">
                  <FormControl display="flex" alignItems="center" justifyContent="space-between">
                    <FormLabel mb="0" fontSize="xs" color="white">Labels</FormLabel>
                    <Switch size="sm" isChecked={showLabels} onChange={(e) => setShowLabels(e.target.checked)} colorScheme="blue" />
                  </FormControl>
                  <FormControl display="flex" alignItems="center" justifyContent="space-between">
                    <FormLabel mb="0" fontSize="xs" color="white">Particles</FormLabel>
                    <Switch size="sm" isChecked={showParticles} onChange={(e) => setShowParticles(e.target.checked)} colorScheme="blue" />
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="xs" color="white" mb={1}>Size</FormLabel>
                    <Slider value={nodeSize} min={0.5} max={2} step={0.1} onChange={setNodeSize} size="sm">
                      <SliderTrack bg="whiteAlpha.100"><SliderFilledTrack bg="blue.500" /></SliderTrack>
                      <SliderThumb boxSize={2} />
                    </Slider>
                  </FormControl>
                </VStack>
              </PopoverBody>
            </PopoverContent>
          </Popover>
        </HStack>

        {/* Stats */}
        <HStack
          spacing={2}
          bg="rgba(0,0,0,0.6)"
          backdropFilter="blur(8px)"
          border="1px solid rgba(255,255,255,0.08)"
          borderRadius="md"
          px={2}
          py={1}
        >
          <HStack spacing={1}>
            <Box w={1.5} h={1.5} borderRadius="full" bg="green.400" />
            <Text fontSize="10px" color="whiteAlpha.600">{filteredData.nodes.length}</Text>
          </HStack>
          <HStack spacing={1}>
            <Box w={1.5} h={1.5} borderRadius="full" bg="blue.400" />
            <Text fontSize="10px" color="whiteAlpha.600">{filteredData.links.length}</Text>
          </HStack>
        </HStack>
      </VStack>

      {/* Interaction hint - center bottom */}
      <Text
        position="absolute"
        bottom={3}
        left="50%"
        transform="translateX(-50%)"
        fontSize="10px"
        color="whiteAlpha.300"
        zIndex={10}
        pointerEvents="none"
      >
        Click to select • Right-click to drill down • Scroll to zoom
      </Text>

      {/* 3D Graph */}
      {loading ? (
        <Center h="100%">
          <VStack>
            <Spinner size="xl" color="blue.500" thickness="4px" />
            <Text color="gray.400">Loading knowledge graph...</Text>
          </VStack>
        </Center>
      ) : (
        <ForceGraph3D
          ref={fgRef}
          graphData={filteredData}
          nodeVal={showLabels ? undefined : nodeVal}
          nodeColor={showLabels ? undefined : nodeColor}
          nodeThreeObject={showLabels ? nodeThreeObject : undefined}
          nodeThreeObjectExtend={false}
          nodeLabel={nodeLabel}
          linkColor={linkColor}
          linkWidth={linkWidth}
          linkOpacity={linkOpacity}
          linkLabel={linkLabel}
          linkDirectionalParticles={showParticles ? 2 : 0}
          linkDirectionalParticleWidth={2}
          linkDirectionalParticleSpeed={0.005}
          onNodeClick={handleNodeClick}
          onNodeRightClick={handleNodeDoubleClick}
          backgroundColor="#0a0a0a"
          showNavInfo={false}
          enableNodeDrag={true}
          enableNavigationControls={true}
          controlType="orbit"
        />
      )}
    </Box>
  );
}
