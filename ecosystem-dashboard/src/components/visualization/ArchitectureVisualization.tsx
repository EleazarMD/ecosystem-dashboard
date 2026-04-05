import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Heading,
  Text,
  Spinner,
  Alert,
  AlertIcon,
  ButtonGroup,
  Button,
  Flex,
  Tooltip,
  IconButton,
  Select,
  HStack,
} from '@chakra-ui/react';
import { ecosystemApi } from '@/lib/api';
import * as d3 from 'd3';
import { ZoomIn, ZoomOut, RefreshCw, Maximize2 } from 'react-feather';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface Component {
  id: string;
  name: string;
  type: string;
  status: string;
}

interface Relationship {
  source: string;
  target: string;
  type: string;
}

interface Architecture {
  components: Component[];
  relationships: Relationship[];
}

interface ArchitectureVisualizationProps {
  height?: number;
}

const ArchitectureVisualization: React.FC<ArchitectureVisualizationProps> = ({ height = 600 }) => {
  const [architecture, setArchitecture] = useState<Architecture | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const textColor = useSemanticToken('text.primary');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await ecosystemApi.get('/dashboard/api/architecture');
        if (response.data.success) {
          setArchitecture(response.data.data);
        } else {
          throw new Error('Failed to fetch architecture data');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch architecture data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (!architecture || !svgRef.current) return;

    // Filter components based on type if needed
    const filteredComponents = filterType === 'all' 
      ? architecture.components 
      : architecture.components.filter(c => c.type === filterType);
    
    // Filter relationships to only include filtered components
    const filteredComponentIds = new Set(filteredComponents.map(c => c.id));
    const filteredRelationships = architecture.relationships.filter(
      r => filteredComponentIds.has(r.source) && filteredComponentIds.has(r.target)
    );

    // Clear previous visualization
    d3.select(svgRef.current).selectAll('*').remove();

    // Set up the SVG dimensions
    const width = containerRef.current?.clientWidth || 800;
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    // Create a group for the graph
    const g = svg.append('g');

    // Create a zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event: any) => {
        g.attr('transform', event.transform);
      });

    // Apply zoom to the SVG
    svg.call(zoom as any);

    // Create a force simulation
    const simulation = d3.forceSimulation()
      .force('link', d3.forceLink().id((d: any) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(60));

    // Prepare the data for D3
    const nodes = filteredComponents.map(c => ({ ...c }));
    const links = filteredRelationships.map(r => ({
      ...r,
      source: r.source,
      target: r.target
    }));

    // Create the links
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter().append('line')
      .attr('stroke-width', 2)
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('marker-end', 'url(#arrow)');

    // Add arrow marker for directed links
    svg.append('defs').append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('fill', '#999')
      .attr('d', 'M0,-5L10,0L0,5');

    // Create the nodes
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter().append('g')
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended) as any);

    // Add circles for nodes
    node.append('circle')
      .attr('r', 30)
      .attr('fill', (d: any) => getNodeColor(d.type, d.status))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    // Add labels to nodes
    node.append('text')
      .attr('dy', 40)
      .attr('text-anchor', 'middle')
      .text((d: any) => d.name)
      .attr('fill', textColor)
      .attr('font-size', '10px');

    // Add tooltips
    node.append('title')
      .text((d: any) => `${d.name}\nType: ${d.type}\nStatus: ${d.status}`);

    // Update positions on simulation tick
    simulation.nodes(nodes).on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node
        .attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    simulation.force('link', d3.forceLink(links).id((d: any) => d.id).distance(100));

    // Drag functions
    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Reset zoom on component unmount
    return () => {
      simulation.stop();
    };
  }, [architecture, filterType, height, textColor]);

  const getNodeColor = (type: string, status: string) => {
    // First determine base color by type
    let baseColor;
    switch (type) {
      case 'infrastructure':
        baseColor = '#3182CE'; // blue
        break;
      case 'platform':
        baseColor = '#38A169'; // green
        break;
      case 'tool':
        baseColor = '#DD6B20'; // orange
        break;
      default:
        baseColor = '#805AD5'; // purple
    }

    // Then adjust opacity based on status
    switch (status) {
      case 'active':
        return baseColor;
      case 'in-progress':
        return d3.color(baseColor)?.brighter(0.5).toString() || baseColor;
      case 'planned':
        return d3.color(baseColor)?.brighter(1).toString() || baseColor;
      default:
        return baseColor;
    }
  };

  const handleZoomIn = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const zoomBehavior = d3.zoom().on('zoom', (event: any) => {
      svg.select('g').attr('transform', event.transform);
    });
    svg.transition().call(zoomBehavior.scaleBy, 1.2);
  };

  const handleZoomOut = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const zoomBehavior = d3.zoom().on('zoom', (event: any) => {
      svg.select('g').attr('transform', event.transform);
    });
    svg.transition().call(zoomBehavior.scaleBy, 0.8);
  };

  const handleReset = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const zoomBehavior = d3.zoom().on('zoom', (event: any) => {
      svg.select('g').attr('transform', event.transform);
    });
    svg.transition().call(zoomBehavior.transform, d3.zoomIdentity);
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const response = await ecosystemApi.get('/dashboard/api/architecture');
      if (response.data.success) {
        setArchitecture(response.data.data);
      } else {
        throw new Error('Failed to refresh architecture data');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to refresh architecture data');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !architecture) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="xl" />
        <Text mt={4}>Loading architecture visualization...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert status="error">
        <AlertIcon />
        Error loading architecture visualization: {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={4}>
        <Heading size="md">Ecosystem Architecture</Heading>
        <HStack spacing={4}>
          <Select 
            size="sm" 
            width="auto" 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">All Components</option>
            <option value="infrastructure">Infrastructure</option>
            <option value="platform">Platforms</option>
            <option value="tool">Tools</option>
          </Select>
          <ButtonGroup size="sm" isAttached variant="outline">
            <Tooltip label="Zoom In">
              <IconButton aria-label="Zoom In" icon={<ZoomIn size={16} />} onClick={handleZoomIn} />
            </Tooltip>
            <Tooltip label="Zoom Out">
              <IconButton aria-label="Zoom Out" icon={<ZoomOut size={16} />} onClick={handleZoomOut} />
            </Tooltip>
            <Tooltip label="Reset View">
              <IconButton aria-label="Reset View" icon={<Maximize2 size={16} />} onClick={handleReset} />
            </Tooltip>
            <Tooltip label="Refresh Data">
              <IconButton 
                aria-label="Refresh Data" 
                icon={<RefreshCw size={16} />} 
                onClick={handleRefresh} 
                isLoading={loading}
              />
            </Tooltip>
          </ButtonGroup>
        </HStack>
      </Flex>

      <Box 
        ref={containerRef} 
        borderWidth="1px" 
        borderRadius="lg" 
        borderColor={borderColor}
        bg={bgColor}
        overflow="hidden"
        position="relative"
        height={`${height}px`}
      >
        {loading && (
          <Flex 
            position="absolute" 
            top="0" 
            left="0" 
            right="0" 
            bottom="0" 
            bg={useSemanticToken('glass.background')} 
            zIndex="1" 
            justify="center" 
            align="center"
          >
            <Spinner size="xl" />
          </Flex>
        )}
        <svg ref={svgRef} width="100%" height={height}></svg>
      </Box>

      <Box mt={4}>
        <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
          Drag nodes to reposition. Zoom with buttons or mouse wheel. Different colors represent component types and statuses.
        </Text>
      </Box>
    </Box>
  );
};

export default ArchitectureVisualization;
