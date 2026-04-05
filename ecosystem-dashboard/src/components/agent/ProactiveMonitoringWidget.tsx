/**
 * Proactive Monitoring Widget with Google ADK Integration
 * 
 * Displays AI-generated insights and recommendations from unified dashboard agent
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Button,
  IconButton,
  Collapse,
  Alert,
  AlertIcon,
  AlertDescription,
  Progress,
  Tooltip,
  useToast,
  Spinner,
  Divider
} from '@chakra-ui/react';
import {
  LightBulbIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  EyeIcon,
  EyeSlashIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { useGoogleADKAgent } from '../../hooks/useGoogleADKAgent';
import { GlassPanel } from '../ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface ProactiveMonitoringWidgetProps {
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
  maxInsights?: number;
  showRecommendations?: boolean;
  onInsightClick?: (insight: any) => void;
}

export const ProactiveMonitoringWidget: React.FC<ProactiveMonitoringWidgetProps> = ({
  autoRefresh = true,
  refreshInterval = 300000, // 5 minutes
  maxInsights = 5,
  showRecommendations = true,
  onInsightClick
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [insights, setInsights] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [systemHealth, setSystemHealth] = useState<'healthy' | 'degraded' | 'critical'>('healthy');
  
  const toast = useToast();
  const {
    isLoading,
    error,
    generateInsights,
    getSystemOverview,
    clearError
  } = useGoogleADKAgent();

  // Color mode values
  const bgColor = useSemanticToken('surface.elevated');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refreshInsights();
    }, refreshInterval);

    // Initial load
    refreshInsights();

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  const refreshInsights = async () => {
    try {
      // Get system overview first
      const overview = await getSystemOverview();
      if (overview.success) {
        setSystemHealth(overview.overview.overallHealth);
        if (overview.recommendations) {
          setRecommendations(overview.recommendations.slice(0, maxInsights));
        }
      }

      // Generate AI insights
      const response = await generateInsights();
      if (response.success && response.insights) {
        setInsights(response.insights.slice(0, maxInsights));
      }
      
      if (response.recommendations) {
        setRecommendations(prev => [
          ...prev,
          ...response.recommendations.slice(0, maxInsights - prev.length)
        ]);
      }

      setLastUpdate(new Date());

    } catch (error) {
      console.error('Failed to refresh insights:', error);
      toast({
        title: 'Monitoring Update Failed',
        description: 'Unable to refresh proactive insights',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'green';
      case 'degraded': return 'yellow';
      case 'critical': return 'red';
      default: return 'gray';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy': return <CheckCircleIcon className="w-4 h-4" />;
      case 'degraded': return <ExclamationTriangleIcon className="w-4 h-4" />;
      case 'critical': return <ExclamationTriangleIcon className="w-4 h-4" />;
      default: return <ClockIcon className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'critical': return 'red';
      case 'high': return 'orange';
      case 'medium': return 'yellow';
      case 'low': return 'blue';
      default: return 'gray';
    }
  };

  return (
    <GlassPanel variant="heavy" p={4}>
      <VStack spacing={4} align="stretch">
        {/* Header */}
        <HStack justify="space-between">
          <HStack spacing={2}>
            <LightBulbIcon className="w-5 h-5" color="purple" />
            <Text fontSize="lg" fontWeight="bold" color={textColor}>
              AI Insights
            </Text>
            <Badge 
              colorScheme={getHealthColor(systemHealth)} 
              variant="subtle"
            >
              <HStack spacing={1}>
                {getHealthIcon(systemHealth)}
                <Text>{systemHealth.toUpperCase()}</Text>
              </HStack>
            </Badge>
          </HStack>
          
          <HStack spacing={2}>
            {lastUpdate && (
              <Tooltip label={`Last updated: ${lastUpdate.toLocaleTimeString()}`}>
                <Text fontSize="xs" color={mutedColor}>
                  {Math.round((Date.now() - lastUpdate.getTime()) / 60000)}m ago
                </Text>
              </Tooltip>
            )}
            
            <Tooltip label="Refresh Insights">
              <IconButton
                aria-label="Refresh"
                icon={<ArrowPathIcon className="w-4 h-4" />}
                size="sm"
                variant="ghost"
                onClick={refreshInsights}
                isLoading={isLoading}
              />
            </Tooltip>
            
            <Tooltip label={isExpanded ? "Minimize" : "Expand"}>
              <IconButton
                aria-label="Toggle"
                icon={isExpanded ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                size="sm"
                variant="ghost"
                onClick={() => setIsExpanded(!isExpanded)}
              />
            </Tooltip>
          </HStack>
        </HStack>

        {/* Error Display */}
        {error && (
          <Alert status="error" borderRadius="md" size="sm">
            <AlertIcon />
            <AlertDescription flex={1} fontSize="sm">{error}</AlertDescription>
            <IconButton
              aria-label="Clear Error"
              icon={<ArrowPathIcon className="w-3 h-3" />}
              size="xs"
              variant="ghost"
              onClick={clearError}
            />
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && (
          <HStack spacing={2} justify="center" py={2}>
            <Spinner size="sm" color="purple.500" />
            <Text fontSize="sm" color={mutedColor}>
              Analyzing system state...
            </Text>
          </HStack>
        )}

        {/* Content */}
        <Collapse in={isExpanded} animateOpacity>
          <VStack spacing={4} align="stretch">
            {/* System Health Progress */}
            <Box>
              <HStack justify="space-between" mb={2}>
                <Text fontSize="sm" fontWeight="medium" color={textColor}>
                  System Health
                </Text>
                <Text fontSize="sm" color={mutedColor}>
                  {systemHealth === 'healthy' ? '95%' : 
                   systemHealth === 'degraded' ? '70%' : '40%'}
                </Text>
              </HStack>
              <Progress
                value={systemHealth === 'healthy' ? 95 : 
                       systemHealth === 'degraded' ? 70 : 40}
                colorScheme={getHealthColor(systemHealth)}
                size="sm"
                borderRadius="full"
              />
            </Box>

            {/* AI Insights */}
            {insights.length > 0 && (
              <Box>
                <Text fontSize="sm" fontWeight="medium" color={textColor} mb={2}>
                  AI-Generated Insights
                </Text>
                <VStack spacing={2} align="stretch">
                  {insights.map((insight, index) => (
                    <InsightCard
                      key={insight.id || index}
                      insight={insight}
                      onClick={() => onInsightClick?.(insight)}
                    />
                  ))}
                </VStack>
              </Box>
            )}

            {/* Recommendations */}
            {showRecommendations && recommendations.length > 0 && (
              <>
                <Divider />
                <Box>
                  <Text fontSize="sm" fontWeight="medium" color={textColor} mb={2}>
                    Recommendations
                  </Text>
                  <VStack spacing={2} align="stretch">
                    {recommendations.map((recommendation, index) => (
                      <Box
                        key={index}
                        p={2}
                        bg={useSemanticToken('surface.highlight')}
                        borderRadius="md"
                        borderLeft="3px solid"
                        borderLeftColor="blue.400"
                      >
                        <Text fontSize="xs" color={textColor}>
                          {recommendation}
                        </Text>
                      </Box>
                    ))}
                  </VStack>
                </Box>
              </>
            )}

            {/* Empty State */}
            {!isLoading && insights.length === 0 && recommendations.length === 0 && (
              <Box textAlign="center" py={4}>
                <Text fontSize="sm" color={mutedColor}>
                  No insights available. Click refresh to analyze system state.
                </Text>
                <Button
                  size="sm"
                  variant="ghost"
                  colorScheme="purple"
                  onClick={refreshInsights}
                  mt={2}
                >
                  Generate Insights
                </Button>
              </Box>
            )}
          </VStack>
        </Collapse>
      </VStack>
    </GlassPanel>
  );
};

