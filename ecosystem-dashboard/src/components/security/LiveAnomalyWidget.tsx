'use client';

import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Icon,
  Heading,
  IconButton,
  Tooltip,
  Progress,
  Divider,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
} from '@chakra-ui/react';
import {
  WarningTwoIcon,
  ViewIcon,
  DeleteIcon,
  TimeIcon,
} from '@chakra-ui/icons';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { SecurityAnomaly } from '@/hooks/useSecurityWebSocket';
import { formatDistanceToNow } from 'date-fns';

interface LiveAnomalyWidgetProps {
  anomalies: SecurityAnomaly[];
  onClear?: () => void;
  maxVisible?: number;
}

const anomalyTypeConfig: Record<string, { color: string; label: string }> = {
  rate_spike: { color: 'orange', label: 'Rate Spike' },
  rate_limit_violation: { color: 'red', label: 'Rate Limit' },
  unusual_pattern: { color: 'purple', label: 'Unusual Pattern' },
  auth_failure: { color: 'red', label: 'Auth Failure' },
  suspicious_request: { color: 'yellow', label: 'Suspicious' },
  data_exfiltration: { color: 'red', label: 'Data Exfil' },
  prompt_injection: { color: 'red', label: 'Prompt Injection' },
};

function AnomalyItem({ anomaly }: { anomaly: SecurityAnomaly }) {
  const config = anomalyTypeConfig[anomaly.anomaly_type] || { color: 'gray', label: anomaly.anomaly_type };
  const timeAgo = formatDistanceToNow(new Date(anomaly.detected_at), { addSuffix: true });

  return (
    <HStack
      p={2}
      bg="whiteAlpha.50"
      borderRadius="md"
      spacing={3}
      _hover={{ bg: 'whiteAlpha.100' }}
      transition="background 0.2s"
      animation="fadeIn 0.3s ease-out"
      sx={{
        '@keyframes fadeIn': {
          from: { opacity: 0, transform: 'scale(0.95)' },
          to: { opacity: 1, transform: 'scale(1)' },
        },
      }}
    >
      <Icon as={WarningTwoIcon} color={`${config.color}.400`} boxSize={4} />
      <VStack align="start" spacing={0} flex={1}>
        <HStack spacing={2}>
          <Badge colorScheme={config.color} fontSize="2xs">
            {config.label}
          </Badge>
          <Text fontSize="2xs" color="gray.500">
            {timeAgo}
          </Text>
        </HStack>
        <Text fontSize="xs" color="gray.300" noOfLines={1}>
          {anomaly.description}
        </Text>
      </VStack>
    </HStack>
  );
}

export function LiveAnomalyWidget({
  anomalies,
  onClear,
  maxVisible = 5,
}: LiveAnomalyWidgetProps) {
  const visibleAnomalies = anomalies.slice(0, maxVisible);
  
  // Calculate stats
  const last5Min = anomalies.filter(a => {
    const detected = new Date(a.detected_at);
    return Date.now() - detected.getTime() < 5 * 60 * 1000;
  }).length;
  
  const byType = anomalies.reduce((acc, a) => {
    acc[a.anomaly_type] = (acc[a.anomaly_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const topType = Object.entries(byType).sort((a, b) => b[1] - a[1])[0];

  return (
    <GlassPanel p={4} h="100%">
      <VStack align="stretch" spacing={4} h="100%">
        <HStack justify="space-between">
          <HStack spacing={2}>
            <Icon as={WarningTwoIcon} color="yellow.400" />
            <Heading size="sm">Live Anomalies</Heading>
            {anomalies.length > 0 && (
              <Badge colorScheme="yellow" variant="solid" borderRadius="full">
                {anomalies.length}
              </Badge>
            )}
          </HStack>
          
          <HStack spacing={2}>
            {onClear && anomalies.length > 0 && (
              <Tooltip label="Clear anomalies">
                <IconButton
                  aria-label="Clear anomalies"
                  icon={<DeleteIcon />}
                  size="sm"
                  variant="ghost"
                  onClick={onClear}
                />
              </Tooltip>
            )}
          </HStack>
        </HStack>
        
        {/* Quick Stats */}
        <SimpleGrid columns={2} spacing={3}>
          <Stat size="sm">
            <StatLabel fontSize="xs" color="gray.400">Last 5 min</StatLabel>
            <StatNumber fontSize="lg" color={last5Min > 5 ? 'orange.400' : 'green.400'}>
              {last5Min}
            </StatNumber>
          </Stat>
          <Stat size="sm">
            <StatLabel fontSize="xs" color="gray.400">Top Type</StatLabel>
            <StatNumber fontSize="sm" color="gray.300">
              {topType ? (
                <Badge colorScheme={anomalyTypeConfig[topType[0]]?.color || 'gray'} fontSize="xs">
                  {anomalyTypeConfig[topType[0]]?.label || topType[0]} ({topType[1]})
                </Badge>
              ) : (
                <Text fontSize="xs" color="gray.500">None</Text>
              )}
            </StatNumber>
          </Stat>
        </SimpleGrid>
        
        <Divider borderColor="whiteAlpha.200" />
        
        {/* Anomaly List */}
        <Box flex={1} overflowY="auto">
          {visibleAnomalies.length === 0 ? (
            <VStack py={4} spacing={2}>
              <Icon as={ViewIcon} color="green.400" boxSize={6} />
              <Text color="gray.400" fontSize="xs" textAlign="center">
                No anomalies detected
              </Text>
            </VStack>
          ) : (
            <VStack align="stretch" spacing={2}>
              {visibleAnomalies.map((anomaly) => (
                <AnomalyItem key={anomaly.anomaly_id} anomaly={anomaly} />
              ))}
              
              {anomalies.length > maxVisible && (
                <Text fontSize="xs" color="gray.500" textAlign="center" py={1}>
                  + {anomalies.length - maxVisible} more
                </Text>
              )}
            </VStack>
          )}
        </Box>
      </VStack>
    </GlassPanel>
  );
}
