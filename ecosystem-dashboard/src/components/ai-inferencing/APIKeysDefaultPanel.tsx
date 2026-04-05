import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Divider,
  Badge,
  Icon,
  useToast,
} from '@chakra-ui/react';
import { FiKey, FiPlus, FiShield, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface APIKeysDefaultPanelProps {
  onAddKey?: () => void;
}

export default function APIKeysDefaultPanel({ onAddKey }: APIKeysDefaultPanelProps) {
  const toast = useToast();
  
  const handleAddKey = () => {
    if (onAddKey) {
      onAddKey();
    } else {
      toast({
        title: 'Select a service first',
        description: 'Please select a project and service to add an API key',
        status: 'info',
        duration: 3000,
      });
    }
  };
  
  return (
    <VStack spacing={4} align="stretch" p={4}>
      {/* Header */}
      <Box>
        <HStack spacing={2} mb={2}>
          <Icon as={FiKey} color="green.500" />
          <Text fontSize="md" fontWeight="bold">Key Management</Text>
        </HStack>
        <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
          Select a key to view details and manage settings
        </Text>
      </Box>

      <Divider />

      {/* Quick Actions */}
      <Box>
        <Text fontSize="xs" fontWeight="bold" mb={3} color={useSemanticToken('text.secondary')}>
          QUICK ACTIONS
        </Text>
        
        <VStack spacing={2}>
          <Button 
            size="sm" 
            width="full" 
            leftIcon={<FiPlus />}
            colorScheme="green"
            onClick={handleAddKey}
          >
            Add New API Key
          </Button>
          <Button 
            size="sm" 
            width="full" 
            leftIcon={<FiShield />}
            variant="outline"
          >
            Security Settings
          </Button>
        </VStack>
      </Box>

      <Divider />

      {/* Key Health */}
      <Box>
        <Text fontSize="xs" fontWeight="bold" mb={3} color={useSemanticToken('text.secondary')}>
          KEY HEALTH
        </Text>
        
        <VStack spacing={2} align="stretch">
          <HStack justify="space-between" p={2} bg={useSemanticToken('surface.highlight')} borderRadius="md">
            <HStack>
              <Icon as={FiCheckCircle} color="green.500" />
              <Text fontSize="sm">Active Keys</Text>
            </HStack>
            <Badge colorScheme="green">8</Badge>
          </HStack>
          
          <HStack justify="space-between" p={2} bg={useSemanticToken('surface.highlight')} borderRadius="md">
            <HStack>
              <Icon as={FiAlertCircle} color="yellow.500" />
              <Text fontSize="sm">Expiring Soon</Text>
            </HStack>
            <Badge colorScheme="yellow">2</Badge>
          </HStack>

          <HStack justify="space-between" p={2} bg={useSemanticToken('surface.base')} borderRadius="md">
            <HStack>
              <Icon as={FiAlertCircle} color={useSemanticToken('text.secondary')} />
              <Text fontSize="sm">Inactive</Text>
            </HStack>
            <Badge>1</Badge>
          </HStack>
        </VStack>
      </Box>

      <Divider />

      {/* Security Tips */}
      <Box>
        <HStack spacing={2} mb={2}>
          <Icon as={FiShield} color="blue.500" />
          <Text fontSize="xs" fontWeight="bold" color={useSemanticToken('text.secondary')}>
            SECURITY BEST PRACTICES
          </Text>
        </HStack>
        
        <VStack spacing={2} align="stretch">
          <Box p={2} bg={useSemanticToken('surface.highlight')} borderRadius="md">
            <Text fontSize="xs" fontWeight="semibold" mb={1}>✓ Rotate keys regularly</Text>
            <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
              Update API keys every 90 days for better security
            </Text>
          </Box>
          
          <Box p={2} bg={useSemanticToken('surface.highlight')} borderRadius="md">
            <Text fontSize="xs" fontWeight="semibold" mb={1}>✓ Set rate limits</Text>
            <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
              Prevent excessive usage and unexpected costs
            </Text>
          </Box>

          <Box p={2} bg={useSemanticToken('surface.highlight')} borderRadius="md">
            <Text fontSize="xs" fontWeight="semibold" mb={1}>✓ Monitor usage</Text>
            <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
              Track API key activity for anomalies
            </Text>
          </Box>
        </VStack>
      </Box>

      <Divider />

      {/* Provider Status */}
      <Box>
        <Text fontSize="xs" fontWeight="bold" mb={3} color={useSemanticToken('text.secondary')}>
          PROVIDER STATUS
        </Text>
        
        <VStack spacing={2} align="stretch">
          <HStack justify="space-between" p={2} bg={useSemanticToken('surface.elevated')} borderRadius="md">
            <HStack>
              <Box w={2} h={2} bg={useSemanticToken('status.success')} borderRadius="full" />
              <Text fontSize="sm">Anthropic</Text>
            </HStack>
            <Badge colorScheme="green">Operational</Badge>
          </HStack>
          
          <HStack justify="space-between" p={2} bg={useSemanticToken('surface.elevated')} borderRadius="md">
            <HStack>
              <Box w={2} h={2} bg={useSemanticToken('status.success')} borderRadius="full" />
              <Text fontSize="sm">OpenAI</Text>
            </HStack>
            <Badge colorScheme="green">Operational</Badge>
          </HStack>

          <HStack justify="space-between" p={2} bg={useSemanticToken('surface.elevated')} borderRadius="md">
            <HStack>
              <Box w={2} h={2} bg={useSemanticToken('status.success')} borderRadius="full" />
              <Text fontSize="sm">Google</Text>
            </HStack>
            <Badge colorScheme="green">Operational</Badge>
          </HStack>
        </VStack>
      </Box>

      {/* Info */}
      <Box p={3} bg={useSemanticToken('status.successSubtle')} borderRadius="md">
        <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
          <strong>Tip:</strong> Click on any API key card to view detailed information, usage stats, and management options.
        </Text>
      </Box>
    </VStack>
  );
}
