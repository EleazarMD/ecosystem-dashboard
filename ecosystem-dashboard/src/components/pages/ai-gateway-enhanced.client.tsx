/**
 * Enhanced AI Gateway Infrastructure Dashboard
 * 
 * Real-time monitoring of upstream/downstream connections and API services
 * Features: Provider monitoring, client connections, interface health, live metrics
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Grid,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Tooltip,
  IconButton,
  Badge,
  Divider
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Cable as CableIcon,
  Speed as SpeedIcon,
  NetworkCheck as NetworkIcon,
  Api as ApiIcon,
  Timeline as TimelineIcon,
  Groups as GroupsIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { useAIGatewayClient } from '@/lib/ai-gateway-client-provider';
import DashboardLayout from '@/components/layout/DashboardLayout';

// Types for monitoring data
interface ProviderStatus {
  id: string;
  name: string;
  status: 'healthy' | 'degraded' | 'error' | 'offline';
  latency: number;
  requests_per_minute: number;
  error_rate: number;
  last_request: string;
  quota_used?: number;
  quota_limit?: number;
}

interface ClientConnection {
  id: string;
  client_id: string;
  ip_address: string;
  connected_at: string;
  requests_count: number;
  last_activity: string;
  user_agent?: string;
  auth_method: string;
}

interface InterfaceMetrics {
  endpoint: string;
  protocol: string;
  active_connections: number;
  requests_per_second: number;
  avg_response_time: number;
  error_rate: number;
  status: 'healthy' | 'degraded' | 'error';
}

interface LiveMetrics {
  total_requests: number;
  requests_per_second: number;
  active_connections: number;
  avg_latency: number;
  error_rate: number;
  uptime: number;
}

// API data fetchers
const fetchProviderData = async (): Promise<ProviderStatus[]> => {
  try {
    const response = await fetch('/api/ai-gateway/metrics/providers');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return data.providers || [];
  } catch (error) {
    console.error('Failed to fetch provider data:', error);
    return [];
  }
};

const fetchClientData = async (): Promise<ClientConnection[]> => {
  try {
    const response = await fetch('/api/ai-gateway/metrics/connections');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return data.connections || [];
  } catch (error) {
    console.error('Failed to fetch client data:', error);
    return [];
  }
};

const fetchInterfaceData = async (): Promise<InterfaceMetrics[]> => {
  try {
    const response = await fetch('/api/ai-gateway/metrics/interfaces');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return data.interfaces || [];
  } catch (error) {
    console.error('Failed to fetch interface data:', error);
    return [];
  }
};

const fetchLiveMetrics = async (): Promise<LiveMetrics | null> => {
  try {
    const response = await fetch('/api/ai-gateway/metrics/live');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return {
      total_requests: data.total_requests,
      requests_per_second: data.requests_per_second,
      active_connections: data.active_connections,
      avg_latency: data.avg_latency,
      error_rate: data.error_rate,
      uptime: data.derived?.health_score || 0
    };
  } catch (error) {
    console.error('Failed to fetch live metrics:', error);
    return null;
  }
};

// Status color helpers
const getStatusColor = (status: string) => {
  switch (status) {
    case 'healthy': return 'success';
    case 'degraded': return 'warning';
    case 'error': return 'error';
    case 'offline': return 'error';
    default: return 'default';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'healthy': return <CheckIcon />;
    case 'degraded': return <WarningIcon />;
    case 'error': return <ErrorIcon />;
    case 'offline': return <ErrorIcon />;
    default: return <CheckIcon />;
  }
};

// Main component
export default function EnhancedAIGatewayDashboard() {
  const { isConnected, healthStatus, models, error, checkHealth, loadModels } = useAIGatewayClient();
  
  // State
  const [tabValue, setTabValue] = useState(0);
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [clients, setClients] = useState<ClientConnection[]>([]);
  const [interfaces, setInterfaces] = useState<InterfaceMetrics[]>([]);
  const [liveMetrics, setLiveMetrics] = useState<LiveMetrics | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Data loading
  const loadAllData = useCallback(async () => {
    setRefreshing(true);
    try {
      // Load real data from AI Gateway APIs
      await checkHealth();
      await loadModels();
      
      // Load metrics data from APIs
      const [providersData, clientsData, interfacesData, metricsData] = await Promise.all([
        fetchProviderData(),
        fetchClientData(),
        fetchInterfaceData(),
        fetchLiveMetrics()
      ]);
      
      setProviders(providersData);
      setClients(clientsData);
      setInterfaces(interfacesData);
      setLiveMetrics(metricsData);
      
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setRefreshing(false);
    }
  }, [checkHealth, loadModels]);

  // Auto-refresh effect
  useEffect(() => {
    loadAllData();
    
    if (autoRefresh) {
      const interval = setInterval(loadAllData, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [loadAllData, autoRefresh]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleRefresh = () => {
    loadAllData();
  };

  const handleAutoRefreshToggle = () => {
    setAutoRefresh(!autoRefresh);
  };

  // Render functions
  const renderOverviewCards = () => (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={2.4}>
        <Card sx={{ bgcolor: 'primary.50' }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h4" color="primary.main">
              {liveMetrics?.active_connections || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Active Connections
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={2.4}>
        <Card sx={{ bgcolor: 'success.50' }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h4" color="success.main">
              {liveMetrics?.requests_per_second.toFixed(1) || '0.0'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Requests/sec
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={2.4}>
        <Card sx={{ bgcolor: 'info.50' }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h4" color="info.main">
              {liveMetrics?.avg_latency || 0}ms
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Avg Latency
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={2.4}>
        <Card sx={{ bgcolor: liveMetrics?.error_rate && liveMetrics.error_rate > 0.05 ? 'error.50' : 'success.50' }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h4" color={liveMetrics?.error_rate && liveMetrics.error_rate > 0.05 ? 'error.main' : 'success.main'}>
              {((liveMetrics?.error_rate || 0) * 100).toFixed(1)}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Error Rate
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={2.4}>
        <Card sx={{ bgcolor: 'warning.50' }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h4" color="warning.main">
              {liveMetrics?.uptime.toFixed(1) || '0.0'}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Uptime
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderProvidersTab = () => (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CableIcon /> Upstream AI Providers
      </Typography>
      <TableContainer component={Paper} elevation={0} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Provider</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Latency</TableCell>
              <TableCell align="right">Req/min</TableCell>
              <TableCell align="right">Error Rate</TableCell>
              <TableCell align="right">Quota</TableCell>
              <TableCell>Last Request</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {providers.map((provider) => (
              <TableRow key={provider.id}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getStatusIcon(provider.status)}
                    <Typography variant="body2" fontWeight="medium">
                      {provider.name}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={provider.status} 
                    color={getStatusColor(provider.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color={provider.latency > 1000 ? 'error.main' : 'text.primary'}>
                    {provider.latency}ms
                  </Typography>
                </TableCell>
                <TableCell align="right">{provider.requests_per_minute}</TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color={provider.error_rate > 0.1 ? 'error.main' : 'text.primary'}>
                    {(provider.error_rate * 100).toFixed(1)}%
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  {provider.quota_used && provider.quota_limit ? (
                    <Box>
                      <Typography variant="body2">
                        {provider.quota_used}/{provider.quota_limit}
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={(provider.quota_used / provider.quota_limit) * 100}
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">N/A</Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {provider.last_request}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderClientsTab = () => (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <GroupsIcon /> Downstream Client Connections
      </Typography>
      <TableContainer component={Paper} elevation={0} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Client ID</TableCell>
              <TableCell>IP Address</TableCell>
              <TableCell>Connected</TableCell>
              <TableCell align="right">Requests</TableCell>
              <TableCell>Last Activity</TableCell>
              <TableCell>Auth Method</TableCell>
              <TableCell>User Agent</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.id}>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {client.client_id}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace">
                    {client.ip_address}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {client.connected_at}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Badge badgeContent={client.requests_count} color="primary">
                    <ApiIcon fontSize="small" />
                  </Badge>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {client.last_activity}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={client.auth_method} 
                    size="small"
                    color={client.auth_method === 'API Key' ? 'primary' : 'secondary'}
                  />
                </TableCell>
                <TableCell>
                  <Tooltip title={client.user_agent || 'Unknown'}>
                    <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
                      {client.user_agent || 'Unknown'}
                    </Typography>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderInterfacesTab = () => (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <NetworkIcon /> API Interfaces & Protocols
      </Typography>
      <Grid container spacing={2}>
        {interfaces.map((interface_item) => (
          <Grid item xs={12} md={6} key={interface_item.endpoint}>
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight="medium">
                    {interface_item.endpoint}
                  </Typography>
                  <Chip 
                    label={interface_item.status} 
                    color={getStatusColor(interface_item.status) as any}
                    size="small"
                  />
                </Box>
                
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Protocol</Typography>
                    <Typography variant="body1">{interface_item.protocol}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Active Connections</Typography>
                    <Typography variant="body1">{interface_item.active_connections}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Requests/sec</Typography>
                    <Typography variant="body1">{interface_item.requests_per_second.toFixed(1)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Avg Response</Typography>
                    <Typography variant="body1">{interface_item.avg_response_time}ms</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">Error Rate</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={interface_item.error_rate * 100}
                        color={interface_item.error_rate > 0.05 ? 'error' : 'success'}
                        sx={{ flexGrow: 1 }}
                      />
                      <Typography variant="body2">
                        {(interface_item.error_rate * 100).toFixed(1)}%
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  const renderMetricsTab = () => (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TimelineIcon /> Live Performance Metrics
      </Typography>
      
      {/* Real-time charts and metrics would go here */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>Request Flow</Typography>
              <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography color="text.secondary">Live request flow chart (coming soon)</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>Latency Heatmap</Typography>
              <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography color="text.secondary">Latency distribution chart (coming soon)</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>Provider Load Distribution</Typography>
              <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography color="text.secondary">Load balancing visualization (coming soon)</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  return (
    <DashboardLayout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            AI Gateway Infrastructure
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant={autoRefresh ? 'contained' : 'outlined'}
              size="small"
              onClick={handleAutoRefreshToggle}
            >
              Auto Refresh {autoRefresh ? 'ON' : 'OFF'}
            </Button>
            <Button
              variant="outlined"
              startIcon={refreshing ? <CircularProgress size={16} /> : <RefreshIcon />}
              onClick={handleRefresh}
              disabled={refreshing}
            >
              Refresh
            </Button>
          </Box>
        </Box>

        {/* Connection Status Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            Connection Error: {error.message}
          </Alert>
        )}
        
        {isConnected && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Connected to AI Gateway • {models.length} models available • {healthStatus?.service}
          </Alert>
        )}

        {/* Overview Cards */}
        {renderOverviewCards()}

        {/* Tabbed Content */}
        <Card>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab label="Upstream Providers" icon={<CableIcon />} iconPosition="start" />
              <Tab label="Downstream Clients" icon={<GroupsIcon />} iconPosition="start" />
              <Tab label="API Interfaces" icon={<NetworkIcon />} iconPosition="start" />
              <Tab label="Live Metrics" icon={<TimelineIcon />} iconPosition="start" />
            </Tabs>
          </Box>
          
          <CardContent>
            {tabValue === 0 && renderProvidersTab()}
            {tabValue === 1 && renderClientsTab()}
            {tabValue === 2 && renderInterfacesTab()}
            {tabValue === 3 && renderMetricsTab()}
          </CardContent>
        </Card>
      </Box>
    </DashboardLayout>
  );
}
