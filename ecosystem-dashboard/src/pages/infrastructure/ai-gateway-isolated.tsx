/**
 * Completely Isolated AI Gateway Page
 * 
 * This page doesn't use any AI Gateway providers or SDK imports
 * to completely avoid the forEach validation errors
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress
} from '@mui/material';
import SafeGrid from '@/components/SafeGrid';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { GlassPanel } from '@/components/ui/GlassPanel';

// Static mock data - no SDK dependencies
const mockConnectionStatus = {
  isConnected: false,
  url: process.env.NEXT_PUBLIC_AI_GATEWAY_URL || 'http://localhost:7777',
  status: 'Disconnected'
};

const mockHealthStatus = {
  status: 'healthy' as const,
  timestamp: new Date().toISOString(),
  version: '1.0.0-isolated',
  uptime: 12345,
  services: []
};

const mockModels = [
  { id: 'llama3.1:8b', provider: 'ollama', owned_by: 'meta' },
  { id: 'gpt-4', provider: 'openai', owned_by: 'openai' },
  { id: 'claude-3-sonnet', provider: 'anthropic', owned_by: 'anthropic' }
];

export default function AIGatewayIsolatedPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [healthStatus, setHealthStatus] = useState(mockHealthStatus);
  const [models, setModels] = useState(mockModels);
  const [lastHealthCheck, setLastHealthCheck] = useState<Date | null>(null);

  const handleConnect = async () => {
    setIsLoading(true);
    // Simulate connection delay
    setTimeout(() => {
      setIsConnected(true);
      setLastHealthCheck(new Date());
      setIsLoading(false);
    }, 1500);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setLastHealthCheck(null);
  };

  const handleRefreshHealth = async () => {
    setLastHealthCheck(new Date());
    setHealthStatus({
      ...mockHealthStatus,
      timestamp: new Date().toISOString(),
      uptime: mockHealthStatus.uptime + 60
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'unhealthy': return 'error';
      case 'degraded': return 'warning';
      default: return 'default';
    }
  };

  return (
    <DashboardLayout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            AI Gateway - Isolated Mode
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Completely isolated AI Gateway interface without SDK dependencies
          </Typography>
        </Box>

        {/* Connection Status */}
        <SafeGrid container spacing={3} sx={{ mb: 3 }}>
          <SafeGrid item xs={12} md={6}>
            <GlassPanel>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Connection Status
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Chip 
                    label={isConnected ? 'Connected' : 'Disconnected'}
                    color={isConnected ? 'success' : 'error'}
                    variant="filled"
                  />
                  {isLoading && <CircularProgress size={20} />}
                </Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  URL: {mockConnectionStatus.url}
                </Typography>
                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  {!isConnected ? (
                    <Button 
                      variant="contained" 
                      onClick={handleConnect}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Connecting...' : 'Connect'}
                    </Button>
                  ) : (
                    <Button 
                      variant="outlined" 
                      onClick={handleDisconnect}
                    >
                      Disconnect
                    </Button>
                  )}
                </Box>
              </CardContent>
            </GlassPanel>
          </SafeGrid>

          <SafeGrid item xs={12} md={6}>
            <GlassPanel>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Health Status
                </Typography>
                {isConnected ? (
                  <>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Chip 
                        label={healthStatus.status}
                        color={getStatusColor(healthStatus.status)}
                        variant="filled"
                      />
                      <Typography variant="body2" color="text.secondary">
                        v{healthStatus.version}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Uptime: {Math.floor(healthStatus.uptime / 60)} minutes
                    </Typography>
                    {lastHealthCheck && (
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Last Check: {lastHealthCheck.toLocaleTimeString()}
                      </Typography>
                    )}
                    <Button 
                      variant="outlined" 
                      size="small" 
                      onClick={handleRefreshHealth}
                      sx={{ mt: 1 }}
                    >
                      Refresh Health
                    </Button>
                  </>
                ) : (
                  <Alert severity="info">
                    Connect to view health status
                  </Alert>
                )}
              </CardContent>
            </GlassPanel>
          </SafeGrid>
        </SafeGrid>

        {/* Models Table */}
        <GlassPanel>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Available Models
            </Typography>
            {isConnected ? (
              <TableContainer component={Paper} sx={{ mt: 2, backgroundColor: 'transparent' }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Model ID</TableCell>
                      <TableCell>Provider</TableCell>
                      <TableCell>Owned By</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {models.map((model) => (
                      <TableRow key={model.id}>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace">
                            {model.id}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={model.provider} size="small" />
                        </TableCell>
                        <TableCell>{model.owned_by}</TableCell>
                        <TableCell>
                          <Chip label="Available" color="success" size="small" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="info">
                Connect to view available models
              </Alert>
            )}
          </CardContent>
        </GlassPanel>

        {/* Test Actions */}
        {isConnected && (
          <Box sx={{ mt: 3 }}>
            <GlassPanel>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Test Actions
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Button variant="outlined">
                    Test Chat Completion
                  </Button>
                  <Button variant="outlined">
                    Test Search
                  </Button>
                  <Button variant="outlined">
                    View Logs
                  </Button>
                </Box>
              </CardContent>
            </GlassPanel>
          </Box>
        )}

        {/* Debug Info */}
        <Box sx={{ mt: 3 }}>
          <Alert severity="success">
            <Typography variant="body2">
              <strong>Isolated Mode Active:</strong> This page runs completely independently 
              without any AI Gateway SDK dependencies, avoiding forEach validation errors.
            </Typography>
          </Alert>
        </Box>
      </Box>
    </DashboardLayout>
  );
}
