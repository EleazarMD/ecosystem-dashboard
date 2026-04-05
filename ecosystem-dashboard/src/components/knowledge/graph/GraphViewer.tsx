/**
 * Knowledge Graph Visualization Component
 * 
 * This component renders a visualization of the Knowledge Graph using D3.js force-directed graph.
 * It fetches data from the Knowledge Graph service via the AI Gateway and provides interactive
 * features such as zooming, panning, and node selection.
 */

import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import * as d3 from 'd3';
import { Box, Spinner, Text, Flex } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import { useGraphData } from '../../../hooks/useGraphData';
import { GraphControls } from './GraphControls';
import { GraphLegend } from './GraphLegend';

// Add global declaration for window.graphData
declare global {
  interface Window {
    graphData?: {
      nodes: Node[];
      relationships: any[];
    };
  }
}

interface Node {
  id: string;
  label: string;
  type: string;
  properties: {
    doc_id?: string;
    title?: string;
    description?: string;
    status?: string;
    version?: string;
    created_date?: string;
    last_updated_date?: string;
    [key: string]: any;
  };
}

interface Link {
  id: string;
  source: string;
  target: string;
  type: string;
  properties: {
    [key: string]: any;
  };
}

interface GraphViewerProps {
  focusEntity?: string;
  depth?: number;
  limit?: number;
  relationTypes?: string[];
  onNodeSelect?: (node: Node) => void;
  height?: number | string;
  width?: number | string;
}

export interface GraphViewerRef {
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  getGraphData: () => { nodes: Node[], relationships: any[] } | null;
}

