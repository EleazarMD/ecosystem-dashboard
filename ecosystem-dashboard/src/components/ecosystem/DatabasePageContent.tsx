import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Breadcrumbs,
  Link,
  Divider,
  CircularProgress,
  Chip,
  Button,
  Paper
} from '@mui/material';
import DatabaseVisualizer from '@/components/ui/DatabaseVisualizer';
import HomeIcon from '@mui/icons-material/Home';
import StorageIcon from '@mui/icons-material/Storage';
import TableChartIcon from '@mui/icons-material/TableChart';
import { useWebSocket } from '@/lib/websocket';
import { databaseApi } from '@/lib/api';

// This component contains all the content of the database page
// It's dynamically imported to prevent SSR styling issues with Material UI
const DatabasePageContent: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [databases, setDatabases] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<string | null>(null);
  const [websocketConnected, setWebsocketConnected] = useState(false);

  // Mocked database stats
  const dbStats = {
    totalDatabases: 4,
    totalTables: 16,
    totalRecords: 1250000,
    averageQueryTime: 45,
    activeConnections: 18
  };

  // Mock data for database visualization
  const mockDbVisualizerData = [
    { name: 'User Data', size: 540, connections: 12, tables: 8 },
    { name: 'Analytics', size: 1200, connections: 5, tables: 12 },
    { name: 'Configuration', size: 32, connections: 3, tables: 6 },
    { name: 'Logs', size: 850, connections: 2, tables: 4 }
  ];

  // Connect to websocket for live updates
  const { lastMessage, sendMessage, isConnected } = useWebSocket();
  
  // Set websocket connection status
  useEffect(() => {
    setWebsocketConnected(isConnected || false);
    if (isConnected) {
      // Subscribe to database events
      sendMessage(JSON.stringify({ type: 'subscribe', target: 'database_events' }), false);
    }
  }, [isConnected, sendMessage]);

  // Mock API call to get databases
  const fetchDatabases = async () => {
    setIsLoading(true);
    try {
      // In a real app, we would use the databaseApi.getDatabases() method
      // const response = await databaseApi.getDatabases();
      // setDatabases(response.data);
      
      // For now, use mock data
      setTimeout(() => {
        setDatabases(mockDbVisualizerData);
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error fetching databases:', error);
      setIsLoading(false);
    }
  };

  // Process websocket messages
  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage.data);
        console.log('WebSocket message received:', data);
        
        // Handle different types of messages
        if (data.type === 'database_update') {
          fetchDatabases();
        }
      } catch (error) {
        console.error('Error processing websocket message:', error);
      }
    }
  }, [lastMessage]);

  // Fetch initial data on component mount
  useEffect(() => {
    fetchDatabases();
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Breadcrumbs aria-label="breadcrumb">
          <Link
            color="inherit"
            href="/"
            sx={{ display: 'flex', alignItems: 'center' }}
          >
            <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            Home
          </Link>
          <Link
            color="inherit"
            href="/ecosystem"
          >
            Ecosystem
          </Link>
          <Link
            color="inherit"
            href="/ecosystem/database"
            aria-current="page"
          >
            Database
          </Link>
        </Breadcrumbs>
      </Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Database Management
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <StorageIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6" component="span">
          System Databases
        </Typography>
      </Box>
      <Typography variant="subtitle1" color="text.secondary">
        Monitor and manage ecosystem database resources
      </Typography>
      <Typography variant="body2" sx={{ mb: 3 }}>
        Real-time analytics and performance metrics for all connected database instances
      </Typography>
      <Divider sx={{ mb: 4 }} />
      <Box sx={{ mb: 4 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Typography variant="body1">Connected to {databases.length} databases with a total of {dbStats.totalTables} <Typography component="span" fontWeight="bold">tables</Typography>.</Typography>
        )}

        <Box sx={{ mb: 4 }}>
          <DatabaseVisualizer />
        </Box>

        <Box sx={{ mb: 4 }}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Database Summary
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Overall system statistics
              </Typography>
              <Typography variant="body1">
                Total Databases: <Typography component="span" fontWeight="bold">{dbStats.totalDatabases}</Typography>
              </Typography>
              <Typography variant="body1">
                Total Tables: <Typography component="span" fontWeight="bold">{dbStats.totalTables}</Typography>
              </Typography>
              <Typography variant="body1">
                Total Records: <Typography component="span" fontWeight="bold">{dbStats.totalRecords.toLocaleString()}</Typography>
              </Typography>
              <Typography variant="body1">
                Avg Query Time: <Typography component="span" fontWeight="bold">{dbStats.averageQueryTime}ms</Typography>
              </Typography>
            </CardContent>
          </Card>

          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Connection Status
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Current database connections
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">
                    Active Connections: <Typography component="span" fontWeight="bold">{dbStats.activeConnections}</Typography>
                  </Typography>
                  <Typography variant="body2">
                    Connection Pool: <Typography component="span" fontWeight="bold">25</Typography>
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">
                    Read Connections: <Typography component="span" fontWeight="bold">12</Typography>
                  </Typography>
                  <Typography variant="body2">
                    Write Connections: <Typography component="span" fontWeight="bold">6</Typography>
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">
                    Idle Connections: <Typography component="span" fontWeight="bold">3</Typography>
                  </Typography>
                  <Typography variant="body2">
                    Connection Rate: <Typography component="span" fontWeight="bold">8/min</Typography>
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">
                    Connection Time: <Typography component="span" fontWeight="bold">45ms</Typography>
                  </Typography>
                  <Typography variant="body2">
                    Connection Age: <Typography component="span" fontWeight="bold">15.2min</Typography>
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">
                    WebSocket Status: <Typography component="span" fontWeight="bold">{websocketConnected ? 'Connected' : 'Disconnected'}</Typography>
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Database Performance
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Performance metrics and optimization opportunities
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">
                    Query Performance: <Typography component="span" fontWeight="bold">Good</Typography>
                  </Typography>
                  <Typography variant="body2">
                    Index Coverage: <Typography component="span" fontWeight="bold">94%</Typography>
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">
                    Slow Queries: <Typography component="span" fontWeight="bold">3</Typography>
                  </Typography>
                  <Typography variant="body2">
                    Optimization Score: <Typography component="span" fontWeight="bold">87%</Typography>
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">
                    Cache Hit Rate: <Typography component="span" fontWeight="bold">82%</Typography>
                  </Typography>
                  <Typography variant="body2">
                    Cache Size: <Typography component="span" fontWeight="bold">128MB</Typography>
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">
                    Status: <Typography component="span" fontWeight="bold">Healthy</Typography>
                  </Typography>
                  <Chip 
                    label="All Systems Operational" 
                    color="success" 
                    size="small" 
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Administration
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Database management actions
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Button variant="contained" color="primary" size="small">
                    Run Diagnostics
                  </Button>
                  <Button variant="outlined" color="primary" size="small">
                    View Query Logs
                  </Button>
                </Box>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Button variant="contained" color="secondary" size="small">
                    Add Database
                  </Button>
                  <Button variant="outlined" color="secondary" size="small">
                    Configure Settings
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
        
        <Typography variant="h5" sx={{ mb: 2 }}>
          Database Query Interface
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Execute and visualize database queries
        </Typography>
        <Box sx={{ mb: 4 }}>
          <Paper 
            elevation={3} 
            sx={{ 
              p: 3, 
              bgcolor: 'background.paper', 
              borderRadius: 2,
              mb: 3 
            }}
          >
            {/* Query interface would go here */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <TableChartIcon sx={{ mr: 1 }} />
              <Typography variant="h6">
                Query Editor
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                (Feature coming soon)
              </Typography>
            </Box>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};

export default DatabasePageContent;
