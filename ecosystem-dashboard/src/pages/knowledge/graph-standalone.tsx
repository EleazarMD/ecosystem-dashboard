/**
 * Standalone Knowledge Graph Page (Material-UI only)
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Tabs,
  Tab,
  Button,
  Chip,
  Alert,
  Paper,
  CircularProgress,
  AppBar,
  Toolbar,
  Container
} from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import muiTheme from '@/styles/muiTheme';
import { SafeGrid as Grid } from '@/components/SafeGrid';

// Use the shared application MUI theme for consistency

interface GraphData {
  nodes: Array<{
    id: string;
    label: string;
    type: string;
    properties: Record<string, any>;
  }>;
  relationships: Array<{
    id: string;
    source: string;
    target: string;
    type: string;
    properties: Record<string, any>;
  }>;
  metadata: {
    nodeCount: number;
    relationshipCount: number;
    queryTimeMs: number;
    source: string;
  };
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`knowledge-tabpanel-${index}`}
      aria-labelledby={`knowledge-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const SimpleGraphViewer: React.FC<{
  data: GraphData | null;
  loading: boolean;
  error: any;
}> = ({ data, loading, error }) => {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading Knowledge Graph...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <Alert severity="error">
          <Typography variant="body2">
            Error loading Knowledge Graph: {error?.message || 'Unknown error'}
          </Typography>
        </Alert>
      </Box>
    );
  }

  if (!data || !data.nodes || data.nodes.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <Typography color="text.secondary">
          No graph data available. Try refreshing the page.
        </Typography>
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 3, height: 500, overflow: 'auto' }}>
      <Typography variant="h6" gutterBottom>
        Knowledge Graph Visualization
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Interactive graph visualization with {data.nodes.length} nodes and {data.relationships.length} relationships.
      </Typography>
      
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        <Box sx={{ flex: '1 1 100%', minWidth: '300px' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Nodes ({data.nodes.length})
              </Typography>
              <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                {data.nodes.slice(0, 10).map((node) => (
                  <Paper
                    key={node.id}
                    sx={{
                      p: 2,
                      mb: 1,
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: 'action.hover' }
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight="bold">
                      {node.label}
                    </Typography>
                    <Chip
                      label={node.type}
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ mt: 1 }}
                    />
                    {node.properties?.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {node.properties.description}
                      </Typography>
                    )}
                  </Paper>
                ))}
                {data.nodes.length > 10 && (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
                    ... and {data.nodes.length - 10} more nodes
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Relationships ({data.relationships.length})
              </Typography>
              <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                {data.relationships.slice(0, 10).map((rel) => (
                  <Paper
                    key={rel.id}
                    sx={{
                      p: 2,
                      mb: 1,
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: 'action.hover' }
                    }}
                  >
                    <Typography variant="body2">
                      <strong>{data.nodes.find(n => n.id === rel.source)?.label || rel.source}</strong>
                      {' → '}
                      <strong>{data.nodes.find(n => n.id === rel.target)?.label || rel.target}</strong>
                    </Typography>
                    <Chip
                      label={rel.type}
                      size="small"
                      color="secondary"
                      variant="outlined"
                      sx={{ mt: 1 }}
                    />
                  </Paper>
                ))}
                {data.relationships.length > 10 && (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
                    ... and {data.relationships.length - 10} more relationships
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Paper>
  );
};

const StandaloneKnowledgeGraphPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [graphLoading, setGraphLoading] = useState(false);
  const [graphError, setGraphError] = useState<any>(null);

  const loadGraphData = async () => {
    setGraphLoading(true);
    setGraphError(null);
    
    try {
      const response = await fetch('/api/knowledge-graph/visualization?limit=20');
      if (response.ok) {
        const data = await response.json();
        setGraphData(data);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error loading graph data:', error);
      setGraphError(error);
    } finally {
      setGraphLoading(false);
    }
  };

  useEffect(() => {
    loadGraphData();
  }, []);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleRefresh = () => {
    loadGraphData();
  };

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Knowledge Graph Dashboard
            </Typography>
            <Button 
              color="inherit" 
              onClick={handleRefresh}
              disabled={graphLoading}
            >
              {graphLoading ? 'Loading...' : 'Refresh'}
            </Button>
          </Toolbar>
        </AppBar>

        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          {/* Header */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
              AI Homelab Ecosystem Knowledge Graph
            </Typography>

            <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 2 }}>
              Explore and query the AI Homelab Ecosystem's knowledge graph
            </Typography>

            {/* Error Alert */}
            {graphError && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  Knowledge Graph service may be unavailable. {graphError.message}
                </Typography>
              </Alert>
            )}

            {/* Status Indicators */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label={graphData ? `${graphData.nodes?.length || 0} nodes` : 'Loading...'}
                color="primary"
                variant="outlined"
              />
              <Chip
                label={graphData ? `${graphData.relationships?.length || 0} relationships` : 'Loading...'}
                color="secondary"
                variant="outlined"
              />
              {graphData?.metadata && (
                <Chip
                  label={`Query: ${graphData.metadata.queryTimeMs}ms`}
                  color="info"
                  variant="outlined"
                />
              )}
            </Box>
          </Box>

          {/* Tabs */}
          <Card>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={activeTab} onChange={handleTabChange} aria-label="knowledge graph tabs">
                <Tab
                  label="Graph Visualization"
                  id="knowledge-tab-0"
                  aria-controls="knowledge-tabpanel-0"
                />
                <Tab
                  label="Query Interface"
                  id="knowledge-tab-1"
                  aria-controls="knowledge-tabpanel-1"
                />
                <Tab
                  label="Advanced Search"
                  id="knowledge-tab-2"
                  aria-controls="knowledge-tabpanel-2"
                />
              </Tabs>
            </Box>

            <TabPanel value={activeTab} index={0}>
              <Box sx={{ p: 3 }}>
                <SimpleGraphViewer
                  data={graphData}
                  loading={graphLoading}
                  error={graphError}
                />
              </Box>
            </TabPanel>

            <TabPanel value={activeTab} index={1}>
              <Box sx={{ p: 3 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      AI Query Interface
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      The AI-powered query interface will be available here for natural language and Cypher queries.
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            </TabPanel>

            <TabPanel value={activeTab} index={2}>
              <Box sx={{ p: 3 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Advanced Search Features
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      Advanced search functionality including semantic search, pattern matching, and ML-powered insights.
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                      <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                        <Paper sx={{ p: 2, backgroundColor: 'grey.100' }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Semantic Search
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Search by meaning using vector embeddings
                          </Typography>
                        </Paper>
                      </Box>
                      <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                        <Paper sx={{ p: 2, backgroundColor: 'grey.100' }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Pattern Matching
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Find complex relationship patterns
                          </Typography>
                        </Paper>
                      </Box>
                      <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                        <Paper sx={{ p: 2, backgroundColor: 'grey.100' }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Temporal Queries
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Search by time ranges and history
                          </Typography>
                        </Paper>
                      </Box>
                      <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                        <Paper sx={{ p: 2, backgroundColor: 'grey.100' }}>
                          <Typography variant="subtitle2" gutterBottom>
                            ML Insights
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            AI-generated recommendations
                          </Typography>
                        </Paper>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            </TabPanel>
          </Card>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default StandaloneKnowledgeGraphPage;
