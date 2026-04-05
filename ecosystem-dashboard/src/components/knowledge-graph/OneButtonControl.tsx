import React, { useState } from 'react';
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  Progress,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Divider,
  Tooltip,
  IconButton,
  Spinner,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Code,
  List,
  ListItem,
  ListIcon
} from '@chakra-ui/react';
import {
  TriangleUpIcon as PlayIcon,
  SmallCloseIcon as StopIcon,
  RepeatIcon,
  RepeatClockIcon as RefreshIcon,
  CheckCircleIcon,
  WarningIcon,
  InfoIcon,
  SettingsIcon
} from '@chakra-ui/icons';
import { useKnowledgeGraphControl } from '../../hooks/useKnowledgeGraphControl';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface OneButtonControlProps {
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
  showLogs?: boolean;
}

const OneButtonControl: React.FC<OneButtonControlProps> = ({
  size = 'lg',
  showDetails = true,
  showLogs = false
}) => {
  const {
    systemStatus,
    isLoading,
    isToggling,
    lastUpdate,
    error,
    isSystemRunning,
    healthPercentage,
    logs,
    fetchSystemStatus,
    startSystem,
    stopSystem,
    restartSystem,
    fetchLogs,
    getStatusColor
  } = useKnowledgeGraphControl({ refreshInterval: 10000 });

  const [actionLogs, setActionLogs] = useState<string[]>([]);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const successBg = useSemanticToken('surface.highlight');
  const warningBg = useSemanticToken('surface.highlight');
  const errorBg = useSemanticToken('surface.highlight');

  const handleStart = async () => {
    setActionLogs([]);
    onOpen();
    setActionLogs(prev => [...prev, '🚀 Starting AI Homelab Knowledge Graph System...']);
    
    const result = await startSystem();
    
    if (result.success) {
      setActionLogs(prev => [...prev, '✅ System startup initiated successfully']);
      if (result.logs) {
        setActionLogs(prev => [...prev, ...result.logs]);
      }
      setActionLogs(prev => [...prev, '⏳ Waiting for services to initialize...']);
      
      // Wait and check status
      setTimeout(async () => {
        await fetchSystemStatus();
        setActionLogs(prev => [...prev, '🔍 System status updated']);
      }, 5000);
    } else {
      setActionLogs(prev => [...prev, `❌ Startup failed: ${result.message}`]);
    }
  };

  const handleStop = async () => {
    setActionLogs([]);
    onOpen();
    setActionLogs(prev => [...prev, '🛑 Stopping AI Homelab Knowledge Graph System...']);
    
    const result = await stopSystem();
    
    if (result.success) {
      setActionLogs(prev => [...prev, '✅ System shutdown initiated successfully']);
      if (result.logs) {
        setActionLogs(prev => [...prev, ...result.logs]);
      }
    } else {
      setActionLogs(prev => [...prev, `❌ Shutdown failed: ${result.message}`]);
    }
  };

  const handleRestart = async () => {
    setActionLogs([]);
    onOpen();
    setActionLogs(prev => [...prev, '🔄 Restarting AI Homelab Knowledge Graph System...']);
    
    const result = await restartSystem();
    
    if (result.success) {
      setActionLogs(prev => [...prev, '✅ System restart completed successfully']);
      if (result.logs) {
        setActionLogs(prev => [...prev, ...result.logs]);
      }
    } else {
      setActionLogs(prev => [...prev, `❌ Restart failed: ${result.message}`]);
    }
  };

  const getMainButtonProps = () => {
    if (isSystemRunning) {
      return {
        colorScheme: 'red',
        leftIcon: <StopIcon />,
        children: 'Stop Knowledge Graph',
        onClick: handleStop
      };
    } else {
      return {
        colorScheme: 'green',
        leftIcon: <PlayIcon />,
        children: 'Start Knowledge Graph',
        onClick: handleStart
      };
    }
  };

  const getSystemStatusAlert = () => {
    if (!systemStatus) return null;

    const status = systemStatus.summary.status;
    
    if (status === 'fully_operational') {
      return (
        <Alert status="success" bg={successBg} borderRadius="md">
          <AlertIcon />
          <Box>
            <AlertTitle>System Fully Operational!</AlertTitle>
            <AlertDescription>
              All {systemStatus.summary.total} services are running healthy. 
              Knowledge Graph is ready for AI workflows.
            </AlertDescription>
          </Box>
        </Alert>
      );
    } else if (status === 'partially_operational') {
      return (
        <Alert status="warning" bg={warningBg} borderRadius="md">
          <AlertIcon />
          <Box>
            <AlertTitle>System Partially Operational</AlertTitle>
            <AlertDescription>
              {systemStatus.summary.healthy}/{systemStatus.summary.total} services running. 
              Some features may be limited.
            </AlertDescription>
          </Box>
        </Alert>
      );
    } else {
      return (
        <Alert status="error" bg={errorBg} borderRadius="md">
          <AlertIcon />
          <Box>
            <AlertTitle>System Offline</AlertTitle>
            <AlertDescription>
              Knowledge Graph system is not running. Click "Start Knowledge Graph" to begin.
            </AlertDescription>
          </Box>
        </Alert>
      );
    }
  };

  const getSizeProps = () => {
    switch (size) {
      case 'sm':
        return {
          cardPadding: 4,
          buttonSize: 'md',
          headingSize: 'md',
          spacing: 3
        };
      case 'lg':
        return {
          cardPadding: 8,
          buttonSize: 'lg',
          headingSize: 'xl',
          spacing: 6
        };
      default: // md
        return {
          cardPadding: 6,
          buttonSize: 'md',
          headingSize: 'lg',
          spacing: 4
        };
    }
  };

  const sizeProps = getSizeProps();

  return (
    <>
      <Card bg={cardBg} borderColor={borderColor} borderWidth={2} shadow="lg">
        <CardHeader pb={2}>
          <HStack justify="space-between" align="center">
            <VStack align="start" spacing={1}>
              <Text fontSize={sizeProps.headingSize} fontWeight="bold">
                🧠 AI Homelab Knowledge Graph
              </Text>
              <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                One-Click System Control
              </Text>
            </VStack>
            
            <HStack spacing={2}>
              <Tooltip label="Refresh Status">
                <IconButton
                  icon={<RefreshIcon />}
                  size="sm"
                  variant="ghost"
                  onClick={fetchSystemStatus}
                  isLoading={isLoading}
                  aria-label="Refresh status"
                />
              </Tooltip>
              
              {systemStatus && (
                <Badge 
                  colorScheme={getStatusColor(systemStatus.summary.status)} 
                  size="lg"
                  px={3}
                  py={1}
                  fontSize="sm"
                >
                  {systemStatus.summary.status.replace('_', ' ').toUpperCase()}
                </Badge>
              )}
            </HStack>
          </HStack>
        </CardHeader>

        <CardBody pt={0}>
          <VStack spacing={sizeProps.spacing} align="stretch">
            {/* System Status Alert */}
            {getSystemStatusAlert()}

            {/* Main Control Buttons */}
            <VStack spacing={3}>
              <Button
                {...getMainButtonProps()}
                size={sizeProps.buttonSize}
                width="100%"
                height="60px"
                fontSize="lg"
                fontWeight="bold"
                isLoading={isToggling}
                loadingText={isSystemRunning ? "Stopping..." : "Starting..."}
                isDisabled={isLoading}
                shadow="md"
                _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }}
                transition="all 0.2s"
              />

              <HStack spacing={3} width="100%">
                <Button
                  leftIcon={<RepeatIcon />}
                  colorScheme="blue"
                  variant="outline"
                  size={sizeProps.buttonSize}
                  onClick={handleRestart}
                  isLoading={isToggling}
                  isDisabled={isLoading || !isSystemRunning}
                  flex={1}
                >
                  Restart System
                </Button>
                
                <Tooltip label="Advanced Settings">
                  <IconButton
                    icon={<SettingsIcon />}
                    colorScheme="gray"
                    variant="outline"
                    size={sizeProps.buttonSize}
                    aria-label="Advanced settings"
                    onClick={() => window.open('/knowledge-graph-control', '_blank')}
                  />
                </Tooltip>
              </HStack>
            </VStack>

            {/* System Health Progress */}
            {systemStatus && showDetails && (
              <>
                <Divider />
                <Box>
                  <HStack justify="space-between" mb={2}>
                    <Text fontSize="sm" fontWeight="medium">System Health</Text>
                    <Text fontSize="sm" color={useSemanticToken('text.secondary')}>{healthPercentage}%</Text>
                  </HStack>
                  <Progress 
                    value={healthPercentage} 
                    colorScheme={getStatusColor(systemStatus.summary.status)}
                    size="lg"
                    hasStripe
                    isAnimated={isSystemRunning}
                    borderRadius="md"
                  />
                  <HStack justify="space-between" mt={1} fontSize="xs" color={useSemanticToken('text.secondary')}>
                    <Text>{systemStatus.summary.healthy} Healthy</Text>
                    <Text>{systemStatus.summary.total} Total Services</Text>
                  </HStack>
                </Box>
              </>
            )}

            {/* Service Overview */}
            {systemStatus && showDetails && (
              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={2}>Services Overview</Text>
                <List spacing={1} fontSize="sm">
                  <ListItem>
                    <ListIcon as={CheckCircleIcon} color="green.500" />
                    Knowledge Graph API, Neo4j Database
                  </ListItem>
                  <ListItem>
                    <ListIcon as={CheckCircleIcon} color="green.500" />
                    IDE Memory Backend & Memory Watcher
                  </ListItem>
                  <ListItem>
                    <ListIcon as={CheckCircleIcon} color="green.500" />
                    7 AI Agents with A2A Protocol
                  </ListItem>
                  <ListItem>
                    <ListIcon as={CheckCircleIcon} color="green.500" />
                    AI Gateway & Inference Engine
                  </ListItem>
                </List>
              </Box>
            )}

            {/* Last Update */}
            {lastUpdate && (
              <Text fontSize="xs" color={useSemanticToken('text.tertiary')} textAlign="center">
                Last updated: {lastUpdate.toLocaleString()}
              </Text>
            )}
          </VStack>
        </CardBody>
      </Card>

      {/* Action Logs Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>System Operation Progress</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={2}>
              {actionLogs.map((log, index) => (
                <Code key={index} p={2} fontSize="sm" colorScheme="gray">
                  {log}
                </Code>
              ))}
              {isToggling && (
                <HStack>
                  <Spinner size="sm" />
                  <Text fontSize="sm">Operation in progress...</Text>
                </HStack>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" onClick={onClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default OneButtonControl;
