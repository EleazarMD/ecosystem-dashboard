import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  LinearProgress,
  Chip,
  Alert,
  IconButton,
} from '@mui/material';
import {
  TrendingUp,
  Warning,
  CheckCircle,
  Refresh,
  Speed,
  Memory,
  Computer,
  CloudQueue,
} from '@mui/icons-material';

interface MetricData {
  timestamp: string;
  cpu: number;
  memory: number;
  disk: number;
  network: number;
}

const KubernetesMetricsWidget: React.FC = () => {
  const [currentMetric, setCurrentMetric] = useState<MetricData | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      
      // Simulate real-time metrics
      const metric: MetricData = {
        timestamp: new Date().toISOString(),
        cpu: Math.floor(Math.random() * 80) + 10,
        memory: Math.floor(Math.random() * 70) + 20,
        disk: Math.floor(Math.random() * 50) + 30,
        network: Math.floor(Math.random() * 60) + 5,
      };

      setCurrentMetric(metric);
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (value: number, threshold: number) => {
    return value > threshold ? <TrendingUp color="error" /> : <TrendingUp color="success" />;
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight="bold">
          📊 Live Metrics
        </Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="caption" color="text.secondary">
            {lastUpdate}
          </Typography>
          <IconButton size="small" onClick={fetchMetrics} disabled={loading}>
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Card sx={{ mb: 2 }}>
        <CardHeader title="Resource Usage" avatar={<Speed />} />
        <CardContent>
          {currentMetric && (
            <Box>
              <Box mb={3} textAlign="center">
                <Computer color="primary" sx={{ mb: 1 }} />
                <Typography variant="h6">{currentMetric.cpu}%</Typography>
                <Typography variant="caption" color="text.secondary">
                  CPU Usage {getTrendIcon(currentMetric.cpu, 70)}
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={currentMetric.cpu} 
                  color={currentMetric.cpu > 70 ? 'warning' : 'primary'}
                  sx={{ mt: 1 }}
                />
              </Box>

              <Box mb={3} textAlign="center">
                <Memory color="primary" sx={{ mb: 1 }} />
                <Typography variant="h6">{currentMetric.memory}%</Typography>
                <Typography variant="caption" color="text.secondary">
                  Memory Usage {getTrendIcon(currentMetric.memory, 80)}
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={currentMetric.memory}
                  color={currentMetric.memory > 80 ? 'warning' : 'primary'}
                  sx={{ mt: 1 }}
                />
              </Box>

              <Box mb={3} textAlign="center">
                <CloudQueue color="primary" sx={{ mb: 1 }} />
                <Typography variant="h6">{currentMetric.disk}%</Typography>
                <Typography variant="caption" color="text.secondary">
                  Disk Usage {getTrendIcon(currentMetric.disk, 75)}
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={currentMetric.disk}
                  color={currentMetric.disk > 75 ? 'warning' : 'primary'}
                  sx={{ mt: 1 }}
                />
              </Box>

              <Box textAlign="center">
                <TrendingUp color="primary" sx={{ mb: 1 }} />
                <Typography variant="h6">{currentMetric.network}%</Typography>
                <Typography variant="caption" color="text.secondary">
                  Network I/O {getTrendIcon(currentMetric.network, 60)}
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={currentMetric.network}
                  color={currentMetric.network > 60 ? 'warning' : 'primary'}
                  sx={{ mt: 1 }}
                />
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="System Status" avatar={<CheckCircle />} />
        <CardContent>
          <Alert severity="info" sx={{ mb: 1 }}>
            <Typography variant="body2" fontWeight="medium">
              Cluster Status: Running
            </Typography>
            <Typography variant="caption" color="text.secondary">
              All systems operational
            </Typography>
          </Alert>
          
          <Box display="flex" flexWrap="wrap" gap={1} mt={2}>
            <Chip 
              icon={<CheckCircle />}
              label="API Server"
              color="success"
              size="small"
            />
            <Chip 
              icon={<CheckCircle />}
              label="Kubelet"
              color="success"
              size="small"
            />
            <Chip 
              icon={<Warning />}
              label="Storage"
              color="warning"
              size="small"
            />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default KubernetesMetricsWidget;
