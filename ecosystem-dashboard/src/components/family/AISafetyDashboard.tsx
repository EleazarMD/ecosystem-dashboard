/**
 * AI Safety Dashboard
 * 
 * Parent-facing dashboard for monitoring AI interaction safety.
 * Shows sycophancy, bias, manipulation trends and alerts.
 * 
 * Protects children from:
 * - Excessive AI agreeableness (sycophancy)
 * - Bias in AI responses
 * - Emotional manipulation
 * - Dependency fostering
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  SimpleGrid,
  Badge,
  Button,
  IconButton,
  Divider,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Tooltip,
  useToast,
  Spinner,
  Progress,
  Icon,
  CircularProgress,
  CircularProgressLabel,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  List,
  ListItem,
  ListIcon,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  Textarea,
  Collapse,
} from '@chakra-ui/react';
import {
  FiShield,
  FiAlertTriangle,
  FiAlertCircle,
  FiCheckCircle,
  FiTrendingUp,
  FiTrendingDown,
  FiMinus,
  FiRefreshCw,
  FiInfo,
  FiMessageCircle,
  FiEye,
  FiCheck,
  FiX,
  FiHelpCircle,
  FiActivity,
  FiUsers,
  FiHeart,
} from 'react-icons/fi';
import { GlassPanel } from '@/components/ui/GlassPanel';

// ============================================================================
// Types
// ============================================================================

interface SafetySummary {
  childId: string;
  childName: string;
  overallSafetyScore: number;
  openIncidents: number;
  pendingAlerts: number;
  recentAnomaly: boolean;
  currentSycophancy: number;
  currentManipulation: number;
  weeklyTrend: {
    avgSycophancyScore: number;
    avgBiasScore: number;
    avgManipulationScore: number;
    avgChildAgency: number;
    sycophancyTrend: 'improving' | 'stable' | 'worsening';
    manipulationTrend: 'improving' | 'stable' | 'worsening';
    overallSafetyTrend: 'improving' | 'stable' | 'worsening';
    totalInteractions: number;
    anomalyDetected: boolean;
    anomalyDescription?: string;
  } | null;
  recentIncidents: Array<{
    id: string;
    incidentType: string;
    severity: string;
    description: string;
    occurredAt: Date;
    status: string;
  }>;
  recommendations: string[];
}

interface SafetyAlert {
  id: string;
  alertType: string;
  severity: string;
  title: string;
  description: string;
  recommendations: string[];
  conversationPrompts: string[];
  status: string;
  createdAt: Date;
}

interface AISafetyDashboardProps {
  childId: string;
  childName?: string;
}

// ============================================================================
// Component
// ============================================================================

export default function AISafetyDashboard({ childId, childName }: AISafetyDashboardProps) {
  const toast = useToast();
  const { isOpen: isAlertModalOpen, onOpen: onAlertModalOpen, onClose: onAlertModalClose } = useDisclosure();
  const [showExplanation, setShowExplanation] = useState(false);

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<SafetySummary | null>(null);
  const [alerts, setAlerts] = useState<SafetyAlert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<SafetyAlert | null>(null);
  const [acknowledgeNotes, setAcknowledgeNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Fetch safety data
  const fetchSafetyData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch summary
      const summaryRes = await fetch(`/api/family/ai-safety?action=summary&childId=${childId}`);
      const summaryData = await summaryRes.json();

      if (!summaryRes.ok) {
        throw new Error(summaryData.error || 'Failed to fetch safety data');
      }

      setSummary(summaryData.data);

      // Fetch alerts
      const alertsRes = await fetch(`/api/family/ai-safety?action=alerts&childId=${childId}&status=pending`);
      const alertsData = await alertsRes.json();

      if (alertsRes.ok) {
        setAlerts(alertsData.data || []);
      }
    } catch (err: any) {
      setError(err.message);
      toast({
        title: 'Error loading safety data',
        description: err.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  }, [childId, toast]);

  useEffect(() => {
    fetchSafetyData();
  }, [fetchSafetyData]);

  // Acknowledge alert
  const handleAcknowledgeAlert = async () => {
    if (!selectedAlert) return;

    try {
      const res = await fetch('/api/family/ai-safety', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'acknowledge-alert',
          alertId: selectedAlert.id,
          notes: acknowledgeNotes,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to acknowledge alert');
      }

      toast({
        title: 'Alert acknowledged',
        status: 'success',
        duration: 3000,
      });

      onAlertModalClose();
      setSelectedAlert(null);
      setAcknowledgeNotes('');
      fetchSafetyData();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message,
        status: 'error',
        duration: 5000,
      });
    }
  };

  // Render helpers
  const getSafetyColor = (score: number) => {
    if (score >= 0.8) return 'green';
    if (score >= 0.6) return 'blue';
    if (score >= 0.4) return 'yellow';
    return 'red';
  };

  const getRiskColor = (score: number) => {
    if (score <= 0.2) return 'green';
    if (score <= 0.4) return 'blue';
    if (score <= 0.6) return 'yellow';
    return 'red';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <Icon as={FiTrendingDown} color="green.500" />;  // Lower risk = improving
      case 'worsening':
        return <Icon as={FiTrendingUp} color="red.500" />;
      default:
        return <Icon as={FiMinus} color="gray.500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'red';
      case 'high':
        return 'orange';
      case 'medium':
        return 'yellow';
      default:
        return 'gray';
    }
  };

  const getIncidentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'sycophancy_pattern': 'Excessive Agreeableness',
      'excessive_agreement': 'Over-Agreement',
      'manipulation_attempt': 'Influence Attempt',
      'emotional_manipulation': 'Emotional Influence',
      'bias_detected': 'Bias Pattern',
      'boundary_violation': 'Boundary Issue',
      'age_inappropriate': 'Age Concern',
      'dependency_fostering': 'Dependency Pattern',
    };
    return labels[type] || type.replace(/_/g, ' ');
  };

  if (loading) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="xl" />
        <Text mt={4}>Loading AI safety data...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert status="error" borderRadius="md">
        <AlertIcon />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!summary) {
    return (
      <Alert status="info" borderRadius="md">
        <AlertIcon />
        <AlertDescription>No AI interaction data available yet.</AlertDescription>
      </Alert>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      {/* Header with explanation */}
      <HStack justify="space-between" align="start">
        <VStack align="start" spacing={1}>
          <HStack>
            <Icon as={FiShield} boxSize={6} color="purple.500" />
            <Heading size="md">AI Safety Monitor</Heading>
          </HStack>
          <Text fontSize="sm" color="gray.500">
            Protecting {summary.childName} from AI bias, sycophancy, and manipulation
          </Text>
        </VStack>
        <HStack>
          <Tooltip label="What does this monitor?">
            <IconButton
              aria-label="Info"
              icon={<FiHelpCircle />}
              variant="ghost"
              onClick={() => setShowExplanation(!showExplanation)}
            />
          </Tooltip>
          <IconButton
            aria-label="Refresh"
            icon={<FiRefreshCw />}
            variant="ghost"
            onClick={fetchSafetyData}
          />
        </HStack>
      </HStack>

      {/* Explanation Panel */}
      <Collapse in={showExplanation}>
        <GlassPanel p={4} mb={2}>
          <VStack align="start" spacing={3} fontSize="sm">
            <Heading size="sm">What We Monitor</Heading>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} w="full">
              <HStack align="start">
                <Icon as={FiHeart} color="pink.500" mt={1} />
                <Box>
                  <Text fontWeight="bold">Sycophancy</Text>
                  <Text color="gray.600">AI being excessively agreeable, never challenging ideas, or seeking validation</Text>
                </Box>
              </HStack>
              <HStack align="start">
                <Icon as={FiUsers} color="blue.500" mt={1} />
                <Box>
                  <Text fontWeight="bold">Bias</Text>
                  <Text color="gray.600">Gender stereotyping, cultural bias, or unfair assumptions about abilities</Text>
                </Box>
              </HStack>
              <HStack align="start">
                <Icon as={FiAlertTriangle} color="orange.500" mt={1} />
                <Box>
                  <Text fontWeight="bold">Manipulation</Text>
                  <Text color="gray.600">Emotional influence, guilt induction, or dependency fostering</Text>
                </Box>
              </HStack>
              <HStack align="start">
                <Icon as={FiActivity} color="green.500" mt={1} />
                <Box>
                  <Text fontWeight="bold">Child Agency</Text>
                  <Text color="gray.600">Whether your child leads conversations or just follows AI suggestions</Text>
                </Box>
              </HStack>
            </SimpleGrid>
          </VStack>
        </GlassPanel>
      </Collapse>

      {/* Pending Alerts */}
      {alerts.length > 0 && (
        <Alert status="warning" borderRadius="md" flexDirection="column" alignItems="start">
          <HStack w="full" justify="space-between">
            <HStack>
              <AlertIcon />
              <AlertTitle>{alerts.length} Alert{alerts.length > 1 ? 's' : ''} Requiring Attention</AlertTitle>
            </HStack>
          </HStack>
          <VStack align="stretch" w="full" mt={3} spacing={2}>
            {alerts.slice(0, 3).map((alert) => (
              <HStack
                key={alert.id}
                p={2}
                bg="white"
                borderRadius="md"
                justify="space-between"
                cursor="pointer"
                onClick={() => {
                  setSelectedAlert(alert);
                  onAlertModalOpen();
                }}
                _hover={{ bg: 'gray.50' }}
              >
                <HStack>
                  <Badge colorScheme={getSeverityColor(alert.severity)}>{alert.severity}</Badge>
                  <Text fontSize="sm" fontWeight="medium">{alert.title}</Text>
                </HStack>
                <Icon as={FiEye} />
              </HStack>
            ))}
          </VStack>
        </Alert>
      )}

      {/* Anomaly Alert */}
      {summary.recentAnomaly && summary.weeklyTrend?.anomalyDescription && (
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <Box>
            <AlertTitle>Anomaly Detected</AlertTitle>
            <AlertDescription>{summary.weeklyTrend.anomalyDescription}</AlertDescription>
          </Box>
        </Alert>
      )}

      {/* Overall Safety Score */}
      <GlassPanel p={5}>
        <HStack justify="space-between" mb={4}>
          <Heading size="sm">Overall AI Safety Score</Heading>
          <Badge colorScheme={getSafetyColor(summary.overallSafetyScore)} fontSize="md" px={3} py={1}>
            {summary.overallSafetyScore >= 0.8 ? 'Healthy' :
             summary.overallSafetyScore >= 0.6 ? 'Good' :
             summary.overallSafetyScore >= 0.4 ? 'Monitor' : 'Concern'}
          </Badge>
        </HStack>

        <HStack spacing={8} justify="center" mb={4}>
          <VStack>
            <CircularProgress
              value={summary.overallSafetyScore * 100}
              color={`${getSafetyColor(summary.overallSafetyScore)}.400`}
              size="120px"
              thickness="8px"
            >
              <CircularProgressLabel>
                <VStack spacing={0}>
                  <Text fontSize="2xl" fontWeight="bold">
                    {Math.round(summary.overallSafetyScore * 100)}
                  </Text>
                  <Text fontSize="xs" color="gray.500">/ 100</Text>
                </VStack>
              </CircularProgressLabel>
            </CircularProgress>
            <Text fontSize="sm" fontWeight="medium">Safety Score</Text>
          </VStack>
        </HStack>

        <SimpleGrid columns={3} spacing={4} textAlign="center">
          <VStack>
            <Text fontSize="2xl" fontWeight="bold" color={summary.openIncidents > 0 ? 'orange.500' : 'green.500'}>
              {summary.openIncidents}
            </Text>
            <Text fontSize="xs" color="gray.500">Open Incidents</Text>
          </VStack>
          <VStack>
            <Text fontSize="2xl" fontWeight="bold" color={summary.pendingAlerts > 0 ? 'orange.500' : 'green.500'}>
              {summary.pendingAlerts}
            </Text>
            <Text fontSize="xs" color="gray.500">Pending Alerts</Text>
          </VStack>
          <VStack>
            <Text fontSize="2xl" fontWeight="bold">
              {summary.weeklyTrend?.totalInteractions || 0}
            </Text>
            <Text fontSize="xs" color="gray.500">Interactions This Week</Text>
          </VStack>
        </SimpleGrid>
      </GlassPanel>

      {/* Risk Indicators */}
      {summary.weeklyTrend && (
        <GlassPanel p={5}>
          <Heading size="sm" mb={4}>Risk Indicators</Heading>
          
          <VStack spacing={4} align="stretch">
            {/* Sycophancy */}
            <Box>
              <HStack justify="space-between" mb={1}>
                <HStack>
                  <Text fontSize="sm" fontWeight="medium">Sycophancy (Excessive Agreeableness)</Text>
                  <Tooltip label="AI being too agreeable, never challenging ideas, or seeking validation">
                    <Icon as={FiInfo} color="gray.400" boxSize={3} />
                  </Tooltip>
                </HStack>
                <HStack>
                  {getTrendIcon(summary.weeklyTrend.sycophancyTrend)}
                  <Text fontSize="sm" color="gray.500">
                    {Math.round(summary.weeklyTrend.avgSycophancyScore * 100)}%
                  </Text>
                </HStack>
              </HStack>
              <Progress
                value={summary.weeklyTrend.avgSycophancyScore * 100}
                colorScheme={getRiskColor(summary.weeklyTrend.avgSycophancyScore)}
                size="sm"
                borderRadius="full"
              />
              <Text fontSize="xs" color="gray.500" mt={1}>
                {summary.weeklyTrend.avgSycophancyScore < 0.3 ? 'Healthy balance of agreement and challenge' :
                 summary.weeklyTrend.avgSycophancyScore < 0.5 ? 'Some patterns of excessive agreement' :
                 'High agreeableness - AI rarely challenges ideas'}
              </Text>
            </Box>

            {/* Manipulation */}
            <Box>
              <HStack justify="space-between" mb={1}>
                <HStack>
                  <Text fontSize="sm" fontWeight="medium">Manipulation Risk</Text>
                  <Tooltip label="Emotional influence, guilt induction, or dependency fostering">
                    <Icon as={FiInfo} color="gray.400" boxSize={3} />
                  </Tooltip>
                </HStack>
                <HStack>
                  {getTrendIcon(summary.weeklyTrend.manipulationTrend)}
                  <Text fontSize="sm" color="gray.500">
                    {Math.round(summary.weeklyTrend.avgManipulationScore * 100)}%
                  </Text>
                </HStack>
              </HStack>
              <Progress
                value={summary.weeklyTrend.avgManipulationScore * 100}
                colorScheme={getRiskColor(summary.weeklyTrend.avgManipulationScore)}
                size="sm"
                borderRadius="full"
              />
              <Text fontSize="xs" color="gray.500" mt={1}>
                {summary.weeklyTrend.avgManipulationScore < 0.2 ? 'No manipulation patterns detected' :
                 summary.weeklyTrend.avgManipulationScore < 0.4 ? 'Minor influence patterns observed' :
                 'Concerning influence patterns - review recommended'}
              </Text>
            </Box>

            {/* Bias */}
            <Box>
              <HStack justify="space-between" mb={1}>
                <HStack>
                  <Text fontSize="sm" fontWeight="medium">Bias Detection</Text>
                  <Tooltip label="Gender stereotyping, cultural bias, or unfair assumptions">
                    <Icon as={FiInfo} color="gray.400" boxSize={3} />
                  </Tooltip>
                </HStack>
                <Text fontSize="sm" color="gray.500">
                  {Math.round(summary.weeklyTrend.avgBiasScore * 100)}%
                </Text>
              </HStack>
              <Progress
                value={summary.weeklyTrend.avgBiasScore * 100}
                colorScheme={getRiskColor(summary.weeklyTrend.avgBiasScore)}
                size="sm"
                borderRadius="full"
              />
            </Box>

            {/* Child Agency */}
            <Box>
              <HStack justify="space-between" mb={1}>
                <HStack>
                  <Text fontSize="sm" fontWeight="medium">Child Agency</Text>
                  <Tooltip label="Whether your child leads conversations or follows AI suggestions">
                    <Icon as={FiInfo} color="gray.400" boxSize={3} />
                  </Tooltip>
                </HStack>
                <Text fontSize="sm" color="gray.500">
                  {Math.round(summary.weeklyTrend.avgChildAgency * 100)}%
                </Text>
              </HStack>
              <Progress
                value={summary.weeklyTrend.avgChildAgency * 100}
                colorScheme={getSafetyColor(summary.weeklyTrend.avgChildAgency)}
                size="sm"
                borderRadius="full"
              />
              <Text fontSize="xs" color="gray.500" mt={1}>
                {summary.weeklyTrend.avgChildAgency > 0.6 ? 'Child actively leads conversations' :
                 summary.weeklyTrend.avgChildAgency > 0.4 ? 'Balanced conversation dynamics' :
                 'AI tends to lead - encourage more questions from child'}
              </Text>
            </Box>
          </VStack>
        </GlassPanel>
      )}

      {/* Recent Incidents */}
      {summary.recentIncidents.length > 0 && (
        <GlassPanel p={5}>
          <Heading size="sm" mb={4}>Recent Incidents</Heading>
          <Accordion allowMultiple>
            {summary.recentIncidents.map((incident) => (
              <AccordionItem key={incident.id} border="none">
                <AccordionButton px={0}>
                  <HStack flex="1" justify="space-between">
                    <HStack>
                      <Badge colorScheme={getSeverityColor(incident.severity)} size="sm">
                        {incident.severity}
                      </Badge>
                      <Text fontSize="sm" fontWeight="medium">
                        {getIncidentTypeLabel(incident.incidentType)}
                      </Text>
                    </HStack>
                    <HStack>
                      <Text fontSize="xs" color="gray.500">
                        {new Date(incident.occurredAt).toLocaleDateString()}
                      </Text>
                      <Badge colorScheme={incident.status === 'open' ? 'orange' : 'green'} size="sm">
                        {incident.status}
                      </Badge>
                    </HStack>
                  </HStack>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel pb={4}>
                  <Text fontSize="sm" color="gray.600">{incident.description}</Text>
                </AccordionPanel>
              </AccordionItem>
            ))}
          </Accordion>
        </GlassPanel>
      )}

      {/* Recommendations */}
      {summary.recommendations.length > 0 && (
        <GlassPanel p={5}>
          <Heading size="sm" mb={4}>💡 Recommendations</Heading>
          <List spacing={2}>
            {summary.recommendations.map((rec, idx) => (
              <ListItem key={idx} fontSize="sm">
                <ListIcon as={FiCheckCircle} color="green.500" />
                {rec}
              </ListItem>
            ))}
          </List>
        </GlassPanel>
      )}

      {/* All Clear Message */}
      {summary.overallSafetyScore >= 0.8 && summary.openIncidents === 0 && (
        <Alert status="success" borderRadius="md">
          <AlertIcon />
          <Box>
            <AlertTitle>AI Interactions Look Healthy!</AlertTitle>
            <AlertDescription>
              No concerning patterns detected. Continue monitoring periodically.
            </AlertDescription>
          </Box>
        </Alert>
      )}

      {/* Alert Detail Modal */}
      <Modal isOpen={isAlertModalOpen} onClose={onAlertModalClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack>
              <Badge colorScheme={getSeverityColor(selectedAlert?.severity || 'low')}>
                {selectedAlert?.severity}
              </Badge>
              <Text>{selectedAlert?.title}</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={4}>
              <Text>{selectedAlert?.description}</Text>

              {selectedAlert?.recommendations && selectedAlert.recommendations.length > 0 && (
                <Box>
                  <Text fontWeight="bold" mb={2}>Recommendations:</Text>
                  <List spacing={1}>
                    {selectedAlert.recommendations.map((rec, idx) => (
                      <ListItem key={idx} fontSize="sm">
                        <ListIcon as={FiCheckCircle} color="blue.500" />
                        {rec}
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {selectedAlert?.conversationPrompts && selectedAlert.conversationPrompts.length > 0 && (
                <Box>
                  <Text fontWeight="bold" mb={2}>Questions to Ask {summary?.childName}:</Text>
                  <List spacing={1}>
                    {selectedAlert.conversationPrompts.map((prompt, idx) => (
                      <ListItem key={idx} fontSize="sm">
                        <ListIcon as={FiMessageCircle} color="green.500" />
                        {prompt}
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              <Divider />

              <Box>
                <Text fontWeight="bold" mb={2}>Your Notes (optional):</Text>
                <Textarea
                  placeholder="Add any notes about actions you've taken..."
                  value={acknowledgeNotes}
                  onChange={(e) => setAcknowledgeNotes(e.target.value)}
                />
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onAlertModalClose}>
              Close
            </Button>
            <Button colorScheme="green" leftIcon={<FiCheck />} onClick={handleAcknowledgeAlert}>
              Acknowledge Alert
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
}
