import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, Typography, Box, CircularProgress, Button, Divider, Chip, TextField, InputAdornment } from '@mui/material';
import Grid from '@mui/material/Grid';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { useRouter } from 'next/router';
import Head from 'next/head';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import { ecosystemApi } from '@/lib/api';
import { useWebSocket } from '@/lib/websocket';
import { domainColors } from '@/styles/theme';
import * as d3 from 'd3';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { NextPage } from 'next';

// Define Component interface
interface Component {
  id: string;
  name: string;
  description: string;
  type: string;
  status: string;
  projectId: string;
  projectName: string;
  dependencies: string[];
  lastUpdated: string;
  documentationCount: number;
}

const ComponentsPage: NextPage = () => {
  const router = useRouter();
  const { isConnected } = useWebSocket();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [components, setComponents] = useState<Component[]>([]);
  const [filteredComponents, setFilteredComponents] = useState<Component[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [projects, setProjects] = useState<{id: string, name: string}[]>([]);
  const networkRef = useRef<HTMLDivElement>(null);

  // Fetch components data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await ecosystemApi.getOverview();
        if (data.error) {
          setError(data.message);
        } else {
          // Assuming the API returns components in the componentStats.components array
          // and projects in the projectStats.projects array
          setComponents(data.componentStats.components || []);
          setFilteredComponents(data.componentStats.components || []);
          setProjects(data.projectStats.projects?.map((p: any) => ({ id: p.id, name: p.name })) || []);
          setError(null);
        }
      } catch (err) {
        setError('Failed to fetch components data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter components based on search query and filters
  useEffect(() => {
    let result = [...components];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (component) =>
          component.name.toLowerCase().includes(query) ||
          component.description.toLowerCase().includes(query)
      );
    }

    // Apply type filter
    if (selectedType) {
      result = result.filter((component) => component.type === selectedType);
    }

    // Apply status filter
    if (selectedStatus) {
      result = result.filter((component) => component.status === selectedStatus);
    }

    // Apply project filter
    if (selectedProject) {
      result = result.filter((component) => component.projectId === selectedProject);
    }

    setFilteredComponents(result);
  }, [searchQuery, selectedType, selectedStatus, selectedProject, components]);

  // Create network visualization using D3.js
  useEffect(() => {
    if (!networkRef.current || filteredComponents.length === 0) return;

    // Clear previous visualization
    d3.select(networkRef.current).selectAll('*').remove();

    // Prepare data for network visualization
    const nodes = filteredComponents.map(component => ({
      id: component.id,
      name: component.name,
      type: component.type,
      status: component.status,
      projectId: component.projectId,
      projectName: component.projectName
    }));

    // Create links based on dependencies
    const links: {source: string, target: string}[] = [];
    filteredComponents.forEach(component => {
      if (component.dependencies && component.dependencies.length > 0) {
        component.dependencies.forEach(dependencyId => {
          // Only add link if both source and target are in the filtered components
          if (filteredComponents.some(c => c.id === dependencyId)) {
            links.push({
              source: component.id,
              target: dependencyId
            });
          }
        });
      }
    });

    // Set up the SVG container
    const width = networkRef.current.clientWidth;
    const height = 500;
    const svg = d3.select(networkRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    // Create a group for the network
    const g = svg.append('g');

    // Add zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event: any) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom as any);

    // Create the simulation
    const simulation = d3.forceSimulation(nodes as any)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(40));

    // Create the links
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter().append('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 1);

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

    // Add circles to the nodes
    node.append('circle')
      .attr('r', 20)
      .attr('fill', (d: any) => {
        // Color based on component type
        switch (d.type) {
          case 'Service':
            return '#4285f4';
          case 'Library':
            return '#34a853';
          case 'UI':
            return '#fbbc05';
          case 'API':
            return '#ea4335';
          default:
            return '#673ab7';
        }
      })
      .attr('stroke', (d: any) => {
        // Border color based on status
        switch (d.status) {
          case 'Active':
            return '#34a853';
          case 'Deprecated':
            return '#ea4335';
          case 'In Development':
            return '#fbbc05';
          default:
            return '#999';
        }
      })
      .attr('stroke-width', 2);

    // Add labels to the nodes
    node.append('text')
      .text((d: any) => d.name)
      .attr('x', 25)
      .attr('y', 4)
      .attr('font-size', '12px')
      .attr('fill', '#333');

    // Add title for tooltip
    node.append('title')
      .text((d: any) => `${d.name}\nType: ${d.type}\nStatus: ${d.status}\nProject: ${d.projectName}`);

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node
        .attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

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

    // Cleanup on unmount
    return () => {
      simulation.stop();
    };
  }, [filteredComponents]);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get unique types and statuses for filtering
  const types = Array.from(new Set(components.map((component) => component.type)));
  const statuses = Array.from(new Set(components.map((component) => component.status)));

  // Handle component click to navigate to component details
  const handleComponentClick = (componentId: string) => {
    router.push(`/ecosystem/component/${componentId}`);
  };

  // Get component type color
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Service':
        return '#4285f4';
      case 'Library':
        return '#34a853';
      case 'UI':
        return '#fbbc05';
      case 'API':
        return '#ea4335';
      default:
        return '#673ab7';
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'success';
      case 'Deprecated':
        return 'error';
      case 'In Development':
        return 'warning';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Typography variant="h6" color="error" gutterBottom>
          {error}
        </Typography>
        <Button variant="contained" onClick={() => router.reload()}>Retry</Button>
      </Box>
    );
  }

  return (
    <>
      <Head>
        <title>Components | MCP Dashboard</title>
        <meta name="description" content="AI Homelab Ecosystem Components" />
      </Head>
      
      <Box sx={{ width: '100%' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Ecosystem Components
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Explore and visualize the components that make up the AI Homelab Ecosystem. View dependencies, relationships, and documentation.
        </Typography>
        <Divider sx={{ mb: 3 }} />

        {/* Search and Filters */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            {/* @ts-ignore - Grid component type mismatch */}
            <Grid container spacing={3} alignItems="center">
              {/* @ts-ignore - Grid component type mismatch */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  placeholder="Search components..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Component Network Visualization */}
        <Card sx={{ mb: 4 }}>
          <CardHeader title="Component Relationships" />
          <CardContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Interactive visualization of components and their dependencies. Drag nodes to rearrange. Zoom with mouse wheel.
            </Typography>
            <Box 
              ref={networkRef} 
              sx={{ 
                width: '100%', 
                height: 500, 
                border: '1px solid #eee', 
                borderRadius: 1,
                overflow: 'hidden'
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
              Colors represent component types. Border colors represent status.
            </Typography>
          </CardContent>
        </Card>

        {/* Components Table */}
        <Card>
          <CardHeader title="Components List" />
          <CardContent>
            <TableContainer>
              <Table sx={{ minWidth: 650 }} aria-label="components table">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Project</TableCell>
                    <TableCell>Dependencies</TableCell>
                    <TableCell>Documentation</TableCell>
                    <TableCell>Last Updated</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredComponents.length > 0 ? (
                    filteredComponents.map((component) => (
                      <TableRow 
                        key={component.id} 
                        hover 
                        onClick={() => handleComponentClick(component.id)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>
                          <Typography variant="subtitle2">{component.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {component.description}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={component.type} 
                            size="small" 
                            sx={{ backgroundColor: getTypeColor(component.type), color: 'white' }} 
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={component.status} 
                            size="small" 
                            color={getStatusColor(component.status) as any} 
                          />
                        </TableCell>
                        <TableCell>{component.projectName}</TableCell>
                        <TableCell>{component.dependencies?.length || 0}</TableCell>
                        <TableCell>{component.documentationCount}</TableCell>
                        <TableCell>{formatDate(component.lastUpdated)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                          No components found matching your criteria
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* Components Summary */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Summary
          </Typography>
          {/* @ts-ignore - Grid component type mismatch */}
          <Grid container spacing={3}>
            {/* @ts-ignore - Grid component type mismatch */}
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    Total Components
                  </Typography>
                  <Typography variant="h4">
                    {components.length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            {/* @ts-ignore - Grid component type mismatch */}
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    Active Components
                  </Typography>
                  <Typography variant="h4">
                    {components.filter(c => c.status === 'Active').length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            {/* @ts-ignore - Grid component type mismatch */}
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    In Development
                  </Typography>
                  <Typography variant="h4">
                    {components.filter(c => c.status === 'In Development').length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            {/* @ts-ignore - Grid component type mismatch */}
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    Deprecated
                  </Typography>
                  <Typography variant="h4">
                    {components.filter(c => c.status === 'Deprecated').length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </>
  );
};

// Add getLayout property for the Next.js layout system
type PageWithLayout = NextPage & {
  getLayout?: (page: React.ReactElement) => React.ReactNode
};

(ComponentsPage as PageWithLayout).getLayout = (page: React.ReactElement) => <DashboardLayout>{page}</DashboardLayout>;

export default ComponentsPage;
