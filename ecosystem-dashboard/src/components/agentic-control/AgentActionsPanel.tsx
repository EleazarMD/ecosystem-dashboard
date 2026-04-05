import React from 'react';
import {
  VStack,
  HStack,
  Text,
  Box,
  Button,
  Divider,
  Badge,
} from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { FiSettings, FiZap, FiPlay, FiActivity, FiInfo } from 'react-icons/fi';
import { Agent } from './types';

interface AgentActionsPanelProps {
  selectedAgent: Agent | null;
  onShowSettings?: () => void;
}

export const AgentActionsPanel: React.FC<AgentActionsPanelProps> = ({
  selectedAgent,
  onShowSettings,
}) => {
  const infoBg = useSemanticToken('surface.highlight');
  const infoTextColor = useSemanticToken('text.primary');

  return (
    <VStack spacing={4} align="stretch" p={4}>
      <HStack>
        <FiInfo size={14} />
        <Text fontSize="sm" fontWeight="medium">Agent Actions</Text>
      </HStack>

      {selectedAgent ? (
        <>
          <VStack spacing={2} align="stretch">
            <Box>
              <Text fontSize="xs" fontWeight="medium" color={useSemanticToken('text.secondary')}>Selected Agent</Text>
              <Text fontSize="sm" fontWeight="bold">{selectedAgent.name}</Text>
            </Box>

            <HStack spacing={1} flexWrap="wrap">
              <Badge size="xs" colorScheme={selectedAgent.status === 'active' ? 'green' : 'red'}>
                {selectedAgent.status}
              </Badge>
              <Badge size="xs" variant="outline">
                {selectedAgent.type}
              </Badge>
            </HStack>
          </VStack>

          <Divider />
          
          <VStack spacing={2} align="stretch">
            <Button 
              leftIcon={<FiSettings />} 
              size="sm" 
              variant="outline" 
              colorScheme="blue"
              onClick={onShowSettings}
              isDisabled={!onShowSettings}
            >
              Agent Settings
            </Button>
            <Button 
              leftIcon={<FiZap />} 
              size="sm" 
              variant="outline" 
              colorScheme="blue"
            >
              Quick Test
            </Button>
            <Button 
              leftIcon={<FiPlay />} 
              size="sm" 
              variant="outline" 
              colorScheme="green"
            >
              Run Workflow
            </Button>
            <Button 
              leftIcon={<FiActivity />} 
              size="sm" 
              variant="outline" 
              colorScheme="purple"
            >
              Health Check
            </Button>
          </VStack>

          <Divider />

          <Box>
            <Text fontSize="xs" fontWeight="medium" color={useSemanticToken('text.secondary')} mb={2}>Capabilities</Text>
            <HStack spacing={1} flexWrap="wrap">
              {(() => {
                const caps = Array.isArray(selectedAgent.capabilities) 
                  ? selectedAgent.capabilities 
                  : (selectedAgent.capabilities && typeof selectedAgent.capabilities === 'object' 
                      ? Object.keys(selectedAgent.capabilities) 
                      : []);
                return (
                  <>
                    {caps.slice(0, 6).map((cap) => (
                      <Badge key={String(cap)} size="xs" variant="outline" colorScheme="purple">
                        {String(cap).replace(/_/g, ' ')}
                      </Badge>
                    ))}
                    {caps.length > 6 && (
                      <Badge size="xs" variant="outline" colorScheme="gray">
                        +{caps.length - 6} more
                      </Badge>
                    )}
                  </>
                );
              })()}
            </HStack>
          </Box>
        </>
      ) : (
        <Box textAlign="center" py={8}>
          <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
            Select an agent to view actions
          </Text>
        </Box>
      )}

      <Box p={3} bg={infoBg} borderRadius="md" mt={4}>
        <Text fontSize="xs" fontWeight="medium" color={infoTextColor}>
          Agent Network Status
        </Text>
        <Text fontSize="xs" color={infoTextColor} mt={1}>
          All systems operational
        </Text>
      </Box>
    </VStack>
  );
};

export default AgentActionsPanel;