// Insight Card Component
const InsightCard: React.FC<{
  insight: any;
  onClick?: () => void;
}> = ({ insight, onClick }) => {
  const bgColor = useSemanticToken('surface.highlight');
  const hoverBg = useSemanticToken('surface.hover');
  const textColor = useSemanticToken('text.primary');
  
  return (
    <Box
      p={3}
      bg={bgColor}
      borderRadius="md"
      borderLeft="3px solid"
      borderLeftColor="purple.400"
      cursor={onClick ? 'pointer' : 'default'}
      onClick={onClick}
      _hover={onClick ? { bg: hoverBg } : {}}
      transition="background-color 0.2s"
    >
      <VStack spacing={2} align="stretch">
        <HStack justify="space-between">
          <Text fontSize="sm" fontWeight="medium" color={textColor}>
            {insight.title || 'System Insight'}
          </Text>
          {insight.priority && (
            <Badge
              size="sm"
              colorScheme={getPriorityColor(insight.priority)}
              variant="subtle"
            >
              {insight.priority.toUpperCase()}
            </Badge>
          )}
        </HStack>
        
        <Text fontSize="xs" color={textColor}>
          {insight.description || insight.recommendation}
        </Text>
        
        {insight.confidence && (
          <HStack spacing={2}>
            <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
              Confidence:
            </Text>
            <Progress
              value={insight.confidence * 100}
              size="xs"
              colorScheme="purple"
              flex={1}
              borderRadius="full"
            />
            <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
              {Math.round(insight.confidence * 100)}%
            </Text>
          </HStack>
        )}
      </VStack>
    </Box>
  );
};

function getPriorityColor(priority: string) {
  switch (priority?.toLowerCase()) {
    case 'critical': return 'red';
    case 'high': return 'orange';
    case 'medium': return 'yellow';
    case 'low': return 'blue';
    default: return 'gray';
  }
}
