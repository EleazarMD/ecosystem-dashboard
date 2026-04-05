/**
 * Kubernetes Intelligent Cluster Dashboard
 * 
 * Simplified dashboard component for Kubernetes-native intelligent cluster management.
 * Integrates with the Kubernetes operator for AI-driven cluster lifecycle management.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  LinearProgress,
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import { SafeGrid } from '@/components/SafeGrid';
import {
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Refresh as RestartIcon,
  TrendingUp as ScaleUpIcon,
  TrendingDown as ScaleDownIcon,
  Psychology as AIIcon,
  Assessment as MetricsIcon,
  CheckCircle as SuccessIcon,
  Warning as WarningIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { 
  KubernetesIntelligentClusterManager,
  ClusterStatus,
  ClusterProfile,
  ClusterMetrics,
  OperationRequest
} from '../../lib/kubernetes/IntelligentClusterManager';

const KubernetesIntelligentClusterDashboard: React.FC = () => {
  const [profiles, setProfiles] = useState<ClusterProfile[]>([]);
  const [clusterStatuses, setClusterStatuses] = useState<ClusterStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [operationLoading, setOperationLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<any>(null);

  const clusterManager = new KubernetesIntelligentClusterManager();

  useEffect(() => {
    initializeData();
    
    // Set up periodic refresh
    const interval = setInterval(() => {
      refreshData();
    }, 30000); // Refresh every 30 seconds

    return () => {
      clearInterval(interval);
    };
  }, []);

  const initializeData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get connection status
      const connStatus = clusterManager.getConnectionStatus();
      setConnectionStatus(connStatus);
      
      // Get profiles
      const profilesData = await clusterManager.getClusterProfiles();
      setProfiles(profilesData);
      
      // Get cluster statuses
      const statusesData = await clusterManager.getAllClusterStatuses();
      setClusterStatuses(statusesData);
      
    } catch (err) {
      console.error('Failed to initialize data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load cluster data');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    try {
      const statusesData = await clusterManager.getAllClusterStatuses();
      setClusterStatuses(statusesData);
    } catch (err) {
      console.error('Failed to refresh data:', err);
    }
  };

  const handleClusterOperation = async (clusterId: string, action: string) => {
    try {
      setOperationLoading(clusterId);
      setError(null);

      const request: OperationRequest = {
        clusterId,
        action: action as any,
        context: {
          userActivity: 'high',
          urgency: 'medium',
          reason: `Manual ${action} operation from dashboard`
        }
      };

      const result = await clusterManager.executeIntelligentOperation(request);
      
      if (result.success) {
        // Refresh data after successful operation
        await refreshData();
      } else {
        setError(result.error || 'Operation failed');
      }
    } catch (err) {
      console.error(`Failed to execute ${action} on ${clusterId}:`, err);
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setOperationLoading(null);
    }
  };

  const getStatusColor = (state: string) => {
    switch (state) {
      case 'running': return 'success';
      case 'stopped': return 'default';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (state: string) => {
    switch (state) {
      case 'running': return <SuccessIcon color="success" />;
      case 'stopped': return <StopIcon color="disabled" />;
      case 'error': return <ErrorIcon color="error" />;
      default: return <WarningIcon color="warning" />;
    }
  };

  const formatMemory = (mb: number) => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)}GB`;
    }
    return `${mb}MB`;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading intelligent cluster data...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Kubernetes Intelligent Cluster Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          AI-powered cluster lifecycle management with predictive scaling and cost optimization
        </Typography>
        
        {/* Connection Status */}
        {connectionStatus && (
          <Alert 
            severity={connectionStatus.operator ? 'success' : 'warning'} 
            sx={{ mt: 2 }}
          >
            Mode: {connectionStatus.mode} | 
            Operator: {connectionStatus.operator ? 'Connected' : 'Disconnected'} | 
            AHIS: {connectionStatus.ahis ? 'Connected' : 'Disconnected'}
          </Alert>
        )}
      </Box>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Cluster Cards */}
      <SafeGrid container spacing={3}>
        {profiles.map((profile) => {
          const status = clusterStatuses.find(s => s.clusterId === profile.id);
          const metrics = status?.metrics;
          const recommendation = status?.recommendation;
          
          return (
            <SafeGrid item xs={12} md={6} lg={4} key={profile.id}>
              <Card>
                <CardContent>
                  {/* Cluster Header */}
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">{profile.name}</Typography>
                    <Box display="flex" alignItems="center" gap={1}>
                      {getStatusIcon(status?.status.state || 'unknown')}
                      <Chip 
                        label={status?.status.state || 'unknown'} 
                        color={getStatusColor(status?.status.state || 'unknown') as any}
                        size="small"
                      />
                    </Box>
                  </Box>

                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {profile.description}
                  </Typography>

                  <Divider sx={{ my: 2 }} />

                  {/* Metrics */}
                  {metrics && (
                    <Box mb={2}>
                      <Typography variant="subtitle2" gutterBottom>
                        <MetricsIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Resource Usage
                      </Typography>
                      
                      <Box mb={1}>
                        <Typography variant="body2">
                          CPU: {metrics.cpu.usage.toFixed(1)}% of {metrics.cpu.available}%
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={metrics.cpu.usage} 
                          sx={{ height: 6, borderRadius: 3 }}
                        />
                      </Box>
                      
                      <Box mb={1}>
                        <Typography variant="body2">
                          Memory: {formatMemory(metrics.memory.usage)} of {formatMemory(metrics.memory.available)}
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={(metrics.memory.usage / metrics.memory.available) * 100} 
                          sx={{ height: 6, borderRadius: 3 }}
                        />
                      </Box>

                      <Typography variant="body2" color="text.secondary">
                        Pods: {metrics.pods.running}/{metrics.pods.total} running | 
                        Cost: ${metrics.costPerHour.toFixed(2)}/hr | 
                        Efficiency: {(metrics.efficiency * 100).toFixed(0)}%
                      </Typography>
                    </Box>
                  )}

                  {/* AI Recommendation */}
                  {recommendation && (
                    <Box mb={2}>
                      <Typography variant="subtitle2" gutterBottom>
                        <AIIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                        AI Recommendation
                      </Typography>
                      
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <Chip 
                          label={recommendation.action.toUpperCase()} 
                          color={recommendation.confidence > 0.7 ? 'success' : 'default'}
                          size="small"
                        />
                        <Typography variant="body2">
                          Confidence: {(recommendation.confidence * 100).toFixed(0)}%
                        </Typography>
                      </Box>

                      {recommendation.reasoning.length > 0 && (
                        <Typography variant="body2" color="text.secondary">
                          {recommendation.reasoning[0]}
                        </Typography>
                      )}

                      {recommendation.scheduledFor && (
                        <Typography variant="body2" color="text.secondary">
                          Scheduled: {new Date(recommendation.scheduledFor).toLocaleString()}
                        </Typography>
                      )}
                    </Box>
                  )}

                  {/* Action Buttons */}
                  <Box display="flex" gap={1} flexWrap="wrap">
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<StartIcon />}
                      onClick={() => handleClusterOperation(profile.id, 'start')}
                      disabled={operationLoading === profile.id || status?.status.state === 'running'}
                    >
                      Start
                    </Button>
                    
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<StopIcon />}
                      onClick={() => handleClusterOperation(profile.id, 'stop')}
                      disabled={operationLoading === profile.id || status?.status.state === 'stopped'}
                    >
                      Stop
                    </Button>
                    
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<ScaleUpIcon />}
                      onClick={() => handleClusterOperation(profile.id, 'scale_up')}
                      disabled={operationLoading === profile.id}
                    >
                      Scale Up
                    </Button>
                    
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<RestartIcon />}
                      onClick={() => handleClusterOperation(profile.id, 'restart')}
                      disabled={operationLoading === profile.id}
                    >
                      Restart
                    </Button>
                  </Box>

                  {/* Loading Indicator */}
                  {operationLoading === profile.id && (
                    <Box display="flex" alignItems="center" mt={2}>
                      <CircularProgress size={16} sx={{ mr: 1 }} />
                      <Typography variant="body2">Processing operation...</Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </SafeGrid>
          );
        })}
      </SafeGrid>

      {/* Summary Statistics */}
      <Box mt={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Cluster Overview
            </Typography>
            
            <SafeGrid container spacing={2}>
              <SafeGrid item xs={6} md={3}>
                <Typography variant="h4" color="primary">
                  {profiles.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Clusters
                </Typography>
              </SafeGrid>
              
              <SafeGrid item xs={6} md={3}>
                <Typography variant="h4" color="secondary">
                  {clusterStatuses.filter(s => s.status === 'running').length}
                </Typography>
                <Typography variant="body2">
                  Active Clusters
                </Typography>
              </SafeGrid>

              <SafeGrid item xs={6} md={3}>
                <Typography variant="h4" color="success.main">
                  {Math.round(clusterStatuses.reduce((acc, s) => acc + (s.metrics?.cpuUsage || 0), 0) / clusterStatuses.length)}%
                </Typography>
                <Typography variant="body2">
                  Avg CPU Usage
                </Typography>
              </SafeGrid>

              <SafeGrid item xs={6} md={3}>
                <Typography variant="h4" color="warning.main">
                  {0}
                </Typography>
                <Typography variant="body2">
                  Recommendations
                </Typography>
              </SafeGrid>
            </SafeGrid>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default KubernetesIntelligentClusterDashboard;
