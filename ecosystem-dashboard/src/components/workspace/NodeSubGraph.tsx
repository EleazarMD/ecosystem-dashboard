/**
 * Node Sub-Graph Component
 * Renders a mini force-directed graph showing the selected node and its connections
 */

import React, { useRef, useEffect, useMemo } from 'react';
import { Box, Text, VStack, HStack, Badge } from '@chakra-ui/react';
import dynamic from 'next/dynamic';
import { useSemanticToken } from '@/hooks/useSemanticToken';

// Dynamically import ForceGraph2D to avoid SSR issues
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

interface SubGraphNode {
  id: string;
  name: string;
  type: string;
  val?: number;
  color?: string;
  isCenter?: boolean;
}

interface SubGraphLink {
  source: string;
  target: string;
  label?: string;
}

interface NodeSubGraphProps {
  centerNode: {
    id: string;
    name: string;
    type: string;
  };
  connectedNodes: Array<{
    id?: string;
    name: string;
    type: string;
    relationLabel?: string;
  }>;
  height?: number;
  onNodeClick?: (node: SubGraphNode) => void;
}

// Node colors by type
const NODE_COLORS: Record<string, string> = {
  document: '#3b82f6',
  topic: '#ec4899',
  concept: '#10b981',
  technique: '#14b8a6',
  insight: '#fbbf24',
  chapter: '#8b5cf6',
  entity: '#f59e0b',
};

export default function NodeSubGraph({
  centerNode,
  connectedNodes,
  height = 200,
  onNodeClick,
}: NodeSubGraphProps) {
  const fgRef = useRef<any>(null);
  const bgColor = useSemanticToken('surface.elevated');
  const textColor = useSemanticToken('text.primary');

  // Build sub-graph data
  const graphData = useMemo(() => {
    const nodes: SubGraphNode[] = [
      {
        id: centerNode.id,
        name: centerNode.name,
        type: centerNode.type,
        val: 20, // Larger center node
        color: NODE_COLORS[centerNode.type] || '#6b7280',
        isCenter: true,
      },
    ];

    const links: SubGraphLink[] = [];
    const seenIds = new Set([centerNode.id]);

    connectedNodes.forEach((conn, idx) => {
      const nodeId = conn.id || `conn-${idx}`;
      if (!seenIds.has(nodeId)) {
        seenIds.add(nodeId);
        nodes.push({
          id: nodeId,
          name: conn.name,
          type: conn.type,
          val: 10,
          color: NODE_COLORS[conn.type] || '#6b7280',
        });
        links.push({
          source: centerNode.id,
          target: nodeId,
          label: conn.relationLabel,
        });
      }
    });

    return { nodes, links };
  }, [centerNode, connectedNodes]);

  // Center the graph on mount
  useEffect(() => {
    if (fgRef.current) {
      setTimeout(() => {
        fgRef.current?.zoomToFit(400, 20);
      }, 500);
    }
  }, [graphData]);

  if (connectedNodes.length === 0) {
    return (
      <Box
        h={height}
        bg={bgColor}
        borderRadius="md"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Text fontSize="sm" color="gray.500">
          No connections to visualize
        </Text>
      </Box>
    );
  }

  return (
    <Box
      h={height}
      bg={bgColor}
      borderRadius="md"
      overflow="hidden"
      position="relative"
    >
      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        width={280}
        height={height}
        backgroundColor="transparent"
        nodeRelSize={4}
        nodeVal={(node: any) => node.val || 10}
        nodeColor={(node: any) => node.color || '#6b7280'}
        nodeLabel={(node: any) => `${node.name} (${node.type})`}
        linkColor={() => 'rgba(156, 163, 175, 0.4)'}
        linkWidth={1.5}
        linkDirectionalParticles={2}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleSpeed={0.005}
        onNodeClick={(node: any) => onNodeClick?.(node)}
        nodeCanvasObject={(node: any, ctx, globalScale) => {
          const label = node.name.length > 12 ? node.name.slice(0, 12) + '...' : node.name;
          const fontSize = node.isCenter ? 10 / globalScale : 8 / globalScale;
          
          // Draw node circle
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.val / 2, 0, 2 * Math.PI);
          ctx.fillStyle = node.color;
          ctx.fill();
          
          // Draw border for center node
          if (node.isCenter) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2 / globalScale;
            ctx.stroke();
          }
          
          // Draw label
          ctx.font = `${fontSize}px Sans-Serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillStyle = '#e5e7eb';
          ctx.fillText(label, node.x, node.y + node.val / 2 + 2);
        }}
        cooldownTicks={50}
        d3AlphaDecay={0.05}
        d3VelocityDecay={0.3}
      />
      
      {/* Legend */}
      <HStack
        position="absolute"
        bottom={1}
        left={1}
        spacing={1}
        bg="blackAlpha.600"
        px={2}
        py={1}
        borderRadius="sm"
      >
        <Badge size="xs" colorScheme="gray" fontSize="9px">
          {graphData.nodes.length} nodes
        </Badge>
        <Badge size="xs" colorScheme="gray" fontSize="9px">
          {graphData.links.length} links
        </Badge>
      </HStack>
    </Box>
  );
}