export const GraphViewer = forwardRef<GraphViewerRef, GraphViewerProps>((props, ref) => {
  const {
    focusEntity,
    depth = 2,
    limit = 100,
    relationTypes = [],
    onNodeSelect,
    height = '70vh',
    width = '100%'
  } = props;
  
  // Static color values for graph visualization
  const primaryColor = '#3182CE'; // blue.500
  const secondaryColor = '#805AD5'; // purple.500
  const successColor = '#38A169'; // green.500
  const infoColor = '#00B5D8'; // cyan.500
  const warningColor = '#DD6B20'; // orange.500
  const grayColor = '#718096'; // gray.500
  const textColor = '#1A202C'; // gray.800
  const textSecondaryColor = '#4A5568'; // gray.600
  const bgPaperColor = '#FFFFFF'; // white
  const dividerColor = '#E2E8F0'; // gray.200
  
  const svgRef = useRef<SVGSVGElement>(null);
  const { data, loading, error } = useGraphData({ 
    focusEntity, 
    depth, 
    limit, 
    relationTypes 
  });
  
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [zoomInstance, setZoomInstance] = useState<any>(null);
  
  // Expose methods to parent components through ref
  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      if (svgRef.current && zoomInstance) {
        const currentTransform = d3.zoomTransform(svgRef.current);
        d3.select(svgRef.current)
          .transition()
          .duration(300)
          .call(zoomInstance.transform, currentTransform.scale(currentTransform.k * 1.3));
      }
    },
    zoomOut: () => {
      if (svgRef.current && zoomInstance) {
        const currentTransform = d3.zoomTransform(svgRef.current);
        d3.select(svgRef.current)
          .transition()
          .duration(300)
          .call(zoomInstance.transform, currentTransform.scale(currentTransform.k / 1.3));
      }
    },
    resetView: () => {
      if (svgRef.current && zoomInstance) {
        d3.select(svgRef.current)
          .transition()
          .duration(500)
          .call(zoomInstance.transform, d3.zoomIdentity);
      }
    },
    getGraphData: () => data
  }));
  
  // Define node colors based on type
  const nodeColors: Record<string, string> = {
    Document: primaryColor,
    Domain: secondaryColor,
    Tag: successColor,
    Entity: infoColor,
    Author: warningColor,
    default: grayColor
  };
  
  // Handle node selection
  const handleNodeClick = useCallback((node: Node) => {
    setSelectedNode(node);
    if (onNodeSelect) {
      onNodeSelect(node);
    }
  }, [onNodeSelect]);
  
  // Create and update the graph visualization
  useEffect(() => {
    if (!svgRef.current || !data || loading) return;
    
    const svg = d3.select(svgRef.current);
    const svgWidth = svgRef.current.clientWidth;
    const svgHeight = svgRef.current.clientHeight;
    
    // Clear previous graph
    svg.selectAll('*').remove();
    
    // Create the graph container with zoom support
    const g = svg.append('g');
    
    // Add zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    
    svg.call(zoom);
    setZoomInstance(zoom);
    
    // Reset zoom to fit the graph
    svg.call(zoom.transform, d3.zoomIdentity);
    
    // Create the simulation
    const simulation = d3.forceSimulation()
      .force('link', d3.forceLink()
        .id((d: any) => d.id)
        .distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(svgWidth / 2, svgHeight / 2))
      .force('x', d3.forceX(svgWidth / 2).strength(0.1))
      .force('y', d3.forceY(svgHeight / 2).strength(0.1));
    
    // Prepare the data with safety checks
    const nodes = Array.isArray(data.nodes) ? data.nodes.map(node => ({ ...node })) : [];
    
    // Ensure we only include links where both source and target nodes exist
    const nodeIds = new Set(nodes.map(node => node.id));
    const links = Array.isArray(data.relationships) 
      ? data.relationships
          .filter(link => {
            // Filter out links with missing source or target
            const sourceExists = typeof link.source === 'string' && nodeIds.has(link.source);
            const targetExists = typeof link.target === 'string' && nodeIds.has(link.target);
            return sourceExists && targetExists;
          })
          .map(link => ({ 
            ...link,
            source: link.source,
            target: link.target
          }))
      : [];
    
    // Create links
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', grayColor)
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.6);
    
    // Create link labels
    const linkLabel = g.append('g')
      .attr('class', 'link-labels')
      .selectAll('text')
      .data(links)
      .enter()
      .append('text')
      .text(d => d.type)
      .attr('font-size', '8px')
      .attr('fill', textSecondaryColor)
      .attr('text-anchor', 'middle')
      .attr('dy', -5);
    
    // Create nodes
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('circle')
      .data(nodes)
      .enter()
      .append('circle')
      .attr('r', d => d.id === focusEntity ? 10 : 6)
      .attr('fill', d => nodeColors[d.type] || nodeColors.default)
      .attr('stroke', bgPaperColor)
      .attr('stroke-width', 1.5)
      .on('click', (event, d) => handleNodeClick(d))
      .call(d3.drag()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }) as any);
    
    // Add tooltips
    node.append('title')
      .text(d => d.label || d.id);
    
    // Create node labels
    const nodeLabel = g.append('g')
      .attr('class', 'node-labels')
      .selectAll('text')
      .data(nodes)
      .enter()
      .append('text')
      .text(d => d.label || d.id)
      .attr('font-size', '10px')
      .attr('fill', textColor)
      .attr('text-anchor', 'middle')
      .attr('dy', 15);
    
    // Update positions on simulation tick with safety checks
    try {
      simulation.nodes(nodes).on('tick', () => {
        // Safe accessor functions with null checks
        const getX = (d: any) => (d && typeof d.x === 'number') ? d.x : 0;
        const getY = (d: any) => (d && typeof d.y === 'number') ? d.y : 0;
        
        link
          .attr('x1', (d: any) => getX(d.source))
          .attr('y1', (d: any) => getY(d.source))
          .attr('x2', (d: any) => getX(d.target))
          .attr('y2', (d: any) => getY(d.target));
        
        node
          .attr('cx', getX)
          .attr('cy', getY);
        
        nodeLabel
          .attr('x', getX)
          .attr('y', getY);
        
        linkLabel
          .attr('x', (d: any) => {
            return (getX(d.source) + getX(d.target)) / 2;
          })
          .attr('y', (d: any) => {
            return (getY(d.source) + getY(d.target)) / 2;
          });
      });
    } catch (error) {
      console.warn('Error in simulation tick handler:', error);
    }
    
    // Set the links in the simulation with safety check
    try {
      const linkForce = simulation.force('link');
      if (linkForce && links.length > 0) {
        (linkForce as any).links(links);
      }
    } catch (error) {
      console.warn('Error setting links in force simulation:', error);
    }
    
    // If there's a focus entity, highlight it
    if (focusEntity) {
      node.filter(d => d.id === focusEntity)
        .attr('stroke', warningColor)
        .attr('stroke-width', 3);
    }
    
    // Cleanup function
    return () => {
      simulation.stop();
    };
  }, [data, loading, focusEntity, primaryColor, secondaryColor, successColor, infoColor, warningColor, grayColor, textColor, textSecondaryColor, bgPaperColor, handleNodeClick]);
  
  if (loading) {
    return (
      <Flex justifyContent="center" alignItems="center" height={height} width={width}>
        <Spinner size="xl" />
      </Flex>
    );
  }
  
  if (error) {
    return (
      <Flex justifyContent="center" alignItems="center" height={height} width={width}>
        <Text color="red.500">
          Error loading Knowledge Graph: {error.message}
        </Text>
      </Flex>
    );
  }
  
  if (!data || data.nodes.length === 0) {
    return (
      <Flex justifyContent="center" alignItems="center" height={height} width={width}>
        <Text>
          No data available. Try adjusting your search parameters.
        </Text>
      </Flex>
    );
  }
  
  // Store graph data in window for search functionality
  useEffect(() => {
    if (data) {
      window.graphData = data;
    }
    return () => {
      delete window.graphData;
    };
  }, [data]);
  
  return (
    <Box position="relative" height={height} width={width} borderWidth="1px" borderColor={dividerColor} borderRadius="md">
      <svg ref={svgRef} width="100%" height="100%" />
      <Box position="absolute" top="16px" right="16px">
        <GraphLegend nodeColors={nodeColors} />
      </Box>
    </Box>
  );
});
