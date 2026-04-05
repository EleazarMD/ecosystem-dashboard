/**
 * Approvals Content (No Layout)
 * Content-only version of the approvals page for embedding in Knowledge Hub tabs
 * Removes DashboardLayout wrapper to avoid layout nesting
 */

import React, { useState } from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Text,
  Card,
  CardBody,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Badge,
  Button,
  Icon,
  Alert,
  AlertIcon,
  AlertDescription,
  useDisclosure
} from '@chakra-ui/react';
import {
  FiCheckCircle,
  FiClock,
  FiTrendingUp,
  FiAlertTriangle,
  FiSettings,
  FiRefreshCw
} from 'react-icons/fi';
import ApprovalQueueInterface from '../ide-memory/ApprovalQueueInterface';
import ApprovalDecisionModal from '../ide-memory/ApprovalDecisionModal';
import { useApprovalQueue, useApprovalStats } from '../../hooks/useApprovalWorkflow';
import { useSemanticToken } from '@/hooks/useSemanticToken';

const ApprovalsContent: React.FC = () => {
  const [selectedCorrectionId, setSelectedCorrectionId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  
  const { isOpen: isModalOpen, onOpen: onModalOpen, onClose: onModalClose } = useDisclosure();
  
  // Fetch approval data
  const { data: queueData, loading: queueLoading, refetch: refetchQueue } = useApprovalQueue();
  const { data: statsData, loading: statsLoading, refetch: refetchStats } = useApprovalStats();

  // Color mode values
  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const textColor = useSemanticToken('text.secondary');

  // Handle correction selection
  const handleCorrectionSelect = (correctionId: string) => {
    setSelectedCorrectionId(correctionId);
    onModalOpen();
  };

  // Handle decision completion
  const handleDecisionMade = () => {
    setRefreshKey(prev => prev + 1);
    refetchQueue();
    refetchStats();
  };

  // Get selected correction data
  const selectedCorrection = queueData?.pending_corrections.find(
    c => c.id === selectedCorrectionId
  ) || null;

  // Refresh all data
  const handleRefreshAll = () => {
    refetchQueue();
    refetchStats();
    setRefreshKey(prev => prev + 1);
  };

  return (
    <Box py={4}>
      <VStack spacing={8} align="stretch">
        {/* Page Header */}
        <Box>
          <HStack justify="space-between" align="start" mb={4}>
            <VStack align="start" spacing={2}>
              <HStack>
                <Icon as={FiCheckCircle} boxSize={6} color="blue.500" />
                <Text fontSize="3xl" fontWeight="bold">
                  AI Truth Engine
                </Text>
                <Badge colorScheme="blue" fontSize="sm">
                  Human Oversight
                </Badge>
              </HStack>
              <Text fontSize="lg" color={textColor}>
                Review and approve AI-generated memory corrections with full audit control
              </Text>
            </VStack>

            <HStack spacing={3}>
              <Button
                leftIcon={<FiRefreshCw />}
                onClick={handleRefreshAll}
                variant="outline"
                size="sm"
              >
                Refresh
              </Button>
              <Button
                leftIcon={<FiSettings />}
                variant="outline"
                size="sm"
              >
                Settings
              </Button>
            </HStack>
          </HStack>

          {/* Quick Stats */}
          {statsData && (
            <HStack spacing={6} wrap="wrap">
              <Card size="sm" bg={cardBg} borderColor={borderColor}>
                <CardBody>
                  <VStack spacing={1} align="start">
                    <Text fontSize="2xl" fontWeight="bold" color="blue.500">
                      {queueData?.queue_stats.total_pending || 0}
                    </Text>
                    <Text fontSize="sm" color={textColor}>Pending Reviews</Text>
                  </VStack>
                </CardBody>
              </Card>

              <Card size="sm" bg={cardBg} borderColor={borderColor}>
                <CardBody>
                  <VStack spacing={1} align="start">
                    <Text fontSize="2xl" fontWeight="bold" color="green.500">
                      {Math.round(statsData.overview.approval_rate * 100)}%
                    </Text>
                    <Text fontSize="sm" color={textColor}>Approval Rate</Text>
                  </VStack>
                </CardBody>
              </Card>

              <Card size="sm" bg={cardBg} borderColor={borderColor}>
                <CardBody>
                  <VStack spacing={1} align="start">
                    <Text fontSize="2xl" fontWeight="bold" color="orange.500">
                      {Math.round(statsData.accuracy_metrics.ai_accuracy_score * 100)}%
                    </Text>
                    <Text fontSize="sm" color={textColor}>AI Accuracy</Text>
                  </VStack>
                </CardBody>
              </Card>

              <Card size="sm" bg={cardBg} borderColor={borderColor}>
                <CardBody>
                  <VStack spacing={1} align="start">
                    <Text fontSize="2xl" fontWeight="bold" color="purple.500">
                      {statsData.overview.average_processing_time_minutes.toFixed(1)}m
                    </Text>
                    <Text fontSize="sm" color={textColor}>Avg Review Time</Text>
                  </VStack>
                </CardBody>
              </Card>

              <Card size="sm" bg={cardBg} borderColor={borderColor}>
                <CardBody>
                  <VStack spacing={1} align="start">
                    <Badge 
                      colorScheme={
                        queueData?.metadata.queue_health === 'healthy' ? 'green' :
                        queueData?.metadata.queue_health === 'warning' ? 'yellow' : 'red'
                      }
                      fontSize="lg"
                      px={2}
                      py={1}
                    >
                      {queueData?.metadata.queue_health?.toUpperCase() || 'UNKNOWN'}
                    </Badge>
                    <Text fontSize="sm" color={textColor}>Queue Health</Text>
                  </VStack>
                </CardBody>
              </Card>
            </HStack>
          )}
        </Box>

        {/* Offline Mode Alert */}
        {queueData?.metadata.queue_health === 'warning' && (
          <Alert status="info" borderRadius="md">
            <AlertIcon />
            <AlertDescription>
              AI Truth Engine approval service is currently offline. Showing empty queue. 
              Start the backend services to enable approval functionality.
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content Tabs */}
        <Tabs variant="enclosed" colorScheme="blue">
          <TabList>
            <Tab>
              <HStack>
                <Icon as={FiClock} />
                <Text>Approval Queue</Text>
                {queueData?.queue_stats.total_pending && (
                  <Badge colorScheme="blue" ml={2}>
                    {queueData.queue_stats.total_pending}
                  </Badge>
                )}
              </HStack>
            </Tab>
            <Tab>
              <HStack>
                <Icon as={FiTrendingUp} />
                <Text>Analytics</Text>
              </HStack>
            </Tab>
            <Tab>
              <HStack>
                <Icon as={FiAlertTriangle} />
                <Text>System Health</Text>
              </HStack>
            </Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              <ApprovalQueueInterface
                key={refreshKey}
                onCorrectionSelect={handleCorrectionSelect}
                onDecisionMade={handleDecisionMade}
              />
            </TabPanel>

            <TabPanel>
              <Text>Analytics view coming soon...</Text>
            </TabPanel>

            <TabPanel>
              <Text>System health monitoring coming soon...</Text>
            </TabPanel>
          </TabPanels>
        </Tabs>

        {/* Approval Decision Modal */}
        <ApprovalDecisionModal
          isOpen={isModalOpen}
          onClose={onModalClose}
          correction={selectedCorrection}
          onDecisionMade={handleDecisionMade}
        />
      </VStack>
    </Box>
  );
};

export default ApprovalsContent;
