/**
 * Client-side only content for the Simplified Knowledge Graph Dashboard Page
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
  Paper
} from '@mui/material';

import KnowledgeQueryInterface from './KnowledgeQueryInterface';

// Simple Graph Viewer component
const SimpleGraphViewer: React.FC<{ data?: any; loading?: boolean; error?: any }> = ({ 
  data, 
  loading = false, 
  error = null 
}) => {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <Typography>Loading Knowledge Graph...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <Alert severity="error">
          <Typography variant="body2">
            Error loading Knowledge Graph: {error.message || 'Unknown error'}
          </Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 3, height: 500, overflow: 'auto' }}>
      <Typography variant="h6" gutterBottom>
        Knowledge Graph Visualization
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Graph visualization will be displayed here.
      </Typography>
      
      {data ? (
        <Box>
          <Typography variant="body1">
            Nodes: {data.nodes?.length || 0}
          </Typography>
          <Typography variant="body1">
            Relationships: {data.relationships?.length || 0}
          </Typography>
        </Box>
      ) : (
        <Typography>No data available</Typography>
      )}
    </Paper>
  );
};

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

const GraphSimpleContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [graphData, setGraphData] = useState<any>(null);
  const [graphLoading, setGraphLoading] = useState(false);
  const [graphError, setGraphError] = useState<any>(null);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleRefresh = async () => {
    setGraphLoading(true);
    try {
      const response = await fetch('/api/knowledge-graph/visualization?limit=10');
      if (response.ok) {
        const data = await response.json();
        setGraphData(data);
        setGraphError(null);
      } else {
        setGraphError({ message: 'Failed to load graph data' });
      }
    } catch (error) {
      setGraphError(error);
    } finally {
      setGraphLoading(false);
    }
  };

  // Load initial data
  useEffect(() => {
    handleRefresh();
  }, []);

  const handleQueryExecute = async (query: string, queryType: 'natural' | 'cypher'): Promise<any[]> => {
    console.log(`Executing ${queryType} query:`, query);
    // Here we would normally make an actual API call to execute the query
    // For now, we'll just return a mock response to satisfy the type requirement
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Return mock data
      return [
        { id: 'mock-1', type: 'node', label: 'Mock Result 1', properties: { name: 'Sample 1' } },
        { id: 'mock-2', type: 'node', label: 'Mock Result 2', properties: { name: 'Sample 2' } }
      ];
    } catch (error) {
      console.error('Error executing query:', error);
      return [];
    }
  };

  const handleVisualize = (data: any) => {
    console.log('Visualizing data:', data);
    setGraphData(data);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h4" component="h1" fontWeight="bold">
              Knowledge Graph Dashboard
            </Typography>
          </Box>
          <Button
            variant="outlined"
            onClick={handleRefresh}
            disabled={graphLoading}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Knowledge Graph Control Section */}
      <Card sx={{ mb: 4, bgcolor: '#f0fff4', border: '2px solid #68d391' }}>
        <CardContent>
          <Typography variant="h6" component="h2" sx={{ color: '#2f855a', mb: 2, fontWeight: 'bold' }}>
            🧠 Knowledge Graph Control
          </Typography>
          
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>System Offline</strong><br/>
              Knowledge Graph system is not running. Click to start all 12 services.
            </Typography>
          </Alert>
          
          <Button 
            variant="contained"
            color="success"
            size="large"
            fullWidth
            sx={{ 
              height: 60,
              fontSize: '18px',
              fontWeight: 'bold',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 4
              },
              transition: 'all 0.2s'
            }}
            onClick={() => alert('🚀 Starting Knowledge Graph System!\n\nThis would start:\n• Neo4j Database (Port 7474)\n• Knowledge Graph API (Port 8765)\n• IDE Memory Backend (Port 9579)\n• Memory Watcher (Port 9578)\n• AI Gateway (Port 8777)\n• 7 AI Agents (Ports 41240-41246)')}
          >
            🚀 Start Knowledge Graph System
          </Button>
        </CardContent>
      </Card>

      {/* Status Indicators */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 4 }}>
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
              label="AI Query Interface"
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
            <KnowledgeQueryInterface
              onQueryExecute={handleQueryExecute}
              onVisualize={handleVisualize}
            />
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
                  Advanced search functionality will be implemented here.
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </TabPanel>
      </Card>
    </Box>
  );
};

export default GraphSimpleContent;
