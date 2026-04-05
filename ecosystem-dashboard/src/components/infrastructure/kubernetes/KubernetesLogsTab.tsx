import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Select,
  Textarea,
  Switch,
  FormControl,
  FormLabel,
  Tooltip,
  Badge,
  Spinner,
} from '@chakra-ui/react';
import {
  ArrowPathIcon,
  DocumentTextIcon,
  PlayIcon,
  PauseIcon,
} from '@heroicons/react/24/outline';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source: string;
}

interface KubernetesLogsTabProps {
  services?: { name: string; namespace: string }[];
  isLoading?: boolean;
}

const mockLogs: LogEntry[] = [
  {
    timestamp: new Date().toISOString(),
    level: 'info',
    message: 'Service ai-gateway started successfully',
    source: 'ai-gateway',
  },
  {
    timestamp: new Date(Date.now() - 5000).toISOString(),
    level: 'warn',
    message: 'High memory usage detected: 85%',
    source: 'monitoring',
  },
  {
    timestamp: new Date(Date.now() - 10000).toISOString(),
    level: 'info',
    message: 'Pod ai-gateway-deployment-7d4b8f6c8d-abc12 is ready',
    source: 'kubelet',
  },
  {
    timestamp: new Date(Date.now() - 15000).toISOString(),
    level: 'error',
    message: 'Failed to connect to database: connection timeout',
    source: 'kg-api',
  },
  {
    timestamp: new Date(Date.now() - 20000).toISOString(),
    level: 'info',
    message: 'Cluster health check passed',
    source: 'system',
  },
];

const getLevelColor = (level: string) => {
  switch (level) {
    case 'error': return 'red';
    case 'warn': return 'yellow';
    case 'info': return 'blue';
    case 'debug': return 'gray';
    default: return 'gray';
  }
};

export const KubernetesLogsTab: React.FC<KubernetesLogsTabProps> = ({
  services = [],
  isLoading = false,
}) => {
  const [logs, setLogs] = useState<LogEntry[]>(mockLogs);
  const [selectedService, setSelectedService] = useState('all');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const bgColor = useSemanticToken('surface.base');
  const textColor = useSemanticToken('text.primary');
  const timestampColor = useSemanticToken('text.tertiary');
  
  useEffect(() => {
    setMounted(true);
    setLogs(mockLogs); // Initialize logs only on client-side
  }, []);

  // Filter logs based on service and level
  const filteredLogs = logs.filter(log => {
    const serviceMatch = selectedService === 'all' || log.source.includes(selectedService);
    const levelMatch = selectedLevel === 'all' || log.level === selectedLevel;
    return serviceMatch && levelMatch;
  });

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      // Simulate new log entries
      const newLog: LogEntry = {
        timestamp: new Date().toISOString(),
        level: Math.random() > 0.7 ? 'warn' : 'info',
        message: `Service heartbeat - ${Math.random() > 0.5 ? 'healthy' : 'checking connection'}`,
        source: services.length > 0 ? services[Math.floor(Math.random() * services.length)].name : 'system',
      };
      
      setLogs(prev => [newLog, ...prev.slice(0, 99)]); // Keep last 100 logs
    }, 5000);
    
    return () => clearInterval(interval);
  }, [autoRefresh, services]);

  const handleRefresh = () => {
    setIsStreaming(true);
    // Simulate API call
    setTimeout(() => {
      setIsStreaming(false);
      // Add some fresh logs
      const freshLogs = Array.from({ length: 3 }, (_, i) => ({
        timestamp: new Date(Date.now() - i * 1000).toISOString(),
        level: 'info' as const,
        message: `Refreshed log entry ${i + 1}`,
        source: 'system',
      }));
      setLogs(prev => [...freshLogs, ...prev]);
    }, 1000);
  };

  const formatTimestamp = (timestamp: string) => {
    if (typeof window === 'undefined') {
      return timestamp; // Server-side: return raw timestamp
    }
    return new Date(timestamp).toLocaleTimeString(); // Client-side: format timestamp
  };

  if (!mounted) {
    return (
      <VStack align="stretch" spacing={6}>
        <Box p={8} textAlign="center">
          <Spinner size="lg" />
          <Text mt={4}>Loading logs...</Text>
        </Box>
      </VStack>
    );
  }

  return (
    <VStack align="stretch" spacing={6}>
      {/* Controls */}
      <GlassPanel p={6} variant="light">
        <HStack spacing={4} wrap="wrap">
          <FormControl maxW="200px">
            <FormLabel fontSize="sm">Service</FormLabel>
            <Select
              size="sm"
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
            >
              <option value="all">All Services</option>
              {services.map(service => (
                <option key={`${service.namespace}-${service.name}`} value={service.name}>
                  {service.name}
                </option>
              ))}
              <option value="system">System</option>
              <option value="ai-gateway">AI Gateway</option>
              <option value="kg-api">Knowledge Graph</option>
            </Select>
          </FormControl>
          
          <FormControl maxW="150px">
            <FormLabel fontSize="sm">Level</FormLabel>
            <Select
              size="sm"
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
            >
              <option value="all">All Levels</option>
              <option value="error">Error</option>
              <option value="warn">Warning</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
            </Select>
          </FormControl>
          
          <FormControl maxW="120px">
            <FormLabel fontSize="sm">Auto Refresh</FormLabel>
            <Switch
              isChecked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              colorScheme="blue"
            />
          </FormControl>
          
          <Box pt={6}>
            <Button
              size="sm"
              leftIcon={isStreaming ? <Spinner size="xs" /> : <ArrowPathIcon className="w-4 h-4" />}
              onClick={handleRefresh}
              isLoading={isStreaming}
              colorScheme="blue"
              variant="outline"
            >
              Refresh
            </Button>
          </Box>
        </HStack>
      </GlassPanel>

      {/* Log Display */}
      <GlassPanel variant="light" overflow="hidden">
        <Box
          bg={bgColor}
          p={4}
          h="500px"
          overflowY="auto"
          fontFamily="mono"
          fontSize="sm"
        >
          {filteredLogs.map((log, index) => (
            <Box
              key={index}
              mb={2}
              p={2}
              borderRadius="md"
              bg={useSemanticToken('surface.elevated')}
              borderLeft="4px solid"
              borderLeftColor={`${getLevelColor(log.level)}.400`}
            >
              <HStack justify="space-between" align="flex-start">
                <HStack spacing={3} flex={1}>
                  <Text color={timestampColor} fontSize="xs" minW="70px">
                    {formatTimestamp(log.timestamp)}
                  </Text>
                  <Badge
                    colorScheme={getLevelColor(log.level)}
                    size="sm"
                    minW="50px"
                    textAlign="center"
                  >
                    {log.level.toUpperCase()}
                  </Badge>
                  <Badge
                    variant="outline"
                    colorScheme="gray"
                    size="sm"
                  >
                    {log.source}
                  </Badge>
                </HStack>
              </HStack>
              <Text color={textColor} mt={1} pl={0}>
                {log.message}
              </Text>
            </Box>
          ))}
          
          {filteredLogs.length === 0 && (
            <Box textAlign="center" py={8}>
              <DocumentTextIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <Text color={useSemanticToken('text.secondary')}>
                No logs available for the selected filters
              </Text>
            </Box>
          )}
        </Box>
      </GlassPanel>
    </VStack>
  );
};
