/**
 * Agentic Approval Integration Component
 * 
 * Bridges the enhanced agentic IDE Memory features with the live human-in-the-loop
 * approval system. Provides real-time synchronization and intelligent decision support.
 * 
 * @module components/ide-memory/AgenticApprovalIntegration
 * @version 1.0.0
 * @updated 2025-09-13
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Card,
  CardBody,
  CardHeader,
  Badge,
  Button,
  Icon,
  Progress,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Flex,
  Grid,
  GridItem,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  useToast,
  Spinner,
  Tooltip,
  CircularProgress,
  CircularProgressLabel
} from '@chakra-ui/react';
import {
  FiCheckCircle,
  FiAlertTriangle,
  FiClock,
  FiTrendingUp,
  FiUsers,
  FiZap,
  FiCpu,
  FiTarget,
  FiActivity,
  FiShield
} from 'react-icons/fi';

// Import hooks
import { useApprovalQueue, useApprovalStats, useApprovalDecision } from '../../hooks/useApprovalWorkflow';
import { useAgenticAutomation } from '../../../hooks/useAgenticAutomation';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface AgenticApprovalIntegrationProps {
  workspace?: string;
  autoRefresh?: boolean;
  showDetailedStats?: boolean;
}

const AgenticApprovalIntegration: React.FC<AgenticApprovalIntegrationProps> = ({
  workspace = "/Users/eleazar/Projects/AIHomelab/core/knowledge-graph",
  autoRefresh = true,
  showDetailedStats = true
}) => {
  const toast = useToast();
  
  // Color mode values
  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const textColor = useSemanticToken('text.secondary');
  const successColor = 'green.500';
  const warningColor = 'orange.500';
  const criticalColor = 'red.500';

  // Hooks
  const { data: queueData, loading: queueLoading, error: queueError } = useApprovalQueue({ workspace });
  const { data: statsData, loading: statsLoading } = useApprovalStats();
  const { processDecision, processing } = useApprovalDecision();
  const { 
    data: agenticData, 
    loading: agenticLoading, 
    error: agenticError,
    executeAgenticReview,
    getRecommendation 
  } = useAgenticAutomation();

  // Local state
  const [integrationStatus, setIntegrationStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [aiRecommendations, setAiRecommendations] = useState<number>(0);
  const [autoApprovedCount, setAutoApprovedCount] = useState<number>(0);
  
  // Integration health calculation
  const integrationHealth = React.useMemo(() => {
    if (queueError) return { score: 0, status: 'critical', message: 'Queue connection failed' };
    if (agenticError || agenticData?.status === 'service_unavailable') {
      return { 
        score: 0, 
        status: 'critical', 
        message: agenticData?.error_message || 'Agentic services unavailable - Connect services to enable AI automation'
      };
    }
    if (!queueData) return { score: 50, status: 'warning', message: 'Loading queue data' };
    if (agenticData?.connection_status === 'failed' || agenticData?.connection_status === 'service_not_available') {
      return { 
        score: 25, 
        status: 'warning', 
        message: `Agentic API connection failed - ${agenticData.error_message || 'Service not available'}`
      };
    }
    
    const baseScore = queueData.queue_stats.total_pending < 10 ? 85 : 65;
    const agenticBonus = agenticData?.auto_approval_enabled && agenticData.approval_threshold > 0.8 ? 15 : 0;
    
    return {
      score: Math.min(baseScore + agenticBonus, 100),
      status: baseScore + agenticBonus > 80 ? 'healthy' : 'warning',
      message: agenticData?.connection_status === 'connected' && agenticData?.auto_approval_enabled 
        ? 'AI automation active' 
        : 'Manual oversight mode'
    };
  }, [queueData, queueError, agenticData, agenticError]);

  // Auto-approval based on agentic automation settings
  const handleAgenticRecommendation = useCallback(async (correctionId: string, confidence: number) => {
    if (!agenticData?.auto_approval_enabled || confidence < agenticData?.approval_threshold) {
      return false;
    }

    try {
      await processDecision({
        correction_id: correctionId,
        decision: 'approve',
        human_comments: `Auto-approved by AI agent (confidence: ${Math.round(confidence * 100)}%)`,
        reviewer_id: 'agentic-system',
        reviewer_name: 'Agentic AI System'
      });
      
      setAutoApprovedCount(prev => prev + 1);
      toast({
        title: 'Auto-approved',
        description: `Correction ${correctionId} auto-approved based on AI confidence`,
        status: 'success',
        duration: 3000
      });
      
      return true;
    } catch (error) {
      console.error('Auto-approval failed:', error);
      return false;
    }
  }, [agenticData, processDecision, toast]);

  // Effect to simulate AI recommendations based on queue data
  useEffect(() => {
    if (queueData?.pending_corrections) {
      const highConfidenceCorrections = queueData.pending_corrections.filter(
        correction => correction.confidence_score > 0.85
      );
      setAiRecommendations(highConfidenceCorrections.length);
    }
  }, [queueData]);

  // Connection status effect
  useEffect(() => {
    if (queueError) {
      setIntegrationStatus('error');
    } else if (queueData) {
      setIntegrationStatus('connected');
    }
  }, [queueData, queueError]);

  return (
    <VStack spacing={6} align="stretch">
      {/* Integration Status Header */}
      <Card bg={cardBg} borderColor={borderColor}>
        <CardHeader>
          <HStack justify="space-between">
            <HStack>
              <Icon as={FiShield} boxSize={6} color="purple.500" />
              <Text fontSize="xl" fontWeight="bold">
                Agentic Approval Integration
              </Text>
              <Badge 
                colorScheme={integrationStatus === 'connected' ? 'green' : 
                           integrationStatus === 'error' ? 'red' : 'yellow'}
              >
                {integrationStatus.toUpperCase()}
              </Badge>
            </HStack>
            
            <HStack>
              <CircularProgress 
                value={integrationHealth.score} 
                size="60px" 
                color={integrationHealth.status === 'healthy' ? 'green.400' : 
                       integrationHealth.status === 'warning' ? 'orange.400' : 'red.400'}
                thickness="8px"
              >
                <CircularProgressLabel fontSize="sm">
                  {integrationHealth.score}%
                </CircularProgressLabel>
              </CircularProgress>
            </HStack>
          </HStack>
        </CardHeader>
        
        <CardBody pt={0}>
          {(agenticData?.status === 'service_unavailable' || integrationHealth.status === 'critical') && (
            <Alert 
              status={
                integrationHealth.status === 'critical' ? 'error' : 
                integrationHealth.status === 'warning' ? 'warning' : 'success'
              }
              mb={4}
            >
              <AlertIcon />
              <AlertTitle>
                {agenticData?.status === 'service_unavailable' ? 'SERVICE UNAVAILABLE' : 
                 `Integration Health: ${integrationHealth.status.toUpperCase()}`}
              </AlertTitle>
              <AlertDescription>
                {agenticData?.status === 'service_unavailable' 
                  ? `Agentic API not running - Start service at http://localhost:8765 to enable AI automation`
                  : integrationHealth.message}
                {agenticData?.last_connection_attempt && (
                  <Text fontSize="xs" mt={1} opacity={0.8}>
                    Last attempt: {new Date(agenticData.last_connection_attempt).toLocaleString()}
                  </Text>
                )}
              </AlertDescription>
            </Alert>
          )}
          
          <Grid templateColumns="repeat(4, 1fr)" gap={4}>
            <GridItem>
              <Stat>
                <StatLabel>Queue Status</StatLabel>
                <StatNumber fontSize="lg">
                  {queueLoading ? <Spinner size="sm" /> : queueData?.queue_stats?.total_pending || 0}
                </StatNumber>
                <StatHelpText>Pending approvals</StatHelpText>
              </Stat>
            </GridItem>
            
            <GridItem>
              <Stat>
                <StatLabel>AI Recommendations</StatLabel>
                <StatNumber fontSize="lg" color="blue.500">
                  {aiRecommendations}
                </StatNumber>
                <StatHelpText>
                  <Icon as={FiCpu} mr={1} />
                  High confidence
                </StatHelpText>
              </Stat>
            </GridItem>
            
            <GridItem>
              <Stat>
                <StatLabel>Auto-approved</StatLabel>
                <StatNumber fontSize="lg" color="green.500">
                  {autoApprovedCount}
                </StatNumber>
                <StatHelpText>
                  <StatArrow type="increase" />
                  This session
                </StatHelpText>
              </Stat>
            </GridItem>
            
            <GridItem>
              <Stat>
                <StatLabel>Processing Rate</StatLabel>
                <StatNumber fontSize="lg">
                  {queueData?.metadata?.processing_rate?.toFixed(1) || '0.0'}/min
                </StatNumber>
                <StatHelpText>
                  <Icon as={FiActivity} mr={1} />
                  Current rate
                </StatHelpText>
              </Stat>
            </GridItem>
          </Grid>
        </CardBody>
      </Card>

      {/* Agentic Automation Status */}
      <Card bg={cardBg} borderColor={borderColor}>
        <CardHeader>
          <HStack>
            <Icon as={FiZap} boxSize={5} color="yellow.500" />
            <Text fontSize="lg" fontWeight="semibold">
              Autonomous Approval System
            </Text>
            <Badge colorScheme={agenticData?.status === 'active' ? 'green' : 'gray'}>
              {agenticData?.status?.toUpperCase() || 'INACTIVE'}
            </Badge>
          </HStack>
        </CardHeader>
        
        <CardBody pt={0}>
          <Grid templateColumns="repeat(3, 1fr)" gap={4}>
            <GridItem>
              <VStack align="start" spacing={2}>
                <Text fontSize="sm" fontWeight="medium">Operation Mode</Text>
                <Badge colorScheme="purple" px={3} py={1}>
                  {agenticData?.mode?.replace('_', ' ').toUpperCase() || 'MONITORING'}
                </Badge>
              </VStack>
            </GridItem>
            
            <GridItem>
              <VStack align="start" spacing={2}>
                <Text fontSize="sm" fontWeight="medium">Auto-approval</Text>
                <HStack>
                  <Badge colorScheme={agenticData?.auto_approval_enabled ? 'green' : 'red'}>
                    {agenticData?.auto_approval_enabled ? 'ENABLED' : 'DISABLED'}
                  </Badge>
                  {agenticData?.auto_approval_enabled && (
                    <Text fontSize="xs" color={textColor}>
                      ≥{Math.round((agenticData?.approval_threshold || 0.8) * 100)}% confidence
                    </Text>
                  )}
                </HStack>
              </VStack>
            </GridItem>
            
            <GridItem>
              <VStack align="start" spacing={2}>
                <Text fontSize="sm" fontWeight="medium">System Health</Text>
                <Progress 
                  value={(agenticData?.system_health_score || 0.75) * 100} 
                  colorScheme="green" 
                  size="sm" 
                  width="100px"
                />
              </VStack>
            </GridItem>
          </Grid>
        </CardBody>
      </Card>

      {/* Live Queue Monitoring */}
      {showDetailedStats && queueData && (
        <Card bg={cardBg} borderColor={borderColor}>
          <CardHeader>
            <HStack>
              <Icon as={FiUsers} boxSize={5} color="blue.500" />
              <Text fontSize="lg" fontWeight="semibold">
                Live Queue Analytics
              </Text>
              <Badge variant="outline" colorScheme="blue">
                Real-time
              </Badge>
            </HStack>
          </CardHeader>
          
          <CardBody pt={0}>
            <Grid templateColumns="repeat(2, 1fr)" gap={6}>
              <GridItem>
                <VStack align="start" spacing={3}>
                  <Text fontSize="sm" fontWeight="medium" color={textColor}>
                    PRIORITY DISTRIBUTION
                  </Text>
                  <VStack align="stretch" spacing={2} width="100%">
                    {Object.entries(queueData.queue_stats.by_priority).map(([priority, count]) => (
                      <HStack key={priority} justify="space-between">
                        <HStack>
                          <Icon 
                            as={priority === 'critical' ? FiAlertTriangle : 
                                priority === 'high' ? FiClock : FiCheckCircle} 
                            color={priority === 'critical' ? criticalColor : 
                                   priority === 'high' ? warningColor : successColor}
                          />
                          <Text fontSize="sm" textTransform="capitalize">{priority}</Text>
                        </HStack>
                        <Badge colorScheme={priority === 'critical' ? 'red' : 
                                          priority === 'high' ? 'orange' : 'green'}>
                          {count}
                        </Badge>
                      </HStack>
                    ))}
                  </VStack>
                </VStack>
              </GridItem>
              
              <GridItem>
                <VStack align="start" spacing={3}>
                  <Text fontSize="sm" fontWeight="medium" color={textColor}>
                    CORRECTION TYPES
                  </Text>
                  <VStack align="stretch" spacing={2} width="100%">
                    {Object.entries(queueData.queue_stats.by_type).map(([type, count]) => (
                      <HStack key={type} justify="space-between">
                        <Text fontSize="sm" textTransform="capitalize">{type}</Text>
                        <Badge variant="outline">{count}</Badge>
                      </HStack>
                    ))}
                  </VStack>
                </VStack>
              </GridItem>
            </Grid>
            
            <Box mt={4} pt={4} borderTop={`1px solid ${borderColor}`}>
              <HStack justify="space-between">
                <VStack align="start" spacing={0}>
                  <Text fontSize="xs" color={textColor}>AVERAGE CONFIDENCE</Text>
                  <Text fontSize="lg" fontWeight="bold">
                    {Math.round((queueData.queue_stats.average_confidence || 0) * 100)}%
                  </Text>
                </VStack>
                
                <VStack align="start" spacing={0}>
                  <Text fontSize="xs" color={textColor}>ESTIMATED REVIEW TIME</Text>
                  <Text fontSize="lg" fontWeight="bold">
                    {Math.round(queueData.metadata.estimated_review_time || 0)}m
                  </Text>
                </VStack>
                
                <VStack align="start" spacing={0}>
                  <Text fontSize="xs" color={textColor}>QUEUE HEALTH</Text>
                  <Badge 
                    colorScheme={queueData.metadata.queue_health === 'healthy' ? 'green' : 
                               queueData.metadata.queue_health === 'warning' ? 'orange' : 'red'}
                  >
                    {queueData.metadata.queue_health.toUpperCase()}
                  </Badge>
                </VStack>
              </HStack>
            </Box>
          </CardBody>
        </Card>
      )}

      {/* Integration Actions */}
      <Card bg={cardBg} borderColor={borderColor}>
        <CardBody>
          <HStack spacing={4} justify="center">
            <Tooltip label="Enable intelligent auto-approval for high-confidence corrections">
              <Button 
                size="sm" 
                colorScheme={agenticData?.auto_approval_enabled ? 'red' : 'green'}
                leftIcon={<FiTarget />}
                isDisabled={processing}
              >
                {agenticData?.auto_approval_enabled ? 'Disable' : 'Enable'} Auto-approval
              </Button>
            </Tooltip>
            
            <Tooltip label="Review AI recommendations and approve in batch">
              <Button 
                size="sm" 
                colorScheme="blue" 
                leftIcon={<FiCpu />}
                isDisabled={aiRecommendations === 0 || processing}
              >
                Review AI Recommendations ({aiRecommendations})
              </Button>
            </Tooltip>
            
            <Tooltip label="Generate predictive analytics for approval patterns">
              <Button 
                size="sm" 
                colorScheme="purple" 
                leftIcon={<FiTrendingUp />}
                variant="outline"
              >
                Generate Analytics
              </Button>
            </Tooltip>
          </HStack>
        </CardBody>
      </Card>
    </VStack>
  );
};

export default AgenticApprovalIntegration;
