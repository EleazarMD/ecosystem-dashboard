/**
 * AI Gateway Test - No Layout
 * 
 * Test AI Gateway page without DashboardLayout to isolate forEach error
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Tab,
  Tabs,
  List,
  ListItem,
  ListItemText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Psychology as AIIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { useAIGatewayClient } from '@/lib/ai-gateway-client-provider-safe';
import SafeGrid from '@/components/SafeGrid';

// TabPanel component
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
      id={`ai-gateway-tabpanel-${index}`}
      aria-labelledby={`ai-gateway-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function AIGatewayNoLayoutPage() {
  const [activeTab, setActiveTab] = useState(0);

  // AI Gateway client
  const {
    client,
    isConnected,
    connectionState,
    isLoading,
    healthStatus,
    lastHealthCheck,
    models,
    isLoadingModels,
    error,
    connect,
    disconnect,
    refreshHealth,
    refreshModels
  } = useAIGatewayClient();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
        return 'success';
      case 'unhealthy':
      case 'failed':
        return 'error';
      case 'degraded':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <Box p={4}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <AIIcon color="primary" />
          AI Gateway Infrastructure - No Layout Test
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Testing without DashboardLayout to isolate forEach error
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Status Cards */}
      <SafeGrid container spacing={3} mb={4}>
        <SafeGrid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">Connection</Typography>
              <Box display="flex" alignItems="center" gap={1}>
                {isConnected ? <CheckIcon color="success" /> : <ErrorIcon color="error" />}
                <Chip 
                  label={connectionState} 
                  color={getStatusColor(connectionState)} 
                  size="small" 
                />
              </Box>
            </CardContent>
          </Card>
        </SafeGrid>
        
        <SafeGrid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">Health Status</Typography>
              <Chip 
                label={healthStatus?.status || 'Unknown'} 
                color={getStatusColor(healthStatus?.status)} 
                size="small" 
              />
            </CardContent>
          </Card>
        </SafeGrid>
        
        <SafeGrid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">Models</Typography>
              <Typography variant="h4">{(models || []).length}</Typography>
              {isLoadingModels && <CircularProgress size={16} />}
            </CardContent>
          </Card>
        </SafeGrid>
        
        <SafeGrid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">Actions</Typography>
              <Box display="flex" gap={1} flexWrap="wrap">
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<RefreshIcon />}
                  onClick={refreshHealth}
                  disabled={isLoading}
                >
                  Health
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<RefreshIcon />}
                  onClick={refreshModels}
                  disabled={isLoadingModels}
                >
                  Models
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  onClick={isConnected ? disconnect : connect}
                  disabled={isLoading}
                >
                  {isConnected ? 'Disconnect' : 'Connect'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </SafeGrid>
      </SafeGrid>

      {/* Tabs */}
      <Card>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Overview" />
          <Tab label="Models" />
          <Tab label="Health" />
        </Tabs>

        <TabPanel value={activeTab} index={0}>
          <Typography variant="h6" gutterBottom>
            AI Gateway Overview
          </Typography>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>Configuration</Typography>
              <List>
                <ListItem>
                  <ListItemText
                    primary="Base URL"
                    secondary={process.env.NEXT_PUBLIC_AI_GATEWAY_URL || 'http://localhost:7777'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Default Model"
                    secondary={process.env.NEXT_PUBLIC_AI_GATEWAY_DEFAULT_MODEL || 'llama3.1:8b'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Last Health Check"
                    secondary={lastHealthCheck?.toLocaleString() || 'Never'}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <Typography variant="h6" gutterBottom>
            Available Models
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Model ID</TableCell>
                  <TableCell>Provider</TableCell>
                  <TableCell>Owner</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(models || []).map((model, index) => (
                  <TableRow key={index}>
                    <TableCell>{model.id}</TableCell>
                    <TableCell>{model.provider || 'Unknown'}</TableCell>
                    <TableCell>{model.owned_by || 'Unknown'}</TableCell>
                    <TableCell>
                      <Chip
                        label="Available"
                        color="success"
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          {(models || []).length === 0 && !isLoadingModels && (
            <Typography color="text.secondary" textAlign="center" py={4}>
              No models available. Check your connection.
            </Typography>
          )}
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <Typography variant="h6" gutterBottom>
            Health Status
          </Typography>
          {healthStatus ? (
            <Card>
              <CardContent>
                <List>
                  <ListItem>
                    <ListItemText
                      primary="Status"
                      secondary={healthStatus.status}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Uptime"
                      secondary={`${Math.floor(healthStatus.uptime / 1000)}s`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Version"
                      secondary={healthStatus.version || 'Unknown'}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          ) : (
            <Typography color="text.secondary">
              No health data available
            </Typography>
          )}
        </TabPanel>
      </Card>
    </Box>
  );
}
