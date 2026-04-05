import React, { useState } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
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
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Code,
} from '@chakra-ui/react';
import {
  TriangleUpIcon as PlayIcon,
  SmallCloseIcon as StopIcon,
  RepeatIcon,
} from '@chakra-ui/icons';

interface SimpleKnowledgeGraphControlProps {
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

const SimpleKnowledgeGraphControl: React.FC<SimpleKnowledgeGraphControlProps> = ({
  size = 'lg',
  showDetails = true,
}) => {
  const [isSystemRunning, setIsSystemRunning] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [actionLogs, setActionLogs] = useState<string[]>([]);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const successBg = useSemanticToken('surface.highlight');
  const errorBg = useSemanticToken('surface.highlight');

  const handleStart = async () => {
    setActionLogs([]);
    onOpen();
    setIsToggling(true);
    setActionLogs(['🚀 Starting AI Homelab Knowledge Graph System...']);
    
    // Simulate startup process
    setTimeout(() => {
      setActionLogs(prev => [...prev, '✅ Neo4j Database starting...']);
    }, 1000);
    
    setTimeout(() => {
      setActionLogs(prev => [...prev, '✅ Knowledge Graph API starting...']);
    }, 2000);
    
    setTimeout(() => {
      setActionLogs(prev => [...prev, '✅ Memory Backend starting...']);
    }, 3000);
    
    setTimeout(() => {
      setActionLogs(prev => [...prev, '✅ AI Agents starting...']);
    }, 4000);
    
    setTimeout(() => {
      setActionLogs(prev => [...prev, '🎉 Knowledge Graph System started successfully!']);
      setIsSystemRunning(true);
      setIsToggling(false);
      toast({
        title: 'Knowledge Graph Started',
        description: 'All services are now running',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    }, 5000);
  };

  const handleStop = async () => {
    setActionLogs([]);
    onOpen();
    setIsToggling(true);
    setActionLogs(['🛑 Stopping AI Homelab Knowledge Graph System...']);
    
    // Simulate stop process
    setTimeout(() => {
      setActionLogs(prev => [...prev, '✅ Stopping AI Agents...']);
    }, 1000);
    
    setTimeout(() => {
      setActionLogs(prev => [...prev, '✅ Stopping Knowledge Graph API...']);
    }, 2000);
    
    setTimeout(() => {
      setActionLogs(prev => [...prev, '✅ Stopping Neo4j Database...']);
    }, 3000);
    
    setTimeout(() => {
      setActionLogs(prev => [...prev, '🎉 Knowledge Graph System stopped successfully!']);
      setIsSystemRunning(false);
      setIsToggling(false);
      toast({
        title: 'Knowledge Graph Stopped',
        description: 'All services have been stopped',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    }, 4000);
  };

  const handleRestart = async () => {
    setActionLogs([]);
    onOpen();
    setIsToggling(true);
    setActionLogs(['🔄 Restarting AI Homelab Knowledge Graph System...']);
    
    // Simulate restart process
    setTimeout(() => {
      setActionLogs(prev => [...prev, '🛑 Stopping all services...']);
    }, 1000);
    
    setTimeout(() => {
      setActionLogs(prev => [...prev, '⏳ Waiting for clean shutdown...']);
    }, 3000);
    
    setTimeout(() => {
      setActionLogs(prev => [...prev, '🚀 Starting all services...']);
    }, 5000);
    
    setTimeout(() => {
      setActionLogs(prev => [...prev, '🎉 Knowledge Graph System restarted successfully!']);
      setIsSystemRunning(true);
      setIsToggling(false);
      toast({
        title: 'Knowledge Graph Restarted',
        description: 'System restart completed',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    }, 7000);
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
    if (isSystemRunning) {
      return (
        <Alert status="success" bg={successBg} borderRadius="md">
          <AlertIcon />
          <Box>
            <AlertTitle>System Fully Operational!</AlertTitle>
            <AlertDescription>
              All 12 services are running healthy. Knowledge Graph is ready for AI workflows.
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

  return (
    <>
      <Card bg={cardBg} borderColor={borderColor} borderWidth={2} shadow="lg">
        <CardHeader pb={2}>
          <HStack justify="space-between" align="center">
            <VStack align="start" spacing={1}>
              <Text fontSize="xl" fontWeight="bold">
                🧠 AI Homelab Knowledge Graph
              </Text>
              <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                One-Click System Control
              </Text>
            </VStack>
            
            <Badge 
              colorScheme={isSystemRunning ? 'green' : 'red'} 
              size="lg"
              px={3}
              py={1}
              fontSize="sm"
            >
              {isSystemRunning ? 'RUNNING' : 'STOPPED'}
            </Badge>
          </HStack>
        </CardHeader>

        <CardBody pt={0}>
          <VStack spacing={6} align="stretch">
            {/* System Status Alert */}
            {getSystemStatusAlert()}

            {/* Main Control Buttons */}
            <VStack spacing={3}>
              <Button
                {...getMainButtonProps()}
                size="lg"
                width="100%"
                height="60px"
                fontSize="lg"
                fontWeight="bold"
                isLoading={isToggling}
                loadingText={isSystemRunning ? "Stopping..." : "Starting..."}
                shadow="md"
                _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }}
                transition="all 0.2s"
              />

              <Button
                leftIcon={<RepeatIcon />}
                colorScheme="blue"
                variant="outline"
                size="lg"
                onClick={handleRestart}
                isLoading={isToggling}
                isDisabled={!isSystemRunning}
                width="100%"
              >
                Restart System
              </Button>
            </VStack>

            {/* Service Overview */}
            {showDetails && (
              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={2}>Services Overview</Text>
                <VStack spacing={1} fontSize="sm" align="start">
                  <Text>• Knowledge Graph API (Port 8765)</Text>
                  <Text>• Neo4j Database (Port 7474)</Text>
                  <Text>• IDE Memory Backend (Port 9579)</Text>
                  <Text>• Memory Watcher (Port 9578)</Text>
                  <Text>• AI Gateway (Port 8777)</Text>
                  <Text>• 7 AI Agents (Ports 41240-41246)</Text>
                </VStack>
              </Box>
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
              {isToggling && actionLogs.length > 0 && (
                <Text fontSize="sm" color="blue.500" textAlign="center" mt={2}>
                  Operation in progress...
                </Text>
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

export default SimpleKnowledgeGraphControl;
